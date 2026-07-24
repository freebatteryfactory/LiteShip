/**
 * Head-inline GPU-probe script — GENERATED from the canonical classifier and
 * tier ladders so a hand-copy can never drift.
 *
 * The `@liteship/astro` integration injects a GPU detection probe into the document
 * `<head>` that must run BEFORE hydration — before any module graph exists — so
 * it cannot `import { classifyGPURenderer } from '@liteship/detect'` at runtime. The
 * naive fix (re-type the classifier + ladders inline) is exactly what shipped a
 * real drift bug in the 0.2.3 "detect-ladder" release: the inline copy silently
 * diverged from canonical.
 *
 * This module removes the hand-copy entirely. The probe's classifier is FOLDED
 * from {@link GPU_TIER_PATTERNS} (the one pattern datum), and the cap-level and
 * motion ladders are the SAME pure functions — {@link headProbeCapTier},
 * {@link headProbeMotionTier} — that `tiers.ts` delegates to for the runtime
 * sweep, emitted into the script via `Function.prototype.toString()`. There is
 * one source for each rule; the head script is a derived artifact of it.
 *
 * @module
 */

import type { CapTier, MotionTier } from '@liteship/core';
import { GPU_TIER_PATTERNS, GPU_TIER_PRECEDENCE, GPU_TIER_DEFAULT } from './gpu-patterns.js';
import { DETECT_READY_EVENT } from './detect-ready.js';
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
 * Resolve the {@link CapTier} for a device — the SINGLE source of truth for
 * the GPU/cores/memory/reduced-motion → cap-level ladder.
 *
 * `capTierFromCapabilities` (`tiers.ts`) delegates here for the runtime sweep, and
 * this exact function body is emitted into the head-inline probe by
 * {@link emitDetectUpgradeScript}. Edit the ladder here and BOTH update.
 *
 * Authored as a self-contained pure function over primitives (no imports, no
 * closures) so its `.toString()` is valid standalone browser script.
 */
export function headProbeCapTier(caps: HeadProbeCaps): CapTier {
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
 * Build the head-inline PROVISIONAL detect script — the render-blocking script
 * `@liteship/astro` injects via `injectScript('head-inline', ...)` BEFORE hydration.
 *
 * It writes the cheap, non-GPU device attributes (`data-liteship-touch`,
 * `data-liteship-reduced-motion`, `data-liteship-scheme`, the `--liteship-*` custom props)
 * and a PROVISIONAL `data-liteship-tier`, then the deferred {@link emitDetectUpgradeScript}
 * refines that tier once a real WebGL GPU probe is available.
 *
 * The provisional tier is NOT a second hand-rolled ladder (the 0.2.3/0.3.0
 * drift bug-class: this script and the upgrade script both write `data-liteship-tier`,
 * so a divergent provisional ladder disagrees with canonical by construction).
 * Instead it calls the SAME canonical {@link headProbeCapTier}, emitted verbatim
 * via `.toString()`, over the inline primitives (`cores`, `memory`,
 * `prefersReducedMotion`) with a conservative GPU assumption — {@link GPU_TIER_DEFAULT},
 * the exact fallback the runtime sweep uses when no renderer probe is available.
 * The provisional therefore equals what canonical computes for a GPU-unavailable
 * device; the upgrade script later supplies the real GPU tier and re-runs the
 * same function. One ladder, two callers — they cannot drift.
 *
 * A drift guard runs this emitted script across the full cores × memory ×
 * reduced-motion matrix and asserts the written `data-liteship-tier` equals
 * `headProbeCapTier({ ...inline primitives, gpu: GPU_TIER_DEFAULT, webgpu: false })`
 * — `expected` computed from the canonical source, never hardcoded.
 */
export function emitProvisionalDetectScript(): string {
  return `
(function(){
  if (window.__LITESHIP_OFF__) return;
  function writeDetectState(next) {
    const safe = Object.freeze(Object.assign({}, next));
    try {
      Object.defineProperty(window, '__LITESHIP_DETECT__', {
        value: safe,
        configurable: true,
        enumerable: false,
        writable: false
      });
    } catch (_) {
      try {
        window.__LITESHIP_DETECT__ = safe;
      } catch (_) {}
    }
  }

  // Cap-tier ladder — the canonical headProbeCapTier (@liteship/detect), emitted
  // verbatim. The provisional and the deferred GPU-probe upgrade both call THIS
  // one function, so the provisional tier can never be a divergent hand-copy.
  const ${headProbeCapTier.name} = ${headProbeCapTier.toString()};

  try {
    const h = document.documentElement;
    const w = window.innerWidth || 0;
    const cores = navigator.hardwareConcurrency || 2;
    const mem = navigator.deviceMemory || 4;
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dpr = window.devicePixelRatio || 1;

    h.style.setProperty('--liteship-vw', w + 'px');
    h.style.setProperty('--liteship-cores', String(cores));
    h.style.setProperty('--liteship-dpr', String(dpr));
    h.setAttribute('data-liteship-touch', String(touch));
    // The reduced-motion PREFERENCE — distinct from data-liteship-motion, which is the
    // motion capability TIER (animations/transitions/.../none) emitted by
    // EdgeTier.tierDataAttributes server-side and refined by the GPU-probe upgrade.
    h.setAttribute('data-liteship-reduced-motion', motion ? 'reduce' : 'no-preference');
    h.setAttribute('data-liteship-scheme', dark ? 'dark' : 'light');

    // Provisional tier — NO GPU probe is available inline (it needs a WebGL
    // context, which the deferred upgrade script creates). Feed canonical
    // headProbeCapTier the inline primitives with the conservative GPU fallback
    // (${GPU_TIER_DEFAULT} = integrated, the same default the runtime sweep uses when the
    // renderer probe is unavailable) so the provisional value IS canonical for a
    // GPU-unknown device. The upgrade script supplies the real GPU tier and
    // re-runs the same function, replacing data-liteship-tier.
    const capTier = ${headProbeCapTier.name}({
      gpu: ${GPU_TIER_DEFAULT},
      cores: cores,
      memory: mem,
      webgpu: false,
      prefersReducedMotion: motion
    });
    h.setAttribute('data-liteship-tier', capTier);
    h.setAttribute('data-liteship-tier-provisional', 'true');

    writeDetectState({
      tier: capTier,
      provisional: true
    });
  } catch(e) {}
})();
`.trim();
}

/**
 * Build the head-inline GPU-probe IIFE — the script `@liteship/astro` injects via
 * `injectScript('page', ...)`. EVERY classification rule in the returned string
 * is generated from canonical `@liteship/detect`:
 *
 *   - the renderer→tier classifier is folded from {@link GPU_TIER_PATTERNS};
 *   - the cap-level ladder is {@link headProbeCapTier}, emitted via `.toString()`;
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
  if (window.__LITESHIP_OFF__) return;
  function writeDetectState(next) {
    const safe = Object.freeze(Object.assign({}, next));
    try {
      Object.defineProperty(window, '__LITESHIP_DETECT__', {
        value: safe,
        configurable: true,
        enumerable: false,
        writable: false
      });
    } catch (_) {
      try {
        window.__LITESHIP_DETECT__ = safe;
      } catch (_) {}
    }
  }

  // Renderer → GPU tier — folded from the canonical GPU_TIER_PATTERNS datum
  // (@liteship/detect) in canonical precedence (0 → 3 → 2 → 1, default ${GPU_TIER_DEFAULT}).
${emitClassifierSource()}

  // Cap-level ladder — the canonical headProbeCapTier (@liteship/detect),
  // emitted verbatim. Edit the ladder there and this updates.
  const ${headProbeCapTier.name} = ${headProbeCapTier.toString()};

  // Motion ladder — the canonical headProbeMotionTier (@liteship/detect),
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

      const capTier = ${headProbeCapTier.name}(caps);
      const motionTier = ${headProbeMotionTier.name}(caps);

      h.setAttribute('data-liteship-tier', capTier);
      // The motion capability TIER, in the same vocabulary EdgeTier emits
      // server-side (data-liteship-motion). The probe already computes it; write it
      // so CSS keyed on [data-liteship-motion="physics"/"none"] matches on
      // non-edge pages too (where EdgeTier never ran), and so the edge value is
      // refined by the real GPU probe just like data-liteship-tier is. The
      // reduced-motion PREFERENCE lives separately on data-liteship-reduced-motion.
      h.setAttribute('data-liteship-motion', motionTier);
      // gpuTier (numeric) and webgpu (bool) are pure ENGINE state, not author
      // CSS keys — they ride liteship:detect-ready + __LITESHIP_DETECT__ only, never the
      // DOM root (zero readers; keeps engine state off the DOM).
      h.removeAttribute('data-liteship-tier-provisional');

      // Update a minimal runtime snapshot instead of exposing the full probe payload.
      writeDetectState({
        tier: capTier,
        gpuTier: tier,
        webgpu: webgpu,
        motionTier: motionTier
      });

      // Single consolidated "detect settled" signal. __LITESHIP_DETECT__ and the
      // data-liteship-* attributes are now final; consumers that need post-probe
      // values (gpuTier/webgpu) listen for this ONE event instead of polling or
      // racing setTimeout backstops. The detail carries the final payload so a
      // late listener can read it straight off the event.
      try {
        document.dispatchEvent(new CustomEvent('${DETECT_READY_EVENT}', {
          detail: { tier: capTier, gpuTier: tier, webgpu: webgpu, motionTier: motionTier }
        }));
      } catch(_) {}
    } catch(e) {
      try { document.documentElement.setAttribute('data-liteship-tier-probe-error', 'true'); } catch(_) {}
      // Still fire detect-ready (flagged) so listeners awaiting the probe never
      // hang on a thrown probe — the provisional tier stands.
      try {
        document.dispatchEvent(new CustomEvent('${DETECT_READY_EVENT}', { detail: { error: true } }));
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
