import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const script = await fs.readFile(new URL('../public/admin/admin.js', import.meta.url), 'utf8');

async function initialize(auth) {
  let open;
  let configured;
  let preSave;
  let ready;
  const waiting = new Promise(resolve => { ready = resolve; });
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { addEventListener(_event, handler) { open = handler; ready(); } });
      return elements.get(id);
    },
    createElement() { return {}; },
    head: { append(element) { element.onload(); } },
  };
  const CMS = {
    registerEditorComponent() {}, registerPreviewStyle() {}, registerPreviewTemplate() {},
    registerEventListener({ name, handler }) { if (name === 'preSave') preSave = handler; },
    init({ config }) { configured = config; },
  };
  vm.runInNewContext(script, {
    document, URL, location: { hostname: 'example.com' },
    window: { CMS, h() {}, createClass() {} },
    fetch: async () => ({ ok: true, json: async () => ({ configured: true, mode: 'github', repo: 'owner/journal', branch: 'main', auth }) }),
  });
  await waiting;
  await open();
  assert.ok(configured, elements.get('admin-status').textContent);
  return { config: configured, preSave };
}

test('固定版Decapの送信元チェックと一致するbase_urlで、認証エンドポイントを呼び出す', async () => {
  for (const base of ['https://example.com/api', 'https://example.com/api/', 'https://example.com']) {
    const { config } = await initialize(base);
    const backend = config.backend;
    const callback = new URL('/api/callback', base);
    // decap-cms-lib-auth 3.3.3 compares MessageEvent.origin to base_url exactly.
    // An origin never includes /api, even when the authentication endpoint does.
    assert.equal(backend.base_url, callback.origin, 'The callback handshake must pass the CMS origin check');
    const endpoint = new URL(`${backend.base_url}/${backend.auth_endpoint}`);
    const path = new URL(base).pathname.replace(/\/+$/, '');
    assert.equal(endpoint.href, `https://example.com${path}/auth`);
    assert.equal(config.publish_mode, 'editorial_workflow');
    assert.equal(backend.open_authoring, false);
  }
});

test('カバー画像の説明が足りない保存は管理画面で止め、画像なしの記事は保存できる', async () => {
  const { preSave } = await initialize('https://example.com/api');
  const save = values => {
    const data = { get: key => ({ slug: 'hello', ...values })[key] };
    return preSave({ entry: { get: key => key === 'data' ? data : 'posts/hello.md' } });
  };
  assert.doesNotThrow(() => save({}));
  for (const values of [{}, { coverAlt: '画像の内容' }, { coverCaption: '説明' }, { coverAlt: ' ', coverCaption: ' ' }]) {
    assert.throws(() => save({ cover: 'media/cover.png', ...values }), /カバー画像/);
  }
  assert.doesNotThrow(() => save({ cover: 'media/cover.png', coverAlt: '画像の内容', coverCaption: '短い説明' }));
});
