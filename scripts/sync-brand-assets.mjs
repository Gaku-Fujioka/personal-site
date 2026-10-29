import fs from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const skills = {
  HTML: 'html', CSS: 'css', JavaScript: 'js', TypeScript: 'ts', React: 'react',
  Supabase: 'supabase', Vercel: 'vercel', 'Next.js': 'nextjs', Astro: 'astro',
  Docker: 'docker', Figma: 'figma', Git: 'git', GitHub: 'github', 'VS Code': 'vscode',
  C: 'c', Ruby: 'ruby', 'C++': 'cpp',
};
const socials = {
  GitHub: { id: 'github', color: '242424' },
  X: { id: 'x', color: '000000' },
  Qiita: { id: 'qiita', color: '376C17' },
};
async function download(url, file, transform = content => content) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const content = transform(await response.text());
  const destination = new URL(`public/icons/${file}`, root);
  await fs.mkdir(new URL('./', destination), { recursive: true });
  await fs.writeFile(destination, content);
  return content;
}
const manifest = { skills: {}, socials: {} };
// Limit concurrent requests while downloading independent SVG assets.
const jobs = [
  ...Object.entries(skills).map(([name, id]) => async () => {
    const file = `skills/${id}.svg`;
    const svg = await download(`https://skillicons.dev/icons?i=${id}&theme=light`, file);
    if (!svg.includes('<svg')) throw new Error(`Invalid icon: ${name}`);
    manifest.skills[name] = `/icons/${file}`;
  }),
  ...Object.entries(socials).map(([name, { id, color }]) => async () => {
    const file = `socials/${id}.svg`;
    await download(`https://img.shields.io/badge/${name}-${color}?style=for-the-badge&logo=${id}&logoColor=white`, file, badge => {
      const encoded = badge.match(/href="data:image\/svg\+xml;base64,([^"]+)"/)?.[1];
      if (!encoded) throw new Error(`Missing logo: ${name}`);
      const svg = Buffer.from(encoded, 'base64').toString('utf8');
      if (!svg.includes('<svg') || !svg.includes('<path')) throw new Error(`Invalid logo: ${name}`);
      return svg.replace('fill="white"', 'fill="#242424"');
    });
    manifest.socials[name] = `/icons/${file}`;
  }),
];
for (let index = 0; index < jobs.length; index += 4) {
  const results = await Promise.allSettled(jobs.slice(index, index + 4).map(job => job()));
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (errors.length) throw new AggregateError(errors, 'アイコンを取得できませんでした。');
}
await download('https://raw.githubusercontent.com/tandpfun/skill-icons/main/LICENSE', 'skills/LICENSE.txt');
for (const group of Object.keys(manifest)) manifest[group] = Object.fromEntries(Object.entries(manifest[group]).sort(([a], [b]) => a.localeCompare(b)));
await fs.writeFile(new URL('src/data/brand-assets.json', root), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Skill Icons ${Object.keys(skills).length}点とSNSロゴ ${Object.keys(socials).length}点を保存しました。`);
