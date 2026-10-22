/**
 * 边缘路由层：只在站点根路径上做一次 302，把访客交给对他更合适的那一版页面。
 *
 * 内容层是 GitHub Pages 上的四份完整静态页（`/` = 英文、`/zh/` = 中文，各自可索引）。
 * Pages 没有地区路由能力，所以这一层单独存在。它的全部职责就是下面三条铁律
 * （改任何一条前，先看 edge/README.md 的「跳转层 router/」一节，那里给每条都配了反例）。
 * 三条本身：
 *
 *   1. **只发 302，绝不 301**——永久重定向会让搜索引擎只收录一种语言，
 *      等于把另一版页面从索引里删掉。
 *   2. **用户显式选择优先于地区规则**——语言开关写下的 `wrisp_lang` cookie 先读，
 *      有它就不猜。否则中文用户手动点 EN 后，下次访问又被跳回 `/zh/`。
 *   3. **不改写响应体**——语言由 URL 决定，同一 URL 返回不同内容会让爬虫与 CDN
 *      的行为不可预测，所以这里只碰跳转，其余请求原样透传。
 *
 * 本地验：`node edge/router/smoke.mjs`（纯函数用例，不需要账号）。
 */

/** 从 Cookie 头里取显式语言选择；只认这两个值，别的当作没看见。 */
export function readLang(cookieHeader) {
  for (const part of String(cookieHeader || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== 'wrisp_lang') continue;
    const value = part.slice(eq + 1).trim();
    if (value === 'en' || value === 'zh') return value;
  }
  return '';
}

/**
 * 决定这一跳去哪里，返回 '' 表示不跳转。
 *
 * 只在两个站点根上动作：深链接、辅助页、`/_astro/*` 资产一概不碰——它们在哪儿就该
 * 在哪儿，跳一次只会打断分享链接与爬虫抓取。
 */
export function decide(pathname, headers, opts = {}) {
  const base = opts.base || '';
  const enRoot = base + '/';
  const zhRoot = base + '/zh/';
  if (pathname !== enRoot && pathname !== zhRoot) return '';

  const here = pathname === zhRoot ? 'zh' : 'en';
  let want = readLang(headers.get('cookie'));
  if (!want) want = guess(headers, opts);
  // 猜不出来就留在默认版；默认版是英文（v0.19 裁决），多发一次 302 到 / 只是白送一个往返。
  if (!want || want === here) return '';
  return want === 'zh' ? zhRoot : enRoot;
}

/**
 * 没有显式选择时才猜，两条线索按强弱排。
 * 国家码只认 CN：英文站面向全球，把日本/德国的访客按语言猜错，代价比不猜大。
 */
function guess(headers, opts) {
  const country = (opts.country || headers.get('cf-ipcountry') || '').toUpperCase();
  if (country === 'CN') return 'zh';
  const first = (headers.get('accept-language') || '').toLowerCase().split(',')[0].trim();
  if (first.startsWith('zh')) return 'zh';
  if (first.startsWith('en')) return 'en';
  return '';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // 只给 GET 挑语言：非 GET 打上 302 会被浏览器改成 GET 再发一次，等于替访问者改了请求方法。
    if (request.method !== 'GET') return passthrough(request, url, env);
    const base = (env.BASE_PATH || '').replace(/\/$/, '');
    const target = decide(url.pathname, request.headers, {
      base,
      country: env.FORCE_COUNTRY || '',
    });
    if (!target) return passthrough(request, url, env);

    // 查询串必须带上：推广链接的 ?utm_* 在这儿丢了，等于把来源数据抹掉。
    return new Response(null, {
      status: 302,
      headers: {
        location: target + url.search,
        // 跳转取决于 cookie 与请求头，被 CDN 缓存下来就会把别人的语言塞给下一位。
        'cache-control': 'no-store',
        vary: 'Cookie, Accept-Language, CF-IPCountry',
      },
    });
  },
};

/**
 * 透传：内容永远由 Pages 出，这一层不复制、不改写、不缓存。
 * 头信息按白名单转发——语言偏好那张 cookie 没有必要跟着请求送到 GitHub 那里去。
 */
async function passthrough(request, url, env) {
  const origin = (env.ORIGIN || 'https://liqms.github.io').replace(/\/$/, '');
  const headers = new Headers();
  for (const name of ['accept-language', 'user-agent', 'sec-fetch-mode', 'sec-fetch-dest', 'referer']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return fetch(origin + url.pathname + url.search, { headers });
}
