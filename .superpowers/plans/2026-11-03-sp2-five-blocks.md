# SP-2 首页五区拆区实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `main` 里装配的十二个可见区块收成五区，同时撤掉整个导航层（左侧目录 + 吸顶步进器 + 章节锚点）、撤掉等待名单表单与其运行要求规格条，并把四处 `#waitlist` 入站引用改口到 `#next`。

**Architecture:** 纯结构改动，不新增加任何 JS。`Home.astro` 是唯一的装配点；区块组件一个区一个文件（02 区新建 `Features.astro`，03 区由 `Work.astro` 吸收 `Roadmap.astro`）；文案一律走 `src/content/copy/*.json` 的 `{zh,en}` 成对叶子，删除件按 D-15 直接删文件、不留备用。导航层退役后，章节定位只交给滚动与各区 eyebrow 的 `01–05` 序号。

**Tech Stack:** Astro `^7.0.0`（static output + i18n：`/` 英文、`/zh/` 中文）、Node `>=22.23.4`、pnpm `11.0.9`、纯 CSS 自定义属性、无测试框架——校验沿用 `scripts/check-tokens.mjs` 的 `check(name, pass, detail)` + `✓/✗` + 非零退出这套进程内断言风格。

**Spec:** [docs/design/2026-11-03-five-blocks-design.md](../../docs/design/2026-11-03-five-blocks-design.md) —— 本计划实现其 §2 的 NB-1…NB-18、§4 的五区内容契约、§5 的作废与连带清单、§6 的去重与验收。**先读 §2 的裁决表**，任务里出现的每个删除项都对应表里一行。本文件是**过程件**，按 2026-11-03 第三轮口径落 `.superpowers/plans/`，不进 `docs/`。

## Global Constraints

- **不新增 JS 服务导航**（NB-5）。`Home.astro:59-74` 驱动 `.reveal` 渐显的 `IntersectionObserver` **必须保留**；`SiteNav.astro:59-107` 的滚动高亮脚本整件删除。`LangSwitch` 的 cookie 脚本不属导航，原样留着。
- **组件内不写死颜色**（已由 CI 拦）。新组件只用 `var(--*)`；`scripts/color-baseline.json` 保持 `[]`（当前 baseline=0）。
- **不加载新 webfont**；暗色是唯一形态，不写 `prefers-color-scheme: light` 分支。
- **双语叶子成对**：`src/content.config.ts` 的 `z.strictObject({zh,en})` 在构建期保证，缺任一侧直接构建失败。新文案一律中英同批写。
- **时态红线四条**（§7）：分发链路可讲、界面形态不可讲；周报不用现在时；「创作空间」闸门已于 2026-11-03 解除，可上站；处境句不是口号（判据：只陈述读者现状，不表达愿望）。
- **诚实口径**：不会成功的控件不渲染。下载胶囊属 SP-3（被发包阻塞），本计划**不做**任何下载件（NB-13）。
- **编号纪律**（NB-11）：eyebrow 全线 `01 ·` … `05 ·`，且**只改序号前缀、保留各自原有的标签词**（依据：NB-2 对问答区只裁了编号 `11 ·`→`05 ·`，没裁「常见问题」四字）。
- **脱敏**：站仓是公开仓，任何入库文件与提交信息不得出现私有仓路径、需求编号、内部文档名。
- **本计划全程不 push、不部署**（`main` 是路线 A 中间态，NB-13）。commit 步骤是执行期的验收点，需维护者已发话「可以提交」。
- **工作树现场**：HEAD = `2216bfb`，工作树带着**文档侧未提交改动**（两份 `git mv`、`src/styles/tokens.css:4` 的注释、新增的 `docs/design/2026-11-03-five-blocks-design.md`）。执行 SP-2 时**按文件名 `git add`，绝不 `git add -A`**，也不要把文档改动混进代码提交。另有 stash `stash@{0}`（消息含 `sp1-merge-2026-1102 maintainer-WIP`）——**不 pop、不 drop**。

- **`git rm` 之后的 `git add` 只列仍存在的文件**：本机 git 版本里，`git rm` 已把路径从索引与工作树同时移除，再 `git add <那个已删除的路径>` 会 `fatal: pathspec ... did not match any files`（Task 8 实测）。各步 Step「提交」里把删除件写进 `git add` 清单的（T2/T5/T7/T8/T9/T10 六处），执行时改成「只 add 存活文件 + `git rm` 的件已在索引里」，并用 `git status` 确认暂存集合与本步列出的件**完全一致**后再 commit——验收口径不变，只是命令形态变。
- **计数用 `grep -o … | wc -l`，别用 `grep -c`**：构建产物是单行压缩 HTML，`grep -c '<script'` 恒为 1（Task 8 实测）。

**基线（2026-11-03 实测，执行前先复跑确认）**：`pnpm build && pnpm check` → `leaves=277 pages=4 missing=0 en-cjk=0`、`tokens=65 baseline=0`、`data-shot` 五枚。终态目标：`leaves=169`、`tokens=63`、`data-shot` 四枚，**两个集合分开验**（2026-11-04 在 `57a183b` 的 `dist` 实测过，早先这里把两者混成一句）：`href="#…"` 的**取值**集合 = `{top, how, next}`（三枚，`anchors=3` 就是它的计数）；`id="…"` 的**落点**集合 = `{top, how, proofs, faq, next}`（五枚齐在，`proofs`/`faq` 自目录退役后零引用者是**预期状态**，不是断链也不是漂移）。守卫的 `ALLOWED` 白名单按后者给，所以「齐在但不被指」永远绿。

**叶子阶梯（每步收尾的 `leaves=` 必须等于这里的数，差一枚就是漏删或漏配对）**：
`T1 277 → T2 269（−spec 8） → T3 259（−form 5 −cta 表单叶 6 +cta.privacy 1） → T4 258（−foot.beta 1） → T5 243（−nav 4 −bn 11） → T6 243（不碰文案） → T7 242（+hero.situation 1 +features 8 −pain 10） → T8 211（−diff 5 −cmp 7 −persona 19） → T9 211（−road.eyebrow 1 +road.pro 1） → T10 173（−imp 15 −data 13 −price 10） → T11 169（−问答卡 5 +proof.band 1） → T12 169 → T13 169`。
终态各文件余量：`cta 3 / faq 14 / features 8 / foot 4 / hero 19 / meta 5 / nav 1 / priv 38 / proof 31 / road 13 / stream 22 / work 11 = 169`。

**行号口径**：本文所有 `文件:行号` 都是 2026-11-03 工作树的实测值，**仅供定位**。前面的任务删掉一段样式或一个组件后，同文件后面的行号会整体上移；执行时以**选择器 / 注释 / 叶子键名**为准，不要按数字硬取行。同文件多次编辑的任务（T5、T7、T9、T11）在步骤里给了锚点文本。

---

## 文件结构（本计划的全部改动面）

**新建**
| 文件 | 职责 |
|---|---|
| `scripts/check-anchors.mjs` | 锚点完整性机检（§6 要求的「最小断链校验」），纯函数 + `--selftest`，末个任务接入 `pnpm check` |
| `src/content/copy/features.json` | 02 区三张卡的文案：eyebrow + 标题 + 3×（卡标题 + 一句说明），8 枚叶子 |
| `src/components/blocks/Features.astro` | 02 区渲染：三列并排（≥900px）/ 一行一张（以下），卡面 `--surface-2` + 发丝线，零投影 |

**整件删除**（组件 7 + 文案 10 + 表单组件 1）
`Pain.astro` `Diff.astro` `Persona.astro` `Import.astro` `Data.astro` `Pricing.astro` `Roadmap.astro`（并入 `Work.astro`）、`WaitlistForm.astro`；
`pain.json` `diff.json` `cmp.json` `persona.json` `imp.json` `data.json` `price.json` `spec.json` `form.json` `bn.json`。

**改写**
`Home.astro`（装配 5 区 + JSON-LD 平台数）、`SiteNav.astro`（只留 品牌 + 语言 + 一个主行动）、`Hero.astro`（eyebrow / 处境句 / `#next`）、`Work.astro`（吸收 Roadmap）、`Proofs.astro`（五卡→四卡 + `--band` 收束带）、`Faq.astro`（`#faq` / 撤规格条 / Q6）、`Cta.astro`（`#next` / 撤表单）、`SiteFooter.astro`（撤 beta 链接 + 加语言切换）、`pages/Privacy.astro`（入站引用改口）、`styles/tokens.css`（`--chapter-*` 撤销）、`styles/global.css`（`.band` / `.blocknav` / `.chapter` / `.waitlist` 四段退役）、`package.json`（`check` 入口）、`scripts/check-copy-coverage.mjs` 不动。

**依赖顺序**：Task 1 独立 → Task 2…4 是 05 区链（2 撤规格条 → 3 撤表单 → 4 改口，4 必须最后，否则 `#next` 尚不存在）→ Task 5 撤导航层 → Task 6 令牌连带（必须在 5 之后：`--chapter-*` 的消费者正是 5 删掉的样式）→ Task 7…11 逐区成形 → Task 12 装配收口 → Task 13 接闸门 + 全量验收。

---

## Task 1: 最小断链校验脚本（先只有 selftest，暂不接入 `pnpm check`）

**为什么排在第一**：§6 明写「没有守卫的锚点纪律在这次规模的删除后必然出错」。守卫要先于删除存在，但它一旦接入就会在 Task 2…12 期间一直报红（旧锚点 `#waitlist`、`#pain`、`#persona` 还在），后续任务的「跑 `pnpm check`」就失去判别力。所以拆两步：本任务只交付**纯函数 + 夹具自测**，接入放在 Task 13。

**Files:**
- Create: `scripts/check-anchors.mjs`
- 不修改 `package.json`（Task 13 改）

**Interfaces:**
- Consumes: `dist/**/index.html`（需先 `pnpm build`）；无对其它脚本的依赖。
- Produces: `hrefsIn(html)`、`resolveAnchor(href)`、`checkAnchors(pages)` 三个导出的纯函数；CLI 退出码 0/1；`--selftest` 不碰 `dist`。Task 13 把它接进 `pnpm check`。

- [ ] **Step 1: 写文件**

```js
/**
 * 锚点完整性校验（构建后跑）：node scripts/check-anchors.mjs
 *
 * SP-2 把导航层整个撤掉，章节定位从此只交给滚动：站内只剩四处入站锚点引用。
 * 改口只要漏掉一处，点下去就是「跳到不存在的地方」，而且静默——Astro 不做断链检查，
 * CI 的 Sanity checks 只看绝对路径链接、不看 `#`。§6 要的正是把这两个人工核对项变成机检：
 *   1) 全站 `href="#…"` 的取值只能落在 ALLOWED 五个 id 里，出现别的即失败；
 *   2) 每条锚点在其指向的那份 HTML 里确有同 id 元素；
 *   3) 双语首页各自都装有五个 id（少一个说明装配漏了区，而不是引用写错）。
 * 用法与 check-tokens.mjs 一致：--selftest 只跑内置夹具，不碰仓库与 dist。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'dist');
// 与 astro.config.mjs 的 BASE 同值；改 base 必须同改这里，否则跨页锚点全被当成站外。
const BASE = '/wrisp-site/';

// spec §6：改完后站内 href="#…" 的取值集合收敛为这五个。
export const ALLOWED = ['top', 'how', 'proofs', 'faq', 'next'];

export const hrefsIn = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

/**
 * 把一条 href 拆成「哪一页的哪个锚点」。
 * 三种在用的形态：`#how`（同页）、`/wrisp-site/zh/#next`（跨语言首页）、
 * `/wrisp-site/#next`（首页）；其余带 `#` 的一律视为站外，不断链。
 * `href="#"` 不在此拦——CI 的占位死链守卫已经盯着它，重复断言只会多一处漂移点。
 */
export const resolveAnchor = (href) => {
  const hash = href.indexOf('#');
  if (hash < 0) return null;
  const frag = href.slice(hash + 1);
  if (!frag) return null;
  const before = href.slice(0, hash);
  if (before === '') return { page: '.', frag };
  if (!before.startsWith(BASE)) return null;
  const rel = before.slice(BASE.length).replace(/\/$/, '');
  return { page: rel === '' ? '.' : rel, frag };
};

/** pages: [{ at: 'index.html' | 'zh/index.html' | 'privacy/index.html', html }] */
export const checkAnchors = (pages) => {
  const byDir = new Map(pages.map((p) => [path.posix.dirname(p.at), p.html]));
  const bad = [];
  const used = new Set();
  for (const p of pages) {
    for (const href of hrefsIn(p.html)) {
      const anchor = resolveAnchor(href);
      if (!anchor) continue;
      used.add(anchor.frag);
      const target = byDir.get(anchor.page);
      if (target === undefined) {
        bad.push(`${p.at}: ${href} 指向的页面不在 dist 里`);
      } else if (!target.includes(`id="${anchor.frag}"`)) {
        bad.push(`${p.at}: ${href} 在 ${anchor.page} 里没有同 id 元素`);
      }
    }
  }
  for (const frag of used) if (!ALLOWED.includes(frag)) bad.push(`锚点 #${frag} 不在 §6 允许的集合里`);
  for (const home of ['index.html', 'zh/index.html']) {
    const html = byDir.get(path.posix.dirname(home));
    for (const id of ALLOWED) {
      if (!html || !html.includes(`id="${id}"`)) bad.push(`${home} 缺少 id="${id}"`);
    }
  }
  return bad;
};

const htmlFiles = (dir, acc = []) => {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) htmlFiles(p, acc);
    else if (item.name === 'index.html') acc.push(p);
  }
  return acc;
};

const run = () => {
  if (!fs.existsSync(DIST)) {
    console.error('=== ANCHOR CHECK FAILED ===\ndist 不存在，先跑 pnpm build');
    process.exit(1);
  }
  const pages = htmlFiles(DIST).map((f) => ({
    at: path.relative(DIST, f).split(path.sep).join('/'),
    html: fs.readFileSync(f, 'utf8'),
  }));
  const bad = [...new Set(checkAnchors(pages))];
  check('站内每个锚点都指向存在的 id，且取值在 §6 集合内', bad.length === 0, bad.slice(0, 30));
  const failed = results.filter((r) => !r.pass);
  console.log(`\nanchors=${new Set(pages.flatMap((p) => hrefsIn(p.html).map((h) => resolveAnchor(h)?.frag).filter(Boolean))).size} pages=${pages.length}`);
  if (failed.length) {
    console.error(`\n=== ANCHOR CHECK FAILED (${failed.length}) ===`);
    process.exit(1);
  }
  console.log('=== ANCHOR CHECK PASSED ===');
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '  → ' + JSON.stringify(detail)));
};

if (process.argv.includes('--selftest')) {
  check('裸锚点算同页', resolveAnchor('#how')?.page === '.', resolveAnchor('#how'));
  check('首页带 base 的锚点也归同页', resolveAnchor('/wrisp-site/#next')?.page === '.', resolveAnchor('/wrisp-site/#next'));
  check('中文首页的锚点解析到 zh', resolveAnchor('/wrisp-site/zh/#next')?.page === 'zh', resolveAnchor('/wrisp-site/zh/#next'));
  check('站外带 # 的链接不参与断链判断', resolveAnchor('https://example.com/a#b') === null, resolveAnchor('https://example.com/a#b'));
  check('没有 # 的链接返回 null', resolveAnchor('/wrisp-site/privacy/') === null, null);
  check('空锚点交给 CI 的死链守卫', resolveAnchor('#') === null, null);

  const OK = [
    { at: 'index.html', html: '<main id="top"><a href="#how">x</a><a href="/wrisp-site/zh/#next">y</a></main><section id="how"></section><section id="proofs"></section><section id="faq"></section><section id="next"></section>' },
    { at: 'zh/index.html', html: '<main id="top"></main><section id="how"></section><section id="proofs"></section><section id="faq"></section><section id="next"></section><a href="/wrisp-site/zh/#next">z</a>' },
  ];
  check('双语首页锚点齐全 → 零失败', checkAnchors(OK).length === 0, checkAnchors(OK));
  // 负用例必须逐条证伪：少了这三格，上面那句「零失败」可能只是断言没咬住。
  const DEAD = [{ ...OK[0], html: OK[0].html.replace('href="#how"', 'href="#waitlist"') }, OK[1]];
  check('改口漏一处 → 同时报「没有同 id」与「不在允许集合」',
    checkAnchors(DEAD).some((m) => m.includes('#waitlist')) &&
      checkAnchors(DEAD).some((m) => m.includes('没有同 id 元素')),
    checkAnchors(DEAD));
  const NOHOME = [OK[0], { ...OK[1], html: OK[1].html.replace('id="faq"', 'id="other"') }];
  check('中文首页漏一个区 → 报缺 id', checkAnchors(NOHOME).some((m) => m.includes('zh/index.html 缺少 id="faq"')), checkAnchors(NOHOME));

  const failed = results.filter((r) => !r.pass);
  console.log(`\nselftest: ${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

run();
```

- [ ] **Step 2: 跑自测，确认绿**

Run: `node scripts/check-anchors.mjs --selftest`
Expected: `selftest: 9/9 passed`，退出码 0。（2026-11-03 已把这份脚本原样跑过一遍：`--check` 语法通过、夹具 9/9 全绿，九条断言就是上面代码里的九次 `check(...)`。）

- [ ] **Step 3: 对当前 `dist` 跑真实校验，确认它现在**（且应当）**报红**

Run: `pnpm build && node scripts/check-anchors.mjs; echo "exit=$?"`
Expected（2026-11-03 在当前 HEAD 的 `dist` 上实测到的输出）：一行 `✗ 站内每个锚点都指向存在的 id，且取值在 §6 集合内`，明细 12 条 = 8 条「锚点不在 §6 允许的集合里」（`#pain #diff #persona #import #data #roadmap #pricing #waitlist`）+ 4 条「缺少 id」（两份首页各缺 `faq` 与 `next`），尾部 `anchors=11 pages=4`、`=== ANCHOR CHECK FAILED (1) ===`、`exit=1`。**这是本任务的正确结果**（旧锚点还在、新 id 还没落），不要为了让它变绿而放宽 `ALLOWED`。红是本任务交给 Task 13 的凭据。

- [ ] **Step 4: 提交**

```bash
git add scripts/check-anchors.mjs
git commit -m "feat(check): 补最小断链守卫，锚点取值钉死 §6 的五区集合"
```

---

## Task 2: 问答区成形——撤规格条、改 id、Q6 重写

**Files:**
- Modify: `src/components/blocks/Faq.astro`（`:9` 撤 `const spec`；`:17` id；`:19` eyebrow；`:29-34` 撤 `.spec` 段；`:92-114` 与 `:115-124` 撤样式）
- Modify: `src/content/copy/faq.json`（`eyebrow` 序号、`6a` 中英重写）
- Delete: `src/content/copy/spec.json`（8 枚叶子，唯一消费者是本组件）

**Interfaces:**
- Consumes: 无。
- Produces: 问答段的 section id 由 `waitlist` 变 `faq`（NB-14）；`copy.spec` 从此不存在（Task 5/6 依赖这条：站内那句「Windows / macOS / Linux」就在这枚 `pv` 叶子里，它消失后平台口径只剩 JSON-LD 一处）。

- [ ] **Step 1: 改 `faq.json` 的两处**

`eyebrow` 两半只换序号（NB-2/NB-11，标签词「常见问题 / FAQ」保留）：

```json
  "eyebrow": {
    "zh": "05 · 常见问题",
    "en": "05 · FAQ"
  },
```

`6a` 按 NB-18 重写——只陈述没定日期、**不指任何控件**（不指下载、不指 Issues、不指名单），问句 `6q` 不动：

```json
  "6a": {
    "zh": "还在内测迭代，没有对外公布的日期。可下载版本就绪时，会在这个站点上公布。",
    "en": "Still in private iteration, with no published date. When a downloadable build is ready, we'll say so here on the site."
  }
```

- [ ] **Step 2: 撤规格条**

`Faq.astro:9` 删 `const spec = copy.spec;`；`:29-34` 整段删：

```astro
    <div class="spec">
      <span class="chip"><span>{spec.p}</span><span class="mono">{spec.pv}</span></span>
      <span class="chip"><span>{spec.m}</span><span class="mono">{spec.mv}</span></span>
      <span class="chip"><span>{spec.g}</span><span class="mono">{spec.gv}</span></span>
      <span class="chip"><span>{spec.u}</span><span class="mono">{spec.uv}</span></span>
    </div>
```

样式段 `:92-114`（`.spec` / `.spec .chip` / `.spec .chip .mono`）与 `:115-124` 媒体查询里的 `.spec` 两条一起删；`@media (max-width: 640px)` 块删空后整块删。

- [ ] **Step 3: 改 id**

`Faq.astro:17`：`<section class="reveal faq-sec" id="waitlist">` → `<section class="reveal faq-sec" id="faq">`。
**此刻 `#waitlist` 站内已无被指向的落点，而四处引用还在指它**（`SiteNav.astro:47`、`Hero.astro:38`、`SiteFooter.astro:22`、`Privacy.astro:30`）——断链在本任务成立、由 Task 4 收口。这正是把 Task 4 排在 Task 3 之后的原因，别提前改。

- [ ] **Step 4: 删 `spec.json`，构建 + 校验**

```bash
git rm src/content/copy/spec.json
pnpm build && pnpm check
```
Expected: `leaves=269 pages=4 missing=0 en-cjk=0`（277 − 8）、`=== COPY CHECK PASSED ===`、`=== TOKEN CHECK PASSED ===`。若报 `MISS zh spec.*` 说明 Step 2 漏撤了引用。

- [ ] **Step 5: 提交**

```bash
git add src/components/blocks/Faq.astro src/content/copy/faq.json src/content/copy/spec.json
git commit -m "feat(home): 问答区撤运行要求规格条，Q6 改为只陈述没定日期（NB-17/NB-18）"
```

---

## Task 3: 05 区 CTA 段成形——彻底撤掉等待名单表单

**Files:**
- Modify: `src/components/blocks/Cta.astro`（`:2` 撤 import；`:12` 加 id；`:16` 副句；`:17-28` 撤表单；新增隐私一行；`:47-51` 注释重写）
- Modify: `src/content/copy/cta.json`（`sub` 重写；删 `formph/formq/btn/formerr/formok/formnote` 六叶；新增 `privacy`）
- Modify: `src/styles/global.css`（删 `:302-423` 的 `.waitlist*` 全段与 `:467-474` 媒体查询里的两条）
- Delete: `src/components/WaitlistForm.astro`、`src/content/copy/form.json`
- **不动**：`edge/waitlist/`（Worker + `wrangler.toml`）——§4.5 明写关停是独立动作，等维护者发话。

**Interfaces:**
- Consumes: 无。
- Produces: `<section class="cta" id="next">` —— Task 4 的四处 `#waitlist` 改口指向它。只补 `id`，**不加 `reveal`**：首屏 Hero（`Hero.astro:26`）与收尾 CTA 是全站仅有的两个不带 `reveal` 的区块（其余十个都带），「两头不淡入」是既有选择，spec 没要求改。

顺带修掉一处既有错指：`Cta.astro:12` 的开标签是 `<section class="cta">`，**从来没有 id**，全站唯一的 `id="waitlist"` 落在 `Faq.astro:17`（实测 `dist/zh/index.html` 里 `id="waitlist"` 只有一枚）。也就是说今天所有「加入内测」的按钮都跳到问答区，而不是行动区。Task 2 把问答区改成 `id="faq"`、本任务给 CTA 补 `id="next"`，两下合起来才把这条指错的路拆开——这不是新增耦合，是收既有断链。

- [ ] **Step 1: 改 `cta.json`**

`sub` 现值「加入内测名单，拿到第一版时第一批通知你」指向已被裁撤的名单控件，与 Task 2 处理 Q6 是同一条理由（§7 时态红线 + 方案稿「说过的话现在还得算数」）——按 NB-18 的口径重写，同样不指任何控件：

```json
  "sub": {
    "zh": "现在还在内测迭代，没有对外公布的日期；可下载版本就绪时会在这里说。",
    "en": "Still iterating in private, with no published date — we'll say it here when a downloadable build is ready."
  },
```

新增一枚叶子（Step 3 的隐私一行用它；说法与隐私页那张路径表一致，是「去哪里核对」而不是承诺）：

```json
  "privacy": {
    "zh": "哪些内容可能离开你的机器，「隐私与数据声明」逐条列着。",
    "en": "What can leave your machine is listed path by path in the privacy statement."
  }
```

删掉六枚表单叶子：`formph`、`formq`、`btn`、`formerr`、`formok`、`formnote`（`title` 与 `sub` 保留）。

- [ ] **Step 2: 改 `Cta.astro` 的 frontmatter 与结构**

删除 `:2` 的 `import WaitlistForm from '@/components/WaitlistForm.astro';`，加上页脚同款的语言根计算（隐私行要跨语言正确落点）：

```astro
---
import type { Copy } from '@/lib/copy';
import { leafKey } from '@/lib/copy';
import { localePath } from '@/lib/locales';

interface Props {
  copy: Copy;
}
const { copy } = Astro.props;
const cta = copy.cta;
const home = localePath(leafKey(Astro.currentLocale));
---
```

section 开标签与段内标记收成：

```astro
<section class="cta" id="next">
  <div class="wrap">
    <div class="cta-box">
      <h2>{cta.title}</h2>
      <p class="lead">{cta.sub}</p>
      <p class="cta-priv"><a href={`${home}privacy/`}>{cta.privacy}</a></p>
      <svg class="cta-ghost" …>（原 :29-37 整段不动）</svg>
    </div>
  </div>
</section>
```

`:47-51` 那段讲「输入件（`--surface-3` 凸面，见 global.css 的 `.waitlist.on-dark`）」的注释随表单消失失效，重写成一句：面板按判面规则落卡片档 `--surface-2`，辉光与发丝线承担反白关系（`.cta-box::before` 的 `--glow-strong` 仍是该令牌唯一消费者，§4.5）。

- [ ] **Step 3: 补隐私一行的样式**

`.cta-box` 里 `::before`（径向辉光）与 `.cta-ghost`（`z-index: 0`）都盖在内容上，原表单靠 `.waitlist.on-dark { position: relative }` 浮起来；那条样式本任务删掉，所以必须给新行同等的定位，否则这行字会沉到幽灵插图底下：

```css
  .cta-box .cta-priv {
    position: relative;
    margin: 26px auto 0;
    font-size: 13.5px;
    color: var(--text-2);
  }
  .cta-box .cta-priv a {
    color: var(--accent-300);
  }
```

（`--accent-300` 按 spec §5.3 正是「正文内链接」那一档；`.cta-priv` 不带表单后与 `.cta-ghost` 的 `bottom: -44px` 不再叠字——见本任务 Step 5 的目视确认。）

- [ ] **Step 4: 删文件与样式段**

```bash
git rm src/components/WaitlistForm.astro src/content/copy/form.json
```
`global.css`：删 `:302`（含那条分节注释）到 `:423` 的 `.waitlist*` / `.waitlist-note` / `.waitlist.on-dark*` 全段；删 `:467-474` 媒体查询里的 `.waitlist { max-width: none }` 与 `.waitlist input, .waitlist button, .waitlist textarea { flex: 1 1 100% }` 两条（`:455-466` 的 `.wrap` / `.nav-inner` 保留）。

- [ ] **Step 5: 验证**

```bash
pnpm build && pnpm check
grep -rn 'waitlist' src/components src/styles --include='*.astro' --include='*.css'
```
Expected: `leaves=259`（269 − 5 `form.json` − 6 表单叶子 + 1 `cta.privacy` = 259）、双语 `PASSED`。grep 在这一步**不会清零**，命中的必须全是「入站引用」一类，没有一条是表单本体：`Hero.astro` 的 `href="#waitlist"`、`SiteFooter.astro` 的注释与 `href`、`Privacy.astro` 的 `href`（另加那条 `['Waitlist']` 路径行，见文末待裁决项 8）、`SiteNav.astro` 的 `chapters` 条目与 `href`——分别由 Task 4、Task 5 收口。**若命中 `WaitlistForm`、`.waitlist {`、`on-dark` 之类，说明本任务还有引用或样式没撤干净。** 再开 `prefers-reduced-motion: reduce` 用 `pnpm preview` 扫一眼 CTA 面板：大标题 + 副句 + 隐私行三层不叠字、辉光不盖字。

- [ ] **Step 6: 提交**

```bash
git add src/components/blocks/Cta.astro src/content/copy/cta.json src/styles/global.css
git commit -m "feat(home): 撤掉等待名单表单，05 区 CTA 段收成标题+副句+隐私一行（NB-13）"
```

---

## Task 4: 四处入站引用改口 `#waitlist` → `#next` + 三处标签改口「怎么拿到」 + 页脚成形

**Files:**
- Modify: `src/components/SiteNav.astro:47`、`src/components/blocks/Hero.astro:38`、`src/components/blocks/SiteFooter.astro:11-13,22`、`src/components/pages/Privacy.astro:30`
- Modify: `src/content/copy/foot.json`（删 `beta` 叶）、`src/content/copy/nav.json`（`cta` 改口）、`src/content/copy/hero.json`（`cta1` 改口）

**Interfaces:**
- Consumes: Task 3 产出的 `id="next"`；Task 2 把旧落点 `id="waitlist"` 改成了 `id="faq"`。
- Produces: `#next` 的四个入站引用；`#faq` 尚无站内引用（NB-14 判定改名零风险，保持）；`nav.cta` 与 `hero.cta1` 的新口径（Task 7 改 `Hero.astro` 时不碰这两枚叶子的值）。

- [ ] **Step 1: 三处同构改口 + 两枚标签叶子改口**（第四处引用在页脚，随 §4.5 清单整条撤，见 Step 2）

```
SiteNav.astro:47     href="#waitlist"                → href="#next"
Hero.astro:38        href="#waitlist"                → href="#next"
Privacy.astro:30     href={`${home}#waitlist`}       → href={`${home}#next`}
```

三处 `href` 换名的同时，标签必须一起换——它们今天全写着「加入内测」，而改口后指向的是 05 区那句「没有对外公布的日期」：按钮承诺了一段文字明确说还没发生的事。**这一条已于 2026-11-03 由维护者裁决**（作用域＝两枚叶子三处生效，措辞＝「怎么拿到」，因为 05 区现在回答的就是「怎么拿到」）：

```json
  "cta": {
    "zh": "怎么拿到",
    "en": "How to get it"
  }
```

```json
  "cta1": {
    "zh": "怎么拿到",
    "en": "How to get it"
  }
```

`nav.cta` 被顶栏（`SiteNav.astro:47`）与隐私页返回按钮（`Privacy.astro:30`）共用，一改两效；`hero.cta1` 只管首屏那颗。`hero.cta2`（「看它怎么工作」/ "See how it works"，指 `#how`）**不动**——两颗主/次按钮因此读作「怎么拿到」＋「看它怎么工作」，一个讲获取路径、一个讲机制，不重复。两枚都是改写，计数不变，不影响任何一步的 `leaves=`。

- [ ] **Step 2: 页脚按 §4.5 的四条清单收口**

`SiteFooter.astro`：删 `:22` 的 `<a href={`${home}#waitlist`}>{foot.beta}</a>`（页脚只留 发布仓库、Issues、隐私三条链接），并加语言切换；`:11-13` 的 `home`/注释随最后一个 `${home}` 消费者消失一起撤（`localePath(here, 'privacy/')` 仍用 `here`，所以 `leafKey` 与 `localePath` 两个 import 留着）：

```astro
---
import type { Copy } from '@/lib/copy';
import { leafKey } from '@/lib/copy';
import { localePath } from '@/lib/locales';
import LangSwitch from '@/components/LangSwitch.astro';

interface Props {
  copy: Copy;
}
const { copy } = Astro.props;
const foot = copy.foot;
const here = leafKey(Astro.currentLocale);
const releases = 'https://github.com/liqms/wrisp-releases';
---
```

`<footer>` 内收成（`.foot-links` 里补 `<LangSwitch />`，NB-4「顶部只留 品牌 + 语言 + 一个主行动」之外，页脚是 §4.5 点名的第二处语言切换落点）：

```astro
<footer>
  <div class="foot-inner">
    <span class="foot-brand">◆ Wrisp</span>
    <span>{foot.copy}</span>
    <div class="foot-links">
      <LangSwitch />
      <a href={releases} target="_blank" rel="noopener">{foot.releases}</a>
      <a href={`${releases}/issues`} target="_blank" rel="noopener">{foot.feedback}</a>
      <a href={localePath(here, 'privacy/')}>{foot.privacy}</a>
    </div>
  </div>
</footer>
```

`foot.json` 删 `beta` 叶子（中英成对的一枚，撤链接即成孤儿）。

- [ ] **Step 3: 验证**

```bash
pnpm build && pnpm check && node scripts/check-anchors.mjs
grep -rn '#waitlist' src ; grep -rn '加入内测\|Join beta\|Join the beta' src
```
Expected: `leaves=258`（259 − 1 `foot.beta`，两枚标签叶子是改写、不计数）；`grep '#waitlist'` **零命中**；「加入内测」那条也**零命中**（`cta.sub`/`formok` 已在 Task 3 走掉，`foot.beta` 本任务删，`nav.cta` 与 `hero.cta1` 本任务改口——至此全站不再有一句「加入内测」）。`node scripts/check-anchors.mjs` 此时仍报红，但红的内容必须**只剩目录类锚点**——`SiteNav.astro:14-26` 的 `chapters` 引用的 `{pain, diff, persona, import, data, roadmap, pricing}` 全部不在 `ALLOWED` 集合里（`{top, how, proofs, faq, next}`），`#waitlist` / `#next` 相关条目全部消失。这条收窄就是本任务的凭据。

- [ ] **Step 4: 提交**

```bash
git add src/components/SiteNav.astro src/components/blocks/Hero.astro src/components/blocks/SiteFooter.astro src/components/pages/Privacy.astro src/content/copy/foot.json src/content/copy/nav.json src/content/copy/hero.json
git commit -m "fix(home): #waitlist 改口 #next，三处标签与页脚四条清单一起收口（NB-14）"
```

---

## Task 5: 导航层退役——`chapters`、左侧目录、吸顶步进器与其脚本

**Files:**
- Modify: `src/components/SiteNav.astro`（`:10` 撤 `bn`；`:12-27` 撤 `chapters`；`:30-40` 撤 `.blocknav`；`:51-57` 撤 `.chapter`；`:59-107` 撤脚本）
- Modify: `src/styles/global.css`（`:96` 注释重写；删 `:196-240`、`:242-300`、`:436-443`、`:449-454`、`:455-459`）
- Modify: `src/content/copy/nav.json`（删 `toc/chapter/prev/next` 四叶，留 `cta`）
- Delete: `src/content/copy/bn.json`（11 枚叶子，唯一消费者是 `chapters`）

**Interfaces:**
- Consumes: Task 4 已把 `SiteNav:47` 指到 `#next`，所以撤掉目录后主行动仍有落点。
- Produces: 全站 `href="#…"` 取值只剩 `{#top, #how, #proofs, #faq, #next}` 加首页 `<main id="top">`；`--chapter-*` 两枚令牌变零消费者（Task 6 撤）。

- [ ] **Step 1: `SiteNav.astro` 收成 12 行**

```astro
---
import type { Copy } from '@/lib/copy';
import LangSwitch from '@/components/LangSwitch.astro';

interface Props {
  copy: Copy;
}
const { copy } = Astro.props;
const nav = copy.nav;
---

<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="#top"><span class="dot">◆</span>Wrisp</a>
    <div class="nav-spacer"></div>
    <LangSwitch />
    <a class="btn btn-primary btn-sm nowrap" href="#next">{nav.cta}</a>
  </div>
</header>
```

`:12-13` 那条「章节清单是三者的唯一来源」「吸顶 header 必须排在 `.chapter` 之前」的注释随 `chapters` 一起消失——NB-4 裁定三件导航全退役，这条 DOM 约束不复存在。**不留注释备份**：读不到被删的东西，注释也就无从佐证。

- [ ] **Step 2: `global.css` 删样式段**

删四段：`:196-240`（含「左侧微缩目录（signature）」分节注释与 `.blocknav*` 全部）、`:242-300`（「≤1180px 的替代」分节注释与 `.chapter*` 全部）、`:436-443`（整个 `@media (max-width: 1180px)` 块——两条规则都是目录/章节条的显隐）、`:449-454`（整个 `@media (max-width: 560px)` 块——只装着 `.chapter` 的一条）。
`:455-466` 的 `@media (max-width: 640px)` 块**保留**，但删掉块内的 `.chapter { display: none }` 与它上面那条 v0.29 裁决注释（`:456-459`），留 `.wrap` 与 `.nav-inner` 两条。
`:96` 的分节注释改为：`/* ---------- 顶部导航：品牌 + 语言 + 一个主行动；章节定位交给滚动与各区 eyebrow ---------- */`。

- [ ] **Step 3: 文案收孤儿**

```bash
git rm src/content/copy/bn.json
```
`nav.json` 只留 `cta` 一枚：

```json
{
  "cta": {
    "zh": "怎么拿到",
    "en": "How to get it"
  }
}
```
`cta` 的值是 Task 4 Step 1 改口后的现值（维护者裁决：两枚标签叶子都改），**不是**本计划初稿写的「加入内测」——照旧值抄会把 `fae54c5` 回滚掉。

- [ ] **Step 4: 验证**

```bash
pnpm build && pnpm check
grep -rniE 'blocknav|chapter|chapters' src | grep -v 'scroll-padding'
```
Expected: `leaves=243`（258 − 4 枚 `nav` 叶子 − 11 枚 `bn` 全件）；grep 只剩 `tokens.css:125` 的 `scroll-padding-top`（Task 6 处理）与 `tokens.css:42/112/204` 的 `--chapter-*` 声明，**组件与 global.css 零命中**（§5 那条「46 处命中全部清零」的实测口径）。`node scripts/check-anchors.mjs` **本步只收窄、不转绿**（初稿说「从这一步起转绿」是错的）：目录类锚点随 `chapters` 一起消失，但 `persona.json:45/52/96/111` 还有三枚跨区链接 `#import`/`#data`/`#roadmap` 指向仍在装配的区块，它们随 Task 8 删 Persona 一起走。本任务的凭据是**残余项只剩这三条 persona 出发的链接**，一条不多。

- [ ] **Step 5: 提交**

```bash
git add src/components/SiteNav.astro src/styles/global.css src/content/copy/nav.json src/content/copy/bn.json
git commit -m "refactor(nav): 章节目录与吸顶步进器整件退役，导航层零锚点（NB-4/NB-5）"
```

---

## Task 6: 令牌连带——撤 `--chapter-bg` / `--chapter-h`

**Files:**
- Modify: `src/styles/tokens.css`（`:42` 撤 `--chapter-bg`；`:112` 撤 `--chapter-h`；`:125` 改 `scroll-padding-top`；`:204` 撤打印块那条覆写；`:41` 分节注释「有了这四个」变三个）

**Interfaces:**
- Consumes: Task 5 让两枚令牌变零消费者。
- Produces: 打印块声明数 30 → 29；`check-tokens.mjs` 的 `tokens=` 从 65 变 63。

- [ ] **Step 1: 四处改完**

`:42` 删 `--chapter-bg: rgba(11, 13, 18, 0.9);` 并把 `:39-40` 注释里的「四个」改「三个」；`:112` 删 `--chapter-h: 44px;`；`:204` 删 `--chapter-bg: rgba(255, 255, 255, 0.94);`（打印块剩 29 条声明）；`:125`：

```css
  scroll-padding-top: calc(var(--nav-h) + 12px);
```

（NB-10：`--nav-bg` 保留——顶部吸顶仍在；`scroll-padding-top` 原先引 `--chapter-h`，撤销必须同改此行，§3 前提核实表第四行点名的就是这个消费者。）

- [ ] **Step 2: 验证**

```bash
pnpm build && pnpm check
grep -rn 'chapter' src
awk '/@media print/,0' src/styles/tokens.css | grep -c '^\s*--'
```
Expected: `tokens=63`（现在是 65，`check-tokens.mjs` 只数 `:root` 里的令牌名，删两枚即减二）、双语 `PASSED`；`grep 'chapter' src` **零命中**；最后一条 awk 打印 **29**（现在实测 30；它数的是打印块内的自定义属性声明，不是选择器行）。

- [ ] **Step 3: 提交**

```bash
git add src/styles/tokens.css
git commit -m "refactor(tokens): 撤销零消费者的 --chapter-bg/--chapter-h，scroll-padding-top 同改（NB-10）"
```

---

## Task 7: 02 区上线 + 痛点上收首屏

**Files:**
- Create: `src/content/copy/features.json`、`src/components/blocks/Features.astro`
- Modify: `src/components/Home.astro`（`:5` 的 Pain import 换成 Features、`:44` 换标签）
- Modify: `src/components/blocks/Hero.astro`（`:30` eyebrow、`:35` 后插处境句、`:120-146` 样式换段）
- Modify: `src/content/copy/hero.json`（`kicker` 加 `01 ·` 前缀、新增 `situation`）
- Delete: `src/components/blocks/Pain.astro`、`src/content/copy/pain.json`

**Interfaces:**
- Consumes: 无（02 区 id 不需要——§6 允许的锚点集合里没有它）。
- Produces: `copy.features`（8 叶）；`hero.situation`；01 区带编号 eyebrow，NB-11 的「eyebrow 全线 `01–05`」从这里起头。

- [ ] **Step 1: 新建 `features.json`**（三张卡按 §4.2 表；红线：不写价格数字、不写 Pro/Team 对照、不描述市场页界面形态）

```json
{
  "eyebrow": {
    "zh": "02 · 产品特性",
    "en": "02 · Product features"
  },
  "title": {
    "zh": "三件你现在就能核验的事",
    "en": "Three things you can check today"
  },
  "1t": {
    "zh": "本地笔记还是你的",
    "en": "Your local notes stay yours"
  },
  "1b": {
    "zh": "现有目录指进来就能用，不转格式、不重打标；记录与作品都是你文件夹里的 Markdown，想走随时原样带走。",
    "en": "Point it at your folder and go — no conversion, no re-tagging. Entries and works are Markdown you can take with you as they are."
  },
  "2t": {
    "zh": "Community 免费",
    "en": "Community is free"
  },
  "2b": {
    "zh": "当前阶段的能力完整可用；AI 用量走你自己的 Key，模型账单落在你的账户上，不经我们。",
    "en": "Everything in the current stage is usable; AI usage runs on your own key, billed to your account, never through us."
  },
  "3t": {
    "zh": "模板与技能",
    "en": "Templates and skills"
  },
  "3b": {
    "zh": "取用别人整理好的结构与能力，装好就能用在你自己的作品里。",
    "en": "Take a structure or an ability someone else put up, install it, and use it inside your own work."
  }
}
```

- [ ] **Step 2: 新建 `Features.astro`**

```astro
---
import type { Copy } from '@/lib/copy';

interface Props {
  copy: Copy;
}
const { copy } = Astro.props;
const features = copy.features;
const cards = ['1', '2', '3'];
---

<section class="reveal">
  <div class="wrap">
    <div class="eyebrow">{features.eyebrow}</div>
    <h2 class="h-2">{features.title}</h2>
    <div class="feat-grid">
      {cards.map((n) => (
        <div class="feat-card">
          <span class="tick" aria-hidden="true">✓</span>
          <h3>{features[`${n}t`]}</h3>
          <p>{features[`${n}b`]}</p>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
  /* §4.2：≥900px 三列并排，以下一行一张——不留「两列 + 一张跨列」那种第三态 */
  .feat-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 44px;
  }
  .feat-card {
    border: 1px solid var(--hair-1);
    border-radius: var(--r-card);
    background: var(--surface-2);
    padding: 24px 26px 26px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .feat-card .tick {
    font-family: var(--mono);
    font-size: 14px;
    /* 非正文强调走 --accent-400（--accent-300 被 spec §5.3 锁给链接与焦点环） */
    color: var(--accent-400);
  }
  .feat-card h3 {
    font-size: 17px;
  }
  .feat-card p {
    font-size: 14px;
    color: var(--text-2);
  }
  @media (min-width: 900px) {
    .feat-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
```

- [ ] **Step 3: `Home.astro` 换装配**

`:5` `import Pain from '@/components/blocks/Pain.astro';` → `import Features from '@/components/blocks/Features.astro';`；`:44` `<Pain copy={copy} />` → `<Features copy={copy} />`（位置不变：紧跟 `<Hero />`）。

- [ ] **Step 4: 首屏上收痛点**

`hero.json`：`kicker` 两半加序号前缀（NB-11 要求各区 eyebrow 同号，01 区此前只有胶囊无编号）：

```json
  "kicker": {
    "zh": "01 · 本地优先 · 个人创作 AI",
    "en": "01 · Local-first · Personal creation AI"
  },
```

新增处境句叶子（三痛点压成一行，中点分隔、不加句号；判据见 §7.4——只陈述读者现状，不表达愿望，因此不构成品牌口径的第三句，也不得复用到 OG 或 README）。**措辞已于 2026-11-03 由维护者裁决为「三个名词短语」版**（spec §9 余下唯一待裁决项就此闭合）：

```json
  "situation": {
    "zh": "散落的记录 · 沉底的收藏 · 调不回来的记忆",
    "en": "scattered notes · sunken saves · memory you can't call back"
  }
```

`Hero.astro`：`:30` 的胶囊换成全局 eyebrow 装置（`.eyebrow` 自带 `--text-3` + mono + 尾随发丝线，与其余四区同形）：

```astro
        <div class="eyebrow">{hero.kicker}</div>
```

`:35`（`<p class="lead">{hero.sub}</p>`）之后插一行——**必须在首帧静态渲染里就存在**，它是服务端渲染的普通 `<p>`，不是动画增量：

```astro
        <p class="situation">{hero.situation}</p>
```

样式：删 `:120-138` 的 `.hero .kicker` 与 `:139-146` 的 `.hero .kicker .kicker-dot`（胶囊与其绿点整件退役；`--ok` 仍被 `.road-note .pulse` 与 Proofs 的 `.box` 消费，不成孤儿），补一条：

```css
  .hero .situation {
    margin-top: 12px;
    max-width: 640px;
    /* §4.1：--text-2 一行、--fs-lead 档；三段中点分隔，不加句号 */
    font-size: var(--fs-lead);
    color: var(--text-2);
  }
```

- [ ] **Step 5: 删 Pain 件**

```bash
git rm src/components/blocks/Pain.astro src/content/copy/pain.json
```

- [ ] **Step 6: 验证**

```bash
pnpm build && pnpm check
grep -rn 'kicker\|pain' src
```
Expected: `leaves=242`（243 + 1 situation + 8 features − 10 pain）、`tokens=63 baseline=0`（Task 6 起就是 63，初稿写的 65 已过期）；`PASSED ×2`；grep **只对 `pain` 零命中**——`kicker` 那枚叶子是 Step 4 逐字保留的（`hero.kicker` 加 `01 ·` 前缀、`Hero.astro` 仍渲染它），命中「`kicker` 也要零」等于要求改名，那是另一件微任务，本任务不做（`.band` 类的一次消费者 Pain 消失；§5 首行的「三件删除」里 Pain 的处境句已按 NB-3 上收，不算内容丢失）。**中文残留检查顺带复核**：EN 首页的处境句须是全英文，`en-cjk=0` 已拦。

- [ ] **Step 7: 提交**

```bash
git add src/content/copy/features.json src/components/blocks/Features.astro src/components/Home.astro src/components/blocks/Hero.astro src/content/copy/hero.json src/components/blocks/Pain.astro src/content/copy/pain.json
git commit -m "feat(home): 新增 02 产品特性区，三痛点压成首屏处境句（NB-3/NB-6）"
```

> **处境句措辞已闭合（2026-11-03 维护者裁决）**：spec §9 余下唯一待裁决项选了「三个名词短语」版，Step 4 的那份就是定稿，直接落站，不再等文案轮。

---

## Task 8: 删 Diff 与 Persona（含 L2 落点去掉）

**Files:**
- Delete: `src/components/blocks/Diff.astro`、`src/components/blocks/Persona.astro`、`src/content/copy/diff.json`、`src/content/copy/cmp.json`、`src/content/copy/persona.json`
- Modify: `src/components/Home.astro`（`:6`、`:8` 两行 import 与 `:45`、`:47` 两行标签删除）

**Interfaces:**
- Consumes: 无。
- Produces: NB-9 的「强调装置收到一处」自动达成（`.accent` 的第二个用户是 `Diff.astro:15`）；L2 那句在首页正文的唯一落点随 `diff.json` 的 `title`/`title2` 消失——**按第三轮裁决不补落点**，`meta.json:7-8`/`:15-16` 两份元数据原样保留（撤落点不撤措辞，NB-3 继续生效）。

- [ ] **Step 1: 删五件 + 摘装配**

```bash
git rm src/components/blocks/Diff.astro src/components/blocks/Persona.astro src/content/copy/diff.json src/content/copy/cmp.json src/content/copy/persona.json
```
`Home.astro` 删 `:6` `import Diff…`、`:8` `import Persona…`，以及 `<main>` 里的 `<Diff copy={copy} />`、`<Persona copy={copy} />` 两行。

- [ ] **Step 2: 确认「论述上收」不丢内容**

Diff 的 `qualLead`「分身替你起草，你负责判断。」＋ `qualRest` 那段判断权论述按裁决上收进首屏 V1 兑现句。**现状核对**：`hero.guard` 已经承载同一口径（「现在能用上的是它的记忆底座……在你写东西时找回来」），`road.v3b` 尾句「判断权仍在你在」是 V3 阶段的口径而非现状承诺——所以本任务**不改写 `hero.guard`**，只如实记一句：L2 的论述侧没留下新句子（裁决要撤的正是它在首页的落点）。若要给论述补一句，那是重开 NB-9，不在本计划范围。

- [ ] **Step 3: 验证**

```bash
pnpm build && pnpm check
grep -rn 'class="[^"]*accent' src
```
Expected: `leaves=211`（242 − 5 diff − 7 cmp − 19 persona）；`PASSED ×2`；grep 只剩 `Hero.astro:33` **一处** `.accent`（NB-9 的验收口径就是这一条）。

- [ ] **Step 4: 提交**

```bash
git add src/components/Home.astro src/components/blocks/Diff.astro src/components/blocks/Persona.astro src/content/copy/diff.json src/content/copy/cmp.json src/content/copy/persona.json
git commit -m "feat(home): 删除对比区与身份路由区，强调装置收到首屏一处（NB-2/NB-9）"
```

---

## Task 9: 03 区合并——`Work.astro` 吸收 `Roadmap.astro`

**Files:**
- Modify: `src/components/blocks/Work.astro`（`:11` 去 `.band`；`:37`（`.steps` 闭合）之后、`:38`（`.wrap` 闭合）之前插入阶段段整块；样式段追加 Roadmap 的 `:58-197`——`<style>` 在 `:57`、`</style>` 在 `:198`，只搬规则本身，追加进 `Work.astro` 现有 `<style>`（`:41`–`:104`）末尾）
- Delete: `src/components/blocks/Roadmap.astro`
- Modify: `src/content/copy/work.json`（`eyebrow` 序号 `04 ·`→`03 ·`）
- Modify: `src/content/copy/road.json`（删 `eyebrow`；新增 `pro`；重写 `note`）
- Modify: `src/components/Home.astro`（删 Roadmap 的 import 行与其标签行；T8 删完两区后实为 `:10` import 与 `:47` 标签——**本计划的行号是按 `2216bfb` 写的，越往后的任务漂移越大，执行时以 grep 定位为准**）

**Interfaces:**
- Consumes: 无。
- Produces: `<section class="reveal" id="how">` 内含四步 + 阶段段（id 沿用 `how`，`Hero.astro:39` 的次行动因此不断链，NB-14）。`work.json` 与 `road.json` **不合并文件**（§5：coverage 按叶子回比产物、不看文件边界，合并零收益还会让阶段口径的改动混进四步的 diff）。

- [ ] **Step 1: 改两份文案**

`work.json`：`"eyebrow": { "zh": "03 · 工作流", "en": "03 · Workflow" }`（只换序号）。

`road.json`：删 `eyebrow` 叶子——合并后 03 区只有一个 eyebrow（NB-11 的 `01–05` 容不下一区两个编号）；`title` 留着当阶段段的小节标题。新增 Pro 归属句（NB-6：定价区删除后由阶段段一句话承担；措辞沿用被删的 `price.body` 那一句，属**搬迁不是重复**，与问答 Q2 的写法不同，满足 §6「同一能力 ≤2 次、措辞不得互相复制」）：

```json
  "pro": {
    "zh": "Pro 从下一阶段起提供，卖的是同步与便利，基础能力不靠它解锁。",
    "en": "Pro arrives with the next stage, selling sync and convenience rather than unlocking basics."
  },
```

重写 `note`（现值「——先留个邮箱」指向 Task 3 已撤的表单，与 Q6 同一条理由）：

```json
  "note": {
    "zh": "现在还在内测迭代，这一页没有下载按钮；就绪时会在这里公布。",
    "en": "Still iterating in private, so there's no download button on this page; we'll announce it here when it's ready."
  }
```

- [ ] **Step 2: 搬运阶段段**

把 `Roadmap.astro:11-54` 的 `<section>` 内部（`.wrap` 里的 `.road` 与 `.road-note`，`:15-53`）**逐行搬进** `Work.astro`，插在 `.steps` 闭合的 `</div>`（`:37`）之后、`.wrap` 闭合的 `</div>`（`:38`）之前，并做四处改动。**别加 `<!-- .steps -->` 之类的收束注释**：CI 断言产物 HTML 不含注释（`.github/workflows/deploy.yml`），加了会把构建判红。**另补一件 Files 段没列但必做的：`Work.astro` 的 frontmatter 要加 `const road = copy.road;`**（阶段段搬过来后 `road.*` 才有绑定；`Copy` 是 `Record<string, any>`，漏了它构建不报、运行时才炸）。四处改动：
1. 去掉搬来的 `<section class="band reveal" id="roadmap">` 与其闭合标签——03 区只有一个 section，`.band` 按 NB-15 不再使用，`id` 沿用 `how`。
2. 把 `:13` 的 `<div class="eyebrow">{road.eyebrow}</div>` 与 `:14` 的 `<h2 class="h-2">{road.title}</h2>` 换成一个三级标题（一节之内不得两个 h2，`work.title` 才是本区 h2）：

```astro
      <h3 class="phase-h">{road.title}</h3>
```

3. 在 `.road` 闭合（`:49`）之后、`.road-note`（`:50`）之前插入 Pro 那句：

```astro
      <p class="phase-pro">{road.pro}</p>
```

4. `Roadmap.astro:57-197` 的整段样式搬进 `Work.astro` 的 `<style>` 末尾，追加两条：

```css
  .phase-h {
    margin-top: 72px;
    font-size: var(--fs-3);
    color: var(--text-1);
  }
  .phase-pro {
    margin-top: 18px;
    font-size: 13.5px;
    color: var(--text-2);
    max-width: 720px;
  }
```

搬运时**保留 `Roadmap.astro:96-107` 那条关于「`.filled` 只落在 `.current` 节点」前提的注释**——它点名了 SP-2 的这条约束，现状仍成立（本任务没新增「已完成但非当前」节点）。

- [ ] **Step 3: 摘装配并删件**

```bash
git rm src/components/blocks/Roadmap.astro
```
`Home.astro`：删 `:12` `import Roadmap…` 与 `:51` `<Roadmap copy={copy} />`。`Work.astro:11` 的 `class="band reveal"` 改 `class="reveal"`。

- [ ] **Step 4: 验证**

```bash
pnpm build && pnpm check
grep -rn 'road-row\|road-note\|phase-h' src/components
```
Expected: `leaves=211`（−1 `road.eyebrow` +1 `road.pro`，净不变）；`PASSED ×2`；`.road-row` 命中 **8 行**（3 行标记 + 5 条样式选择器，全在 `Work.astro`——初稿写「4 行」是漏算了 `.road-row::before`、`.road-row.current .pnode`、`.road-row.current .road-body` 与 760px 媒体查询里那条），`Roadmap.astro` 零命中；首页仍只有 `<section id="how">` 一处承载四步与阶段段。开 `prefers-reduced-motion: reduce` 看一眼时间轴呼吸圈（`.pulse`）与主轴左缘线（`.road-row::before`，`--hair-2`）是否仍在——**暗色层那条「左缘靛蓝发丝线要不要用 `--accent-fill` 复活」仍等维护者表态**（§5 倒数第二行），本任务不碰。

- [ ] **Step 5: 提交**

```bash
git add src/components/blocks/Work.astro src/components/blocks/Roadmap.astro src/content/copy/work.json src/content/copy/road.json src/components/Home.astro
git commit -m "feat(home): 工作流与路线图合并为 03 区，Pro 口径落阶段段（NB-6/NB-15）"
```

---

## Task 10: 删 Import / Data / Pricing（内容已压进 02 区）

**Files:**
- Delete: `src/components/blocks/Import.astro`、`Data.astro`、`Pricing.astro`、`src/content/copy/imp.json`、`data.json`、`price.json`
- Modify: `src/components/Home.astro`（`:9`、`:11`、`:13` import 与 `:48`、`:50`、`:52` 标签删除）

**Interfaces:**
- Consumes: Task 7 的 `features.json`（三张卡已承载导入、数据主权、免费口径）。
- Produces: `.band` 的最后一个类外消费者消失（`Import/Data/Pricing` 三个 section 本就没挂 `.band`，只有 Proofs 还挂着 → Task 11 收）。

- [ ] **Step 1: 删九行并删六件**

```bash
git rm src/components/blocks/Import.astro src/components/blocks/Data.astro src/components/blocks/Pricing.astro src/content/copy/imp.json src/content/copy/data.json src/content/copy/price.json
```
`Home.astro` 删三个 import（`:9`/`:11`/`:13`）与 `<main>` 里三行标签（`Import`/`Data`/`Pricing`）。

> **口径差**：§5 的 `Import/Data/Pricing` 那行写「`price.json` 只留『你自己的 Key』这条被卡片引用的叶子」，但 §4.2 明写 02 区「不从被删的 `imp.json / data.json / price.json` 里就地引用——句子重写进新叶子」。两者按 coverage 机制只能取后者：留一条没人渲染的叶子就是孤儿，`pnpm check` 必红。本任务按 §4.2 整件删除。

- [ ] **Step 2: 验证**

```bash
pnpm build && pnpm check
grep -rniE 'imp\.|data\.|price\.' src/components
```
Expected: `leaves=173`（211 − 15 imp − 13 data − 10 price）；`PASSED ×2`；grep 零命中。`data.link`（「看这份清单 →」）指向隐私页的那条随件消失——隐私入口仍在页脚与 CTA 段，不构成断链。

- [ ] **Step 3: 提交**

```bash
git add src/components/Home.astro src/components/blocks/Import.astro src/components/blocks/Data.astro src/components/blocks/Pricing.astro src/content/copy/imp.json src/content/copy/data.json src/content/copy/price.json
git commit -m "feat(home): 删除导入/数据主权/定价三区，内容压进 02 区两张卡（NB-6）"
```

---

## Task 11: 04 区收成四卡 + `--band` 收束带 + 第四张卡中英改口

**Files:**
- Modify: `src/components/blocks/Proofs.astro`（`:11` 去 `.band`、`:16` 信息卡去 `.wide`、`:56-68` 删检索问答卡、`:77` 的 `MAKING WORKS` 改口、`:107-109` 删 `.proof-card.wide` 规则、`:78` 改口、`:83` 后加收束带 + 样式、`:199-222` 删孤儿规则、`:119/140-142` 两处注释改口）
- Modify: `src/content/copy/proof.json`（`eyebrow` 序号、删 `4t/4b/m4q/m4a/m4b`、`5t` 中英改口、新增 `band`）
- Modify: `src/styles/global.css`（删 `:89-94` 的 `.band` 段）

**Interfaces:**
- Consumes: Task 7 起 `.band` 的消费者一路减少（Pain 已删、Work/Roadmap 已去、Proofs 是本任务）。
- Produces: `data-shot` 四枚（`info-cards / todo / report / creation`）；`--band` 令牌的**全站唯一一次**落点；`.band` 类退役（NB-15）；`.proof-card.wide` 与其规则同批退役（四卡等宽，`wide` 在 `src` 归零）。

- [ ] **Step 1: 改 `proof.json`**

```json
  "eyebrow": {
    "zh": "04 · 你会拿到什么",
    "en": "04 · What you get"
  },
```

删五叶（问答卡搬进首屏属 SP-4 的动效件，本任务只是把卡面与它的 5 枚叶子摘干净）：`4t`、`4b`、`m4q`、`m4a`、`m4b`。

第四张卡按 NB-12（上游改名已于 2026-11-03 落地）中英一起改口，`5b` 正文那句**不动**（活动词「写作」保留）：

```json
  "5t": {
    "zh": "创作空间",
    "en": "Creation Space"
  },
```

新增收束带那句（依据是组件自己 `:140-142` 那条注释——五张卡讲的其实是同一批记录长成五种产物；卡数收成四张，这句话正好承担收束）：

```json
  "band": {
    "zh": "同一批记录，长成四种你直接能用的东西。",
    "en": "The same entries, grown into four things you can use directly."
  }
```

- [ ] **Step 2: 改 `Proofs.astro`**

`:11` → `<section class="reveal" id="proofs">`（`.band` 面差带类退役，NB-15）；`:77` 的硬编码产品名标签 `<div class="pname">MAKING WORKS</div>` → `CREATION SPACE`——这枚标签不走文案叶子（五张卡的 `pname` 都是模板里的拉丁大写实物名，coverage 拦不到它），改口必须手改，否则中文卡名读「创作空间」、头顶标签还写「MAKING WORKS」，正是 NB-12 要消灭的那种两套名字并存。`:56-68` 的问答卡整块删除（连它头顶那枚 `RETRIEVAL & Q&A` 一起走）：

```astro
      <div class="proof-card">
        <div class="mock" data-shot="qa">
          … 5 枚叶子 m4q / m4b / m4a + 4t / 4b 的渲染 …
        </div>
        …
      </div>
```

**四卡排法已于 2026-11-03 由维护者裁决为「等宽 2×2」**：问答卡删除后 `repeat(2, 1fr)`（`:90`）会剩「宽—双—单」，末行右侧空一格，读起来像少了一张卡——本轮拆区要避免的正是这种「看着像没做完」。处置是把 `:16` 的信息卡从 `<div class="proof-card wide">` 改成 `<div class="proof-card">`，四卡两行两列等宽；`.proof-card.wide`（`:107-109`，只声明 `grid-column: 1 / -1`）随唯一使用者消失，整条删掉，不留零消费者规则。

**这一步有一个必须目视的风险**：信息卡的 mock 是三行「徽章＋文字」（`:19-21`，`m1t/m1a`、`m1b/m1c`、`m1d/m1e`），从整宽压进半列后可能折行。Step 5 的目视项就是它——三视口都要看，1440 下若那三行出现尴尬折行，**不要自己调 `font-size` 或加 `white-space` 绕过**，报 `DONE_WITH_CONCERNS` 并把现象写进报告，这一条要重新裁（备选是把 `1b` 那句改短，或改回「宽—双—宽」）。

`:83` 的 `</div>`（`.wrap` 闭合）之后、`</section>` 之前插入收束带——它在 `.wrap` 之外，所以横贯整个区宽：

```astro
    <div class="closer">
      <div class="wrap">
        <p>{proof.band}</p>
      </div>
    </div>
```

样式追加（§4.4 硬约束：带上**只许压 `--text-1`**，实测 5.75；`--text-2` 只有 2.83、`--accent-300` 2.63，都不达标）：

```css
  /* NB-7：全站唯一一次换底色落在这里；令牌是 --band，与被退役的 .band 类无关（NB-15） */
  .closer {
    margin-top: 56px;
    padding: 30px 0;
    background: var(--band);
  }
  .closer p {
    font-size: var(--fs-lead);
    color: var(--text-1);
    max-width: 720px;
  }
```

- [ ] **Step 3: 删问答卡留下的孤儿样式与两处过期注释**

问答卡一删，`Proofs.astro` 里两条规则失去全部消费者，随件删除（不留死样式给 SP-5 收尾，也不给它留「看起来还有人用」的假象）：
- `.mock .cite`（`:199-211`）——`cite` 只在那张卡的 `mrow` 里出现三次；
- `.mock .q`（`:212-222`）——`class="q"` 唯一一次出现在 `:59`。

`.doc-p` / `.doc-h` **保留**：创作卡（`:72-73`）仍在用它们。`--badge-meet` / `--badge-meet-bg` 也仍有消费者（`Hero.astro:318-319`、`Proofs.astro:169-170/194`），不会因这次删除变零消费者。

两条注释里的「五张卡」在本任务后是错数，改成与现状一致：`:119`「…让五张卡读作产品截图…」→ 四张；`:140-142` 那条把线索讲成「五张卡长成五种产物」的注释，随 `band` 叶子改口成四种（这条注释正是 `proof.band` 那句的依据，改完要在注释里留下同一句，别让注释和文案各说一套）。

- [ ] **Step 4: 删 `.band` 样式段**

`global.css:89-94` 整段删（那条「交替底色带」的分节注释一并删）。

- [ ] **Step 5: 验证**

```bash
pnpm build && pnpm check
grep -rn 'class="[^"]*band' src ; grep -rn '\.band' src/styles
grep -rc 'data-shot' src/components/blocks/Proofs.astro ; grep -rn '作品创作\|Writing works\|MAKING WORKS\|piece creation' src ; grep -rn 'wide' src
```
Expected: `leaves=169`（173 − 5 张问答卡的五枚叶子 `4t/4b/m4q/m4a/m4b` + 1 `proof.band`）；`PASSED ×2`；第一条 grep 零命中（NB-15「四处引用随件消失」收口）；`data-shot` 四枚；`wide` 那条 grep **零命中**（标记与规则同批退役）；改口 grep **只剩 `meta.json:15-16` 那一条 `jsonldDesc`**（「作品创作」/"piece creation"，见文末待裁决项 7，本任务不动它）——`proof.json` 与 `Proofs.astro` 内的旧名应全部清零。视觉（这一条是本任务的真正关口，等宽 2×2 是裁决选的排法）：`prefers-reduced-motion: reduce` 下 1440/768/390 三视口看四卡——1440 与 768 都是**两行两列等宽**（`.proof-grid` 的断点在 `≤760px`，768 仍走两列）、390 塌成单列四行；重点盯信息卡那三行「徽章＋文字」压进半列后有没有尴尬折行，有就按 Step 2 的约定报 `DONE_WITH_CONCERNS`，不要就地调字号；顺带看收束带 `--band` 上那句 `--text-1` 的对比。

- [ ] **Step 6: 提交**

```bash
git add src/components/blocks/Proofs.astro src/content/copy/proof.json src/styles/global.css
git commit -m "feat(home): 04 区收成四卡并落 --band 收束带，第四卡中英改口创作空间（NB-7/NB-12/NB-15）"
```

---

## Task 12: 平台数改两 + 五区装配终检

**Files:**
- Modify: `src/components/Home.astro`（`operatingSystem`、装配顺序复核、`jsonld` 上方注释）
- Modify: `src/content/copy/stream.json`（首屏演示流里那条「决策」笔记 `incoming[0].text` 的中英两句，`:86-87`；`incoming` 只有两枚，另一枚 `incoming[1]` 是「用户需求」，别改错）

**Interfaces:**
- Consumes: Task 2（问答区那句三平台在 `spec.pv` 里，已消失）。
- Produces: 平台口径只剩 JSON-LD 一处、且为两平台（NB-16）；不留「可见写三、结构化写二」的自相矛盾态。

**2026-11-04 执行期更正（这条是计划与 spec 的一处事实错误，不是新增范围）：** NB-16/NB-17 都写着「站内唯一那句三平台就在 `spec.pv` 里」，实测**不成立**——`stream.json:86-87` 那条演示流笔记「定了：先做三个平台，移动端下阶段」/"Three platforms first, mobile next" 同样出现在两份首页里（`Hero.astro:22` 渲染 `stream.incoming`，产物里可 `grep -o '先做三个平台' dist/zh/index.html` 命中）。只改 JSON-LD 的结果正是本任务要消灭的那个自相矛盾态：可见写三、结构化写二。
**Ruling：同批改口，措辞去数——`zh`「定了：先做桌面，移动端下阶段」／`en` "Desktop first, mobile next"。** 三条理由：① 写「两个平台」会把一个硬数字钉进演示文案，Linux 按 NB-16 走「下一阶段」时它立刻变陈旧，「桌面」不含数所以两头都不破；② 这条笔记的职责是演示「一句话被捕捉并归档」，不是平台规格表，去掉数目不伤它的功能；③ 维护者 2026-11-03 已裁「平台数写两」，把站内最后一处「三」对齐这一裁决是执行裁决，不是重开它。叶子数不变（一对 `zh/en` = 一枚叶子），`leaves=169` 阶梯不受影响。

- [ ] **Step 1: 改两平台**

`Home.astro` 的 `operatingSystem: 'Windows, macOS, Linux'` → `operatingSystem: 'Windows, macOS'`。**改文本不需要包**（NB-16 明写这条属 SP-2，与下载胶囊的平台探测〔SP-3，被发包阻塞〕分家）。Linux 不写「不支持」，按四类措辞留给「下一阶段」。

同一步里把 `stream.json:86-87` 那条笔记改成上面裁决的措辞（`incoming[0].text` 的 `zh`/`en` 两半，别动同级的 `badge`/`type`/`status`/`time`/`dur`）：

```json
      "text": {
        "zh": "定了：先做桌面，移动端下阶段",
        "en": "Desktop first, mobile next"
      },
```

- [ ] **Step 2: 装配复核**

`<main id="top">` 内应当**只剩六行标签、五个可见区**（问答与 CTA 同属 05 区）：

```astro
    <Hero copy={copy} />
    <Features copy={copy} />
    <Work copy={copy} />
    <Proofs copy={copy} />
    <Faq copy={copy} />
    <Cta copy={copy} />
```

逐条对号：`01 ·` Hero（`:30` eyebrow）→ `02 ·` Features → `03 ·` Work（含阶段段，`id="how"`）→ `04 ·` Proofs（`id="proofs"`）→ `05 ·` Faq（`id="faq"`）+ Cta（`id="next"`，按 §4.5 不挂 eyebrow，由大标题承担）。

**这一步是复核，不是编辑**：T7…T11 落完后这六行标签与五个序号已经在位（`2026-11-04` 在 `97bff27` 的 `dist` 实测到五行 `01/02/03/04/05`）。Files 里提的「`jsonld` 上方注释」实测（`Home.astro:16`）只讲「产品实体只在首页声明」，不涉平台数——**不动它**，别顺手改注释。若 Step 3 的 grep 打不出五行，那是前面某一区的 eyebrow 序号没落对，回到对应区修，不要在本任务里补写第二个 `05 ·`。

- [ ] **Step 3: 验证**

```bash
pnpm build && pnpm check
grep -oE '>[0-9]{2} · [^<]+<' dist/zh/index.html dist/index.html
grep -rn 'Linux' src ; grep -rniE '三个平台|three platform' src
grep -o '先做桌面' dist/zh/index.html ; grep -o 'Desktop first, mobile next' dist/index.html
```
Expected: `leaves=169`；`PASSED ×2`；第二条在**两份首页各打五行**，序号自上而下恰为 `01 / 02 / 03 / 04 / 05`，无重无漏（01 在首屏是 `hero.kicker` 那颗胶囊改成的 `.eyebrow`，见待裁决项 6；05 区不按 §4.5 给 CTA 挂 eyebrow，所以只有五行而不是六行）；`grep Linux` 零命中（可见侧随 `spec.json` 消失、结构化侧本批改两）；「三个平台」那条 grep **也零命中**——它是站内最后一处可见的三平台口径，本批改口后 NB-16 才算真的闭合；第三条的两串各命中一次（zh 首页 `先做桌面`、en 首页 `Desktop first, mobile next`）——**这两条是反向证明新措辞真的进了产物**，`pnpm check` 只保证叶子在产物里，措辞改错方向它照样绿。

- [ ] **Step 4: 提交**

```bash
git add src/components/Home.astro src/content/copy/stream.json
git commit -m "feat(home): 五区装配收口，JSON-LD 与演示流笔记一起钉两平台口径（NB-1/NB-16）"
```

---

## Task 13: 把断链守卫接入 `pnpm check` + 全量验收

**Files:**
- Modify: `package.json`（`check` 脚本）
- 只读验收：`dist/**/*.html`、三视口截图、`scripts/color-baseline.json`

**Interfaces:**
- Consumes: Task 1 的 `scripts/check-anchors.mjs`；Task 2…12 把锚点取值收敛到 §6 的集合。
- Produces: `pnpm check` = coverage + tokens + anchors 三闸；CI（`.github/workflows/deploy.yml:115` 跑 `pnpm check`）自动带上锚点守卫，无需改 workflow。

- [ ] **Step 1: 接闸门**

```json
    "check": "node scripts/check-copy-coverage.mjs && node scripts/check-tokens.mjs && node scripts/check-anchors.mjs",
```

- [ ] **Step 2: 全绿验证**

```bash
pnpm build && pnpm check
node scripts/check-anchors.mjs --selftest
node scripts/check-tokens.mjs --selftest
```
Expected 三条：
- `leaves=169 pages=4 missing=0 en-cjk=0` → `=== COPY CHECK PASSED ===`
- `tokens=63 baseline=0` → `=== TOKEN CHECK PASSED ===`（字面色扫描保持零命中）
- `=== ANCHOR CHECK PASSED ===` + `anchors=3 pages=4`（`anchors=` 数的是**被引用到的片段**，只有 `top / how / next` 三个；`faq` 与 `proofs` 齐在页面上但不被任何链接指——目录已退役，脚本按引用计数，不按 `ALLOWED` 集合大小计数）
- 两份 `--selftest` 各自全 `passed`

- [ ] **Step 3: 手工终检（§6 明写这两条只能人工）**

1. 入站引用**实测在三份文件、共五条链接**（`608b0ab` 复核：`SiteNav.astro` 2 条 `#top`/`#next`、`Hero.astro` 2 条 `#next`/`#how`、`Privacy.astro` 1 条跨页 `…/#next`）——**页脚没有锚点**，早先这里把 `SiteFooter.astro` 列为第四处是陈旧口径（Task 5 撤目录后页脚只剩路径链接与外链）。落点存在性机检已覆盖，人工再点一遍确认「滚到哪一格」的体感（导航层退役后没有目录，章节定位只靠滚动与 eyebrow 序号）。
2. **两条分开测，别写成一条**（`57a183b` 实测：`grep -oh 'href="#[a-z-]*"' <四页> | sort | uniq -c` 得 `#how`×2、`#next`×4、`#top`×2）：① `href="#..."` 取值集合 = `{#top, #how, #next}`，**恰好三枚**——`#proofs`/`#faq` 不在这里出现是正常的（目录退役后没人指它们）；② `id` 落点集合 = `{top, how, proofs, faq, next}` 五枚齐在（`grep -o 'id="…"'`）。②只缺一条就是断链，①多出第四种取值就是有人把锚点写回了已退役的目标。隐私走路径链接、发布仓库与 Issues 走外链，都不算锚点。
3. 首屏表单数钉 **0**（产物里 `grep -c '<form' dist/index.html dist/zh/index.html` 应为 `0`——断言「零」时 `grep -c` 仍可用，断言「非零枚数」时不行），首屏演示数钉 **2** 且两份都带暂停开关与静态等价物（**计数用 `grep -o '<pat>' f | wc -l`**）——**第二条属 SP-4 的验收面**（首屏现在只有记录流一段演示 + 问答卡在途），本任务如实记「SP-2 结束时时序上只有 1 段」。
4. `prefers-reduced-motion: reduce` 下拍五区各一张 × 三视口（1440 / 768 / 390），存档给 SP-5 终检。拍前先证明服务指向本 worktree 的 `dist`（T9 的教训：陈旧 preview 会把已删的区画进画面）。
5. **三处「机检看不见」的产物自证**（T12 评审补，`pnpm check` 三条守卫都不覆盖它们）：① `dist` 新鲜度——`dist/` 的时间戳晚于最后一次源码改动与本次提交，且 `git status` 干净；② 两份首页的 `application/ld+json` 块**能 parse**（一行式编辑最容易碰坏的就是逗号/引号，`check-copy-coverage` 只比文案不比 JSON 结构）；③ 首屏 `data-demo` 载荷**能 parse** 且 `incoming`/`rows` 的枚数与源文件一致（它是序列化进产物的第二份文案，改 `stream.json` 后这里是唯一的落点证据）。

- [ ] **Step 4: 提交**

```bash
git add package.json
git commit -m "chore(check): 锚点守卫接入 pnpm check，五区拆区收口（SP-2）"
```

- [ ] **Step 5: 不 push**（NB-13：路线 A 中间态不得部署；`origin/main` 仍停在 `fde4ac3`，推送前的脱敏复核归 SP-5）。

---

## 计划落笔时登记的 spec 未覆盖面（11 条）

前 3 条是「coverage 机制逼出的唯一解」，任务已按它处置；4…6 与 10…11 是措辞与版面判断，**已于 2026-11-03 逐条由维护者裁决闭合**（见下面的「裁决记录」）；只有 7…9 仍未表态，本计划不动它们。

1. **`bn.json` 整件退役**（§5 只点名了 `nav.json` 的四个叶子）。`chapters` 撤了之后 11 枚 `bn` 叶子全成孤儿。→ Task 5。
2. **`price.json` 整件删除**（§5 与 §4.2 口径相抵）。→ Task 10 的口径差框。
3. **04 区问答卡的 5 枚叶子在 SP-2 删、SP-4 在 `flow.json` 重建**：SP-2…SP-4 之间站内少一处「检索问答」的可见落点。中间态不得部署（NB-13），所以访客看不到这个空档；`data-shot` 的取景清单也在此从 5 枚变 4 枚，SP-4 补两枚首屏钩子后为 6 枚（§4.4）。→ Task 11。
4. **`cta.sub` 重写**（「加入内测名单……第一批通知你」指向已撤的控件，与 Q6 同一条理由，但 NB-18 只点名了 Q6）。→ Task 3。**已裁：改，按草稿落。**
5. **`road.note` 重写**（「先留个邮箱」同上）。→ Task 9。**已裁：改，与 `cta.sub` 同批。**
6. **01 区的 eyebrow 此前不存在**（Hero 只有无编号的 `.kicker` 胶囊），而 NB-11 要求 eyebrow 全线 `01–05`。→ Task 7。**已裁：胶囊换成全局 `.eyebrow` 装置并给 `kicker` 加 `01 · ` 前缀，绿点胶囊形态在首屏消失。**
7. **`meta.json:14-17`（值在 `:15-16`）的 `jsonldDesc` 仍写「作品创作」/"piece creation"**：改名口径要不要从 04 区卡面延伸到结构化描述里（`check-copy-coverage` 会保证它照样落地，因此不影响绿）。→ 未动，等表态。
8. **隐私页的 `Waitlist` 行**（`Privacy.astro:20` + `priv.5b/5s`）描述的表单随 Task 3 消失：这行要不要撤、或改成「尚未开通」的写法——改它属公开口径变动，本计划**不动**。→ 等表态。
9. **05 区「隐私一行」的重复计数**：FAQ Q1 答复 + CTA 新行 + 页脚 `foot.privacy` 三处都指向隐私声明（§6 去重表把「同一能力 ≤2 次」钉成红线）。本计划按 §4.5 的书面清单落了两处（CTA + 页脚），措辞已错开；若维护者判定这是第三次，撤 CTA 那行即可（Task 3 的 Step 2/3 单独回退）。→ 未表态，按 §4.5 书面清单执行。
10. **04 区四卡的排法**：问答卡删除后 `repeat(2, 1fr)` 网格会出现「宽—双—单」的末行空洞。→ Task 11 Step 2。**已裁：四卡等宽 2×2**——信息卡去掉 `.wide`，`.proof-card.wide` 规则同批删；风险（信息卡 mock 三行徽章压进半列可能折行）列为 Step 5 的目视关口，不破版就报 `DONE_WITH_CONCERNS` 重裁，不自调字号。
11. **三处「加入内测」标签与 05 区那句「没有日期」相抵**：`nav.cta`（顶栏 + 隐私页共用）与 `hero.cta1`（首屏主按钮）。→ Task 4 Step 1。**已裁：两枚叶子都改，措辞「怎么拿到」/"How to get it"**（05 区现在回答的就是「怎么拿到」）。

**另有一处 spec 余项同日闭合**：首屏处境句的最终措辞（§9 唯一待裁决项）**已裁为「三个名词短语」版**——「散落的记录 · 沉底的收藏 · 调不回来的记忆」/ "scattered notes · sunken saves · memory you can't call back"，落在 Task 7 Step 4。

另两处「不是判断、只是删除的连带」已写进任务，不占表态额度：问答卡删后 `.mock .cite` / `.mock .q` 变孤儿规则（Task 11 Step 3 删），以及 `Proofs.astro:119/140-142` 注释里的「五张卡」成新错数（同处改口）。

## 与既有裁决的一致性自查

- NB-5 零 JS：本计划净删两处 JS（`SiteNav` 滚动高亮脚本、`WaitlistForm` 的提交脚本），新增零；`.reveal` 的 IO 驱动保留。
- NB-9 / NB-15 / NB-10 / NB-11 / NB-14 / NB-16 / NB-17 / NB-18 各自的验收点分别落在 Task 8 Step 3、Task 11 Step 5、Task 6 Step 2、Task 12 Step 3、Task 4 Step 3、Task 12 Step 3、Task 2 Step 4、Task 2 Step 1。
- 不破的四条口径：不加载新 webfont（`@font-face` 守卫未触碰，CI `:88-95` 仍 4 页 1 规则）、双语叶子成对（所有新叶子中英同批）、组件内不写死颜色（新组件只用 `var(--*)`，baseline 保持 0）、不为导航加 JS。
