import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const executable=process.env.CANVAS_TEST_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
try { await fs.access(executable); } catch { throw new Error('Chromeが見つかりません。環境変数CANVAS_TEST_BROWSERに対応ブラウザの実行ファイルを指定してください。'); }
const url='http://localhost:4321/room/#canvas-lab';
try { const response=await fetch('http://localhost:4321/room/');if(!response.ok) throw new Error(); }
catch { throw new Error('先に pnpm astro dev --background でサイトを起動してください。'); }
const profile=path.resolve('.journal/canvas-browser');
await fs.mkdir(profile,{recursive:true});
const browser=spawn(executable,[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-sync','--enable-blink-features=CanvasDrawElement','--enable-experimental-web-platform-features',url],{detached:true,stdio:'ignore',windowsHide:true});
browser.on('error',error=>{console.error(error.message);process.exitCode=1;});
browser.unref();
console.log('HTML-in-Canvas用のChromeを別プロファイルで開きました。通常のChromeの設定は変更していません。\n'+url);
