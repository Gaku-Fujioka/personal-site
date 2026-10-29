import { parse } from 'yaml';
import tags from '../src/data/journal-tags.json' with { type: 'json' };

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const todayInJapan = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function plainText(body) {
  return body.replace(/!\[[^\]]*\]\([^\n]*\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*>`_~]/g, '').replace(/\s+/g, ' ').trim();
}
export const imagePattern = /!\[([^\]\n]*)\]\((media\/[^\s)"\n]+)(?:\s+"([^"\n]*)")?\)/g;
export function mediaPath(value) {
  if (typeof value !== 'string') throw new Error('写真の参照先が不正です。');
  const decoded = decodeURIComponent(value);
  if (!/^media\/[\p{L}\p{N}_. /-]+\.(png|jpe?g|webp|avif)$/iu.test(decoded) || decoded.split('/').some(part => part === '..' || part === '.')) {
    throw new Error('写真はmedia/内のPNG・JPEG・WebP・AVIFを指定してください。');
  }
  return decoded;
}
export function parsePost(source, filename, today = todayInJapan()) {
  const match = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: 記事の先頭に設定情報が必要です。`);
  const data = parse(match[1]);
  const body = match[2].trim();
  const fail = message => { throw new Error(`${filename}: ${message}`); };
  if (!data || typeof data !== 'object') fail('記事情報が不正です。');
  if (!slugPattern.test(data.slug ?? '') || ['tags', 'index'].includes(data.slug)) fail('URL識別子が不正です。');
  if (filename !== `${data.slug}.md`) fail('ファイル名とURL識別子を揃えてください。');
  if (typeof data.title !== 'string' || !data.title.trim() || !body) fail('タイトルと本文が必要です。');
  if (data.draft === true || data.status || data.published === false) fail('下書きを公開データへ含められません。');
  if (!validDate(data.publishedAt) || data.publishedAt > today) fail('有効な投稿日を指定してください。予約公開には対応していません。');
  if (data.updatedAt && (!validDate(data.updatedAt) || data.updatedAt < data.publishedAt || data.updatedAt > today)) fail('更新日を確認してください。');
  if (/<\/?[a-zA-Z!]/.test(body) || /^#\s/m.test(body) || /\]\(\s*(?:javascript|data|vbscript):/i.test(body)) fail('本文にはh2以下の見出しと通常のMarkdownを使い、HTML・スクリプトは含めないでください。');
  const postTags = data.tags ?? [];
  if (!Array.isArray(postTags) || postTags.some(tag => !tags.some(item => item.id === tag))) fail('未定義のタグがあります。');
  const images = [...body.matchAll(imagePattern)];
  if ((body.match(/!\[/g) ?? []).length !== images.length) fail('本文写真は専用の「写真と説明」から追加してください。');
  for (const image of images) {
    mediaPath(image[2]);
    if (!image[1].trim() || !image[3]?.trim()) fail('写真にはaltと短い説明が必要です。');
  }
  if (data.cover) {
    mediaPath(data.cover);
    if (!data.coverAlt?.trim() || !data.coverCaption?.trim()) fail('カバー写真にはaltと説明が必要です。');
  }
  return {
    data: { title: data.title.trim(), slug: data.slug, publishedAt: data.publishedAt,
      ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
      description: typeof data.description === 'string' && data.description.trim() ? data.description.trim() : plainText(body).slice(0, 120) || data.title.trim(),
      tags: [...new Set(postTags)],
    },
    cover: data.cover ? { path: data.cover, alt: data.coverAlt, caption: data.coverCaption } : undefined,
    body, images,
  };
}
