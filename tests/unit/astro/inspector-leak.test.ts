// @vitest-environment jsdom

/**
 * Inspector leak guard — a boundary removed from the page between refreshes must
 * have its observers/listeners torn down, not stranded in the `panelHandles` map.
 *
 * The handles are drained by iterating the MAP, not the live DOM (a removed
 * boundary is gone from `querySelectorAll('[data-liteship-boundary]')` yet its
 * MutationObserver + window listeners still hold a strong ref to the detached
 * element). This pins that: mount → remove a boundary → refresh → assert the
 * removed boundary's MutationObservers disconnected and its window listeners gone.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mountInspectorPanel } from '../../../packages/astro/src/runtime/inspector.js';

function makeShadowRoot(): ShadowRoot {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host.attachShadow({ mode: 'open' });
}

function addBoundary(id: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute(
    'data-liteship-boundary',
    JSON.stringify({ id, input: 'viewport.width', thresholds: [0, 600], states: ['s', 'l'] }),
  );
  el.setAttribute('data-liteship-directive', 'satellite');
  document.body.appendChild(el);
  return el;
}

describe('inspector leak guard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('a boundary removed before a refresh has its observers + listeners torn down', () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');

    const boundary = addBoundary('hero');
    const shadow = makeShadowRoot();
    const handle = mountInspectorPanel(shadow);

    // First refresh wired one panel: per-boundary MutationObservers (cast + state)
    // + a raf tick + window resize/scroll listeners. None torn down yet.
    expect(disconnect).not.toHaveBeenCalled();

    // The boundary leaves the page (a VT swap removed it) BEFORE the next refresh,
    // so it's gone from the DOM query — only the handle map still references it.
    boundary.remove();
    handle.refresh();

    // Draining the map (not the empty DOM query) disposed the stranded handle: its
    // two MutationObservers disconnected, its window listeners removed, raf cancelled.
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(removeWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);

    handle.dispose();
  });

  test('dispose drains every handle even when the page query is empty', () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');

    addBoundary('a');
    addBoundary('b');
    const shadow = makeShadowRoot();
    const handle = mountInspectorPanel(shadow);

    // Both boundaries vanish from the DOM; the map still holds their handles.
    document.body.innerHTML = '';

    // dispose iterates the MAP, so it tears down both stranded handles (2 boundaries
    // × 2 MutationObservers each) rather than the now-empty DOM.
    handle.dispose();
    expect(disconnect).toHaveBeenCalledTimes(4);
  });
});
