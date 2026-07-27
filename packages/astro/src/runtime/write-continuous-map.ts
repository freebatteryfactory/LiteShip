/**
 * N-property continuous writer — the browser-runtime MOTION ADAPTER.
 *
 * Samples the ONE shared kernel `sampleProgram` (`@liteship/core`, Law 4) for progress
 * `t` and projects the result to the DOM: sets each typed CSS custom property and
 * dispatches `liteship:uniform-update` with `detail.css` (all props) plus `detail.wgsl`
 * (GPU-bound numeric props). The kernel handles BOTH a composed `TransitionProgram`
 * (per-window sub-samplers: seq seams, par overlaps, the selected choice branch) and
 * a flat single-tween plan — this adapter never re-implements the window walk. The
 * `{ css, wgsl }` projection itself is the shared `sampleProgramUniforms` (core), so
 * the leaf a browser WRITES and the leaf a worker POSTS are byte-identical.
 *
 * Per-frame LEAF writes only — never touches the graph (Law 15).
 *
 * @module
 */

import { sampleProgramUniforms, type RuntimeWritePlan } from '@liteship/core';
import { dispatchLiteshipEvent } from '@liteship/web';

/**
 * Write interpolated typed property values for progress `t` in [0..1].
 *
 * `t` is the RAW timeline position (scroll progress / elapsed fraction); the plan's
 * own easing descriptor is sampled inside `sampleProgram` (Law 4 — the spring arm is
 * the same `Easing.spring` the CSS `linear()` path samples), so the JS floor bends the
 * curve exactly as native CSS does. Delegates value production to the shared
 * `sampleProgramUniforms` (`@liteship/core`); this function owns only the DOM effects: it writes each
 * CSS custom property on `el` and dispatches one `liteship:uniform-update` carrying
 * `detail.css` (all props) and `detail.wgsl` (GPU-bound numeric props only).
 */
export function writeContinuousMap(el: HTMLElement, plan: RuntimeWritePlan, t: number): void {
  const { css, wgsl } = sampleProgramUniforms(plan, t);

  for (const [cssVar, formatted] of Object.entries(css)) {
    el.style.setProperty(cssVar, formatted);
  }

  dispatchLiteshipEvent(el, 'liteship:uniform-update', {
    css,
    ...(Object.keys(wgsl).length > 0 ? { wgsl } : {}),
  });
}
