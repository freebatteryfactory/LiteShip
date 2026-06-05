/**
 * `LiveCell<K, T>` — bridge between protocol envelope and reactive runtime.
 *
 * A LiveCell is a Cell that also carries a CellEnvelope, tracking
 * its kind, content address, metadata (HLC timestamps, version),
 * and boundary crossings.
 *
 * @module
 */

import type { Scope } from 'effect';
import { Effect, Stream, PubSub, Ref } from 'effect';
import { Cell } from './cell.js';
import type { CellKind, CellMeta, CellEnvelope } from './protocol.js';
import type { ContentAddress, HLC as HLCBrand } from './brands.js';
import { StateName as mkStateName } from './brands.js';
import type { BoundaryCrossing } from './type-utils.js';
import { HLC } from './hlc.js';
import { fnv1aBytes } from './fnv.js';
import { CanonicalCbor } from './cbor.js';
import { Boundary } from './boundary.js';

interface LiveCellShape<K extends CellKind, T> extends Omit<Cell.Shape<T>, '_tag'> {
  readonly _tag: 'LiveCell';
  readonly envelope: Effect.Effect<CellEnvelope<K, T>>;
  readonly crossings: Stream.Stream<BoundaryCrossing<string>>;
  readonly kind: K;
  publishCrossing(crossing: BoundaryCrossing<string>): Effect.Effect<void>;
}

function _make<K extends CellKind, T>(kind: K, initial: T): Effect.Effect<LiveCellShape<K, T>, never, Scope.Scope> {
  return Effect.gen(function* () {
    const cell = yield* Cell.make(initial);
    const clockRef = yield* HLC.makeClock(`live-cell-${kind}`);
    const createdHlc = yield* HLC.tick(clockRef);
    const versionRef = yield* Ref.make(1);
    const crossingPub = yield* PubSub.unbounded<BoundaryCrossing<string>>();
    const createdRef = yield* Ref.make<HLCBrand>(createdHlc);
    const updatedRef = yield* Ref.make<HLCBrand>(createdHlc);

    // CUT live-cell — the envelope id is a content-address IDENTITY (auto-invalidates
    // when the value changes), minted through the ONE canonical encoder (CanonicalCbor
    // → fnv1a). It is NOT a receipt digest: LiveCell is never signed, chained, or
    // persisted, so it must not borrow the sha256 receipt byte law (typed-ref).
    const computeId = (value: T): Effect.Effect<ContentAddress> =>
      Effect.sync(() => fnv1aBytes(CanonicalCbor.encode({ kind, value })));

    const initialId = yield* computeId(initial);
    const idRef = yield* Ref.make<ContentAddress>(initialId);

    const recordMutation = (value: T): Effect.Effect<void> =>
      Effect.gen(function* () {
        const hlc = yield* HLC.tick(clockRef);
        yield* Ref.set(updatedRef, hlc);
        yield* Ref.update(versionRef, (v) => v + 1);
        const newId = yield* computeId(value);
        yield* Ref.set(idRef, newId);
      });

    const liveCell: LiveCellShape<K, T> = {
      _tag: 'LiveCell' as const,
      ref: cell.ref,
      changes: cell.changes,
      get: cell.get,
      set: (value: T) =>
        Effect.gen(function* () {
          yield* cell.set(value);
          yield* recordMutation(value);
        }),
      update: (f: (current: T) => T) =>
        Effect.gen(function* () {
          const current = yield* cell.get;
          const next = f(current);
          yield* cell.set(next);
          yield* recordMutation(next);
        }),
      kind,
      crossings: Stream.fromPubSub(crossingPub),
      publishCrossing: (crossing: BoundaryCrossing<string>) => PubSub.publish(crossingPub, crossing),
      envelope: Effect.gen(function* () {
        const value = yield* cell.get;
        const created = yield* Ref.get(createdRef);
        const updated = yield* Ref.get(updatedRef);
        const version = yield* Ref.get(versionRef);
        const id = yield* Ref.get(idRef);

        const meta: CellMeta = { created, updated, version };
        const envelope: CellEnvelope<K, T> = { kind, id, meta, value };
        return envelope;
      }),
    };

    return liveCell;
  });
}

/**
 * Create a boundary-kind LiveCell that automatically publishes crossings
 * when the numeric value transitions between boundary states.
 */
function _makeBoundary<I extends string, S extends readonly [string, ...string[]]>(
  boundary: Boundary.Shape<I, S>,
  initial: number,
): Effect.Effect<LiveCellShape<'boundary', number>, never, Scope.Scope> {
  return Effect.gen(function* () {
    const cell = yield* Cell.make(initial);
    const clockRef = yield* HLC.makeClock(`live-cell-boundary`);
    const createdHlc = yield* HLC.tick(clockRef);
    const versionRef = yield* Ref.make(1);
    const crossingPub = yield* PubSub.unbounded<BoundaryCrossing<string>>();
    const createdRef = yield* Ref.make<HLCBrand>(createdHlc);
    const updatedRef = yield* Ref.make<HLCBrand>(createdHlc);
    const kind = 'boundary' as const;

    // CUT live-cell — fnv1a IDENTITY (CanonicalCbor), not a sha256 receipt digest. See _make.
    const computeId = (value: number): Effect.Effect<ContentAddress> =>
      Effect.sync(() => fnv1aBytes(CanonicalCbor.encode({ kind, value })));

    const initialId = yield* computeId(initial);
    const idRef = yield* Ref.make<ContentAddress>(initialId);

    const initialState: string = Boundary.evaluate(boundary, initial);
    const prevStateRef = yield* Ref.make(initialState);

    const recordMutation = (value: number): Effect.Effect<void> =>
      Effect.gen(function* () {
        const hlc = yield* HLC.tick(clockRef);
        yield* Ref.set(updatedRef, hlc);
        yield* Ref.update(versionRef, (v) => v + 1);
        const newId = yield* computeId(value);
        yield* Ref.set(idRef, newId);

        const prevState = yield* Ref.get(prevStateRef);
        const nextState: string = Boundary.evaluateWithHysteresis(boundary, value, prevState);
        if (nextState !== prevState) {
          yield* Ref.set(prevStateRef, nextState);
          yield* PubSub.publish(crossingPub, {
            from: mkStateName(prevState),
            to: mkStateName(nextState),
            timestamp: hlc,
            value,
          });
        }
      });

    const liveCell: LiveCellShape<'boundary', number> = {
      _tag: 'LiveCell' as const,
      ref: cell.ref,
      changes: cell.changes,
      get: cell.get,
      set: (value: number) =>
        Effect.gen(function* () {
          yield* cell.set(value);
          yield* recordMutation(value);
        }),
      update: (f: (current: number) => number) =>
        Effect.gen(function* () {
          const current = yield* cell.get;
          const next = f(current);
          yield* cell.set(next);
          yield* recordMutation(next);
        }),
      kind,
      crossings: Stream.fromPubSub(crossingPub),
      publishCrossing: (crossing: BoundaryCrossing<string>) => PubSub.publish(crossingPub, crossing),
      envelope: Effect.gen(function* () {
        const value = yield* cell.get;
        const created = yield* Ref.get(createdRef);
        const updated = yield* Ref.get(updatedRef);
        const version = yield* Ref.get(versionRef);
        const id = yield* Ref.get(idRef);

        const meta: CellMeta = { created, updated, version };
        const envelope: CellEnvelope<'boundary', number> = { kind, id, meta, value };
        return envelope;
      }),
    };

    return liveCell;
  });
}

/**
 * LiveCell — bridge between the {@link Cell} reactive graph and the wire
 * protocol. A `LiveCell` wraps a `Cell` with a typed {@link CellEnvelope} —
 * kind, content address, HLC, boundary crossings — so primitives can travel
 * between peers as self-describing messages.
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
