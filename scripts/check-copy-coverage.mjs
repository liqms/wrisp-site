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
const pages = {
  zh: fs.readFileSync(path.join(root, 'dist/zh/index.html'), 'utf8'),
  en: fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'),
};

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
const appears = (html, value) => html.includes(esc(value)) || html.includes(value);
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
const leaked = strayCjk(pages.en);

console.log(`leaves=${leaves.length} missing=${missing.length} en-cjk=${leaked.length}`);
for (const m of missing) console.log('  MISS ' + m);
for (const w of leaked) console.log('  CJK  ' + w);
if (missing.length || leaked.length) {
  console.error('=== COPY CHECK FAILED ===');
  process.exit(1);
}
console.log('=== COPY CHECK PASSED ===');
