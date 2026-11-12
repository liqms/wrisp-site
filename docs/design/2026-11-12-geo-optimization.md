# Wrisp 官网 GEO 优化方案（生成式引擎优化）

- 日期：2026-11-12
- 状态：提案（未实施）· 待维护者裁决
- 范围：`wrisp-site` 前端（www.trywrisp.com）；不含应用本体
- 依据：当前工作树（`src/`、`scripts/`、`edge/`、`docs/design/`）与线上实测
- 说明：GEO 的目标是让 AI 搜索/网页检索（ChatGPT、Perplexity、Gemini、Kimi、豆包、文心等）在回答相关问题时**引用本站点**。它与 SEO 互补：SEO 让页面被收录，GEO 让内容被 LLM 检索器**解析、采信、引用**。

## 0. 结论

站点已具备大部分 GEO 地基（静态 HTML、清晰标题层级、FAQ、hreflang、sitemap、结构化数据），但有四类短板：

1. **AI 爬虫可访问性未显式保证**——语言跳转规则对爬虫 UA 也生效，`robots.txt` 未显式放行主流 AI 爬虫（GPTBot / PerplexityBot / ClaudeBot / CCBot / Baiduspider 等）；
2. **结构化数据停留在单页**——只有首页 `SoftwareApplication`，没有 `Organization` / `WebSite` / `FAQPage`，而 FAQPage 是 AI 检索最常提取的块；
3. **内容集中在首页一个长页**——没有 /how-it-works、/changelog、对比内容，LLM 能引用的事实密度低；
4. **演示内容对提取不友好**——关键能力以动画/交互演示承载，静态文本里缺少「一句话定义 + 一句话怎么用 + 一句话限制」的完整陈述句。

建议按 P0 → P2 实施，P0 是纯技术改动（1–2 天），P1 是内容杠杆（1–2 周），P2 是信号与测量（持续）。

| # | 改动 | 类型 | 优先级 |
|---|---|---|---|
| 1 | robots.txt 显式放行 AI 爬虫；语言跳转排除 AI 爬虫 UA | 可爬性 | P0 |
| 2 | JSON-LD 扩展：Organization / WebSite / FAQPage / SoftwareApplication 补全字段 | 结构化 | P0 |
| 3 | 每区副句改写成可引用的完整陈述句（结论先行） | 内容 | P0 |
| 4 | 新增 /how-it-works 页（工作原理 / 数据流 / 平台要求） | 内容 | P1 |
| 5 | 新增 /changelog 页（更新日志 + 最后更新日期） | 内容 | P1 |
| 6 | 对比内容：FAQ 独立成「Wrisp vs 通用 AI / 云笔记 / 笔记应用」小节 | 内容 | P1 |
| 7 | 权威性信号：页脚版本/日期/联系方式、开源仓库活跃度 | 信号 | P2 |
| 8 | GEO 测量：AI 引擎提问测试集 + Search Console AI Overviews | 度量 | P2 |

## 1. GEO 与 SEO 的差异

| 维度 | SEO | GEO |
|---|---|---|
| 目标 | 被搜索引擎收录、排名 | 被 LLM 检索器提取、采信、引用 |
| 抓取方 | Googlebot / Bingbot / Baiduspider | GPTBot / PerplexityBot / ClaudeBot / CCBot / Baiduspider / 各家 AI 爬虫 |
| 关键载体 | 关键词、标题、外链 | 结构化数据、问答格式、完整陈述句、可核验事实 |
| 成功信号 | 排名、点击 | AI 回答里出现站点名并给出准确描述 |
| 内容粒度 | 页面主题 | 「问题-答案」单元、实体、属性值 |

GEO 的核心机制：AI 引擎回答问题时走「检索 → 提取 → 合成」。你的站点要在**提取**环节胜出——内容要被拆成清晰的实体和问答，而不是一整段营销话术。

## 2. 现状诊断（2026-11-12 实测）

### 2.1 已具备

| 项 | 现状 | 证据 |
|---|---|---|
| 纯静态 HTML，无 JS 依赖 | ✅ 演示内容也在 DOM 里（`static-matched` 守卫保证） | `check-copy-coverage` |
| 标题层级 | ✅ H1 每页一个，H2/H3 结构化 | `src/components/blocks/` |
| 问答内容 | ✅ 首页 FAQ 六问，直答式 | `faq.json` |
| hreflang / canonical / sitemap | ✅ 双语互指、canonical、sitemap 齐全 | `gen-seo.mjs`、实测 200 |
| 结构化数据 | ⚠️ 仅首页 `SoftwareApplication` + Offers | `Home.astro` jsonld |
| 验证 meta | ✅ Google / Bing / 百度 | `Page.astro` |
| 语言跳转 | ✅ cookie 优先 + 语言头，只发 302 | Cloudflare Redirect Rules |
| 具体数字 | ✅ 4.4 GB、5 GB、Windows/macOS、BYOK | `faq.json`、`features.json` |
| 差异化陈述 | ✅ FAQ「和通用 AI、云笔记有什么不同」 | `faq.json` Q3 |

### 2.2 缺失 / 短板

1. **AI 爬虫可访问性未显式保证**：
   - 语言跳转规则对**所有 UA** 生效——若 AI 爬虫的 `Accept-Language` 含 zh（部分国内 AI 爬虫），抓 `/` 会 302 → `/zh/`，误导内容归属；国外爬虫（GPTBot/PerplexityBot）语言头通常为空，抓 `/` 不跳，但**没有显式放行声明**。
   - `robots.txt` 是构建期生成的标准文件，未显式允许 GPTBot / PerplexityBot / ClaudeBot / CCBot。部分 AI 引擎尊重 robots 的 `User-agent: *` 之外的特化条目。
2. **结构化数据单薄**：
   - 无 `Organization`（品牌实体、logo、sameAs），AI 无法建立「Wrisp 是谁、由谁发布」的实体关联；
   - 无 `WebSite`（站点实体 + SearchAction），无 `FAQPage`（六问六答没有 JSON-LD 化，AI 只能靠纯文本猜）；
   - `SoftwareApplication` 缺 `featureList` / `softwareRequirements` / `isAccessibleForFree` / `inLanguage`。
3. **内容密度集中在首页**：
   - 首页承载了「是什么、怎么用、产出、特性、FAQ、CTA」全部内容，一个长页；
   - 没有独立的工作原理页、更新日志页、对比页——AI 检索「Wrisp 本地模型怎么跑」时首页没有对应主题锚点。
4. **陈述句不完整**：
   - 多个区块副句是短语（如「从记录到卡片」「从信息卡片到创作」），不是完整句子；LLM 提取时倾向于引用完整陈述句；
   - 关键能力（记录→整理→检索→创作）在演示动画里展示，静态文本里缺少「一句话定义 + 一句机制 + 一句边界」的组合。

## 3. P0 · 可爬性与结构化（1–2 天，纯技术）

### 3.1 robots.txt 显式放行 AI 爬虫

`scripts/gen-seo.mjs` 生成 `robots.txt` 时追加：

```
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Baiduspider
Allow: /
```

保留现有 `User-agent: *` 与 `Sitemap:` 行。注意：**不屏蔽任何爬虫**——GEO 的前提是被抓取；屏蔽 AI 爬虫会直接出局。

### 3.2 语言跳转排除 SEO 与 AI 爬虫 UA

Cloudflare Redirect Rules 规则 3（语言头猜测）追加「非爬虫」条件（免费计划用 `contains`，`matches` 不可用）。SEO 与 AI 爬虫**一起排除**——它们抓 `/` 时若语言头含 zh 会被 302 误导，影响收录与 AI 引用；规则只能合并（Redirect Rules 没有「跳过」动作）：

```
(http.request.uri.path eq "/") and (not http.request.headers["cookie"][0] contains "wrisp_lang") and (http.request.headers["accept-language"][0] contains "zh") and (not http.request.headers["user-agent"][0] contains "Googlebot") and (not http.request.headers["user-agent"][0] contains "Bingbot") and (not http.request.headers["user-agent"][0] contains "Baiduspider") and (not http.request.headers["user-agent"][0] contains "YandexBot") and (not http.request.headers["user-agent"][0] contains "DuckDuckBot") and (not http.request.headers["user-agent"][0] contains "GPTBot") and (not http.request.headers["user-agent"][0] contains "ChatGPT-User") and (not http.request.headers["user-agent"][0] contains "PerplexityBot") and (not http.request.headers["user-agent"][0] contains "ClaudeBot") and (not http.request.headers["user-agent"][0] contains "CCBot") and (not http.request.headers["user-agent"][0] contains "Google-Extended") and (not http.request.headers["user-agent"][0] contains "Bytespider") and (not http.request.headers["user-agent"][0] contains "360Spider") and (not http.request.headers["user-agent"][0] contains "Sogou") and (not http.request.headers["user-agent"][0] contains "QuarkBot") and (not http.request.headers["user-agent"][0] contains "YisouSpider")
```

注意：该引擎里 `http.request.headers["user-agent"]` 是数组类型，必须取 `[0]`（与 cookie 同理）；`accept-language` 同样取 `[0]`。`contains` 是免费计划可用的字符串运算符（`matches`/`starts_with` 需商业计划）。

覆盖：SEO（Googlebot/Bingbot/Baiduspider/YandexBot/DuckDuckBot/360Spider/Sogou/QuarkBot/YisouSpider）与 AI（GPTBot/ChatGPT-User/PerplexityBot/ClaudeBot/CCBot/Google-Extended/Bytespider）。国内 AI 中字节（Bytespider）与百度系（Baiduspider）已覆盖；Kimi/DeepSeek/通义/混元等爬虫 UA 不公开，无法用 UA 排除，其联网搜索多经上述搜索服务商接口间接抓取。

### 3.3 JSON-LD 扩展

`Home.astro` 的 `jsonld` 由单页扩展为 `@graph`（数组），一次声明四个实体：

1. **Organization**：`name: Wrisp`、`url`、`logo`（/assets/logo.png）、`sameAs`（GitHub 仓库）、`foundingDate` 可省（未公开）。
2. **WebSite**：`url`、`inLanguage: ['zh-CN','en']`。
3. **SoftwareApplication**（现有补全）：`featureList`（语音记录、日志流、信息卡片、检索问答、创作空间、模板与技能——只写已可用）、`softwareRequirements`（Windows / macOS；无独显可跑；本地模型可选约 4.4 GB）、`isAccessibleForFree: true`、`inLanguage`、`operatingSystem: 'Windows, macOS'`、`offers` 保留。
4. **FAQPage**：由 `faq.json` 六问六答生成，`mainEntity` 数组；**答案必须与页面可见文本一致**（现有文案即可用）。

落地注意：
- 结构化数据只在首页（`/` 与 `/zh/` 各自一份，语言对应）；辅助页不重复声明产品实体（沿用现有规则）。
- `FAQPage` 答案从 `faq.json` 读，不另写——保证与页面一致、双语闭合（`{ zh, en }` 叶子机制天然满足）。
- 新增 `const jsonldGraph` 并在 `<script type="application/ld+json">` 输出 `@graph`。

### 3.4 副句改写成完整陈述句

把首页各区副句从短语改成「可被引用的完整句」，结论先行。示例（zh）：

| 区块 | 现在 | 改为 |
|---|---|---|
| Hero 副句 | 随时记录你的想法，并自动整理成卡片；写作时随时调用，并基于卡片创作内容。 | Wrisp 是一个本地优先的创作助手：你用自然语言或语音记录想法，它会自动整理成信息卡片；写作时随时调用这些卡片来创作内容。 |
| 工作流副句 | 说一句、认类型、进日志流、整理成信息卡片 | Wrisp 的四步都在本机完成：先说一句或写一段，它会自动识别类型，进入当日日志流，再整理成信息卡片。 |
| 产物副句 | 从信息卡片生成待办、周报、知识体系、创作空间 | 信息卡片会继续生成四种成品：待办清单、周报、知识体系与创作空间，全部基于你的记录。 |
| 特性副句 | 数据、文件、费用、平台，六项都能现在核验。 | 数据存储、文件格式、费用与平台，这六项现在都能在站点上核验。 |

规则：每句包含「产品名 + 做什么 + 在哪里/怎么发生」，让 LLM 能直接引用并归因到 Wrisp。

## 4. P1 · 内容杠杆（1–2 周）

### 4.1 新增 /how-it-works（工作原理页）

双语各一页（`/how-it-works/`、`/zh/how-it-works/`）。这是 GEO 最值得投入的一页，回答 AI 最常被问的「它怎么工作的」：

- 数据流：输入（语音/文字）→ 本地识别 → 类型判断 → 日志流 → 信息卡片 → 检索/成品；
- 本地与云端边界：哪些默认在本机（识别、整理、嵌入、问答），哪些走你自己的 Key（云端请求）；
- 平台与运行要求：Windows / macOS、无独显可跑、本地模型可选（三个共约 4.4 GB，生成模型运行时约 5 GB 内存）；
- 文件真源：Markdown 在你的目录，导出即原文件；
- 配 2–3 张真实截图或流程示意图（页面用静态图，不依赖 JS）。

结构上每节用「H2 问题句 + 一段完整陈述 + 关键数据列表」，这是 LLM 检索器最友好的形状。

### 4.2 新增 /changelog（更新日志）

双语各一页，按日期倒序列「已发布 / 修复 / 接下来」。作用：

- 给「会在这个站点上公布」一个真实落点（此前 CTA/FAQ 的口径）；
- 提供新鲜度信号（AI 引擎偏好近期更新的内容）；
- 让「可验证的进度」成为可引用事实（预发布产品的信任杠杆）。

### 4.3 对比内容

AI 引擎最常见的提问是「A 和 B 有什么区别」。当前 FAQ Q3 已覆盖「vs 通用 AI / 云笔记」，建议扩展成独立小节或页面：

- **Wrisp vs 通用 AI 写作工具**（ChatGPT/Claude/文心等）：通用 AI 从空白页开始；Wrisp 从你的记录开始，答案可回到原记录；
- **Wrisp vs 云笔记**（Notion/Obsidian 同步/印象笔记）：Markdown 在本地目录、默认本机处理、不锁数据；
- **Wrisp vs 本地笔记**（Obsidian 等）：多了自动整理与检索问答，但仍以 Markdown 为真源。

写法：每条对比给「共同点一句 + 差异点三句 + 归属一句」，让 LLM 能直接引用并归因。

### 4.4 首页能力锚点

首页各区标题与副句保证是**完整句**（见 3.4），让 AI 能按主题锚点提取：记录、整理、检索、创作、本地优先、费用、平台。

## 5. P2 · 信号与测量（持续）

### 5.1 权威性信号

- 页脚加「最后更新」日期与版本号（`changelog` 页同步）；
- 保留 GitHub 仓库与 issues 链接（已是真实社交证明）；
- 有条件时在 /how-it-works 放真实截图（比 mock 更有采信度）；
- 联系/反馈入口明确（已具备：GitHub issues）。

### 5.2 测量（不违背「无第三方分析」）

- **AI 提问测试集**：固定 10 个问题，每月在 ChatGPT / Perplexity / Kimi / 豆包 / 文心 各问一遍，记录是否引用站点、描述是否准确：

  1. Wrisp 是什么？
  2. Wrisp 和 Notion / Obsidian 有什么区别？
  3. Wrisp 和通用 AI 写作工具有什么区别？
  4. Wrisp 要多少钱？
  5. Wrisp 支持哪些平台？
  6. Wrisp 的本地模型有多大？
  7. Wrisp 的数据存在哪里？
  8. Wrisp 需要独立显卡吗？
  9. Wrisp 的创作空间是什么？
  10. Wrisp 什么时候发布？

- **Google Search Console**：`Performance → Search results` 勾选 **AI Overviews**（谷歌 AI 概览曝光数据）；`Pages` 看 /how-it-works、/changelog 的索引情况；
- **Cloudflare Web Analytics**：beacon 无法按爬虫区分，但可通过访问时段/流量突增间接观察；需要精确 AI 爬虫统计时再考虑边缘日志（可选，不默认加）。

## 6. 与既有约束的相容性

| 约束 | 影响 | 处置 |
|---|---|---|
| 无第三方脚本 / 无分析 | GEO 不需要额外脚本 | JSON-LD 是内联结构化数据，零外部依赖；测量用 Search Console + 手动提问，不装分析 |
| 双语叶子成对 | 新增页面/文案全部走 `{ zh, en }` | 现有机制自动保证 |
| 诚实口径（未发布不写现在时） | /how-it-works 里「周报可用」等需回产品侧确认 | 只写已可用能力；未落地标「下一阶段」 |
| 纯静态 + 不加载 webfont | 新增页面无新依赖 | 保持 |
| CI 守卫 | 新增页面自动进 sitemap；`check-anchors` 白名单不变（新页不引锚点） | `gen-seo.mjs` 自动收录新页 |
| 语言跳转 | 规则 3 需排除 AI 爬虫 UA | 见 3.2 |

## 7. 实施顺序

| 阶段 | 内容 | 判据 |
|---|---|---|
| P0 | robots.txt 放行 AI 爬虫；跳转排除 AI 爬虫；JSON-LD @graph；副句完整化 | CI 绿；`curl -A GPTBot /` 200；搜索引擎结构化测试通过（Rich Results 或手动抓 JSON-LD） |
| P1 | /how-it-works、/changelog、对比小节 | 页面发布；AI 测试集中「工作原理/区别」问题开始引用站点 |
| P2 | 页脚日期/版本；月度 AI 测试；Search Console AI Overviews 监控 | 测试集记录对比；AI Overviews 曝光出现 |

## 8. 待裁决

| # | 问题 | 选项 | 建议 |
|---|---|---|---|
| G1 | AI 爬虫放行 | 全部放行 / 屏蔽部分（如只放 GPTBot+PerplexityBot） | 全部放行：GEO 前提是能被抓，屏蔽任何主流 AI 爬虫都是净亏 |
| G2 | /how-it-works 与 /changelog | 两个都做 / 先做 changelog / 先做 how-it-works | 都做，changelog 成本最低先上，how-it-works 是内容大头 |
| G3 | 对比内容 | 独立页面 / FAQ 内小节 | FAQ 内小节（成本低），观察测试集效果后再决定是否独立成页 |
| G4 | 截图 | 真实截图 / 保持 CSS mock | 有真实界面就先放真实截图（/how-it-works 内），首页保留 mock |
| G5 | 月度 AI 测试 | 人工每月跑 / 半自动化记录 | 先人工：固定问题集，每月一次，记录在 changelog 或内部台账 |
