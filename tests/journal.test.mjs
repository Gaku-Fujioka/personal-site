import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parsePost, mediaPath } from '../scripts/journal-core.mjs';
import { prepareJournal, inside } from '../scripts/prepare-journal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const article = (extra = '', body = '表示確認用の文章です。本人の体験ではありません。') => `---\ntitle: 表示確認用\nslug: layout-check\npublishedAt: '2026-10-01'\n${extra}\n---\n${body}\n`;

test('日付・概要・タグ・写真の検証と、不正入力の拒否', () => {
  assert.match(parsePost(article(), 'layout-check.md').data.description, /表示確認用/);
  for (const content of [article("draft: true"), article("tags: [unknown]"), article('', '# h1'), article('', '<script>alert(1)</script>'), article('', '[link](javascript:alert)'), article('', '![alt](media/x.png)'), article("updatedAt: '2026-09-01'")]) {
    assert.throws(() => parsePost(content, 'layout-check.md'));
  }
  assert.throws(() => parsePost(article().replace('2026-10-01', '2026-02-30'), 'layout-check.md'));
  assert.throws(() => parsePost(article().replace('2026-10-01', '2099-10-01'), 'layout-check.md'));
  assert.throws(() => parsePost(article(), 'another-url.md'));
  assert.throws(() => mediaPath('media/../private.jpg'));
  assert.throws(() => mediaPath('media/%2e%2e/private.jpg'));
  assert.equal(mediaPath('media/旅行%20写真.jpg'), 'media/旅行 写真.jpg');
  assert.throws(() => inside(root, path.resolve(root, '..', 'outside')));
});

test('公開に使用する画像だけを最適化し、未公開データを出力しない', async () => {
  await fs.mkdir(path.join(root, '.journal'), { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, '.journal', 'test-'));
  try {
    await fs.mkdir(path.join(directory, 'posts'));
    await fs.mkdir(path.join(directory, 'media'));
    const photo = await sharp({ create: { width: 800, height: 500, channels: 3, background: '#eaf0fa' } }).png().toBuffer();
    await fs.writeFile(path.join(directory, 'media', 'photo.png'), photo);
    await fs.writeFile(path.join(directory, 'media', 'unpublished-secret.txt'), 'DRAFT_SECRET_DO_NOT_PUBLISH');
    await fs.mkdir(path.join(directory, 'drafts'));
    await fs.writeFile(path.join(directory, 'drafts', 'secret.md'), 'DRAFT_SECRET_DO_NOT_PUBLISH');
    await fs.writeFile(path.join(directory, 'posts', 'layout-check.md'), article('tags: [travel]', '## 表示確認用\n\n![青いテスト用図形](media/photo.png "表示確認用の画像です。")'));
    assert.equal(await prepareJournal({ mode: 'local', sourceDir: directory }), 1);
    const rendered = await fs.readFile(path.join(root, '.journal/published/posts/layout-check.md'), 'utf8');
    assert.match(rendered, /<figure>/); assert.match(rendered, /width="800" height="500"/); assert.match(rendered, /srcset=/);
    assert.doesNotMatch(rendered, /DRAFT_SECRET/);
    assert.ok((await fs.readdir(path.join(root, 'public/journal-media'))).every(name => name.endsWith('.webp')));
    await assert.rejects(prepareJournal({ mode: 'invalid' }));
    assert.ok((await fs.readdir(path.join(root, '.journal/published/posts'))).includes('layout-check.md'), '失敗時に前の生成結果を維持');
  } finally {
    await prepareJournal({ mode: 'empty' });
    await fs.rm(inside(path.join(root, '.journal'), directory), { recursive: true, force: true });
  }
});
