/**
 * Dev inspector overlay — panel rendering into an injected shadow root.
 *
 * The inspector ships as an Astro dev-toolbar app: Astro hands its
 * `init(canvas)` a ShadowRoot and `mountInspectorPanel` renders into it.
 * The live `addDevToolbarApp` registration + toolbar toggle is not
 * coverable by the jsdom harness (no Astro dev server, no toolbar custom
 * elements) — that path needs a manual dev-server check. Here we exercise
 * the render contract directly by passing our own `attachShadow` root, so
 * the rich panel assertions (casts, escalation, DocumentGraph peek, live
 * uniform-update) stay pinned.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mountInspectorPanel } from '../../packages/astro/src/runtime/inspector.js';

function makeShadowRoot(): { host: HTMLElement; shadow: ShadowRoot } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  return { host, shadow };
}

describe('astro dev inspector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('renders an empty-state panel when no boundaries are present', () => {
    const { shadow } = makeShadowRoot();
    const handle = mountInspectorPanel(shadow);

    const body = shadow.querySelector<HTMLElement>('[data-role="inspector-body"]');
    expect(body).not.toBeNull();
    expect(body!.textContent).toContain('No [data-liteship-boundary] elements');

    handle.dispose();
  });

  test('full panels render: active casts, escalation, and the DocumentGraph peek', () => {
    const el = document.createElement('div');
    el.setAttribute(
      'data-liteship-boundary',
      JSON.stringify({
        id: 'hero',
        input: 'viewport.width',
        thresholds: [0, 768],
        states: ['compact', 'wide'],
        glslStateUniforms: { compact: { u_blur: 1 }, wide: { u_blur: 4 } },
      }),
    );
    el.setAttribute('data-liteship-directive', 'satellite');
    el.setAttribute('data-liteship-shader-type', 'glsl');
    el.setAttribute('data-liteship-state', 'compact');
    document.body.appendChild(el);

    const { shadow } = makeShadowRoot();
    const handle = mountInspectorPanel(shadow);

    const casts = shadow.querySelector('[data-role="casts"]')!;
    expect(casts.textContent).toContain('glsl');
    expect(casts.textContent).toContain('shader-type');

    const escalation = shadow.querySelector('[data-role="escalation"]')!;
    expect(escalation.textContent).toContain('animated'); // glsl → animated tier

    const graphSummary = Array.from(shadow.querySelectorAll('summary')).find((s) =>
      s.textContent?.includes('DocumentGraph'),
    );
    expect(graphSummary).toBeTruthy();
    const section = graphSummary!.parentElement!;
    expect(section.textContent).toContain('viewport.width'); // signal node
    expect(section.textContent).toContain('fnv1a:'); // real content address

    // Live update: dispatching a uniform-update re-renders the cast values.
    el.dispatchEvent(
      new CustomEvent('liteship:uniform-update', {
        detail: { discrete: { hero: 'wide' }, css: {}, glsl: { u_blur: 4 }, wgsl: {}, aria: {} },
        bubbles: true,
      }),
    );
    expect(casts.textContent).toContain('u_blur = 4');

    handle.dispose();
  });

  test('dispose tears down a mount and a fresh mount re-reflects the page', () => {
    const { shadow } = makeShadowRoot();
    const first = mountInspectorPanel(shadow);
    let body = shadow.querySelector<HTMLElement>('[data-role="inspector-body"]')!;
    expect(body.textContent).toContain('No [data-liteship-boundary] elements');
    first.dispose();

    // Add a boundary, then re-mount fresh into a new render target (the
    // toolbar app's open-after-close lifecycle).
    const el = document.createElement('div');
    el.setAttribute(
      'data-liteship-boundary',
      JSON.stringify({ id: 'b', input: 'viewport.width', thresholds: [0, 600], states: ['s', 'l'] }),
    );
    el.setAttribute('data-liteship-directive', 'satellite');
    document.body.appendChild(el);

    const { shadow: shadow2 } = makeShadowRoot();
    const second = mountInspectorPanel(shadow2);
    body = shadow2.querySelector<HTMLElement>('[data-role="inspector-body"]')!;
    expect(body.textContent).toContain('viewport.width');
    second.dispose();
  });
});
