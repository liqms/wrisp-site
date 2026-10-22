/**
 * 文案落地与语言纯净度校验（构建后跑）：
 *   node scripts/check-copy-coverage.mjs
 *
 * 双语键是否成对由 src/content/copy 的 schema 在构建期保证；这里补的是另一半——
 * 一条文案两种语言都写全了，却可能根本没被任何组件引用。所以逐叶子回比构建产物：
 * 少一条即失败。顺带扫英文页的中文残留：语言开关上的「中文」是刻意保留的第三语言
 * 标识，除此之外英文页不该出现汉字。
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
const htmlFiles = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? htmlFiles(path.join(dir, item.name))
        : item.name === 'index.html'
          ? [path.join(dir, item.name)]
          : [],
    );
const pages = { zh: [], en: [] };
for (const file of htmlFiles(DIST)) {
  const locale = path.relative(DIST, file).split(path.sep)[0] === 'zh' ? 'zh' : 'en';
  pages[locale].push({ at: path.relative(DIST, file), html: fs.readFileSync(file, 'utf8') });
}
if (pages.zh.length === 0 || pages.en.length === 0) {
  console.error('=== COPY CHECK FAILED ===');
  console.error(`dist 里没有双语页面（zh=${pages.zh.length} en=${pages.en.length}），先跑 pnpm build`);
  process.exit(1);
}

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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
for (const file of fs.readdirSync(COPY)) walk(JSON.parse(fs.readFileSync(path.join(COPY, file), 'utf8')), file.replace(/\.json$/, ''));

const missing = [];
/* 属性里的单引号不转义、正文里的转义，两种写法都算命中。 */
const appears = (group, value) => group.some((p) => p.html.includes(esc(value)) || p.html.includes(value));
for (const leaf of leaves) {
  if (!appears(pages.zh, leaf.zh)) missing.push(`zh  ${leaf.at}: ${leaf.zh}`);
  if (!appears(pages.en, leaf.en)) missing.push(`en  ${leaf.at}: ${leaf.en}`);
}

const ALLOWED_CJK = new Set(['中文']);
const CJK_WORD = new RegExp('[\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff]{2,}', 'g');
const strayCjk = (html) => {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return [...new Set(text.match(CJK_WORD) || [])].filter((w) => !ALLOWED_CJK.has(w));
};
const leaked = [...new Set(pages.en.flatMap((p) => strayCjk(p.html).map((w) => `${p.at} ${w}`)))];

console.log(`leaves=${leaves.length} pages=${pages.zh.length + pages.en.length} missing=${missing.length} en-cjk=${leaked.length}`);
for (const m of missing) console.log('  MISS ' + m);
for (const w of leaked) console.log('  CJK  ' + w);
if (missing.length || leaked.length) {
  console.error('=== COPY CHECK FAILED ===');
  process.exit(1);
}
console.log('=== COPY CHECK PASSED ===');
