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
 *    closures; the managed HLC is the pure `HLC.create`/`HLC.increment` ops read
 *    against the injected {@link wallClock} (`hlc.ts` untouched this slice);
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
 * @module
 */

import { Cell } from './cell.js';
import { CellKernel } from './cell-kernel.js';
import { Lifetime } from './lifetime.js';
import type { CellKind, CellMeta, CellEnvelope } from './protocol.js';
import type { ContentAddress } from './brands.js';
import { StateName as mkStateName } from './brands.js';
import type { BoundaryCrossing } from './type-utils.js';
import { HLC } from './hlc.js';
import { fnv1aBytes } from './fnv.js';
import { CanonicalCbor } from './cbor.js';
import { Boundary } from './boundary.js';
import { wallClock } from './clock.js';

/** The no-replay crossings channel — a late subscriber misses prior crossings. */
type CrossingsChannel = Pick<CellKernel.Fanout<BoundaryCrossing<string>>, 'subscribe'>;

interface LiveCellShape<K extends CellKind, T> extends Omit<Cell.Shape<T>, '_tag'> {
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
function makeCore<K extends CellKind, T>(kind: K, initial: T, nodeId: string) {
  const cell = Cell.make(initial);
  const crossings = CellKernel.fanout<BoundaryCrossing<string>>();

  // Managed HLC via the pure ops + the injected wall clock (hlc.ts untouched this
  // slice). The first tick mints `created` (matching the old `HLC.tick` at build).
  let hlc: HLC.Shape = HLC.increment(HLC.create(nodeId), wallClock.now());
  const created: HLC.Shape = hlc;
  let updated: HLC.Shape = hlc;
  let version = 1;

  // CUT live-cell — the envelope id is a content-address IDENTITY (auto-invalidates
  // when the value changes), minted through the ONE canonical encoder (CanonicalCbor
  // → fnv1a). It is NOT a receipt digest: LiveCell is never signed, chained, or
  // persisted, so it must not borrow the sha256 receipt byte law (typed-ref).
  const computeId = (value: T): ContentAddress => fnv1aBytes(CanonicalCbor.encode({ kind, value }));
  let id: ContentAddress = computeId(initial);

  const tick = (): HLC.Shape => {
    hlc = HLC.increment(hlc, wallClock.now());
    return hlc;
  };

  /** Advance version + HLC + id (the envelope) — called BEFORE the value fan-out. */
  const recordMutation = (value: T): HLC.Shape => {
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

function _make<K extends CellKind, T>(kind: K, initial: T): LiveCellShape<K, T> {
  const core = makeCore(kind, initial, `live-cell-${kind}`);
  const { cell, crossings, recordMutation, envelope, lifetime } = core;

  const commit = (value: T): void => {
    recordMutation(value);
    cell.set(value);
  };

  return {
    _tag: 'LiveCell',
    read: () => cell.read(),
    set: (value: T) => commit(value),
    update: (f: (current: T) => T) => commit(f(cell.read())),
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
  boundary: Boundary.Shape<I, S>,
  initial: number,
): LiveCellShape<'boundary', number> {
  const kind = 'boundary' as const;
  const core = makeCore(kind, initial, 'live-cell-boundary');
  const { cell, crossings, recordMutation, envelope, lifetime } = core;

  let prevState: string = Boundary.evaluate(boundary, initial);

  // Commit the value AND record the mutation in one synchronous pass, no
  // observable gap (S2.3): bump the envelope (via recordMutation) and evaluate the
  // crossing FIRST, then fan the value out (a value subscriber that reads
  // `envelope()` sees the already-consistent envelope), then fan the crossing out.
  const commit = (value: number): void => {
    const stamp = recordMutation(value);
    const from = prevState;
    const to: string = Boundary.evaluateWithHysteresis(boundary, value, from);
    const crossed = to !== from;
    if (crossed) prevState = to;
    cell.set(value);
    if (crossed) {
      crossings.publish({ from: mkStateName(from), to: mkStateName(to), timestamp: stamp, value });
    }
  };

  return {
    _tag: 'LiveCell',
    read: () => cell.read(),
    set: (value: number) => commit(value),
    update: (f: (current: number) => number) => commit(f(cell.read())),
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
  /** Wrap an arbitrary value in a {@link LiveCell} with freshly minted identity + HLC. */
  make: _make,
  /** Specialized factory for boundary crossings so the envelope captures crossing metadata. */
  makeBoundary: _makeBoundary,
};

export declare namespace LiveCell {
  /** Structural shape of a {@link LiveCell} parameterized by cell kind `K` and value type `T`. */
  export type Shape<K extends CellKind, T> = LiveCellShape<K, T>;
}
