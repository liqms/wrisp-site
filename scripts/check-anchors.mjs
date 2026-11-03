/**
 * 锚点完整性校验（构建后跑）：node scripts/check-anchors.mjs
 *
 * SP-2 把导航层整个撤掉，章节定位从此只交给滚动：站内只剩四处入站锚点引用。
 * 改口只要漏掉一处，点下去就是「跳到不存在的地方」，而且静默——Astro 不做断链检查，
 * CI 的 Sanity checks 只看绝对路径链接、不看 `#`。§6 要的正是把这两个人工核对项变成机检：
 *   1) 全站 `href="#…"` 的取值只能落在 ALLOWED 五个 id 里，出现别的即失败；
 *   2) 每条锚点在其指向的那份 HTML 里确有同 id 元素；
 *   3) 双语首页各自都装有五个 id（少一个说明装配漏了区，而不是引用写错）。
 * 用法与 check-tokens.mjs 一致：--selftest 只跑内置夹具，不碰仓库与 dist。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'dist');
// 与 astro.config.mjs 的 BASE 同值；改 base 必须同改这里，否则跨页锚点全被当成站外。
const BASE = '/wrisp-site/';

// spec §6：改完后站内 href="#…" 的取值集合收敛为这五个。
export const ALLOWED = ['top', 'how', 'proofs', 'faq', 'next'];

export const hrefsIn = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

/**
 * 把一条 href 拆成「哪一页的哪个锚点」。
 * 三种在用的形态：`#how`（同页）、`/wrisp-site/zh/#next`（跨语言首页）、
 * `/wrisp-site/#next`（首页）；其余带 `#` 的一律视为站外，不断链。
 * `href="#"` 不在此拦——CI 的占位死链守卫已经盯着它，重复断言只会多一处漂移点。
 */
export const resolveAnchor = (href) => {
  const hash = href.indexOf('#');
  if (hash < 0) return null;
  const frag = href.slice(hash + 1);
  if (!frag) return null;
  const before = href.slice(0, hash);
  if (before === '') return { page: '.', frag };
  if (!before.startsWith(BASE)) return null;
  const rel = before.slice(BASE.length).replace(/\/$/, '');
  return { page: rel === '' ? '.' : rel, frag };
};

/** pages: [{ at: 'index.html' | 'zh/index.html' | 'privacy/index.html', html }] */
export const checkAnchors = (pages) => {
  const byDir = new Map(pages.map((p) => [path.posix.dirname(p.at), p.html]));
  const bad = [];
  const used = new Set();
  for (const p of pages) {
    for (const href of hrefsIn(p.html)) {
      const anchor = resolveAnchor(href);
      if (!anchor) continue;
      used.add(anchor.frag);
      const target = byDir.get(anchor.page);
      if (target === undefined) {
        bad.push(`${p.at}: ${href} 指向的页面不在 dist 里`);
      } else if (!target.includes(`id="${anchor.frag}"`)) {
        bad.push(`${p.at}: ${href} 在 ${anchor.page} 里没有同 id 元素`);
      }
    }
  }
  for (const frag of used) if (!ALLOWED.includes(frag)) bad.push(`锚点 #${frag} 不在 §6 允许的集合里`);
  for (const home of ['index.html', 'zh/index.html']) {
    const html = byDir.get(path.posix.dirname(home));
    for (const id of ALLOWED) {
      if (!html || !html.includes(`id="${id}"`)) bad.push(`${home} 缺少 id="${id}"`);
    }
  }
  return bad;
};

const htmlFiles = (dir, acc = []) => {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) htmlFiles(p, acc);
    else if (item.name === 'index.html') acc.push(p);
  }
  return acc;
};

const run = () => {
  if (!fs.existsSync(DIST)) {
    console.error('=== ANCHOR CHECK FAILED ===\ndist 不存在，先跑 pnpm build');
    process.exit(1);
  }
  const pages = htmlFiles(DIST).map((f) => ({
    at: path.relative(DIST, f).split(path.sep).join('/'),
    html: fs.readFileSync(f, 'utf8'),
  }));
  const bad = [...new Set(checkAnchors(pages))];
  check('站内每个锚点都指向存在的 id，且取值在 §6 集合内', bad.length === 0, bad.slice(0, 30));
  const failed = results.filter((r) => !r.pass);
  console.log(`\nanchors=${new Set(pages.flatMap((p) => hrefsIn(p.html).map((h) => resolveAnchor(h)?.frag).filter(Boolean))).size} pages=${pages.length}`);
  if (failed.length) {
    console.error(`\n=== ANCHOR CHECK FAILED (${failed.length}) ===`);
    process.exit(1);
  }
  console.log('=== ANCHOR CHECK PASSED ===');
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '  → ' + JSON.stringify(detail)));
};

if (process.argv.includes('--selftest')) {
  check('裸锚点算同页', resolveAnchor('#how')?.page === '.', resolveAnchor('#how'));
  check('首页带 base 的锚点也归同页', resolveAnchor('/wrisp-site/#next')?.page === '.', resolveAnchor('/wrisp-site/#next'));
  check('中文首页的锚点解析到 zh', resolveAnchor('/wrisp-site/zh/#next')?.page === 'zh', resolveAnchor('/wrisp-site/zh/#next'));
  check('站外带 # 的链接不参与断链判断', resolveAnchor('https://example.com/a#b') === null, resolveAnchor('https://example.com/a#b'));
  check('没有 # 的链接返回 null', resolveAnchor('/wrisp-site/privacy/') === null, null);
  check('空锚点交给 CI 的死链守卫', resolveAnchor('#') === null, null);

  const OK = [
    { at: 'index.html', html: '<main id="top"><a href="#how">x</a><a href="/wrisp-site/zh/#next">y</a></main><section id="how"></section><section id="proofs"></section><section id="faq"></section><section id="next"></section>' },
    { at: 'zh/index.html', html: '<main id="top"></main><section id="how"></section><section id="proofs"></section><section id="faq"></section><section id="next"></section><a href="/wrisp-site/zh/#next">z</a>' },
  ];
  check('双语首页锚点齐全 → 零失败', checkAnchors(OK).length === 0, checkAnchors(OK));
  // 负用例必须逐条证伪：少了这三格，上面那句「零失败」可能只是断言没咬住。
  const DEAD = [{ ...OK[0], html: OK[0].html.replace('href="#how"', 'href="#waitlist"') }, OK[1]];
  check('改口漏一处 → 同时报「没有同 id」与「不在允许集合」',
    checkAnchors(DEAD).some((m) => m.includes('#waitlist')) &&
      checkAnchors(DEAD).some((m) => m.includes('没有同 id 元素')),
    checkAnchors(DEAD));
  const NOHOME = [OK[0], { ...OK[1], html: OK[1].html.replace('id="faq"', 'id="other"') }];
  check('中文首页漏一个区 → 报缺 id', checkAnchors(NOHOME).some((m) => m.includes('zh/index.html 缺少 id="faq"')), checkAnchors(NOHOME));

  const failed = results.filter((r) => !r.pass);
  console.log(`\nselftest: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

run();
