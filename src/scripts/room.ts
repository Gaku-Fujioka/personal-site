import { roomViews, cameraTransform, clamp } from '../lib/room-camera.mjs';

type View = keyof typeof roomViews;
type NativeContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number, width: number, height: number) => void;
};
type NativeCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
  updateElementGeometry?: (element: Element, options: { canvasTransform: DOMMatrix }) => void;
  getElementTransform?: (element: Element) => DOMMatrix;
};

const app = document.querySelector<HTMLElement>('[data-room-app]');
if (app) initializeRoom(app);

function initializeRoom(root: HTMLElement) {
  const scene = root.querySelector<HTMLElement>('[data-room-scene]')!;
  const world = root.querySelector<HTMLElement>('[data-room-world]')!;
  const controls = root.querySelector<HTMLElement>('[data-room-controls]')!;
  const zoomLabel = root.querySelector<HTMLOutputElement>('[data-room-zoom]')!;
  const viewButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-view]')];
  let view: View = 'overview';
  let zoom = 1;
  let yaw = roomViews.overview.yaw;
  let pitch = roomViews.overview.pitch;
  world.style.left = '0';
  world.style.top = '0';
  controls.hidden = false;

  function renderCamera() {
    world.style.transform = cameraTransform(roomViews[view], scene.clientWidth, scene.clientHeight, zoom, yaw, pitch);
    zoomLabel.value = `${Math.round(zoom * 100)}%`;
    root.querySelector<HTMLElement>('#room-instructions')!.textContent = view === 'overview'
      ? '余白をドラッグで見回す · モニターやポスターをクリック'
      : '文字の選択やボタン操作を試す · 「部屋全体」で全景に戻る';
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    root.querySelector<HTMLButtonElement>('[data-camera="out"]')!.disabled = zoom <= .7;
    root.querySelector<HTMLButtonElement>('[data-camera="in"]')!.disabled = zoom >= 1.6;
  }
  function setView(next: View) {
    view = next;
    zoom = 1;
    yaw = roomViews[next].yaw;
    pitch = roomViews[next].pitch;
    renderCamera();
  }
  viewButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view as View)));
  root.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.addEventListener('click', () => {
    switch (button.dataset.camera) {
      case 'left': yaw = clamp(yaw - 8, -65, 25); break;
      case 'right': yaw = clamp(yaw + 8, -65, 25); break;
      case 'in': zoom = clamp(Math.round((zoom + .15) * 100) / 100, .7, 1.6); break;
      case 'out': zoom = clamp(Math.round((zoom - .15) * 100) / 100, .7, 1.6); break;
      case 'reset': setView('overview'); return;
    }
    renderCamera();
  }));
  new ResizeObserver(renderCamera).observe(scene);
  renderCamera();

  // Only empty space can start a camera drag. Text, inputs and links keep their native gestures.
  let drag: { id: number; x: number; y: number; yaw: number; pitch: number; touch: boolean } | null = null;
  scene.addEventListener('pointerdown', event => {
    const target = event.target as Element;
    if (event.button !== 0 || target.closest('.room-panel,button,a,input,label') || view !== 'overview') return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, touch: event.pointerType === 'touch' };
    scene.setPointerCapture(event.pointerId);
    scene.dataset.dragging = '';
  });
  scene.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    yaw = clamp(drag.yaw + (event.clientX - drag.x) * .12, -60, -10);
    pitch = drag.touch ? drag.pitch : clamp(drag.pitch - (event.clientY - drag.y) * .1, 40, 70);
    renderCamera();
  });
  function finishDrag() { drag = null; delete scene.dataset.dragging; }
  scene.addEventListener('pointerup', finishDrag);
  scene.addEventListener('pointercancel', finishDrag);
  scene.addEventListener('lostpointercapture', finishDrag);
  scene.addEventListener('keydown', event => {
    if (event.target !== scene) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { setView('overview'); return; }
    if (event.key === 'ArrowLeft') yaw = clamp(yaw - 6, -65, 25);
    if (event.key === 'ArrowRight') yaw = clamp(yaw + 6, -65, 25);
    if (event.key === 'ArrowUp') pitch = clamp(pitch + 4, 8, 85);
    if (event.key === 'ArrowDown') pitch = clamp(pitch - 4, 8, 85);
    renderCamera();
  });
  scene.addEventListener('focusin', event => {
    const surface = (event.target as Element).closest<HTMLElement>('[data-view-target]');
    if (surface && view !== surface.dataset.viewTarget) setView(surface.dataset.viewTarget as View);
  });

  const dialog = root.querySelector<HTMLDialogElement>('[data-room-dialog]')!;
  const dialogHeading = root.querySelector<HTMLElement>('#room-dialog-heading')!;
  const titles: Record<string, string> = { profile: 'Gaku Fujioka', iepita: 'いえぴた', kokoiko: 'ここいこ', journal: 'Journal' };
  let opener: HTMLButtonElement | null = null;
  let previousOverflow = '';
  root.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(button => button.addEventListener('click', () => {
    const name = button.dataset.open!;
    if (!titles[name]) return;
    root.querySelectorAll<HTMLElement>('[data-exhibit]').forEach(exhibit => { exhibit.hidden = exhibit.dataset.exhibit !== name; });
    dialogHeading.textContent = titles[name];
    opener = button;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialogHeading.focus();
  }));
  root.querySelector('[data-close-dialog]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });

  initializeNativeCanvas(root);
}

function initializeNativeCanvas(root: HTMLElement) {
  const toggle = root.querySelector<HTMLButtonElement>('[data-native-toggle]')!;
  const help = root.querySelector<HTMLElement>('[data-native-help]')!;
  const status = root.querySelector<HTMLElement>('[data-render-status]')!;
  const probe = document.createElement('canvas');
  const probeContext = probe.getContext('2d') as NativeContext | null;
  const supported = typeof probeContext?.drawElementImage === 'function';
  if (!supported) {
    toggle.textContent = 'このブラウザでは実験APIが無効です';
    help.textContent = '通常のCSS 3D表示で探索できます。Canvas版を試す場合は、上の対応ブラウザ・フラグの案内を確認してください。';
    return;
  }
  toggle.disabled = false;
  toggle.textContent = 'HTML-in-Canvasを試す';
  help.textContent = '実験APIを検出しました。表示や操作に問題があれば、いつでもCSS 3Dへ戻せます。';
  type Surface = { parent: HTMLElement; ui: HTMLElement; canvas: NativeCanvas; originalTransform: string; removePaint: () => void };
  let surfaces: Surface[] = [];
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let active = false;
  let ready = new Set<NativeCanvas>();
  const parents = [...root.querySelectorAll<HTMLElement>('[data-room-surface]')];

  function restore(message = '標準のCSS 3D表示に戻しました。') {
    clearTimeout(timeout);
    const focused = document.activeElement instanceof HTMLElement && surfaces.some(surface => surface.ui.contains(document.activeElement)) ? document.activeElement : null;
    for (const surface of surfaces) {
      surface.removePaint();
      surface.ui.style.transform = surface.originalTransform;
      surface.ui.removeAttribute('drawable');
      surface.parent.insertBefore(surface.ui, surface.canvas);
      surface.canvas.remove();
    }
    surfaces = [];
    ready.clear();
    active = false;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'HTML-in-Canvasを試す';
    help.textContent = message;
    status.textContent = 'CSS 3D / HTML UI';
    focused?.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => {
    if (active) { restore(); return; }
    active = true;
    toggle.setAttribute('aria-pressed', 'true');
    toggle.textContent = 'CSS 3Dに戻す';
    status.textContent = 'HTML-in-Canvas / 描画を準備中';
    help.textContent = 'ブラウザがHTMLの描画を準備しています。';
    try {
      for (const parent of parents) {
        const ui = parent.querySelector<HTMLElement>('[data-surface-ui]')!;
        const canvas = document.createElement('canvas') as NativeCanvas;
        const context = canvas.getContext('2d') as NativeContext;
        const width = ui.offsetWidth;
        const height = ui.offsetHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.setAttribute('content', 'drawable');
        canvas.setAttribute('layoutsubtree', ''); // Compatibility with earlier trial builds.
        ui.setAttribute('drawable', '');
        const originalTransform = ui.style.transform;
        parent.insertBefore(canvas, ui);
        canvas.append(ui); // Keep the original DOM: input values and event listeners survive.
        const paint = () => {
          if (!active || document.hidden) return;
          try {
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            context.clearRect(0, 0, width, height);
            context.drawElementImage!(ui, 0, 0, width, height);
            // Newer implementations synchronize hit testing automatically. Older trials return a transform.
            if (!canvas.updateElementGeometry && canvas.getElementTransform) ui.style.transform = canvas.getElementTransform(ui).toString();
            ready.add(canvas);
            if (ready.size === parents.length) {
              clearTimeout(timeout);
              status.textContent = 'HTML-in-Canvas / EXPERIMENTAL';
              help.textContent = '4つの展示を本物のHTMLからCanvasに描画中です。文字選択、入力、Tabキーとボタンを試せます。';
            }
          } catch {
            // The first snapshot may not exist yet. A timeout restores the same HTML safely.
            if (ready.has(canvas)) restore('Canvasの再描画に失敗したため、入力内容を保ったままCSS 3Dに戻しました。');
          }
        };
        canvas.addEventListener('paint', paint);
        surfaces.push({ parent, ui, canvas, originalTransform, removePaint: () => canvas.removeEventListener('paint', paint) });
        canvas.requestPaint?.();
      }
      timeout = setTimeout(() => {
        if (ready.size !== surfaces.length) restore('この環境ではCanvasの描画を完了できなかったため、CSS 3Dに戻しました。');
      }, 3500);
    } catch {
      restore('実験APIの初期化に失敗したため、CSS 3Dに戻しました。通常の表示を引き続き使えます。');
    }
  });
}
