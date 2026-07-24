import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AVBridge } from '@liteship/core';
import { Detect } from '@liteship/detect';
import { createAudioProcessor } from '../../packages/web/src/audio/processor.js';
import { captureVideo } from '../../packages/web/src/capture/pipeline.js';
import { renderToCanvas } from '../../packages/web/src/capture/render.js';
import { Morph } from '../../packages/web/src/morph/diff.js';
import { capture, captureIME } from '../../packages/web/src/physical/capture.js';
import { restore, restoreIME } from '../../packages/web/src/physical/restore.js';
import { SlotRegistry } from '../../packages/web/src/slot/registry.js';

describe('browser web runtime coverage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('SlotRegistry scans, queries, and observes slots in the DOM', async () => {
    const registry = SlotRegistry.create();
    const root = document.createElement('section');
    root.innerHTML = `
      <div data-liteship-slot="/hero"></div>
      <div data-liteship-slot="/hero/sidebar" data-mode="replace"></div>
    `;
    document.body.appendChild(root);

    SlotRegistry.scanDOM(registry, root);

    expect(registry.has('/hero' as never)).toBe(true);
    expect(registry.findByPrefix('/hero' as never)).toHaveLength(2);
    expect(SlotRegistry.findElement('/hero' as never)).toBe(root.querySelector('[data-liteship-slot="/hero"]'));
    expect(SlotRegistry.getPath(root.querySelector('[data-liteship-slot="/hero"]')!)).toBe('/hero');

    const dispose = SlotRegistry.observe(registry, document.body);

    const added = document.createElement('div');
    added.setAttribute('data-liteship-slot', '/hero/footer');
    document.body.appendChild(added);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(registry.has('/hero/footer' as never)).toBe(true);

    added.remove();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(registry.has('/hero/footer' as never)).toBe(false);

    dispose();
  });

  test('captures and restores focused input state, scroll positions, and IME metadata', async () => {
    const root = document.createElement('div');
    const scrollBox = document.createElement('div');
    scrollBox.id = 'scroll-box';
    scrollBox.style.overflow = 'auto';
    scrollBox.style.height = '100px';
    scrollBox.style.width = '100px';
    scrollBox.innerHTML = '<div style="height: 500px; width: 100px;"></div>';
    const input = document.createElement('input');
    input.id = 'focus-target';
    input.value = 'abcdef';

    root.appendChild(scrollBox);
    root.appendChild(input);
    document.body.appendChild(root);
    scrollBox.scrollTop = 60;

    input.focus();
    input.setSelectionRange(1, 4);
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: 'kana' }));

    const state = capture(root);
    expect(state.focusState?.elementId).toContain('focus-target');
    expect(state.scrollPositions['#scroll-box']?.top).toBeCloseTo(60, 0);
    expect(captureIME()).toEqual({
      elementPath: '#focus-target',
      text: 'kana',
      start: 1,
      end: 4,
    });

    scrollBox.scrollTop = 0;
    input.blur();
    input.setSelectionRange(0, 0);

    restore(state, root);
    restoreIME({ elementPath: '#focus-target', text: 'kana', start: 2, end: 5 });

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(5);
    expect(scrollBox.scrollTop).toBeCloseTo(60, 0);

    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    expect(captureIME()).toBeNull();
  });

  test('creates audio processors and video capture pipelines in the browser lane', async () => {
    const posted: string[] = [];
    let disconnected = false;
    const addModule = vi.fn(async () => {});
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio-processor');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.stubGlobal(
      'AudioWorkletNode',
      class {
        readonly port = {
          postMessage(message: string) {
            posted.push(message);
          },
        };

        constructor(
          readonly _context: unknown,
          readonly _name: string,
          readonly _options: Record<string, unknown>,
        ) {}

        disconnect() {
          disconnected = true;
        }
      },
    );

    const bridge = AVBridge.make({ sampleRate: 48_000, fps: 60, buffer: new ArrayBuffer(24) as never });
    const processor = await createAudioProcessor(
      {
        audioWorklet: { addModule },
      } as AudioContext,
      bridge,
    );

    processor.start();
    processor.stop();
    processor.dispose();

    expect(addModule).toHaveBeenCalledWith('blob:audio-processor');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:audio-processor');
    expect(posted).toEqual(['start', 'stop', 'stop']);
    expect(disconnected).toBe(true);

    const renderFn = vi.fn(
      (
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        _state: unknown,
        canvas: HTMLCanvasElement | OffscreenCanvas,
      ) => {
        ctx.fillStyle = 'rgb(255, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      },
    );
    const captureBackend = {
      _tag: 'FrameCapture',
      init: vi.fn(async () => {}),
      capture: vi.fn(async () => {}),
      finalize: vi.fn(async () => ({
        blob: new Blob(['video'], { type: 'video/mp4' }),
        codec: 'raw',
        frames: 2,
        durationMs: 66 as never,
      })),
    };
    const renderer = {
      config: { width: 16, height: 16, fps: 30 },
      async *frames() {
        yield {
          frame: 0,
          timestamp: 0,
          state: { discrete: {}, blend: {}, outputs: { css: { '--liteship-bg': 'black' }, glsl: {}, aria: {} } },
        };
        yield {
          frame: 1,
          timestamp: 33,
          state: { discrete: {}, blend: {}, outputs: { css: { '--liteship-bg': 'white' }, glsl: {}, aria: {} } },
        };
      },
    };

    const offscreen =
      typeof OffscreenCanvas === 'function'
        ? new OffscreenCanvas(8, 8)
        : (() => {
            const canvas = document.createElement('canvas');
            canvas.width = 8;
            canvas.height = 8;
            return canvas;
          })();
    renderToCanvas(
      { discrete: {}, blend: {}, outputs: { css: { '--liteship-bg': 'black' }, glsl: {}, aria: {} } },
      offscreen,
      renderFn,
    );

    const result = await captureVideo(renderer as never, captureBackend as never, renderFn);

    expect(renderFn).toHaveBeenCalled();
    expect(captureBackend.init).toHaveBeenCalledWith({ width: 16, height: 16, fps: 30 });
    expect(captureBackend.capture).toHaveBeenCalledTimes(2);
    expect(result.frames).toBe(2);
  });

  test('preserves semantic identity across reordered morphs and remapped ids', async () => {
    const root = document.createElement('section');
    root.innerHTML = `
      <button data-liteship-id="alpha" id="alpha">Alpha</button>
      <button data-liteship-id="beta" id="beta">Beta</button>
    `;
    document.body.appendChild(root);

    const beta = document.getElementById('beta');

    const result = Morph.morphWithState(
      root,
      `
          <button data-liteship-id="beta-renamed" id="beta">Beta updated</button>
          <button data-liteship-id="alpha" id="alpha">Alpha updated</button>
        `,
      { morphStyle: 'innerHTML' },
      {
        remap: { beta: 'beta-renamed' },
      },
    );

    expect(result.type).toBe('success');
    expect(root.firstElementChild).toBe(beta);
    expect(beta?.getAttribute('data-liteship-id')).toBe('beta-renamed');
    expect(beta?.textContent).toBe('Beta updated');
  });

  test('detect probes browser preferences, connection fallbacks, and gpu tiers', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches:
          query === '(prefers-reduced-motion: reduce)' ||
          query === '(prefers-color-scheme: dark)' ||
          query === '(prefers-contrast: more)' ||
          query === '(dynamic-range: high)' ||
          query === '(color-gamut: p3)',
        addEventListener() {},
        removeEventListener() {},
      })) as never,
    );
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: globalThis.matchMedia,
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 8 });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 2 });
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '4g', downlink: 12, saveData: true },
    });
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: {} });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) => {
      if (kind !== 'webgl' && kind !== 'experimental-webgl') {
        return null;
      }

      return {
        RENDERER: 1,
        getParameter(parameter: number) {
          return parameter === 1 ? 'NVIDIA RTX 4090' : null;
        },
        getExtension() {
          return null;
        },
      } as never;
    });

    const result = Detect.detect();

    expect(result.capabilities.gpu).toBeGreaterThanOrEqual(1);
    expect(result.capabilities.prefersReducedMotion).toBe(true);
    expect(result.capabilities.connection?.saveData).toBe(true);
    expect(result.capabilities.prefersColorScheme).toBe('dark');
    expect(result.capabilities.colorGamut).toBe('p3');
    expect(result.motionTier).toBe('none');
    expect(result.designTier).toBe('rich');
  });

  test('detect falls back cleanly when browser probes are unavailable or throw', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => {
        throw new Error('blocked');
      },
    });
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: undefined,
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('no-webgl');
    });

    const result = Detect.detect();

    expect(result.capabilities.gpu).toBe(1);
    expect(result.capabilities.connection).toBeUndefined();
    expect(result.capabilities.prefersColorScheme).toBe('light');
    expect(result.capabilities.prefersReducedMotion).toBe(false);
    expect(result.confidence).toBeLessThan(1);
  });

  test('detect covers custom contrast and low-refresh browser branches in the browser lane', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches:
          query === '(prefers-contrast: custom)' ||
          query === '(prefers-reduced-transparency: reduce)' ||
          query === '(color-gamut: rec2020)' ||
          query === '(update: none)',
        addEventListener() {},
        removeEventListener() {},
      })) as never,
    );
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: globalThis.matchMedia,
    });
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: undefined, downlink: undefined, saveData: undefined },
    });

    const result = Detect.detect();

    expect(result.capabilities.prefersContrast).toBe('custom');
    expect(result.capabilities.prefersReducedTransparency).toBe(true);
    expect(result.capabilities.colorGamut).toBe('rec2020');
    expect(result.capabilities.updateRate).toBe('none');
    expect(result.capabilities.connection).toEqual({
      effectiveType: '4g',
      downlink: 10,
      saveData: false,
    });
  });

  test('retargets slots after outerHTML swaps and preserves semantic ids across rescans', async () => {
    const registry = SlotRegistry.create();
    const root = document.createElement('section');
    root.innerHTML = `
      <article id="shell">
        <div data-liteship-slot="/hero">
          <button data-liteship-id="hero-action">First</button>
        </div>
      </article>
    `;
    document.body.appendChild(root);
    SlotRegistry.scanDOM(registry, root);

    const result = Morph.morphWithState(
      root.querySelector('#shell') as HTMLElement,
      `
          <article id="shell">
            <div data-liteship-slot="/hero">
              <button data-liteship-id="hero-action">Second</button>
            </div>
          </article>
        `,
      { morphStyle: 'outerHTML' },
    );

    expect(result.type).toBe('success');
    SlotRegistry.scanDOM(registry, document.body);
    expect(SlotRegistry.findElement('/hero' as never)?.textContent).toContain('Second');
    expect(document.querySelector('[data-liteship-id="hero-action"]')?.textContent).toBe('Second');
  });
});
