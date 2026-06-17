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
