# 边缘：两个 Worker

`edge/` 放站点之外的服务端。两个，各自独立部署，互不依赖：

```
edge/
├── waitlist/          等待名单收集端
│   ├── worker.js      收集端本体（无依赖，单文件）
│   ├── wrangler.toml  绑定与变量，KV 命名空间 id 是占位符
│   └── smoke.mjs      对着跑起来的 Worker 打十条回路的冒烟验
└── router/            按访问地区选默认语言的跳转层
    ├── worker.js      只做 302，其余请求原样透传给 Pages
    ├── wrangler.toml  变量与两种上线形态；当前没有可上线的域名，见该文件第一行注释
    └── smoke.mjs     进程内 27 条断言（不需要账号，也不连 Pages）
```

`waitlist/` 是把表单接通的那一半：一个 Worker + 一个 Workers KV 命名空间，收到邮箱就去重入库，
可选地再发一封确认信。站上的表单在没有配收集端点时是**不可提交**的（输入框禁用，占位符显示「暂不可提交」）。

## 收集端 · 契约

`POST` JSON `{ email, question, company }`，`company` 是蜜罐（真人那一格永远是空的）。

| 返回 | 含义 | 表单显示 |
|------|------|----------|
| `200 {"ok":true}` | 新地址已入库 | 「已加入」 |
| `200 {"ok":true,"silent":true}` | 命中蜜罐，不入库 | 「已加入」（不解释，避免告诉脚本哪格是坑） |
| `409 {"duplicate":true}` | 同邮箱已在名单里 | 「已经在名单里了」而不是「已加入」 |
| `400 {"error":"invalid_email"}` | 地址不可用 | 校验提示 |
| `429 {"error":"rate_limited"}` | 写得太快 | 可重试的失败提示 |
| `403` / `405` | 来源不在白名单 / 不是 POST | 可重试的失败提示 |

改任何一边都要同步改另一边：请求侧在 `src/components/WaitlistForm.astro`，
开关与字段说明在 `.env.example`。

## 收集端 · 首次部署

需要 Cloudflare 账号，`wrangler login` 会开浏览器走 OAuth。

```bash
npx wrangler login
npx wrangler kv namespace create WAITLIST      # 输出里的 id 与 preview_id 填进 wrangler.toml
npx wrangler deploy                            # 得到 https://wrisp-waitlist.<账号>.workers.dev/
```

然后在 Pages 侧把构建环境变量 `PUBLIC_WAITLIST_ENDPOINT` 设成那个地址（站点与端点不同源，
所以 Worker 必须带 CORS 头，已经带了）。下一次构建的表单就能提交。

发信是可选的，不配就只入库：

```bash
npx wrangler secret put RESEND_API_KEY         # 交互式粘贴，不进仓库任何文件
```

`WELCOME_FROM` / `WELCOME_SUBJECT` / `WELCOME_TEXT` 在 `wrangler.toml` 里留空；发信人地址必须
是你在那个服务上验证过的域名。发信失败只记日志、不回失败——邮箱已经收下了，不能因为一封
确认信发不出去让用户重填。

域名换了（例如最终用上自己的域）时，只需把新来源加进 `ALLOWED_ORIGINS` 再 `deploy` 一次；
这个表只管「谁提交的」，不加就等于把响应结果对全网关闭。

## 收集端 · 本地验

```bash
rm -rf D:/tmp/wrisp-edge-dev      # 空目录 = 空表；Windows 下换个没被占用的路径同理
npx wrangler dev --local --port 8787 --config edge/waitlist/wrangler.toml \
  --persist-to D:/tmp/wrisp-edge-dev
node edge/waitlist/smoke.mjs
```

十条断言：来源缺失/来源不合法各回 403、预检 204 且回显来源、GET 405、新地址入库、
换大小写带空格仍算重复、坏地址 400 不入库、蜜罐命中不入库、运行目录确认为空、
写满额度后限流。

`--local` 的状态是**落盘**的，不给 `--persist-to` 就写进 `edge/waitlist/.wrangler/`
（已 gitignore，里面存的是提交过的邮箱，绝不入库）。重启不清空表，而限流按小时计，
上一轮的写入会串进这一轮——所以每次跑前换一个空目录，否则最后两条断言必红。

## 收集端 · 数据怎么看

```bash
npx wrangler kv key list --binding=WAITLIST --remote
npx wrangler kv key get <email:开头的键> --binding=WAITLIST --remote
```

键只有两种形状：`email:<归一化邮箱>`（一条记录）和 `rl:<IP>`（限流计数，一小时自动过期，
不是数据）。导出全量把 `key list` 的结果逐条 `key get` 即可；记录体里的 `at` 是提交时刻，
`lang` 取自来源页路径。要清掉某人的记录，`kv key delete`。

## 收集端 · 配额为什么是这么设的

Workers KV 免费档每天 1000 次写。没有门槛的话，一个脚本就能把当天额度刷光，
表单从此整天报错，而且收上来的是垃圾。所以三件事放在服务端做而不是指望浏览器：
来源白名单、蜜罐判定、按 IP 的每小时写入门槛（`RATE_MAX_WRITES`，在 `worker.js` 顶部）。

端点地址本身是公开的（它就印在页面上），所以这里不放任何密钥，也不接受任何
「管理」类请求——这个 Worker 只会往自己的 KV 里写一条邮箱记录。

---

## 跳转层 router/

**2026-11-11 更新：本站点路由层已用 Cloudflare Redirect Rules 实现并上线**（`www.trywrisp.com`，3 条规则）：

| 规则 | 匹配 | 动作 |
|---|---|---|
| 1 | `path == "/"` 且 cookie 含 `wrisp_lang=zh` | 302 → `/zh/` |
| 2 | `path == "/zh/"` 且 cookie 含 `wrisp_lang=en` | 302 → `/` |
| 3 | `path == "/"`、无 cookie、语言头含 `zh` | 302 → `/zh/` |

免费计划限制：不能用 `matches`/`starts_with` 运算符（需 Business / WAF Advanced），也不能用 `cf.ipcountry` 字段，所以语言猜测用 `contains`、国家规则放弃。cookie 优先、只发 302、只动两个根路径，与下方 worker.js 的判定表一致；查询串保留。

本目录的 `worker.js` 保留作**参考实现**（判定表、透传头白名单、smoke 测试），当前架构（内容源 = Pages 自定义域本身）下部署 Worker 会产生自引用循环，不再需要。

### 历史设计（供参考）

**它只做一件事**：访客落到站点根（`/` 或 `/zh/`）时，决定要不要把他送到另一版，其余一概不碰。

判定顺序（三条铁律的出处在方案文档，这里只写行为）：

| 线索 | 强度 | 说明 |
|------|------|------|
| `wrisp_lang` cookie | 最高，有它就不猜 | 语言开关写下的显式选择，一年期。压过国家码——中文用户点了 EN 之后不该再被跳回去 |
| `cf-ipcountry`（或 `FORCE_COUNTRY`） | 次之 | **只认 CN**。其他国家不猜：英文站面向全球，把东京或柏林的访客按语言猜错的代价比不猜大 |
| `Accept-Language` 首项 | 兜底 | 只看第一项：`en-US,en;q=0.9,zh-CN;q=0.8` 的访客要的是英文；第三种语言（de / fr…）不乱猜 |

三条不可谈判的行为，`smoke.mjs` 逐条盯着：

- **只发 302，绝不 301**——永久重定向会让搜索引擎只收录一种语言。
- **跳转响应 `cache-control: no-store`**——它取决于 cookie 和请求头，被 CDN 缓存下来就是把别人的语言发给下一位。查询串原样带上，推广链接的 `?utm_*` 不能在这一跳里丢。
- **不改写响应体**——非根路径（`/privacy/`、`/zh/privacy/`、`/_astro/*`、`sitemap.xml`）与 `POST` 全部透传给 Pages；透传时按白名单转发头，**访客的 cookie 不会跟着送到 GitHub 那里去**。

### 现在还不能部署

Worker 只能挡在它自己的域名前面，而 `liqms.github.io` 不是这个站的域名——**只要站点还在
Pages 项目站的子路径上，这一层就没有可挂的地方**。它等的是最终国际域（Cloudflare DNS +
一条指向 Pages 的 Proxied 记录）。届时改动集中在这几处，站点侧一行不用动：

```bash
# 1) 域名加进 wrangler.toml 的 [[routes]]（文件里有模板），必要时改 BASE_PATH 为空串
npx wrangler deploy --config edge/router/wrangler.toml
# 2) 收集端补上新来源：edge/waitlist/wrangler.toml 的 ALLOWED_ORIGINS
```

### 本地验

```bash
node edge/router/smoke.mjs        # 27 条，进程内跑，不连 Pages、不需要账号
```

覆盖：判定表每一行（含 cookie 里混着别的键、cookie 值不认识、`Accept-Language` 多语种排序）、
只在两个根上动作、302 的 `location` 与 `no-store` 与 `Vary`、透传的目标与头白名单、`POST`
不被降级成 GET、`BASE_PATH` 为空时仍成对。三条变异（302 改 301、去掉 cookie 优先级、透传
转发全部头）各被抓到一次，用例不是空跑。

### 上线后手动确认四件事

1. `curl -sI https://<域>/` 在无 cookie、CN 出口下应回 `302` + `location: /zh/` + `cache-control: no-store`；
2. 同一 URL 带 `Cookie: wrisp_lang=en` 应**不跳**；
3. `curl -sL` 拿到的两种语言页面内容与直接访问 `/`、`/zh/` **逐字节一致**（证明没改写响应体）；
4. `cf-ipcountry` 在该账号下是否可见——拿不到就只是少一条猜测线索，判定表其余部分不变，
   **不要因此改成按 UA 猜**（那是铁律 3）。
