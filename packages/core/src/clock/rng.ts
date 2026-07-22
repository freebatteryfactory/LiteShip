/**
 * The RNG substrate — the ONE shape runtime randomness is read through.
 *
 * The clock substrate's twin (see `clock.ts`). Ambient `Math.random()` reads
 * are the other source of non-reproducibility: a reconnection-jitter or a
 * tie-break that calls `Math.random()` directly cannot be replayed. This module
 * collapses every such read into a single injectable value, with the same
 * cake-and-eat-it discipline: a function that needs randomness takes an optional
 * `rng?: Rng` and defaults to {@link systemRng}; tests pass {@link seededRng} for
 * a deterministic, replayable stream.
 *
 * The ONLY `Math.random()` read in the runtime is the one inside
 * {@link systemRng} — the single **declared entropy boundary** — and the
 * no-nondeterminism gate flags exactly that read, explicitly waived as the sole
 * sanctioned boundary. Every other site reads through an injected `rng.next()`.
 *
 * Composition, not inheritance: an RNG is a plain value `{ next() }`; a consumer
 * assembles their own (a crypto RNG, a recorded-trace RNG) by satisfying the one
 * structural method and threading it through the same optional parameter.
 *
 * @module
 */

/**
 * A uniform random source in `[0, 1)` — the one shape randomness is read through.
 * Mirrors `Math.random()`'s contract so it is a drop-in at every call site.
 */
export interface Rng {
  /** The next uniform draw in `[0, 1)`. */
  readonly next: () => number;
}

/**
 * The single sanctioned `Math.random()` read — the **declared entropy boundary**
 * for runtime randomness. The ONLY ambient-randomness read in the runtime; every
 * other path reads through an injected {@link Rng} defaulting here.
 */
export const systemRng: Rng = {
  next: (): number => Math.random(),
};

/**
 * A seeded, deterministic RNG (mulberry32) — for tests and replayable runs.
 *
 * A fast, well-distributed 32-bit generator. The same `seed` always produces the
 * same stream, so any computation that threads this RNG is fully reproducible.
 * Not cryptographically secure — determinism, not unpredictability, is the goal.
 */
export const seededRng = (seed: number): Rng => {
  // mulberry32: a single 32-bit state word, mixed per draw.
  let state = seed >>> 0;
  return {
    next: (): number => {
      state = (state + 0x6d2b79f5) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    },
  };
};
