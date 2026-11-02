# SP-1 暗色令牌与基元层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `wrisp-site` 的设计令牌层从暖纸亮色整体翻成蓝调暗色，并让「令牌完整性」从注释纪律变成 CI 可机检项。

**Architecture:** 一个权威令牌文件（`src/styles/tokens.css`）定义全部颜色、字阶、间距、圆角；一个新校验脚本（`scripts/check-tokens.mjs`）对这份文件做三项断言——每个 `var()` 引用都有定义、文字族压底色族的 WCAG 对比达标、组件内不出现字面色值。迁移按文件推进，靠一份 baseline 清单允许「已迁移的文件干净、未迁移的文件带旧色」共存，每个任务删掉自己那几行 baseline，最后一行不剩。

**Tech Stack:** Astro 7（`^7.0.0`，唯一运行时依赖）、Node `>=22.23.4`、pnpm `11.0.9`、纯 CSS 自定义属性、GitHub Actions（`.github/workflows/deploy.yml`）。无测试框架：校验脚本沿用 `edge/router/smoke.mjs` 的 `check(name, pass, detail)` 收集 + `✓/✗` 打印 + 非零退出这一套进程内断言风格。

**Spec:** [.superpowers/specs/2026-11-02-wrisp-site-dark-redesign-design.md](../specs/2026-11-02-wrisp-site-dark-redesign-design.md) —— 本计划实现其 §5（令牌契约）、§10（验收与机检）、§11（边界与错误处理）、§3 里 CI webfont 守卫那条。**先读 §2 的 15 条裁决**，任务里出现的每个数值都来自那里。

## Global Constraints

每个任务都受这组约束，值一律从 spec 逐字取：

- 不新增运行时依赖。`package.json` 的 `dependencies` 只允许 `astro`。
- 不加载新 webfont（D-9）。`public/assets/` 保持只有 `newsreader-700-latin.woff2`（23,796 B），`@font-face` 只声明 `font-weight:700`。
- 组件内不写字面色值，颜色全走令牌（本计划起由 CI 强制）。
- 文案改动只发生在 `src/content/copy/`，且 `{ zh, en }` 成对。**本计划不改任何文案**——文案与区块重排属于 SP-2/SP-3。
- Astro 模板里不写 `<!-- -->` HTML 注释，它会随产物发给访问者；要解释就写在组件顶部 `---` 之间的 frontmatter 注释里。
- 中文侧标题保持零字距：`global.css` 的 `:lang(zh) h1,h2,h3 { letter-spacing: 0 }` 与 `:root:lang(zh) body { line-height: 1.75 }` 不得改动（既有裁决）。
- 每个组件的 `.reveal` 用法保持 `.js` 前缀 + `prefers-reduced-motion` 双兜。
- 验收命令固定为 `pnpm build && pnpm check`，两者都必须退出码 0。
- **SP-1 不得混入任何内容/文案/区块改动**（spec §10 的 revert 单位要求）。在功能分支上按任务逐条提交，合回 `main` 时**压成单个提交**，这样「一次 revert 回到旧脸」才成立。
- 不在 `main` 上直接实施：用 superpowers:using-git-worktrees 建隔离工作区，或按 Task 1 Step 2 在本仓 `git switch -c feat/sp1-dark-tokens`。二者取其一即可，别两个都建。

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/styles/tokens.css` | 重写 | 唯一的令牌源。颜色、字阶、间距、圆角、字体栈、全局 reset |
| `src/styles/global.css` | 改 | 基元层：标题/正文套用字阶令牌、`.band` 换面差、`.reveal` 幅度、focus ring、`@media print`；另有 **15 行字面色**要迁走（逐行落点见 Task 4 Step 4） |
| `scripts/check-tokens.mjs` | 新建 | 三项令牌完整性断言 + 自检；读 baseline 清单 |
| `scripts/color-baseline.json` | 新建后逐任务清空 | 尚未迁移的文件白名单，最终必须为空数组 |
| `src/components/blocks/Hero.astro` | 改 | 迁移 **21 行 / 22 处**字面色（5 组徽标 + 3 个窗控点 + 首屏两层渐变 + 一道投影） |
| `src/components/blocks/Persona.astro`、`Proofs.astro` | 改 | 迁移 19 + 6 行，含 12 个 SVG `fill` 属性；Proofs 另有 3 处 9–10px 字号上提 |
| `Data/Diff/Cta/Faq/Pain/Pricing/Roadmap/Work.astro`、`Import.astro`、`pages/Privacy.astro`、`SiteNav.astro`、`WaitlistForm.astro` | 改 | 迁移其余字面色与旧令牌引用（Cta 9 行、Roadmap 5 行、Pain 2 行最容易被漏） |
| `src/layouts/Page.astro` | 改 | `:54` 的 `theme-color` 从 `#FAFAF7` 改成 `#0b0d12`（spec 未逐条裁决，按 D-1 推定，见 Task 4 Step 5） |
| `.github/workflows/deploy.yml` | 改 | 挂上 `check-tokens`；webfont 守卫按 spec §10.3 重定范围 |

旧令牌 → 新令牌的机械映射（迁移时按这张表替换，不要自创）：

| 旧 | 新 | 备注 |
|---|---|---|
| `--paper` | `--bg` | 仅 body 用 |
| `--paper-2` | `--surface-1` | `.band` 底 |
| `--paper-3` | `--surface-2` | 卡底 |
| `--ink` | `--text-1` | |
| `--ink-2` | `--text-2` | |
| `--muted` | `--text-3` | 落在 `--surface-3` 上时须 ≥24px |
| `--line` | `--hair-1` | |
| `--line-2` | `--hair-2` | |
| `--accent`（当文字/图标色） | `--accent-300` | **不是** `--accent-fill`。旧值压暗底只有 3.61，正文不达标 |
| `--accent`（当填充/描边） | `--accent-fill` | |
| `--accent-ink` | 对应徽标的 `--badge-*` 文字令牌 | 五个徽标各有自己的文字色 |
| `--accent-soft` | 对应徽标的 `--badge-*-bg`；非徽标处（chip 底）用 `--surface-3` | |
| `--accent-line` | `--hair-2` | 装饰发丝线归入发丝线族 |
| `--on-dark` / `-2` / `-3` | `--text-1` / `-2` / `-3` | 暗色下三者已是同一用途 |
| `--radius` | `--r-card` | |
| `--radius-sm` | `--r-sm` | |
| `--radius-panel` | `--r-panel` | |

实测的字面色共 **94 处 / 93 行**，分布在 14 个文件（`node /tmp` 复算脚本见 Task 2 Step 3 的 baseline 说明；`tokens.css` 与 `Page.astro` 按 spec §10.2 免扫）。落点映射：

| 字面值 | 处数 | 新令牌 |
|---|---|---|
| `#fff`（作 CSS 背景：卡面、圆点、输入底、幽灵按钮、目录按钮、语言切换件） | 24 | `--surface-2`（卡/面板底）或 `--surface-3`（凸起点、输入底、chip 底） |
| `#fff`（作 CSS 前景文字，压在 `--accent-fill` 上） | 3 | `--text-1`：`.btn-primary`（`global.css:167`）、`Work.astro:87` 的 `.snum.current`、`global.css:388` 的 `.waitlist.on-dark input` |
| `#fff`（SVG `fill` 或 `stroke`，图标实心） | 14 | `style="fill: var(--text-1)"`。**注意**：`fill="var(--x)"` / `stroke="var(--x)"` 作为呈现属性不被解析，必须走 `style` |
| `#f1b0a0` / `#edd38c` / `#9fcea9`（各 6 处：窗口三点 + Persona 图标 + Proofs 点） | 18 | `--dot-r` / `--dot-y` / `--dot-g` |
| `#fdeee8`/`#b04a2e`、`#e7f2ee`/`#23694c`、`#e7ecfa`/`#334e9c`、`#f4efe0`/`#8a6d1c`、`#efeaef`/`#6d4a75`（五组徽标底+字；`#b04a2e` 另有 `global.css:345` 一处） | 11 | `--badge-todo-bg`/`--badge-todo`、`-comp-`、`-meet-`、`-decide-`、`-need-` |
| `rgba(245,245,241,0.05–0.08)`（Cta 区 11 号骨架图的 7 条发丝线） | 7 | `style="stroke: var(--hair-1)"` / `fill: var(--hair-1)` |
| `rgba(245,245,241,0.18)`（`Import.astro:144`）、`rgba(245,245,241,0.28)`（`Pain.astro:96`） | 2 | `--hair-2` / `--hair-3`（原本就画在深底上的强线） |
| `rgba(250,250,247,0.88 / 0.92)`（`global.css:99` 吸顶导航、`:243` 目录条） | 2 | 新增 `--nav-bg` / `--chapter-bg`（见 §5 回写项） |
| `rgba(76,95,213,0.08)`（`Hero.astro:112` 首屏柔光）、`rgba(76,95,213,0.55)`（`Cta.astro:61` 11 区辉光） | 2 | 新增 `--glow-soft` / `--glow-strong` |
| `rgba(31,35,40,0.04 / 0.05 / 0.28)`（`Hero.astro:113` 点阵 + `:183` 卡投影） | 3 | 点阵 → `radial-gradient(var(--hair-1) 1px, transparent 1px)`；**投影按 spec §5.1「不引入投影」整条删掉**，不是换色 |
| `rgba(255,255,255,0.05 / 0.08 / 0.22)`（`global.css:406/386/387`，`.waitlist.on-dark` 一族） | 3 | `--hair-1` / `--surface-3` / `--hair-2`（该族 SP-2 才删，此处只做令牌迁移） |
| `rgba(46,158,107,0.35)` / `rgba(46,158,107,0)`（`Roadmap.astro:178/181` 已上线节点的呼吸圈） | 2 | 新增 `--ok-weak`；透明终态写 `transparent` |
| `#7fd9a8`（`global.css:398`）、`#f0a98c`（`:402`） | 2 | `--ok` / `--err`（新值本就提亮过，不再需要单独一档） |
| `#D7DDF6`（`Diff.astro:132` 的 `border-right-color`） | 1 | `--hair-3` |

**spec 回写项**（撰写计划时实测出来的空白，spec §5 没写、但暗色翻转必须有落点；本计划 Task 3 实现它们，并在 Task 8 Step 6 请维护者复核后写回 spec §5.1/§5.4）：

1. `--nav-bg: rgba(11, 13, 18, 0.82)`、`--chapter-bg: rgba(11, 13, 18, 0.9)` —— 两块半透明吸顶层。它们不能并进 `--bg`，因为 alpha 与色值绑在一起；也不能留在组件里，否则 baseline 永远清不空。
2. `--glow-soft: rgba(76, 95, 213, 0.08)`、`--glow-strong: rgba(76, 95, 213, 0.55)` —— 首屏柔光与 11 区辉光，都是品牌蓝的两个 alpha 档，不新增色相。
3. `--ok-weak: rgba(78, 209, 126, 0.35)` —— Roadmap 已上线节点的呼吸圈，必须跟到新 `--ok`，沿用旧 `#2e9e6b` 的 alpha 会在暗底上偏灰。
4. `Page.astro:54` 的 `<meta name="theme-color" content="#FAFAF7">` —— 纯暗色（D-1）下浏览器 UI 应走 `--bg` 的 `#0b0d12`。
5. `Hero.astro:183` 的卡片投影整条删除，而不是换色：spec §5.1 明写「层次只靠面与底的亮度差，不引入投影」。这是 SP-1 里唯一一处非令牌级的视觉改动，须在报告里点名。

另：spec §10.2 初稿写的「现状 62 处（`#fff` 33 处）」是只数十六进制、漏了 `rgba()` 的估值。实测 94 处匹配 / 93 行（`#fff` 41 处），且扫描口径按 spec 文面含 `src/styles`（`global.css` 自己占 15 行）。**spec 已按这个实测数更正**，本计划的 baseline 以 93 行为准。

---

### Task 1: 工作区清场与基线锁定

**Files:**
- Read only：`git status`、`pnpm build`、`pnpm check`

**Interfaces:**
- Consumes: 无
- Produces: 一个干净的 `main` 基线，以及记在任务报告里的基线 commit SHA（后续任务用它对照产物差异）

- [ ] **Step 1: 确认工作区是否干净**

```bash
git status --porcelain
```

预期：空输出。**若不为空，立即停止本计划并向人类报告，不要继续。**

已知的实情是：会话开始时 `git status --porcelain` 输出了 13 个 ` M ` 文件（`src/styles/tokens.css`、`src/styles/global.css`、`src/lib/copy.ts`、9 个 `src/components/blocks/*.astro`、`src/components/pages/` 无关），`git diff --stat` 合计 **306 insertions / 16 deletions**。这批改动不是本计划产生的，其中包含 body 的 SVG 纸纹、`--radius-panel`、`--accent-line`——前两项按 spec §5.7 都要作废。spec §14.1 已把这件事列为未决项。

执行者在这里的正确动作是**停下来问**，选项交给维护者：① 把这批 WIP 先提交（则 SP-1 的暗色翻转将显式撤回纸纹与 `--radius-panel`，需在提交信息里点名）；② `git stash -u` 收起（**不要**用裸 `git stash`，本仓可能是共享 worktree；用 `git stash push -u -m "sp1-pre-clean-$(date +%Y%m%d)"` 并记下 stash 的 commit SHA 以便 `git stash apply` 精确恢复）；③ 放弃。**不要替他选。**

- [ ] **Step 2: 建立实施分支**

```bash
git switch -c feat/sp1-dark-tokens
```

预期：`Switched to a new branch 'feat/sp1-dark-tokens'`

- [ ] **Step 3: 记录基线并跑一次全绿**

```bash
git rev-parse HEAD | tee /tmp/wrisp-baseline.txt
pnpm build && pnpm check
```

预期：`pnpm build` 产出 `dist/` 并生成 `robots.txt`/`sitemap.xml`；`pnpm check` 末行打印 `=== COPY CHECK PASSED ===`，退出码 0。

把这两行输出抄进任务报告：后续每个任务都要拿它们当「没有回归」的证据。

- [ ] **Step 4: 确认本地领先远端（只读，勿推送）**

```bash
git rev-list --count origin/main..HEAD
```

预期：≥15。已知 `origin/main` 停在 `fde4ac3`，而 `888490a`（Newsreader 子集）在本地未推送集合里——这意味着 **CI 从未在同一次运行里同时见过 `@font-face` 和那条禁 webfont 的守卫**。Task 7 修的就是这个。本步骤只记录事实，**不推送任何东西**。

---

### Task 2: 令牌完整性校验脚本

**Files:**
- Create: `scripts/check-tokens.mjs`
- Create: `scripts/color-baseline.json`

**Interfaces:**
- Consumes: `src/styles/tokens.css` 的文本；`src/**/*.{astro,css}` 的文本
- Produces: 可执行命令 `node scripts/check-tokens.mjs`，退出码 0 = 三项全过；`--selftest` 模式打印内置用例后以退出码反映成败；`--emit-baseline` 把当前所有字面色行以 JSON 数组打到 stdout（Task 4–6 用它重生成清单，避免手抄行号）

- [ ] **Step 1: 先写自检用例并确认它失败**

创建 `scripts/check-tokens.mjs`，只放自检与三个待实现的纯函数桩：

```js
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

export const contrast = (a, b) => {
  const lum = (h) => {
    const [r, g, bl] = hexToRgb(h).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

export const checkRefs = (tokens, used) =>
  used.filter((n) => !(n in tokens)).map((n) => `undefined token ${n}`);

// 这两个桩在 Step 3 会被整行替换掉——不要留着它们再追加实现，
// 同一个模块里两次 `export const` 同名是 SyntaxError，脚本会直接起不来。
export const checkMatrix = () => ['not implemented'];
export const checkLiterals = () => ['not implemented'];

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '  → ' + JSON.stringify(detail)));
};

if (process.argv.includes('--selftest')) {
  const FIXTURE = ':root{--bg:#0b0d12;--text-1:#f2f3f5;--space-1:4px;}';
  const t = parseTokens(FIXTURE);
  check('parseTokens 抓到三个令牌', Object.keys(t).length === 3, t);
  check('bg 相对亮度低于 .005', t['--bg'] === '#0b0d12', t['--bg']);
  // 首次出现为准：@media print 里的同名覆写不得顶掉屏幕值，否则矩阵测的是打印色
  const PRINT = parseTokens(':root{--x:#111111;}@media print{--x:#ffffff;}');
  check('print 覆写不顶掉首值', PRINT['--x'] === '#111111', PRINT);
  check('未定义令牌被点名', checkRefs(t, ['--bg', '--paper']).length === 1, checkRefs(t, ['--bg', '--paper']));
  check('contrast(#f2f3f5,#0b0d12) ≈ 17.5', Math.abs(contrast('#f2f3f5', '#0b0d12') - 17.5) < 0.1, contrast('#f2f3f5', '#0b0d12'));
  check('contrast 对调参数结果相同', contrast('#0b0d12', '#f2f3f5') === contrast('#f2f3f5', '#0b0d12'), null);
  check('contrast 支持三位十六进制', Math.abs(contrast('#fff', '#000') - 21) < 0.01, contrast('#fff', '#000'));

  const failed = results.filter((r) => !r.pass);
  console.log(`\nselftest: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
```

- [ ] **Step 2: 跑自检，确认失败**

```bash
node scripts/check-tokens.mjs --selftest
```

预期：`selftest: 7/7 passed`，退出码 0。此时不带 `--selftest` 直接跑 `node scripts/check-tokens.mjs` 应该什么都不打印——`run()` 还没写，这就是「脚本存在但还不会校验真实仓库」的观察点。

- [ ] **Step 3: 补上对比度矩阵、字面色扫描与主流程**

先**删掉 Step 1 末尾那两行 `checkMatrix` / `checkLiterals` 桩**（连同它们上面的注释），再把下面的声明与实现插在 `const results = []` 之前；`run()` 与文件其余部分不动。

```js
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
    if (!v || !/^#[0-9a-fA-F]{3,6}$/.test(v)) throw new Error(`matrix needs a hex for ${name}, got ${v}`);
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

const emitBaseline = () => {
  const keys = [...new Set(scanLiteralLines().map((h) => h.key))].sort();
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

if (process.argv.includes('--emit-baseline')) emitBaseline();
else run();
```

再往 `--selftest` 分支里追加三条，让契约表本身也被测到（`FIXTURE` 上面已有，这里复用一份完整的暗色夹具）：

```js
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
  check('例外格仍然被断言（把 text-3 调暗到 3.0 以下要报红）',
    checkMatrix({ ...FIX, '--text-3': '#4a5162' }).some((m) => m.includes('--text-3 on --surface-3')), null);
  check('徽标字压自己的底，改坏一个要报红',
    checkMatrix({ ...FIX, '--badge-todo': '#6b3a2c' }).some((m) => m.includes('--badge-todo')), null);
```

这三条是后续任务的守门人：Task 3 把 `tokens.css` 换成暗色以后，它们仍须全绿（夹具是纯内存的，不受文件影响）；任何一次改令牌值把某格撞下 4.5，`--selftest` 会立刻指出是哪一格。不拿真实的 `tokens.css` 做断言——它在 Task 3 前后应该是「红 → 绿」，写进自检就成了定时炸弹。

同时生成初始 baseline，**不要手抄行号**——让脚本自己扫：

```bash
node scripts/check-tokens.mjs --emit-baseline > scripts/color-baseline.json
```

预期是一份 93 条、形如 `"src/components/blocks/Hero.astro:183"` 的数组（一行一条，不含色值：同一行有两处也只记一次）。撰写本计划时的实测分布，用来对照 `--emit-baseline` 有没有扫漏：

| 文件 | 行数 |
|---|---|
| Hero.astro | 21（第 183 行有 2 处匹配，仍只占 1 条） |
| Persona.astro | 19 |
| Cta.astro | 9 |
| Diff.astro、Proofs.astro | 6 + 6 |
| Roadmap.astro | 5 |
| Data.astro | 4 |
| Pain.astro | 2 |
| Work.astro | 2 |
| Import.astro、Faq.astro、Pricing.astro、pages/Privacy.astro | 各 1 |
| styles/global.css | 15 |
| **合计** | **93** |

免扫的两份按 spec §10.2 走 `ALLOW_FILES`：`src/styles/tokens.css`（令牌本体，全是字面值）与 `src/layouts/Page.astro`（`@font-face` 的 `unicode-range`）。这两份里 `data:image/svg+xml` 的整行也被跳过，因为纸纹图里全是编码过的颜色串——`tokens.css` 本就在白名单里，这条跳过是给 `global.css` 万一引入内联 SVG 时兜底的。

> 若 Task 1 之后那 306 行 WIP 被提交而非 stash，行号会漂移，但这条命令重扫的就是当前真实行号， `--emit-baseline` 重跑一次即可，不需要人工修订清单。

- [ ] **Step 4: 跑校验，确认此时全绿**

```bash
node scripts/check-tokens.mjs
```

预期：三个 `✓` 拿不到——`tokens.css` 还是旧的亮色令牌，第二项必然报红。计划撰写时已把这份脚本对着当前仓库跑过，实际红法是 `matrix needs a hex for --text-1, got undefined`（矩阵第一行先取文字令牌，所以报的是 `--text-1` 而不是 `--bg`），这是**预期行为**，不要在本任务里补令牌。为让本任务能独立收尾，本步跑：

```bash
node scripts/check-tokens.mjs --selftest && node scripts/check-tokens.mjs
```

预期：`selftest: 10/10 passed`；主校验第一项 `✓ 每个 var() 引用都有定义`（旧组件引用的旧令牌都还在）、第三项 `✓`（93 行全在 baseline 里），只有第二项红，且失败信息只有 `matrix needs a hex` 这一类。**本任务的完成判据就是这三条。**

- [ ] **Step 5: 挂进 `pnpm check` 之前先单独确认构建不受影响**

```bash
pnpm build
```

预期：构建成功（本任务只加脚本，没碰样式）。

- [ ] **Step 6: 提交**

```bash
git add scripts/check-tokens.mjs scripts/color-baseline.json
git commit -m "build(tokens): 令牌完整性校验脚本与字面色 baseline

三项断言：var() 引用必须有定义、文字族压底色族的 WCAG 对比达标、组件内不出现
字面色。校验器沿用 edge/router/smoke.mjs 的进程内 check() 风格，不起浏览器也不
依赖测试框架。现状 93 行字面色先登记进 baseline，后续任务逐文件清零。"
```

---

### Task 3: 重写 tokens.css 为暗色令牌

**Files:**
- Modify: `src/styles/tokens.css`（整份替换）

**Interfaces:**
- Consumes: Task 2 的 `check-tokens.mjs` 契约表
- Produces: 下列令牌名，供 `global.css` 与全部组件引用（名字写错会在 Task 2 的 ref 校验里立刻报红）：`--bg`、`--surface-1/2/3`、`--band`、`--text-1/2/3`、`--accent-fill`、`--accent-400`、`--accent-300`、`--hair-1/2/3`、`--nav-bg`、`--chapter-bg`、`--glow-soft`、`--glow-strong`、`--ok`、`--ok-weak`、`--warn`、`--err`、`--badge-todo|comp|meet|decide|need` 及各自 `-bg`、`--dot-r|y|g`、`--mono`、`--sans`、`--display`、`--fs-1|2|3|lead|body|sm|xs|micro|mono`、`--space-1..11`、`--r-card|panel|sm|pill`、`--maxw`、`--nav-h`、`--chapter-h`

后五个（`--nav-bg`、`--chapter-bg`、`--glow-soft`、`--glow-strong`、`--ok-weak`）是本计划回写 spec 的半透明功能令牌，理由见「spec 回写项」一节；`--fs-micro` 是 spec §5.5 表里那行「（微标签地板）11px」的令牌名。

- [ ] **Step 1: 先把预期失败写成一个可跑的断言**

```bash
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/styles/tokens.css','utf8');
const need=['--bg','--surface-1','--surface-2','--surface-3','--band','--text-1','--text-2','--text-3',
'--accent-fill','--accent-400','--accent-300','--hair-1','--hair-2','--hair-3',
'--nav-bg','--chapter-bg','--glow-soft','--glow-strong','--ok-weak',
'--badge-todo','--badge-todo-bg','--dot-r','--fs-1','--fs-micro','--space-11','--r-pill'];
const miss=need.filter(t=>!css.includes(t));
console.log(miss.length?'MISSING: '+miss.join(' '):'ALL PRESENT');
process.exit(miss.length?1:0);
"
```

预期：退出码 1，`MISSING: --bg --surface-1 ...`（当前文件只有 `--paper/--ink/...`）。这就是本任务的失败基线。

- [ ] **Step 2: 整份替换 `src/styles/tokens.css`**

```css
/*
 * 设计令牌：蓝调暗底 + 三档面 + 单一品牌蓝。
 * 颜色一律走这里，组件不得写死十六进制——这条现在由 scripts/check-tokens.mjs 在 CI 里拦。
 * 数值改动须同步 .superpowers/specs/2026-11-02-wrisp-site-dark-redesign-design.md 的 §5。
 */
:root {
  /* 底与面：层次只靠面与底的亮度差，不引入投影 */
  --bg: #0b0d12;
  --surface-1: #12151c;
  --surface-2: #171b23;
  --surface-3: #1e232c;
  /* 全站唯一一次换底色，落在新 08 区的收束带。带上只许压 --text-1（实测 5.75）；
     --text-2 只有 2.83、--accent-300 只有 2.63，都不达标，SP-2 排版时注意 */
  --band: #2e609f;

  /*
   * 文字三档全用实色，不用 opacity 调淡：叠透明度会让对比度跌破 WCAG AA。
   * --text-3 落在 --surface-3 上只有 4.19，限 ≥24px 或 19px bold 使用。
   */
  --text-1: #f2f3f5;
  --text-2: #a6adba;
  --text-3: #7b8496;

  /*
   * 强调色分两族：--accent-fill 只做填充，文字与 focus 一律走 --accent-300。
   * #4c5fd5 压暗底只有 3.61，当正文色不达标；--text-1 压其上 4.84（纯白 5.38），做底是安全的。
   */
  --accent-fill: #4c5fd5;
  --accent-400: #6d82f5;
  --accent-300: #8fa0ff;

  /* 发丝线只做装饰，不承载信息；线索不足时抬一层 --surface-3 而不是加粗描边 */
  --hair-1: rgba(255, 255, 255, 0.07);
  --hair-2: rgba(255, 255, 255, 0.12);
  --hair-3: rgba(255, 255, 255, 0.2);

  /*
   * 半透明功能面：alpha 与色值绑在一起，没法从实色令牌推，所以单独立令牌。
   * 有了这四个，吸顶层与辉光就能从 baseline 白名单里彻底走出来（spec 回写项 1/2/3）。
   */
  --nav-bg: rgba(11, 13, 18, 0.82);
  --chapter-bg: rgba(11, 13, 18, 0.9);
  --glow-soft: rgba(76, 95, 213, 0.08);
  --glow-strong: rgba(76, 95, 213, 0.55);

  --ok: #4ed17e;
  --ok-weak: rgba(78, 209, 126, 0.35);
  --warn: #f7ad31;
  --err: #f25a5a;

  /* 五类记录徽标：文字压自己的底，实测 7.75–9.45 全过 AA */
  --badge-todo-bg: #2a1a16;
  --badge-todo: #f2a08c;
  --badge-comp-bg: #16241c;
  --badge-comp: #6fdba0;
  --badge-meet-bg: #1a2030;
  --badge-meet: #93b4f5;
  --badge-decide-bg: #241f14;
  --badge-decide: #e3bf6a;
  --badge-need-bg: #221a26;
  --badge-need: #c9a2d8;

  /* 窗口控制点：纯装饰，不参与对比要求 */
  --dot-r: #e0654a;
  --dot-y: #e3b45c;
  --dot-g: #6cc497;

  /*
   * 字体只「复用字形」，不「复用文件」：中文整包字体一旦走 @font-face，未写 unicode-range
   * 时任何汉字都会触发全量下载。这里中文继续走系统栈，只有标题的拉丁字母走一份自托管子集
   * （Newsreader 700，latin unicode-range，23.8 KB；@font-face 在 Page.astro 里发，
   * 因为 URL 要带 Pages 的 base 前缀）。@font-face 的 URL 与这份令牌必须同改其一。
   */
  --mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Inter,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
  --display: 'Newsreader', 'Segoe UI Variable Display', 'Segoe UI', Inter, 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

  /* 字阶：20 档离散值收到 7 档 + 两个专用地板 */
  --fs-1: clamp(30px, 4.4vw, 44px);
  --fs-2: clamp(23px, 3vw, 30px);
  --fs-3: 20px;
  --fs-lead: 17px;
  --fs-body: 16px;
  --fs-sm: 14px;
  --fs-xs: 12px;
  --fs-micro: 11px;
  --fs-mono: 13px;

  /* 间距：照参考站的档位，砍掉它的 200/240 */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 88px;
  --space-10: 120px;
  --space-11: 160px;

  --r-card: 24px;
  --r-panel: 16px;
  --r-sm: 10px;
  --r-pill: 100px;

  --maxw: 1120px;
  --nav-h: 64px;
  --chapter-h: 44px;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: calc(var(--nav-h) + var(--chapter-h) + 12px);
  /*
   * 声明式暗色：表单控件、滚动条、系统配色都按暗色画。
   * 但**不写 prefers-color-scheme: light 的分支**——D-1 裁决暗色是唯一形态，
   * 系统设浅色不跟随，这不是漏做（spec §11）。
   */
  color-scheme: dark;
}

body {
  background-color: var(--bg);
  color: var(--text-1);
  font-family: var(--sans);
  font-size: var(--fs-body);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
}

::selection {
  background: var(--accent-fill);
  color: var(--text-1);
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: 0;
  background: none;
  color: inherit;
}

/* focus 一律走 --accent-300：旧值 --accent 压在最深的面上只有 2.93，跌破非文字 3:1 */
:focus-visible {
  outline: 2px solid var(--accent-300);
  outline-offset: 3px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/*
 * 打印回亮色令牌。暗底打印等于把墨水印满整页，而这份资料页是会被别人打出来看的。
 * 只重映射令牌，不重排布局——布局级的打印版式不在 SP-1 范围。
 */
@media print {
  :root {
    --bg: #ffffff;
    --surface-1: #f5f5f5;
    --surface-2: #eeeeee;
    --surface-3: #e5e5e5;
    --band: #ffffff;
    --text-1: #14181f;
    --text-2: #3a4048;
    --text-3: #5a616b;
    --accent-fill: #2f43b8;
    --accent-400: #2f43b8;
    --accent-300: #26379c;
    --hair-1: rgba(0, 0, 0, 0.14);
    --hair-2: rgba(0, 0, 0, 0.22);
    --hair-3: rgba(0, 0, 0, 0.34);
    --nav-bg: rgba(255, 255, 255, 0.9);
    --chapter-bg: rgba(255, 255, 255, 0.94);
    --glow-soft: rgba(47, 67, 184, 0.06);
    --glow-strong: rgba(47, 67, 184, 0.28);
    --ok: #1c7a4b;
    --warn: #8a6d1c;
    --err: #b0252a;
    --badge-todo-bg: #fdeee8;
    --badge-todo: #8f3a20;
    --badge-comp-bg: #e7f2ee;
    --badge-comp: #1c5a3f;
    --badge-meet-bg: #e7ecfa;
    --badge-meet: #2b3f85;
    --badge-decide-bg: #f4efe0;
    --badge-decide: #6d5514;
    --badge-need-bg: #efeaef;
    --badge-need: #523a5a;
  }
}
```

- [ ] **Step 3: 跑 Task 1 Step 1 的断言，确认令牌齐了**

```bash
node -e "
const fs=require('fs');
const css=fs.readFileSync('src/styles/tokens.css','utf8');
const need=['--bg','--surface-1','--surface-2','--surface-3','--band','--text-1','--text-2','--text-3',
'--accent-fill','--accent-400','--accent-300','--hair-1','--hair-2','--hair-3',
'--nav-bg','--chapter-bg','--glow-soft','--glow-strong','--ok-weak',
'--badge-todo','--badge-todo-bg','--dot-r','--fs-1','--fs-micro','--space-11','--r-pill'];
const miss=need.filter(t=>!css.includes(t));
console.log(miss.length?'MISSING: '+miss.join(' '):'ALL PRESENT');
process.exit(miss.length?1:0);
"
```

预期：`ALL PRESENT`，退出码 0。

- [ ] **Step 4: 跑对比度矩阵**

```bash
node scripts/check-tokens.mjs
```

预期：第二项 `✓ 文字族压得住底色族（WCAG AA）`。第一项 `每个 var() 引用都有定义` 此刻**必然报红**，因为组件还在引用 `--paper/--ink/--muted` 等已删除的旧令牌——把这些未定义令牌名抄进任务报告，它们就是 Task 4–6 的迁移清单。第三项看 baseline 是否与现状吻合。

**本任务的完成判据**：矩阵项通过，且 ref 项的失败清单只包含旧令牌名（`--paper`、`--paper-2`、`--paper-3`、`--ink`、`--ink-2`、`--muted`、`--line`、`--line-2`、`--accent`、`--accent-ink`、`--accent-soft`、`--accent-line`、`--on-dark`、`--on-dark-2`、`--on-dark-3`、`--radius`、`--radius-sm`、`--radius-panel`）中的名字。出现别的名字说明令牌写漏了，补上再走。

- [ ] **Step 5: 构建仍须通过**

```bash
pnpm build
```

预期：构建成功。未解析的 CSS 自定义属性不会让 Astro 失败，所以这一步证明的是「没有语法错」，不是「页面好看」。此时页面视觉是破的，属于路线 A 的预期中间态（spec §4），**本步之后到 Task 6 结束前不得部署**。

- [ ] **Step 6: 提交**

```bash
git add src/styles/tokens.css
git commit -m "feat(tokens): 令牌层翻成蓝调暗色

底 #0b0d12 加三档面，层次靠亮度差而不靠投影；强调色拆成 --accent-fill 与
--accent-300 两族，因为 #4c5fd5 当文字压暗底只有 3.61。focus ring 换 --accent-300，
旧值在最深的面上只剩 2.93，跌破非文字 3:1。字阶从 20 档离散值收到 7 档加两个地板，
间距建 11 档令牌，圆角四级并让交互件走胶囊。打印态回亮色令牌。

暖纸体系（--paper/--ink/--line/--muted 与 body 纸纹）与 --on-dark 一族按 spec §5.7
作废，组件侧的引用在后续三个任务里迁移。"
```

---

### Task 4: 基元层 global.css 迁移

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: Task 3 的全部令牌
- Produces: `.band`、`.reveal`、`.h-title`、`.h-2`、`.lead`、`.nav`、`.btn` 这些基元的暗色版本；`.reveal` 位移幅度改为 40px 供全部区块共用

- [ ] **Step 1: 迁移标题与正文基元**

把 `global.css` 里的标题段改成走字阶令牌，衬线与零字距裁决保持不动：

```css
h1,
h2 {
  font-family: var(--display);
  letter-spacing: -0.022em;
  line-height: 1.1;
  font-weight: 700;
  text-wrap: balance;
  color: var(--text-1);
}
h3 {
  letter-spacing: -0.01em;
  line-height: 1.25;
  font-weight: 700;
  text-wrap: balance;
  color: var(--text-1);
}
```

> 暗面有光渗（halation），细笔画在深底上看起来比亮底更弱，所以这里**不跟随参考站把字重降到 400**，字距也不收到 −0.022em 以下（spec §13）。

`.h-title` / `.h-2` / `.lead` 三处：

```css
.h-title {
  font-size: var(--fs-1);
}
.h-2 {
  font-size: var(--fs-2);
}
.lead {
  color: var(--text-2);
  font-size: var(--fs-lead);
  max-width: 680px;
  margin-top: var(--space-4);
}
```

- [ ] **Step 2: 迁移 `.band`**

旧的 `.band` 是「纸面 2 + 上下细线」，换成面差：

```css
.band {
  background: var(--surface-1);
  border-top: 1px solid var(--hair-1);
  border-bottom: 1px solid var(--hair-1);
}
```

- [ ] **Step 3: `.reveal` 位移从 18px 收到 40px**

```css
.js .reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
```

`@media (prefers-reduced-motion: reduce)` 里那条 `.js .reveal { opacity: 1; transform: none; transition: none }` 保持原样不动。位移加大是因为暗底上 18px 几乎读不出来（spec §5.6）。

- [ ] **Step 4: 迁移导航、按钮与其余旧令牌引用**

`global.css` 里所有 `var(--paper*)`、`var(--ink*)`、`var(--muted)`、`var(--line*)`、`var(--accent*)`、`var(--radius*)`、`var(--on-dark*)` 按本计划开头的映射表整批替换。这个文件自己还带 **15 行字面色**（baseline 里那 15 条 `src/styles/global.css:*` 就在本任务清掉），逐行落点：

| 行 | 现状 | 改成 |
|---|---|---|
| 99 | `background: rgba(250, 250, 247, 0.88)`（吸顶导航） | `var(--nav-bg)`，`backdrop-filter: blur(14px)` 保留 |
| 243 | `background: rgba(250, 250, 247, 0.92)`（目录条） | `var(--chapter-bg)` |
| 134 | `.lang` 的 `background: #fff` | `var(--surface-2)` |
| 167 | `.btn-primary` 的 `color: #fff` | `var(--text-1)`（压 `--accent-fill` 实测 4.84） |
| 174 | `.btn-ghost` 的 `background: #fff` | `var(--surface-2)` |
| 281 | `.chapter button` 的 `background: #fff` | `var(--surface-3)`（目录箭头是凸起点） |
| 305 | `.waitlist input/textarea` 的 `background: #fff` | `var(--surface-3)` |
| 345 | `.waitlist .err` 的 `color: #b04a2e` | `var(--err)` |
| 386 / 387 / 388 | `.waitlist.on-dark` 输入的 `rgba(255,255,255,.08)`、`rgba(255,255,255,.22)`、`#fff` | `var(--surface-3)`、`var(--hair-2)`、`var(--text-1)` |
| 398 / 402 | `.waitlist.on-dark .ok/.err` 的 `#7fd9a8`、`#f0a98c` | `var(--ok)`、`var(--err)`——新 `--ok`/`--err` 本身就是提亮过的值，那两档单独加的浅色不再需要；`:400` 那行解释它们为什么提亮的注释同步删掉，否则会指着一个已经不存在的色号 |
| 406 | `:disabled` 的 `rgba(255,255,255,0.05)` | `var(--hair-1)` |
| 410 | `.waitlist.on-dark .btn-primary` 的 `background: #fff` | `background: var(--accent-fill); color: var(--text-1)`（原来是白底黑字，跟 D-5 的品牌蓝主按钮相反） |

另有两处不在这次统计口径里、但同属基元层：

- `.btn-primary` 若是 `background: var(--ink)` → `background: var(--accent-fill)`（D-5：主按钮填品牌蓝，不照抄参考站的白底幽灵胶囊）。
- `.waitlist` 一族（约 `global.css:295-345`）本任务只做令牌迁移，组件与样式在 SP-2 才删除，此处不要提前删。

- [ ] **Step 5: `Page.astro` 的浏览器 UI 色**

`src/layouts/Page.astro:54` 现在是 `<meta name="theme-color" content="#FAFAF7" />`——暖纸白，纯暗色下浏览器地址栏会亮出一条与页面完全脱节的白带。改成 `#0b0d12`（等于 `--bg`）。

这一步是 spec 没逐条裁决的推定项（按 D-1 暗色是唯一形态）；`Page.astro` 在 `ALLOW_FILES` 里，机检不会替我抓到它，所以必须手工改并在 Task 8 Step 6 的报告里点名请维护者确认。不要顺手把 `Page.astro` 从白名单里摘出去——白名单按 spec §10.2 就是 `tokens.css` + `Page.astro` 两处。

- [ ] **Step 6: 跑校验，确认 ref 项只剩组件的旧令牌**

迁完先把 baseline 重扫一遍——那 15 行 `src/styles/global.css:*` 已经干净，留在清单上会被「死条目」那条断言反过来判失败：

```bash
node scripts/check-tokens.mjs --emit-baseline > scripts/color-baseline.json && \
  node scripts/check-tokens.mjs && pnpm build
```

预期：baseline 从 93 缩到 78（`tokens=N baseline=78` 那行看得到）；第二、三项通过；第一项的失败清单里**不再出现 `global.css`**，只剩 `src/components/**` 的旧令牌名。随后 `pnpm build` 成功。

- [ ] **Step 7: 提交**

```bash
git add src/styles/global.css src/layouts/Page.astro scripts/color-baseline.json
git commit -m "feat(base): 基元层跟到暗色令牌，reveal 位移收到 40px

标题与正文走字阶令牌，band 的层次改由面差与发丝线承担，暖纸引用清零。这个文件
自己那 15 行字面色一起迁完，吸顶导航与目录条的半透明底立成 --nav-bg / --chapter-bg
两个功能令牌，好让 baseline 能真正交空而不是永久留两条。
渐显位移 18px 在暗底上几乎读不出来，收到 40px 并把缓动换成 ease-out。
theme-color 跟着翻成 #0b0d12，浏览器 UI 不再留一条暖纸白带。"
```

---

### Task 5: Hero 与 Persona/Proofs 迁移（含 SVG 填充）

**Files:**
- Modify: `src/components/blocks/Hero.astro:112,113,132,182,183,201,204,207,229,307,308,311,312,315,316,319,320,323,324,454,466`（21 行）
- Modify: `src/components/blocks/Persona.astro:33,36,37,38,46,53,56,57,58,71,74,75,76,89,92,93,94,144,166`（19 行）
- Modify: `src/components/blocks/Proofs.astro:97,132,135,138,183,212` 加 `:165,188,206` 三处字号
- Modify: `scripts/color-baseline.json`

**Interfaces:**
- Consumes: Task 3 的 `--badge-*`、`--dot-*`、`--surface-*`、`--hair-*`、`--text-*`
- Produces: 一个可复用写法——SVG 实心色一律走 `style="fill: var(--token)"`，供 Task 6 照抄

- [ ] **Step 1: Hero 的五个徽标改成成对令牌**

`Hero.astro` 中 `.appwin .badge.*` 五条规则整体替换：

```css
.appwin .badge.todo {
  background: var(--badge-todo-bg);
  color: var(--badge-todo);
}
.appwin .badge.comp {
  background: var(--badge-comp-bg);
  color: var(--badge-comp);
}
.appwin .badge.meet {
  background: var(--badge-meet-bg);
  color: var(--badge-meet);
}
.appwin .badge.decide {
  background: var(--badge-decide-bg);
  color: var(--badge-decide);
}
.appwin .badge.need {
  background: var(--badge-need-bg);
  color: var(--badge-need);
}
```

窗口三点：

```css
.appwin-top .dot.r {
  background: var(--dot-r);
}
.appwin-top .dot.y {
  background: var(--dot-y);
}
.appwin-top .dot.g {
  background: var(--dot-g);
}
```

- [ ] **Step 2: Hero 其余 8 处字面 `#fff` 与旧令牌**

`132/182/229/454/466` 这五处是卡面与圆形指示底 → `background: var(--surface-3)`（凸起点/小圆底）或 `var(--surface-2)`（面板底），按该元素是否落在某张卡上就地判断：已经贴在 `--surface-2` 卡里的用 `--surface-3`，贴在页面底上的用 `--surface-2`。同文件内所有 `var(--line)`/`var(--line-2)` → `var(--hair-1)`/`var(--hair-2)`，`var(--muted)` → `var(--text-3)`，`var(--ink)`/`var(--ink-2)` → `var(--text-1)`/`var(--text-2)`，`var(--accent)` 当文字或图标色时 → `var(--accent-300)`，当边框/填充时 → `var(--accent-fill)`，`var(--radius)`/`var(--radius-sm)` → `var(--r-card)`/`var(--r-sm)`。

首屏那两层渐变（`:112-113`）与卡投影（`:183`）单独处理：

```css
  .hero {
    padding-block: 72px 56px;
    /* 首屏极淡靛蓝柔光 + 点阵，两层都是既有做法，只把字面色换成令牌 */
    background:
      radial-gradient(560px 320px at 12% -8%, var(--glow-soft), transparent 70%),
      radial-gradient(var(--hair-1) 1px, transparent 1px);
    background-size: auto, 22px 22px;
  }
```

`.appwin` 的 `box-shadow: 0 1px 0 rgba(31, 35, 40, 0.04), 0 18px 44px -26px rgba(31, 35, 40, 0.28)`（`:183`）**整条删除**，不是换色：spec §5.1 定了「层次只靠面与底的亮度差，不引入投影」，而暗底上的墨色投影本来就看不见。卡片改由 `--surface-2` + `--hair-1` 描边立起来。这是 SP-1 唯一一处非令牌级视觉改动，Task 8 Step 6 要点名。

- [ ] **Step 3: Persona 的 12 个 SVG `fill` 属性改成 style**

`fill="var(--x)"` 作为呈现属性不被浏览器解析，必须走 `style`。Persona 里四组重复结构，每组按同一种改法。示例（第 33-38 行那一组，其余三组 46-58、71-76、89-94 同样处理）：

```astro
<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
  <circle cx="12" cy="12" r="10" style="fill: var(--surface-3)" />
  <path d="..." style="fill: var(--dot-r)" />
  <path d="..." style="fill: var(--dot-y)" />
  <path d="..." style="fill: var(--dot-g)" />
</svg>
```

`Persona.astro:144,166` 两处 CSS `background: #fff` → 卡内凸起点用 `var(--surface-3)`，面板底用 `var(--surface-2)`。

- [ ] **Step 4: Proofs 的三点与三处白底**

`Proofs.astro:132,135,138` 三个点色 → `var(--dot-r)` / `var(--dot-y)` / `var(--dot-g)`；`97/183/212` 三处 `background: #fff` → 分别按「勾选框底」用 `--surface-3`、「卡底」用 `--surface-2`、「引用徽标底」用 `--surface-3` 处理。同文件的 `--accent-soft`/`--accent-ink` → `--badge-meet-bg`/`--badge-meet`（这两处原本是蓝味 chip）。

`Proofs.astro:165,188,206` 另有三处字号踩在暗面的可读地板下——`10px` / `9px` / `9.5px`，按 spec §5.5 那行「微标签地板 11px」全部上提：

```css
  font-size: var(--fs-micro);
```

这三行不含字面色，所以 baseline 里没有它们，机检也抓不到；它们是 spec §5.5 明写的整改项，只能靠这一步手工做，做完在 Step 6 用 Task 8 Step 3 的同一条 grep 自查一次。

- [ ] **Step 5: 把这三份文件的 baseline 行删干净**

从 `scripts/color-baseline.json` 清掉 `Hero.astro:`、`Persona.astro:`、`Proofs.astro:` 三份的全部条目（21 + 19 + 6 = 46 行）。别手删——重扫一次，脚本记什么就是什么：

```bash
node scripts/check-tokens.mjs --emit-baseline > scripts/color-baseline.json && \
  node -e "
const b=JSON.parse(require('fs').readFileSync('scripts/color-baseline.json','utf8'));
const mine=b.filter(k=>/blocks\/(Hero|Persona|Proofs)\.astro:/.test(k));
console.log('baseline='+b.length+' 这三份残留='+mine.length);
process.exit(mine.length?1:0);
"
```

预期打印 `baseline=32 这三份残留=0`（Task 4 已把 global.css 那 15 行清掉，93 − 15 = 78；78 − 46 = 32），退出码 0。若这三份还有残留，说明 Step 2–4 有漏改，回去补完再重跑。

- [ ] **Step 6: 跑校验确认这三个文件干净**

```bash
node scripts/check-tokens.mjs
```

预期：第一项的失败清单只剩 Task 6 要处理的文件；第三项「组件内无字面色」仍红，但报错路径里**不再出现** Hero/Persona/Proofs。若仍出现，说明某处漏改，回到 Step 2–4 补。

```bash
pnpm build
```

预期：构建成功。

- [ ] **Step 7: 提交**

```bash
git add src/components/blocks/Hero.astro src/components/blocks/Persona.astro src/components/blocks/Proofs.astro scripts/color-baseline.json
git commit -m "feat(blocks): 首屏、人群路由与能力证明区跟到暗色

五类记录徽标从各写各的十六进制对改成成对令牌，文字压自己的底实测 7.75–9.45。
窗口三点走 --dot-*。Persona 的 12 个 SVG 实心色从 fill 属性挪进 style，
因为 fill=\"var(--x)\" 作为呈现属性不被解析。"
```

---

### Task 6: 其余组件清零

**Files:**
- Modify: `src/components/blocks/{Data,Diff,Cta,Faq,Pain,Pricing,Roadmap,Work,Import}.astro`
- Modify: `src/components/blocks/WaitlistForm.astro`、`src/components/SiteNav.astro`、`src/components/pages/Privacy.astro`
- Modify: `scripts/color-baseline.json`

**Interfaces:**
- Consumes: Task 3 令牌、Task 5 确立的 `style="fill: var(--token)"` 写法
- Produces: 空的 `color-baseline.json`（`[]`），从此 CI 上任何新字面色直接构建失败

- [ ] **Step 1: 逐文件替换**

本任务清掉 baseline 剩下的 32 行。逐文件：

- `Diff.astro`（6 行）：`42/47/54` 三个 `fill="#fff"` → `style="fill: var(--text-1)"`；`84/95` 两处 `background: #fff` → `--surface-2` 卡底与 `--surface-3` 凸起点；`132` `border-right-color: #D7DDF6` → `var(--hair-3)`。
- `Cta.astro`（9 行）：`30-36` 是 11 区那张灰骨架图的 7 条线，`stroke="rgba(245,245,241,0.0x)"` / `fill="rgba(...)"` 全是呈现属性——和 `fill` 一样，`stroke="var(--x)"` 不被解析，必须整体挪进 `style`：`<rect … style="stroke: var(--hair-1)" />`、`<rect … style="fill: var(--hair-1)" />`。`61` 的辉光 → `radial-gradient(640px 260px at 50% -20%, var(--glow-strong), transparent 70%)`；`75` 的 `color: #fff` 在 `--accent-fill` 底上 → `var(--text-1)`。
- `Roadmap.astro`（5 行）：`91/124/163` 三处白底 → 时间线节点底用 `--surface-3`、卡底用 `--surface-2`；`178/181` 是「已上线」节点的呼吸圈，`rgba(46,158,107,0.35)` → `var(--ok-weak)`，终态那个 `rgba(46,158,107,0)` 直接写 `transparent`（keyframe 里颜色渐隐用透明，不需要第四个令牌）。注意旧 `--ok` 是 `#2e9e6b`，新 `--ok` 换成 `#4ed17e`，圈色必须跟着换，不能照抄原 alpha 串。
- `Pain.astro`（2 行）：`48` 白底 → `--surface-2`；`96` 的 `border: 1px solid rgba(245,245,241,0.28)` 本来就画在深色 punch 面板上 → `var(--hair-3)`。
- `Import.astro`（1 行）：`144` 的 `border-top: 1px solid rgba(245,245,241,0.18)` → `var(--hair-2)`。**这个文件在「12 区 → 8 区」里要被并进新 04 区，但 SP-1 不动结构，所以照样得迁。**
- `Data.astro`（4 行）：`22/29` 两个 SVG fill → `style="fill: var(--text-1)"`；`81/91` 两个 CSS 白底 → `--surface-2`。
- `Faq.astro`（`99`）、`Pricing.astro`（`33`）、`Privacy.astro`（`120`）各 1 处白底 → `--surface-2`。
- `Work.astro`（2 行）：`67` `background: #fff` → `--surface-2`；`87` `.snum.current` 的 `background: var(--accent); color: #fff` → `background: var(--accent-fill); color: var(--text-1)`。

`WaitlistForm.astro` 与 `SiteNav.astro` 没有字面色，但仍有旧令牌引用，按映射表一起改：`--line*`→`--hair-*`、`--muted`→`--text-3`、`--ink*`→`--text-1/-2`、`--accent`（文字/图标）→`--accent-300`、`--accent`（底/边）→`--accent-fill`、`--accent-soft`→`--surface-3`、`--paper*`→`--bg`/`--surface-1`/`--surface-2`、`--radius*`→`--r-*`、`--on-dark*`→`--text-*`。

- [ ] **Step 2: 清空 baseline**

`scripts/color-baseline.json` 内容改成：

```json
[]
```

- [ ] **Step 3: 跑校验，三项全绿**

```bash
node scripts/check-tokens.mjs
```

预期：三个 `✓`，打印 `=== TOKEN CHECK PASSED ===`，退出码 0。`baseline=0` 出现在尾行。

- [ ] **Step 4: 确认旧令牌名在源码里彻底消失**

```bash
grep -rn --include="*.astro" --include="*.css" -E "var\(--(paper|paper-2|paper-3|ink|ink-2|muted|line|line-2|accent-ink|accent-soft|accent-line|on-dark|on-dark-2|on-dark-3|radius|radius-sm|radius-panel)\)" src/ || echo "旧令牌清零"
```

预期：`旧令牌清零`。

> 注意别把 `var(--accent)` 也写进这条 grep——`--accent` 已不存在，但要用 `grep -rn "var(--accent)" src/` 单独确认一次它归零，因为它不在上面括号里的最后一个分支容易被 `\)` 边界吃掉。

- [ ] **Step 5: 构建并跑全站校验**

```bash
pnpm build && pnpm check && node scripts/check-tokens.mjs
```

预期：三条命令全部退出码 0；`pnpm check` 末行 `=== COPY CHECK PASSED ===`。

- [ ] **Step 6: 提交**

```bash
git add src/components scripts/color-baseline.json
git commit -m "feat(blocks): 其余组件跟到暗色，字面色 baseline 清零

剩下 12 个文件的暖纸引用与字面色改完，baseline 交空数组——从现在起任何组件里
出现字面色，CI 直接构建失败，tokens.css 里那条纪律不再是注释。"
```

---

### Task 7: 接线 CI

**Files:**
- Modify: `.github/workflows/deploy.yml`（Sanity checks 步骤、新增 `Token check` 步骤）
- Modify: `package.json`（`scripts.check`）

**Interfaces:**
- Consumes: Task 2 的 `node scripts/check-tokens.mjs`
- Produces: `pnpm check` = 文案覆盖 + 令牌完整性两条都过才算过

- [ ] **Step 1: 把 `check-tokens` 并进 `pnpm check`**

`package.json` 的 `scripts.check` 改成：

```json
    "check": "node scripts/check-copy-coverage.mjs && node scripts/check-tokens.mjs",
```

- [ ] **Step 2: 重定 webfont 守卫的范围（spec §10.3）**

`deploy.yml` 里现有这段是「见到 `@font-face` 就失败」，它会拦住 888490a 有意发布的那一份子集：

```yaml
          # 字体必须是系统栈，不允许引入 webfont 负载
          if grep -rn '@font-face' dist --include='*.css' --include='*.html'; then
            echo "::error::webfont payload detected"; exit 1; fi
```

整段替换成「只允许那一份」：

```yaml
          # 自托管子集只许 Newsreader 700 这一份，且必须四个页面各发一次。
          # 出现别的 @font-face、或引用到未登记的字体文件，就是新增了字体负载。
          faces=$(grep -rho '@font-face{[^}]*}' dist --include='*.html' | sort -u)
          n=$(grep -rl '@font-face' dist --include='*.html' | wc -l)
          if [[ "$n" -ne 4 ]]; then
            echo "::error::@font-face found in $n html pages, expected exactly 4"; exit 1; }
          if [[ "$faces" != *"font-family:'Newsreader'"* || "$faces" != *"font-weight:700"* || "$faces" != *"newsreader-700-latin.woff2"* ]]; then
            echo "::error::@font-face is not the sanctioned Newsreader 700 subset: $faces"; exit 1; fi
          if grep -rq '@font-face' dist --include='*.css'; then
            echo "::error::@font-face leaked into a css bundle; it must stay inline in html"; exit 1; fi
          fonts=$(find dist -name '*.woff' -o -name '*.woff2' | sed 's|.*/||' | sort)
          if [[ "$fonts" != "newsreader-700-latin.woff2" ]]; then
            echo "::error::unexpected font payloads: $fonts"; exit 1; fi
```

- [ ] **Step 3: 把令牌校验挂成独立步骤**

在 `- name: Copy coverage` 之前插入：

```yaml
      - name: Token integrity
        run: node scripts/check-tokens.mjs
```

并把原 `- name: Copy coverage` / `run: pnpm check` 保持不动（Step 1 之后 `pnpm check` 已含两项，重复跑无害，但保留独立步骤是为了在 CI 日志里让令牌失败一眼可辨）。

- [ ] **Step 4: 在本地按 CI 的顺序跑一遍**

```bash
pnpm build && pnpm check && node scripts/check-tokens.mjs && \
  n=$(grep -rl '@font-face' dist --include='*.html' | wc -l) && \
  echo "font-face pages=$n" && [[ "$n" -eq 4 ]] && \
  find dist -name '*.woff2' -printf '  %f %s bytes\n'
```

预期：`pnpm check` 与 `check-tokens` 全绿；`font-face pages=4`；字体文件一行且 23796 bytes。

- [ ] **Step 5: 提交**

```bash
git add .github/workflows/deploy.yml package.json
git commit -m "build(ci): 令牌校验入流水线，webfont 守卫改为只放行那一份子集

旧守卫见到 @font-face 就 exit 1，而 Newsreader 700 子集早已被 888490a 内联进
四个 HTML 页——守卫由 0182733 引入、字体在其后同日引入，两边从未在同一次运行里
相遇，所以这条冲突一直潜伏着。按「不加新 webfont」的原意把守卫重定成只允许那一
份，而不是把它删掉。"
```

---

### Task 8: 终检与交付

**Files:**
- Read only：全部产物、`dist/`
- Modify: 无（发现问题回到对应任务修，不要在终检里塞新改动）

**Interfaces:**
- Consumes: Task 1–7 的全部产出
- Produces: 一份可交复核的验收报告；若走 squash 合回 `main`，则是单个提交

- [ ] **Step 1: 完整流水线**

```bash
pnpm build && pnpm check
```

预期：`=== COPY CHECK PASSED ===` 与 `=== TOKEN CHECK PASSED ===` 依次打印，退出码 0。

- [ ] **Step 2: 跑 Task 4–6 迁移后遗留的旧令牌终检**

```bash
grep -rn --include="*.astro" --include="*.css" -E "var\(--[a-z0-9-]+\)" src/ \
  | grep -oE "var\(--[a-z0-9-]+\)" | sort -u \
  | sed 's/var(--//;s/)//' > /tmp/used.txt && \
node -e "
const fs=require('fs');
const defined=new Set(Object.keys((()=>{const o={};for(const m of fs.readFileSync('src/styles/tokens.css','utf8').matchAll(/(--[a-z0-9-]+)\s*:\s*[^;]+;/g))o[m[1]]=1;return o;})()));
const used=fs.readFileSync('/tmp/used.txt','utf8').split('\n').filter(Boolean).map(n=>'--'+n);
const miss=used.filter(n=>!defined.has(n));
console.log(miss.length?'UNDEFINED: '+miss.join(' '):'all '+used.length+' refs resolve');
process.exit(miss.length?1:0);
"
```

预期：`all NNN refs resolve`。

- [ ] **Step 3: 确认 `@font-face` 仍只有一份、字号地板没有被绕过**

```bash
grep -rho "font-size: *[0-9]\{1,2\}px" src/components | sort -u
```

预期：出现的值不小于 11px（`--fs-micro` 的地板）。若冒出 `9px`/`9.5px`/`10px`，那是 `Proofs.astro:165,188,206` 三处漏改，回 Task 5 Step 4 补。注意此检查只看字面 px，走 `var(--fs-*)` 的行不会也不该出现在这里。

- [ ] **Step 4: 中英两页目测（本计划的已知弱项）**

```bash
pnpm preview
```

打开 `http://localhost:4321/wrisp-site/` 与 `http://localhost:4321/wrisp-site/zh/`，逐区看四件事：文字是否读得清、卡片边界是否只靠面差就分得开、徽标文字压在自己的底上是否够、左侧目录与各区 eyebrow 是否还同号。

**若执行者有可用浏览器工具**（playwright CLI 或真实可视 surface），把中英 × 桌面/窄口 共 4 张截图存进任务报告。**若没有，明确写「视觉验收未做」并把这一条交回人类**，不要在没有看图的情况下声称视觉通过——spec §14.2 已登记这件事手段未定。

- [ ] **Step 5: 归并成一个可 revert 的提交（按需要）**

分支上按任务共 6–7 个提交。合回 `main` 时压成一个，以满足 spec §10「SP-1 的暗色翻转单独成 commit」：

```bash
git log --oneline main..HEAD
git switch main
git merge --squash feat/sp1-dark-tokens
git commit -m "feat(theme): 全站令牌层翻成蓝调暗色（SP-1）

按 .superpowers/specs/2026-11-02-wrisp-site-dark-redesign-design.md 的 §5 落地：
底与三档面、文字三档实色、强调色拆填充与文字两族、字阶 20 档收到 7 档加两地板、
间距 11 档、圆角四级并让交互件走胶囊、reveal 40px、打印回亮色。

新增 scripts/check-tokens.mjs 做三项令牌完整性断言并挂进 pnpm check；组件内
93 行字面色清零并把 baseline 交空，tokens.css 那条「不得写死十六进制」的纪律
从此由 CI 强制。CI 的 webfont 守卫重定成只允许 Newsreader 700 那一份子集。

本提交不含任何文案、区块结构与叙事改动，那些在 SP-2。
路线 A 的中间态：本提交后站点是「新暗色皮肤 + 旧 12 区骨架」。"
```

> **squash 之后 `main` 上这一个提交就是 revert 单位**：`git revert <sha>` 一次回到旧脸。分支与其中间的逐任务提交保留在 `feat/sp1-dark-tokens` 上供追溯。**是否推送 `main` 由维护者决定，执行者不要自行 push。**

- [ ] **Step 6: 向维护者报告**

报告须含：基线 SHA（Task 1 Step 3）、`pnpm build && pnpm check` 的实际输出行、Task 8 各步结果、Step 4 视觉验收做了还是没做，以及**三件需要维护者回话的事**：

1. **spec 回写项**（本计划开头那一节：`--nav-bg`、`--chapter-bg`、`--glow-soft`、`--glow-strong`、`--ok-weak` 五个半透明令牌）——它们已按 Task 3 落地，须写回 spec §5.1/§5.4 才算过裁决，请维护者确认后由维护者或经其授权的下一轮改写。（§10.2 的扫描口径与实测数已在计划阶段一并更正，不用再动。）
2. **两处推定**：`Page.astro` 的 `theme-color` 翻成 `#0b0d12`（按 D-1 推定，spec 没逐条写）、`Hero.astro:183` 的卡投影整条删除（按 §5.1「不引入投影」推定，是 SP-1 唯一的非令牌级视觉改动）。
3. 一句明确提醒——**SP-2（叙事重排、撤表单、删 `edge/waitlist/`、文案撤回注）尚未开始**，spec §12 登记的 8 处口径此刻仍是旧文案，而首屏还没有下载入口（SP-3）；`SiteNav` 的目录项仍指向 `#waitlist`，`chapters` 仍是 11 条，与新令牌层并存但不自洽，这属于路线 A 的预期中间态。
