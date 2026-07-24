/**
 * reactive-trace — the closed operation-trace vocabulary the transition cage
 * speaks (Wave 5.5, `docs/plan/remaining-waves.md` §"operation-trace").
 *
 * ONE serializable vocabulary drives ANY reactive primitive and normalizes what
 * it does into ONE comparable {@link Observation}. The capture harness
 * (`reactive-capture.ts`) folds a {@link ReactiveOp} history over the CURRENT
 * Effect-backed Cell/Derived/Store/Signal/Timeline/LiveCell and records the
 * Observation; the (later) `fc.commands` model and differential oracle speak the
 * same vocabulary, so a model observation and an implementation observation are
 * compared byte-for-byte through this one shape.
 *
 * PURE + DETERMINISTIC by construction — no Effect, no clock, no I/O. A history
 * and an observation are plain frozen data (Axiom 1: meaning is data), so both
 * are CBOR-addressable via `@liteship/canonical` ({@link traceDigest} /
 * {@link observationDigest}). This is the S1.5.3 discipline made mechanical:
 * capture the history and its observation, never a live self-consistent
 * re-derivation.
 *
 * SCOPE NOTE — this file is the FORMAT only (types + builders + digest). It does
 * NOT run any primitive and imports NOTHING from `@liteship/core`, so it cannot
 * perturb reactive runtime behavior. The Wave 5.5 PRIME CONSTRAINT (zero runtime
 * semantic changes) holds by construction here.
 *
 * @module
 */

import { CanonicalCbor, fnv1aBytes } from '@liteship/canonical';
import type { ContentAddress } from '@liteship/canonical';

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/**
 * The closed value universe a trace carries. Every reactive primitive under
 * capture is driven with these JSON-stable scalars: Cell/Store/Signal/LiveCell
 * carry `number`; Timeline's `changes` channel carries the boundary state
 * `string`. `boolean`/`null` round out the universe so an observation is always
 * JSON- and CBOR-stable (a golden fixture re-serializes byte-identical).
 */
export type TraceValue = number | string | boolean | null;

/**
 * A data-encoded pure transform for the `update` op — meaning stays DATA, never
 * a closure (Axiom 1). The capture harness interprets it against the primitive's
 * current numeric value.
 */
export type UpdateTransform =
  | { readonly kind: 'add'; readonly n: number }
  | { readonly kind: 'mul'; readonly n: number }
  | { readonly kind: 'replace'; readonly n: number }
  | { readonly kind: 'identity' };

/** Apply an {@link UpdateTransform} to a numeric current value. Total + pure. */
export const applyTransform = (transform: UpdateTransform, current: number): number => {
  switch (transform.kind) {
    case 'add':
      return current + transform.n;
    case 'mul':
      return current * transform.n;
    case 'replace':
      return transform.n;
    case 'identity':
      return current;
  }
};

// ---------------------------------------------------------------------------
// Reactions — the data encoding of in-delivery behavior (nested write /
// subscribe-during-publish / unsubscribe-during-publish / listener failure).
// ---------------------------------------------------------------------------

/**
 * A one-shot rule a subscriber runs the FIRST time it is delivered `onValue`.
 * This is how the closed vocabulary encodes the four "during-delivery" behaviors
 * as DATA rather than as a live callback:
 *  - `set` — the delivery handler issues a nested write (behavior 4).
 *  - `subscribe` — the handler attaches a new subscriber mid-publish (behavior 5).
 *  - `unsubscribe` — the handler disposes another subscriber mid-publish (behavior 5).
 *  - `throw` — the handler fails (behavior 6: listener failure).
 */
export type ReactionSpec =
  | { readonly kind: 'set'; readonly onValue: TraceValue; readonly value: number }
  | { readonly kind: 'subscribe'; readonly onValue: TraceValue; readonly newSink: string }
  | { readonly kind: 'unsubscribe'; readonly onValue: TraceValue; readonly target: string }
  | { readonly kind: 'throw'; readonly onValue: TraceValue };

// ---------------------------------------------------------------------------
// Operations — the closed ReactiveOp union
// ---------------------------------------------------------------------------

/** Discriminant tags of {@link ReactiveOp} — the closed op vocabulary. */
export type ReactiveOpTag = ReactiveOp['_tag'];

/**
 * One reactive operation. The closed union both the capture harness and (later)
 * the derived `fc.commands` model fold. Names align with the plan's op list
 * (`subscribe`/`unsubscribe`/`read`/`set`/`update`/`publishCrossing`/`dispose`)
 * plus the Signal/Timeline control surface (`pause`/`resume`/`play`/`reverse`/
 * `scrub`/`tick`) needed to drive those two primitives through their PUBLIC
 * surface. A primitive that does not support an op declares so (see
 * `PrimitiveAdapter.supports`); a history that uses an unsupported op fails loud.
 */
export type ReactiveOp =
  /** Attach a named subscriber to the primary `changes` channel. */
  | { readonly _tag: 'subscribe'; readonly sink: string; readonly react?: readonly ReactionSpec[] }
  /** Dispose a named subscriber (call its Disposer / interrupt its fiber). */
  | { readonly _tag: 'unsubscribe'; readonly sink: string }
  /** Read the current replay-1 value (Cell.get / Signal.current / Timeline.state). */
  | { readonly _tag: 'read' }
  /** Primary write — Cell.set / Store.dispatch(replace) / Signal.seek / Timeline.seek / LiveCell.set. */
  | { readonly _tag: 'set'; readonly value: number }
  /** Functional write — Cell.update / LiveCell.update. */
  | { readonly _tag: 'update'; readonly transform: UpdateTransform }
  /** Signal.controllable / Timeline: pause the write/advance gate. */
  | { readonly _tag: 'pause' }
  /** Signal.controllable / Timeline: resume the write/advance gate. */
  | { readonly _tag: 'resume' }
  /** Timeline: start advancing on scheduler ticks. */
  | { readonly _tag: 'play' }
  /** Timeline: flip advance direction. */
  | { readonly _tag: 'reverse' }
  /** Timeline: set elapsed by progress fraction. */
  | { readonly _tag: 'scrub'; readonly progress: number }
  /** Advance the injected scheduler `count` frames (Timeline fixed-step step). */
  | { readonly _tag: 'tick'; readonly count: number }
  /** LiveCell: publish a boundary crossing onto the no-replay crossings channel. */
  | { readonly _tag: 'publishCrossing'; readonly from: string; readonly to: string; readonly value: number }
  /** Tear down the owning scope — cancels internal + subscriber fibers. */
  | { readonly _tag: 'dispose' };

/** A deterministic, replayable operation history. */
export type OpHistory = readonly ReactiveOp[];

// ---------------------------------------------------------------------------
// Op builders (ergonomic, still plain data)
// ---------------------------------------------------------------------------

/** Builders that keep corpus construction terse while emitting plain frozen ops. */
export const op = {
  subscribe: (sink: string, react?: readonly ReactionSpec[]): ReactiveOp =>
    react !== undefined ? { _tag: 'subscribe', sink, react } : { _tag: 'subscribe', sink },
  unsubscribe: (sink: string): ReactiveOp => ({ _tag: 'unsubscribe', sink }),
  read: (): ReactiveOp => ({ _tag: 'read' }),
  set: (value: number): ReactiveOp => ({ _tag: 'set', value }),
  update: (transform: UpdateTransform): ReactiveOp => ({ _tag: 'update', transform }),
  pause: (): ReactiveOp => ({ _tag: 'pause' }),
  resume: (): ReactiveOp => ({ _tag: 'resume' }),
  play: (): ReactiveOp => ({ _tag: 'play' }),
  reverse: (): ReactiveOp => ({ _tag: 'reverse' }),
  scrub: (progress: number): ReactiveOp => ({ _tag: 'scrub', progress }),
  tick: (count = 1): ReactiveOp => ({ _tag: 'tick', count }),
  publishCrossing: (from: string, to: string, value: number): ReactiveOp => ({
    _tag: 'publishCrossing',
    from,
    to,
    value,
  }),
  dispose: (): ReactiveOp => ({ _tag: 'dispose' }),
} as const;

// ---------------------------------------------------------------------------
// Observation — the normalized record every driver folds to
// ---------------------------------------------------------------------------

/** Per-subscriber delivery record — the ordered values one sink actually saw. */
export interface SubscriberObservation {
  readonly sink: string;
  /** Op index at which this subscriber attached. */
  readonly subscribedAtOp: number;
  /** The exact ordered sequence of values delivered to this sink. */
  readonly deliveries: readonly TraceValue[];
  /** The sink's changes fiber was interrupted by scope teardown (disposal). */
  readonly interruptedOnDispose: boolean;
  /** The sink's changes stream ended by itself (a completion signal, distinct from interruption). */
  readonly completed: boolean;
  /** The sink's delivery handler threw (listener failure) — and whether that killed its stream. */
  readonly errored: boolean;
}

/** A replay-1 read taken at a given op index. */
export interface ReadObservation {
  readonly atOp: number;
  readonly value: TraceValue;
}

/** A boundary crossing observed on the LiveCell no-replay crossings channel. */
export interface CrossingObservation {
  readonly from: string;
  readonly to: string;
  readonly value: number;
}

/**
 * The HLC byte-law fields — a STRUCTURAL mirror of `HLC` so this trace-type
 * module imports nothing from `@liteship/core` (see the module header).
 */
export interface HlcObservation {
  readonly wall_ms: number;
  readonly counter: number;
  readonly node_id: string;
}

/**
 * A LiveCell envelope snapshot taken after a mutation — the DETERMINISTIC byte-law
 * fields (version counter + fnv1a content-address id + the raw HLC). Since Wave 6's
 * clock injection the capture drives LiveCell with a `fixedClock(0)`, so the HLC
 * `wall_ms`/`counter` are a pure function of the op-sequence and pinned here as RAW
 * BYTES — superseding the pre-Wave-6 monotonicity-boolean workaround, which existed
 * only because the HLC then read the ambient `Date.now()`. The monotonicity boolean
 * {@link Observation.metaMonotonic} is retained as an explicit ordering law.
 */
export interface MetaObservation {
  readonly atOp: number;
  readonly version: number;
  readonly id: string;
  /** The envelope HLC (`updated`) at this op — raw bytes, deterministic under the injected fixed clock. */
  readonly hlc: HlcObservation;
}

/**
 * The normalized, comparable record a capture produces. Every field is a pure
 * function of the {@link OpHistory} for the deterministic primitives, so a
 * double-run re-serializes byte-identical (the capture-harness determinism gate).
 */
export interface Observation {
  readonly primitive: string;
  readonly opCount: number;
  /** Subscribers, sorted by sink id, so ordering across drivers is canonical. */
  readonly subscribers: readonly SubscriberObservation[];
  /** Replay-1 reads, in op order. */
  readonly reads: readonly ReadObservation[];
  /** LiveCell crossings channel (omitted for primitives without one). */
  readonly crossings?: readonly CrossingObservation[];
  /** LiveCell envelope trail (omitted for primitives without one). */
  readonly meta?: readonly MetaObservation[];
  /** LiveCell HLC monotonicity across mutations (`HLC.compare` non-decreasing). */
  readonly metaMonotonic?: boolean;
  /** The terminal replay-1 value after the whole history (or `null` if unreadable). */
  readonly finalValue: TraceValue | null;
  /** Whether the owning scope was torn down by the end of the history. */
  readonly disposed: boolean;
}

// ---------------------------------------------------------------------------
// Canonical digests
// ---------------------------------------------------------------------------

/**
 * Content-address an op history through the ONE canonical encoder
 * (`CanonicalCbor` → fnv1a). Byte-stable across runs and platforms (ADR-0003),
 * so a fixture can be keyed `{ primitive, seed, traceDigest }`.
 */
export const traceDigest = (history: OpHistory): ContentAddress => fnv1aBytes(CanonicalCbor.encode(history));

/** Content-address an observation the same way — the byte-law cage's key half. */
export const observationDigest = (observation: Observation): ContentAddress =>
  fnv1aBytes(CanonicalCbor.encode(observation));

/**
 * One committed capture row: the seeded history, its digest, and the recorded
 * observation. This is the fixture unit (`tests/fixtures/reactive-capture/*.json`).
 */
export interface CaptureEntry {
  readonly primitive: string;
  readonly seed: string;
  readonly traceDigest: ContentAddress;
  readonly observationDigest: ContentAddress;
  readonly history: OpHistory;
  readonly observation: Observation;
}

/** Assemble a {@link CaptureEntry} from a seeded history + its captured observation. */
export const captureEntry = (
  primitive: string,
  seed: string,
  history: OpHistory,
  observation: Observation,
): CaptureEntry => ({
  primitive,
  seed,
  traceDigest: traceDigest(history),
  observationDigest: observationDigest(observation),
  history,
  observation,
});
