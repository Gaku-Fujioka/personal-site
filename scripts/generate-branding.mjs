import fs from 'node:fs/promises';
import sharp from 'sharp';
await fs.mkdir(new URL('../public/og/', import.meta.url), { recursive: true });
await sharp(new URL('../src/assets/site-og.svg', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).png().toFile(new URL('../public/og/site.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
await sharp(new URL('../public/gaku.svg', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).resize(32, 32).png().toFile(new URL('../public/gaku-32.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
console.log('GFファビコンと共通共有画像を生成しました。');
