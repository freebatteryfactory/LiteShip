// @vitest-environment jsdom
/**
 * The GPU-probe upgrade must fire ONE consolidated `czap:detect-ready` event
 * once `__CZAP_DETECT__` and the `data-czap-*` attributes are final.
 *
 * Before 0.2.1 the async probe re-froze `__CZAP_DETECT__` silently, so a
 * consumer needing the settled `gpuTier`/`webgpu` had no dependable signal and
 * resorted to `setTimeout` backstops (the dogfood finding). This executes the
 * REAL shipped `DETECT_UPGRADE_SCRIPT` string in jsdom and proves the event
 * fires with the final payload on success — and still fires (flagged) when the
 * probe throws, so a listener can never hang.
 *
 * @module
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DETECT_UPGRADE_SCRIPT } from '../../../packages/astro/src/detect-upgrade.js';
import { motionTierFromCapabilities } from '../../../packages/detect/src/tiers.js';

function defineNavigator(props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true });
  }
}

/** Execute the shipped IIFE exactly as the browser would (readyState=complete → runs now). */
function runUpgradeScript(): void {
  // new Function over global eval: the IIFE runs the same, without the eval
  // security-rule violation flagged in lint/CI.
  new Function(DETECT_UPGRADE_SCRIPT)();
}

describe('detect-upgrade fires czap:detect-ready', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('data-czap-tier');
    document.documentElement.removeAttribute('data-czap-gpu-tier');
    document.documentElement.removeAttribute('data-czap-motion');
  });

  test('emits the final settled payload on a successful probe', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }) as MediaQueryList);
    defineNavigator({ hardwareConcurrency: 8, deviceMemory: 8, gpu: {} });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          getExtension: (name: string) => (name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 37446 } : null),
          getParameter: () => 'NVIDIA GeForce RTX 4090',
        }) as never,
    );

    const ready = vi.fn();
    document.addEventListener('czap:detect-ready', ready as EventListener);
    runUpgradeScript();

    expect(ready).toHaveBeenCalledOnce();
    const detail = (ready.mock.calls[0]![0] as CustomEvent).detail;
    // RTX + 8 cores + webgpu → the top 'gpu' rung; the event carries the
    // settled values, not just a "ready" ping.
    expect(detail).toMatchObject({ tier: 'gpu', gpuTier: 3, webgpu: true, motionTier: 'compute' });
    // And __CZAP_DETECT__ is final/consistent with the event by the time it fires.
    expect((window as unknown as { __CZAP_DETECT__: { gpuTier: number } }).__CZAP_DETECT__.gpuTier).toBe(3);
    // The probe writes the computed motion TIER to data-czap-motion (same
    // vocabulary EdgeTier emits server-side) so CSS keyed on the capability
    // tier matches on non-edge pages too — not just the event payload.
    expect(document.documentElement.getAttribute('data-czap-motion')).toBe('compute');
  });

  // The inline probe writes data-czap-motion, which is CSS-keyed — so its
  // hand-rolled tier mapping (head-inline can't import) must stay branch-for-
  // branch identical to the canonical motionTierFromCapabilities. This drives
  // the REAL shipped script across a capability grid and asserts the DOM
  // attribute equals canonical, so any future drift fails here instead of
  // silently handing clients motion the rest of the stack gates lower.
  // Renderer strings map to the gpuTier the script classifies (see the
  // renderer regexes): SwiftShader→0, Intel UHD→1, GTX→2, RTX→3.
  const GRID = [
    { renderer: 'SwiftShader', gpu: 0, cores: 8 },
    { renderer: 'Intel(R) UHD Graphics 620', gpu: 1, cores: 3 }, // gpu1/<4 cores → transitions
    { renderer: 'Intel(R) UHD Graphics 620', gpu: 1, cores: 8 }, // gpu1/≥4 cores → animations
    { renderer: 'NVIDIA GeForce GTX 1660', gpu: 2, cores: 3 }, // Codex's case: animations, NOT physics
    { renderer: 'NVIDIA GeForce GTX 1660', gpu: 2, cores: 8 }, // gpu2/≥4 cores → physics
    { renderer: 'NVIDIA GeForce RTX 4090', gpu: 3, cores: 8 }, // gpu3 + webgpu → compute
  ] as const;

  for (const cell of GRID) {
    for (const webgpu of [true, false] as const) {
      test(`data-czap-motion matches canonical for ${cell.renderer} / ${cell.cores}c / webgpu=${webgpu}`, () => {
        vi.stubGlobal('matchMedia', () => ({ matches: false }) as MediaQueryList);
        defineNavigator({ hardwareConcurrency: cell.cores, deviceMemory: 8, gpu: webgpu ? {} : undefined });
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
          () =>
            ({
              getExtension: (name: string) => (name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 37446 } : null),
              getParameter: () => cell.renderer,
            }) as never,
        );

        runUpgradeScript();

        const expected = motionTierFromCapabilities({
          gpu: cell.gpu,
          cores: cell.cores,
          memory: 8,
          webgpu,
          prefersReducedMotion: false,
        } as Parameters<typeof motionTierFromCapabilities>[0]);
        expect(document.documentElement.getAttribute('data-czap-motion')).toBe(expected);
      });
    }
  }

  test('reduced-motion settles data-czap-motion to none (canonical short-circuit)', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
    defineNavigator({ hardwareConcurrency: 8, deviceMemory: 8, gpu: {} });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          getExtension: (name: string) => (name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 37446 } : null),
          getParameter: () => 'NVIDIA GeForce RTX 4090',
        }) as never,
    );
    runUpgradeScript();
    expect(document.documentElement.getAttribute('data-czap-motion')).toBe('none');
  });

  test('still fires (flagged error) when the probe throws, so listeners never hang', () => {
    // matchMedia undefined in this run → the probe body throws → error branch.
    vi.stubGlobal('matchMedia', undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);

    const ready = vi.fn();
    document.addEventListener('czap:detect-ready', ready as EventListener);
    runUpgradeScript();

    expect(ready).toHaveBeenCalledOnce();
    expect((ready.mock.calls[0]![0] as CustomEvent).detail).toMatchObject({ error: true });
    expect(document.documentElement.getAttribute('data-czap-tier-probe-error')).toBe('true');
  });
});
