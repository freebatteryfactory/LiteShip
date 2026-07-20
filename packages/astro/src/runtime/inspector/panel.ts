/**
 * Stateful per-boundary panel machinery + the module-global {@link panelHandles}
 * leak-lifecycle.
 *
 * `panelHandles` is a single-instance {@link Map} (NOT a WeakMap) so every wired
 * observer/listener is ENUMERABLE and can be explicitly disposed — `refreshPanels`
 * (here) and the mount's `dispose` (in `./mount.ts`) both DRAIN THE MAP, never the
 * live DOM, because a boundary removed from the page since the last refresh is gone
 * from `querySelectorAll('[data-liteship-boundary]')` yet its handle still sits here.
 *
 * @module
 */

import { boundaryParseFailureMessage, parseBoundary, readSignalValue, type BoundaryStateDetail } from '../boundary.js';
import { createHtmlFragment, dispatchLiteshipEvent } from '@liteship/web';
import { startRafLoop } from '@liteship/core';
import {
  castValueRows,
  deriveActiveTargets,
  escalationViewForTargets,
  snapshotElementCasts,
  type ActiveTarget,
} from '../inspector-panels.js';
import {
  containerNameFromInput,
  formatBoundaryMakeSnippet,
  rewriteBoundaryThreshold,
  trackMaxForInput,
} from './boundary-edit.js';
import { containerNotDeclaredMessage, hasContainerNameDeclared, isDirectiveActive } from './dom-probes.js';
import { renderGraphPeek } from './graph-peek.js';

/** The teardown contract for one rendered boundary panel: disconnect its observers/listeners. */
export interface PanelHandles {
  readonly dispose: () => void;
}

/**
 * The single-instance per-boundary handle registry.
 *
 * A Map, not a WeakMap: the handles must be ENUMERABLE so every one can be
 * explicitly disposed. A WeakMap can't be drained, and GC can't reclaim these
 * anyway — a panel's observers/listeners hold a strong ref to their target
 * element, so a removed boundary's handle (and element) leaks until torn down by
 * hand. `refreshPanels` and the mount's `dispose` both drain this in full.
 */
export const panelHandles = new Map<HTMLElement, PanelHandles>();

/** Route dev-inspector markup through the shared trust pipeline (#121). */
function assignInspectorHtml(el: HTMLElement, html: string): void {
  el.replaceChildren(createHtmlFragment(html, { policy: 'sanitized-html' }));
}

/** Escape text interpolated into inspector HTML templates. */
function escapeInspectorText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Dispose every handle from a prior refresh and clear the map. Drains the MAP, not the DOM. */
export function drainPanelHandles(): void {
  // The body is rebuilt wholesale by the caller, so dispose EVERY handle from the
  // prior refresh — INCLUDING boundaries removed from the page since (gone from the
  // DOM query, but their observers/listeners still live in the map). Draining here,
  // not just per-surviving-element, is what stops the cross-refresh leak.
  for (const [element, handle] of Array.from(panelHandles.entries())) {
    handle.dispose();
    panelHandles.delete(element);
  }
}

function renderBoundaryPanel(element: HTMLElement, container: HTMLElement): PanelHandles {
  const boundaryJson = element.getAttribute('data-liteship-boundary') ?? '';
  const failure = boundaryParseFailureMessage(boundaryJson);
  const runtimeBoundary = failure ? null : parseBoundary(boundaryJson);
  const parseWarning = failure;

  const panel = document.createElement('article');
  panel.className = 'boundary';

  const head = document.createElement('div');
  head.className = 'boundary-head';
  const title = document.createElement('div');
  title.className = 'boundary-title';
  title.textContent = runtimeBoundary?.name ?? element.getAttribute('data-liteship-adaptive') ?? 'boundary';
  const badges = document.createElement('div');
  badges.className = 'badges';

  if (!isDirectiveActive(element)) {
    const inert = document.createElement('span');
    inert.className = 'badge badge-inert';
    inert.textContent = 'INERT';
    inert.title =
      'This element has data-liteship-boundary but no data-liteship-directive marker — the runtime will not evaluate it. Fix: spread adaptiveAttrs({ boundary }) or add data-liteship-directive="adaptive".';
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
  assignInspectorHtml(
    stateLine,
    `state: <span class="state-live" data-role="state">${escapeInspectorText(element.getAttribute('data-liteship-state') ?? '—')}</span>`,
  );
  panel.appendChild(stateLine);

  const signalLine = document.createElement('div');
  signalLine.className = 'meta';
  assignInspectorHtml(signalLine, `signal: <span data-role="signal">—</span>`);
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
          element.setAttribute('data-liteship-boundary', rewritten);
          notch.style.left = `${(next / max) * 100}%`;
          notch.title = `${next}px → ${states[index] ?? ''}`;
          dispatchLiteshipEvent(element, 'liteship:reinit');
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
  copy.textContent = 'Copy defineBoundary';
  copy.addEventListener('click', () => {
    // Read the LIVE attribute (post-drag) so the copied snippet reflects the
    // current threshold; fall back to the in-progress JSON when absent.
    const snippet = formatBoundaryMakeSnippet(element.getAttribute('data-liteship-boundary') ?? currentJson);
    void navigator.clipboard.writeText(snippet);
  });
  actions.appendChild(copy);
  panel.appendChild(actions);

  // --- Active casts + escalation panels (live, per-boundary) ---------------
  const castsSection = document.createElement('details');
  castsSection.className = 'section';
  castsSection.open = true;
  const castsSummary = document.createElement('summary');
  castsSummary.textContent = 'active casts';
  castsSection.appendChild(castsSummary);
  const castsBody = document.createElement('div');
  castsBody.dataset.role = 'casts';
  castsSection.appendChild(castsBody);
  panel.appendChild(castsSection);

  const escSection = document.createElement('details');
  escSection.className = 'section';
  const escSummary = document.createElement('summary');
  escSummary.textContent = 'escalation';
  escSection.appendChild(escSummary);
  const escBody = document.createElement('div');
  escBody.dataset.role = 'escalation';
  escSection.appendChild(escBody);
  panel.appendChild(escSection);

  container.appendChild(panel);

  const stateEl = stateLine.querySelector('[data-role="state"]');
  const signalEl = signalLine.querySelector('[data-role="signal"]');

  // The reactive OBSERVER that refreshes the live signal readout + cursor on every
  // frame / resize / scroll. (Distinct from the input-axis `SignalNode` primitive;
  // this is the subscription sense — see D-2.)
  const refreshObserver = (): void => {
    const value = readSignalValue(runtimeBoundary.input);
    if (signalEl) {
      signalEl.textContent = value === undefined ? 'unsupported' : String(Math.round(value * 10) / 10);
    }
    if (cursor && value !== undefined) {
      cursor.style.left = `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
    }
  };

  refreshObserver();

  // Latest emitted cast values for this boundary (subscribed below). The
  // active-casts panel reads this snapshot; it stays `null` until the first
  // `liteship:uniform-update` fires (e.g. the first state crossing).
  let latestDetail: BoundaryStateDetail | null = null;

  const renderCastsAndEscalation = (): void => {
    const snapshot = snapshotElementCasts(element, latestDetail);
    const active = deriveActiveTargets(snapshot);
    renderCastRows(castsBody, active, latestDetail);
    renderEscalation(escBody, active);
  };
  renderCastsAndEscalation();

  const onUniformUpdate = (event: Event): void => {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail as BoundaryStateDetail | undefined;
    if (!detail) return;
    latestDetail = detail;
    renderCastsAndEscalation();
  };
  element.addEventListener('liteship:uniform-update', onUniformUpdate);
  // Re-derive when the element's cast attributes change (custom props / aria).
  const castObserver = new MutationObserver(renderCastsAndEscalation);
  castObserver.observe(element, { attributes: true });

  const stateObserver = new MutationObserver(() => {
    if (stateEl) {
      stateEl.textContent = element.getAttribute('data-liteship-state') ?? '—';
    }
  });
  stateObserver.observe(element, { attributes: true, attributeFilter: ['data-liteship-state'] });

  const stopRafLoop = startRafLoop(() => {
    refreshObserver();
  });

  const resizeHandler = (): void => refreshObserver();
  window.addEventListener('resize', resizeHandler, { passive: true });
  window.addEventListener('scroll', resizeHandler, { passive: true });

  return {
    dispose: () => {
      stateObserver.disconnect();
      castObserver.disconnect();
      element.removeEventListener('liteship:uniform-update', onUniformUpdate);
      stopRafLoop();
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', resizeHandler);
    },
  };
}

/** Render the active-casts rows for one boundary (live targets + emitted values). */
function renderCastRows(body: HTMLElement, active: readonly ActiveTarget[], detail: BoundaryStateDetail | null): void {
  body.replaceChildren();
  if (active.length === 0) {
    const none = document.createElement('div');
    none.className = 'cast-none';
    none.textContent = 'No active casts (no shader-type, authored cast map, or emitted value yet).';
    body.appendChild(none);
    return;
  }
  for (const { target, evidence } of active) {
    const head = document.createElement('div');
    head.className = 'cast-target';
    const name = document.createElement('span');
    name.className = 'cast-target-name';
    name.textContent = target;
    const ev = document.createElement('span');
    ev.className = 'cast-evidence';
    ev.textContent = ` — ${evidence}`;
    head.appendChild(name);
    head.appendChild(ev);
    body.appendChild(head);

    const rows = castValueRows(target, detail);
    if (rows.length > 0) {
      const list = document.createElement('div');
      list.className = 'cast-rows';
      for (const text of rows) {
        const row = document.createElement('div');
        row.className = 'row';
        row.textContent = text;
        list.appendChild(row);
      }
      body.appendChild(list);
    }
  }
}

/** Render the escalation verdict for one boundary from its active targets. */
function renderEscalation(body: HTMLElement, active: readonly ActiveTarget[]): void {
  body.replaceChildren();
  const targets = active.map((a) => a.target);
  const view = escalationViewForTargets(targets, 'browser');

  const tierLine = document.createElement('div');
  tierLine.className = 'esc-line';
  if (view.chosenTier) {
    assignInspectorHtml(
      tierLine,
      `tier: <span class="esc-tier">${escapeInspectorText(view.chosenTier)}</span> ` +
        `<span class="cast-evidence">(requires ${escapeInspectorText(view.requiredTier)})</span>`,
    );
  } else {
    assignInspectorHtml(tierLine, `tier: <span class="esc-tier-err">unsatisfiable</span>`);
  }
  body.appendChild(tierLine);

  if (view.admittedTargets.length > 0) {
    const admitted = document.createElement('div');
    admitted.className = 'esc-line';
    admitted.textContent = `admits: ${view.admittedTargets.join(', ')}`;
    body.appendChild(admitted);
  }

  const reason = document.createElement('div');
  reason.className = 'esc-reason';
  reason.textContent = view.reason;
  body.appendChild(reason);

  const disclaimer = document.createElement('div');
  disclaimer.className = 'panel-disclaimer';
  disclaimer.textContent = 'Derived from on-page cast targets (no authored PolicyNode serialized to the page).';
  body.appendChild(disclaimer);
}

/** Re-scan the page and render one panel per `[data-liteship-boundary]` element + the graph peek. */
export function refreshPanels(body: HTMLElement): void {
  for (const child of Array.from(body.children)) {
    child.remove();
  }

  drainPanelHandles();

  const elements = document.querySelectorAll<HTMLElement>('[data-liteship-boundary]');
  if (elements.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No [data-liteship-boundary] elements on this page.';
    body.appendChild(empty);
    return;
  }

  elements.forEach((element) => {
    panelHandles.set(element, renderBoundaryPanel(element, body));
  });

  renderGraphPeek(body, Array.from(elements));
}
