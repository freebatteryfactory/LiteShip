// @vitest-environment jsdom
/**
 * The GPU-probe upgrade must fire ONE consolidated `liteship:detect-ready` event
 * once `__LITESHIP_DETECT__` and the `data-liteship-*` attributes are final.
 *
 * Before 0.2.1 the async probe re-froze `__LITESHIP_DETECT__` silently, so a
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
import { motionTierFromCapabilities, capTierFromCapabilities } from '../../../packages/detect/src/tiers.js';
import { classifyGPURenderer } from '../../../packages/detect/src/detect.js';

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

describe('detect-upgrade fires liteship:detect-ready', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('data-liteship-tier');
    document.documentElement.removeAttribute('data-liteship-gpu-tier');
    document.documentElement.removeAttribute('data-liteship-motion');
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
    document.addEventListener('liteship:detect-ready', ready as EventListener);
    runUpgradeScript();

    expect(ready).toHaveBeenCalledOnce();
    const detail = (ready.mock.calls[0]![0] as CustomEvent).detail;
    // RTX + 8 cores + webgpu → the top 'gpu' rung; the event carries the
    // settled values, not just a "ready" ping.
    expect(detail).toMatchObject({ tier: 'gpu', gpuTier: 3, webgpu: true, motionTier: 'compute' });
    // And __LITESHIP_DETECT__ is final/consistent with the event by the time it fires.
    expect((window as unknown as { __LITESHIP_DETECT__: { gpuTier: number } }).__LITESHIP_DETECT__.gpuTier).toBe(3);
    // The probe writes the computed motion TIER to data-liteship-motion (same
    // vocabulary EdgeTier emits server-side) so CSS keyed on the capability
    // tier matches on non-edge pages too — not just the event payload.
    expect(document.documentElement.getAttribute('data-liteship-motion')).toBe('compute');
    // gpuTier/webgpu are ENGINE state — they ride the event detail + __LITESHIP_DETECT__
    // ONLY, never the DOM root. The DOM stays clean of them even though the event
    // above carries them (gpuTier: 3, webgpu: true).
    expect(document.documentElement.hasAttribute('data-liteship-gpu-tier')).toBe(false);
    expect(document.documentElement.hasAttribute('data-liteship-webgpu')).toBe(false);
  });

  // The inline probe writes data-liteship-motion (CSS-keyed) from a hand-rolled
  // copy of BOTH the renderer→tier classifier and the tier→motion mapping —
  // head-inline can't import @liteship/detect. This drives the REAL shipped script
  // and asserts the DOM attribute equals the canonical pipeline run on the SAME
  // renderer string: motionTierFromCapabilities(classifyGPURenderer(renderer)).
  // Expected is computed from canonical, never hardcoded — so drift in EITHER
  // the inline classifier (e.g. desktop GTX → tier 2 vs canonical tier 1) or
  // the mapping fails here instead of silently over-granting motion via CSS.
  const RENDERERS = [
    'SwiftShader', // tier 0
    'Intel(R) UHD Graphics 620', // tier 1
    'NVIDIA GeForce GTX 1660', // tier 1 (desktop GTX — the Codex case, NOT tier 2)
    'NVIDIA GeForce MX450', // tier 2 (geforce.*mx)
    'AMD Radeon RX 580', // tier 2
    'Apple M1', // tier 2
    'NVIDIA GeForce RTX 4090', // tier 3
    'AMD Radeon RX 6800', // tier 3
    'Apple M3 Max', // tier 3
  ] as const;

  for (const renderer of RENDERERS) {
    for (const cores of [3, 8] as const) {
      for (const memory of [2, 8] as const) {
        for (const webgpu of [true, false] as const) {
          test(`data-liteship tier+motion mirror canonical for ${renderer} / ${cores}c / ${memory}gb / webgpu=${webgpu}`, () => {
            vi.stubGlobal('matchMedia', () => ({ matches: false }) as MediaQueryList);
            defineNavigator({ hardwareConcurrency: cores, deviceMemory: memory, gpu: webgpu ? {} : undefined });
            vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
              () =>
                ({
                  getExtension: (name: string) =>
                    name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 37446 } : null,
                  getParameter: () => renderer,
                }) as never,
            );

            runUpgradeScript();

            // Single source of truth: canonical classify + map/tier on the SAME
            // inputs. Expected is computed from canonical, never hardcoded — so
            // drift in the inline classifier, the motion mapping, OR the capTier
            // ladder fails here instead of silently mis-granting via CSS.
            const caps = {
              gpu: classifyGPURenderer(renderer),
              cores,
              memory,
              webgpu,
              prefersReducedMotion: false,
            } as Parameters<typeof motionTierFromCapabilities>[0];
            expect(document.documentElement.getAttribute('data-liteship-motion')).toBe(motionTierFromCapabilities(caps));
            expect(document.documentElement.getAttribute('data-liteship-tier')).toBe(capTierFromCapabilities(caps));
          });
        }
      }
    }
  }

  // reduced-motion: motion short-circuits to 'none', and the capTier ladder's
  // reduced-motion branches (static/reactive/animated) must still mirror canonical.
  for (const renderer of ['SwiftShader', 'Intel(R) UHD Graphics 620', 'Apple M1', 'NVIDIA GeForce RTX 4090'] as const) {
    test(`reduced-motion mirrors canonical tier+motion for ${renderer}`, () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
      defineNavigator({ hardwareConcurrency: 8, deviceMemory: 8, gpu: {} });
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () =>
          ({
            getExtension: (name: string) =>
              name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 37446 } : null,
            getParameter: () => renderer,
          }) as never,
      );
      runUpgradeScript();
      const caps = {
        gpu: classifyGPURenderer(renderer),
        cores: 8,
        memory: 8,
        webgpu: true,
        prefersReducedMotion: true,
      } as Parameters<typeof capTierFromCapabilities>[0];
      expect(document.documentElement.getAttribute('data-liteship-motion')).toBe('none');
      expect(document.documentElement.getAttribute('data-liteship-tier')).toBe(capTierFromCapabilities(caps));
    });
  }

  test('still fires (flagged error) when the probe throws, so listeners never hang', () => {
    // matchMedia undefined in this run → the probe body throws → error branch.
    vi.stubGlobal('matchMedia', undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);

    const ready = vi.fn();
    document.addEventListener('liteship:detect-ready', ready as EventListener);
    runUpgradeScript();

    expect(ready).toHaveBeenCalledOnce();
    expect((ready.mock.calls[0]![0] as CustomEvent).detail).toMatchObject({ error: true });
    expect(document.documentElement.getAttribute('data-liteship-tier-probe-error')).toBe('true');
  });
});
