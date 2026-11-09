# SP-4 演示动效实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「演示」在站内做实——首屏两段、04 区两处，四处共用一枚驱动与一份动画素材件，且关掉 JS 与关掉动画的读者拿得到同一份信息。

**Architecture:** 动画不复制 DOM：同一份 DOM 就是终态，`.js` + `.demo-running` 只给会动的元素加 `pre` 态，驱动做 class 增删并独占四个闸门（手动暂停 / `prefers-reduced-motion` / 窄屏 / 离屏）与定时器令牌失效。参与动画的文字集中到新建的 `src/content/copy/flow.json`；不参与动画的标题与正文留在原文件。

**Tech Stack:** Astro 7（static output，双语两页各一份产物）+ 一枚 TypeScript 驱动模块 + 两支现有校验脚本的两处扩展 + JSON 文案集合（`z.strictObject({zh,en})` 在构建期保证闭合）。

**Spec:** `docs/design/2026-11-04-sp4-demo-motion.md`（相对仓库根；2026-11-04 维护者已确认）。**注意**：`docs/` 目前只在主检出的索引/工作树里，SP-4 分支的 worktree 里**没有 `docs/` 目录**——执行期读 spec 用主检出路径 `<仓库根>/docs/design/2026-11-04-sp4-demo-motion.md`，不得在代码分支里新建 `docs/`。上游两份同处：`docs/design/2026-11-02-dark-redesign.md`（D-12 与 §8 六条硬约束）、`docs/design/2026-11-03-five-blocks-design.md`（NB-5、NB-8、§4.1、§4.4、§6、§7、§8 的 SP-4 行）。

## Global Constraints

每一条对全部任务生效，值逐字取自 spec 与上游件。

- **公开仓纪律**：站仓是公开仓，任何入库文件与提交信息**不得出现私有仓路径、需求编号、内部文档名**。
- **提交纪律**：**绝不 `git add -A` / `git add .`**，一律按文件名暂存；一个任务一个提交。**全程不 push、不部署**（main 是路线 A 中间态，NB-13）。
- **工作区纪律**：不 pop、不 drop `stash@{0}`（`sp1-merge-2026-1102 maintainer-WIP`）；共享 worktree 内**不用裸 `git stash` / `git stash pop`**；**不杀不是自己起的进程**（本机现有两枚 `astro preview` 监听 4321 / 4322，属维护者，勿动）；**不读写别的计划的 `.superpowers/sdd/` 目录**。
- **计数纪律**：断言「存在」用 `grep -o '<pat>' f | wc -l`，**只有断言「零」才可用 `grep -c`**（`-c` 数的是行，产物是单行压缩 HTML）。
- **零新增依赖**：不引第三方包，`package.json` 的 dependencies 与 scripts 零变化；不加载新 webfont（字体走系统栈）；仅暗色体系。
- **令牌账**：`tokens=63 baseline=0` **不变**——新样式只用现有令牌；若确需新增一枚，须同批出现消费者并进基线，不允许先立后用。字面色（`color: var(--accent)` 当文字色、hex 直写）保持零命中。
- **地板值**：微标签 ≥11px（`--fs-micro`）、mono 正文用 `--fs-mono`（13px，本计划让它首次有消费者）；`--text-3` 压 `--surface-3` 只有 4.19，**限 ≥24px 或 19px bold**，因此新样式里的 `--text-3` 一律落在 `--surface-1` / `--surface-2` 上（实测 4.86 / 5.3+）。已核过的对比度：`--text-2`×`--surface-1` **8.10**、×`--surface-2` 7.65；`--text-3`×`--surface-1` 4.86；`--accent-400` 5.36；`--accent-300` 7.51；收束带 `--band` 上**只许压 `--text-1`**。
- **时态与去重红线**：`flow.qa` 与 `flow.recall` 是全站内「问答 / 召回」这一能力的**仅两次**落点（上游 §6:144 钉 2 次，**第三次即违规**）；两处措辞不得互为改写、命中的记录集不得重名。创作卡不得写成「带引用来源的完整作品」这类下一阶段承诺（上游 §7 第 3 条）。首屏表单数仍钉 **0**，演示数钉 **2** 且两份都带暂停开关与静态等价物（NB-8）。
- **锚点账**：`anchors=3 pages=4` **不变**——SP-4 不新增任何锚点、不改 `ALLOWED`、不动 `#waitlist` 之外的引用口径。
- **不可重开口径**：「平台数写两」「四卡等宽 2×2」（任何 agent 不得重开）；`edge/waitlist/` 不得顺手删除。
- **验证手段说明**：站内**没有单测框架**（`package.json` 只有 `dev / build / check / preview`，`check` = coverage + tokens + anchors 三支脚本）。因此每个任务的「测试」= `pnpm build && pnpm check` + 产物 grep（自 T7 起再加两支脚本的 `--selftest` 夹具；**T7 之前 coverage 没有这个模式**）。动效本身（时间轴上的 class 切换）脚本判不了，收在 Task 9 的三个人工目视关口。
- **产物 grep 的落点分工**（实测，别弄反）：组件 `<style>` 被 Astro 抽进 `dist/_astro/*.css`（现有 `Home.*.css` + `SiteFooter.*.css` 两份，Hero 与 Proofs 都并进 Home 那份），**HTML 里没有选择器文本**；所以 CSS 规则去 CSS 文件数，markup 属性去 HTML 数，且数属性一律带值形态（`data-fade="[0-9]"`）。基线标签数已实测：首页与 `/zh/` 各 **5** 枚 `<script`，隐私两页各 **2**。
- **脚本落点会随脚本份数改变**（T5 实测）：只有 Hero 一段组件脚本时 Astro 内联，`dist/_astro/*.js` 为 0；自 T5 起有 Hero + Proofs 两段，Astro 改抽外链——`Hero.astro_*.js`、`Proofs.astro_*.js` 与共享的 `demo-driver.*.js` 三个 chunk，HTML 里只剩 `<script type="module" src=…>`，`demo-running` / `[data-fade]` 的字符串字面量随之**不再出现在 HTML**。`<script` 标签数不受影响（外链也算一枚）。因此 T2 的「HTML 里 `demo-running` = 1」「`*.js` = 0」是 T2 时点的真值，T5 之后不要拿它复查。
- **产物 CSS 的 media 特征拼写**（实测）：lightningcss 把 `max-width: NNpx` 序列化成 `(width<=NNpx)`、`min-width` 变 `(width>=NNpx)`，而 `prefers-reduced-motion:reduce` 原样保留。`dist/_astro/*.css` 里查窄屏规则一律写 `width<=`；写 `max-width:` 得 0 是查错拼写，不是断言失败。

## 口径差登记（计划相对 spec 的 6 处偏离，执行期不再讨论）

| # | spec 原口径 | 计划口径 | 理由 |
|---|---|---|---|
| 1 | §3 的 `DemoMount.payloadKey?` 与 `DemoRuntime.payload<T>()` | **删掉这两处 API** | 载荷解析属于「演示一」这一面的编排，不是四个闸门之外的运行时职责；留着会让驱动知道 `data-demo` 这个只有首屏在用的约定 |
| 2 | §3「`data-demo` 随第二段一起从 `.appwin` 下移到演示一那段」 | **`data-demo` 原地不动**，仍挂 `.appwin` | 驱动不再读载荷，属性位置就成了纯实现细节；不搬可让 Task 1 的「产物字节零差」证据成立，并少一处挂载顺序耦合 |
| 3 | §5.4 的 `pre` 态选择器示例 `.qa-pre` / `.mock-pre` 容器类 | 统一用 **`[data-fade]` + `.demo-in`** 两枚属性/类 | 四处同一个形状，样式与驱动都只认这一对；容器类要为每面另起名字，等于把同一件事写四遍 |
| 4 | §1② 「`flow.json` 与 `proof.json` 各写一行注释互指」 | 互指说明落在**组件的 `---` frontmatter 注释**里 | JSON **不支持注释**，且 `content.config.ts` 走严格 `JSON.parse`——写进去构建即失败。frontmatter 注释不进产物，符合 README 的「模板不留 HTML 注释」条 |
| 5 | §2「驱动模块是共享 chunk，不占标签数」 | 标签数断言保留（首页 5 → **6**）；**「共享」在产物层也成立** | **执行期更正**：只有 Hero 一段组件脚本时 Astro 7 内联（`*.js` = 0）；T5 加上 Proofs 后改抽外链，实测三个 chunk——`Hero.astro_*.js`、`Proofs.astro_*.js`、`demo-driver.*.js` 各一枚（探针读数 `3 / 0 / 6`）。同一模块在产物里只有**一份**，比预期的「内联两份」更好；Fallback A 无需启用 |
| 6 | §5.4 的并发处置「把两卡串成一条队列」 | 04 区两卡**演一遍即停**（不 `rt.loop()`） | 一次性编排没有并发循环可串；并发窗口只剩首次入屏那一轮（约 2.5s），三视口目视若仍判忙，再按 spec 原句接队列 |
| 7 | §3「`Hero.astro` 的 `<script>` 从 188 行瘦到约 20 行」「实测落点约一百七十行」（兑现上游「瘦约两百行」） | **实测净减约 42 行**：脚本正文 187 → 145（T2 降到 133，T4 接上演示二又加回 12），文件级 738 → 784、几乎不减 | 交给驱动的只有四个闸门与接线；`data-demo` 载荷解析、`Scene`/`demo` 两份类型、九枚 DOM 句柄和 `rowEl`/`showVoice`/`typeInto`/`setCard` 四个内容构造器都是这一面的编排，留在 Hero 侧就是对的（spec §3「每个面只提供自己的 `run`」已经承认这一点，前半句的算术没跟上）。T3 给同一文件加了第二段 markup 与样式，把文件级差额彻底补回去。**上游 D-12 那句「瘦约两百行」的预估就此作废**，T8 的更正注按 42 行落 |

## 文件地图

| 文件 | 动作 | 归属任务 |
|---|---|---|
| `src/lib/demo-driver.ts` | 新建（唯一新模块） | T2 |
| `src/content/copy/flow.json` | 新建（`stream / file / recall / qa` 四子树） | T1 建件，T3/T5/T6 各加子树 |
| `src/content/copy/stream.json` | 删除（内容整体迁入 `flow.stream`） | T1 |
| `src/content/copy/proof.json` | 移出 `m1*` 与 `m5*`（21 叶留下） | T1 |
| `src/components/blocks/Hero.astro` | T1 改引用；T2 换挂载；T3 加第二段 + `flow.qa`；T4 演示二接驱动 | T1–T4 |
| `src/components/blocks/Proofs.astro` | T1 改引用；T5 首枚组件脚本 + 信息卡动效；T6 创作卡动效 | T1/T5/T6 |
| `scripts/check-copy-coverage.mjs` | 重构成可导出纯函数 + `flow` 元素文本规则 + `--selftest` | T7 |
| `scripts/check-anchors.mjs` | 加 `data-shot` / 暂停开关两条清单断言 + selftest | T7 |
| `README.md` | 纪律条同步（第四层机检进了 `pnpm check`） | T8 |
| `<主检出>/docs/design/2026-11-03-five-blocks-design.md`、`2026-11-02-dark-redesign.md` | 两处显式更正注（**不在代码分支提交**） | T8 |

---

## 执行前置（控制器动作，不占任务号）

- [ ] **建 SP-4 分支与 worktree**（基线 = `feat/sp2-five-blocks` 的 `e9dcb59`，含 SP-2 的 19 个提交）

```bash
cd <仓库根>
git worktree add .worktrees/feat/sp4-demo-motion -b feat/sp4-demo-motion feat/sp2-five-blocks
```

- [ ] **装依赖并验基线绿**（worktree 各自一份 `node_modules`）

```bash
cd .worktrees/feat/sp4-demo-motion && pnpm install && pnpm build && pnpm check
```

期望输出（逐字）：`leaves=169 pages=4 missing=0 en-cjk=0` / `tokens=63 baseline=0` / `anchors=3 pages=4`，三支都打 `=== … PASSED ===`。

- [ ] **记 BASE**：`git rev-parse HEAD` → 写进本计划的 SDD 台账，作为 T1 的 review-package 基线。
- [ ] 后续所有命令的工作目录都是 `.worktrees/feat/sp4-demo-motion`。

---

## Task 1: `flow.json` 建件与三处搬迁（叶子数不变、产物零差）

**Files:**
- Create: `src/content/copy/flow.json`
- Modify: `src/content/copy/proof.json`（移除 10 枚叶）
- Delete: `src/content/copy/stream.json`
- Modify: `src/components/blocks/Hero.astro:10`
- Modify: `src/components/blocks/Proofs.astro:8,19,20,21,59,60,61`

**Interfaces:**
- Consumes: 无（本任务不新增能力，只重排文件）。
- Produces: `copy.flow = { stream, file, recall }` 三子树；`copy.stream` 不再存在。`flow.file` 含 `m1t m1a m1b m1c m1d m1e` 六叶，`flow.recall` 含 `m5a m5h m5p m5b` 四叶，`flow.stream` 与退役的 `stream.json` 逐字节同构（`prefix / idle / date / rows[] / incoming[]`）。T3/T5/T6 往同一文件继续加子树。

**边界规则（裁决②的严格形式）：一段文字只要参与动画就住 `flow.json`；不参与动画的标题与正文留在原文件。** 因此 `proof.json` 留下的 21 叶（`eyebrow / title / 1t / 1b / m2a-m2c / 2t / 2b / m3a / m3s1-3 / m3p1-3 / 3t / 3b / 5t / 5b / band`）都是不参与动画的。

- [ ] **Step 1：抓基线产物**（本任务的验收=「搬迁是字节中性」，必须先存证）

```bash
pnpm build
cp dist/index.html /tmp/sp4-t1-base-en.html
cp dist/zh/index.html /tmp/sp4-t1-base-zh.html
```

- [ ] **Step 2：写迁移脚本并跑**（手写 JSON 会漂；用脚本保证同一批 `{zh,en}` 对整件搬走）

写到 `/tmp/sp4-migrate-flow.mjs`（一次性件，不入库、不进仓库目录）：

```js
import fs from 'node:fs';
const COPY = 'src/content/copy';
const read = (n) => JSON.parse(fs.readFileSync(`${COPY}/${n}.json`, 'utf8'));
const write = (n, v) => fs.writeFileSync(`${COPY}/${n}.json`, JSON.stringify(v, null, 2) + '\n');

const stream = read('stream');
const proof = read('proof');
const take = (obj, keys) => {
  const out = {};
  for (const k of keys) {
    if (!(k in obj)) throw new Error(`proof.json 缺 ${k}`);
    out[k] = obj[k];
    delete obj[k];
  }
  return out;
};

write('flow', {
  stream,
  file: take(proof, ['m1t', 'm1a', 'm1b', 'm1c', 'm1d', 'm1e']),
  recall: take(proof, ['m5a', 'm5h', 'm5p', 'm5b']),
});
write('proof', proof);
console.log('flow.json 叶子子树：', Object.keys(read('flow')).join(','));
```

（脚本**不删** `stream.json`——删除是 Step 4 的 `git rm` 的动作，它要让索引和工作树一起收；在这里 `fs.rmSync` 会让 `git rm` 报 pathspec 不匹配。）

```bash
node /tmp/sp4-migrate-flow.mjs && rm /tmp/sp4-migrate-flow.mjs && ls src/content/copy
```

期望：列表里**同时**出现 `flow.json`（新增）与 `stream.json`（还没删）；脚本打印 `flow.json 叶子子树： stream,file,recall`。

- [ ] **Step 3：改两处引用**

`src/components/blocks/Hero.astro` 第 10 行，连同上方注释一起替换（口径差 #4：互指说明只能写在 frontmatter）：

```ts
// 会动的文案都住 flow.json（参与动画的句子在这里，不动的卡与卡标题住 proof.json）；
// 日期「10-22」与 CSS 类名是结构字段、不是文案，因此不走双语叶子。
const flow = copy.flow;
const stream = flow.stream;
```

`src/components/blocks/Proofs.astro` 第 8 行替换为：

```ts
const proof = copy.proof;
// 这两张卡的 mock 文字参与动画，按裁决②住在 flow.json；卡标题（1t/1b…5t/5b）与
// 另外两张不动的卡（m2* / m3*）留在 proof.json。
const flow = copy.flow;
```

同文件 6 处表达式换名（行号按改前）：

| 行 | 改前 | 改后 |
|---|---|---|
| `:19` | `{proof.m1t}` `{proof.m1a}` | `{flow.file.m1t}` `{flow.file.m1a}` |
| `:20` | `{proof.m1b}` `{proof.m1c}` | `{flow.file.m1b}` `{flow.file.m1c}` |
| `:21` | `{proof.m1d}` `{proof.m1e}` | `{flow.file.m1d}` `{flow.file.m1e}` |
| `:59` | `{proof.m5h}` | `{flow.recall.m5h}` |
| `:60` | `{proof.m5p}` | `{flow.recall.m5p}` |
| `:61` | `{proof.m5a}` `{proof.m5b}` | `{flow.recall.m5a}` `{flow.recall.m5b}` |

- [ ] **Step 4：构建 + 守卫 + 零差证明**

```bash
git rm -q src/content/copy/stream.json
pnpm build && pnpm check
diff /tmp/sp4-t1-base-en.html dist/index.html && diff /tmp/sp4-t1-base-zh.html dist/zh/index.html && echo "T1 零差 OK"
```

期望：`leaves=169 pages=4 missing=0 en-cjk=0`（**总数必须仍是 169**——搬迁是换文件不是加文案）；两个 `diff` 都无输出并打出 `T1 零差 OK`。
若 `diff` 非零：逐处看是否只发生在被搬动的那 10 枚叶的渲染位置；正确的搬迁不应产生任何差异，出现差异即说明 markup 被顺手改了，回退重做。

- [ ] **Step 5：残留引用扫描**（断言「零」才可用 `grep -c`）

```bash
grep -rc "copy\.stream\b\|proof\.m1\|proof\.m5" src/ --include=*.astro --include=*.ts | grep -v ":0" || echo "无残留 OK"
```

期望：`无残留 OK`。

- [ ] **Step 6：提交**

```bash
git add src/content/copy/flow.json src/content/copy/proof.json src/components/blocks/Hero.astro src/components/blocks/Proofs.astro
git commit -m "refactor(copy): 会动的文案整件迁入 flow.json（SP-4 裁决②，产物零差）"
```

（`stream.json` 的删除已随 `git rm` 入索引。）

---

## Task 2: `src/lib/demo-driver.ts` + 演示一改挂载

**Files:**
- Create: `src/lib/demo-driver.ts`
- Modify: `src/components/blocks/Hero.astro:550-738`（整段 `<script>` 替换）

**Interfaces:**
- Consumes: T1 的 `flow.stream` 载荷（仍由 `Hero.astro:44` 的 `data-demo` 序列化下发，本任务不动 markup）。
- Produces: `export function mountDemo(m: DemoMount): void`、`export interface DemoMount`、`export interface DemoRuntime`（字段见下）。运行期在 `root` 上落 `demo-running` 类、在 `[data-fade]` 元素上增删 `demo-in` 类——T3/T4/T5/T6 的样式与挂载都依赖这两个类名与这个属性名。

- [ ] **Step 1：写驱动**（完整文件，一次到位）

`src/lib/demo-driver.ts`：

```ts
/**
 * 演示动效的共用驱动（SP-4 裁决①：收成一枚）。
 * 独占四个闸门——手动暂停 / prefers-reduced-motion / 窄屏 / 离屏——和定时器令牌失效。
 * 每个面只提供自己的编排：reset 负责回帧，run 负责排帧；状态一律走 class（裁决④）。
 * 客户端件：由组件 <script> 相对路径 import，不用 @/ 别名（别名目前只在服务端 frontmatter 验证过）。
 */
export interface DemoRuntime {
  stepMs: number;
  dwellMs: number;
  at(ms: number, fn: () => void): void;
  fades(): HTMLElement[];
  show(el: HTMLElement): void;
  hide(el: HTMLElement): void;
  all(): void;
  none(): void;
  loop(): void;
}

export interface DemoMount {
  root: HTMLElement;
  watch?: HTMLElement;
  toggle?: HTMLElement | null;
  labels?: { play: string; pause: string };
  stepMs?: number;
  dwellMs?: number;
  reset?: (rt: DemoRuntime) => void;
  run: (rt: DemoRuntime) => void;
}

const RUNNING = 'demo-running';
const IN = 'demo-in';
const REDUCED = '(prefers-reduced-motion: reduce)';
const NARROW = '(max-width: 640px)';

export function mountDemo(m: DemoMount): void {
  // 关动画＝永不启用动效，也没有中途恢复路径（CSS 同时把开关藏掉），所以连监听都不挂。
  if (window.matchMedia(REDUCED).matches) return;

  const narrow = window.matchMedia(NARROW);
  let paused = false;
  let outOfView = false;
  let token = 0;

  const open = (mine: number) => mine === token && !paused && !outOfView && !narrow.matches;

  const rt: DemoRuntime = {
    stepMs: m.stepMs ?? 3000,
    dwellMs: m.dwellMs ?? 1400,
    at: (ms, fn) => {
      const mine = token;
      window.setTimeout(() => {
        if (open(mine)) fn();
      }, ms);
    },
    // data-fade 的值是显式帧序：04 区创作卡要「先命中的记录、后落进正文的角标」，
    // 而角标在 DOM 里排在记录之前——文档序会给错顺序。
    fades: () =>
      Array.from(m.root.querySelectorAll<HTMLElement>('[data-fade]')).sort(
        (a, b) => Number(a.dataset.fade || 0) - Number(b.dataset.fade || 0),
      ),
    show: (el) => el.classList.add(IN),
    hide: (el) => el.classList.remove(IN),
    all: () => {
      for (const el of rt.fades()) rt.show(el);
    },
    none: () => {
      for (const el of rt.fades()) rt.hide(el);
    },
    loop: () => begin(),
  };

  // 终态落位：撤掉 demo-running，样式里的 pre 态整条失效，读者直接拿到全部内容。
  function settle() {
    token += 1;
    m.root.classList.remove(RUNNING);
    if (m.reset) m.reset(rt);
    rt.all();
  }

  function begin() {
    if (narrow.matches) return settle();
    token += 1;
    m.root.classList.add(RUNNING);
    if (m.reset) m.reset(rt);
    else rt.none();
    if (paused || outOfView) return;
    m.run(rt);
  }

  const toggle = m.toggle;
  const labels = m.labels;
  if (toggle && labels) {
    toggle.addEventListener('click', () => {
      paused = !paused;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? labels.play : labels.pause;
      if (paused) {
        // 暂停要停在「读得到全部信息」的那一帧：让残留定时器过期，把没露面的增量补齐。
        token += 1;
        rt.all();
      } else {
        begin();
      }
    });
  }

  narrow.addEventListener('change', begin);

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const nowOut = !entry.isIntersecting;
          if (nowOut === outOfView) continue;
          outOfView = nowOut;
          if (outOfView) token += 1;
          else if (!paused) begin();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(m.watch ?? m.root);
  }

  begin();
}
```

- [ ] **Step 2：把 `Hero.astro:550-738` 整段 `<script>` 替换成挂载调用**

内容构造件（`rowEl` / `setCard` / `renderFrame` / `showVoice`）留在 Hero 侧——它们是这一面的编排，不是运行时。原脚本里的四个闸门、`token`、暂停接线、窄屏 `change`、离屏 IO 全部删掉，交给驱动。顺带修掉原 `:569-570` 重复的 `pause: string;` 一行。

```html
<script>
  import { mountDemo, type DemoRuntime } from '../../lib/demo-driver';

  const win = document.querySelector<HTMLElement>('.appwin');
  const payload = win?.dataset.demo;
  if (win && payload) {
    type Scene = {
      time: string;
      mode: string;
      badge: string;
      cls: string;
      text: string;
      type: string;
      status: string;
      dur?: string;
    };
    const demo = JSON.parse(payload) as {
      prefix: string;
      today: string;
      dictated: string;
      dictating: string;
      play: string;
      pause: string;
      rows: Scene[];
      incoming: Scene[];
    };

    const rowsBox = document.getElementById('streamRows')!;
    const typebar = document.getElementById('typebar')!;
    const card = document.getElementById('infoCard')!;
    const cardType = document.getElementById('cardType')!;
    const cardTypeV = document.getElementById('cardTypeV')!;
    const cardBody = document.getElementById('cardBody')!;
    const cardBadge = document.getElementById('cardBadge')!;
    const cardSource = document.getElementById('cardSource')!;
    const cardStatus = document.getElementById('cardStatus')!;

    const rowEl = (scene: Scene, landing: boolean) => {
      const node = document.createElement('div');
      node.className = landing ? 'srow landing' : 'srow';
      const time = document.createElement('span');
      time.className = 't';
      time.textContent = scene.time;
      const text = document.createElement('span');
      text.className = 'txt';
      text.textContent = scene.text;
      const badge = document.createElement('span');
      badge.className = `badge ${scene.cls}`;
      badge.textContent = scene.badge;
      node.append(time, text, badge);
      return node;
    };

    // 无 JS 与 reduced-motion 都到不了这里（驱动早退），所以 flip 无需再问一次 reduced。
    const setCard = (scene: Scene) => {
      cardType.textContent = scene.type;
      cardTypeV.textContent = scene.type;
      cardBody.textContent = scene.text;
      cardBadge.className = `badge ${scene.cls}`;
      cardBadge.textContent = scene.badge;
      cardSource.textContent = `${scene.time} · ${scene.mode === 'voice' ? demo.dictated : demo.today}`;
      cardStatus.textContent = scene.status;
      card.classList.add('show');
      card.classList.remove('flip');
      void card.offsetWidth;
      card.classList.add('flip');
    };

    const renderFrame = () => {
      rowsBox.textContent = '';
      for (const scene of demo.rows) rowsBox.appendChild(rowEl(scene, false));
      setCard(demo.rows[demo.rows.length - 1]);
    };

    const showVoice = (scene: Scene) => {
      const node = document.createElement('div');
      node.className = 'voice';
      const rec = document.createElement('span');
      rec.className = 'rec';
      const label = document.createElement('span');
      label.textContent = demo.dictating;
      const wave = document.createElement('span');
      wave.className = 'wave';
      wave.setAttribute('aria-hidden', 'true'); // 装饰性中间帧才挂 aria-hidden
      for (let i = 0; i < 5; i++) wave.appendChild(document.createElement('i'));
      const dur = document.createElement('span');
      dur.className = 'dur';
      dur.textContent = scene.dur ?? '';
      node.append(rec, label, wave, dur);
      rowsBox.appendChild(node);
      return node;
    };

    const typeInto = (rt: DemoRuntime, full: string) => {
      let k = 0;
      const step = () => {
        typebar.textContent = full.slice(0, k);
        if (k >= full.length) return;
        k += 1;
        rt.at(26, step);
      };
      step();
    };

    // 演示一：SSR 已经交出终态（三条记录 + 一张展开卡片），循环只做增量。
    mountDemo({
      root: win,
      watch: document.querySelector<HTMLElement>('.hero') ?? undefined,
      toggle: document.getElementById('streamToggle'),
      labels: { play: demo.play, pause: demo.pause },
      reset: () => renderFrame(),
      run(rt) {
        const total = demo.incoming.length;
        let n = 0;
        const next = () => {
          const scene = demo.incoming[n % total]!;
          const voice = scene.mode === 'voice' ? showVoice(scene) : null;
          if (!voice) typeInto(rt, demo.prefix + scene.text);
          rt.at(voice ? 2400 : 1200, () => {
            voice?.remove();
            typebar.textContent = '';
            const node = rowEl(scene, true);
            node.classList.add('living');
            rowsBox.appendChild(node);
            requestAnimationFrame(() => node.classList.add('show'));
            setCard(scene);
            n += 1;
            rt.at(rt.stepMs, n % total === 0 ? () => rt.loop() : next);
          });
        };
        rt.at(2200, next);
      },
    });
  }
</script>
```

- [ ] **Step 3：构建 + 守卫 + 脚本账**

```bash
pnpm build && pnpm check
grep -o '<script' dist/index.html | wc -l
grep -o '<script' dist/privacy/index.html | wc -l
grep -oe '"demo-running"' -oe '`demo-running`' dist/index.html | wc -l
ls dist/_astro/*.js 2>/dev/null | wc -l
```

期望：守卫三行与前次一致（`leaves=169`）；首页 `<script` = **5**（驱动没换来新标签）；隐私 = **2**；`demo-running` 的 JS 字面量 = **1**；`dist/_astro/*.js` = **0**（把「Astro 7 内联每段脚本、无 JS chunk」这条前提钉成证据，供 T5 的探针解读）。

- [ ] **Step 4：节拍对账（脚本判不了时间轴，先把可判的判掉）**

```bash
grep -c "matchMedia\|IntersectionObserver\|addEventListener" src/components/blocks/Hero.astro
```

期望 **0**——四个闸门与全部接线都收进驱动之后，Hero 侧一份都不该剩（这是断言「零」，用 `grep -c` 符合计数纪律）。若 >0，说明闸门代码没删干净——两处各写一份即违背裁决①；把残留的那几行指出来，删净后重跑本步。

- [ ] **Step 5：提交**

```bash
git add src/lib/demo-driver.ts src/components/blocks/Hero.astro
git commit -m "feat(demo): 共一枚驱动收四个闸门，首屏演示一改挂载（SP-4 裁决①）"
```

---

## Task 3: 首屏拆成两段——新增演示二的静态终态

**Files:**
- Modify: `src/components/blocks/Hero.astro`（frontmatter、markup `:44-98`、样式 `:222-230` 与 `:532-547`）
- Modify: `src/content/copy/flow.json`（新增 `qa` 子树 5 叶）

**Interfaces:**
- Consumes: T2 的类名约定（本任务先不挂驱动，只交终态）。
- Produces: `.demo-flow[data-shot="hero-flow"]`（包住 `.stream` + `.cardpanel`，成为演示一的 `root`，T4 之后由 Hero 脚本切换）、`.demo-qa[data-shot="hero-qa"]`（演示二的容器，T4 的 `root`）、`#qaToggle`（T4 的 `toggle`）、`flow.qa.{q,h1,h2,cite,ans}` 五叶（与 SP-2 删掉的 `m4q/m4a/m4b/4t/4b` 一一对应）。

- [ ] **Step 1：加 `flow.qa` 五叶**（句子属文案轮，位置/语义/红线由本计划钉死；维护者可直接改写，不影响任何机检）

`src/content/copy/flow.json` 顶层加与 `stream / file / recall` 并列的 `qa`：

```json
  "qa": {
    "q": {
      "zh": "「先做桌面」这句，是什么时候定下的？",
      "en": "When did we settle on desktop first?"
    },
    "h1": {
      "zh": "决策 · 11:48 · 先做桌面",
      "en": "Decision · 11:48 · desktop first"
    },
    "h2": {
      "zh": "需求 · 12:05 · 导出带图",
      "en": "Request · 12:05 · exports carry images"
    },
    "cite": {
      "zh": "出处 · 11:48 决策",
      "en": "source · 11:48 decision"
    },
    "ans": {
      "zh": "不用回忆。它带着时间戳回来了。",
      "en": "No need to remember. It came back with its timestamp."
    }
  }
```

去重自查（裁决③红线，必须逐条对）：`h1 / h2` 两条命中记录与 `recall.m5b` 的「竞品动态 · 评审结论 · 客户回话」、`recall.hit2`（T6 加）都不重名；`ans` 与 `recall` 侧措辞不互为改写；两面都在演「问答/召回」，这是站内**第二次也是最后一次**允许落点。

- [ ] **Step 2：frontmatter 取回 qa**

`src/components/blocks/Hero.astro` 的 `---` 里，`const stream = flow.stream;` 之后加一行：

```ts
const qa = flow.qa;
```

- [ ] **Step 3：markup 换成「一个窗、两行、一条发丝线」**

把 `:52-97` 的 `.appwin-body` 整段替换（`:44` 的 `data-demo` 与 `:45-51` 的 `.appwin-top` 都不动——见口径差 #2）。**先做两步纯搬运**（不重打、不改字）：`Hero.astro:53-74` 的 `.stream` 整块、`:75-96` 的 `.cardpanel` 整块，各自缩进两个空格后原样放进新的 `.demo-flow` 包裹层里——块内每一个 id、每一枚叶子、每一处 `{…}` 表达式都不改；替换后的 markup 只多两样东西：外层 `.demo-flow` 与紧随其后的 `.demo-qa` 段。

```html
        <div class="appwin-body">
          <div class="demo-flow" data-shot="hero-flow">
            <div class="stream">
              ↑ 这里放原 :53-74 整块（.stream-head / #streamRows / .typebar），一字不改
            </div>
            <div class="cardpanel" id="cardPanel">
              ↑ 这里放原 :75-96 整块（#infoCard 与 .card-hint），一字不改
            </div>
          </div>
          <div class="demo-qa" data-shot="hero-qa">
            <div class="qa-head">
              <p class="q">{qa.q}</p>
              <span class="appwin-ctl">
                <button type="button" id="qaToggle" aria-pressed="false">{hero.pause}</button>
              </span>
            </div>
            <div class="hits">
              <span class="hit">{qa.h1}</span>
              <span class="hit">{qa.h2}</span>
            </div>
            <p class="ans">{qa.ans}<span class="cite">{qa.cite}</span></p>
          </div>
        </div>
```

搬完自查一条：`git diff --stat` 里 `Hero.astro` 的删除行数应等于新增行数减去 qa 段与包裹层的行数——若两个旧块里有任何一行被改写，说明搬运时顺手改了 markup，T1 立的「字节中性」纪律到这一步不再成立（本任务允许产物差，但差只许来自新增的 qa 段）。qa 段**不加头标**（加了就成第 10 枚叶），`#qaToggle` 复用 `.appwin-ctl` 类名——于是 `:520-524`（reduced-motion）与 `:541-543`（≤640）两条隐藏规则**零改写**就覆盖到第二枚开关。

- [ ] **Step 4：样式（`is:global` 块内，选择器一律挂在 `.hero / .appwin` 下）**

`.appwin-body` 那条（`:222-226`）改为单列，并把两列布局交给 `.demo-flow`：

```css
  .appwin-body {
    display: grid;
    grid-template-columns: 1fr;
    background: var(--surface-2);
  }
  .appwin .demo-flow {
    display: grid;
    grid-template-columns: 1.22fr 0.78fr;
  }
```

下面这一批里 `.hit` 与 `.cite` 两处用 `var(--fs-mono)`，是这枚令牌全站**第一次有消费者**，于是摘掉 `tokens.css:89` 那条「零消费者待撤销」的身份（`tokens=63` 不变，只是不再需要撤销它）：

```css
  .appwin .demo-qa {
    border-top: 1px solid var(--hair-1);
    padding: 16px 18px 18px;
  }
  .appwin .demo-qa .qa-head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .appwin .demo-qa .q {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-1);
  }
  .appwin .demo-qa .hits {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 9px;
  }
  .appwin .demo-qa .hit {
    position: relative;
    padding: 3px 8px 3px 16px;
    font-family: var(--mono);
    font-size: var(--fs-mono);
    color: var(--text-2);
    background: var(--surface-3);
    border: 1px solid var(--hair-1);
    border-radius: 6px;
  }
  .appwin .demo-qa .hit::before {
    content: "";
    position: absolute;
    left: 7px;
    top: 50%;
    width: 5px;
    height: 5px;
    margin-top: -2.5px;
    border-radius: 50%;
    background: var(--accent-400);
  }
  .appwin .demo-qa .ans {
    margin-top: 9px;
    font-size: 12.5px;
    color: var(--text-2);
  }
  .appwin .demo-qa .cite {
    margin-left: 6px;
    font-family: var(--mono);
    font-size: var(--fs-mono);
    color: var(--accent-400);
  }
```

`::before` 用几何点而非 `content` 字符：装饰层不占文案叶子，也不给 EN 页添汉字风险。`.hit` 压 `--surface-3` 用 `--text-2`（≈7.0）不用 `--text-3`（4.19，未过 4.5）。

`@media (max-width: 640px)` 那条里的 `.appwin-body { grid-template-columns: 1fr }` 现在**改指 `.demo-flow`**（其余三条规则不动）：

```css
    .appwin .demo-flow {
      grid-template-columns: 1fr;
    }
```

- [ ] **Step 5：构建 + 守卫 + 结构证明**

```bash
pnpm build && pnpm check
node scripts/check-copy-coverage.mjs | head -1
grep -o 'data-shot="[^"]*"' dist/index.html | sort | tr '\n' ' '; echo
grep -o 'id="qaToggle"' dist/index.html | wc -l
grep -o '(width<=640px){\.appwin \.demo-flow{grid-template-columns:1fr' dist/_astro/Home.*.css | wc -l
grep -o '(width<=640px){\.appwin-body' dist/_astro/Home.*.css | wc -l
```

期望：`leaves=174 pages=4 missing=0 en-cjk=0`（169 + qa 5）；`data-shot` 现在六枚且只六枚：`creation hero-flow hero-qa info-cards report todo`；`id="qaToggle"` = 1；`tokens=63 baseline=0`、`anchors=3 pages=4` 均不变。
最后两条一起证明窄屏改指真的发生了：`(width<=640px){.appwin .demo-flow{grid-template-columns:1fr` = **1**、`(width<=640px){.appwin-body` = **0**。

**产物 CSS 的 media 特征写法（实测，全站适用）**：lightningcss 把 `@media (max-width: 640px)` 序列化成 `@media (width<=640px)`（`min-width` 同理变 `width>=`），但 `prefers-reduced-motion:reduce` 原样保留。因此在 `dist/_astro/*.css` 里 grep 窄屏规则一律写 `width<=`，写 `max-width:` 恒为 0——那不是断言失败，是查错了拼写。`@media` 关键字与 `{` 之间照抄一个空格。`.appwin-body` 原是 640 块里的**第一条**规则（它上面只有注释，压缩时丢掉），所以替换之后块首就是 `.appwin .demo-flow`，pattern 必须带 `.appwin ` 前缀；改错选择器就是漏掉这一格——窄屏下两列还在，390 视口即破。若第一条为 0，先 `grep -o '@media (width<=640px){[^{]*{' dist/_astro/Home.*.css | head -3` 打印块首真实片段，据实修正 pattern，**不得放宽断言、不得把选择器改成裸 `.demo-flow` 迁就计数**。

- [ ] **Step 6：提交**

```bash
git add src/components/blocks/Hero.astro src/content/copy/flow.json
git commit -m "feat(hero): 首屏拆成两段，问答段先交静态终态（SP-4 §5.1）"
```

---

## Task 4: 演示二接驱动

**Files:**
- Modify: `src/components/blocks/Hero.astro`（qa markup 加 `data-fade`、`<script>` 加第二枚挂载、样式加 `pre` 态）

**Interfaces:**
- Consumes: T2 的 `mountDemo` / `demo-running` / `demo-in` / `[data-fade]`、T3 的 `.demo-qa` 与 `#qaToggle`。
- Produces: 首屏两枚 `mountDemo`（各自的 `root` / `toggle`），`leaves` 不变（174）。

- [ ] **Step 1：三处 `data-fade`（值即帧序）**

```html
            <div class="hits">
              <span class="hit" data-fade="1">{qa.h1}</span>
              <span class="hit" data-fade="2">{qa.h2}</span>
            </div>
            <p class="ans">{qa.ans}<span class="cite" data-fade="3">{qa.cite}</span></p>
```

问句 `.q` 与回答句 `.ans` 的文字本体**不挂** `data-fade`：它们不参与动画，且一旦挂上就成了「只在动画里才可见的信息」，直接违背裁决④。

- [ ] **Step 2：`pre` 态样式（形状与 T5/T6 完全一致，只换容器）**

```css
  .js .appwin .demo-qa.demo-running [data-fade] {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .js .appwin .demo-qa.demo-running [data-fade].demo-in {
    opacity: 1;
  }
```

纪律（spec §5.4）：`demo-running` **只在驱动挂载的那一帧存在**，静态产物里除 JS 之外搜不到它。写成裸 `.js .demo-qa [data-fade] { opacity: 0 }` 会在「JS 开着但动画没跑」时永久隐藏终态——这是不可接受的静默丢内容。
两处都只走 `opacity`，**始终占位**：不引起重排，读者也不会看见问答段在播放中变高。

- [ ] **Step 3：第二枚挂载**（放在 T2 那段 `mountDemo({...})` 之后、`if (win && payload)` 收口之前）

```js
    // 演示二：问句 → 命中两条记录 → 角标落回回答。循环演，因为它是首屏的一段演示（NB-8）。
    mountDemo({
      root: document.querySelector<HTMLElement>('.demo-qa')!,
      toggle: document.getElementById('qaToggle'),
      labels: { play: demo.play, pause: demo.pause },
      run(rt) {
        const els = rt.fades();
        els.forEach((el, i) => rt.at(500 + i * 800, () => rt.show(el)));
        rt.at(500 + els.length * 800 + rt.stepMs + rt.dwellMs, () => rt.loop());
      },
    });
```

`labels` 复用 `demo.play / demo.pause` 同一份载荷：两枚开关是同一个动作，不该有两套措辞，也不该多两枚叶子。

- [ ] **Step 4：构建 + 守卫 + 产物证明**

```bash
pnpm build && pnpm check
grep -o 'data-fade="[0-9]"' dist/index.html | wc -l
grep -o 'demo-running' dist/index.html | wc -l
grep -o '<script' dist/index.html | wc -l
grep -o '\.demo-qa\.demo-running \[data-fade\]{opacity:0' dist/_astro/Home.*.css | wc -l
```

期望：`leaves=174` 不变；`data-fade="N"` = **3**（qa 三处；`.demo-flow` 侧本任务仍零枚）——**必须带 `="[0-9]"`**，裸 `data-fade` 会把内联驱动里那句 `querySelectorAll("[data-fade]")` 一起数进来；`demo-running` 在 HTML 里 = **1**（只来自内联驱动的 `RUNNING` 常量；两条 CSS 规则不在 HTML，见下）；首页 `<script` 仍 **5**；`demo-qa.demo-running [data-fade]{opacity:0` 在 `dist/_astro/Home.*.css` 里 = **1**——pattern 必须带上 `{opacity:0`：Step 2 的第二条规则 `.demo-qa.demo-running [data-fade].demo-in` 也含前面这半段，不带尾巴会数成 2，那不是多出一条规则，是 pattern 截短了。
实测前提（已核）：Astro 把组件 `<style>` 抽进外部 CSS（`dist/_astro/Home.DxtP5TU3.css` + `SiteFooter.*.css`），`dist/index.html` 里没有选择器文本——所以 CSS 断言一律去 CSS 文件查，HTML 只查属性与内联脚本。

- [ ] **Step 5：退化矩阵的静态自证**（无 JS / reduced / 窄屏三档都必须在产物层成立）

```bash
grep -o 'class="demo-qa"' dist/index.html | wc -l
grep -o 'demo-qa demo-running' dist/index.html | wc -l
grep -o '\.js \.appwin \.demo-qa\.demo-running \[data-fade\]{opacity:0' dist/_astro/Home.*.css | wc -l
grep -o '@media (prefers-reduced-motion:reduce){\.appwin-ctl{display:none' dist/_astro/Home.*.css | wc -l
```

期望 **1 / 0 / 1 / 1**：
1. 静态产物里问答段的终态容器在位且只有一枚——无 JS 的读者拿到的就是这一份。
2. 静态 HTML 绝不带 `demo-running`（这一条替代「按引号形态数 JS 字面量」那种写法：minifier 用反引号还是双引号不该由本步断言，份数归 T5 的探针管）。
3. `pre` 态挂在 `.demo-running` 上，容器不带该类即整条失效——**查 CSS 不查 HTML**（组件样式被 Astro 抽进 `dist/_astro/Home.*.css`），且选择器里的**后代空格必须照抄**，写成 `.demo-qa.demo-running[data-fade]` 是另一条规则。
4. 一条规则同时藏掉两枚开关——因为 `#qaToggle` 复用了 `.appwin-ctl`；这条 pattern 已实测过：压缩后逐字是 `@media (prefers-reduced-motion:reduce){.appwin-ctl{display:none}}`。

第 3、4 条若为 0：先 `grep -o 'demo-running[^}]*}' dist/_astro/Home.*.css | head -5` 打印真实片段，照它的实际空格与 `{` 写法改 pattern，**不得放宽断言**（把 pattern 缩到只剩 `demo-running` 等于没测）。

- [ ] **Step 6：提交**

```bash
git add src/components/blocks/Hero.astro
git commit -m "feat(hero): 问答段接共用驱动，四处同一 pre 态形状（SP-4 §5.4）"
```

---

## Task 5: 04 区信息卡动效 + 驱动份数探针

**Files:**
- Modify: `src/content/copy/flow.json`（`file` 子树 +2 叶）
- Modify: `src/components/blocks/Proofs.astro`（frontmatter 引用、markup、scoped 样式、首枚组件 `<script>`）

**Interfaces:**
- Consumes: T2 的 `mountDemo`（相对路径 import）、`[data-fade]` / `demo-in` / `demo-running`。
- Produces: `flow.file.link` / `flow.file.toStream` 两叶；`Proofs.astro` 的组件脚本（首页 `<script>` 由 5 变 **6**）；两张静卡（`todo` / `report`）零 `data-fade` 的约定——T6 与 T7 都靠它。

- [ ] **Step 1：`flow.file` 加两枚终态叶子**（终态里新增的「进当日流」那行 + 双链标记；中间帧不加新文字，所以两枚叶子都是终态的一部分）

```json
    "m1e": {
      "zh": "竞品 App 上了语音转写，主打会议场景",
      "en": "A rival app shipped voice transcription for meeting use cases"
    },
    "link": {
      "zh": "⌁ 与客户回话互链",
      "en": "⌁ cross-linked to the client reply"
    },
    "toStream": {
      "zh": "↓ 已进当日流 · 11:48",
      "en": "↓ into today's stream · 11:48"
    }
```

（`m1e` 是既有叶，列出只为定位插入点；新增的是它后面的两枚。）

- [ ] **Step 2：信息卡 markup**（`:17-22` 整块替换；徽章从「裸文本 → 带标签」的对照就落在 `data-fade` 上）

```html
        <div class="mock" data-shot="info-cards">
          <div class="mock-chrome" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="mrow"><span class="mk-badge" data-fade="1">{flow.file.m1t}</span><span>{flow.file.m1a}</span></div>
          <div class="mrow"><span class="mk-badge" data-fade="2">{flow.file.m1b}</span><span>{flow.file.m1c}</span></div>
          <div class="mrow"><span class="mk-badge" data-fade="3">{flow.file.m1d}</span><span>{flow.file.m1e}</span></div>
          <div class="mrow mock-note" data-fade="4"><span class="mock-link">{flow.file.link}</span></div>
          <div class="mrow mock-note" data-fade="5"><span class="mock-tostream">{flow.file.toStream}</span></div>
        </div>
```

- [ ] **Step 3：scoped 样式**（`.mock` 是 `root`，所以选择器挂在 `.mock.demo-running`；Proofs 保持 scoped，**跨组件不借样式**）

```css
  .mock .mock-note {
    font-family: var(--mono);
    font-size: var(--fs-mono);
  }
  .mock .mock-link {
    color: var(--accent-400);
  }
  .mock .mock-tostream {
    color: var(--text-3);
  }
  .js .mock.demo-running [data-fade] {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .js .mock.demo-running [data-fade].demo-in {
    opacity: 1;
  }
```

`.mock-tostream` 的 `--text-3` 压在 `.mock` 的 `--surface-1` 上（实测 4.86，13px 过 AA）；这两枚新行会让卡面变高（`.mock` 是 `min-height: 132px`），列进 T9 的目视关口。

- [ ] **Step 4：首枚组件脚本**（两张静卡不挂；演一遍即停，见口径差 #6）

`src/components/blocks/Proofs.astro` 末尾（`</section>` 与 `</style>` 之后）加：

```html
<script>
  import { mountDemo } from '../../lib/demo-driver';

  for (const mock of Array.from(document.querySelectorAll<HTMLElement>('.mock'))) {
    if (!mock.querySelector('[data-fade]')) continue; // 待办卡与周报卡是静态的，不给它们挂闸门
    mountDemo({
      root: mock,
      run(rt) {
        rt.fades().forEach((el, i) => rt.at(600 + i * 700, () => rt.show(el)));
      },
    });
  }
</script>
```

- [ ] **Step 5：构建 + 守卫**

```bash
pnpm build && pnpm check
grep -o 'data-fade="[0-9]"' dist/index.html | wc -l
cat dist/_astro/*.css | grep -o 'demo-running' | wc -l
```

期望：`leaves=176 pages=4 missing=0 en-cjk=0` / `tokens=63 baseline=0` / `anchors=3 pages=4`；`data-fade="N"` = **8**（qa 3 + 信息卡 5，创作卡本任务还是零枚）；CSS 里 `demo-running` = **4**（T4 的 qa 两条 + 本任务的 `.mock` 两条；Hero 与 Proofs 的样式都并进同一个 `Home.*.css` chunk）。
不数完整选择器：Astro 的 scoped 会给**每一个**复合选择器都挂上 `[data-astro-cid-…]`（实测 `.mock-chrome[data-astro-cid-ps47iz23] i[data-astro-cid-ps47iz23]`），照抄整条选择器会把 pattern 写成一枚随构建哈希漂移的定时炸弹。要看真实形状时用 `cat dist/_astro/*.css | grep -o '[^,{]*demo-running[^{]*' | head`，只读不改断言。

- [ ] **Step 6：探针（口径差 #5 的取证，不阻断本任务）**

```bash
ls dist/_astro/*.js 2>/dev/null | wc -l
grep -oe '"demo-running"' -oe '`demo-running`' dist/index.html | wc -l
grep -o '<script' dist/index.html | wc -l
```

三种读法，逐字记进 SDD 台账：
- `0 / 1 / 6` → 共享成立（驱动被抽成一段被两脚本共用的内联代码）。
- `0 / 2 / 6` → **默认接受**：Astro 7 把每段组件脚本各自内联，同一模块因此在产物里带两份（约几百字节）。裁决①的实质是**一处定义、不会漂**，源码层已满足；标签数 6 也符合本计划的账。
- `>0 / …` → 说明抽出了外部 chunk，`<script` 仍应是 6；如实记录即可。

Fallback A（**只在维护者明确不接受两份内联时**启用）：把 `Hero.astro` 与 `Proofs.astro` 的两段 `<script>` 原样并入 `src/components/Home.astro` 的一枚 `<script>`（`import` 保留一条），首页标签数回到 5、共享天然成立；同时把 spec §3「脚本账」与 §8「首页 6」两句改掉。本任务不预先启用。

- [ ] **Step 7：提交**

```bash
git add src/content/copy/flow.json src/components/blocks/Proofs.astro
git commit -m "feat(proofs): 信息卡片演出整理过程，产物区取到第一枚组件脚本"
```

---

## Task 6: 04 区创作卡动效

**Files:**
- Modify: `src/content/copy/flow.json`（`recall` 子树 +2 叶）
- Modify: `src/components/blocks/Proofs.astro:57-62`（创作卡 markup）

**Interfaces:**
- Consumes: T5 的挂载循环（**不需要新脚本**：`.mock` 上有 `data-fade` 即自动挂上第二面）。
- Produces: `flow.recall.hit2` / `flow.recall.cite` 两叶；`leaves=178`（终值）。

- [ ] **Step 1：`flow.recall` 加两叶**

```json
    "m5b": {
      "zh": "竞品动态 · 评审结论 · 客户回话",
      "en": "competitor news · review call · client reply"
    },
    "hit2": {
      "zh": "数据指标 · 转写平均 42 秒",
      "en": "Metric · transcription averages 42s"
    },
    "cite": {
      "zh": "[42 秒 · 本周]",
      "en": "[42s · this week]"
    }
```

- [ ] **Step 2：创作卡 markup**（`:57-62` 整块替换；`data-fade` 的值把顺序钉成「两条命中记录 → 角标落进正文」，而角标在 DOM 里排在记录之前——这正是驱动按数值排序的理由）

```html
        <div class="mock" data-shot="creation">
          <div class="mock-chrome" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="doc-h">{flow.recall.m5h}</div>
          <div class="doc-p">{flow.recall.m5p}<sup class="mk-cite" data-fade="3">{flow.recall.cite}</sup></div>
          <div class="mrow" data-fade="1"><span class="mk-badge">{flow.recall.m5a}</span><span>{flow.recall.m5b}</span></div>
          <div class="mrow" data-fade="2"><span class="mk-badge">{flow.recall.hit2}</span></div>
        </div>
```

**不加光标**：`demo-in` 只能是一极性（登场），光标要的是反极性（终态消失），两者混在一处就把「状态 = 同一 DOM 的 class」这条简洁性破掉。「卡住」交给文案承担（`m5p` 现值读起来就是句子还没说完）。`pre` 态显示的是成稿句本体与标题——它们不参与动画，始终可见。

- [ ] **Step 3：样式补一枚**（`--fs-mono` 显式声明是地板要求：UA 给 `sup` 的 `font-size: smaller` 会把 13px 压成约 10.8px，破 §5.4 的微标签地板）

```css
  .mock .mk-cite {
    font-family: var(--mono);
    font-size: var(--fs-mono);
    color: var(--accent-400);
  }
```

- [ ] **Step 4：构建 + 守卫 + 两面并发账**

```bash
pnpm build && pnpm check
grep -o 'data-fade="[0-9]"' dist/index.html | wc -l
grep -o 'data-shot="creation"[^>]*' dist/index.html | head -1
```

期望：`leaves=178 pages=4 missing=0 en-cjk=0` / `tokens=63 baseline=0` / `anchors=3 pages=4`；`data-fade="N"` = **11**（qa 3 + 信息卡 5 + 创作卡 3；创作卡的 1、2 两枚挂在 `.mrow` 整行、3 挂在 `sup`）。
**必须带 `="[0-9]"`**：自 T5 起驱动已是外链 chunk，本页裸 `grep data-fade` 恰好等于属性数——但别拿这个巧合当纪律：它只说明「此刻没有别的脚本字面量污染」，Astro 改回内联或将来任一脚本出现该字符串就会静默变脏，且带值形态还同时钉住「值必须是数字」。若对不上，用 `grep -o 'data-fade="[0-9]"' dist/index.html | sort | uniq -c` 按帧序逐项数，别放宽数字。

- [ ] **Step 5：提交**

```bash
git add src/content/copy/flow.json src/components/blocks/Proofs.astro
git commit -m "feat(proofs): 创作空间演出素材被带出，四处动效装齐（SP-4 §5.3）"
```

---

## Task 7: 两支守卫扩展（不新增脚本，`pnpm check` 仍是三道闸）

**Files:**
- Modify: `scripts/check-copy-coverage.mjs`（重构成可导出纯函数 + `flow` 元素文本规则 + `--selftest`）
- Modify: `scripts/check-anchors.mjs`（`data-shot` 与暂停开关两条清单断言 + selftest）

**Interfaces:**
- Consumes: T1–T6 的全部产物；`flow.json` 的子树命名。
- Produces: coverage 汇总行新增 `static=` 字段；anchors 汇总行新增 `shots=` 与 `toggles=` 字段；两支都可跑 `--selftest`（spec §8 要求，而 coverage **今天没有这个模式**——本任务补出来）。

- [ ] **Step 1：coverage 的红灯夹具先写起来**（`--selftest` 里必须有一条「叶子只活在属性里 → 判红」，否则元素文本规则等于没测）

`scripts/check-copy-coverage.mjs` 整文件替换为：

```js
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
```

- [ ] **Step 2：跑 selftest，逐条确认红灯夹具真的红了**

```bash
node scripts/check-copy-coverage.mjs --selftest
```

期望：7 条全 `✓`，末行 `selftest: 7/7 passed`，退出码 0。

- [ ] **Step 3：跑全量 coverage，确认新汇总行**

```bash
node scripts/check-copy-coverage.mjs
```

期望逐字：`leaves=178 pages=4 missing=0 static=0 en-cjk=0` + `=== COPY CHECK PASSED ===`。
若 `static` 非 0：按 `STAT` 行指到具体叶子，只有两种正当处置——把那段文字真的渲进元素里，或（仅 `flow.stream.*`）核对豁免前缀是否写错。**不得**为通过而扩大前缀名单。

- [ ] **Step 4：anchors 加两条清单断言**

在 `scripts/check-anchors.mjs` 的 `export const ALLOWED = [...]` 之后加：

```js
// SP-4 §7：取景与开关都是「恰好这么多」型清单——多一枚、少一枚、改个名都判红。
export const SHOTS = ['hero-flow', 'hero-qa', 'info-cards', 'todo', 'report', 'creation'];
export const TOGGLES = ['streamToggle', 'qaToggle'];

export const shotsIn = (html) => [...html.matchAll(/data-shot="([^"]*)"/g)].map((m) => m[1]);
const countOf = (haystack, needle) => haystack.split(needle).length - 1;

export const checkShots = (pages) => {
  const bad = [];
  for (const p of pages) {
    const isHome = p.at === 'index.html' || p.at === 'zh/index.html';
    const shots = shotsIn(p.html);
    if (!isHome) {
      if (shots.length) bad.push(`${p.at} 不该出现 data-shot，实际有：${shots.join(',')}`);
      continue;
    }
    const extra = shots.filter((s) => !SHOTS.includes(s));
    if (extra.length) bad.push(`${p.at} 有清单外的 data-shot：${extra.join(',')}`);
    for (const id of SHOTS) {
      const n = countOf(p.html, `data-shot="${id}"`);
      if (n !== 1) bad.push(`${p.at} 的 data-shot="${id}" 出现 ${n} 次，应为 1 次`);
    }
    for (const id of TOGGLES) {
      const n = countOf(p.html, `id="${id}"`);
      if (n !== 1) bad.push(`${p.at} 的暂停开关 #${id} 出现 ${n} 次，应为 1 次`);
    }
  }
  return bad;
};
```

在 `run()` 里、现有 `check('站内每个锚点都指向存在的 id…')` 之后加一条，并把汇总行补两个字段：

```js
  const shotBad = [...new Set(checkShots(pages))];
  check('取景与开关清单恰好（六枚 data-shot、两枚暂停开关；辅助页零枚）', shotBad.length === 0, shotBad.slice(0, 30));
```

```js
  console.log(
    `\nanchors=${new Set(pages.flatMap((p) => hrefsIn(p.html).map((h) => resolveAnchor(h)?.frag).filter(Boolean))).size} pages=${pages.length} shots=${new Set(pages.flatMap((p) => shotsIn(p.html))).size} toggles=${TOGGLES.filter((id) => pages.some((p) => p.html.includes(`id="${id}"`))).length}`,
  );
```

`--selftest` 分支里追加夹具（`check` / `results` 已在文件里定义，直接复用）：

```js
  const SHOT_HOME =
    '<div data-shot="hero-flow"></div><button id="streamToggle"></button><div data-shot="hero-qa"></div><button id="qaToggle"></button><div data-shot="info-cards"></div><div data-shot="todo"></div><div data-shot="report"></div><div data-shot="creation"></div>';
  const SHOTS_OK = [
    { at: 'index.html', html: SHOT_HOME },
    { at: 'zh/index.html', html: SHOT_HOME },
    { at: 'privacy/index.html', html: '<p>no shot here</p>' },
  ];
  check('取景与开关清单齐 → 零失败', checkShots(SHOTS_OK).length === 0, checkShots(SHOTS_OK));
  check(
    '首屏少一枚 hero-qa → 判红',
    checkShots(SHOTS_OK.map((p) => (p.at === 'index.html' ? { ...p, html: p.html.replace('data-shot="hero-qa"', 'data-shot="hero-q"') } : p))).some((m) => m.includes('hero-qa')),
    '缺的那枚要报出来',
  );
  check(
    '暂停开关少一枚 → 判红',
    checkShots(SHOTS_OK.map((p) => (p.at === 'index.html' ? { ...p, html: p.html.replace('id="qaToggle"', 'id="otherToggle"') } : p))).some((m) => m.includes('#qaToggle')),
    '开关要各命中一次',
  );
  check(
    '辅助页混进 data-shot → 判红',
    checkShots(SHOTS_OK.map((p) => (p.at === 'privacy/index.html' ? { ...p, html: '<div data-shot="todo"></div>' } : p))).some((m) => m.includes('privacy/index.html 不该出现')),
    '隐私页必须零枚',
  );
```

- [ ] **Step 5：跑 anchors**

```bash
node scripts/check-anchors.mjs --selftest && node scripts/check-anchors.mjs
```

期望：`selftest: 13/13 passed`（现件 9 条：`check-anchors.mjs:108-113` 六条 `resolveAnchor` + `:119/:122/:127` 三条 `checkAnchors`；加本任务新 4 条）；全量 `anchors=3 pages=4 shots=6 toggles=2` + `=== ANCHOR CHECK PASSED ===`。
`anchors` 与 `pages` 两个字段必须与 SP-2 交付时逐字一致——SP-4 不新增任何锚点。

- [ ] **Step 6：三道闸一起过 + 提交**

```bash
pnpm check
git add scripts/check-copy-coverage.mjs scripts/check-anchors.mjs
git commit -m "chore(check): 会动的文案要落在元素文本里，取景与开关清单入守卫"
```

---

## Task 8: README 纪律条同步 + 权威链两处显式更正注

**Files:**
- Modify: `README.md`（分支跟踪，随分支提交）
- Modify: `<主检出>/docs/design/2026-11-03-five-blocks-design.md:140`、`:167`，`<主检出>/docs/design/2026-11-02-dark-redesign.md:31`（**不在 SP-4 分支提交**）

**Interfaces:**
- Consumes: T7 之后的守卫真实行为。
- Produces: 无代码接口；只交「文档说的与机器做的一致」。

- [ ] **Step 1：README 那条 `pnpm build && pnpm check` 纪律补一句**（现文只说「逐叶子回比构建产物」，没提 SP-4 加的第二层）

把该条替换为：

```markdown
- 写完要 `pnpm build && pnpm check`：双语键成对由 schema 保证，但一条文案两种语言都齐却没人引用，只有这一步能发现——它逐叶子回比构建产物，并确认英文页除了语言开关上的「中文」没有别的汉字。会动的那批文案另有一层：`flow.qa / flow.file / flow.recall` 的每枚叶子必须在**元素文本**里读得到，只活在 `data-demo` 属性里的那一份不算数；取景与开关也有清单盯着（六枚 `data-shot`、两枚暂停键，多一枚少一枚都判红）。两支守卫都带 `--selftest`，改判定规则前先 `node scripts/<name>.mjs --selftest` 跑一遍夹具。CI 已接这几条。
```

- [ ] **Step 2：构建后全绿再提交分支侧**

```bash
pnpm build && pnpm check
git add README.md
git commit -m "docs(readme): 纪律条同步——文案守卫加了元素文本一层，取景与开关入清单"
```

- [ ] **Step 3：权威链两处更正注**（`docs/` 只在主检出，且维护者自己的未提交改动正压在同一片——**这里只给要插入/替换的文本，执行者不得在主检出 commit、不得 push**）

1. `<主检出>/docs/design/2026-11-03-five-blocks-design.md` 第 `140` 行整行替换：

```markdown
| 暗色层 D-12 三段流水线契约 | 拆并（见 NB-8） | ~~组件目录仍建，但 `FlowVoice` 归首屏、`FlowFile / FlowRecall` 归产物卡~~ **2026-11-04 SP-4 执行期更正**：组件目录不建，四处共用一个单文件驱动 `src/lib/demo-driver.ts`（裁决①）；「`Hero.astro` 瘦身约两百行」的预估作废——脚本正文实测 187 → 145 行（净减 42；交出去的是四个闸门与接线，换回来的是两段挂载），文件级几乎不减，因为演示一的 `data-demo` 载荷与 `rowEl`/`showVoice`/`typeInto` 等内容构造器按职责留在首屏侧，且首屏第二段演示已往同文件加了 markup 与样式（文件 738 → 784 行） |
```

2. 同文件第 `167` 行（SP-4 行）末尾追加：

```markdown
，实现件见 `docs/design/2026-11-04-sp4-demo-motion.md`（D-12 第 5 条「动画副本整块 aria-hidden」按裁决④改判为「不复制 DOM、状态走 class」；上游六条硬约束逐条对账见该件 §6）
```

3. `<主检出>/docs/design/2026-11-02-dark-redesign.md` 第 `31` 行（D-12 行）末尾追加：

```markdown
；§8 第 5 条的实现方式已于 2026-11-04 由 `docs/design/2026-11-04-sp4-demo-motion.md` 裁决④改判（动机不变、手段更强：不复制 DOM，`aria-hidden` 下移到装饰性中间帧），§8 的六条硬约束在该件 §6 逐条对账
```

4. `<主检出>/docs/design/2026-11-04-sp4-demo-motion.md` 第 `67` 行（**脚本账**）整行替换——本件自审时发现自己写的算术不成立，按实测改口：

```markdown
**脚本账**（2026-11-04 执行期自审，二次更正）：`Hero.astro` 的 `<script>` 正文从 187 行（`:550-738`）减到 **145** 行（`:638-784`），净减 **42** 行。（上一版写的 133 / −55 只测到 T3，T4 接上演示二后又加了 12 行。）分两笔录：T2 一轮正文从 187 行降到 133 行（该轮 diff 删 95 / 增 44，交出去的是四个闸门与接线，换回来的是演示一的 `mountDemo({...})` 挂载）；T4 加回 12 行。原写「瘦到约 20 行」「实测落点约一百七十行」不成立，兑现上游「瘦约两百行」这句预期也不成立——该预估已在 `2026-11-03-five-blocks-design.md:140` 与 `2026-11-02-dark-redesign.md:31` 两侧作废。差额不是遗漏：演示一的 `data-demo` 载荷与 `rowEl`/`showVoice`/`typeInto`/`setCard` 四个内容构造器属这一面的编排，不属运行时职责（本件 §3「每个面只提供自己的 `run`」已把编排划给各面）；且首屏第二段演示已给同一文件加了 markup 与样式，文件级行数从 738 涨到 784。
```

---

## Task 9: 全量验收（机检 + 产物自证 + 三个人工关口）

**Files:** 无（只验不改；发现问题回到对应任务修，修完重跑本任务）。

- [ ] **Step 1：全绿**

```bash
pnpm build && pnpm check
node scripts/check-copy-coverage.mjs --selftest
node scripts/check-anchors.mjs --selftest
```

期望逐字：
`leaves=178 pages=4 missing=0 static=0 static-matched=19 en-cjk=0` / `tokens=63 baseline=0` / `anchors=3 pages=4 shots=6 toggles=2`；两支 selftest 分别 `8/8 passed` 与 `13/13 passed`。（**2026-11-04 终审后补**：`static-matched=19` 与第 8 条夹具来自终审那条「`static=` 可能静默空转」的 Important 项；T7 当时的 7/7 是当批真值。）

- [ ] **Step 2：产物自证（机检看不见的四处）**

```bash
for f in dist/index.html dist/zh/index.html dist/privacy/index.html dist/zh/privacy/index.html; do printf "%s " "$f"; grep -o '<script' "$f" | wc -l; done
find dist -name '*.html' -newer src/lib/demo-driver.ts | wc -l
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');const m=h.match(/data-demo=\"([^\"]*)\"/);const d=JSON.parse(m[1].replace(/&quot;/g,'\x22').replace(/&#39;/g,'\x27').replace(/&amp;/g,'\x26'));console.log('rows',d.rows.length,'incoming',d.incoming.length,'play',!!d.play);const l=h.match(/application\/ld\+json\">([^<]*)/);console.log('ld+json parse:',!!JSON.parse(l[1]));"
grep -o 'data-shot="[^"]*"' dist/zh/index.html | sort | tr '\n' ' '; echo
grep -o 'aria-live' dist/index.html | wc -l
grep -o 'aria-hidden' dist/index.html | wc -l
```

期望：首页两页各 **6**、隐私两页各 **2**；`find` 计数 = **4**（产物比驱动源码新）；`rows 3 incoming 2 play true`（与 `flow.json` 的 `stream.rows` 3 枚、`stream.incoming` 2 枚一致）+ `ld+json parse: true`；六枚 `data-shot` 取值齐且不重名；`aria-live` = **1**（只有 `#streamRows`，spec §5.4 明写新三面不加）；`aria-hidden` = **16**（**2026-11-04 T9 存档期更正**：原写 17 是 SP-2 交付时 grep 整个 `index.html` 得到的——当时 Hero 的裸 `<script>` 里内联着驱动源码，`wave.setAttribute('aria-hidden', …)` 那一行也被数了进去；T2 把驱动抽成模块 chunk 后该行移进 `dist/_astro/Hero.*.js`，HTML 只剩 16 个真实属性。渲染出的属性计数在 `e9dcb59` 与 HEAD 逐文件相同：cursor 1 + tick 3 + snum 4 + svg 3 + mock-chrome 4 + cta-ghost 1。四处动效只增 `data-fade`，不给任何信息性终态挂隐藏）。读数若变大，必须指出来是哪一面把终态藏了，而不是把期望值改成新的数字。
三条注意：① `data-demo` 里的单引号与 ampersand 被 Astro 转成了 `&#39;` / `&amp;`，**三个 replace 缺一不可**（少一个 `JSON.parse` 直接抛，别误读成「载荷坏了」）；② 这段用 `\x22` / `\x27` / `\x26` 写字符，是为了让整条命令能被原样粘进 Bash——改成裸引号会在双引号里截断参数，把 `>` 变成重定向、往仓库里写出一个垃圾文件；③ `ld+json parse` 只验语法（转义实体在 JSON 字符串里合法），不验内容。

- [ ] **Step 3：零新增依赖 / 零运行时 JS 之外的账**

```bash
git diff --stat e9dcb59..HEAD -- package.json pnpm-lock.yaml | wc -l
cat dist/_astro/*.css | grep -o 'font-family' | wc -l
for f in dist/index.html dist/zh/index.html dist/privacy/index.html dist/zh/privacy/index.html; do printf "%s fontFace=" "$f"; grep -o '@font-face' "$f" | wc -l; printf " woff2="; grep -o 'woff2' "$f" | wc -l; done
```

期望：依赖清单差 = **0**；CSS 里 `font-family` = **29**（已实测 SP-2 基线 **25**，SP-4 净加 4 条 `var(--mono)`：T3 的 `.hit` 与 `.cite`、T5 的 `.mock-note`、T6 的 `.mk-cite`——数错即说明某条样式写重或漏了）；四页各自 `@font-face` = **1**、`woff2` = **4**（两个数都已实测取证，SP-4 一页都不许动：不加载新 webfont 这条的落点是「字体声明只住在 `Page.astro:33` 那一枚 `Newsreader` 里」，新增样式一律 `var(--mono)` / 系统栈）。
注意分工：`font-family` 的断言查 CSS（HTML 里那唯一一枚是内联样式，不是字体栈来源），`@font-face` 与 `woff2` 查 HTML（它们由 `Page.astro` 发在 head 的内联 `<style>` 里，实测在 CSS 文件中为零）。

- [ ] **Step 4：三个人工目视关口（脚本判不了，交维护者；本计划不代判）**

在 worktree 起 `pnpm dev`（端口 4321/4322 已被维护者的两枚 `astro preview` 占着，Astro 会自己往后挑端口；**不要关那两枚进程**），三视口 1440 / 768 / 390 各判一次：

1. 首屏右列加了第二段之后的高度，是否压垮与左栏的对齐（`.appwin-body` 由两列变两行，`.demo-qa` 是净增高度）。
2. 04 区两卡首次入屏那一轮并发是否读起来忙（处置见口径差 #6：先确认「演一遍即停」够不够，不够再按 spec §5.4 把两卡串成一条队列）。
3. `pre` 态在慢速滚动下是否出现「半张卡空着」的观感（04 区两卡没有开关可藏，退化只落在 reduced-motion 与 ≤640 两条）。

- [ ] **Step 5：reduced-motion 三视口截图存档（归档动作归 SP-5 终检）**

`prefers-reduced-motion: reduce` 下拍五区 + 首屏两段演示的暂停态。落 `output/`（`.gitignore` 已挡在仓外，截图不入库）。

- [ ] **Step 6：确认未越界**

```bash
git log --oneline e9dcb59..HEAD
git status --porcelain
git stash list
git -C <仓库根> status --porcelain
```

期望：提交数 = 本计划任务数（8 个代码/文档提交）；工作树干净；`stash@{0}`（`sp1-merge-2026-1102 maintainer-WIP`）仍在原位、未被 pop 或 drop；主检出除维护者自己的改动与 T8 Step 3 的三处文档更正之外无新增变化，且**没有任何 push**（`git log origin/main..HEAD --oneline | wc -l` 在分支上应大于 0，但远端未更新——SP-4 全程不 push、不部署）。

**T9 之后的终审修订（2026-11-04，`4493b52..d55b19a`）**：终审提出五条 Important，控制器只采纳其中真正越界的四条，逐条落在代码里——

1. **一面一枚 `root`（spec §3 的字面要求）**：演示一的 `root` 原取 `.appwin`，于是它暂停/落定时 `rt.all()` 会顺带把**演示二**的 `[data-fade]` 揭开（跨面耦合，正是裁决①要杜绝的）。现在 `data-demo` 与 `root` 同取 `.demo-flow`，演示二各管各的。
2. **暂停 = 落回终态**：`#streamToggle` 暂停原先只作废定时器、揭 `[data-fade]`——而演示一根本没有 `data-fade`，于是「听写中」行与半截文字会永久留在屏上。暂停分支改为直接走 `settle()`（作废令牌、撤 pre 态、`reset`、揭全部）。顺带把 `begin()` 的首句改成 `if (narrow.matches || paused) return settle()`：暂停中跨过 640px 的重排不再把 pre 态装回去。
3. **终态要逐字还原**：`renderFrame()` 补 `typebar.textContent = demo.prefix + demo.idle`（`idle` 随 `data-demo` 下达，不新增叶子）——否则暂停停在一条没有字的语音条上，SSR 那行空闲句被吞掉。
4. **两枚开关分开可访问**：`#streamToggle` / `#qaToggle` 各加 `aria-controls`（指向 `#streamRows` / 新增的 `#qaHits`），不改文案、不新增叶子。
5. **`static=` 不许空转**：coverage 摘要加 `static-matched=` 并在命中 0 时判红，夹具 7 → 8。

未采纳的第 5 条（`DemoRuntime` 接口与 spec §3 草图有出入）以**文档更正**结案：spec §3 已加日期注，如实记下实际交付的 API 与未交付成员。终审的 Minor 项全部 `parked`（见附录 B 与 SDD 台账）。

---

## 附录 A：Fallback A（驱动两份内联的合并方案，默认不启用）

启用条件：维护者明确判定「同一模块被内联两次」不可接受（T5 Step 6 探针读数 2）。

- 把 `Hero.astro` 与 `Proofs.astro` 的两段 `<script>` **原样**并入 `src/components/Home.astro` 的一枚 `<script>`，`import { mountDemo } from '../lib/demo-driver'` 只留一条。
- 断言随之改口：首页 `<script` = **5**（不是 6）、`demo-running` 的 JS 字面量 = **1**；spec §3「脚本账」与 §8「首页 6」两句按此更正。
- 风险如实记着：`Proofs.astro` 的挂载代码离开组件文件后，scoped 样式的 `[data-astro-cid]` 仍由 Proofs 模板自己带，选择器不受影响；但「一面一个容器」的源码 locality 会变差（首屏与产物区的编排同处一件）。

## 附录 B：已知缺口（登记，不修）

- `flow.stream.incoming` 落在元素文本规则之外（T7 前缀名单里没有它）：它是循环增量，无 JS 时本就不在产物里，首帧终态由 `rows` 完整承担。**解锁条件**：若要删 `data-demo`（它是序列化进产物的第二份文案），须先把 `incoming` 落进 DOM 再纳入规则。
- `check-anchors.mjs` 的两处既有盲区沿用：`id=` 判定会被同名片段误满足；`htmlFiles` 只收 `index.html` 系产物。
- `leaves` 的分组名从 `stream.*` 变成 `flow.stream.*` 是预期（`loadCopy` 按文件名分组，无 manifest 可改）。
- 首屏 EN 卡片在 ≥1400px 的裁切与 420px 横向溢出：SP-2 既有挂账，本计划不碰。
- 四件待表态项（`meta.json:15-16` 的 `jsonldDesc` 仍写「作品创作」/"piece creation"、`Privacy.astro:20` 的 Waitlist 行 + `priv.5b/5s`、「没有公布日期」的第三次出现、03 区时间轴左缘线是否用 `--accent-fill` 复活）继续挂账，本计划不动它们。
- 推送闸门未解除：先落 `docs/design/` 三份（11-02 的 staged rename、11-03 与 11-04 两份未跟踪且不被忽略），SP-5 的脱敏面须含 `.superpowers/plans/2026-11-03-sp2-five-blocks.md` 与本计划文件。
