/**
 * Head-inline GPU-probe script — GENERATED from the canonical classifier and
 * tier ladders so a hand-copy can never drift.
 *
 * The `@czap/astro` integration injects a GPU detection probe into the document
 * `<head>` that must run BEFORE hydration — before any module graph exists — so
 * it cannot `import { classifyGPURenderer } from '@czap/detect'` at runtime. The
 * naive fix (re-type the classifier + ladders inline) is exactly what shipped a
 * real drift bug in the 0.2.3 "detect-ladder" release: the inline copy silently
 * diverged from canonical.
 *
 * This module removes the hand-copy entirely. The probe's classifier is FOLDED
 * from {@link GPU_TIER_PATTERNS} (the one pattern datum), and the cap-level and
 * motion ladders are the SAME pure functions — {@link headProbeCapLevel},
 * {@link headProbeMotionTier} — that `tiers.ts` delegates to for the runtime
 * sweep, emitted into the script via `Function.prototype.toString()`. There is
 * one source for each rule; the head script is a derived artifact of it.
 *
 * @module
 */

import type { CapLevel, MotionTier } from '@czap/core';
import { GPU_TIER_PATTERNS, GPU_TIER_PRECEDENCE, GPU_TIER_DEFAULT } from './gpu-patterns.js';
import type { GPUTier } from './detect.js';

/**
 * The minimal primitive capability shape the cap-level / motion ladders read.
 *
 * A structural subset of `DeviceCapabilities` / `ExtendedDeviceCapabilities`,
 * carrying only the fields the two ladders consume. Keeping it to primitives
 * (no imports, no methods) is what lets the ladder function bodies be emitted
 * verbatim into the browser head script via `.toString()`.
 */
export interface HeadProbeCaps {
  readonly gpu: GPUTier;
  readonly cores: number;
  readonly memory: number;
  readonly webgpu: boolean;
  readonly prefersReducedMotion: boolean;
}

/**
 * Resolve the {@link CapLevel} for a device — the SINGLE source of truth for
 * the GPU/cores/memory/reduced-motion → cap-level ladder.
 *
 * `tierFromCapabilities` (`tiers.ts`) delegates here for the runtime sweep, and
 * this exact function body is emitted into the head-inline probe by
 * {@link emitDetectUpgradeScript}. Edit the ladder here and BOTH update.
 *
 * Authored as a self-contained pure function over primitives (no imports, no
 * closures) so its `.toString()` is valid standalone browser script.
 */
export function headProbeCapLevel(caps: HeadProbeCaps): CapLevel {
  if (caps.prefersReducedMotion && caps.gpu <= 1) return 'static';
  if (caps.gpu === 0) return 'styled';
  if (caps.gpu === 1) return caps.cores >= 4 && caps.memory >= 4 ? 'reactive' : 'styled';
  if (caps.gpu === 2) {
    if (caps.prefersReducedMotion) return 'reactive';
    return caps.cores >= 4 && caps.memory >= 4 ? 'animated' : 'reactive';
  }
  if (caps.webgpu && caps.cores >= 4 && caps.memory >= 4) {
    return caps.prefersReducedMotion ? 'animated' : 'gpu';
  }
  if (caps.prefersReducedMotion) return 'reactive';
  return 'animated';
}

/**
 * Resolve the {@link MotionTier} for a device — the SINGLE source of truth for
 * the GPU/cores/reduced-motion → motion ladder.
 *
 * `motionTierFromCapabilities` (`tiers.ts`) delegates here for the runtime
 * sweep, and this exact body is emitted into the head probe by
 * {@link emitDetectUpgradeScript}. Edit the ladder here and BOTH update.
 *
 * Authored as a self-contained pure function over primitives so its
 * `.toString()` is valid standalone browser script.
 */
export function headProbeMotionTier(caps: HeadProbeCaps): MotionTier {
  if (caps.prefersReducedMotion) return 'none';
  if (caps.gpu === 0) return 'transitions';
  if (caps.gpu === 1) return caps.cores >= 4 ? 'animations' : 'transitions';
  if (caps.gpu === 2) return caps.cores >= 4 ? 'physics' : 'animations';
  return caps.webgpu ? 'compute' : 'physics';
}

/**
 * Serialize the canonical {@link GPU_TIER_PATTERNS} into one alternation regex
 * literal per tier (`a|b|c`), folding a group of unanchored, group-free
 * fragments into a single pattern with identical match semantics to testing
 * each in turn. The fragments' `RegExp.source` carries escapes (`\s`) verbatim
 * — no manual rewriting (the source of the 0.2.3 whitespace fudge) is needed.
 */
function emitTierRegexLiteral(tier: GPUTier): string {
  // GPU_TIER_PATTERNS is a total 4-tuple keyed by GPUTier, so the lookup is
  // always defined — no undefined branch to guard (structurally total, no throw).
  const alternation = GPU_TIER_PATTERNS[tier].map((pattern) => pattern.source).join('|');
  return `/${alternation}/`;
}

/**
 * Emit the browser-side classifier as a `function classifyGpu(renderer){...}`
 * declaration string, folded from the canonical patterns + precedence. Mirrors
 * {@link classifyGPURenderer} structurally — same precedence, same default —
 * but built from the datum, so the two cannot be independent texts that drift.
 */
function emitClassifierSource(): string {
  const tests = GPU_TIER_PRECEDENCE.map(
    (tier) => `    if (${emitTierRegexLiteral(tier)}.test(r)) return ${tier};`,
  ).join('\n');
  return [
    '  function classifyGpu(renderer) {',
    '    const r = String(renderer).toLowerCase();',
    tests,
    `    return ${GPU_TIER_DEFAULT};`,
    '  }',
  ].join('\n');
}

/**
 * Build the head-inline GPU-probe IIFE — the script `@czap/astro` injects via
 * `injectScript('page', ...)`. EVERY classification rule in the returned string
 * is generated from canonical `@czap/detect`:
 *
 *   - the renderer→tier classifier is folded from {@link GPU_TIER_PATTERNS};
 *   - the cap-level ladder is {@link headProbeCapLevel}, emitted via `.toString()`;
 *   - the motion ladder is {@link headProbeMotionTier}, emitted via `.toString()`.
 *
 * Nothing here is hand-typed twice, so the inline probe cannot drift from the
 * runtime sweep. The `detect-upgrade` drift test additionally runs this exact
 * emitted script across the full renderer × cores × memory × webgpu matrix and
 * asserts equality with the canonical pipeline — defence in depth, with
 * `expected` always computed from canonical, never hardcoded.
 */
export function emitDetectUpgradeScript(): string {
  return `
(function(){
  if (window.__CZAP_OFF__) return;
  function writeDetectState(next) {
    const safe = Object.freeze(Object.assign({}, next));
    try {
      Object.defineProperty(window, '__CZAP_DETECT__', {
        value: safe,
        configurable: true,
        enumerable: false,
        writable: false
      });
    } catch (_) {
      try {
        window.__CZAP_DETECT__ = safe;
      } catch (_) {}
    }
  }

  // Renderer → GPU tier — folded from the canonical GPU_TIER_PATTERNS datum
  // (@czap/detect) in canonical precedence (0 → 3 → 2 → 1, default ${GPU_TIER_DEFAULT}).
${emitClassifierSource()}

  // Cap-level ladder — the canonical headProbeCapLevel (@czap/detect),
  // emitted verbatim. Edit the ladder there and this updates.
  const ${headProbeCapLevel.name} = ${headProbeCapLevel.toString()};

  // Motion ladder — the canonical headProbeMotionTier (@czap/detect),
  // emitted verbatim.
  const ${headProbeMotionTier.name} = ${headProbeMotionTier.toString()};

  function upgrade() {
    try {
      const h = document.documentElement;
      let renderer = '';
      let webgpu = false;

      // WebGL renderer probe
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
      const tier = classifyGpu(renderer);

      // WebGPU check
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        webgpu = true;
      }

      const caps = {
        gpu: tier,
        cores: navigator.hardwareConcurrency || 2,
        memory: navigator.deviceMemory || 4,
        webgpu: webgpu,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      };

      const capLevel = ${headProbeCapLevel.name}(caps);
      const motionTier = ${headProbeMotionTier.name}(caps);

      h.setAttribute('data-czap-tier', capLevel);
      // The motion capability TIER, in the same vocabulary EdgeTier emits
      // server-side (data-czap-motion). The probe already computes it; write it
      // so CSS keyed on [data-czap-motion="physics"/"none"] matches on
      // non-edge pages too (where EdgeTier never ran), and so the edge value is
      // refined by the real GPU probe just like data-czap-tier is. The
      // reduced-motion PREFERENCE lives separately on data-czap-reduced-motion.
      h.setAttribute('data-czap-motion', motionTier);
      // gpuTier (numeric) and webgpu (bool) are pure ENGINE state, not author
      // CSS keys — they ride czap:detect-ready + __CZAP_DETECT__ only, never the
      // DOM root (zero readers; keeps engine state off the DOM).
      h.removeAttribute('data-czap-tier-provisional');

      // Update a minimal runtime snapshot instead of exposing the full probe payload.
      writeDetectState({
        tier: capLevel,
        gpuTier: tier,
        webgpu: webgpu,
        motionTier: motionTier
      });

      // Single consolidated "detect settled" signal. __CZAP_DETECT__ and the
      // data-czap-* attributes are now final; consumers that need post-probe
      // values (gpuTier/webgpu) listen for this ONE event instead of polling or
      // racing setTimeout backstops. The detail carries the final payload so a
      // late listener can read it straight off the event.
      try {
        document.dispatchEvent(new CustomEvent('czap:detect-ready', {
          detail: { tier: capLevel, gpuTier: tier, webgpu: webgpu, motionTier: motionTier }
        }));
      } catch(_) {}
    } catch(e) {
      try { document.documentElement.setAttribute('data-czap-tier-probe-error', 'true'); } catch(_) {}
      // Still fire detect-ready (flagged) so listeners awaiting the probe never
      // hang on a thrown probe — the provisional tier stands.
      try {
        document.dispatchEvent(new CustomEvent('czap:detect-ready', { detail: { error: true } }));
      } catch(_) {}
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', upgrade);
  } else {
    upgrade();
  }
})();
`.trim();
}
