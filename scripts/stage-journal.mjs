import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePost, slugPattern, mediaPath } from './journal-core.mjs';
import { inside } from './prepare-journal.mjs';
const root = fileURLToPath(new URL('../.journal/', import.meta.url));
const slug = process.argv[2];
if (!slugPattern.test(slug ?? '')) throw new Error('確認する記事のURL識別子を指定してください。');
const editor = path.join(root, 'editor');
const destination = path.join(root, 'source');
const raw = await fs.readFile(inside(editor, path.join(editor, 'posts', `${slug}.md`)), 'utf8');
const post = parsePost(raw, `${slug}.md`);
for (const file of new Set([post.cover?.path, ...post.images.map(image => image[2])].filter(Boolean).map(mediaPath))) {
  const source = inside(editor, path.join(editor, file));
  const real = await fs.realpath(source); inside(editor, real);
  const output = inside(destination, path.join(destination, file));
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.copyFile(real, output);
}
await fs.mkdir(path.join(destination, 'posts'), { recursive: true });
await fs.writeFile(path.join(destination, 'posts', `${slug}.md`), raw);
console.log('選択した記事をローカル表示確認用に準備しました。公開・Git操作は行っていません。');
