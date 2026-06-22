/**
 * The clock substrate — the ONE shape runtime time is read through.
 *
 * Determinism is a Slice-A invariant: identical inputs must produce byte-identical
 * artifacts and replayable runs. Ambient `Date.now()` / `performance.now()` reads
 * scattered through the runtime defeat that — they make a run depend on the wall
 * clock, so it cannot be reproduced under test. This module collapses every such
 * read into a single injectable value.
 *
 * **The cake-and-eat-it discipline:** a function that needs the time takes an
 * optional `clock?: Clock` and defaults to {@link systemClock}. Casual callers
 * pass nothing (ergonomics preserved); a test or a deterministic replay passes a
 * {@link fixedClock} or {@link manualClock} (full determinism). The result is
 * that the ONLY wall-clock read in the entire runtime is the one inside
 * {@link systemClock} — the single **declared entropy boundary**. The
 * no-nondeterminism gate sees that one read and it is explicitly waived (with the
 * reason that it is the sole sanctioned boundary); every other site is green
 * because it reads through an injected `clock.now()`.
 *
 * Composition, not inheritance: a clock is a plain value `{ now() }`. There is no
 * class, no base, no `extends` — a consumer assembles their own clock (a server
 * clock, an HLC-driven clock, a recorded-trace clock) by satisfying the one-method
 * structural contract, and threads it through the same optional parameter.
 *
 * Effect-based code (HLC, zap throttling, the time signal source) does NOT use
 * this value — it reads time through Effect's own `Clock` service
 * (`Clock.currentTimeMillis`), which is injectable via `TestClock` and needs no
 * waiver. This module is for the plain (non-Effect) runtime paths.
 *
 * @module
 */

/**
 * A monotonic-ish millisecond time source — the one shape time is read through.
 *
 * `now()` returns milliseconds. Implementations backed by `performance.now()` are
 * monotonic and sub-millisecond; implementations backed by `Date.now()` are
 * wall-clock and integer. Callers must treat the value as a relative duration
 * source (deltas), never as a stable identity input to a hashed artifact.
 */
export interface Clock {
  /** Current time in milliseconds. */
  readonly now: () => number;
}

/**
 * The sanctioned MONOTONIC time read — for DURATIONS, never timestamps.
 *
 * Prefers `performance.now()` (monotonic, sub-millisecond, process-relative) and
 * falls back to `Date.now()` only where `performance` is stripped (some workers /
 * SSR). Use this for elapsed-time deltas: rate estimation, throttle windows,
 * velocity history, frame pacing. **Its reading is NOT epoch milliseconds** — do
 * NOT feed it into a `new Date(...)`, an ISO stamp, or an HLC `wall_ms`; those
 * need {@link wallClock}. One of the two declared entropy boundaries (the other is
 * {@link wallClock}); the no-nondeterminism gate flags its `Date.now()` fallback
 * and it is explicitly waived. Every runtime duration path reads through an
 * injected {@link Clock} defaulting here.
 */
export const systemClock: Clock = {
  now: (): number => (typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now()),
};

/**
 * The sanctioned WALL-CLOCK read — epoch milliseconds, for TIMESTAMPS.
 *
 * `Date.now()` — epoch ms. Use this wherever the value must be a real point in
 * time: an HLC `wall_ms` (which the protocol defines as `≈ Date.now()`), an
 * ISO receipt timestamp (`new Date(wallClock.now()).toISOString()`), a
 * time-range activation check, or an absolute-time signal value. **Not monotonic**
 * — it can jump with NTP/DST; for elapsed durations use {@link systemClock}. The
 * second of the two declared entropy boundaries; the no-nondeterminism gate flags
 * its `Date.now()` read and it is explicitly waived. Every runtime timestamp path
 * reads through an injected {@link Clock} defaulting here, so a test passing a
 * {@link fixedClock} gets stable timestamps and replayable HLC ordering.
 */
export const wallClock: Clock = {
  now: (): number => Date.now(),
};

/**
 * A frozen clock that always returns `ms` — for deterministic tests and replay.
 *
 * Pure: the same `ms` always yields the same readings, so any computation that
 * threads this clock is fully reproducible.
 */
export const fixedClock = (ms: number): Clock => ({ now: (): number => ms });

/** A {@link Clock} whose time the caller advances explicitly — deterministic. */
export interface ManualClock extends Clock {
  /** Advance the clock by `byMs` milliseconds. */
  readonly advance: (byMs: number) => void;
  /** Set the clock to an absolute `ms`. */
  readonly set: (ms: number) => void;
}

/**
 * A manually-advanced clock — the caller drives time, so elapsed-time logic
 * (rate estimation, throttling, velocity history) becomes a deterministic
 * function of the advances the test makes. Starts at `startMs` (default 0).
 */
export const manualClock = (startMs = 0): ManualClock => {
  let t = startMs;
  return {
    now: (): number => t,
    advance: (byMs: number): void => {
      t += byMs;
    },
    set: (ms: number): void => {
      t = ms;
    },
  };
};
