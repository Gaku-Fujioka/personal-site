import fs from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const skills = {
  HTML: 'html', CSS: 'css', JavaScript: 'js', TypeScript: 'ts', React: 'react',
  Supabase: 'supabase', Vercel: 'vercel', 'Next.js': 'nextjs', Astro: 'astro',
  Docker: 'docker', Figma: 'figma', Git: 'git', GitHub: 'github', 'VS Code': 'vscode',
  C: 'c', Ruby: 'ruby', 'C++': 'cpp',
};
const badges = {
  GitHub: { id: 'github', color: '242424' },
  X: { id: 'x', color: '000000' },
  Qiita: { id: 'qiita', color: '376C17' },
};
async function download(url, file) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const content = await response.text();
  const destination = new URL(`public/icons/${file}`, root);
  await fs.mkdir(new URL('./', destination), { recursive: true });
  await fs.writeFile(destination, content);
  return content;
}
const manifest = { skills: {}, badges: {} };
// Limit concurrent requests while downloading independent SVG assets.
const jobs = [
  ...Object.entries(skills).map(([name, id]) => async () => {
    const file = `skills/${id}.svg`;
    const svg = await download(`https://skillicons.dev/icons?i=${id}&theme=light`, file);
    if (!svg.includes('<svg')) throw new Error(`Invalid icon: ${name}`);
    manifest.skills[name] = `/icons/${file}`;
  }),
  ...Object.entries(badges).map(([name, { id, color }]) => async () => {
    const file = `badges/${id}.svg`;
    const svg = await download(`https://img.shields.io/badge/${name}-${color}?style=for-the-badge&logo=${id}&logoColor=white`, file);
    const width = Number(svg.match(/<svg\b[^>]*\bwidth="([\d.]+)"/)?.[1]);
    const height = Number(svg.match(/<svg\b[^>]*\bheight="([\d.]+)"/)?.[1]);
    if (!width || !height || !svg.includes('<image')) throw new Error(`Invalid badge or missing logo: ${name}`);
    manifest.badges[name] = { src: `/icons/${file}`, width, height };
  }),
];
for (let index = 0; index < jobs.length; index += 4) {
  const results = await Promise.allSettled(jobs.slice(index, index + 4).map(job => job()));
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (errors.length) throw new AggregateError(errors, 'アイコンを取得できませんでした。');
}
await download('https://raw.githubusercontent.com/tandpfun/skill-icons/main/LICENSE', 'skills/LICENSE.txt');
await fs.writeFile(new URL('src/data/brand-assets.json', root), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Skill Icons ${Object.keys(skills).length}点とShields.ioバッジ ${Object.keys(badges).length}点を保存しました。`);
