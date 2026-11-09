# SP-4 演示动效定稿方案

**目标**：把「演示」这件事在站内做实——首屏两段、04 区两处，四处共用一枚驱动、一份动画素材件，且关掉 JS 与关掉动画的读者都拿得到同一份信息。

**架构**：动画不复制 DOM，而是**同一份 DOM、状态走 class**；驱动模块独占四个闸门（手动暂停 / `prefers-reduced-motion` / 窄屏 / 离屏）与定时器令牌失效；所有参与动画的文字集中到新建的 `src/content/copy/flow.json`，静态标题与正文留在原文件。

**技术栈**：Astro 组件 + 一枚 TypeScript 驱动模块（构建期打包成共享 chunk）+ 现有三支校验脚本的两处扩展。

**权威链**：本文是 SP-4 的方案件。上游两份——`docs/design/2026-11-02-dark-redesign.md`（D-12 与 §8 三段流水线契约、§5.5 字阶地板）与 `docs/design/2026-11-03-five-blocks-design.md`（NB-5、NB-8、§4.1、§4.4、§6、§7、§8 的 SP-4 行）——是前提；本文对 D-12 第 5 条给出**实现方式改判**，对 §8 的六条硬约束逐条对账（见 §6），其余不与上游抵触。

---

## 1. 四条裁决（2026-11-04 维护者批准）

| # | 裁决 | 落点 | 代价（如实记着） |
|---|---|---|---|
| ① | **共享一个驱动，收成一枚**：不新建 `src/components/demo/` 三件，改为单文件 `src/lib/demo-driver.ts`，被 `Hero.astro` 与 `Proofs.astro` 的组件脚本各自 import | §3 | 上游 §8 的组件表（`FlowVoice / FlowFile / FlowRecall`）作废；「每面一个组件文件」这条形态在站内不再存在 |
| ② | **会动的全进 `flow.json`**：判定规则是「一段文字只要参与动画就住在 `flow.json`」，因此 `stream.json` 整件迁入、04 区两张动卡的 mock 文字迁入，不动的卡与卡标题留在原文件 | §4 | `stream.json` 这个文件名消失（唯一消费者是 `Hero.astro:10`，迁移是重排不是重写）；`flow.json` 与 `proof.json` 必须各写一行注释互指，否则读者看不出 `m1*` 为什么不在卡件里 |
| ③ | **两套素材，只共用驱动**：首屏演「问句 → 命中两条记录 → 角标落回回答」，04 区创作卡演「卡住的句子 → 命中两条记录 → 角标落进正文」，两批记录不重名、时长与构图不同 | §5 | 两面同属「问答/召回」这一能力，正好压在 §6:144 允许的 **2 次**上限上，**第三次即违规**；后续任何区要再演召回都得先撤这两处之一 |
| ④ | **状态是 CSS class，不是复制的 DOM**：无 JS 时 DOM 直接是终态，`.js` 前缀给容器加 `pre` 态，驱动只做 class 增删；`aria-hidden` 只留给装饰性中间帧 | §5.4 | 这是对 D-12 第 5 条（「动画副本整块 `aria-hidden` 且 DOM 内留等价静态描述」）的实现方式改判。动机不变、手段更强：副本方案的两份文字会漂，同一 DOM 不可能漂 |

## 2. 前提核实（先于落笔，逐条实测）

| 前提 | 结论 | 证据 |
|---|---|---|
| NB-5 是否禁止新增运行时 JS | ❌ **不禁止**：NB-5 字面只禁「为导航新增 JS」，并强制保留 `.reveal` 的 IntersectionObserver | `docs/design/2026-11-03-five-blocks-design.md:25` |
| 首屏演示一的静态等价物是否已成立 | ✅ 已成立：SSR 直接把 `rows` 映射进 `#streamRows`，循环只做增量 | `Hero.astro:56-64`、`:159` 注释「首帧即终态，不靠 JS 才成型」 |
| 无 JS 前缀法在哪 | ✅ `Page.astro:77` 的 `is:inline` 给 `<html>` 加 `.js`；现有动画样式已按 `.js .appwin .srow.living` 写法挂它 | `Page.astro:77`、`Hero.astro:510-518` |
| 四个闸门是否已有可提取的实现 | ✅ 全部现成：`paused`/`reduced`/`narrow`/`token` 在 `:587-591`，暂停键接线在 `:707-712`，窄屏 `change` 重挂在 `:713`，离屏 IO 在 `:715-735` | 同右 |
| 两处 `.appwin-ctl` 隐藏规则是否会挡住新暂停键 | ✅ 会：reduced-motion 与 ≤640 各一条，新演示复用同一个类名即**零改写** | `Hero.astro:520-524`、`:541-543` |
| `.appwin-body` 能否容纳第二段 | ✅ 能：现为单行两列 `1.22fr 0.78fr`，第二段用 `grid-column: 1 / -1` + `border-top: 1px solid var(--hair-1)`，≤640 已有 `grid-template-columns: 1fr` 不用动 | `Hero.astro:222-226`、`:532-540` |
| `data-shot` 现状枚数与取值 | ✅ 4 枚且与 §4.4 期望的前四枚同名：`info-cards`(:17) `todo`(:30) `report`(:43) `creation`(:57)；隐私页 0 枚。SP-4 只增 `hero-flow / hero-qa`，属新增不是改名 | `Proofs.astro` 实测、`dist/index.html` 计数 |
| D-12 第 4 条「不写死颜色」与 `color: var(--accent)` 当文字色 | ✅ **SP-1 已闭合**：`src/` 全仓 `color: var(--accent)` 零命中，字面色基线为 0。本文不重做，只要求新样式沿用 | `check-tokens.mjs` 绿、`tokens=63 baseline=0` |
| D-12 第 6 条「微标签 11px、mono 13px 地板」 | ⚠️ **一半已闭合、一半待用**：全仓已无 <11px 字号；但 `--fs-mono: 13px` **零消费者**（`tokens.css:89`）。SP-4 让 mono 正文用上它，顺带把这枚令牌从「零消费者待撤销」名单上摘掉 | `grep -rn "fs-mono" src` 只命中定义行 |
| 问答卡被删的 5 枚叶子是哪 5 枚 | ✅ 实测为 `m4q / m4a / m4b / 4t / 4b`，`flow.qa` 按 1:1 重建（见 §4） | `git show 8ba0487 -- src/content/copy/proof.json` |
| 每页脚本标签基数 | ✅ 首页两页各 5 枚、隐私两页各 2 枚。SP-4 后首页 **5 → 6**（新增 `Proofs.astro` 那一枚组件脚本；驱动模块是共享 chunk，不占标签数），隐私页不变 | `grep -o '<script' \| wc -l` 实测 |
| 新动效会不会踩对比度红线 | ✅ 不踩：`--text-2` 压 `--surface-1` 实测 **8.10**（压 `--surface-2` 7.65）、`--text-3` 压 `--surface-1` 实测 **4.86**、`--accent-400` 5.36、`--accent-300` 7.51，均过 AA；`--text-3` 压 `--surface-3` 仍只有 4.19，**限 ≥24px 或 19px bold**（`tokens.css:22-24` 既有约束）。收束带仍只许压 `--text-1`（**2026-11-06 作废**：收束带与 `--band` 令牌整件退役，本行该格随之不存在，见 `2026-11-03-five-blocks-design.md` NB-7 同日裁决） | 按 `--surface-1:#12151c` / `--surface-2:#171b23` / `--surface-3:#1e232c` / `--text-2:#a6adba` / `--text-3:#7b8496` 现算 |

## 3. 驱动契约

新建 `src/lib/demo-driver.ts`，单一导出：

```ts
export interface DemoMount {
  root: HTMLElement;                 // 承载动画的容器
  payloadKey?: string;               // 需要序列化文本时读 root.dataset[payloadKey]（仅演示一）
  toggle?: HTMLButtonElement;        // 缺省则该面无手动开关
  stepMs?: number;                   // 单帧停留，缺省 3000
  dwellMs?: number;                  // 一轮收尾回帧间隔，缺省 1400
  run: (rt: DemoRuntime) => void;    // 一轮编排：只做 class 增删与 setTimeout 排布
}
export interface DemoRuntime {
  alive(token: number): boolean;     // 令牌未过期 && !paused && !reduced && !narrow
  frame(token: number, ms: number, fn: () => void): void; // 受令牌与四闸门管的 setTimeout
  payload<T>(): T;                   // payloadKey 的解析结果
  reduced: boolean; narrow: boolean;
}
export function mountDemo(m: DemoMount): void;
```

**2026-11-04 实现回笔**：实际落地的运行时面是 `stepMs / dwellMs / at / fades / show / hide / all / none / loop`，`DemoMount` 为 `root / watch / toggle / labels / stepMs / dwellMs / reset / run`；上面草图里的 `payloadKey` / `payload()` / `alive()` / `frame()` / `reduced` / `narrow` 没有落地——每个面的 `run` 已经拿到它需要的一切，载荷由面自己解析，而四道闸门仍整条住在模块里。

模块独占：`paused` / `reduced` / `narrow` / 离屏 IO / `token++` 失效，以及暂停按钮的 `aria-pressed` 与文案切换（`play`/`pause` 两枚叶子的现有用法，`Hero.astro:707-712`）。每个面只提供自己的 `run`。挂载时模块同步给 `root` 加 `demo-running`（`pre` 态唯一的激活条件，见 §5.4）。

**`root` 的取法**：一个面一个 `root`。首屏两个面各取自己那一段 `<section class="demo-*">`，`data-demo` 载荷随第二段一起从 `.appwin`（现 `:44`）**下移到演示一那段**——只挪属性位置，首帧终态、三条记录 + 一张已展开卡片、徽章与内容同源这三点形态不动（上游 §4.1:70 要求「现有形态保留」）。04 区两面各取该卡的 `.mock`。

**接线四处**：`Hero.astro` 的两个面（演示一保留 `data-demo`，演示二只传 `run`）、`Proofs.astro` 的两张卡（各一面，`toggle` 不传）。`#streamToggle` 保留，新增 `#qaToggle`。

**脚本账**（2026-11-04 执行期自审，二次更正）：`Hero.astro` 的 `<script>` 正文从 187 行（`:550-738`）减到 **145** 行（`:638-784`），净减 **42** 行。（上一版写的 133 / −55 只测到 T3，T4 接上演示二后又加了 12 行。）分两笔录：T2 一轮正文从 187 行降到 133 行（该轮 diff 删 95 / 增 44，交出去的是四个闸门与接线，换回来的是演示一的 `mountDemo({...})` 挂载）；T4 加回 12 行。原写「瘦到约 20 行」「实测落点约一百七十行」不成立，兑现上游「瘦约两百行」这句预期也不成立——该预估已在 `2026-11-03-five-blocks-design.md:140` 与 `2026-11-02-dark-redesign.md:31` 两侧作废。差额不是遗漏：演示一的 `data-demo` 载荷与 `rowEl`/`showVoice`/`typeInto`/`setCard` 四个内容构造器属这一面的编排，不属运行时职责（本件 §3「每个面只提供自己的 `run`」已把编排划给各面）；且首屏第二段演示已给同一文件加了 markup 与样式，文件级行数从 738 涨到 784。

**依赖**：`src/lib/` 现有件不动，不引第三方包，`package.json` 的依赖清单零变化。

## 4. `flow.json` 的边界与迁移清单

规则：**参与动画的文字住 `flow.json`；不参与动画的标题与正文留在原文件。**

| 子树 | 内容 | 来源 | 净新增叶子 |
|---|---|---|---|
| `flow.stream` | `prefix / idle / date / rows[] / incoming[]` 整件 | `stream.json` 全件退役（`:10` 唯一消费者） | 0 |
| `flow.file` | 信息卡三行的 `m1t / m1a / m1b / m1c / m1d / m1e` 迁入 + 双链标记 + 「进当日流」落点行 | `proof.json` | **+2** |
| `flow.recall` | 创作卡的 `m5h / m5p / m5a / m5b` 迁入 + 第二条命中记录 + 行间角标短语 | `proof.json` | **+2** |
| `flow.qa` | 问句 / 命中记录一 / 命中记录二 / 角标短语 / 回答句（与删掉的 `m4q / m4a / m4b / 4t / 4b` 一一对应） | 新建 | **+5** |

留在原处：`proof.json` 的 `m2*`（待办卡不动）、`m3*`（周报卡不动）、`1t/1b…5t/5b`（卡标题与正文不参与动画）、`hero.json` 全部（窗口标题、胶囊、按钮）。`flow.json` 与 `proof.json` 各加一行注释互指。

**叶子账**：迁移不改变总数（同一批 `{zh,en}` 对换文件），净增 9 枚中英成对 ⇒ `check-copy-coverage` 的 `leaves=169 → 178`，`pages=4 missing=0 en-cjk=0` 不变。计划执行期以实跑为准；`check-copy-coverage` 按文件名分组，所以 `stream` 组名在报表里消失属预期。

**`tokens=63` 不变**：新样式只用现有令牌；若确需新增一枚，须同批出现消费者并进基线，不允许先立后用。

## 5. 四处动效的形态

### 5.1 首屏：一个窗、两行、一条发丝线

`.appwin-body` 增加第二段，`grid-column: 1 / -1`、`border-top: 1px solid var(--hair-1)`——这是上游 §4.1:71「`--hair-1` 分隔两段」的字面落点。**不新建第二个窗壳**：窗壳自带三色点与标题栏，两窗叠放会让右列高度失控，且段间会读成空隙而不是分隔线。

内容序列：问句行 → 两条命中记录（chip，mono 走 `--fs-mono`）→ 回答行尾落一个引用角标。`data-shot="hero-flow"` 挂第一段、`data-shot="hero-qa"` 挂第二段。

### 5.2 04 区信息卡：裸文本 → 带标签与双链、进当日流

终态就是现有 markup（`Proofs.astro:17-22` 的三行徽章 + 文本）。「进当日流」那行是终态里新增的一行。`.js` 下容器进 `pre` 态：徽章、双链与新行只走 `opacity: 0`，**不撤布局**——它们始终占位，动画不引起重排，读者也不会看见卡片在播放中变高。驱动只做 `pre` ⇌ 终态的 class 切换。中间帧不新增文字，因此 `flow.file` 的两枚新叶都是终态的一部分。

### 5.3 04 区创作卡：卡住的句子 → 命中两条记录 → 角标落进正文

终态 = 正文段落末尾带角标的成稿（在现有 `doc-h / doc-p / mrow` 之上加一行成稿段）。`pre` 态显示未完成的句子与光标（光标 `aria-hidden`），命中记录与角标不可见。

### 5.4 共用约束（四处一致）

- **退化矩阵**：`prefers-reduced-motion: reduce` 与 `max-width: 640px` → 直接终态；`.appwin-ctl { display: none }` 复用现有两条规则（`:520-524`、`:541-543`）覆盖首屏两个开关。04 区两卡没有开关可藏，退化落在另一头：这两个条件下 **`pre` 态整条不施加**，容器首帧即终态。
- **`pre` 态的选择器形状**：统一写成 `.js .appwin.demo-running .qa-pre, .js .proof-card.demo-running .mock-pre { … }`——`demo-running` 由驱动在首帧挂载时同步加上，**只在运行时存在**，静态产物里搜不到。这条纪律是为了让「无 JS 显示终态」可被产物 grep 证明；写成裸 `.js .qa-section { opacity: 0 }` 会在 JS 关闭时永久隐藏终态（`.js` 只说明脚本已解析，不说明动画是否运行、是否已跑完）。
- **样式归属**：`Hero.astro` 的样式块是 `is:global`（因为 JS 造的节点拿不到 scoped 标记，`:104-108` 注释记录了这条理由），首屏新增第二段的选择器一律挂在 `.hero / .appwin` 下不外溢；`Proofs.astro` 保持 scoped，两卡只加 `pre` 态与终态行。**跨组件不借样式**——驱动是唯一的共享件，样式两处各自持有，改一张卡不会碰到首屏。
- **暂停开关归属**：只有首屏两段各一枚（NB-8 的字面要求）。**04 区两卡不设暂停键**——2×2 卡面各塞一枚按钮是噪声，且 NB-8 的开关要求只覆盖「首屏两段演示」。
- **aria 策略**：信息性终态**不**隐藏（它本来就在 DOM 里，只是视觉状态不同）；只有装饰性中间帧（语音条、波形、光标、`mock-chrome`）挂 `aria-hidden="true"`。`aria-live` 只保留现有 `#streamRows` 一处（`:55`），新三面不加——终态首帧即存在，播报只会变成噪声。
- **并发**：04 区两卡各自受离屏 IO 管辖，`stepMs`/`dwellMs` 取长停留（缺省 3000/1400），两卡同时处于「变化中」的概率低。若三视口目视判为忙，处置是**把两卡串成一条队列**（同批只有一个面在动），不是缩时长。

## 6. 对上游六条硬约束的对账

上游 §8 那六条逐条判：

| 约束 | 处置 |
|---|---|
| 内容全走新建 `flow.json`，叶子数须等于实际渲染数 | ✅ 由 §4 的边界规则 + §7 的元素文本守卫共同钉住，不需要人工数 |
| 无 JS 显示终态（`.js` 前缀法） | ✅ 四处全部按「DOM 即终态、`.js` 加 `pre`」实现 |
| reduced-motion 直接终态 | ✅ 四处共用一条规则 |
| 不写死颜色 | ✅ SP-1 已闭合；本文只要求新样式沿用 `var(--*)`，基线保持 0 |
| 动画副本整块 `aria-hidden` 且 DOM 内留等价静态描述 | ⚠️ **实现方式改判（裁决④）**：不复制 DOM，因此没有副本可隐藏；`aria-hidden` 下移到装饰性中间帧。动机（关 JS / 关动画的读者拿得到同样信息）被更强地满足 |
| 微标签 11px、mono 13px 地板 | ✅ 微标签走 `--fs-micro`，mono 正文走 `--fs-mono`（首次有消费者） |

段间 `--hair-1` 一句：首屏两段落点明确（§5.1）。04 区两处动效分属两张卡，**由卡自身的 `--hair-1` 描边承担**，不另起一条发丝线。

## 7. 守卫扩展（不新增脚本，`pnpm check` 仍是三道闸）

1. **`check-copy-coverage.mjs` 加 flow 元素文本规则**：对 `flow.json` 的 `qa / file / recall` 三个子树，每枚叶子必须在对应语言页的**元素文本**里出现——先把标签（含开始、结束与自闭合）整体剥掉（`html.replace(/<\/?[a-zA-Z][^>]*>/g, ' ')`）再比，而不是像今天这样 HTML 任意位置命中即算落地。这同时钉住两件事：「静态等价物真的存在」和「叶子数＝渲染数」。**规则只作用于这三个子树**，比较时沿用脚本现有的 `esc()` 归一（`'` → `&#39;` 在元素文本里是字面量）。
2. **`check-anchors.mjs` 加两处清单断言**：`data-shot` 取值集合恰好等于 `{hero-flow, hero-qa, info-cards, todo, report, creation}`（首页两页各一枚不多，隐私页 0 枚）；`#streamToggle` 与 `#qaToggle` 各命中一次。输出加 `shots=6 toggles=2`，`anchors=3 pages=4` **不变**（SP-4 不新增任何锚点）。

**已知缺口，如实登记**：`flow.stream.incoming` 是循环增量，无 JS 时本来就不出现在产物里（上游 §4.1:70 明写演示一「现有形态保留」，首帧终态已由 `rows` 完整承担），因此**排除在元素文本规则之外**。这意味着「动画素材必须在无 JS 时可见」这条纪律对首屏演示一不设防。解锁条件：若日后要删 `data-demo`（它是序列化进产物的第二份文案），须先把 `incoming` 落进 DOM 再纳入规则。另两处既有盲区沿用记录：`check-anchors.mjs` 的 `id=` 判定会被同名片段误满足、只收 `index.html` 系产物。

## 8. 验收

**机检**：`pnpm build && pnpm check` 全绿——`leaves=178 pages=4 missing=0 en-cjk=0`、`tokens=63 baseline=0`、`anchors=3 pages=4 shots=6 toggles=2`；`check-copy-coverage --selftest` 与 `check-anchors --selftest` 各自全 `passed`（新增用例须含一条「叶子只在属性里出现 → 判红」的负例，否则元素文本规则等于没测）。

（**2026-11-06 现值**：`leaves` 随后续多次裁决变动（下列按时间序，括注为叶子增减）——五区 eyebrow 移除 −5 ⇒ 173，05 区表单挂回 +11（`cta.json` 6 枚 + `form.json` 5 枚）⇒ 184，04 区收束带退役 −1（`proof.band`）⇒ 183，首屏三行并两行 −2（`hero.situation` + `hero.guard`，护栏口径并入 `hero.sub` 那一句）⇒ 181，首屏次行动件删除 −1（`hero.cta2`）⇒ 180，03 区副句删除 −1（`work.sub`）⇒ 179，03 区路线图尾部两句删除 −2（`road.pro` + `road.note`）⇒ 177，04 区标题居中零变动，05 区两句删除 −2（`form.closed` + `cta.privacy`）⇒ **175**，03 区路线图文案换成价值轴（`road.title` + 九枚 `vNsub`/`vNt`/`vNb` 只改文本、键数不变）⇒ **175 不变**，03 区阶段段改三枚等宽卡 −1（`road.title` 随二级小标题 `.phase-h` 整件删除；问答 Q2「Pro 从 V2 起」改口为「Pro 从下一阶段起」只改 `2a` 的值不改键，徽标三枚本就是硬编码字符串不是叶子）⇒ **174**；`tokens` 随 `--band` 退役 **63 → 62**、随 `--ok-weak` 退役 **62 → 61**（那颗呼吸点的 `@keyframes pulse` 是它唯一消费者，同批撤）；`anchors` 随 `#how` 失去唯一入链 **3 → 2**（`id="how"` 与 `ALLOWED` 白名单都留着，读数只统计在用的 href），`shots=6 toggles=2` 不变，三个 `--selftest` 仍 8/8、13/13、11/11 全 `passed`。本行的 178 是 SP-4 交付当批的快照，不是现状。表单恢复不碰本节「首屏表单数钉 0」：那枚表单只渲染在 05 区，首屏的 `#next` 按钮仍是跳转件。首屏改动同样不碰本节动效前提：`.lead` 与两段演示都是静态 SSR 文本，`static=0 static-matched=19` 读数不变；被删的处境句从来不在动画增量里。03 区那三次也不碰：第一次删的是该区 `<p class="lead">` 那一段 SSR 静态文案，第二次删的是路线图尾部 `<p class="phase-pro">` 与 `.road-note` 两件，第三次只改 `road.json` 的文本（阶段段是纯 SSR 静态卡，站内零动效，实测区内 `animationName !== none` 元素数 = 0），三批里都没有叶子落在任何 `data-demo` 载荷字段里，动效增量与 `static-matched` 读数不变。那颗 `.pulse` 是本区唯一的装饰动效（非 `data-demo` 驱动、无暂停开关、无静态等价物要求），它随件消失后 03 区动效元素数为 **0**，本节「两份演示各带暂停开关」的前提不受影响。）

（**2026-11-06 更正上面「产物自证 ①」的 6**：05 区表单挂回后实测首页两页 `<script>` = **7**、隐私两页 = **2**，此后未变——页脚撤掉 `LangSwitch` 那处没让数减（Astro 按组件去重），05 区撤掉 `form.closed` 也没动它（那枚叶子只出现在 `data-msg` 的 JSON 里，不是脚本）。6 是 SP-4 交付当批的快照。05 区这两句同样不触动效前提：`form.closed` 与 `cta.privacy` 都不在任何 `data-demo` 载荷字段里，`static=0 static-matched=19` 不变。）

**产物自证（机检看不见的三处）**：① 首页两页 `<script>` 标签数 = **6**、隐私两页 = **2**；② `dist/**/*.html` 新鲜度晚于末次源码改动；③ `data-demo` 载荷仍可 parse 且 `incoming`/`rows` 枚数与 `flow.json` 一致。

**时态与去重红线（§7 四条 + §6:144）**：`flow.qa` 与 `flow.recall` 是全站内「问答/召回」的**仅两次**落点，措辞不得互为改写、命中的记录集不得重名（裁决③）；创作卡那句不得写成「带引用来源的完整作品」这类下一阶段承诺——动效演引用，正文不承诺成稿形态；周报卡不参与动画，本方案不新增现在时风险。首屏表单数仍钉 **0**，演示数钉 **2** 且两份都带暂停开关与静态等价物。

**目视关口**：`prefers-reduced-motion: reduce` 下三视口（1440 / 768 / 390）各拍「五区 + 首屏两段演示的暂停态」，存档归 SP-5 终检。三处必须人判、脚本判不了的：首屏右列加了第二段之后的高度是否压垮与左栏的对齐、04 区两卡并发是否读起来忙（处置见 §5.4）、`pre` 态在慢速滚动下是否出现「半张卡空着」的观感。**2026-11-04 维护者裁决后首屏已改上下单列**（见 `2026-11-03-five-blocks-design.md` §4.1 同日更正），第一项改看「文字区与演示窗的单列节奏」，「右列加高」不再成立。

**文案落点**：§4 的 9 枚新叶（中英各 9）的具体句子属文案轮，与处境句同规格——本方案只定它的位置、语义与红线，句子可由维护者直接改写而不影响任何机检。

## 9. 落点文件清单

| 文件 | 动作 |
|---|---|
| `src/lib/demo-driver.ts` | 新建（唯一新模块） |
| `src/content/copy/flow.json` | 新建（`stream / file / recall / qa` 四子树） |
| `src/content/copy/stream.json` | 删除（内容整体迁入 `flow.stream`） |
| `src/components/blocks/Hero.astro` | markup 加第二段；样式加 `.js` 的 `pre` 态；`<script>` 换成挂载调用 |
| `src/components/blocks/Proofs.astro` | 两卡加 `pre` 态样式与终态行；新增组件脚本挂载两处；`data-shot` 语义不变 |
| `src/content/copy/proof.json` | 移出 `m1*` 与 `m5*`，加一行与 `flow.json` 互指的注释 |
| `scripts/check-copy-coverage.mjs` | 加 flow 元素文本规则 + 负例 selftest |
| `scripts/check-anchors.mjs` | 加 `shots=6` 与 `toggles=2` 两条清单断言 |
| `docs/design/2026-11-03-five-blocks-design.md` | §8 的 SP-4 行与 §4.4 的 `data-shot` 行加执行期更正（三段流水线改判、D-12 第 5 条改实现方式） |

**范围外**：下载机关与 `downloadUrl`（SP-3，仍被发包阻塞）、零消费者令牌撤销与脱敏复核（SP-5）、首屏 EN 卡片在 ≥1400px 的裁切与 420px 横向溢出（既有挂账，不属本方案）。四件待表态项（`jsonldDesc` 的「作品创作」、隐私页描述已消失的表单那行、「没有公布日期」的第三次出现、03 区时间轴左缘线）继续挂账，本方案不动它们。
