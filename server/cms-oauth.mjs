import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const cookieName = '__Host-journal-oauth';
const lifetime = 10 * 60;
const encode = value => JSON.stringify(value).replaceAll('<', '\\u003c');

function config(env) {
  const site = env.CMS_SITE_URL || env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (!site) throw new Error('CMS site missing');
  const origin = new URL(site);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
    || !env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET
    || !/^[A-Za-z0-9-]+$/.test(env.CMS_ALLOWED_GITHUB_LOGIN ?? '')
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.CMS_REPO ?? '')) throw new Error('CMS configuration missing');
  return { origin: origin.origin, clientId: env.GITHUB_OAUTH_CLIENT_ID, secret: env.GITHUB_OAUTH_CLIENT_SECRET,
    login: env.CMS_ALLOWED_GITHUB_LOGIN, repo: env.CMS_REPO, redirect: `${origin.origin}/api/callback` };
}

function headers(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}
function plain(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}
function cookie(res, value, age = lifetime) {
  res.setHeader('Set-Cookie', `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`);
}
function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
function unpack(value, secret, now) {
  const [payload, signature, extra] = (value || '').split('.');
  if (!payload || !signature || extra) throw new Error('Invalid state');
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid signature');
  const state = JSON.parse(Buffer.from(payload, 'base64url').toString());
  const age = now - state.createdAt;
  if (!Number.isFinite(age) || age < 0 || age > lifetime * 1000 || !/^[\w-]{43}$/.test(state.nonce) || !/^[\w-]{43}$/.test(state.verifier)) throw new Error('Expired state');
  return state;
}
function popup(res, cfg, status, data) {
  const nonce = randomBytes(18).toString('base64url');
  const message = `authorization:github:${status}:${JSON.stringify(data)}`;
  res.statusCode = status === 'success' ? 200 : 403;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
  res.end(`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Journalログイン</title><p>${status === 'success' ? 'ログインしました。記事管理の画面へ戻ってください。' : 'ログインできませんでした。記事管理の画面からやり直してください。'}</p><script nonce="${nonce}">
const origin = ${encode(cfg.origin)};
const message = ${encode(message)};
window.addEventListener('message', function receive(event) {
  if (event.origin !== origin || event.source !== window.opener || event.data !== 'authorizing:github') return;
  window.removeEventListener('message', receive);
  window.opener.postMessage(message, origin);
});
if (window.opener) window.opener.postMessage('authorizing:github', origin);
</script></html>`);
}

export function createOAuthHandlers({ env = process.env, fetcher = fetch, now = Date.now } = {}) {
  function setup(req, res) {
    headers(res);
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      plain(res, 405, 'GETのみ利用できます。');
      return;
    }
    try { return config(env); }
    catch { plain(res, 503, '記事管理のログイン設定を準備中です。'); }
  }
  return {
    authorize(req, res) {
      const cfg = setup(req, res);
      if (!cfg) return;
      const query = new URL(req.url, cfg.origin).searchParams;
      if (query.get('provider') !== 'github' || query.get('site_id') !== new URL(cfg.origin).hostname) return plain(res, 400, '記事管理の画面からログインしてください。');
      const state = { nonce: randomBytes(32).toString('base64url'), verifier: randomBytes(32).toString('base64url'), createdAt: now() };
      const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
      cookie(res, `${payload}.${sign(payload, cfg.secret)}`);
      const target = new URL('https://github.com/login/oauth/authorize');
      target.search = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.redirect, login: cfg.login,
        scope: 'repo', state: state.nonce, allow_signup: 'false', code_challenge_method: 'S256',
        code_challenge: createHash('sha256').update(state.verifier).digest('base64url') }).toString();
      res.statusCode = 302;
      res.setHeader('Location', target.href);
      res.end();
    },
    async callback(req, res) {
      const cfg = setup(req, res);
      if (!cfg) return;
      const query = new URL(req.url, cfg.origin).searchParams;
      const value = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
      cookie(res, '', 0);
      let state;
      try {
        state = unpack(value, cfg.secret, now());
        if (state.nonce !== query.get('state') || !query.get('code') || query.has('error')) throw new Error('OAuth rejected');
      } catch { return popup(res, cfg, 'error', { message: 'ログインの有効期限が切れたか、認証がキャンセルされました。もう一度ログインしてください。' }); }
      try {
        const response = await fetcher('https://github.com/login/oauth/access_token', {
          method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.secret, code: query.get('code'), redirect_uri: cfg.redirect, code_verifier: state.verifier }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error('Token exchange failed');
        const token = (await response.json()).access_token;
        if (typeof token !== 'string' || !token) throw new Error('Token missing');
        const request = async endpoint => {
          const result = await fetcher(`https://api.github.com${endpoint}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(15000) });
          if (!result.ok) throw new Error('GitHub access denied');
          return result.json();
        };
        const user = await request('/user');
        if (user.login?.toLowerCase() !== cfg.login.toLowerCase()) throw new Error('Owner only');
        const repo = await request(`/repos/${cfg.repo}`);
        if (repo.private !== true || repo.permissions?.push !== true) throw new Error('Private repository required');
        popup(res, cfg, 'success', { token, provider: 'github' });
      } catch { popup(res, cfg, 'error', { message: '本人のGitHubアカウントと、記事保存先の権限を確認してください。' }); }
    },
  };
}

export const { authorize, callback } = createOAuthHandlers();
