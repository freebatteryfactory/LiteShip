/**
 * HLC -- Hybrid Logical Clock.
 *
 * Pure functions + a plain (Effect-free) managed clock over the injected core
 * {@link Clock} (Wave 6). The pure kernel (`create`/`compare`/`increment`/`merge`/
 * `encode`/`decode`) is byte-identical — untouched by the clock-injection swap.
 *
 * @module
 */

import { InvariantViolationError, ParseError } from '@liteship/error';
import { wallClock, type Clock } from './clock.js';

// Hybrid Logical Clock: physical wall-clock + logical counter for causal ordering. DagPosition encodes (timestamp, counter, nodeId) for DAG vertex identity.

interface HLCShape {
  readonly wall_ms: number;
  readonly counter: number;
  readonly node_id: string;
}

/**
 * Create a new HLC timestamp initialized to zero for the given node.
 *
 * @example
 * ```ts
 * const hlc = HLC.create('node-1');
 * // hlc === { wall_ms: 0, counter: 0, node_id: 'node-1' }
 * ```
 */
const _create = (nodeId: string): HLCShape => ({
  wall_ms: 0,
  counter: 0,
  node_id: nodeId,
});

/**
 * Compare two HLC timestamps. Returns -1, 0, or 1.
 *
 * Compares wall_ms first, then counter, then node_id lexicographically.
 *
 * @example
 * ```ts
 * const a = HLC.create('node-1');
 * const b = HLC.increment(a, 1000);
 * const cmp = HLC.compare(a, b);
 * // cmp === -1 (a is before b)
 * ```
 */
export const compare = (a: HLCShape, b: HLCShape): -1 | 0 | 1 => {
  if (a.wall_ms < b.wall_ms) return -1;
  if (a.wall_ms > b.wall_ms) return 1;
  if (a.counter < b.counter) return -1;
  if (a.counter > b.counter) return 1;
  if (a.node_id < b.node_id) return -1;
  if (a.node_id > b.node_id) return 1;
  return 0;
};

// 16-bit counter — supports 65535 events per ms before overflow
const MAX_COUNTER = 0xffff;

/**
 * Increment an HLC for a local event.
 *
 * Advances wall_ms to max(current, now) and bumps the counter if the wall
 * time didn't advance. Throws on counter overflow (`> 0xFFFF`).
 *
 * @example
 * ```ts
 * const hlc0 = HLC.create('node-1');
 * const hlc1 = HLC.increment(hlc0, Date.now());
 * // hlc1.wall_ms >= hlc0.wall_ms
 * ```
 */
const _increment = (hlc: HLCShape, now: number = 0): HLCShape => {
  const newWallMs = Math.max(hlc.wall_ms, now);
  if (newWallMs === hlc.wall_ms) {
    const next = hlc.counter + 1;
    if (next > MAX_COUNTER)
      throw InvariantViolationError(
        'hlc.counter',
        `HLC counter overflow: exceeded ${MAX_COUNTER} (>65535 events in 1ms — consider batching or increasing clock resolution)`,
      );
    return { wall_ms: newWallMs, counter: next, node_id: hlc.node_id };
  }
  return { wall_ms: newWallMs, counter: 0, node_id: hlc.node_id };
};

/**
 * Merge a local HLC with a remote HLC on message receive.
 *
 * Takes the max of local, remote, and now for wall_ms, then adjusts the
 * counter accordingly. Preserves the local node_id.
 *
 * Lamport causality: if wall clocks agree, increment the higher counter to preserve
 * happened-before ordering. Reset counter only when wall clock advances (new causal epoch).
 *
 * @example
 * ```ts
 * const local = HLC.increment(HLC.create('A'), 1000);
 * const remote = HLC.increment(HLC.create('B'), 2000);
 * const merged = HLC.merge(local, remote, 1500);
 * // merged.wall_ms === 2000, merged.node_id === 'A'
 * ```
 */
const _merge = (local: HLCShape, remote: HLCShape, now: number = 0): HLCShape => {
  const newWallMs = Math.max(local.wall_ms, remote.wall_ms, now);
  let newCounter: number;
  if (newWallMs === local.wall_ms && newWallMs === remote.wall_ms) {
    newCounter = Math.max(local.counter, remote.counter) + 1;
  } else if (newWallMs === local.wall_ms) {
    newCounter = local.counter + 1;
  } else if (newWallMs === remote.wall_ms) {
    newCounter = remote.counter + 1;
  } else {
    newCounter = 0;
  }
  if (newCounter > MAX_COUNTER)
    throw InvariantViolationError(
      'hlc.counter',
      `HLC counter overflow: exceeded ${MAX_COUNTER} (>65535 events in 1ms — consider batching or increasing clock resolution)`,
    );
  return { wall_ms: newWallMs, counter: newCounter, node_id: local.node_id };
};

/**
 * Encode an HLC timestamp to a colon-separated hex string.
 *
 * Format: `{wall_ms_hex_12}:{counter_hex_4}:{node_id}`
 *
 * @example
 * ```ts
 * const hlc = HLC.increment(HLC.create('node-1'), 1000);
 * const encoded = HLC.encode(hlc);
 * // encoded === '0000000003e8:0000:node-1'
 * ```
 */
const _encode = (hlc: HLCShape): string => {
  // 12 hex digits = 48-bit wall clock (good to year 10889), 4 hex = 16-bit counter
  const wallHex = hlc.wall_ms.toString(16).padStart(12, '0');
  const counterHex = hlc.counter.toString(16).padStart(4, '0');
  return `${wallHex}:${counterHex}:${hlc.node_id}`;
};

/**
 * Decode an HLC timestamp from a colon-separated hex string.
 *
 * Inverse of `encode`. Supports node IDs containing colons.
 *
 * @example
 * ```ts
 * const hlc = HLC.decode('0000000003e8:0000:node-1');
 * // hlc === { wall_ms: 1000, counter: 0, node_id: 'node-1' }
 * ```
 */
const _decode = (s: string): HLCShape => {
  const parts = s.split(':');
  if (parts.length < 3)
    throw ParseError('hlc', `expected at least 3 colon-separated parts, got "${s}"`, { code: 'malformed' });
  const wall_ms = parseInt(parts[0]!, 16);
  const counter = parseInt(parts[1]!, 16);
  const node_id = parts.slice(2).join(':');
  if (isNaN(wall_ms)) throw ParseError('hlc', `wall_ms is not valid hex in "${s}"`, { code: 'malformed' });
  if (isNaN(counter)) throw ParseError('hlc', `counter is not valid hex in "${s}"`, { code: 'malformed' });
  return { wall_ms, counter, node_id };
};

/**
 * A managed HLC clock handle — a plain, Effect-free mutable holder over the pure
 * {@link _increment}/{@link _merge} ops. It reads wall time through an injected
 * core {@link Clock} (default {@link wallClock} = epoch ms, the HLC `wall_ms`
 * entropy boundary): `tick`/`receive` advance the closure-held timestamp in place
 * and return it; `current` reads it WITHOUT advancing. No `Effect`/`Ref`.
 */
export interface HLCClock {
  /** Advance for a local event — `max(current wall, clock.now())`, bumping the counter on a tie. */
  tick(): HLCShape;
  /** Merge a remote timestamp into the clock (Lamport causality), returning the new value. */
  receive(remote: HLCShape): HLCShape;
  /** Read the current timestamp WITHOUT advancing it. */
  current(): HLCShape;
}

/**
 * Create a managed HLC clock over an injected {@link Clock} (default
 * {@link wallClock}). Returns a plain {@link HLCClock} handle — no `Effect`.
 *
 * @example
 * ```ts
 * const clock = HLC.makeClock('node-1');
 * const ts = clock.tick();
 * // ts.wall_ms === Date.now() (approximately) under the default wallClock
 * ```
 */
export const makeClock = (nodeId: string, clock: Clock = wallClock): HLCClock => {
  let hlc: HLCShape = _create(nodeId);
  return {
    tick: (): HLCShape => (hlc = _increment(hlc, clock.now())),
    receive: (remote: HLCShape): HLCShape => (hlc = _merge(hlc, remote, clock.now())),
    current: (): HLCShape => hlc,
  };
};

/**
 * HLC namespace -- Hybrid Logical Clock.
 *
 * Pure functions for creating, comparing, incrementing, and merging HLC
 * timestamps, plus a plain (Effect-free) managed-clock factory
 * ({@link makeClock} → an {@link HLCClock} handle with `tick`/`receive`/`current`).
 * Encodes to/from a deterministic colon-separated hex string format.
 *
 * @example
 * ```ts
 * import { HLC } from '@liteship/core';
 *
 * const a = HLC.increment(HLC.create('A'), Date.now());
 * const b = HLC.increment(HLC.create('B'), Date.now());
 * const merged = HLC.merge(a, b, Date.now());
 * const encoded = HLC.encode(merged);
 * const decoded = HLC.decode(encoded);
 *
 * const clock = HLC.makeClock('A'); // reads wallClock by default
 * const ts = clock.tick();
 * ```
 */
export const HLC = {
  create: _create,
  compare,
  increment: _increment,
  merge: _merge,
  encode: _encode,
  decode: _decode,
  makeClock,
};

export declare namespace HLC {
  /** Structural shape of a hybrid logical clock timestamp: `{ wall_ms, counter, node_id }`. */
  export type Shape = HLCShape;
  /** A managed HLC clock handle (`tick`/`receive`/`current`) — see {@link HLCClock}. */
  export type Clock = HLCClock;
}
