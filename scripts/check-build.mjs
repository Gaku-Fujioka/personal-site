import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('dist');
async function files(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const all = await files(root);
let links = 0;
const titles = new Set();
const pages = all.filter(file => file.endsWith('.html') && !file.includes(`${path.sep}admin${path.sep}`));
for (const file of pages) {
  const html = await fs.readFile(file, 'utf8');
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const route = relative === '404.html' ? '/404.html' : '/' + relative.replace(/index\.html$/, '');
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /name="description" content="[^"]+"/);
  assert.match(html, /class="skip-link" href="#main"/);
  for (const landmark of ['header', 'nav', 'main', 'footer']) assert.match(html, new RegExp(`<${landmark}\\b`));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${route}: h1`);
  let previous = 0;
  for (const heading of html.matchAll(/<h([1-6])\b/g)) { const level = Number(heading[1]); assert.ok(level <= previous + 1, `${route}: heading order`); previous = level; }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${route}: duplicate IDs`);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  assert.ok(!titles.has(title), `${route}: duplicate title`); titles.add(title);
  assert.doesNotMatch(html, /href="(?:#|)"|target="_blank"|startViewTransition/);
  // Only the explicitly requested 3D experiment may use canvas. Regular pages stay static HTML.
  if (route !== '/room/') assert.doesNotMatch(html, /<canvas/);
  assert.match(html, /og:image" content="[^\"]*\/og\/site.png"/);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) for (const attribute of ['alt', 'width', 'height']) assert.match(image[0], new RegExp(`\\b${attribute}="`));
  for (const link of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const url = new URL(link[1].replaceAll('&amp;', '&'), `http://localhost${route}`);
    if (url.origin !== 'http://localhost') continue;
    const target = path.join(root, url.pathname.endsWith('/') ? `${url.pathname}/index.html` : url.pathname);
    assert.ok(all.includes(target), `${route}: broken link ${link[1]}`);
    if (url.hash) assert.ok((await fs.readFile(target, 'utf8')).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${route}: missing anchor ${link[1]}`);
    links++;
  }
}
console.log(`${pages.length}ページのHTML、見出し、画像alt・寸法、共有画像、内部リンク${links}件を確認しました。`);
