# Wrisp 官网暗色重设计 · 设计文档

- 日期：2026-11-02
- 参考站：https://www.deepseek.com/harness/ （证据取自实测 computed style 与页面 241 条 CSS 自定义属性）
- 状态：六节设计已逐节裁决通过，待按路线 A 实施
- 范围：`wrisp-site` 全站视觉体系与首页叙事骨架；不含应用本体（闭源，单独分发）

## 1. 目标与边界

把参考站的设计语言吸收成 Wrisp 自己的暗色版本。参考站的本质是：**暗底 + 极大纵向留白 + 胶囊控制件 + 面差分层 + 可重绘的产品演示**。

三条既有裁决在重设计中保持不破：不加载新 webfont、双语叶子成对、组件内不写死颜色（这次把最后一条从注释升级成 CI）。

参考站的「全 400 字重」与「负字距压中文标题」两件机关经核实不可照搬，见 §13。

## 2. 已裁决清单

| # | 裁决 | 内容 |
|---|---|---|
| D-1 | 主题形态 | 纯暗色，暗底是唯一形态；亮色纸面体系整体作废 |
| D-2 | 迁移路线 | 路线 A「先拆后装」：SP-1 令牌 → SP-2 拆区 → SP-3 首屏 → SP-4 演示 → SP-5 收口 |
| D-3 | 区块骨架 | 12 区收到 8 区，映射见 §6 |
| D-4 | 首要行动 | 下载（V-3：维护者发出内测包），首屏主行动从 `#waitlist` 锚点换成下载胶囊 |
| D-5 | 主按钮配色 | 填品牌蓝 `--accent-fill`，白字（实测 5.38:1 过 AA）；不照抄参考站的白底幽灵胶囊 |
| D-6 | 地址来源 | 写死 `releases/latest/download/<固定名>`，不走构建期变量、不构建时拉 API |
| D-7 | 资产命名契约 | 文件名不含版本号：`Wrisp-macos.dmg` / `Wrisp-windows.exe`；版本只进 release 标题 |
| D-8 | 平台集 | 首屏只列 macOS / Windows；JSON-LD `operatingSystem` 同步收成两平台并补 `downloadUrl` |
| D-9 | 字体 | 不加 webfont，Newsreader 700 子集与系统栈保持；只借字号阶梯与字距做法，负字距仅拉丁侧生效 |
| D-10 | 标题尺度 | 收小：h1 max 44、h2 max 30（原 62 / 58） |
| D-11 | 窄口留白 | 区块纵向 `clamp(88px, 12vw, 160px)`，窄口收到 88 |
| D-12 | 演示形态 | 一条三段流水线（§8），不做三个并列面板，不在参考站意义上重绘 App 壳 |
| D-13 | 等待名单 | 表单彻底移除，`edge/` 收集端一并删除（D-14） |
| D-14 | 收集端 | **仅** `edge/waitlist/`（worker.js + wrangler.toml + smoke.mjs）、`edge/README.md` 中收集端段落、`.env.example` 的端点变量删除。`edge/router/` 是独立的语言跳转层，27 条冒烟自成一套且 `priv.json` 的 `wrisp_lang` cookie 声明依赖它，**保留** |
| D-15 | 孤儿叶子 | 删冗余，不留备用（保留等于永久放宽 `check-copy-coverage`） |

## 3. 前提核实与外部依赖

本方案设计时核实过的代码前提（证据为 `路径:行号`）：

| 前提 | 结论 | 证据 |
|---|---|---|
| 存在可下载构建产物 | ❌ 当前零 | `GET /repos/liqms/wrisp-releases/releases` → `[]`；`/tags` → `[]`；repo size 36KB；`resources/` 只有 `manifest.json` 与 model-meta/page/schemas/skills/slash 元数据目录 |
| `manifest.json` 定义安装包命名 | ❌ 不含 | 该文件 `version 1.0.0`，条目 type 全为内容类（model-meta / page），无二进制资产 |
| 文案支持「有下载」 | ❌ 反向 | `src/content/copy/road.json:51`「现在还在内测迭代，所以这一页没有下载按钮——先留个邮箱」；`faq.json:56`「haven't published a date」 |
| 页脚 releases 链接有去处 | ⚠️ 指向空仓 | `src/components/blocks/SiteFooter.astro:14,23` 指向 `liqms/wrisp-releases`，release 列表当前为空 |
| 等待名单通道已接通 | ❌ 未部署 | `src/components/WaitlistForm.astro:30-31` 由 `PUBLIC_WAITLIST_ENDPOINT` 决定；`.env.example` 该值为空 |
| h1/h2 有 400 字重可用 | ❌ 只有 700 | 仓库仅 `public/assets/newsreader-700-latin.woff2`（23,796 B），`src/layouts/Page.astro:33` 的 `@font-face` 只声明 `font-weight:700` |
| 滚动揭示已存在 | ✅ | `src/styles/global.css:418-426` `.js .reveal`（`translateY(18px)`）+ `:468-473` reduced-motion 兜底；驱动在 `src/components/Home.astro:59-74` |
| 中文标题已有零字距裁决 | ✅ 保持 | `src/styles/global.css:60-73` `:lang(zh) h1,h2,h3 { letter-spacing: 0 }`，附理由注释 |
| CI 的 webfont 守卫与已发布字面子集相容 | ❌ **相冲** | `.github/workflows/deploy.yml` 的 Sanity checks 含 `grep -rn '@font-face' dist --include='*.css' --include='*.html'` → `exit 1`；而 `dist/index.html`、`dist/zh/index.html`、两个 privacy 页都内联了 `Page.astro:33` 发出的 Newsreader 700 `@font-face`。守卫由 0182733 引入，字面子集由 888490a 在其之后同日引入，两者从未在同一次 CI 运行里相遇 |
| 该冲突是否已暴露 | ❌ 未暴露 | `origin/main` 停在 fde4ac3（2026-10-23），本地 main 领先 15 个提交；唯一一次 Workflow 运行是 2026-10-22 的 success。**下一次推送会在 Sanity checks 直接变红** |

**外部依赖（阻塞 SP-3 上线，不由本仓完成）**：维护者向 `wrisp-releases` 发出第一个 release，且资产名严格等于 D-7 的三个固定名。`releases/latest` 在没有任何 release 时同样 404，因此 **SP-3 不得在包发出前合入 `main`**——这是顺序约束，不设「未发布」视觉态。

## 4. 子项目切分与顺序

| 子项目 | 范围 | 依赖 | 产出 |
|---|---|---|---|
| SP-1 | 令牌与基元层：`tokens.css` 重写、`global.css` 基元、字面色清零、两条新机检 | — | 暗色地基（此时区块仍是旧骨架） |
| SP-2 | 叙事重排 12→8：`Home.astro` 装配、`SiteNav.chapters`、eyebrow 编号、撤表单与 `edge/waitlist/`、删孤儿叶子 | SP-1 | 8 区亮色骨架 |
| SP-3 | 首屏与下载机关：`src/lib/downloads.ts`、平台探测、分裂胶囊、JSON-LD、文案撤回注 | SP-1, SP-2, 外部发包 | 新首屏 |
| SP-4 | 三段流水线演示组件契约 | SP-1, SP-2 | `src/components/demo/` 三件 |
| SP-5 | 周边一致性：og 卡重导、页脚链接、序号三处同步终检、sitemap/robots | SP-1..4 | 收口 |

## 5. SP-1 令牌与基元契约

### 5.1 底色与面

| 令牌 | 值 | 相对亮度 | 用途 |
|---|---|---|---|
| `--bg` | `#0b0d12` | .0040 | 页面底 |
| `--surface-1` | `#12151c` | .0075 | 卡内凹面、band |
| `--surface-2` | `#171b23` | .0109 | 卡片、演示面板 |
| `--surface-3` | `#1e232c` | — | 抬升面板、输入底 |
| `--band` | `#2e609f` | — | 新 08 区收束带，全站唯一一次换底色 |

层次只靠面与底的亮度差，不引入投影。

### 5.2 文字族（实色，禁用 opacity 调淡）

| 令牌 | 值 | on `--bg` | on `--surface-2` | 用途 |
|---|---|---|---|---|
| `--text-1` | `#f2f3f5` | 17.50 | 15.54 | 标题、正文主行 |
| `--text-2` | `#a6adba` | 8.61 | 7.65 | 导语、说明 |
| `--text-3` | `#7b8496` | 5.17 | 4.59 | eyebrow、注、时间戳 |

约束写进注释：`--text-3` 落在 `--surface-3` 上为 **4.19**，仅 ≥24px 或 19px bold 可用。现有 `--on-dark / --on-dark-2 / --on-dark-3` 合并进这三档后删除。

### 5.3 强调色拆成两族

| 令牌 | 值 | 用途 | 实测 |
|---|---|---|---|
| `--accent-fill` | `#4c5fd5` | 实心按钮、focus 以外的填充 | 白字压其上 5.38（过 AA）；vs `--bg` 3.61（过非文字 3:1） |
| `--accent-400` | `#6d82f5` | 大字、图标、非正文强调 | vs bg 5.70；vs surface-3 4.63 |
| `--accent-300` | `#8fa0ff` | **正文内链接、focus ring** | vs bg 8.00；vs surface-3 6.49 |

原 `--accent #4c5fd5` 当文字色仅 3.61，正文不达标；现 `tokens.css:92` 的 `:focus-visible` 用它，在 `--surface-3` 上仅 2.93，跌破 WCAG 1.4.11 非文字 3:1。focus ring 一律改 `--accent-300`。`--accent-ink`、`--accent-soft`、`--accent-line` 随亮色体系作废。

### 5.4 描边与状态

`--hair-1 rgba(255,255,255,.07)` / `--hair-2 .12` / `--hair-3 .20`。三者对底均不足 3:1（实测 1.41–1.61），因此**只作装饰，不承载信息**；卡片边界若需成为识别线索，抬一层 `--surface-3` 而不是加粗描边。状态色 `--ok #4ed17e`（9.94）、`--warn #f7ad31`（10.16）、`--err #f25a5a`（5.91）。

### 5.5 字阶：20 档离散值收敛到 7 档 + 两个专用地板

| 令牌 | 值 | 字重 / 字距 |
|---|---|---|
| `--fs-1` | `clamp(30px, 4.4vw, 44px)` | 700 · `-.022em`（仅拉丁侧） |
| `--fs-2` | `clamp(23px, 3vw, 30px)` | 700 · 同上 |
| `--fs-3` | `20px` | 700 · sans |
| `--fs-lead` | `17px` | `--text-2` |
| `--fs-body` | `16px` | 中文行高 1.75 / 拉丁 1.65 |
| `--fs-sm` | `14px` | 次级 |
| `--fs-xs` | `12px` | 正文地板，不得更低 |
| （微标签地板） | `11px` | 现 `Proofs.astro:165,188,206` 的 9 / 9.5 / 10px 三档上提 |
| `--fs-mono` | `13px` | `--mono` 栈 |

### 5.6 间距、圆角、动效

`--space-1..11` = 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 88 / 120 / 160（照参考站档位，砍掉 200/240）。区块纵向 `clamp(88px, 12vw, 160px)`。

圆角四级：`--r-card 24` / `--r-panel 16` / `--r-sm 10` / `--r-pill 100`（所有按钮与切换件）。作废 `--radius 11`、`--radius-sm 7`、`--radius-panel 14`，以及 Cta 区「刻意差异」的 18px。

动效：`.reveal` 位移 `18px → 40px`（暗底上 18px 读不出来），时长 0.55s → 0.6s ease-out；`.js` 前缀与 reduced-motion 双兜保持不动。`--maxw 1120` 保留。

### 5.7 作废项

`--paper` / `--paper-2` / `--paper-3`、`--ink` / `--ink-2` / `--muted`、`--line` / `--line-2`、`--accent-ink` / `--accent-soft` / `--accent-line`、`--on-dark*`、body 上的 SVG 纸纹 `background-image`、`.band` 的「纸面 2 + 上下细线」做法（改为 `--surface-1` + 发丝线）。

## 6. SP-2 区块骨架：12 → 8

| 新区 | 名称 | 来源 |
|---|---|---|
| 01 | 首屏 | Hero（保留主标题两拍 f7e4ecb 与语音演示） |
| 02 | 我是 Wrisp | 新增，吸收 `hero.guard` 与 Diff 的判断权论述 |
| 03 | 为什么是它 | Pain（散落/沉不下/用不出）+ Diff |
| 04 | 它怎么工作，你会拿到什么 | Work + Import + Proofs（SP-4 流水线落此） |
| 05 | 你是谁 | Persona 原样（49b60d6 不动） |
| 06 | 数据只在你机器 | Data + 08 凭证面板（3a2596f 形状保留） |
| 07 | 阶段与价格 | Roadmap + Pricing 两栏并排 |
| 08 | 问答与下一步 | Faq，尾部接一条 `--band` 换底色收束带；收束带是本区尾段，不另立区号 |

`SiteNav.chapters` 由 11 条改为 8 条，Faq 自此有目录项。1e6550c「03 区后半句上强调色」重定位到新 03 的后半句。

同批移除：`WaitlistForm.astro`、`global.css:295-345` 的 `.waitlist` 一族、`Cta.astro` 表单挂载、`cta.json` 与 `form.json` 全部叶子、`Hero.astro:38` / `SiteNav.astro:25,47` / `Privacy.astro:30` 四处 `#waitlist` 锚点、`edge/waitlist/`（保留 `edge/router/`）、`.env.example`、README 与 `edge/README.md` 中的收集端段落。

序号纪律：chapters + 各区 eyebrow + 维护者侧清单三处必须同号（README 明写）。

## 7. SP-3 首屏与下载机关

主行动为分裂胶囊：左半显示平台、右半 `▾` 展开其余平台；整件填 `--accent-fill`、白字。平台集 macOS / Windows。平台探测用自写约 20 行脚本（`navigator.userAgentData` + UA 兜底），未命中退回中性文案「下载 Wrisp」；仍是站内脚本，不破「无第三方脚本」纪律。

三个 URL 集中到 `src/lib/downloads.ts` 单处常量，按 D-7 固定资产名拼接 `releases/latest/download/…`。

JSON-LD `operatingSystem` 由三平台改两平台，并补 `downloadUrl`。

## 8. SP-4 三段流水线

| 段 | 组件 | 演什么 | 素材 |
|---|---|---|---|
| ① | `src/components/demo/FlowVoice.astro` | 麦克风态 → 转写落定 → 认类型（最多追问两轮） | 提取 `Hero.astro:581-651` 现有驱动为 `src/lib/voice-demo.ts`，首屏与新区共用一份 |
| ② | `demo/FlowFile.astro` | 落盘前后 diff：裸文本 → 带标签与双链、进当日流 | Import 区「写法照旧」主张的实物 |
| ③ | `demo/FlowRecall.astro` | 卡住的句子 → 命中两条记录 → 引用角标落进正文 | `proof.json` 现有真文字与 `cite`/`box`/`q` 微件 |

六条硬约束：内容全走新建 `src/content/copy/flow.json`（叶子数须等于实际渲染数）；无 JS 显示终态（沿用 `.js` 前缀法）；reduced-motion 直接终态；不写死颜色（顺带清掉 `Work.astro:67,87` 与 `color: var(--accent)` 当文字色）；动画副本整块 `aria-hidden="true"` 且 DOM 内留等价静态描述；微标签 11px、mono 13px 地板。

段间用 `--hair-1` 分隔。预期 `Hero.astro`（现 752 行）瘦约两百行。

## 9. SP-5 周边一致性

og-zh / og-en（1200×630）由维护者侧私有脚本重导，本仓不手工改图（README 纪律）；`SiteFooter` 的 releases 指向复核；区块序号终检；sitemap/robots 生成脚本回归。

## 10. 验收与机检

新增两条挂进 `pnpm check`：

1. **令牌对比度矩阵**：纯 node 函数读 `tokens.css`，遍历文字族 × 底色族，正文断言 ≥4.5、大字与微标签 ≥3，无需浏览器。
2. **组件禁字面色**：扫 `src/**`（`components` + `styles` + `layouts` + `pages`）出现 `#hex` 或 `rgb(`/`rgba(` 字面量即失败，白名单只留 `tokens.css` 与 `Page.astro`。现状经实施计划复扫为 **93 行 / 94 处匹配**（本文初稿写的「62 处（`#fff` 33 处）」只数了十六进制、漏了 `rgba()`，`#fff` 实为 41 处；2026-11-02 计划阶段以脚本实测更正），其中 `src/styles/global.css` 占 15 行，最密的三份是 Hero 21 行、Persona 19 行、Cta 9 行——本计划把 `global.css` 一并纳入扫描，否则基元层可以继续私写颜色。这 93 行在 SP-1 内清零，白名单交空数组；`--emit-baseline` 负责生成清单，避免手抄行号随编辑漂移。

3. **CI webfont 守卫重定范围**（不是删除）：现规则「见到 `@font-face` 即失败」与 888490a 有意发布的那一份子集相冲（见 §3）。按 D-9「保持现有子集、不加新 webfont」改写成**只允许那一份**：断言 `@font-face` 出现次数为 4（四个 HTML 页各一次）且每次都指向 `newsreader-700-latin.woff2`；出现任何其他 `font-family` 或新的 woff 引用即失败。这样守卫回到它本意——挡新增字体负载。

既有五条不动：双语成对 schema、`check-copy-coverage` 逐叶子回比、英文页汉字纯净度、产物无 HTML 注释、sitemap/robots。

SP-1 的暗色翻转单独成 commit，不混内容改动，便于一次 `git revert`。

## 11. 边界与错误处理

| 情形 | 处置 |
|---|---|
| 打印 | `@media print` 回亮色令牌 |
| 系统设浅色 | 不跟随（D-1 裁决，非漏做，注释写明） |
| 无 JS | 演示显终态；平台探测退回中性文案 |
| 下载断链 | URL 单处常量；上线时点绑发包 |
| 焦点态 | 一律 `--accent-300`，不用发丝线表达焦点 |
| 卡片边界 | 发丝线仅装饰，线索不足时抬 `--surface-3` |

## 12. 权威链撤回注（口径作废登记）

以下口径在本次重设计裁决后**作废**，实施时须在原位置留下显式改写而非静默删除：

1. `road.json:51`「现在还在内测迭代，所以这一页没有下载按钮——先留个邮箱」→ 作废；新口径：首屏有下载，平台 macOS/Windows，2026-11-02 裁决。
2. `faq.json:56`「haven't published a date / Join the waitlist」→ 作废改写为下载说明。
3. `priv.json:7` docDesc 尾句「表单邮箱只在你主动提交时」→ 删除该从句，离开本机的路径清单减一项。
4. `priv.json:74-76` 第 5 条路径 `5b`（表单邮箱与那句「现在最挡着你的一件事」）→ 整条撤销。
5. `priv.json:122-124` `n3`「表单这一版还没有接通收件服务……等收件通道上线本页会同步改口」→ 整段作废（表单不存在）。
6. `cta.json` 全部叶子、`form.json` 整档 → 删除（D-15）。
7. `Home.astro:26` JSON-LD `operatingSystem: "Windows, macOS, Linux"` → 改两平台（D-8）。
8. 8ec8be2「首屏撤下未接通的等待名单表单」→ 本次是其延伸：连 11 区表单一起撤，不与之冲突。

## 13. 不照搬清单

| 参考站机关 | 处置 | 理由 |
|---|---|---|
| 全 400 字重拉层次 | 不照搬 | 仅有 Newsreader 700 子集，且 D-9 不加 webfont；改为字重保 700，「轻」让给 h3 以下 |
| 负字距 −0.8/−0.56px | 仅拉丁侧 | `global.css:60-73` 已裁决中文标题零字距；暗面光渗使细字更弱，暗色下不收紧字距 |
| 白底幽灵主按钮 | 不照搬 | D-5，下载是首要转化 |
| 手机端仍保持 160px 区块留白 | 不照搬 | D-11 加 clamp 收到 88 |
| hero 底部 canvas 动画层 | **本轮建议不采纳，但未逐节裁决** | 参考站唯一重资产。我的理由是本站以真实流水线演示承担同等可信度，且 canvas 装饰层与「本地优先、无多余请求」的口径相冲；§4 未就此请你表态，列入 §14 待确认 |
| 每区独立重绘 App mock | 不照搬 | D-12，改用真内容流流水线，且无产品界面素材可复刻 |

## 14. 未决项

1. **工作区有 306 行 / 13 文件的未提交改动**（含 `tokens.css`、`global.css`、`Persona.astro`、`Data.astro`，以及 body 纸纹与 `--radius-panel`、`--accent-line` 三项）。其中纸纹按 §5.7 判为作废。SP-1 会整片重写 `tokens.css` 与 `global.css`，**须先把这批 WIP 提交或明确放弃**，否则 §10 要求的「SP-1 单独成 commit」无法成立。
2. 视觉验收手段待定：本会话内置浏览器无可视 surface（`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`），截图对照需走 playwright CLI 或由维护者目测。
3. `dist/` 已入库，暗色翻转后需重新构建产物；是否入库由维护者侧口径决定。
4. 首屏是否要参考站那层 canvas 动画底（见 §13）。本轮按不采纳写契约，但这项没在逐节裁决里过——若你要跟，SP-3 的范围加一条「自写 canvas 层 + reduced-motion 停帧」，且须复核它是否触碰 priv.json 里「Nothing else on the page is external」那条陈述（自写脚本不引外部资源，应不触碰，但需实测确认）。
