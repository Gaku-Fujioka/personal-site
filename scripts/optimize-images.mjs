import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const images = [
  { path: 'profile', width: 384, quality: 84 },
  ...['home', 'start', 'match'].map(name => ({ path: `projects/iepita/${name}`, width: 1280, quality: 88 })),
];

let originalTotal = 0;
let optimizedTotal = 0;
for (const image of images) {
  const source = new URL(`src/assets/images/${image.path}.png`, root);
  const destination = new URL(`public/images/${image.path}.webp`, root);
  await fs.mkdir(new URL('./', destination), { recursive: true });
  const original = await fs.stat(source);
  const info = await sharp(fileURLToPath(source))
    .rotate()
    .resize({ width: image.width, withoutEnlargement: true })
    .webp({ quality: image.quality, effort: 6, smartSubsample: true })
    .toFile(fileURLToPath(destination));
  originalTotal += original.size;
  optimizedTotal += info.size;
  console.log(`${image.path}: ${info.width}×${info.height}, ${(original.size / 1024).toFixed(1)} KB → ${(info.size / 1024).toFixed(1)} KB`);
}
console.log(`合計: ${(originalTotal / 1024).toFixed(1)} KB → ${(optimizedTotal / 1024).toFixed(1)} KB（${(100 * (1 - optimizedTotal / originalTotal)).toFixed(1)}%削減）`);
