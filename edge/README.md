# 等待名单收集端

站上的表单在没有配收集端点时是**不可提交**的（页面上会照实说明）。`waitlist/` 就是把
它接通的那一半：一个 Cloudflare Worker + 一个 Workers KV 命名空间，收到邮箱就去重入库，
可选地再发一封确认信。

```
edge/waitlist/
├── worker.js      收集端本体（无依赖，单文件）
├── wrangler.toml  绑定与变量，KV 命名空间 id 是占位符
└── smoke.mjs      对着跑起来的 Worker 打十条回路的冒烟验
```

## 契约

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

## 首次部署

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

## 本地验

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

## 数据怎么看

```bash
npx wrangler kv key list --binding=WAITLIST --remote
npx wrangler kv key get <email:开头的键> --binding=WAITLIST --remote
```

键只有两种形状：`email:<归一化邮箱>`（一条记录）和 `rl:<IP>`（限流计数，一小时自动过期，
不是数据）。导出全量把 `key list` 的结果逐条 `key get` 即可；记录体里的 `at` 是提交时刻，
`lang` 取自来源页路径。要清掉某人的记录，`kv key delete`。

## 配额为什么是这么设的

Workers KV 免费档每天 1000 次写。没有门槛的话，一个脚本就能把当天额度刷光，
表单从此整天报错，而且收上来的是垃圾。所以三件事放在服务端做而不是指望浏览器：
来源白名单、蜜罐判定、按 IP 的每小时写入门槛（`RATE_MAX_WRITES`，在 `worker.js` 顶部）。

端点地址本身是公开的（它就印在页面上），所以这里不放任何密钥，也不接受任何
「管理」类请求——这个 Worker 只会往自己的 KV 里写一条邮箱记录。
