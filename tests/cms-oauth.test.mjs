import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { createOAuthHandlers } from '../server/cms-oauth.mjs';

const env = { CMS_SITE_URL: 'https://example.com', GITHUB_OAUTH_CLIENT_ID: 'test-client', GITHUB_OAUTH_CLIENT_SECRET: 'test-secret', CMS_ALLOWED_GITHUB_LOGIN: 'owner', CMS_REPO: 'owner/journal' };
function response() {
  return { statusCode: 200, headers: {}, body: '', setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, end(body = '') { this.body = body; } };
}
function begin(handlers) {
  const res = response();
  handlers.authorize({ method: 'GET', url: '/api/auth?provider=github&site_id=example.com', headers: {} }, res);
  const url = new URL(res.headers.location);
  const cookie = res.headers['set-cookie'].split(';')[0];
  return { res, url, cookie, request: { method: 'GET', url: `/api/callback?code=test-code&state=${url.searchParams.get('state')}`, headers: { cookie } } };
}

test('認証の設定不足・不正な開始元・GET以外を拒否し、PKCEと安全なCookieを使う', () => {
  const missing = response();
  createOAuthHandlers({ env: {} }).authorize({ method: 'GET' }, missing);
  assert.equal(missing.statusCode, 503);
  const handlers = createOAuthHandlers({ env });
  for (const req of [{ method: 'POST', url: '/' }, { method: 'GET', url: '/api/auth?provider=github&site_id=attacker.example' }]) {
    const res = response(); handlers.authorize(req, res);
    assert.ok([400, 405].includes(res.statusCode));
    assert.equal(res.headers.location, undefined);
  }
  const { res, url, cookie } = begin(handlers);
  assert.equal(res.statusCode, 302);
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://example.com/api/callback');
  assert.match(res.headers['set-cookie'], /HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
  const state = JSON.parse(Buffer.from(cookie.split('=')[1].split('.')[0], 'base64url').toString());
  assert.equal(url.searchParams.get('code_challenge'), createHash('sha256').update(state.verifier).digest('base64url'));
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
});

test('不一致・改ざん・期限切れのstateはトークン交換前に拒否する', async () => {
  let time = 1000;
  const handlers = createOAuthHandlers({ env, now: () => time, fetcher: () => { throw new Error('Must not call GitHub'); } });
  for (const mutation of ['missing', 'mismatch', 'tampered', 'expired']) {
    time = 1000;
    const { request } = begin(handlers);
    if (mutation === 'missing') request.headers.cookie = '';
    if (mutation === 'mismatch') request.url += 'wrong';
    if (mutation === 'tampered') request.headers.cookie += 'wrong';
    if (mutation === 'expired') time += 600001;
    const res = response(); await handlers.callback(request, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.headers['set-cookie'], /Max-Age=0/);
    assert.doesNotMatch(res.body, /test-secret/);
  }
});

test('本人と非公開リポジトリの書込み権限を確認し、同じ画面にだけトークンを渡す', async () => {
  const token = 'test-only-access-token';
  for (const scenario of ['success', 'other-user', 'public-repo', 'read-only', 'api-error']) {
    const calls = [];
    const handlers = createOAuthHandlers({ env, fetcher: async (url, options) => {
      calls.push(url);
      if (url.endsWith('/access_token')) {
        assert.equal(options.body.get('client_secret'), env.GITHUB_OAUTH_CLIENT_SECRET);
        assert.equal(options.body.get('code_verifier').length, 43);
        return { ok: true, json: async () => ({ access_token: token }) };
      }
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      return { ok: scenario !== 'api-error', json: async () => url.endsWith('/user')
        ? { login: scenario === 'other-user' ? 'attacker' : 'Owner' }
        : { private: scenario !== 'public-repo', permissions: { push: scenario !== 'read-only' } } };
    } });
    const { request } = begin(handlers);
    const res = response(); await handlers.callback(request, res);
    assert.match(res.headers['cache-control'], /no-store/);
    assert.match(res.headers['content-security-policy'], /script-src 'nonce-/);
    if (scenario !== 'success') {
      assert.equal(res.statusCode, 403);
      assert.ok(!res.body.includes(token));
      if (scenario === 'other-user') assert.equal(calls.length, 2);
      continue;
    }
    assert.equal(res.statusCode, 200);
    let receive;
    const messages = [];
    const opener = { postMessage: (...args) => messages.push(args) };
    const window = { opener, addEventListener: (_name, handler) => { receive = handler; }, removeEventListener() {} };
    vm.runInNewContext(res.body.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1], { window });
    assert.deepEqual(messages.shift(), ['authorizing:github', 'https://example.com']);
    receive({ origin: 'https://attacker.example', source: opener, data: 'authorizing:github' });
    receive({ origin: 'https://example.com', source: {}, data: 'authorizing:github' });
    assert.equal(messages.length, 0);
    receive({ origin: 'https://example.com', source: opener, data: 'authorizing:github' });
    assert.equal(messages.length, 1);
    assert.equal(messages[0][1], 'https://example.com');
    assert.ok(messages[0][0].includes(token));
  }
});
