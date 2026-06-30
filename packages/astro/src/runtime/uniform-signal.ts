/**
 * Continuous signal → shader uniform bridge.
 *
 * The `czap:uniform-update` event and its GPU consumer (the `client:gpu` /
 * `client:wgsl` runtimes) already exist; today the event fires only on DISCRETE
 * boundary-state crossings. This bridge drives the SAME event CONTINUOUSLY from
 * a continuous signal (e.g. `scroll.progress` at 0..1), so a host can wire a
 * scroll/viewport signal straight into a shader uniform without hand-rolling the
 * scroll-position math (which is exactly the `scroll.progress` scale that
 * `readSignalValue` already owns — re-deriving it by hand is the 0..1-vs-0..100
 * landmine the runtime canonicalised).
 *
 * It is pure glue over primitives that already ship: {@link readSignalValue}
 * for the value and {@link attachSignalObserver} for the rAF-throttled change
 * feed. Non-users pay nothing — the per-frame dispatch only runs once attached.
 *
 * @module
 */

import type { BoundaryStateDetail } from './boundary.js';
import { readSignalValue, attachSignalObserver, warnIfSignalUnserved } from './boundary.js';

/**
 * Drive a shader uniform continuously from a canonical continuous signal.
 *
 * Reads `input` (e.g. `'scroll.progress'`, `'viewport.width'`) via
 * {@link readSignalValue} and dispatches a `czap:uniform-update` `CustomEvent`
 * on `element` whenever the signal changes, writing `value` to `uniform` in
 * both the GLSL and WGSL uniform maps the GPU runtime consumes. Emits one frame
 * immediately, then re-emits on each (rAF-throttled) observer tick.
 *
 * The write reaches a shader only if `uniform` names a uniform the author
 * actually declared — a GLSL `u_*` name or a WGSL struct field. An unknown name
 * is a silent no-op on the GPU side, by design (the runtime never invents
 * uniforms).
 *
 * @param element - The element the GPU directive is mounted on (the event target).
 * @param input   - A canonical continuous signal input (see `signal-input.ts`).
 * @param uniform - The uniform name to write (`u_progress`, a WGSL field, ...).
 * @returns A stop function that detaches the observer.
 *
 * @example
 * ```ts
 * // <canvas data-czap-shader-src="..." client:gpu>
 * const stop = driveUniformFromSignal(canvas, 'scroll.progress', 'u_progress');
 * // ...later: stop();
 * ```
 */
export function driveUniformFromSignal(element: HTMLElement, input: string, uniform: string): () => void {
  const emit = (): void => {
    const value = readSignalValue(input);
    if (value === undefined) return;
    const detail: BoundaryStateDetail = {
      discrete: {},
      css: {},
      glsl: { [uniform]: value },
      wgsl: { [uniform]: value },
      aria: {},
    };
    element.dispatchEvent(new CustomEvent('czap:uniform-update', { detail, bubbles: true }));
  };

  emit(); // seed the initial frame so the uniform is correct before the first change
  const stop = attachSignalObserver(input, emit);

  // A signal that never feeds this uniform is silent today — either a typo
  // outside the vocabulary or a recognized signal with no live producer here
  // (it freezes). Warn once at setup; the two codes are disjoint by construction.
  warnIfSignalUnserved(input, { source: 'czap/astro.uniform-signal', what: `uniform "${uniform}" signal` });

  return () => {
    stop?.();
  };
}
