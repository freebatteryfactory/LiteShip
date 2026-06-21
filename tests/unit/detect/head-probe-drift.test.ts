/**
 * Single-source-of-truth drift guard for the Astro head-inline GPU probe.
 *
 * The probe runs in the document `<head>` before any module graph exists, so
 * it cannot `import { classifyGPURenderer } from '@czap/detect'`. The 0.2.3
 * "detect-ladder" release shipped a real drift bug when an inline HAND-COPY of
 * the classifier + tier ladders silently diverged from canonical.
 *
 * The cure makes drift structurally impossible: `emitDetectUpgradeScript`
 * GENERATES the probe script from canonical `@czap/detect` — folding the
 * classifier from the one `GPU_TIER_PATTERNS` datum and emitting the canonical
 * `headProbeCapTier` / `headProbeMotionTier` ladders verbatim. This guard is
 * defence in depth: it executes the REAL emitted script and asserts it
 * classifies IDENTICALLY to the canonical pipeline across an exhaustive and a
 * property-generated input space. Every `expected` is computed from canonical
 * (`classifyGPURenderer` / `capTierFromCapabilities` / `motionTierFromCapabilities`),
 * NEVER hardcoded — so if canonical changes and the emitted script doesn't track
 * it, this fails RED (the lesson the 0.2.3 first-guard missed).
 *
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, test } from 'vitest';
import * as fc from 'fast-check';
import {
  capTierFromCapabilities,
  motionTierFromCapabilities,
  emitDetectUpgradeScript,
  headProbeCapTier,
  headProbeMotionTier,
  GPU_TIER_PATTERNS,
  GPU_TIER_PRECEDENCE,
  GPU_TIER_DEFAULT,
} from '../../../packages/detect/src/index.js';
import type { GPUTier, HeadProbeCaps } from '../../../packages/detect/src/index.js';
// classifyGPURenderer is internal to detect.ts (not on the package `.` surface);
// import it directly for the drift comparison, matching the sibling test.
import { classifyGPURenderer } from '../../../packages/detect/src/detect.js';

const SCRIPT = emitDetectUpgradeScript();

/**
 * Drive the REAL emitted probe in jsdom with a fixed renderer + navigator +
 * matchMedia, and return the `data-czap-*` attributes it writes. This is the
 * shipped script — not a reimplementation — so any divergence between the
 * emitted classifier/ladders and canonical surfaces here.
 */
function runEmittedProbe(input: {
  renderer: string;
  cores: number;
  memory: number;
  webgpu: boolean;
  reducedMotion: boolean;
}): { tier: string | null; motion: string | null } {
  const realMatchMedia = window.matchMedia;
  const realGetContext = HTMLCanvasElement.prototype.getContext;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: input.reducedMotion }) as MediaQueryList,
  });
  Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: input.cores });
  Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: input.memory });
  Object.defineProperty(navigator, 'gpu', { configurable: true, value: input.webgpu ? {} : undefined });
  HTMLCanvasElement.prototype.getContext = (() =>
    ({
      getExtension: (name: string) =>
        name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 37446 } : null,
      getParameter: () => input.renderer,
    })) as never;

  try {
    // new Function over eval: same IIFE execution, no eval lint violation.
    new Function(SCRIPT)();
    return {
      tier: document.documentElement.getAttribute('data-czap-tier'),
      motion: document.documentElement.getAttribute('data-czap-motion'),
    };
  } finally {
    HTMLCanvasElement.prototype.getContext = realGetContext;
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: realMatchMedia });
  }
}

afterEach(() => {
  document.documentElement.removeAttribute('data-czap-tier');
  document.documentElement.removeAttribute('data-czap-motion');
  document.documentElement.removeAttribute('data-czap-tier-provisional');
});

describe('head-probe is a derived artifact of canonical @czap/detect', () => {
  // ── Structural: the emitted classifier embeds EVERY canonical pattern ──
  // A pattern added to the canonical GPU_TIER_PATTERNS datum that did NOT flow
  // into the emitted script (impossible by construction — they share the datum)
  // would surface here, because we exhaust a representative match of every
  // single canonical regex and assert the emitted probe agrees with canonical.
  describe('every canonical pattern classifies identically through the emitted probe', () => {
    const sampleForPattern = (source: string): string => {
      // Turn a pattern's source into a string that matches it: `.` → a letter,
      // `.*` collapses, char classes → their first member, quantified digits
      // expand. This is a deterministic witness generator, not a parser — it
      // covers the simple unanchored fragments the GPU patterns are built from.
      let out = '';
      for (let i = 0; i < source.length; i++) {
        const ch = source[i]!;
        if (ch === '\\') {
          const next = source[i + 1];
          if (next === 's') out += ' ';
          else out += next ?? '';
          i++;
        } else if (ch === '.') {
          // `.*` / `.+` → empty; bare `.` → a vowel.
          const next = source[i + 1];
          if (next === '*' || next === '+') i++;
          else out += 'a';
        } else if (ch === '[') {
          const close = source.indexOf(']', i);
          const body = source.slice(i + 1, close);
          // First concrete member of the class (range start or first literal).
          out += body[0] === '0' || /[0-9a-z]/i.test(body[0]!) ? body[0]! : 'a';
          i = close;
          // Skip a following quantifier — one member satisfies it.
          const after = source[i + 1];
          if (after === '*' || after === '+' || after === '?') i++;
          else if (after === '{') {
            const qc = source.indexOf('}', i);
            const min = parseInt(source.slice(i + 2, qc), 10) || 1;
            for (let k = 1; k < min; k++) out += body[0];
            i = qc;
          }
        } else if (ch === '*' || ch === '+' || ch === '?') {
          // dangling quantifier already handled above
        } else {
          out += ch;
        }
      }
      return out;
    };

    for (let tier = 0; tier < GPU_TIER_PATTERNS.length; tier++) {
      for (const pattern of GPU_TIER_PATTERNS[tier]!) {
        const witness = sampleForPattern(pattern.source);
        test(`tier-${tier} pattern /${pattern.source}/ → witness "${witness}"`, () => {
          // The witness must match its source (sanity on the generator).
          expect(new RegExp(pattern.source, 'i').test(witness)).toBe(true);
          // Canonical is the source of truth for the expected tier on this
          // witness (precedence may bump it above `tier` — that's canonical's
          // call, and the emitted probe must agree).
          const canonicalGpu = classifyGPURenderer(witness);
          const expected = capTierFromCapabilities({
            gpu: canonicalGpu,
            cores: 8,
            memory: 8,
            webgpu: true,
            prefersReducedMotion: false,
          } as HeadProbeCaps);
          const got = runEmittedProbe({
            renderer: witness,
            cores: 8,
            memory: 8,
            webgpu: true,
            reducedMotion: false,
          });
          expect(got.tier).toBe(expected);
        });
      }
    }
  });

  // ── The emitted ladders are the SAME functions, byte-for-byte behaviour ──
  // headProbeCapTier / headProbeMotionTier are the single source; tiers.ts
  // delegates to them and the script emits them via .toString(). Prove the
  // canonical delegation holds across the full primitive matrix.
  test('tiers.ts delegates to the head-probe ladders (single body)', () => {
    for (const gpu of [0, 1, 2, 3] as const) {
      for (const cores of [2, 4, 8]) {
        for (const memory of [2, 4, 8]) {
          for (const webgpu of [true, false]) {
            for (const prefersReducedMotion of [true, false]) {
              const caps = { gpu, cores, memory, webgpu, prefersReducedMotion } as HeadProbeCaps;
              expect(capTierFromCapabilities(caps)).toBe(headProbeCapTier(caps));
              // motionTierFromCapabilities reads a superset shape; the primitive
              // fields are all the ladder consumes.
              expect(motionTierFromCapabilities(caps as never)).toBe(headProbeMotionTier(caps));
            }
          }
        }
      }
    }
  });

  // ── Property: emitted probe ≡ canonical pipeline over generated inputs ──
  // The emitted script's classify + ladder must equal the canonical pipeline
  // for ANY renderer + capability tuple, not just the curated matrix. Expected
  // is computed from canonical every time.
  test('emitted probe ≡ canonical pipeline (property)', () => {
    const gpuTokens = [
      'SwiftShader',
      'llvmpipe (LLVM 15)',
      'Intel(R) UHD Graphics 620',
      'Intel(R) Iris(R) Xe',
      'Mali-G78',
      'Mali-T880',
      'Adreno (TM) 308',
      'Adreno (TM) 530',
      'Adreno (TM) 730',
      'PowerVR Rogue',
      'Apple GPU',
      'Apple M1',
      'Apple M2 Pro',
      'Apple M3 Max',
      'NVIDIA GeForce GTX 1660',
      'NVIDIA GeForce MX450',
      'NVIDIA GeForce RTX 4090',
      'NVIDIA GeForce 940M',
      'NVIDIA A100',
      'AMD Radeon RX 580',
      'AMD Radeon RX 6800',
      'AMD Radeon RX 7900 XTX',
      'AMD Radeon Vega 8',
      'Intel Arc A770',
      'Mesa Whatever Next-Gen 9999', // unmatched → default tier
    ];
    fc.assert(
      fc.property(
        fc.constantFrom(...gpuTokens),
        fc.integer({ min: 1, max: 16 }),
        fc.integer({ min: 1, max: 32 }),
        fc.boolean(),
        fc.boolean(),
        (renderer, cores, memory, webgpu, reducedMotion) => {
          const caps = {
            gpu: classifyGPURenderer(renderer),
            cores,
            memory,
            webgpu,
            prefersReducedMotion: reducedMotion,
          } as HeadProbeCaps;
          const expectedTier = capTierFromCapabilities(caps);
          const expectedMotion = motionTierFromCapabilities(caps as never);
          const got = runEmittedProbe({ renderer, cores, memory, webgpu, reducedMotion });
          expect(got.tier).toBe(expectedTier);
          expect(got.motion).toBe(expectedMotion);
        },
      ),
      { numRuns: 400 },
    );
  });

  // ── The emitted classifier's raw output equals classifyGPURenderer ──
  // Folding the precedence (0→3→2→1, default) into the emitted script must not
  // perturb the tier classifyGPURenderer returns. Compares the classifier in
  // isolation (capTier ladder factored out) so a precedence/default regression
  // is pinpointed here.
  test('emitted classifier tier ≡ classifyGPURenderer, with canonical precedence + default', () => {
    expect(GPU_TIER_PRECEDENCE).toEqual([0, 3, 2, 1]);
    expect(GPU_TIER_DEFAULT).toBe<GPUTier>(1);
    const renderers = [
      'SwiftShader',
      'Intel UHD Graphics 620',
      'NVIDIA GeForce GTX 1660', // also contains "geforce"; precedence settles tier 1
      'Apple M1',
      'NVIDIA GeForce RTX 4090', // contains "geforce" AND "rtx"; precedence → tier 3
      'unrecognised-future-gpu',
    ];
    for (const renderer of renderers) {
      const canonicalGpu = classifyGPURenderer(renderer);
      // Compare via the cap-level the probe writes for an otherwise-fixed,
      // discriminating capability tuple (cores/mem high, no reduced motion):
      // this tuple maps each distinct gpu tier to a distinct cap level, so an
      // emitted-classifier tier mismatch shows as a cap-level mismatch.
      const expected = capTierFromCapabilities({
        gpu: canonicalGpu,
        cores: 8,
        memory: 8,
        webgpu: true,
        prefersReducedMotion: false,
      } as HeadProbeCaps);
      const got = runEmittedProbe({ renderer, cores: 8, memory: 8, webgpu: true, reducedMotion: false });
      expect(got.tier).toBe(expected);
    }
  });
});
