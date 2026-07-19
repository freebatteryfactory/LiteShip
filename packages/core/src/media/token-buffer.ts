/**
 * TokenBuffer -- ring buffer that absorbs bursty LLM token arrival
 * and emits at smooth cadence.
 *
 * Backed by a pre-allocated ring (capacity fixed at construction; `new Array`
 * once, never on the hot path). The ZERO-ALLOCATION hot path is `push` +
 * {@link TokenBufferShape.drainInto}: `push` writes one slot and bumps three
 * integers (no allocation); `drainInto(sink, maxCount)` copies the drained
 * tokens into a CALLER-OWNED array and returns the count written — it allocates
 * NOTHING, so a host that reuses one scratch array drains at steady state with
 * zero per-op heap traffic. This is the path a streaming consumer runs.
 *
 * The convenience {@link TokenBufferShape.drain} returns a FRESH `T[]` each call
 * (one array allocation per drain, inherent to handing back an owned array) — it
 * is the ergonomic accessor, NOT the zero-alloc path. Reach for `drainInto` on a
 * hot loop; reach for `drain` when a fresh array is what you want.
 *
 * EMA (exponential moving average) for rate estimation.
 * Stall detection: buffer empty + `gen < consume`.
 *
 * The zero-allocation of `push`/`drainInto` is MEASURED + PINNED by
 * `tests/property/token-buffer-zero-alloc.test.ts` (the allocation gate), which
 * forces GC between batches and asserts the live per-op heap growth is ≈ 0.
 *
 * @module
 */

import { type Clock, systemClock } from '../clock/clock.js';

interface TokenBufferShape<T = string> {
  push(token: T): void;
  /**
   * Convenience drain — returns a FRESH array of up to `maxCount` tokens (the
   * whole buffer when omitted). Allocates one array per call; for a zero-alloc
   * hot loop use {@link TokenBufferShape.drainInto} instead.
   */
  drain(maxCount?: number): T[];
  /**
   * ZERO-ALLOCATION drain — copy up to `maxCount` drained tokens into the
   * caller-owned `sink` (reused scratch), starting at index 0, and return the
   * count written. Allocates nothing: the host owns and reuses `sink`. `maxCount`
   * defaults to the current occupancy; the actual count is clamped to both the
   * occupancy AND `sink.length` (a sink shorter than the request drains only what
   * fits, leaving the rest buffered — never an out-of-bounds write). Only indices
   * `[0, count)` of `sink` are written; the caller reads exactly that prefix.
   */
  drainInto(sink: T[], maxCount?: number): number;
  reset(): void;
  readonly occupancy: number;
  readonly generationRate: number;
  readonly consumptionRate: number;
  readonly isStalled: boolean;
  readonly length: number;
  readonly capacity: number;
}

interface TokenBufferConfig {
  readonly capacity?: number;
  readonly emaAlpha?: number;
  /**
   * Injected time source for rate estimation. Defaults to {@link systemClock}
   * (the declared entropy boundary); a test passes a {@link manualClock} so the
   * EMA rates become a deterministic function of the advances it makes.
   */
  readonly clock?: Clock;
}

function _make<T = string>(config?: TokenBufferConfig): TokenBufferShape<T> {
  const capacity = config?.capacity ?? 256;
  const alpha = config?.emaAlpha ?? 0.1;
  const clock = config?.clock ?? systemClock;

  // Ring buffer backing store
  const buffer: (T | undefined)[] = new Array(capacity);
  let head = 0; // next write position
  let tail = 0; // next read position
  let count = 0;

  // Rate estimation
  let genRate = 0; // tokens/sec EMA
  let consumeRate = 0;
  let lastPushTime = 0;
  let lastDrainTime = 0;

  function now(): number {
    return clock.now();
  }

  /**
   * The zero-allocation drain core — copy up to `maxCount` drained tokens into
   * the caller-owned `sink` and return the count written. Closure-scoped (not a
   * method) so both `drainInto` and `drain` call it WITHOUT a `this` binding —
   * a destructured `{ drain }` stays correct.
   */
  function drainInto(sink: T[], maxCount?: number): number {
    const requested = maxCount ?? count;
    const drainSize = Math.min(requested, count, sink.length);
    if (drainSize === 0) return 0;

    // EMA consumption-rate update (the drained count over the inter-drain dt).
    const t = now();
    if (lastDrainTime > 0) {
      const dt = (t - lastDrainTime) / 1000;
      if (dt > 0) {
        const instantRate = drainSize / dt;
        consumeRate = consumeRate === 0 ? instantRate : consumeRate * (1 - alpha) + instantRate * alpha;
      }
    }
    lastDrainTime = t;

    for (let i = 0; i < drainSize; i++) {
      sink[i] = buffer[tail]!;
      buffer[tail] = undefined;
      tail = (tail + 1) % capacity;
      count--;
    }
    return drainSize;
  }

  return {
    push(token: T): void {
      const t = now();
      if (lastPushTime > 0) {
        const dt = (t - lastPushTime) / 1000;
        if (dt > 0) {
          const instantRate = 1 / dt;
          genRate = genRate === 0 ? instantRate : genRate * (1 - alpha) + instantRate * alpha;
        }
      }
      lastPushTime = t;

      if (count < capacity) {
        buffer[head] = token;
        head = (head + 1) % capacity;
        count++;
      } else {
        // Overflow: overwrite oldest (drop tail)
        buffer[head] = token;
        head = (head + 1) % capacity;
        tail = (tail + 1) % capacity;
      }
    },

    drainInto,

    drain(maxCount?: number): T[] {
      const max = maxCount ?? count;
      const drainSize = Math.min(max, count);
      if (drainSize === 0) return [];
      // Allocate the owned return array ONCE at its exact size, then fill it via
      // the zero-alloc primitive — the single array allocation is the convenience
      // accessor's inherent cost (callers wanting zero alloc use drainInto).
      const result: T[] = new Array<T>(drainSize);
      drainInto(result, drainSize);
      return result;
    },

    reset(): void {
      head = 0;
      tail = 0;
      count = 0;
      genRate = 0;
      consumeRate = 0;
      lastPushTime = 0;
      lastDrainTime = 0;
      buffer.fill(undefined);
    },

    get occupancy(): number {
      return count / capacity;
    },

    get generationRate(): number {
      return genRate;
    },

    get consumptionRate(): number {
      return consumeRate;
    },

    get isStalled(): boolean {
      return count === 0 && genRate > 0 && genRate < consumeRate;
    },

    get length(): number {
      return count;
    },

    get capacity(): number {
      return capacity;
    },
  };
}

/**
 * TokenBuffer — ring buffer that absorbs bursty LLM token arrival and hands
 * tokens out at a smooth cadence. The `push` + `drainInto` path is genuinely
 * zero-allocation (measured, pinned); `drain` is the allocating convenience.
 * Reports stall via `isStalled` and rate via an internal EMA.
 */
export const TokenBuffer = {
  /** Build a new buffer — pass capacity or reuse defaults. */
  make: _make,
};

export declare namespace TokenBuffer {
  /** Structural shape of a token buffer: `push`, `drain`, `reset`, stall/rate accessors. */
  export type Shape<T = string> = TokenBufferShape<T>;
  /** Configuration accepted by {@link TokenBuffer.make}. */
  export type Config = TokenBufferConfig;
}
