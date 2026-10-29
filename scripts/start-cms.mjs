import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../.journal/editor/', import.meta.url));
await fs.mkdir(`${directory}/posts`, { recursive: true });
await fs.mkdir(`${directory}/media`, { recursive: true });
console.log('ローカルCMS保存先: .journal/editor（公開対象には含まれません）');
const binary = fileURLToPath(new URL('../node_modules/decap-server/dist/index.js', import.meta.url));
const child = spawn(process.execPath, [binary], { cwd: directory, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, MODE: 'fs', GIT_REPO_DIRECTORY: directory, BIND_HOST: '127.0.0.1', PORT: '8081', ORIGIN: 'http://localhost:4321' } });
child.on('exit', code => { process.exitCode = code || 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
