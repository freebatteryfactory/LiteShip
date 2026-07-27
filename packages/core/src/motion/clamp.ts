/**
 * Math utilities — the single unit-interval clamp every progress/frame path
 * shares (the [DUP] owner for the ~8 inline `[0,1]` clamps). Pure + browser-safe.
 * @module
 */

/** Clamp `x` to the closed unit interval `[0, 1]` — the local-t domain easings expect. */
export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
