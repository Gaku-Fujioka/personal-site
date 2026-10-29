// A local test browser with a disposable profile. Never connects to a personal browser session.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export async function launchTestBrowser({ native = false, headless = true, background = false } = {}) {
  const qaRoot = path.resolve('.journal/browser-qa');
  await fs.mkdir(qaRoot, { recursive: true });
  const profile = await fs.mkdtemp(path.join(qaRoot, 'profile-'));
  const executable = process.env.CANVAS_TEST_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const args = [...(headless ? ['--headless=new'] : []), '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-sync', '--window-size=1280,1000'];
  if (native) args.push('--enable-blink-features=CanvasDrawElement', '--enable-experimental-web-platform-features');
  const child = spawn(executable, args, { windowsHide: true, stdio: 'ignore' });
  let launchError;
  child.on('error', error => { launchError = error; });
  let port, browserPath;
  const started = Date.now();
  while (!port && Date.now() - started < 20000) {
    if (launchError) throw launchError;
    try { [port, browserPath] = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/); } catch {}
    if (!port) await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!port) { child.kill(); throw new Error('Test browser did not start.'); }
  const socket = new WebSocket(`ws://127.0.0.1:${port}${browserPath}`);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0, session;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      pending.delete(message.id); clearTimeout(timer);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  const send = (method, params = {}, targetSession = session) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(targetSession ? { sessionId: targetSession } : {}) }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', background });
  session = (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
  await send('Page.enable'); await send('Runtime.enable');
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, timeout = 12000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Page condition timed out: ${expression}`);
  };
  const screenshot = async name => {
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const output = path.join(qaRoot, name);
    await fs.writeFile(output, Buffer.from(result.data, 'base64'));
    return output;
  };
  const close = async () => {
    try { await send('Browser.close', {}, undefined); } catch { child.kill(); }
    socket.close();
    await new Promise(resolve => setTimeout(resolve, 300));
    // Verify the absolute cleanup target stays under this test's workspace-owned directory.
    if (path.dirname(profile) !== qaRoot || !path.basename(profile).startsWith('profile-')) throw new Error('Unsafe browser profile cleanup path.');
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {});
  };
  return { send, evaluate, waitFor, screenshot, close, errors };
}
