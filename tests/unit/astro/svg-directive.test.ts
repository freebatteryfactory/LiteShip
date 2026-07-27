// @vitest-environment jsdom
/**
 * SVG last-mile directive (0.4.0 item E): the LIVE DOM applicator path.
 *
 * Proves the SVG cast arm reaches the live DOM. `attachSvgRuntime` discovers
 * `[data-liteship-entity]` SVG elements, resolves each to its `SVGElement`, and on
 * a signal crossing applies the active state's authored attrs through the
 * scene egress `applySvgAttrs` — so `opacity` / `transform` update IN PLACE,
 * not just in an offline/CLI snapshot.
 *
 * @module
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  attachSvgRuntime,
  buildEntityElementResolver,
  parseSvgStateAttrs,
} from '../../../packages/astro/src/runtime/svg.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const boundary = {
  id: 'rect',
  input: 'viewport.width',
  thresholds: [0, 768],
  states: ['a', 'b'],
} as const;

// state 'a' is the narrow (initial) state, 'b' the wide state.
const svgStateAttrs = {
  a: { opacity: '0.2', transform: 'translateX(0)' },
  b: { opacity: '1', transform: 'translateX(10)' },
} as const;

function makeSvgWithRect(): { svg: SVGSVGElement; rect: SVGRectElement } {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement;
  rect.setAttribute('data-liteship-entity', 'rect');
  rect.setAttribute('data-liteship-svg', JSON.stringify(svgStateAttrs));
  rect.setAttribute('data-liteship-boundary', JSON.stringify(boundary));
  svg.appendChild(rect);
  document.body.appendChild(svg);
  return { svg, rect };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('SVG last-mile directive: live DOM applicator', () => {
  test('parseSvgStateAttrs reads per-state attrs and rejects malformed payloads', () => {
    expect(parseSvgStateAttrs(JSON.stringify(svgStateAttrs))).toEqual(svgStateAttrs);
    expect(parseSvgStateAttrs(null)).toBeNull();
    expect(parseSvgStateAttrs('not json')).toBeNull();
    expect(parseSvgStateAttrs('[1,2]')).toBeNull();
    // non-object states are dropped, not throw
    expect(parseSvgStateAttrs(JSON.stringify({ a: 5, b: { opacity: '1' } }))).toEqual({ b: { opacity: '1' } });
  });

  test('buildEntityElementResolver maps entity id → SVGElement and skips non-SVG', () => {
    const { rect } = makeSvgWithRect();
    const div = document.createElement('div');
    div.setAttribute('data-liteship-entity', 'plain');
    document.body.appendChild(div);

    const resolve = buildEntityElementResolver(document);
    expect(resolve('rect')).toBe(rect);
    expect(resolve('plain')).toBeNull(); // non-SVG skipped
    expect(resolve('missing')).toBeNull();
  });

  test('a signal crossing applies the new state attrs onto the live SVGElement via applySvgAttrs', () => {
    let resizeCallback: ResizeObserverCallback | null = null;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );

    const { rect } = makeSvgWithRect();

    // Narrow viewport → state 'a' is live at boot.
    vi.stubGlobal('innerWidth', 320);
    const cleanup = attachSvgRuntime(document);

    // Boot applied the initial ('a') state's authored attrs to the live rect.
    expect(rect.getAttribute('data-liteship-state')).toBe('a');
    expect(rect.getAttribute('opacity')).toBe('0.2');
    expect(rect.getAttribute('transform')).toBe('translateX(0)');

    // Cross the threshold: widen the viewport, fire the observer.
    vi.stubGlobal('innerWidth', 1024);
    resizeCallback?.([] as never, {} as never);

    // The live SVGElement attributes updated to state 'b' via applySvgAttrs.
    expect(rect.getAttribute('data-liteship-state')).toBe('b');
    expect(rect.getAttribute('opacity')).toBe('1');
    expect(rect.getAttribute('transform')).toBe('translateX(10)');

    // Cleanup detaches the observer: the real ResizeObserver is disconnected.
    cleanup();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  test('cleanup is idempotent and detaches every observer', () => {
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(_cb: ResizeObserverCallback) {}
        observe() {}
        disconnect = disconnect;
      },
    );
    makeSvgWithRect();
    vi.stubGlobal('innerWidth', 320);

    const cleanup = attachSvgRuntime(document);
    cleanup();
    cleanup(); // second call is a harmless no-op
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  test('SSR-safe: no throw and a no-op cleanup when window is absent', async () => {
    const original = globalThis.window;
    // Simulate SSR by removing window for the duration of the call.
    // @ts-expect-error deliberately deleting for the SSR guard test
    delete globalThis.window;
    try {
      // Re-import not needed: the guard reads `typeof window` at call time.
      const { attachSvgRuntime: ssrAttach, initSvgDirective: ssrInit } = await import(
        '../../../packages/astro/src/runtime/svg.js'
      );
      let cleanup: (() => void) | undefined;
      expect(() => {
        cleanup = ssrAttach(undefined as never);
      }).not.toThrow();
      expect(() => cleanup?.()).not.toThrow();
      // initSvgDirective is also a no-op off the DOM (element is never touched).
      expect(() => ssrInit(() => Promise.resolve(), {} as never)).not.toThrow();
    } finally {
      globalThis.window = original;
    }
  });
});
