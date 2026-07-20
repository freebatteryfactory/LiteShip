/**
 * `LiveCell<K, T>` — bridge between protocol envelope and reactive runtime.
 *
 * A LiveCell is a {@link Cell} that also carries a {@link CellEnvelope}, tracking
 * its kind, content address, metadata (HLC timestamps, version), and boundary
 * crossings.
 *
 * A transport swap onto the Effect-free substrate (Wave 6, migrated ATOMICALLY
 * with Cell — scar S2.3/S2.4):
 *  - the value channel is a plain {@link Cell} (`{all}` + `'deferred'`), so
 *    `changes`/`get` collapse to `subscribe`/`read`;
 *  - the crossings channel is a `CellKernel.fanout` — the no-replay channel the
 *    kernel was built for (a late subscriber misses prior crossings);
 *  - the five `Ref` holders (version/created/updated/id/prevState) become plain
 *    closures; the managed HLC is an `HLC.makeClock` handle over the injected core
 *    {@link Clock} (default {@link wallClock}), so the envelope + crossing
 *    timestamps are a pure function of the op-sequence when a manual/fixed clock is
 *    passed — LiveCell never reaches for the ambient wall-clock singleton;
 *  - `computeId` is the CUT identity law — `fnv1aBytes(CanonicalCbor.encode(...))`
 *    — kept VERBATIM (never the sha256 receipt byte-law); envelope assembly and
 *    `Boundary.evaluate`/`evaluateWithHysteresis` are byte-identical.
 *
 * S2.3 ATOMICITY — the interleave gap is CLOSED: `set`/`update` record the
 * mutation (version + HLC + id + boundary state) BEFORE the value fans out, so a
 * subscriber that reads `envelope()` from within its own value delivery observes
 * the already-consistent envelope. There is no observable gap where the value has
 * advanced but the envelope has not.
 *
 * S2.3b NESTED-COMMIT SERIALIZATION — a commit is ONE atomic unit
 * (`recordMutation` + value fan-out + crossing fan-out). A commit issued
 * REENTRANTLY — a value/crossing subscriber of an in-flight commit calls
 * `set`/`update` again — is enqueued and run only AFTER the active commit fully
 * unwinds. Without this, only the Cell's value fan-out was deferred (kernel
 * `'deferred'`); the surrounding `recordMutation` + crossing publish ran
 * synchronously inside the nested call, so an outer A→B whose subscriber writes
 * B→C published the B→C crossing BEFORE A→B (reversed history) and let the A→B
 * subscriber read the already-advanced (C) envelope. Serializing the whole unit
 * (a re-entrancy guard + FIFO drain, realized synchronously — no microtask) makes
 * crossings publish in commit order and every subscriber read the envelope that
 * matches the value it is being delivered.
 *
 * @module
 */

import type { Cell } from './cell.js';
import { createCell } from './cell.js';
import { CellKernel } from './cell-kernel.js';
import { Lifetime } from './lifetime.js';
import type { CellKind, CellMeta, CellEnvelope } from '../schema/protocol.js';
import type { ContentAddress } from '../schema/brands.js';
import { StateName as mkStateName } from '../schema/brands.js';
import type { BoundaryCrossing } from '../internal/type-level.js';
import { HLC } from '../clock/hlc.js';
import { fnv1aBytes } from '../internal/fnv.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { Boundary } from '../authoring/boundary.js';
import { wallClock, type Clock } from '../clock/clock.js';

/** The no-replay crossings channel — a late subscriber misses prior crossings. */
type CrossingsChannel = Pick<CellKernel.Fanout<BoundaryCrossing<string>>, 'subscribe'>;

interface LiveCellShape<K extends CellKind, T> extends Omit<Cell<T>, '_tag'> {
  readonly _tag: 'LiveCell';
  /** The current protocol envelope — a synchronous snapshot (was the Effect `envelope`). */
  envelope(): CellEnvelope<K, T>;
  /** Subscribe to boundary crossings on the no-replay fan-out channel (was the `crossings` Stream). */
  readonly crossings: CrossingsChannel;
  readonly kind: K;
  /** Publish a boundary crossing onto the no-replay crossings channel (was the Effect). */
  publishCrossing(crossing: BoundaryCrossing<string>): void;
}

/**
 * The shared envelope-bookkeeping core: a wrapped value {@link Cell}, a crossings
 * fan-out kernel, and the closure-held envelope fields advanced atomically on each
 * mutation. `recordMutation` bumps version + HLC + id BEFORE the caller fans the
 * value out (the S2.3 gap closure).
 */
function makeCore<K extends CellKind, T>(kind: K, initial: T, nodeId: string, clock: Clock) {
  const cell = createCell(initial);
  const crossings = CellKernel.fanout<BoundaryCrossing<string>>();

  // Managed HLC over the INJECTED core Clock (the clock.ts cake-and-eat-it law):
  // `makeClock`'s first tick mints `created` (byte-identical to the old build-time
  // `HLC.increment(HLC.create(nodeId), clock.now())`). Passing a manual/fixed clock
  // makes the envelope + crossing timestamps a pure function of the op-sequence
  // (deterministic replay); the default wallClock preserves the epoch-ms `wall_ms`.
  const hlcClock = HLC.makeClock(nodeId, clock);
  const created: HLC = hlcClock.tick();
  let updated: HLC = created;
  let version = 1;

  // CUT live-cell — the envelope id is a content-address IDENTITY (auto-invalidates
  // when the value changes), minted through the ONE canonical encoder (CanonicalCbor
  // → fnv1a). It is NOT a receipt digest: LiveCell is never signed, chained, or
  // persisted, so it must not borrow the sha256 receipt byte law (typed-ref).
  const computeId = (value: T): ContentAddress => fnv1aBytes(CanonicalCbor.encode({ kind, value }));
  let id: ContentAddress = computeId(initial);

  const tick = (): HLC => hlcClock.tick();

  /** Advance version + HLC + id (the envelope) — called BEFORE the value fan-out. */
  const recordMutation = (value: T): HLC => {
    const stamp = tick();
    updated = stamp;
    version += 1;
    id = computeId(value);
    return stamp;
  };

  const lifetime = Lifetime.make();
  lifetime.add(() => crossings.close());
  lifetime.add(() => cell.lifetime.dispose());

  const envelope = (): CellEnvelope<K, T> => {
    const meta: CellMeta = { created, updated, version };
    return { kind, id, meta, value: cell.read() };
  };

  return { cell, crossings, recordMutation, envelope, lifetime };
}

/**
 * Serialize LiveCell commits into one atomic unit (S2.3b). A commit issued
 * reentrantly — from within a value/crossing subscriber of the in-flight commit —
 * is enqueued and run AFTER the active commit fully unwinds (its `recordMutation`,
 * value fan-out, and crossing fan-out all complete first). Mirrors the kernel's
 * deferred re-entrancy — a guard + FIFO drain, realized SYNCHRONOUSLY (no
 * microtask). A `run` that throws mid-drain clears the queue and releases the guard
 * (fail-fast, matching the kernel), so one faulty commit cannot wedge the cell.
 *
 * The queue holds OPERATIONS `(current: T) => T`, never pre-computed values, and
 * `run` applies each against the cell's state AT DRAIN TIME. This is the fix for a
 * lost-update hazard: an `update(f)` whose `f` was evaluated eagerly against
 * `cell.read()` at CALL time would, when it and a sibling reentrant `update` both
 * fire during the same in-flight commit, read the same pre-drain value and clobber
 * each other (two `+1` updates landing 2, not 3). Deferring `f`'s evaluation to the
 * drain — where the prior queued operation's `cell.set` has already landed — makes
 * a relative update compose on the freshest value. A `set(v)` enqueues the constant
 * operation `() => v`, so an absolute write still ignores intervening state.
 */
function serializedCommit<T>(run: (op: (current: T) => T) => void): (op: (current: T) => T) => void {
  let committing = false;
  const queue: Array<(current: T) => T> = [];
  return (op: (current: T) => T): void => {
    if (committing) {
      queue.push(op);
      return;
    }
    committing = true;
    try {
      run(op);
      // The queue holds operation closures (always truthy), so `shift()!` only
      // narrows away the empty-array `undefined` the `queue.length > 0` guard has
      // already excluded — there is no in-band sentinel to confuse with a real entry.
      while (queue.length > 0) {
        run(queue.shift()!);
      }
    } finally {
      committing = false;
      queue.length = 0;
    }
  };
}

function _make<K extends CellKind, T>(kind: K, initial: T, clock: Clock = wallClock): LiveCellShape<K, T> {
  const core = makeCore(kind, initial, `live-cell-${kind}`, clock);
  const { cell, crossings, recordMutation, envelope, lifetime } = core;

  const commit = serializedCommit<T>((op) => {
    // Once the lifetime is disposed the value kernel is closed and `cell.set` is inert, so
    // advancing the envelope (recordMutation bumps version/id/HLC) would leave the content-
    // addressed `id` describing a value `read()` never returns — an envelope/value divergence
    // that also drifts the version unbounded on repeated post-dispose writes. Fully inert.
    if (lifetime.disposed) return;
    const value = op(cell.read());
    recordMutation(value);
    cell.set(value);
  });

  return {
    _tag: 'LiveCell',
    read: () => cell.read(),
    set: (value: T) => commit(() => value),
    update: (f: (current: T) => T) => commit(f),
    subscribe: (subscriber) => cell.subscribe(subscriber),
    lifetime,
    kind,
    crossings: { subscribe: (subscriber) => crossings.subscribe(subscriber) },
    publishCrossing: (crossing: BoundaryCrossing<string>) => crossings.publish(crossing),
    envelope,
  };
}

/**
 * Create a boundary-kind LiveCell that automatically publishes crossings when the
 * numeric value transitions between boundary states.
 */
function _makeBoundary<I extends string, S extends readonly [string, ...string[]]>(
  boundary: Boundary<I, S>,
  initial: number,
  clock: Clock = wallClock,
): LiveCellShape<'boundary', number> {
  const kind = 'boundary' as const;
  const core = makeCore(kind, initial, 'live-cell-boundary', clock);
  const { cell, crossings, recordMutation, envelope, lifetime } = core;

  let prevState: string = Boundary.evaluate(boundary, initial);

  // Commit the value AND record the mutation in one atomic unit, no observable gap
  // (S2.3): bump the envelope (via recordMutation) and evaluate the crossing FIRST,
  // then fan the value out (a value subscriber that reads `envelope()` sees the
  // already-consistent envelope), then fan the crossing out. Wrapped in
  // {@link serializedCommit} (S2.3b) so a nested write from within a value/crossing
  // subscriber runs only AFTER this whole unit unwinds — crossings then publish in
  // commit order (A→B before B→C), never reversed.
  const commit = serializedCommit<number>((op) => {
    // Disposed → the value kernel is closed and `cell.set` is inert; advancing the envelope
    // (recordMutation) or `prevState` would diverge the content-addressed `id`/crossing
    // baseline from the frozen `read()`. Stop the commit so a post-dispose write is inert.
    if (lifetime.disposed) return;
    const value = op(cell.read());
    const stamp = recordMutation(value);
    const from = prevState;
    const to: string = Boundary.evaluateWithHysteresis(boundary, value, from);
    const crossed = to !== from;
    if (crossed) prevState = to;
    // The mutation is already committed (envelope bumped, `prevState` advanced to `to`), so
    // the crossing edge MUST be published even if a value subscriber throws during the value
    // fan-out — otherwise a downstream crossing consumer permanently misses this edge and no
    // later write can reconstruct it (`prevState` already reflects the new state). Attempt
    // BOTH fan-outs, then rethrow the FIRST fault (the value fault takes precedence) so the
    // listener error still surfaces — the same advance-all-channels law the CellKernel /
    // quantizer commit paths follow.
    let fault: { readonly error: unknown } | undefined;
    try {
      cell.set(value);
    } catch (error) {
      fault = { error };
    }
    if (crossed) {
      try {
        crossings.publish({ from: mkStateName(from), to: mkStateName(to), timestamp: stamp, value });
      } catch (error) {
        if (fault === undefined) fault = { error };
      }
    }
    if (fault !== undefined) throw fault.error;
  });

  return {
    _tag: 'LiveCell',
    read: () => cell.read(),
    set: (value: number) => commit(() => value),
    update: (f: (current: number) => number) => commit(f),
    subscribe: (subscriber) => cell.subscribe(subscriber),
    lifetime,
    kind,
    crossings: { subscribe: (subscriber) => crossings.subscribe(subscriber) },
    publishCrossing: (crossing: BoundaryCrossing<string>) => crossings.publish(crossing),
    envelope,
  };
}

/**
 * LiveCell — bridge between the {@link Cell} reactive graph and the wire
 * protocol. A `LiveCell` wraps a `Cell` with a typed {@link CellEnvelope} — kind,
 * content address, HLC, boundary crossings — so primitives can travel between
 * peers as self-describing messages.
 */
export const LiveCell = {
  /**
   * Wrap an arbitrary value in a {@link LiveCell} with freshly minted identity + HLC.
   * `clock` (default {@link wallClock}) is the injected time source for the envelope
   * HLC — pass a `manualClock`/`fixedClock` for deterministic replay.
   */
  make: _make,
  /**
   * Specialized factory for boundary crossings so the envelope captures crossing
   * metadata. `clock` (default {@link wallClock}) is the injected time source for the
   * envelope HLC and crossing timestamps — pass a manual/fixed clock for determinism.
   */
  makeBoundary: _makeBoundary,
};

/** Public structural type for `LiveCell`. */
export type LiveCell<K extends CellKind, T> = LiveCellShape<K, T>;
