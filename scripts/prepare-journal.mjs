import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parsePost, mediaPath } from './journal-core.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = path.join(root, '.journal');
export function inside(parent, child) {
  const relative = path.relative(parent, child);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('管理対象フォルダの外には操作できません。');
  return child;
}
async function readLocal(directory, file) {
  const base = await fs.realpath(directory);
  const target = await fs.realpath(inside(base, path.resolve(base, file)));
  inside(base, target);
  return fs.readFile(target);
}
async function githubSource() {
  const repo = process.env.JOURNAL_REPO;
  const token = process.env.JOURNAL_TOKEN;
  const branch = process.env.JOURNAL_BRANCH || 'main';
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo ?? '') || !token || !/^[A-Za-z0-9_./-]+$/.test(branch)) throw new Error('非公開記事の取得設定が不足しています。');
  async function api(endpoint) {
    const response = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`非公開記事を取得できませんでした（HTTP ${response.status}）。`);
    return response.json();
  }
  if (!(await api('')).private) throw new Error('記事の保存先には非公開リポジトリを指定してください。');
  const commit = await api(`/commits/${encodeURIComponent(branch)}`);
  if (!/^[a-f0-9]{40}$/.test(commit.sha ?? '')) throw new Error('公開対象の版を確認できませんでした。');
  const entries = await api(`/contents/posts?ref=${commit.sha}`);
  if (!Array.isArray(entries)) throw new Error('postsフォルダを取得できませんでした。');
  return {
    names: entries.filter(entry => entry.type === 'file' && entry.name.endsWith('.md')).map(entry => entry.name),
    read: async file => {
      const response = await fetch(`https://api.github.com/repos/${repo}/contents/${file.split('/').map(encodeURIComponent).join('/')}?ref=${commit.sha}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`記事・写真の取得に失敗しました（HTTP ${response.status}）。`);
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length > 20 * 1024 * 1024) throw new Error('写真は20MB以下にしてください。');
      return data;
    },
  };
}
const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function replaceGeneratedFiles(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const names = await fs.readdir(source);
  for (const name of names) {
    const input = inside(source, path.join(source, name));
    const output = inside(destination, path.join(destination, name));
    const bytes = await fs.readFile(input);
    const previous = await fs.readFile(output).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!previous?.equals(bytes)) await fs.writeFile(output, bytes);
  }
  for (const name of await fs.readdir(destination)) {
    if (!names.includes(name)) await fs.unlink(inside(destination, path.join(destination, name)));
  }
}

export async function prepareJournal({ mode = process.env.JOURNAL_SOURCE || 'empty', sourceDir = process.env.JOURNAL_LOCAL_DIR ? path.resolve(root, process.env.JOURNAL_LOCAL_DIR) : path.join(privateRoot, 'source') } = {}) {
  // Only published input is accepted here. The local CMS writes to .journal/editor instead.
  let source;
  if (mode === 'github') source = await githubSource();
  else if (mode === 'local') {
    inside(privateRoot, path.resolve(sourceDir));
    const names = await fs.readdir(path.join(sourceDir, 'posts'));
    source = { names: names.filter(name => name.endsWith('.md')), read: file => readLocal(sourceDir, file) };
  } else if (mode === 'empty') source = { names: [], read: async () => { throw new Error('記事の取得元が未設定です。'); } };
  else throw new Error('JOURNAL_SOURCEはempty / local / githubから選んでください。');

  const stage = inside(privateRoot, path.join(privateRoot, `stage-${crypto.randomUUID()}`));
  await fs.mkdir(path.join(stage, 'posts'), { recursive: true });
  await fs.mkdir(path.join(stage, 'media'), { recursive: true });
  const imageCache = new Map();
  async function image(file) {
    file = mediaPath(file);
    if (imageCache.has(file)) return imageCache.get(file);
    const bytes = await source.read(file);
    if (bytes.length > 20 * 1024 * 1024) throw new Error('写真は20MB以下にしてください。');
    const metadata = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
    if (!metadata.width || !metadata.height) throw new Error('写真のサイズを取得できません。');
    const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 20);
    const variants = [];
    for (const width of [320, 640, 1280]) {
      const filename = `${hash}-${width}.webp`;
      const { data, info } = await sharp(bytes).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      await fs.writeFile(path.join(stage, 'media', filename), data);
      variants.push({ src: `/journal-media/${filename}`, width: info.width, height: info.height });
    }
    const main = variants.at(-1);
    const result = { ...main, srcset: [...new Map(variants.map(variant => [variant.width, variant])).values()].map(variant => `${variant.src} ${variant.width}w`).join(', ') };
    imageCache.set(file, result);
    return result;
  }
  try {
    const seen = new Set();
    for (const name of source.names.sort()) {
      if (!/^[a-z0-9-]+\.md$/.test(name)) throw new Error('記事ファイル名が不正です。');
      const post = parsePost((await source.read(`posts/${name}`)).toString('utf8'), name);
      if (seen.has(post.data.slug)) throw new Error('記事のURL識別子が重複しています。');
      seen.add(post.data.slug);
      if (post.cover) post.data.cover = { ...await image(post.cover.path), alt: post.cover.alt, caption: post.cover.caption };
      let body = post.body;
      for (const match of post.images) {
        const photo = await image(match[2]);
        const figure = `<figure><img src="${photo.src}" srcset="${photo.srcset}" sizes="(max-width: 767px) calc(100vw - 40px), 680px" width="${photo.width}" height="${photo.height}" alt="${escapeHtml(match[1])}" loading="lazy"><figcaption>${escapeHtml(match[3])}</figcaption></figure>`;
        body = body.replace(match[0], `\n\n${figure}\n\n`);
      }
      // JSON is valid YAML. Quoted dates keep the same calendar day in every parser.
      await fs.writeFile(path.join(stage, 'posts', name), `---\n${JSON.stringify(post.data, null, 2)}\n---\n${body}\n`);
    }
    const output = inside(privateRoot, path.join(privateRoot, 'published'));
    const mediaOutput = inside(path.join(root, 'public'), path.join(root, 'public', 'journal-media'));
    await fs.mkdir(path.join(root, 'public'), { recursive: true });
    // Keep watched directories stable on Windows. All input is validated before this step.
    await replaceGeneratedFiles(path.join(stage, 'media'), mediaOutput);
    await replaceGeneratedFiles(path.join(stage, 'posts'), inside(output, path.join(output, 'posts')));
    await fs.rm(inside(privateRoot, stage), { recursive: true, force: true });
    return seen.size;
  } catch (error) {
    await fs.rm(inside(privateRoot, stage), { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await prepareJournal();
  console.log(`Journal: ${count}件の公開記事を準備しました。`);
}
