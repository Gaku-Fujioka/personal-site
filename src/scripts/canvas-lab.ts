import { labMatrices, tileVertices } from '../lib/canvas-lab-math.mjs';

type ElementCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
  getElementImageDefaultSize?: (element: Element) => { width: number; height: number };
  updateElementGeometry?: (element: Element, options: { canvasTransform: DOMMatrix }) => void;
  clearElementGeometry?: (element: Element) => void;
};
type ElementGL = WebGL2RenderingContext & {
  texElementSubImage2D?: (target: number, level: number, x: number, y: number, element: Element) => void;
  texElementImage2D?: (...args: unknown[]) => void;
};

const vertexSource = `#version 300 es
precision highp float;
in vec2 aPosition;
in vec2 aCenter;
in float aSeed;
uniform vec2 uSize;
uniform mat4 uClip;
uniform float uTime;
uniform float uSplit;
out vec2 vUv;
out float vDepth;
void main() {
  vec2 local = (aPosition - aCenter) * (1.0-uSplit*0.12);
  float angle = uSplit * sin(aSeed*1.73+uTime*0.65)*0.20;
  vec3 p = vec3(local.x*cos(angle), local.y, local.x*sin(angle));
  vec2 outward = (aCenter/uSize-0.5)*uSplit*95.0;
  p.xy += aCenter + outward;
  p.z += uSplit*(28.0+sin(aSeed*1.31+uTime*0.8)*36.0);
  gl_Position = uClip * vec4(p,1.0);
  vUv = aPosition/uSize;
  vDepth = p.z;
}`;
const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uSplit;
in vec2 vUv;
in float vDepth;
out vec4 color;
void main() {
  vec4 html = texture(uTexture,vec2(vUv.x,1.0-vUv.y));
  float sweep = mod(uTime*0.18,2.2)-0.5;
  float light = exp(-pow((vUv.x+vUv.y*0.65-sweep)*5.0,2.0));
  vec3 tint = vec3(0.30,0.60,0.92);
  vec3 lit = html.rgb*(0.97+vDepth*0.0007) + light*tint*0.18;
  // Tiny tile edge shading makes depth visible without redrawing or cloning the HTML.
  color = vec4(lit*html.a,html.a);
}`;

document.querySelectorAll<HTMLElement>('[data-canvas-lab]').forEach(initializeCanvasLab);

function initializeCanvasLab(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('[data-lab-stage]')!;
  const source = root.querySelector<HTMLElement>('[data-lab-source]')!;
  const card = root.querySelector<HTMLElement>('[data-lab-card]')!;
  const badge = root.querySelector<HTMLElement>('[data-lab-status]')!;
  const message = root.querySelector<HTMLElement>('[data-lab-message]')!;
  const hint = root.querySelector<HTMLElement>('[data-lab-hint]')!;
  const apiLabel = root.querySelector<HTMLElement>('[data-lab-api]')!;
  const uploadsLabel = root.querySelector<HTMLOutputElement>('[data-lab-uploads]')!;
  const renderButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-lab-render]')];
  const effectButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-lab-effect]')];
  const motionButton = root.querySelector<HTMLButtonElement>('[data-lab-motion]')!;
  const input = card.querySelector<HTMLInputElement>('input')!;
  const copy = card.querySelector<HTMLElement>('[data-lab-copy]')!;
  let clicks = 0;
  input.addEventListener('input', () => { copy.textContent = input.value || 'ここに、あなたのひとことを。'; });
  card.querySelectorAll<HTMLButtonElement>('[data-lab-palette]').forEach(button => button.addEventListener('click', () => {
    card.dataset.palette = button.dataset.labPalette;
    card.querySelectorAll('[data-lab-palette]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  card.querySelector('[data-lab-count]')!.addEventListener('click', () => { card.querySelector('[data-lab-count-value]')!.textContent = String(++clicks); });

  const canvas = document.createElement('canvas') as ElementCanvas;
  canvas.setAttribute('content', 'drawable');
  canvas.setAttribute('layoutsubtree', '');
  canvas.setAttribute('aria-label', 'HTMLをGPUに描画する実験。入力とボタンは元のHTMLです。');
  canvas.hidden = true;
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true }) as ElementGL | null;
  const api = gl?.texElementSubImage2D ? 'texElementSubImage2D' : gl?.texElementImage2D ? 'texElementImage2D' : null;
  root.dataset.nativeState = 'unsupported';
  if (!gl || !api || !canvas.updateElementGeometry) {
    badge.textContent = 'APIが無効 / 元のHTMLを表示';
    message.textContent = 'このブラウザではAPIの効果をまだ体験できません。下の案内にある pnpm canvas:open で、実験用Chromeを開いてください。';
    hint.textContent = 'この状態は通常のHTMLです。入力とボタンは試せます。';
    apiLabel.textContent = 'API未使用';
    return;
  }

  let program: WebGLProgram, buffer: WebGLBuffer, texture: WebGLTexture, vao: WebGLVertexArrayObject;
  try {
    const compile = (type: number, code: string) => {
      const shader = gl.createShader(type)!; gl.shaderSource(shader, code); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const error = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(error || 'shader'); }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram()!; gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'program');
    vao = gl.createVertexArray()!; gl.bindVertexArray(vao);
    buffer = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [name,size,offset] of [['aPosition',2,0],['aCenter',2,8],['aSeed',1,16]] as const) {
      const location = gl.getAttribLocation(program,name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,size,gl.FLOAT,false,20,offset);
    }
    texture = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  } catch {
    badge.textContent = 'GPUを初期化できませんでした'; message.textContent = '元のHTMLで表示しています。別の対応ブラウザで試してください。'; return;
  }
  const uniforms = Object.fromEntries(['uClip','uSize','uTexture','uTime','uSplit'].map(name => [name,gl.getUniformLocation(program,name)]));
  host.insertBefore(canvas, source);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches, active = false, ready = false, visible = true;
  let time = 0, poseTime = 0, lastTime = 0, frame = 0, uploads = 0, split = 0;
  let effect: 'live' | 'tiles' = 'live';
  let cardWidth = 420, cardHeight = 390, vertexCount = 0, textureWidth = 0, textureHeight = 0;
  let pointerX = 0, pointerY = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function updateButtons() {
    renderButtons.forEach(button => { button.disabled = false; button.setAttribute('aria-pressed',String((button.dataset.labRender === 'gpu') === active)); });
    effectButtons.forEach(button => { button.disabled = !active; button.setAttribute('aria-pressed',String(button.dataset.labEffect === effect)); });
    motionButton.disabled = !active;
    motionButton.setAttribute('aria-pressed',String(paused)); motionButton.textContent = paused ? '動きを再開' : '動きを止める';
  }
  function restore(reason?: string) {
    active = false; ready = false; cancelAnimationFrame(frame); frame = 0; clearTimeout(timer);
    canvas.clearElementGeometry?.(card);
    card.inert = false; card.removeAttribute('aria-hidden'); card.removeAttribute('drawable'); card.style.transform = ''; card.style.width = '';
    source.append(card); source.hidden = false; canvas.hidden = true;
    root.dataset.nativeState = reason ? 'failed' : 'html';
    badge.textContent = reason ? '描画に失敗 / 元のHTMLを表示' : '元のHTML / 比較モード';
    message.textContent = reason || 'こちらは通常のHTMLです。「API + GPU」で同じ入力内容を立体描画へ戻せます。';
    apiLabel.textContent = 'API未使用（元のHTML）'; hint.textContent = '入力内容・色・クリック数は切り替えても保持します。';
    updateButtons();
  }
  function resizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1,2);
    const width = Math.max(1,Math.round(host.clientWidth*dpr)), height = Math.max(1,Math.round(host.clientHeight*dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width=width;canvas.height=height; }
    if (active) {
      const padding=getComputedStyle(source);
      const nextWidth=Math.min(420,host.clientWidth-parseFloat(padding.paddingLeft)-parseFloat(padding.paddingRight));
      if (Math.abs(nextWidth-cardWidth)>1) {
        card.style.width=`${nextWidth}px`;cardWidth=card.offsetWidth;cardHeight=card.offsetHeight;
        const vertices=tileVertices(cardWidth,cardHeight);vertexCount=vertices.length/5;
        gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
        canvas.requestPaint?.();
      }
    }
    schedule();
  }
  function activate() {
    if (active) return;
    cardWidth=card.offsetWidth;cardHeight=card.offsetHeight;
    card.style.width=`${cardWidth}px`; card.setAttribute('drawable','');
    source.hidden=true;canvas.hidden=false;canvas.append(card);
    active=true;ready=false;effect='live';split=0;textureWidth=0;textureHeight=0;
    const vertices=tileVertices(cardWidth,cardHeight);vertexCount=vertices.length/5;
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    root.dataset.nativeState='starting';badge.textContent='APIの描画を準備中';hint.textContent='HTMLをGPUへ転送しています。';
    updateButtons();resizeCanvas();canvas.requestPaint?.();
    timer=setTimeout(() => { if (!ready) restore('APIからHTMLを取得できなかったため、元のHTMLへ戻しました。ブラウザのフラグ・対応バージョンを確認してください。'); },4000);
  }
  function uploadHTML() {
    if (!active) return;
    root.dataset.paintEvents=String(Number(root.dataset.paintEvents || 0)+1);
    try {
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      if (api === 'texElementSubImage2D') {
        // Chrome 155 exposes the texture API before getElementImageDefaultSize was added.
        const size=canvas.getElementImageDefaultSize?.(card) || {width:Math.round(cardWidth*devicePixelRatio),height:Math.round(cardHeight*devicePixelRatio)};
        if (size.width !== textureWidth || size.height !== textureHeight) {
          textureWidth=size.width;textureHeight=size.height;
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,textureWidth,textureHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        }
        gl.texElementSubImage2D!(gl.TEXTURE_2D,0,0,0,card);
      } else gl.texElementImage2D!(gl.TEXTURE_2D,gl.RGBA8,card);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('texture upload');
      uploadsLabel.value=String(++uploads);
      delete root.dataset.nativeError;
      ready=true;clearTimeout(timer);root.dataset.nativeState='active';badge.textContent='APIでGPU描画中';apiLabel.textContent=`${api}()`;
      message.textContent='この画面はHTMLを直接GPUへ転送して描画しています。入力・色・クリック数を変え、光や分割の効果を試してください。';
      schedule();
    } catch (error) {
      root.dataset.nativeError=error instanceof Error ? error.message : String(error);
      if (ready) restore('HTMLのGPU転送に失敗したため、元のHTMLへ戻しました。入力内容は保持しています。');
    }
  }
  canvas.addEventListener('paint',uploadHTML);

  function schedule() { if (!frame && active && ready && visible && !document.hidden) frame=requestAnimationFrame(draw); }
  function draw(now: number) {
    frame=0;if (!active || !ready || !visible || document.hidden) { lastTime=0;return; }
    const dt=lastTime ? Math.min((now-lastTime)/1000,.05) : 0; lastTime=now;
    if (!paused) time+=dt;
    const selection=getSelection();
    const editing=card.contains(document.activeElement) || !!(selection && !selection.isCollapsed && card.contains(selection.anchorNode));
    if (!editing) poseTime=time;
    const target=effect === 'tiles' ? 1 : 0;
    split=paused ? target : split+(target-split)*(1-Math.exp(-dt*9));
    if (Math.abs(target-split)<.001) split=target;
    const matrices=labMatrices(host.clientWidth,host.clientHeight,cardWidth,cardHeight,{
      pitch:.08+(editing || paused ? 0 : Math.sin(poseTime*.5)*.025+pointerY*.04),
      yaw:-.12+(editing || paused ? 0 : Math.sin(poseTime*.35)*.06+pointerX*.08),
      lift:editing || paused ? 0 : Math.sin(poseTime*.7)*7,
    });
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
    gl.useProgram(program);gl.bindVertexArray(vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.uniformMatrix4fv(uniforms.uClip,false,new Float32Array(matrices.clip));gl.uniform2f(uniforms.uSize,cardWidth,cardHeight);
    gl.uniform1i(uniforms.uTexture,0);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uSplit,split);
    gl.drawArrays(gl.TRIANGLES,0,vertexCount);
    const interactive=effect === 'live' && split < .01;
    if (card.inert === interactive) { card.inert=!interactive;if (interactive) card.removeAttribute('aria-hidden');else card.setAttribute('aria-hidden','true'); }
    if (interactive) canvas.updateElementGeometry!(card,{canvasTransform:new DOMMatrix(matrices.screen)});
    else canvas.clearElementGeometry?.(card);
    hint.textContent=interactive ? 'この画面で入力・色変更・ボタン操作を試せます。' : '40枚にほどいた鑑賞モード。「触る」で入力に戻れます。';
    if (!paused || Math.abs(target-split)>.001) schedule();
  }
  renderButtons.forEach(button => button.addEventListener('click',() => { button.dataset.labRender === 'gpu' ? activate() : restore(); }));
  effectButtons.forEach(button => button.addEventListener('click',() => { effect=button.dataset.labEffect as 'live'|'tiles';updateButtons();schedule(); }));
  motionButton.addEventListener('click',() => { paused=!paused;lastTime=0;updateButtons();schedule(); });
  reducedMotion.addEventListener('change',event => { paused=event.matches;lastTime=0;updateButtons();schedule(); });
  host.addEventListener('pointermove',event => { const rect=host.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;schedule(); });
  host.addEventListener('pointerleave',() => { pointerX=pointerY=0;schedule(); });
  card.addEventListener('focusin',schedule);card.addEventListener('focusout',schedule);
  new ResizeObserver(resizeCanvas).observe(host);
  new IntersectionObserver(entries => { visible=entries[0].isIntersecting;lastTime=0;if (!visible) { cancelAnimationFrame(frame);frame=0; } else schedule(); },{rootMargin:'50px'}).observe(host);
  document.addEventListener('visibilitychange',() => { lastTime=0;if (document.hidden) { cancelAnimationFrame(frame);frame=0; } else schedule(); });
  canvas.addEventListener('webglcontextlost',event => { event.preventDefault();restore('GPUの接続が失われたため、元のHTMLへ戻しました。ページを再読み込みすると再試行できます。');renderButtons.find(button => button.dataset.labRender === 'gpu')!.disabled=true; });
  activate();
}
