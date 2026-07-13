/**
 * N-property continuous writer — generalizes the scalar `writeContinuous` path
 * in `scene-bridge.ts` over a {@link RuntimeWritePlan} from `interpretTransition`.
 *
 * Per-frame leaf writes only: sets typed CSS custom properties and dispatches
 * `czap:uniform-update` with `detail.css` always plus `detail.wgsl` for
 * GPU-bound numeric props. Never touches the graph.
 *
 * @module
 */

import {
  formatTypedValue,
  interpolateTyped,
  sampleProgramWindows,
  sampleRuntimeEasing,
  type RuntimeWritePlan,
  type TypedValue,
} from '@czap/core';
import { dispatchCzapEvent } from '@czap/web';

/** Numeric typed values map to WGSL uniform fields on the live GPU path. */
function isGpuBound(value: TypedValue): boolean {
  return value.k === 'number' || value.k === 'opacity';
}

/** Strip `--czap-` prefix and kebab→snake for WGSL struct field names. */
function wgslFieldFromCssVar(cssVar: string): string {
  const stripped = cssVar.startsWith('--') ? cssVar.slice(2) : cssVar;
  const withoutPrefix = stripped.startsWith('czap-') ? stripped.slice(5) : stripped;
  return withoutPrefix.replace(/-/g, '_');
}

function numericValue(value: TypedValue): number | undefined {
  if (value.k === 'number' || value.k === 'opacity') return value.v;
  return undefined;
}

/**
 * Write interpolated typed property values for progress `t` in [0..1].
 *
 * `t` is the RAW timeline position (scroll progress / elapsed fraction); the
 * plan's own easing descriptor is sampled to `eased = ease(t)` FIRST, so the JS
 * floor bends the curve exactly as the native CSS `linear()` does (Law 4 — one
 * kernel: `sampleRuntimeEasing`'s spring arm is the same `Easing.spring` the CSS
 * path samples). For each entry in `plan.properties`, interpolates `from`→`to`
 * via {@link interpolateTyped} at `eased`, writes the CSS custom property on
 * `el`, and dispatches one `czap:uniform-update` carrying `detail.css` (all
 * props) and `detail.wgsl` (GPU-bound numeric props only).
 */
export function writeContinuousMap(el: HTMLElement, plan: RuntimeWritePlan, t: number): void {
  const css: Record<string, string> = {};
  const wgsl: Record<string, number> = {};

  // A composed TransitionProgram carries per-window sub-samplers: each window bends
  // its OWN easing over its own `[windowStart, windowEnd]` slice (seq seams, par
  // overlaps, the selected choice branch). `sampleProgramWindows` is the ONE reader
  // (Law 16) shared with the core algebra tests. A single-step plan has no windows —
  // it stays on the flat single-easing tween path below (identical to W8).
  const samples =
    plan.windows && plan.windows.length > 0
      ? sampleProgramWindows(plan.windows, t)
      : plan.properties.map((prop) => ({
          cssVar: prop.cssVar,
          value: interpolateTyped(prop.from, prop.to, sampleRuntimeEasing(plan.easing)(t)),
        }));

  for (const { cssVar, value } of samples) {
    const formatted = formatTypedValue(value);
    el.style.setProperty(cssVar, formatted);
    css[cssVar] = formatted;

    if (isGpuBound(value)) {
      const num = numericValue(value);
      if (num !== undefined) {
        wgsl[wgslFieldFromCssVar(cssVar)] = num;
      }
    }
  }

  dispatchCzapEvent(el, 'czap:uniform-update', {
    css,
    ...(Object.keys(wgsl).length > 0 ? { wgsl } : {}),
  });
}
