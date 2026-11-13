export function emailConfigured(env) {
  return /^[a-f0-9]{32}$/i.test(env.EMAIL_ACCOUNT_ID || '') &&
    typeof env.EMAIL_API_TOKEN === 'string' && env.EMAIL_API_TOKEN.length > 0 &&
    /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.EMAIL_FROM || '');
}
function failure(code) { return Object.assign(new Error(code), { code, status: 503 }); }
export async function sendSignIn(env, to, link, locale, fetcher = fetch) {
  if (!emailConfigured(env)) throw failure('configuration_unavailable');
  const zh = locale === 'zh';
  const text = zh
    ? `请使用以下链接登录 Serviio。链接在 15 分钟后失效。打开后，请点击确认登录。\n\n${link}\n\n如果您没有申请登录，请忽略此邮件。`
    : `Use this link to sign in to Serviio. It expires in 15 minutes. After opening it, select Confirm sign-in.\n\n${link}\n\nIf you did not request this email, you can ignore it.`;
  try {
    const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${env.EMAIL_ACCOUNT_ID}/email/sending/send`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${env.EMAIL_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject: zh ? '登录 Serviio' : 'Sign in to Serviio', text })
    });
    const data = await response.json();
    const result = data?.result;
    if (!response.ok || data.success !== true || ![...(result?.queued || []), ...(result?.delivered || [])].includes(to) || result?.permanent_bounces?.includes(to)) throw failure('email_unavailable');
  } catch { throw failure('email_unavailable'); }
}
