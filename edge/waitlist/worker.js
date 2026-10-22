/**
 * 等待名单收集端（Cloudflare Worker + Workers KV）。
 *
 * 契约与站点侧 `src/components/WaitlistForm.astro` 一一对应，改一边要同步改另一边：
 *   POST JSON { email, question, company }
 *   200 {"ok":true}        新地址已入库
 *   409 {"duplicate":true} 同邮箱已在名单里（站点显示「已在名单」而不是「已加入」）
 *   400 {"error":"invalid_email"} 地址不可用（站点显示表单校验文案）
 *   429 {"error":"rate_limited"}  同 IP 写得太快
 *
 * 三件事在这里做，而不是在浏览器里做：去重（KV 键存在与否）、蜜罐的服务端判定、
 * 按 IP 的写入门槛。Workers KV 的免费额度是每天 1000 次写，没有这道门槛，
 * 一个脚本就能把额度刷光并让表单整天报错。
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_QUESTION = 500;
/** 同一 IP 在窗口内允许的写入次数（蜜罐命中不计入，见 handle）。 */
const RATE_WINDOW_SECONDS = 3600;
const RATE_MAX_WRITES = 10;

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(origin),
    },
  });

/**
 * 只放行站点自己的来源。站点与这个端点不同源，浏览器要求 CORS 才让脚本读到响应，
 * 所以这里给的不是「能不能提交」而是「提交后能不能知道结果」——写死白名单，不用 *。
 */
function corsHeaders(origin) {
  if (!origin) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function allowed(origin, env) {
  if (!origin) return false;
  const list = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin);
}

const keyFor = (email) => 'email:' + email;
const rateKey = (ip) => 'rl:' + ip;

async function writesThisHour(env, ip) {
  const raw = await env.WAITLIST.get(rateKey(ip));
  return raw ? Number(raw) : 0;
}

async function bumpWrites(env, ip) {
  const next = (await writesThisHour(env, ip)) + 1;
  await env.WAITLIST.put(rateKey(ip), String(next), { expirationTtl: RATE_WINDOW_SECONDS });
}

/** 归一化邮箱：去空格、转小写。去重键与入库值都用它，避免 Same@X 与 same@x 算两个人。 */
function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, origin);
    }
    if (!allowed(origin, env)) {
      return json({ error: 'origin_not_allowed' }, 403, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400, origin);
    }

    // 服务端蜜罐：站点的判定可以被绕过（直接 POST 就跳过了脚本），这一道才是真门槛。
    // 命中就照原样回成功，既不入库也不解释——回错误等于告诉脚本哪一格是坑。
    if (String(payload.company || '').length) {
      return json({ ok: true, silent: true }, 200, origin);
    }

    const email = normalizeEmail(payload.email);
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return json({ error: 'invalid_email' }, 400, origin);
    }

    const question = String(payload.question || '').slice(0, MAX_QUESTION).trim();

    if ((await writesThisHour(env, ip(request))) >= RATE_MAX_WRITES) {
      return json({ error: 'rate_limited' }, 429, origin);
    }

    const existing = await env.WAITLIST.get(keyFor(email));
    if (existing) {
      return json({ duplicate: true }, 409, origin);
    }

    const record = {
      email,
      question,
      // 语言看 referer（页面自己的 URL 前缀），origin 里没有路径；拿不到再退到 Accept-Language
      lang: /\/zh\//.test(request.headers.get('referer') || '') ? 'zh' : detectLang(request),
      at: new Date().toISOString(),
      ip_country: request.cf?.country || '',
    };
    await env.WAITLIST.put(keyFor(email), JSON.stringify(record));
    await bumpWrites(env, ip(request));

    // 发信是可选增强：没配 RESEND_API_KEY 就只入库，配了但发失败也只记日志。
    // 收上来的邮箱已经在表里，不能因为一封确认信发不出去就回失败让用户重填。
    if (env.RESEND_API_KEY) {
      try {
        await sendWelcome(env, record);
      } catch (e) {
        console.warn('welcome mail failed', email, String(e));
      }
    }
    return json({ ok: true }, 200, origin);
  },
};

function ip(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
}

/** Accept-Language 只是兜底：边缘层上线后语言由 302 决定，那时 origin 一定带得上前缀。 */
function detectLang(request) {
  const al = (request.headers.get('accept-language') || '').toLowerCase();
  return al.startsWith('zh') ? 'zh' : 'en';
}

async function sendWelcome(env, record) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.RESEND_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.WELCOME_FROM,
      to: [record.email],
      subject: env.WELCOME_SUBJECT || 'Wrisp — you are on the waitlist',
      text: env.WELCOME_TEXT || 'Thanks — we will write when the first build is ready.',
    }),
  });
  if (!res.ok) throw new Error('resend ' + res.status + ' ' + (await res.text()).slice(0, 200));
}
