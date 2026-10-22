# wrisp-site

Wrisp 官网的源码。

> **今天，你需要一个创作分身。**
> 说话代替打字，整理交给 AI，数据永远留在你的机器。

Wrisp 是一款本地优先的个人创作 AI：Markdown 存在你自己的目录里，识别、整理、召回都能在本机跑完，要用云端模型就接你自己的 Key。应用本身作为闭源免费软件单独分发，这个仓库只有站点。

## 线上地址

<https://liqms.github.io/wrisp-site/>

## 目录

```
astro.config.mjs  构建配置（静态输出、site/base、双语路由）
src/pages/        路由入口（/ 与 /zh/、/privacy/ 与 /zh/privacy/）
src/components/   十区块与页脚组件，Home.astro 装配首页
src/components/pages/  辅助页整页装配，Privacy.astro 是隐私与数据声明
src/content/copy/ 全站文案，每条都是 { zh, en } 一个叶子
src/layouts/      页面外壳（head 元数据、样式挂载）
src/styles/       设计令牌与共享基元
scripts/          构建期生成 sitemap/robots，并校验文案落地与英文页语言纯净度
public/assets/    图标与社交分享卡片（og-zh.png / og-en.png，1200×630）
```

这里是官网文案与资产的**唯一载体**。两条纪律：

- 文案只改 `src/content/copy/`，不在组件里写字面句子；少任何一侧语言，`pnpm build` 会直接失败。
- 写完要 `pnpm build && pnpm check`：双语键成对由 schema 保证，但一条文案两种语言都齐却没人引用，只有这一步能发现——它逐叶子回比构建产物，并确认英文页除了语言开关上的「中文」没有别的汉字。CI 已接这两条。
- 字体走系统栈，站内不加载 webfont；两张分享卡片由维护者侧的私有脚本生成，请勿手工改图——要调卡片内容请提出来，由脚本重导出后一并提交。

## 本地预览

```bash
pnpm install
pnpm dev      # 开发服务器
pnpm build    # 产出 dist/（末尾顺带生成 sitemap.xml 与 robots.txt）
pnpm preview  # 预览构建产物
```

## 语言

`/` 是英文页，`/zh/` 是中文页；辅助页同样成对（`/privacy/` 与 `/zh/privacy/`）。每一份都是构建期生成的完整静态页面，各自带 `canonical` 与三种语言的 `hreflang` 互指（缺任一侧，整组声明会被搜索引擎丢弃），以及对应语言的 `og:image`。右上角的语言切换是**链接跳转**，不是脚本改写文本——同一 URL 永远返回同一份内容，爬虫与分享链接可复现。

跨页链接一律经 `src/lib/locales.ts` 拼语言根，所以新增页面时不会把 `/zh/` 写死在组件里；页内锚点（`#waitlist` 之类）仍按原样写。

按访问地区选择默认语言由边缘层承担（GitHub Pages 没有地区路由能力，它不能 302），未接边缘层之前 `/` 就是默认落地页。

## 索引文件

`sitemap.xml` 与 `robots.txt` 由 `pnpm build` 末尾的 `scripts/gen-seo.mjs` 生成：不入库，`pnpm dev` 也不提供它们（它不读 `dist/`）。站点地图不另抄一份地址表——它读构建产物里每页自己的 `canonical` 与 `hreflang`，所以新增一页只要构建过就自动进图，页面与图不可能各说一套口径。CI 会反过来验一遍：图里每条地址都得有对应的真实页面。

## 已知缺口

- **等待名单表单还没有后端。** 提交只在前端校验并给出提示，数据不会离开浏览器。接通入库与发信通道之前，请不要把它当作报名渠道。
- **按地区跳转还没接。** 需要边缘层按访问地区 302，GitHub Pages 做不到。

## 许可

保留所有权利，详见 [LICENSE](LICENSE)。站点源码、文案与品牌素材均不授权复用或改编。
