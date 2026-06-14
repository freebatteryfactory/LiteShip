/**
 * Dev inspector overlay — keyboard toggle and lazy loader.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { installInspectorLoader } from '../../packages/astro/src/runtime/inspector-loader.js';
import { isInspectorOverlayVisible, toggleInspectorOverlay } from '../../packages/astro/src/runtime/inspector.js';

describe('astro dev inspector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.querySelector('czap-inspector')?.remove();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
  });

  afterEach(() => {
    document.querySelector('czap-inspector')?.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('Alt+Shift+C toggles the overlay after lazy import', async () => {
    installInspectorLoader();
    expect(isInspectorOverlayVisible()).toBe(false);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'C', code: 'KeyC', altKey: true, shiftKey: true, bubbles: true }),
    );

    await vi.waitFor(() => {
      expect(document.querySelector('czap-inspector')).not.toBeNull();
    });
    expect(isInspectorOverlayVisible()).toBe(true);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'C', code: 'KeyC', altKey: true, shiftKey: true, bubbles: true }),
    );
    // The loader toggles after its dynamic import settles (a microtask even
    // when the module is cached), so the hide lands asynchronously too.
    await vi.waitFor(() => {
      expect(isInspectorOverlayVisible()).toBe(false);
    });
  });

  test('full panels render: active casts, escalation, and the DocumentGraph peek', () => {
    const el = document.createElement('div');
    el.setAttribute(
      'data-czap-boundary',
      JSON.stringify({
        id: 'hero',
        input: 'viewport.width',
        thresholds: [0, 768],
        states: ['compact', 'wide'],
        glslStateUniforms: { compact: { u_blur: 1 }, wide: { u_blur: 4 } },
      }),
    );
    el.setAttribute('data-czap-directive', 'satellite');
    el.setAttribute('data-czap-shader-type', 'glsl');
    el.setAttribute('data-czap-state', 'compact');
    document.body.appendChild(el);

    toggleInspectorOverlay(true);
    const shadow = document.querySelector('czap-inspector')!.shadowRoot!;

    const casts = shadow.querySelector('[data-role="casts"]')!;
    expect(casts.textContent).toContain('glsl');
    expect(casts.textContent).toContain('shader-type');

    const escalation = shadow.querySelector('[data-role="escalation"]')!;
    expect(escalation.textContent).toContain('animated'); // glsl → animated rung

    const graphSummary = Array.from(shadow.querySelectorAll('summary')).find((s) =>
      s.textContent?.includes('DocumentGraph'),
    );
    expect(graphSummary).toBeTruthy();
    const section = graphSummary!.parentElement!;
    expect(section.textContent).toContain('viewport.width'); // signal node
    expect(section.textContent).toContain('fnv1a:'); // real content address

    // Live update: dispatching a uniform-update re-renders the cast values.
    el.dispatchEvent(
      new CustomEvent('czap:uniform-update', {
        detail: { discrete: { hero: 'wide' }, css: {}, glsl: { u_blur: 4 }, wgsl: {}, aria: {} },
        bubbles: true,
      }),
    );
    expect(casts.textContent).toContain('u_blur = 4');

    toggleInspectorOverlay(false);
  });
});
