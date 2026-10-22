/**
 * 边缘路由层的本地验：纯函数用例 + 用替身 globalThis.fetch 打一遍 handler。
 *
 *   node edge/router/smoke.mjs
 *
 * 不连真 Pages，也不需 Cloudflare 账号：这一层的全部职责就是「什么时候跳、跳到哪、
 * 跳的时候带什么头」，三样都能在进程内断言。透传部分只验证「转发了什么、没转发什么」，
 * 真实可达性要等部署后在线上确认。
 */
import { decide, readLang } from './worker.js';
import handler from './worker.js';

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '  → ' + JSON.stringify(detail)));
};
const H = (o) => new Headers(o);
const BASE = '/wrisp-site';
const root = (path, headers, opts = {}) => decide(path, H(headers), { base: BASE, ...opts });

/* ---- 铁律 2：显式选择压过地区规则 ---- */
check('CN 无偏好 → /zh/', root(BASE + '/', { 'cf-ipcountry': 'CN' }) === BASE + '/zh/',
  root(BASE + '/', { 'cf-ipcountry': 'CN' }));
check('CN 但显式选了 EN → 不跳', root(BASE + '/', { 'cf-ipcountry': 'CN', cookie: 'wrisp_lang=en' }) === '',
  root(BASE + '/', { 'cf-ipcountry': 'CN', cookie: 'wrisp_lang=en' }));
check('已在 /zh/ 且显式选中文 → 不跳（不自跳自己）',
  root(BASE + '/zh/', { cookie: 'wrisp_lang=zh' }) === '');
check('显式选中文却落在英文页 → 跳回 /zh/',
  root(BASE + '/', { 'cf-ipcountry': 'US', cookie: 'wrisp_lang=zh' }) === BASE + '/zh/');
check('cookie 里有别的键也能取到那一个',
  readLang('_ga=GA1.1.x; wrisp_lang=zh; other=1') === 'zh');
check('cookie 值不认识就当没有（不拿来盖地区规则）',
  root(BASE + '/', { 'cf-ipcountry': 'CN', cookie: 'wrisp_lang=fr' }) === BASE + '/zh/');

/* ---- 猜语言的两条线索 ---- */
check('US + Accept-Language en → 不跳', root(BASE + '/', { 'cf-ipcountry': 'US', 'accept-language': 'en-US,en;q=0.9' }) === '');
check('无国家码，首项 zh-CN → /zh/', root(BASE + '/', { 'accept-language': 'zh-CN,zh;q=0.9' }) === BASE + '/zh/');
check('首项英文、后面才中文 → 不跳（只看第一项）',
  root(BASE + '/', { 'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8' }) === '');
check('第三种语言不乱猜', root(BASE + '/', { 'accept-language': 'de-DE,fr;q=0.9' }) === '');
check('FORCE_COUNTRY 覆盖用于验线上行为',
  decide(BASE + '/', H(), { base: BASE, country: 'cn' }) === BASE + '/zh/');

/* ---- 铁律 3：只碰两个根，其余一律不动 ---- */
for (const p of [BASE + '/privacy/', BASE + '/zh/privacy/', BASE + '/_astro/index.css', BASE + '/sitemap.xml', '/']) {
  check('非根路径不跳：' + p, decide(p, H({ 'cf-ipcountry': 'CN' }), { base: BASE }) === '');
}

/* ---- handler：302 的形状 ---- */
const realFetch = globalThis.fetch;
let forwarded = null;
globalThis.fetch = async (url, init) => {
  forwarded = { url: String(url), headers: init?.headers };
  return new Response('from pages', { status: 200, headers: { 'content-type': 'text/html' } });
};
const ENV = { BASE_PATH: BASE, ORIGIN: 'https://liqms.github.io' };

const jump = await handler.fetch(new Request('https://edge.example/wrisp-site/?utm_source=weibo', {
  headers: { 'cf-ipcountry': 'CN', cookie: 'wrisp_lang=zh; _ga=1', 'accept-language': 'zh-CN' },
}), ENV);
check('跳的是 302，不是 301', jump.status === 302, jump.status);
check('location 指向 /zh/', jump.headers.get('location') === '/wrisp-site/zh/?utm_source=weibo',
  jump.headers.get('location'));
check('跳转响应 no-store（否则会把别人的语言发给下一位）',
  jump.headers.get('cache-control') === 'no-store');
check('跳转带 Vary: Cookie', /Cookie/.test(jump.headers.get('vary') || ''), jump.headers.get('vary'));
check('302 不查上游', forwarded === null);

const stay = await handler.fetch(new Request('https://edge.example/wrisp-site/privacy/', {
  headers: { 'cf-ipcountry': 'CN', cookie: 'wrisp_lang=zh', 'accept-language': 'zh-CN' },
}), ENV);
check('非根路径透传上游内容', stay.status === 200 && (await stay.text()) === 'from pages');
check('透传指向 Pages 而不是自己', forwarded?.url === 'https://liqms.github.io/wrisp-site/privacy/', forwarded?.url);
check('透传不带访客的 cookie（语言偏好没必要送去 GitHub）',
  !forwarded?.headers.get('cookie'), Object.fromEntries(forwarded?.headers || []));
check('透传保留 accept-language', forwarded?.headers.get('accept-language') === 'zh-CN');

const post = await handler.fetch(new Request('https://edge.example/wrisp-site/', {
  method: 'POST', headers: { 'cf-ipcountry': 'CN' },
}), ENV);
check('POST 不被改成 302（浏览器会把它降级成 GET）', post.status === 200 && forwarded?.url.endsWith(BASE + '/'), post.status);

/* ---- 没配 BASE_PATH 时就是站点根 ---- */
check('BASE_PATH 为空时 / 与 /zh/ 仍成对',
  decide('/', H({ 'cf-ipcountry': 'CN' }), {}) === '/zh/'
  && decide('/zh/', H({ 'cf-ipcountry': 'CN' }), {}) === '');

globalThis.fetch = realFetch;

const failed = results.filter((r) => !r.pass);
console.log('\n=== ' + (failed.length ? failed.length + ' FAILURES' : 'ROUTER SMOKE PASSED') + ' ===');
if (failed.length) process.exit(1);
