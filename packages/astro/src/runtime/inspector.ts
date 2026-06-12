/**
 * Dev-mode boundary inspector overlay.
 *
 * Visualizes every `[data-czap-boundary]` element, live signal values,
 * threshold tracks with draggable notches, and copy-back snippets.
 * Mounted in a shadow-root host; toggled via Alt+Shift+C (see
 * {@link installInspectorLoader}).
 *
 * @module
 */

import { boundaryParseFailureMessage, parseBoundary, readSignalValue, type SerializedBoundary } from './boundary.js';
import { inspectorPositionStorageKey } from './inspector-loader.js';

const HOST_TAG = 'czap-inspector';
const DIRECTIVE_ATTR = 'data-czap-directive';
const LEGACY_DIRECTIVE_PREFIX = 'client:';

/** Rewrite one threshold in serialized boundary JSON. Returns null when invalid. */
export function rewriteBoundaryThreshold(
  boundaryJson: string,
  thresholdIndex: number,
  newValue: number,
): string | null {
  let parsed: Partial<SerializedBoundary>;
  try {
    parsed = JSON.parse(boundaryJson) as Partial<SerializedBoundary>;
  } catch (error) {
    // Malformed attribute JSON is the designed no-rewrite case; anything
    // else is a programming error that must surface.
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }

  if (
    !Array.isArray(parsed.thresholds) ||
    !Array.isArray(parsed.states) ||
    parsed.thresholds.length === 0 ||
    parsed.states.length !== parsed.thresholds.length ||
    thresholdIndex <= 0 ||
    thresholdIndex >= parsed.thresholds.length ||
    typeof newValue !== 'number' ||
    !Number.isFinite(newValue)
  ) {
    return null;
  }

  const thresholds = [...parsed.thresholds];
  thresholds[thresholdIndex] = newValue;

  for (let index = 1; index < thresholds.length; index++) {
    if (thresholds[index]! <= thresholds[index - 1]!) {
      return null;
    }
  }

  return JSON.stringify({
    ...parsed,
    thresholds,
  });
}

/** Format a paste-ready `Boundary.make` snippet from serialized boundary JSON. */
export function formatBoundaryMakeSnippet(boundaryJson: string): string {
  const parsed = JSON.parse(boundaryJson) as SerializedBoundary;
  const atPairs = parsed.thresholds.map((threshold, index) => `[${threshold}, '${parsed.states[index]}']`);
  const lines = [`  input: '${parsed.input}',`, `  at: [${atPairs.join(', ')}],`];
  if (typeof parsed.hysteresis === 'number') {
    lines.push(`  hysteresis: ${parsed.hysteresis},`);
  }
  if (parsed.id) {
    lines.push(`  // id: ${parsed.id}`);
  }
  return `Boundary.make({\n${lines.join('\n')}\n})`;
}

/** Derive the CSS container name a quantize block would use for an input. */
export function containerNameFromInput(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/** Whether any stylesheet declares the given container name. */
export function hasContainerNameDeclared(containerName: string, root: Document = document): boolean {
  for (const sheet of Array.from(root.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheets deny cssRules access; they cannot carry
      // the project's @quantize container declarations, so skip them.
      continue;
    }
    for (let index = 0; index < rules.length; index++) {
      const rule = rules[index];
      if (!(rule instanceof CSSStyleRule)) {
        continue;
      }
      const declared = rule.style.getPropertyValue('container-name');
      if (declared.split(/\s+/).includes(containerName)) {
        return true;
      }
      if (rule.cssText.includes('container-name') && rule.cssText.includes(containerName)) {
        return true;
      }
    }
  }
  return false;
}

/** Teaching text when quantize CSS has no matching container declaration. */
export function containerNotDeclaredMessage(input: string, containerName: string): string {
  const heightAxis = input === 'height' || input.endsWith('.height');
  const containment = heightAxis ? 'size' : 'inline-size';
  if (input.startsWith('viewport.') || input === 'viewport') {
    return (
      `@quantize compiled rules use @container ${containerName}, but no stylesheet declares ` +
      `container-name: ${containerName} on :root — the rules will match nothing until the ` +
      `build emits the viewport containment rule (re-run the dev server after adding @quantize).`
    );
  }
  return (
    `@quantize compiled rules use @container ${containerName}, but no ancestor declares ` +
    `container-type: ${containment}; container-name: ${containerName}; — add that declaration ` +
    `on the element whose size this boundary measures.`
  );
}

function isDirectiveActive(element: HTMLElement): boolean {
  if (element.hasAttribute(DIRECTIVE_ATTR)) {
    return true;
  }
  for (const attribute of element.getAttributeNames()) {
    if (attribute.startsWith(LEGACY_DIRECTIVE_PREFIX)) {
      return true;
    }
  }
  return element.hasAttribute('data-czap-directive-bound');
}

function trackMaxForInput(input: string, thresholds: readonly number[]): number {
  const peak = thresholds.length > 0 ? Math.max(...thresholds) : 0;
  if (input.startsWith('viewport.')) {
    return Math.max(peak * 1.5, typeof window !== 'undefined' ? window.innerWidth : peak, 1200);
  }
  if (input.startsWith('scroll.')) {
    if (input === 'scroll.progress') {
      return 100;
    }
    return Math.max(peak * 1.5, 2000);
  }
  return Math.max(peak * 1.5, peak + 100, 100);
}

interface PanelHandles {
  readonly dispose: () => void;
}

let overlayHost: HTMLElement | null = null;
let overlayVisible = false;
const panelHandles = new WeakMap<HTMLElement, PanelHandles>();

function styles(): string {
  return `
:host { all: initial; }
.panel {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: min(420px, calc(100vw - 32px));
  max-height: min(70vh, 640px);
  overflow: auto;
  background: #0f1117;
  color: #e8eaed;
  border: 1px solid #3c4048;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  z-index: 2147483646;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #3c4048;
  cursor: move;
  user-select: none;
}
.header h2 { margin: 0; font-size: 13px; font-weight: 600; }
.close { background: transparent; border: 0; color: #9aa0a6; cursor: pointer; font-size: 16px; }
.body { padding: 10px 12px 14px; display: grid; gap: 12px; }
.boundary {
  border: 1px solid #2a2f3a;
  border-radius: 8px;
  padding: 10px;
  background: #151922;
}
.boundary-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.boundary-title { font-weight: 600; }
.badges { display: flex; gap: 6px; flex-wrap: wrap; }
.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid #5f6368;
  color: #bdc1c6;
}
.badge-warn { border-color: #f9ab00; color: #fdd663; }
.badge-inert { border-color: #ea4335; color: #f28b82; }
.meta { color: #9aa0a6; margin-bottom: 8px; }
.state-live { color: #8ab4f8; font-weight: 600; }
.track {
  position: relative;
  height: 36px;
  margin: 8px 0 18px;
  border-radius: 6px;
  background: linear-gradient(90deg, #1f2430 0%, #252b38 100%);
  border: 1px solid #303643;
}
.region-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9aa0a6;
  margin-top: 4px;
}
.notch {
  position: absolute;
  top: -4px;
  width: 10px;
  height: 44px;
  margin-left: -5px;
  background: #8ab4f8;
  border-radius: 3px;
  cursor: ew-resize;
}
.notch-fixed { background: #5f6368; cursor: default; }
.cursor {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: #34a853;
  pointer-events: none;
}
.actions { display: flex; gap: 8px; margin-top: 8px; }
button.copy {
  background: #1a73e8;
  color: #fff;
  border: 0;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font: inherit;
}
.note { color: #f9ab00; font-size: 11px; margin-top: 6px; }
.empty { color: #9aa0a6; padding: 8px 0; }
`.trim();
}

function readStoredPosition(): { x: number; y: number } | null {
  try {
    const raw = sessionStorage.getItem(inspectorPositionStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
  } catch (error) {
    // Corrupt stored JSON (SyntaxError) and storage denied in sandboxed
    // embeds (DOMException) both mean "no saved position" by design.
    if (error instanceof SyntaxError || error instanceof DOMException) {
      return null;
    }
    throw error;
  }
  return null;
}

function storePosition(x: number, y: number): void {
  try {
    sessionStorage.setItem(inspectorPositionStorageKey(), JSON.stringify({ x, y }));
  } catch {
    // sessionStorage may be unavailable in some embed contexts
  }
}

function ensureHost(): HTMLElement {
  if (overlayHost && overlayHost.isConnected) {
    return overlayHost;
  }

  const host = document.createElement(HOST_TAG);
  host.style.all = 'initial';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles();
  shadow.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.hidden = true;

  const header = document.createElement('div');
  header.className = 'header';
  const title = document.createElement('h2');
  title.textContent = 'czap boundaries';
  const close = document.createElement('button');
  close.className = 'close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close inspector');
  close.textContent = '×';
  close.addEventListener('click', () => {
    toggleInspectorOverlay(false);
  });
  header.appendChild(title);
  header.appendChild(close);

  const body = document.createElement('div');
  body.className = 'body';
  body.dataset.role = 'inspector-body';

  panel.appendChild(header);
  panel.appendChild(body);
  shadow.appendChild(panel);

  const stored = readStoredPosition();
  if (stored) {
    panel.style.left = `${stored.x}px`;
    panel.style.top = `${stored.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  let dragStart: { x: number; y: number; left: number; top: number } | null = null;
  header.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const rect = panel.getBoundingClientRect();
    dragStart = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener('pointermove', (event) => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    panel.style.left = `${dragStart.left + dx}px`;
    panel.style.top = `${dragStart.top + dy}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });
  header.addEventListener('pointerup', (event) => {
    if (!dragStart) return;
    const rect = panel.getBoundingClientRect();
    storePosition(rect.left, rect.top);
    dragStart = null;
    header.releasePointerCapture(event.pointerId);
  });

  document.documentElement.appendChild(host);
  overlayHost = host;
  (host as HTMLElement & { __panel?: HTMLDivElement }).__panel = panel;
  return host;
}

function panelElement(host: HTMLElement): HTMLDivElement {
  return (host as HTMLElement & { __panel?: HTMLDivElement }).__panel!;
}

function renderBoundaryPanel(element: HTMLElement, container: HTMLElement): PanelHandles {
  const boundaryJson = element.getAttribute('data-czap-boundary') ?? '';
  const failure = boundaryParseFailureMessage(boundaryJson);
  const runtimeBoundary = failure ? null : parseBoundary(boundaryJson);
  const parseWarning = failure;

  const panel = document.createElement('article');
  panel.className = 'boundary';

  const head = document.createElement('div');
  head.className = 'boundary-head';
  const title = document.createElement('div');
  title.className = 'boundary-title';
  title.textContent = runtimeBoundary?.name ?? element.getAttribute('data-czap-satellite') ?? 'boundary';
  const badges = document.createElement('div');
  badges.className = 'badges';

  if (!isDirectiveActive(element)) {
    const inert = document.createElement('span');
    inert.className = 'badge badge-inert';
    inert.textContent = 'INERT';
    inert.title =
      'This element has data-czap-boundary but no data-czap-directive marker — the runtime will not evaluate it. Fix: spread satelliteAttrs({ boundary }) or add data-czap-directive="satellite".';
    badges.appendChild(inert);
  }

  head.appendChild(title);
  head.appendChild(badges);
  panel.appendChild(head);

  if (parseWarning) {
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = parseWarning;
    panel.appendChild(note);
    container.appendChild(panel);
    return { dispose: () => {} };
  }

  if (!runtimeBoundary) {
    return { dispose: () => {} };
  }

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `input: ${runtimeBoundary.input}`;
  panel.appendChild(meta);

  const stateLine = document.createElement('div');
  stateLine.className = 'meta';
  stateLine.innerHTML = `state: <span class="state-live" data-role="state">${element.getAttribute('data-czap-state') ?? '—'}</span>`;
  panel.appendChild(stateLine);

  const signalLine = document.createElement('div');
  signalLine.className = 'meta';
  signalLine.innerHTML = `signal: <span data-role="signal">—</span>`;
  panel.appendChild(signalLine);

  const containerName = containerNameFromInput(runtimeBoundary.input);
  const containerDeclared = hasContainerNameDeclared(containerName);
  if (!containerDeclared) {
    const quantize = document.createElement('span');
    quantize.className = 'badge badge-warn';
    quantize.textContent = '@quantize';
    quantize.title = containerNotDeclaredMessage(runtimeBoundary.input, containerName);
    badges.appendChild(quantize);

    const cqNote = document.createElement('div');
    cqNote.className = 'note';
    cqNote.textContent = containerNotDeclaredMessage(runtimeBoundary.input, containerName);
    panel.appendChild(cqNote);
  } else {
    const quantizeOk = document.createElement('span');
    quantizeOk.className = 'badge';
    quantizeOk.textContent = '@quantize ok';
    badges.appendChild(quantizeOk);
  }

  const thresholds = [...runtimeBoundary.boundary.thresholds];
  const states = [...runtimeBoundary.boundary.states];
  const max = trackMaxForInput(runtimeBoundary.input, thresholds);

  const track = document.createElement('div');
  track.className = 'track';
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  track.appendChild(cursor);

  const initialJson = boundaryJson;
  let currentJson = initialJson;

  thresholds.forEach((threshold, index) => {
    const notch = document.createElement('div');
    notch.className = index === 0 ? 'notch notch-fixed' : 'notch';
    notch.style.left = `${(threshold / max) * 100}%`;
    notch.title = `${threshold}px → ${states[index] ?? ''}`;
    if (index > 0) {
      notch.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startValue = threshold;
        const move = (moveEvent: PointerEvent): void => {
          const rect = track.getBoundingClientRect();
          const deltaPx = moveEvent.clientX - startX;
          const deltaValue = (deltaPx / rect.width) * max;
          const next = Math.round(Math.max(thresholds[index - 1]! + 1, Math.min(max, startValue + deltaValue)));
          const rewritten = rewriteBoundaryThreshold(currentJson, index, next);
          if (!rewritten) return;
          currentJson = rewritten;
          element.setAttribute('data-czap-boundary', rewritten);
          notch.style.left = `${(next / max) * 100}%`;
          notch.title = `${next}px → ${states[index] ?? ''}`;
          element.dispatchEvent(new CustomEvent('czap:reinit', { bubbles: true }));
        };
        const up = (): void => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    }
    track.appendChild(notch);
  });

  panel.appendChild(track);

  const labels = document.createElement('div');
  labels.className = 'region-labels';
  states.forEach((state) => {
    const span = document.createElement('span');
    span.textContent = state;
    labels.appendChild(span);
  });
  panel.appendChild(labels);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'copy';
  copy.textContent = 'Copy Boundary.make';
  copy.addEventListener('click', () => {
    const snippet = formatBoundaryMakeSnippet(element.getAttribute('data-czap-boundary') ?? currentJson);
    void navigator.clipboard.writeText(snippet);
  });
  actions.appendChild(copy);
  panel.appendChild(actions);

  container.appendChild(panel);

  const stateEl = stateLine.querySelector('[data-role="state"]');
  const signalEl = signalLine.querySelector('[data-role="signal"]');

  const refreshSignal = (): void => {
    const value = readSignalValue(runtimeBoundary.input);
    if (signalEl) {
      signalEl.textContent = value === undefined ? 'unsupported' : String(Math.round(value * 10) / 10);
    }
    if (cursor && value !== undefined) {
      cursor.style.left = `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
    }
  };

  refreshSignal();

  const stateObserver = new MutationObserver(() => {
    if (stateEl) {
      stateEl.textContent = element.getAttribute('data-czap-state') ?? '—';
    }
  });
  stateObserver.observe(element, { attributes: true, attributeFilter: ['data-czap-state'] });

  let raf = 0;
  const tick = (): void => {
    refreshSignal();
    raf = window.requestAnimationFrame(tick);
  };
  raf = window.requestAnimationFrame(tick);

  const resizeHandler = (): void => refreshSignal();
  window.addEventListener('resize', resizeHandler, { passive: true });
  window.addEventListener('scroll', resizeHandler, { passive: true });

  return {
    dispose: () => {
      stateObserver.disconnect();
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', resizeHandler);
    },
  };
}

function refreshPanels(body: HTMLElement): void {
  for (const child of Array.from(body.children)) {
    child.remove();
  }

  const elements = document.querySelectorAll<HTMLElement>('[data-czap-boundary]');
  if (elements.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No [data-czap-boundary] elements on this page.';
    body.appendChild(empty);
    return;
  }

  elements.forEach((element) => {
    const prior = panelHandles.get(element);
    prior?.dispose();
    panelHandles.set(element, renderBoundaryPanel(element, body));
  });
}

/** Toggle the inspector overlay. When `visible` is omitted, flips current state. */
export function toggleInspectorOverlay(visible?: boolean): void {
  const host = ensureHost();
  const panel = panelElement(host);
  overlayVisible = visible ?? !overlayVisible;
  panel.hidden = !overlayVisible;
  if (overlayVisible) {
    const body = panel.querySelector<HTMLElement>('[data-role="inspector-body"]');
    if (body) {
      refreshPanels(body);
    }
  }
}

/** Whether the overlay is currently visible. */
export function isInspectorOverlayVisible(): boolean {
  return overlayVisible;
}
