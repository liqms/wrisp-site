/**
 * 文案落地与语言纯净度校验（构建后跑）：
 *   node scripts/check-copy-coverage.mjs
 *   node scripts/check-copy-coverage.mjs --selftest   只跑内置夹具，不碰仓库与 dist
 *
 * 双语键是否成对由 src/content/copy 的 schema 在构建期保证；这里补的是另一半——
 * 一条文案两种语言都写全了，却可能根本没被任何组件引用。所以逐叶子回比构建产物：
 * 少一条即失败。顺带扫英文页的中文残留：语言开关上的「中文」是刻意保留的第三语言
 * 标识，除此之外英文页不该出现汉字。
 *
 * SP-4 加的第二层：`flow.qa / flow.file / flow.recall` 三个子树的叶子，除了「在产物里」
 * 还必须落在**元素文本**里——序列化进 data-demo 的那一份不算静态等价物（裁决④：
 * 关 JS 与关动画的读者要拿得到同一份信息）。`flow.stream.*` 明确豁免：它是循环增量，
 * 无 JS 时本来就不在产物里，首帧终态已由 rows 完整承担（spec §7 登记的已知缺口）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COPY = path.join(root, 'src/content/copy');
const DIST = path.join(root, 'dist');

/*
 * 站点已从「一个长页」变成多页（首页 + 隐私声明），所以覆盖判定按语言分组：
 * 一条文案只要出现在该语言的任意一页里就算落地。代价是丢了「每页各自完整」这一层，
 * 页面之间本来内容就不同，逐页要求反而会把共享区块误报成缺失。
 */
export const htmlFiles = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? htmlFiles(path.join(dir, item.name))
        : item.name === 'index.html'
          ? [path.join(dir, item.name)]
          : [],
    );

export const loadPages = (dist) => {
  const pages = { zh: [], en: [] };
  for (const file of htmlFiles(dist)) {
    const locale = path.relative(dist, file).split(path.sep)[0] === 'zh' ? 'zh' : 'en';
    pages[locale].push({ at: path.relative(dist, file).split(path.sep).join('/'), html: fs.readFileSync(file, 'utf8') });
  }
  return pages;
};

export const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** 只留元素文本：注释、script、style 先整块撤掉，再剥掉所有标签（开始、结束、自闭合都算）。 */
export const visibleText = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ');

/** 结构字段（时间、CSS 类名、时长）不是叶子，walk 只收 {zh,en} 成对的那一层。 */
export const collectLeaves = (copyDir) => {
  const leaves = [];
  const walk = (node, at) => {
    if (Array.isArray(node)) return node.forEach((item, i) => walk(item, `${at}[${i}]`));
    if (node && typeof node === 'object') {
      if (typeof node.zh === 'string' && typeof node.en === 'string') {
        leaves.push({ at, zh: node.zh, en: node.en });
        return;
      }
      for (const [k, v] of Object.entries(node)) walk(v, `${at}.${k}`);
    }
  };
  for (const file of fs.readdirSync(copyDir))
    walk(JSON.parse(fs.readFileSync(path.join(copyDir, file), 'utf8')), file.replace(/\.json$/, ''));
  return leaves;
};

/* 属性里的单引号不转义、正文里的转义，两种写法都算命中。 */
const appears = (group, value) => group.some((p) => p.html.includes(esc(value)) || p.html.includes(value));

export const checkCoverage = (leaves, pages) => {
  const missing = [];
  for (const leaf of leaves) {
    if (!appears(pages.zh, leaf.zh)) missing.push(`zh  ${leaf.at}: ${leaf.zh}`);
    if (!appears(pages.en, leaf.en)) missing.push(`en  ${leaf.at}: ${leaf.en}`);
  }
  return missing;
};

export const STATIC_PREFIXES = ['flow.qa.', 'flow.file.', 'flow.recall.'];

/** 会动的文案必须能在元素文本里读到；只活在标签或属性里的，判红。 */
export const checkStatic = (leaves, pages) => {
  const bad = [];
  const texts = { zh: pages.zh.map((p) => ({ at: p.at, text: visibleText(p.html) })), en: pages.en.map((p) => ({ at: p.at, text: visibleText(p.html) })) };
  for (const leaf of leaves) {
    if (!STATIC_PREFIXES.some((p) => leaf.at.startsWith(p))) continue;
    for (const locale of ['zh', 'en']) {
      const value = leaf[locale];
      if (!texts[locale].some((p) => p.text.includes(esc(value)) || p.text.includes(value)))
        bad.push(`${locale}  ${leaf.at}: 元素文本里没有这段静态等价物（只在标签/属性里不算）`);
    }
  }
  return bad;
};

const ALLOWED_CJK = new Set(['中文']);
const CJK_WORD = new RegExp('[\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff]{2,}', 'g');
export const strayCjk = (html) => {
  const text = visibleText(html).replace(/&#39;|&quot;|&amp;|&lt;|&gt;/g, ' ');
  return [...new Set(text.match(CJK_WORD) || [])].filter((w) => !ALLOWED_CJK.has(w));
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '  → ' + JSON.stringify(detail)));
};

const run = () => {
  const pages = loadPages(DIST);
  if (pages.zh.length === 0 || pages.en.length === 0) {
    console.error('=== COPY CHECK FAILED ===');
    console.error(`dist 里没有双语页面（zh=${pages.zh.length} en=${pages.en.length}），先跑 pnpm build`);
    process.exit(1);
  }
  const leaves = collectLeaves(COPY);
  const missing = checkCoverage(leaves, pages);
  const staticBad = checkStatic(leaves, pages);
  const leaked = [...new Set(pages.en.flatMap((p) => strayCjk(p.html).map((w) => `${p.at} ${w}`)))];
  console.log(
    `leaves=${leaves.length} pages=${pages.zh.length + pages.en.length} missing=${missing.length} static=${staticBad.length} en-cjk=${leaked.length}`,
  );
  for (const m of missing) console.log('  MISS ' + m);
  for (const s of staticBad) console.log('  STAT ' + s);
  for (const w of leaked) console.log('  CJK  ' + w);
  if (missing.length || staticBad.length || leaked.length) {
    console.error('=== COPY CHECK FAILED ===');
    process.exit(1);
  }
  console.log('=== COPY CHECK PASSED ===');
};

const selftest = () => {
  const LEAF = { at: 'flow.qa.q', zh: '什么时候定的', en: 'When did we settle' };
  const IN_TEXT = { zh: [{ at: 'zh/index.html', html: '<p>什么时候定的</p>' }], en: [{ at: 'index.html', html: '<p>When did we settle</p>' }] };
  check('元素文本命中 → 不判红', checkStatic([LEAF], IN_TEXT).length === 0, checkStatic([LEAF], IN_TEXT));

  const ONLY_ATTR = {
    zh: [{ at: 'zh/index.html', html: '<div data-demo="什么时候定的">别的句子</div>' }],
    en: [{ at: 'index.html', html: '<div data-demo="When did we settle">other words</div>' }],
  };
  check('叶子只活在 data-demo 属性里 → 判红', checkStatic([LEAF], ONLY_ATTR).length === 2, checkStatic([LEAF], ONLY_ATTR));
  check('同一份产物按旧规则算命中（证明新规则真的更严）', checkCoverage([LEAF], ONLY_ATTR).length === 0, checkCoverage([LEAF], ONLY_ATTR));

  const STREAM_LEAF = { at: 'flow.stream.rows[0].text', zh: '什么时候定的', en: 'When did we settle' };
  check('flow.stream.* 豁免（循环增量，无 JS 时本就不在产物里）', checkStatic([STREAM_LEAF], ONLY_ATTR).length === 0, checkStatic([STREAM_LEAF], ONLY_ATTR));

  const ESCAPED = { zh: [{ at: 'zh/index.html', html: '<p>它带着&nbsp;时间戳</p>' }], en: [{ at: 'index.html', html: '<p>it&#39;s back</p>' }] };
  check('转义写法也算命中（& 与 &#39;）', checkStatic([{ at: 'flow.qa.ans', zh: '它带着&nbsp;时间戳', en: "it's back" }], ESCAPED).length === 0, checkStatic([{ at: 'flow.qa.ans', zh: '它带着&nbsp;时间戳', en: "it's back" }], ESCAPED));

  const IN_STYLE = { zh: [{ at: 'zh/index.html', html: '<style>/*什么时候定的*/</style><p>别的</p>' }], en: [] };
  check('style 块里的文字不算等价物', checkStatic([LEAF], { zh: IN_STYLE.zh, en: [{ at: 'index.html', html: '<script>//When did we settle</script>' }] }).length === 2, 'style/script 被剥掉了');

  check('visibleText 剥自闭合与结束标签', visibleText('<br/><i x="1"></i>文') === '   文', JSON.stringify(visibleText('<br/><i x="1"></i>文')));

  const failed = results.filter((r) => !r.pass);
  console.log(`\nselftest: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
};

if (process.argv.includes('--selftest')) selftest();
else run();
