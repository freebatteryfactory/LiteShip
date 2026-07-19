/**
 * Single-source-of-truth drift guard for the Astro PROVISIONAL head-inline
 * detect script.
 *
 * The provisional script (`emitProvisionalDetectScript`) runs render-blocking in
 * the document `<head>` before any module graph or GPU probe exists, and writes
 * a provisional `data-liteship-tier`. The deferred GPU-probe upgrade script
 * (`emitDetectUpgradeScript`) later REWRITES `data-liteship-tier` with the real GPU
 * tier. Because BOTH scripts write the same attribute, a provisional cap-ladder
 * that diverged from canonical disagreed with the upgrade by construction — the
 * exact 0.2.3/0.3.0 "detect-ladder" drift bug-class, which used to live as a
 * hand-rolled inline ladder in `@liteship/astro`'s integration.
 *
 * The cure makes drift structurally impossible: the provisional script EMITS the
 * canonical `headProbeCapTier` ladder verbatim and feeds it the inline primitives
 * (cores, memory, reduced-motion) with the conservative GPU fallback the runtime
 * sweep itself uses when no renderer probe is available (`GPU_TIER_DEFAULT`,
 * webgpu=false). This guard executes the REAL emitted provisional script across
 * the full cores × memory × reduced-motion matrix and asserts the provisional
 * `data-liteship-tier` equals canonical `capTierFromCapabilities` on the SAME
 * GPU-unknown inputs. Every `expected` is computed from canonical, NEVER
 * hardcoded — the hard-won 0.2.3 lesson.
 *
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, test } from 'vitest';
import {
  capTierFromCapabilities,
  emitProvisionalDetectScript,
  GPU_TIER_DEFAULT,
} from '../../../packages/detect/src/index.js';
import type { HeadProbeCaps } from '../../../packages/detect/src/index.js';

const SCRIPT = emitProvisionalDetectScript();

/**
 * Drive the REAL emitted provisional script in jsdom with a fixed navigator +
 * matchMedia, and return the provisional `data-liteship-tier` it writes. This is the
 * shipped script — not a reimplementation — so any divergence between the
 * emitted cap-tier ladder and canonical surfaces here.
 */
function runProvisional(input: {
  cores: number;
  memory: number;
  reducedMotion: boolean;
}): { tier: string | null; provisional: string | null } {
  const realMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: input.reducedMotion }) as MediaQueryList,
  });
  Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: input.cores });
  Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: input.memory });

  try {
    // new Function over eval: same IIFE execution, no eval lint violation.
    new Function(SCRIPT)();
    return {
      tier: document.documentElement.getAttribute('data-liteship-tier'),
      provisional: document.documentElement.getAttribute('data-liteship-tier-provisional'),
    };
  } finally {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: realMatchMedia });
  }
}

afterEach(() => {
  document.documentElement.removeAttribute('data-liteship-tier');
  document.documentElement.removeAttribute('data-liteship-tier-provisional');
  document.documentElement.removeAttribute('data-liteship-reduced-motion');
  document.documentElement.removeAttribute('data-liteship-scheme');
  document.documentElement.removeAttribute('data-liteship-touch');
});

describe('provisional detect script is a derived artifact of canonical @liteship/detect', () => {
  // Full cores × memory × reduced-motion matrix. The provisional script has no
  // GPU probe inline, so canonical is evaluated with the SAME conservative GPU
  // fallback the script emits (GPU_TIER_DEFAULT, webgpu=false) — `expected`
  // computed from canonical, never hardcoded.
  for (const cores of [1, 2, 4, 8, 16]) {
    for (const memory of [1, 2, 4, 8]) {
      for (const reducedMotion of [false, true]) {
        test(`provisional tier mirrors canonical for cores=${cores} mem=${memory} rm=${reducedMotion}`, () => {
          const expected = capTierFromCapabilities({
            gpu: GPU_TIER_DEFAULT,
            cores,
            memory,
            webgpu: false,
            prefersReducedMotion: reducedMotion,
          } as HeadProbeCaps);
          const got = runProvisional({ cores, memory, reducedMotion });
          expect(got.tier).toBe(expected);
          // The provisional flag must be set so the upgrade script knows to refine.
          expect(got.provisional).toBe('true');
        });
      }
    }
  }

  test('navigator defaults (cores=2, mem=4) still mirror canonical', () => {
    // Exercise the script's own `|| 2` / `|| 4` fallbacks by leaving the
    // navigator fields undefined.
    const realMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }) as MediaQueryList,
    });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: undefined });
    try {
      new Function(SCRIPT)();
      const expected = capTierFromCapabilities({
        gpu: GPU_TIER_DEFAULT,
        cores: 2,
        memory: 4,
        webgpu: false,
        prefersReducedMotion: false,
      } as HeadProbeCaps);
      expect(document.documentElement.getAttribute('data-liteship-tier')).toBe(expected);
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: realMatchMedia });
    }
  });
});
