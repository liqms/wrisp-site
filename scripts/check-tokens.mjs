/**
 * 令牌完整性校验。三项断言，全在一进程内，不起浏览器：
 *   1) src/ 里每个 var(--x) 都能在 tokens.css 找到定义
 *   2) 文字族压底色族的 WCAG 对比达标（正文 4.5，大字与非文字 3.0）
 *   3) 组件内不出现字面色值，白名单走 scripts/color-baseline.json
 *
 *   node scripts/check-tokens.mjs            # 校验真实仓库
 *   node scripts/check-tokens.mjs --selftest # 只跑内置用例，不碰仓库
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = path.join(root, 'src/styles/tokens.css');
const BASELINE = path.join(root, 'scripts/color-baseline.json');

export const parseTokens = (css) => {
  const out = {};
  // 首次出现为准：tokens.css 末尾有 @media print 的同名覆写，若「后者覆盖前者」，
  // 对比度矩阵校验的就是打印色而非屏幕色，暗色达标会被亮色假象顶掉。
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) if (!(m[1] in out)) out[m[1]] = m[2].trim();
  return out;
};

const hexToRgb = (h) => {
  const s = h.replace('#', '');
  const f = s.length === 3 ? [...s].map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
};

/* WCAG 相对亮度：提到模块作用域，contrast 与自检的「亮度」用例共用同一份实现，
   否则自检用例只能退化成比较十六进制字符串，测的是解析结果不是亮度。 */
export const relLuminance = (h) => {
  const [r, g, bl] = hexToRgb(h).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
};

export const contrast = (a, b) => {
  const [x, y] = [relLuminance(a), relLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

export const checkRefs = (tokens, used) =>
  used.filter((n) => !(n in tokens)).map((n) => `undefined token ${n}`);

/* ---- 契约表：改这里等于改设计裁决，须同步 spec §5 ---- */
const TEXT_ON_BG = [
  { text: '--text-1', bgs: ['--bg', '--surface-1', '--surface-2', '--surface-3', '--band'], min: 4.5 },
  { text: '--text-2', bgs: ['--bg', '--surface-1', '--surface-2', '--surface-3'], min: 4.5 },
  { text: '--text-3', bgs: ['--bg', '--surface-1', '--surface-2', '--surface-3'], min: 4.5 },
  { text: '--accent-300', bgs: ['--bg', '--surface-1', '--surface-2', '--surface-3'], min: 4.5 },
  { text: '--accent-400', bgs: ['--bg', '--surface-1', '--surface-2', '--surface-3'], min: 4.5 },
  { text: '--ok', bgs: ['--bg', '--surface-2'], min: 4.5 },
  { text: '--warn', bgs: ['--bg', '--surface-2'], min: 4.5 },
  { text: '--err', bgs: ['--bg', '--surface-2'], min: 4.5 },
  { text: '--text-1', bgs: ['--accent-fill'], min: 4.5 },
];
/* 徽标是一对令牌自成一个 chip：文字须压得住自己的底 */
const BADGE_PAIRS = ['--badge-todo', '--badge-comp', '--badge-meet', '--badge-decide', '--badge-need'];
/* 非文字（focus ring、边界线索）门槛 3:1，WCAG 1.4.11 */
const NON_TEXT = [{ token: '--accent-300', against: ['--bg', '--surface-1', '--surface-2', '--surface-3'], min: 3.0 }];
/* 已知且被裁决接受的例外：--text-3 落在最深的面上只有 4.19，限 ≥24px 使用。
   例外不是「跳过」，而是换一个更低的地板继续断言——否则这一格等于没测。 */
const EXEMPT = [{ text: '--text-3', bg: '--surface-3', acceptedMin: 3.0, note: 'spec §5.2：仅 24px 以上或 19px bold' }];

export const checkMatrix = (tokens) => {
  const bad = [];
  const at = (name) => {
    const v = tokens[name];
    /* 只放行 3 位或 6 位：4/5 位（#RGBA / #RRGGBBAA）是合法 CSS，但 hexToRgb 按 1/3/5
       切片会读到越界空串，亮度变 NaN，而 NaN < 4.5 恒假——整张矩阵会报「零失败」，
       一个让所有文字不可见的令牌反而把闸门放绿。 */
    if (!v || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) throw new Error(`matrix needs a hex for ${name}, got ${v}`);
    return v;
  };
  for (const row of TEXT_ON_BG)
    for (const bg of row.bgs) {
      const e = EXEMPT.find((x) => x.text === row.text && x.bg === bg);
      const min = e ? e.acceptedMin : row.min;
      const r = contrast(at(row.text), at(bg));
      if (r < min) bad.push(`${row.text} on ${bg} = ${r.toFixed(2)} < ${min}${e ? ` (${e.note})` : ''}`);
    }
  for (const name of BADGE_PAIRS) {
    const r = contrast(at(name), at(`${name}-bg`));
    if (r < 4.5) bad.push(`${name} on ${name}-bg = ${r.toFixed(2)} < 4.5`);
  }
  for (const row of NON_TEXT)
    for (const bg of row.against) {
      const r = contrast(at(row.token), at(bg));
      if (r < row.min) bad.push(`(non-text) ${row.token} vs ${bg} = ${r.toFixed(2)} < ${row.min}`);
    }
  return bad;
};

const SCAN_DIRS = ['src/components', 'src/styles', 'src/layouts', 'src/pages'];
const LITERAL = /#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\)/g;
const ALLOW_FILES = new Set(['src/styles/tokens.css', 'src/layouts/Page.astro']);

const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(astro|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
};

/* 扫出「哪一行还有字面色」，一次扫描供校验与 --emit-baseline 共用 */
const scanLiteralLines = () => {
  const found = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const rel = path.relative(root, file).replace(/\\/g, '/');
      if (ALLOW_FILES.has(rel)) continue;
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/^\s*(\/\*|\*|\/\/)/.test(line)) return;
          if (rel.endsWith('.css') && line.includes('data:image/svg+xml')) return;
          const vals = [...line.matchAll(LITERAL)].map((m) => m[0]);
          if (vals.length) found.push({ key: `${rel}:${i + 1}`, vals });
        });
    }
  }
  return found;
};

export const checkLiterals = (baseline) => {
  const allowed = new Set(baseline);
  const seen = new Set();
  const hits = [];
  for (const { key, vals } of scanLiteralLines()) {
    seen.add(key);
    if (!allowed.has(key)) hits.push(`${key} ${vals.join(' ')}`);
  }
  // baseline 只能收缩，不能留死条目：某行已迁干净却还挂在清单上同样算失败，
  // 否则「清零」会变成一句永远无法证伪的承诺。
  for (const b of baseline) if (!seen.has(b)) hits.push(`baseline 死条目（该行已无字面色）：${b}`);
  return hits;
};

/* baseline 排序：先按文件名字典序，同名再按行号数值序。
   纯 sort() 的字典序会把 global.css:410 排在 :99 前面，人工核对收缩 diff 会误判漏行。 */
const SPLIT_KEY = /^(.*):(\d+)$/;
const byFileThenLine = (a, b) => {
  const [, fa, la] = SPLIT_KEY.exec(a) || [, a, '0'];
  const [, fb, lb] = SPLIT_KEY.exec(b) || [, b, '0'];
  return fa === fb ? Number(la) - Number(lb) : (fa < fb ? -1 : 1);
};

const emitBaseline = () => {
  const keys = [...new Set(scanLiteralLines().map((h) => h.key))].sort(byFileThenLine);
  console.log(JSON.stringify(keys, null, 2));
};

const run = () => {
  const css = fs.readFileSync(TOKENS, 'utf8');
  const tokens = parseTokens(css);
  const used = [...new Set([...css.matchAll(/var\((--[a-z0-9-]+)\b/g)].map((m) => m[1]))];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walk(abs))
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/var\((--[a-z0-9-]+)\b/g)) used.push(m[1]);
  }
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : [];

  const refBad = [...new Set(checkRefs(tokens, used))];
  let matrixBad = [], literalBad = [];
  try {
    matrixBad = checkMatrix(tokens);
  } catch (e) {
    matrixBad = [e.message];
  }
  literalBad = checkLiterals(baseline);

  check('每个 var() 引用都有定义', refBad.length === 0, refBad);
  check('文字族压得住底色族（WCAG AA）', matrixBad.length === 0, matrixBad);
  check('组件内无字面色，或已登记在 baseline', literalBad.length === 0, literalBad.slice(0, 30));

  const failed = results.filter((r) => !r.pass);
  console.log(`\ntokens=${Object.keys(tokens).length} baseline=${baseline.length}`);
  if (failed.length) {
    console.error(`\n=== TOKEN CHECK FAILED (${failed.length}) ===`);
    process.exit(1);
  }
  console.log('=== TOKEN CHECK PASSED ===');
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '  → ' + JSON.stringify(detail)));
};

if (process.argv.includes('--selftest')) {
  const FIXTURE = ':root{--bg:#0b0d12;--text-1:#f2f3f5;--space-1:4px;}';
  const t = parseTokens(FIXTURE);
  check('parseTokens 抓到三个令牌', Object.keys(t).length === 3, t);
  // 真断言相对亮度，不是比较字符串：#0b0d12 压底要足够暗，整套对比度矩阵才立得住
  const BG_LUM = relLuminance(t['--bg']);
  check('bg 相对亮度低于 .005', BG_LUM < 0.005, BG_LUM);
  // 首次出现为准：@media print 里的同名覆写不得顶掉屏幕值，否则矩阵测的是打印色
  const PRINT = parseTokens(':root{--x:#111111;}@media print{--x:#ffffff;}');
  check('print 覆写不顶掉首值', PRINT['--x'] === '#111111', PRINT);
  check('未定义令牌被点名', checkRefs(t, ['--bg', '--paper']).length === 1, checkRefs(t, ['--bg', '--paper']));
  check('contrast(#f2f3f5,#0b0d12) ≈ 17.5', Math.abs(contrast('#f2f3f5', '#0b0d12') - 17.5) < 0.1, contrast('#f2f3f5', '#0b0d12'));
  const SWAPPED = [contrast('#0b0d12', '#f2f3f5'), contrast('#f2f3f5', '#0b0d12')];
  check('contrast 对调参数结果相同', SWAPPED[0] === SWAPPED[1], SWAPPED);
  check('contrast 支持三位十六进制', Math.abs(contrast('#fff', '#000') - 21) < 0.01, contrast('#fff', '#000'));

  // 契约表本身也要被测到：夹具纯内存，不碰文件，所以 Task 3 前后都恒绿
  const FIX = {
    '--bg': '#0b0d12', '--surface-1': '#12151c', '--surface-2': '#171b23', '--surface-3': '#1e232c',
    '--band': '#2e609f', '--text-1': '#f2f3f5', '--text-2': '#a6adba', '--text-3': '#7b8496',
    '--accent-fill': '#4c5fd5', '--accent-400': '#6d82f5', '--accent-300': '#8fa0ff',
    '--ok': '#4ed17e', '--warn': '#f7ad31', '--err': '#f25a5a',
    '--badge-todo': '#f2a08c', '--badge-todo-bg': '#2a1a16', '--badge-comp': '#6fdba0',
    '--badge-comp-bg': '#16241c', '--badge-meet': '#93b4f5', '--badge-meet-bg': '#1a2030',
    '--badge-decide': '#e3bf6a', '--badge-decide-bg': '#241f14', '--badge-need': '#c9a2d8',
    '--badge-need-bg': '#221a26',
  };
  check('完整暗色夹具过矩阵', checkMatrix(FIX).length === 0, checkMatrix(FIX));
  // 失败时要把实际算出的格子打出来，光传 null 等于「红了不知道为什么红」
  const TEXT3_FAIL = checkMatrix({ ...FIX, '--text-3': '#4a5162' });
  check('例外格仍然被断言（把 text-3 调暗到 3.0 以下要报红）',
    TEXT3_FAIL.some((m) => m.includes('--text-3 on --surface-3')), TEXT3_FAIL);
  const BADGE_FAIL = checkMatrix({ ...FIX, '--badge-todo': '#6b3a2c' });
  check('徽标字压自己的底，改坏一个要报红',
    BADGE_FAIL.some((m) => m.includes('--badge-todo')), BADGE_FAIL);
  // 这一格证明上面的收紧真的咬得住：松回 {3,6} 时 checkMatrix 会静默返回 []（见自检输出）。
  let SHORT_HEX_OUTCOME;
  try {
    SHORT_HEX_OUTCOME = { thrown: false, bad: checkMatrix({ ...FIX, '--text-1': '#1111' }) };
  } catch (e) {
    SHORT_HEX_OUTCOME = { thrown: true, msg: e.message };
  }
  check('4 位十六进制被形状守卫抛错挡下（不静默返回零失败）',
    SHORT_HEX_OUTCOME.thrown && /matrix needs a hex for --text-1, got #1111/.test(SHORT_HEX_OUTCOME.msg),
    SHORT_HEX_OUTCOME);

  const failed = results.filter((r) => !r.pass);
  console.log(`\nselftest: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--emit-baseline')) emitBaseline();
else run();
