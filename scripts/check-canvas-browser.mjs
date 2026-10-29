import { launchTestBrowser } from './lib/browser-session.mjs';
import assert from 'node:assert/strict';

const browser = await launchTestBrowser({ native: true, headless: !process.argv.includes('--headed') });
try {
  const support=await browser.evaluate(`(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const ctx = document.createElement('canvas').getContext('2d');
    return { userAgent: navigator.userAgent, webgl: !!gl,
      drawElementImage: typeof ctx?.drawElementImage,
      texElementSubImage2D: typeof gl?.texElementSubImage2D,
      texElementImage2D: typeof gl?.texElementImage2D,
      updateElementGeometry: typeof canvas.updateElementGeometry,
      getElementImageDefaultSize: typeof canvas.getElementImageDefaultSize,
      getElementTransform: typeof canvas.getElementTransform };
  })()`);
  console.log(JSON.stringify(support,null,2));
  if (!process.argv.includes('--probe')) {
    const scale=Number(process.argv.find(arg=>arg.startsWith('--scale='))?.split('=')[1] || 1);
    if (process.argv.some(arg=>arg.startsWith('--scale='))) await browser.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:scale,mobile:false});
    await browser.send('Page.navigate',{url:'http://localhost:4321/room/'});
    await browser.waitFor(`document.querySelector('[data-canvas-lab]')?.dataset.nativeState === 'active'`);
    console.log('Actual HTML -> GPU upload succeeded.');
    console.log(JSON.stringify(await browser.evaluate(`({status:document.querySelector('[data-lab-status]').textContent, api:document.querySelector('[data-lab-api]').textContent,uploads:document.querySelector('[data-lab-uploads]').value,inputRect:JSON.stringify(document.querySelector('#canvas-lab-input').getBoundingClientRect())})`),null,2));
    console.log(await browser.screenshot('gpu-live-desktop.png'));
    const click=async selector=>{
      await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
      await browser.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      const point=await browser.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
      await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
      await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
    };
    await click('[data-lab-motion]');
    await click('#canvas-lab-input');
    assert.equal(await browser.evaluate('document.activeElement.id'),'canvas-lab-input','Native canvas input hit testing');
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
    await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
    assert.ok(await browser.evaluate(`document.querySelector('#canvas-lab-input').selectionEnd > document.querySelector('#canvas-lab-input').selectionStart`),'Native input text selection');
    await browser.send('Input.insertText',{text:'Hello from live HTML'});
    await browser.waitFor(`document.querySelector('[data-lab-copy]').textContent === 'Hello from live HTML'`);
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await browser.evaluate(`document.activeElement.dataset.labPalette`),'blue','Native canvas Tab navigation');
    const before=await browser.evaluate(`Number(document.querySelector('[data-lab-uploads]').value)`);
    await click('[data-lab-palette="amber"]');
    await browser.waitFor(`document.querySelector('[data-lab-card]').dataset.palette === 'amber' && Number(document.querySelector('[data-lab-uploads]').value)>${before}`);
    await click('[data-lab-count]');
    assert.equal(await browser.evaluate(`document.querySelector('[data-lab-count-value]').textContent`),'1','Native canvas button hit testing');
    const ax=await browser.send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(node=>!node.ignored && node.role?.value === 'textbox' && node.name?.value.includes('この文章')),'Input remains in accessibility tree');
    const textRect=await browser.evaluate(`(()=>{const range=document.createRange();range.selectNodeContents(document.querySelector('[data-lab-copy]'));const r=range.getBoundingClientRect();return {x:r.x+2,y:r.y+r.height/2,end:r.right-2};})()`);
    await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:textRect.x,y:textRect.y});
    await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:textRect.x,y:textRect.y});
    for(let step=1;step<=6;step++) { await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',buttons:1,x:textRect.x+(textRect.end-textRect.x)*step/6,y:textRect.y});await new Promise(resolve=>setTimeout(resolve,30)); }
    await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:textRect.end,y:textRect.y});
    console.log('Text selection:',JSON.stringify(await browser.evaluate('getSelection().toString()')),textRect);
    if (!(await browser.evaluate('getSelection().toString()')).length) console.log('Compatibility limitation: paragraph drag selection did not work in this Chrome build; input selection works.');
    await click('[data-lab-effect="tiles"]');
    await browser.waitFor(`document.querySelector('[data-lab-card]').inert`);
    await browser.evaluate(`document.querySelector('[data-lab-stage]').scrollIntoView({block:'center',behavior:'instant'})`);
    console.log(await browser.screenshot('gpu-tiles-desktop.png'));
    assert.equal(await browser.evaluate(`document.querySelector('#canvas-lab-input').value`),'Hello from live HTML');
    await click('[data-lab-effect="live"]');
    await browser.waitFor(`!document.querySelector('[data-lab-card]').inert`);
    await click('[data-lab-count]');
    assert.equal(await browser.evaluate(`document.querySelector('[data-lab-count-value]').textContent`),'2','Hit testing restored after tiles');
    await click('[data-lab-render="html"]');
    assert.equal(await browser.evaluate(`document.querySelector('[data-canvas-lab]').dataset.nativeState`),'html');
    assert.equal(await browser.evaluate(`document.querySelector('#canvas-lab-input').value`),'Hello from live HTML','HTML comparison preserves input');
    await click('[data-lab-render="gpu"]');
    await browser.waitFor(`document.querySelector('[data-canvas-lab]').dataset.nativeState === 'active'`);
    await browser.send('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});
    await browser.evaluate(`document.querySelector('[data-lab-stage]').scrollIntoView({block:'center',behavior:'instant'})`);
    await browser.waitFor(`document.querySelector('[data-lab-card]').offsetWidth < 300`);
    assert.ok(await browser.evaluate(`document.documentElement.scrollWidth <= innerWidth`),'No mobile horizontal overflow');
    await click('[data-lab-count]');
    assert.equal(await browser.evaluate(`document.querySelector('[data-lab-count-value]').textContent`),'3','Mobile native button hit testing');
    console.log(await browser.screenshot('gpu-live-mobile.png'));
    await browser.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await browser.evaluate(`document.querySelector('[data-lab-motion]').getAttribute('aria-pressed')`),'true');
    await browser.evaluate(`document.querySelector('[data-lab-stage] canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);
    await browser.waitFor(`document.querySelector('[data-canvas-lab]').dataset.nativeState === 'failed'`);
    assert.equal(await browser.evaluate(`document.querySelector('#canvas-lab-input').value`),'Hello from live HTML','GPU failure preserves input');
    assert.equal(await browser.evaluate(`document.querySelector('[data-lab-source]').hidden`),false);
    console.log('Native input, Tab, input selection, palette, button, accessibility tree, tiles/restore, HTML comparison, mobile, reduced motion and GPU failure recovery passed.');
    assert.equal(browser.errors.length,0,browser.errors.join('\n'));
  }
} catch(error) {
  console.error(JSON.stringify(await browser.evaluate(`({state:{...document.querySelector('[data-canvas-lab]')?.dataset},message:document.querySelector('[data-lab-message]')?.textContent,errors:${JSON.stringify(browser.errors)}})`),null,2));
  console.error(await browser.screenshot('gpu-failure.png'));
  throw error;
} finally { await browser.close(); }

if (!process.argv.includes('--probe')) {
  const fallback=await launchTestBrowser();
  try {
    await fallback.send('Page.navigate',{url:'http://localhost:4321/room/'});
    await fallback.waitFor(`document.querySelector('[data-canvas-lab]')?.dataset.nativeState === 'unsupported'`);
    assert.equal(await fallback.evaluate(`document.querySelector('[data-lab-render="gpu"]').disabled`),true);
    assert.equal(await fallback.evaluate(`document.querySelector('[data-lab-source]').hidden`),false);
    assert.equal(await fallback.evaluate(`document.querySelector('[data-lab-api]').textContent`),'API未使用');
    console.log('Flag-free browser correctly displays ordinary HTML and reports API unavailable.');
  } finally { await fallback.close(); }
}
