/**
 * 构建期生成 dist/robots.txt 与 dist/sitemap.xml（零依赖）。
 *
 * 地址不在这儿重新拼：脚本读已构建页面里的 canonical 与 hreflang，
 * 站点地图因此不可能和页面各说一套口径——爬虫两处看到的必须同源。
 * 域名单一来源仍是 astro.config.mjs 的 site，这里只取它算 Sitemap 行的绝对地址。
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

const urls = [];
for (const file of (await htmlFiles(DIST)).sort()) {
  const html = await readFile(file, 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
  const canonical = links.find((t) => /rel="canonical"/.test(t));
  const loc = canonical && attr(canonical, 'href');
  if (!loc) throw new Error(`${file} has no canonical — sitemap would go silent`);
  const alternates = links
    .filter((t) => /rel="alternate"/.test(t))
    .map((t) => ({ lang: attr(t, 'hreflang'), href: attr(t, 'href') }))
    .filter((a) => a.lang && a.href);
  // 单语页没有成对互指，站点地图的 xhtml:link 也就无从写起；缺语言前缀通常是路由漏了
  if (alternates.length < 2) throw new Error(`${file} has ${alternates.length} hreflang alternate(s)`);
  urls.push({ loc, alternates });
}

urls.sort((a, b) => a.loc.localeCompare(b.loc));

const body = urls
  .map(
    (u) =>
      `  <url>\n` +
      `    <loc>${u.loc}</loc>\n` +
      u.alternates
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}"/>`)
        .join('\n') +
      `\n  </url>`,
  )
  .join('\n');

const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
  'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  body +
  '\n</urlset>\n';

const robots =
  'User-agent: *\nAllow: /\n\n' + `Sitemap: ${new URL('sitemap.xml', config.site).href}\n`;

await writeFile(`${DIST}/sitemap.xml`, sitemap, 'utf8');
await writeFile(`${DIST}/robots.txt`, robots, 'utf8');
console.log(`sitemap.xml: ${urls.length} urls | robots.txt: ${robots.trim().split('\n').length} lines`);
