function provider(env) { return env.EMAIL_PROVIDER === undefined ? 'cloudflare' : env.EMAIL_PROVIDER; }
export function emailConfigured(env) {
  if (typeof env.EMAIL_FROM !== 'string' || !/^[^\s<>@,;:"()[\]\\]+@[^\s<>@,;:"()[\]\\]+\.[^\s<>@,;:"()[\]\\]+$/.test(env.EMAIL_FROM)) return false;
  if (provider(env) === 'resend') return typeof env.RESEND_API_KEY === 'string' && /^\S+$/.test(env.RESEND_API_KEY);
  if (provider(env) !== 'cloudflare') return false;
  return /^[a-f0-9]{32}$/i.test(env.EMAIL_ACCOUNT_ID || '') &&
    typeof env.EMAIL_API_TOKEN === 'string' && env.EMAIL_API_TOKEN.length > 0;
}
function failure(code) { return Object.assign(new Error(code), { code, status: 503 }); }
export async function sendSignIn(env, to, link, locale, fetcher = fetch) {
  if (!emailConfigured(env)) throw failure('configuration_unavailable');
  const resend = provider(env) === 'resend';
  const zh = locale === 'zh';
  const text = zh
    ? `请使用以下链接登录 Serviio。链接在 15 分钟后失效。打开后，请点击确认登录。\n\n${link}\n\n如果您没有申请登录，请忽略此邮件。`
    : `Use this link to sign in to Serviio. It expires in 15 minutes. After opening it, select Confirm sign-in.\n\n${link}\n\nIf you did not request this email, you can ignore it.`;
  let stage = 'transport'; let status = null; let reason = 'unspecified';
  try {
    const url = resend ? 'https://api.resend.com/emails' : `https://api.cloudflare.com/client/v4/accounts/${env.EMAIL_ACCOUNT_ID}/email/sending/send`;
    const response = await fetcher(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${resend ? env.RESEND_API_KEY : env.EMAIL_API_TOKEN}`, 'Content-Type': 'application/json', ...(resend ? { 'User-Agent': 'Serviio-Accounts/1.0' } : {}) },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject: zh ? '登录 Serviio' : 'Sign in to Serviio', text })
    });
    status = response.status; stage = 'response_json';
    const data = await response.json();
    stage = 'provider_response';
    if (['invalid_api_key', 'missing_api_key', 'restricted_api_key', 'validation_error', 'rate_limit_exceeded', 'daily_quota_exceeded', 'monthly_quota_exceeded', 'application_error'].includes(data?.name)) reason = data.name;
    if (resend) {
      if (!response.ok || typeof data?.id !== 'string' || !data.id.trim()) throw failure('email_unavailable');
      return;
    }
    const result = data?.result;
    if (!response.ok || data.success !== true || ![...(result?.queued || []), ...(result?.delivered || [])].includes(to) || result?.permanent_bounces?.includes(to)) throw failure('email_unavailable');
  } catch {
    console.warn(JSON.stringify({ event: 'account_email_failure', provider: resend ? 'resend' : 'cloudflare', stage, status, reason }));
    throw failure('email_unavailable');
  }
}
