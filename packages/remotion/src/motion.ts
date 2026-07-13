/**
 * Authored-motion adapter for `@czap/remotion`.
 *
 * A Remotion composition samples the ONE shared kernel `sampleProgram` (`@czap/core`,
 * Law 4) at its current frame — `t = frame / max(1, durationInFrames-1)` — and folds the
 * typed leaves into the frame content (typically as CSS custom properties via
 * {@link motionCssVars}, mirroring `cssVarsFromState`). This is the SAME reader the
 * browser runtime floor, the scene system, the stage video export, and the worker
 * off-thread sampler call; the differential oracle proves they render one identical curve.
 *
 * Pure + React-free so the sampler is importable in a Remotion `calculateMetadata` or a
 * plain test — the composition wraps it with `useCurrentFrame()`.
 *
 * @module
 */

import { formatTypedValue, sampleProgram, type RuntimeWritePlan, type TypedValue } from '@czap/core';

/** Map a frame index onto the program's normalized `[0,1]` timeline (endpoint-inclusive). */
function frameToT(frame: number, durationInFrames: number): number {
  const denom = Math.max(1, durationInFrames - 1);
  const raw = frame / denom;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}

/**
 * Sample the shared motion kernel at Remotion `frame` of a `durationInFrames`-long
 * composition, returning the typed `cssVar → TypedValue` leaves. The differential oracle
 * reads THIS to prove the remotion leg equals the `sampleProgram` reference within epsilon.
 */
export function sampleMotionFrame(
  plan: RuntimeWritePlan,
  frame: number,
  durationInFrames: number,
): ReadonlyMap<string, TypedValue> {
  const t = frameToT(frame, durationInFrames);
  return new Map(sampleProgram(plan, t).map((s) => [s.cssVar, s.value]));
}

/**
 * Fold a sampled motion frame into CSS custom properties for a composition's `style`,
 * mirroring `cssVarsFromState`. Formats each typed leaf through the SAME
 * `formatTypedValue` the browser floor and worker uniform payload use, so the value
 * Remotion paints is byte-identical to the live runtime's.
 */
export function motionCssVars(plan: RuntimeWritePlan, frame: number, durationInFrames: number): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [cssVar, value] of sampleMotionFrame(plan, frame, durationInFrames)) {
    vars[cssVar] = formatTypedValue(value);
  }
  return vars;
}
