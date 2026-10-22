/**
 * 收集端冒烟验：对着一个跑着的 Worker 把九条回路各打一遍。
 *
 *   rm -rf D:/tmp/wrisp-edge-dev
 *   npx --yes wrangler@4 dev --local --port 8787 --config edge/waitlist/wrangler.toml --persist-to D:/tmp/wrisp-edge-dev
 *   node edge/waitlist/smoke.mjs                  # 或 node edge/waitlist/smoke.mjs http://127.0.0.1:8787
 *
 * --local 的状态是落盘的（不给 --persist-to 就写进 edge/waitlist/.wrangler/），重启不清空表，
 * 上一轮的写入与限流计数会串进这一轮。所以跑前先换一个空的运行时目录。
 * 限流按小时的全局写入额度计（本地 runtime 自带 cf-connecting-ip，所有用例落进同一个
 * IP 桶，x-real-ip 只是装饰），所以最后一条按「全程入库次数」断言，而不是按单条用例。
 */
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const ORIGIN = 'https://liqms.github.io';

let seq = 0;
let stored = 0;
const results = [];

async function call(path, { method = 'POST', body, origin = ORIGIN, ip, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(origin ? { origin } : {}),
      'content-type': 'application/json',
      'x-real-ip': ip || '10.0.0.' + (++seq),
      referer: origin + '/zh/',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* 204 无响应体 */ }
  // 蜜罐命中（silent）与去重（409）都不占写入额度，只有真正入库才算一次。
  if (res.status === 200 && json?.ok === true && !json?.silent) stored++;
  return { status: res.status, json, acao: res.headers.get('access-control-allow-origin') };
}

function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (pass ? '' : '  → ' + JSON.stringify(detail)));
}

const stamp = Date.now();
const fresh = (tag) => `smoke-${tag}-${stamp}@example.test`;

const main = async () => {
  const noOrigin = await call('/', { body: { email: fresh('noorigin') }, origin: null, headers: { origin: 'null' } });
  check('无来源头按跨站丢弃', noOrigin.status === 403, noOrigin);

  const wrong = await call('/', { body: { email: fresh('wrong') }, origin: 'https://evil.example' });
  check('白名单外的来源 403', wrong.status === 403, wrong);

  const pre = await call('/', { method: 'OPTIONS', origin: ORIGIN });
  check('预检 204 且回显本站来源', pre.status === 204 && pre.acao === ORIGIN, { status: pre.status, acao: pre.acao });

  const get = await call('/', { method: 'GET' });
  check('GET 不走收集，405', get.status === 405, get);

  const email = fresh('new');
  const first = await call('/', { body: { email, question: 'x'.repeat(600) } });
  check('新地址 200 入库', first.status === 200 && first.json?.ok === true, first);

  const dup = await call('/', { body: { email: '  ' + email.toUpperCase() + ' ' } });
  check('同邮箱换大小写与空格仍算重复（409）', dup.status === 409 && dup.json?.duplicate === true, dup);

  const bad = await call('/', { body: { email: 'not-an-email' } });
  check('不可用地址 400 且不入库', bad.status === 400 && bad.json?.error === 'invalid_email', bad);

  const trapMail = fresh('trap');
  const trap = await call('/', { body: { email: trapMail, company: 'ACME' } });
  const afterTrap = await call('/', { body: { email: trapMail } });
  check('蜜罐命中回 200 但不入库（再提交仍是新地址）',
    trap.status === 200 && afterTrap.status === 200, { trap, afterTrap });

  // 额度是全程共用的，前面若已有多余入库，说明运行时目录不是空的，后面的 429 计数无从判起。
  check('到这里全程只入库两次（运行时目录是空的）', stored === 2, { stored });

  const ipBucket = '10.9.9.9';
  let statuses = [];
  for (let i = 0; i < 12; i++) {
    const r = await call('/', { body: { email: fresh('rl' + i) }, ip: ipBucket });
    statuses.push(r.status);
    if (r.status === 429) break;
  }
  check('写满一小时额度后 429', stored === 10 && statuses.includes(429), { stored, statuses });
};

main().then(() => {
  const failed = results.filter((r) => !r.pass);
  console.log('\n=== ' + (failed.length ? failed.length + ' FAILURES' : 'SMOKE PASSED') + ' ===');
  process.exit(failed.length ? 1 : 0);
}).catch((e) => { console.error('smoke error:', e.message); process.exit(2); });
