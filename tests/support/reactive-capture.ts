/**
 * reactive-capture — the empirical capture harness (Wave 5.5 transition cage).
 *
 * Drives the CURRENT Effect-backed reactive primitives (Cell / Derived / Store /
 * Signal / Timeline / LiveCell) over a {@link OpHistory} and records the
 * normalized {@link Observation} — the nine behaviors the converged set
 * enumerates: initial replay, duplicate consecutive values, subscriber order,
 * nested writes, subscribe/unsubscribe-during-publish, listener failure,
 * disposal, completion, concurrent async.
 *
 * WHY THIS IS A CAPTURE, NOT A CONCLUSION (S1.5.3): the dedup question — does
 * today's Cell suppress consecutive-equal emissions? — is answered by RUNNING
 * the primitive and reading what it delivered, never by reasoning about
 * `SubscriptionRef.setUnsafe`. The committed golden fixtures
 * (`tests/fixtures/reactive-capture/*.json`) are the authority Wave 6 checks its
 * migration against.
 *
 * DETERMINISM DISCIPLINE. Effect delivers `changes` asynchronously through forked
 * fibers reading a replay-1 PubSub, so the harness DRAINS to quiescence between
 * ops (bounded settle loop that stops once no new delivery lands across two
 * probes). The recorded VALUES are a pure function of the op history for the
 * deterministic primitives (no wall-clock enters an observed value), so a
 * double-run re-serializes byte-identical — that double-run diff is the
 * capture-harness's own red/green gate (a nondeterministic harness reds it).
 *
 * NONDETERMINISTIC SOURCES ARE NOT CAPTURED HERE, BY DESIGN. `Signal.make` time/
 * viewport/scroll sources read `wallClock`/DOM and rAF; `LiveCell` envelope HLC
 * reads `Clock.currentTimeMillis` (= `Date.now()` pre-Wave-6 injected clock).
 * Those wall-clock bytes are recorded only as their DETERMINISTIC projections
 * (Signal capture uses the fully-deterministic `controllable` surface;
 * LiveCell records the fnv1a id + version + an HLC-monotonicity boolean, never
 * raw `wall_ms`). This keeps the golden fixtures replayable while still pinning
 * the byte-law facts (fnv1a identity, monotonic version, monotonic HLC).
 *
 * ZERO RUNTIME EDITS. This harness imports the primitives and observes them; it
 * changes no runtime file. The Wave 5.5 PRIME CONSTRAINT holds.
 *
 * @module
 */

import { Effect, Scope, Stream, Fiber, Exit } from 'effect';
import {
  Cell,
  Derived,
  Store,
  Signal,
  Timeline,
  LiveCell,
  Boundary,
  Scheduler,
  HLC,
  Millis,
  StateName,
} from '@czap/core';
import type {
  ReactiveOp,
  ReactiveOpTag,
  ReactionSpec,
  OpHistory,
  Observation,
  SubscriberObservation,
  ReadObservation,
  CrossingObservation,
  MetaObservation,
  TraceValue,
} from './reactive-trace.js';
import { applyTransform, op } from './reactive-trace.js';

// ---------------------------------------------------------------------------
// Adapter contract — one per primitive, folds the shared vocabulary onto a
// primitive's PUBLIC surface (never its internal Refs).
// ---------------------------------------------------------------------------

/** A deterministic snapshot of a LiveCell envelope's byte-law fields. */
interface MetaSnapshot {
  readonly version: number;
  readonly id: string;
  readonly hlc: HLC.Shape;
}

/** The live handle a {@link PrimitiveAdapter} exposes to the generic runner. */
interface CaptureHandle {
  /** The primary replay-1 `changes` channel, normalized to {@link TraceValue}. */
  readonly changes: Stream.Stream<TraceValue>;
  /** Read the current replay-1 value (Cell.get / Signal.current / Timeline.state). */
  readonly read: Effect.Effect<TraceValue>;
  /** Apply a mutation / control op (set/update/pause/resume/play/reverse/scrub/tick/publishCrossing). */
  readonly mutate: (o: ReactiveOp) => Effect.Effect<void>;
  /** The no-replay crossings channel (LiveCell only). */
  readonly crossings?: Stream.Stream<CrossingObservation>;
  /** Read the deterministic envelope byte-law fields (LiveCell only). */
  readonly meta?: Effect.Effect<MetaSnapshot>;
}

/** A primitive under capture: its name, the ops it supports, and a scoped builder. */
export interface PrimitiveAdapter {
  readonly primitive: string;
  readonly supports: ReadonlySet<ReactiveOpTag>;
  /** Build the primitive inside `scope`; internal fibers are torn down when the scope closes. */
  readonly build: (scope: Scope.Scope) => Effect.Effect<CaptureHandle>;
}

/** Ops handled by `CaptureHandle.mutate` (as opposed to the runner itself). */
const MUTATION_OPS: ReadonlySet<ReactiveOpTag> = new Set<ReactiveOpTag>([
  'set',
  'update',
  'pause',
  'resume',
  'play',
  'reverse',
  'scrub',
  'tick',
  'publishCrossing',
]);

/** Ops after which a LiveCell envelope snapshot is recorded (they call recordMutation). */
const META_SNAPSHOT_OPS: ReadonlySet<ReactiveOpTag> = new Set<ReactiveOpTag>(['set', 'update']);

// ---------------------------------------------------------------------------
// Drain-to-quiescence tuning
// ---------------------------------------------------------------------------

const DRAIN_PROBE_MS = 2;
const DRAIN_MAX_PROBES = 60;
const DRAIN_STABLE_PROBES = 3;

const equalsTraceValue = (a: TraceValue, b: TraceValue): boolean => Object.is(a, b);

// ---------------------------------------------------------------------------
// The generic runner
// ---------------------------------------------------------------------------

interface SubState {
  readonly deliveries: TraceValue[];
  readonly reactions: readonly ReactionSpec[];
  readonly subscribedAtOp: number;
  readonly fired: Set<ReactionSpec>;
  fiber: Fiber.Fiber<void, never> | undefined;
  unsubscribed: boolean;
  interruptedOnDispose: boolean;
  completed: boolean;
  errored: boolean;
}

/**
 * Drive `adapter` over `history` and record the normalized {@link Observation}.
 * The whole run is ONE `Effect.runPromise`; subscriber fibers and internal
 * primitive fibers are forked into a manually-managed {@link Scope} so a
 * `dispose` op can tear them down mid-history and the run can observe
 * post-dispose behavior.
 */
export const captureHistory = (adapter: PrimitiveAdapter, history: OpHistory): Promise<Observation> => {
  for (const o of history) {
    if (!adapter.supports.has(o._tag)) {
      return Promise.reject(
        new Error(`reactive-capture: primitive "${adapter.primitive}" does not support op "${o._tag}"`),
      );
    }
  }

  return Effect.runPromise(
    Effect.gen(function* () {
      const scope = yield* Scope.make();
      const handle = yield* adapter.build(scope);

      const subs = new Map<string, SubState>();
      const reads: ReadObservation[] = [];
      const crossings: CrossingObservation[] = [];
      const metaTrail: MetaObservation[] = [];
      const hlcTrail: HLC.Shape[] = [];
      let deliveredTotal = 0;
      let scopeClosed = false;
      let historyDisposed = false;

      // Crossings collector (LiveCell): a no-replay fan-out channel folded into
      // the same drain counter so a crossing settles like a delivery.
      if (handle.crossings !== undefined) {
        yield* Effect.forkIn(
          Stream.runForEach(handle.crossings, (c: CrossingObservation) =>
            Effect.sync(() => {
              crossings.push(c);
              deliveredTotal += 1;
            }),
          ).pipe(Effect.catchCause(() => Effect.void)),
          scope,
        );
      }

      const disposeSub = (target: string): Effect.Effect<void> =>
        Effect.gen(function* () {
          const s = subs.get(target);
          if (s !== undefined && s.fiber !== undefined && !s.unsubscribed) {
            s.unsubscribed = true;
            yield* Fiber.interrupt(s.fiber);
          }
        });

      const startSub = (
        sink: string,
        reactions: readonly ReactionSpec[],
        atOp: number,
      ): Effect.Effect<void> =>
        Effect.gen(function* () {
          const state: SubState = {
            deliveries: [],
            reactions,
            subscribedAtOp: atOp,
            fired: new Set<ReactionSpec>(),
            fiber: undefined,
            unsubscribed: false,
            interruptedOnDispose: false,
            completed: false,
            errored: false,
          };
          subs.set(sink, state);

          const body = (v: TraceValue): Effect.Effect<void> =>
            Effect.gen(function* () {
              state.deliveries.push(v);
              deliveredTotal += 1;
              for (const r of state.reactions) {
                if (state.fired.has(r) || !equalsTraceValue(v, r.onValue)) continue;
                state.fired.add(r);
                if (r.kind === 'set') {
                  yield* handle.mutate(op.set(r.value));
                } else if (r.kind === 'subscribe') {
                  yield* startSub(r.newSink, [], atOp);
                } else if (r.kind === 'unsubscribe') {
                  yield* disposeSub(r.target);
                } else {
                  // 'throw' — a listener failure: mark it, then die so the
                  // subscriber's stream stops (captured behavior 6).
                  state.errored = true;
                  yield* Effect.die(new Error('reactive-capture: injected listener failure'));
                }
              }
            });

          const fiber = yield* Effect.forkIn(
            Stream.runForEach(handle.changes, body).pipe(Effect.catchCause(() => Effect.void)),
            scope,
          );
          state.fiber = fiber;
        });

      const drain = (): Effect.Effect<void> =>
        Effect.gen(function* () {
          let stable = 0;
          for (let i = 0; i < DRAIN_MAX_PROBES; i++) {
            const before = deliveredTotal;
            yield* Effect.sleep(DRAIN_PROBE_MS);
            if (deliveredTotal === before) {
              stable += 1;
              if (stable >= DRAIN_STABLE_PROBES) break;
            } else {
              stable = 0;
            }
          }
        });

      const snapshotMeta = (atOp: number): Effect.Effect<void> =>
        Effect.gen(function* () {
          if (handle.meta === undefined) return;
          const m = yield* handle.meta;
          metaTrail.push({ atOp, version: m.version, id: m.id });
          hlcTrail.push(m.hlc);
        });

      // Fold the history.
      for (let atOp = 0; atOp < history.length; atOp++) {
        const o = history[atOp]!;
        if (o._tag === 'subscribe') {
          yield* startSub(o.sink, o.react ?? [], atOp);
        } else if (o._tag === 'unsubscribe') {
          yield* disposeSub(o.sink);
        } else if (o._tag === 'read') {
          const value = yield* handle.read;
          reads.push({ atOp, value });
        } else if (o._tag === 'dispose') {
          for (const s of subs.values()) {
            if (!s.unsubscribed && !s.errored) s.interruptedOnDispose = true;
          }
          if (!scopeClosed) {
            yield* Scope.close(scope, Exit.void);
            scopeClosed = true;
          }
          historyDisposed = true;
        } else if (MUTATION_OPS.has(o._tag)) {
          yield* handle.mutate(o);
          yield* drain();
          if (META_SNAPSHOT_OPS.has(o._tag)) yield* snapshotMeta(atOp);
          continue;
        }
        yield* drain();
      }
      yield* drain();

      const finalValueRaw: TraceValue = yield* handle.read;

      if (!scopeClosed) {
        yield* Scope.close(scope, Exit.void);
        scopeClosed = true;
      }

      const subscribers: SubscriberObservation[] = [...subs.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([sink, s]) => ({
          sink,
          subscribedAtOp: s.subscribedAtOp,
          deliveries: [...s.deliveries],
          interruptedOnDispose: s.interruptedOnDispose,
          completed: s.completed,
          errored: s.errored,
        }));

      const observation: Observation = {
        primitive: adapter.primitive,
        opCount: history.length,
        subscribers,
        reads,
        ...(handle.crossings !== undefined ? { crossings } : {}),
        ...(handle.meta !== undefined ? { meta: metaTrail, metaMonotonic: hlcMonotonic(hlcTrail) } : {}),
        finalValue: finalValueRaw,
        disposed: historyDisposed,
      };
      return observation;
    }),
  );
};

const hlcMonotonic = (trail: readonly HLC.Shape[]): boolean => {
  for (let i = 1; i < trail.length; i++) {
    if (HLC.compare(trail[i - 1]!, trail[i]!) > 0) return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

const captureBoundary = (): Boundary.Shape =>
  Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'idle'],
      [100, 'active'],
      [200, 'done'],
    ] as const,
  });

/** Cell — the replay-1 workhorse. */
export const cellAdapter: PrimitiveAdapter = {
  primitive: 'cell',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'update', 'dispose']),
  build: () =>
    Effect.gen(function* () {
      const cell = yield* Cell.make(0);
      return {
        changes: Stream.map(cell.changes, (v): TraceValue => v),
        read: Effect.map(cell.get, (v): TraceValue => v),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return cell.set(o.value);
          if (o._tag === 'update') return cell.update((c) => applyTransform(o.transform, c));
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** Store — TEA reducer; `set(v)` maps to `dispatch(v)` under a replace reducer. */
export const storeAdapter: PrimitiveAdapter = {
  primitive: 'store',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'dispose']),
  build: () =>
    Effect.gen(function* () {
      const store = yield* Store.make<number, number>(0, (_state, msg) => msg);
      return {
        changes: Stream.map(store.changes, (v): TraceValue => v),
        read: Effect.map(store.get, (v): TraceValue => v),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return store.dispatch(o.value);
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** Derived — recompute-on-source-change; `set(v)` drives the source cell. */
export const derivedAdapter: PrimitiveAdapter = {
  primitive: 'derived',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'dispose']),
  build: (scope) =>
    Effect.gen(function* () {
      const base = yield* Cell.make(0);
      const derived = yield* Scope.provide(
        Derived.combine([base] as const, (x: number): number => x + 100),
        scope,
      );
      return {
        changes: Stream.map(derived.changes, (v): TraceValue => v),
        read: Effect.map(derived.get, (v): TraceValue => v),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return base.set(o.value);
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** Signal — the fully-deterministic controllable surface (seek + pause-gate). */
export const signalAdapter: PrimitiveAdapter = {
  primitive: 'signal',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'pause', 'resume', 'dispose']),
  build: (scope) =>
    Effect.gen(function* () {
      const sig = yield* Scope.provide(Signal.controllable(), scope);
      return {
        changes: Stream.map(sig.changes, (v): TraceValue => v),
        read: Effect.map(sig.current, (v): TraceValue => v),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return sig.seek(o.value);
          if (o._tag === 'pause') return sig.pause();
          if (o._tag === 'resume') return sig.resume();
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** Timeline — injected fixed-step scheduler; `set`=seek, `tick`=step. */
export const timelineAdapter: PrimitiveAdapter = {
  primitive: 'timeline',
  supports: new Set<ReactiveOpTag>([
    'subscribe',
    'unsubscribe',
    'read',
    'set',
    'scrub',
    'play',
    'pause',
    'reverse',
    'tick',
    'dispose',
  ]),
  build: (scope) =>
    Effect.gen(function* () {
      const scheduler = Scheduler.fixedStep(10); // dt = 100ms per step
      const timeline = yield* Scope.provide(
        Timeline.from(captureBoundary(), { duration: Millis(200), loop: false, scheduler }),
        scope,
      );
      return {
        changes: Stream.map(timeline.changes, (v): TraceValue => v),
        read: Effect.map(timeline.state, (v): TraceValue => v),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return timeline.seek(Millis(o.value));
          if (o._tag === 'scrub') return timeline.scrub(o.progress);
          if (o._tag === 'play') return timeline.play();
          if (o._tag === 'pause') return timeline.pause();
          if (o._tag === 'reverse') return timeline.reverse();
          if (o._tag === 'tick') {
            const count = o.count;
            return Effect.sync(() => {
              for (let i = 0; i < count; i++) scheduler.step();
            });
          }
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** LiveCell — boundary kind: value channel + crossings + envelope byte-law. */
export const liveCellAdapter: PrimitiveAdapter = {
  primitive: 'live-cell',
  supports: new Set<ReactiveOpTag>([
    'subscribe',
    'unsubscribe',
    'read',
    'set',
    'update',
    'publishCrossing',
    'dispose',
  ]),
  build: (scope) =>
    Effect.gen(function* () {
      const cell = yield* Scope.provide(LiveCell.makeBoundary(captureBoundary(), 0), scope);
      const syntheticStamp = HLC.increment(HLC.create('capture'), 0);
      return {
        changes: Stream.map(cell.changes, (v): TraceValue => v),
        read: Effect.map(cell.get, (v): TraceValue => v),
        crossings: Stream.map(cell.crossings, (c): CrossingObservation => ({
          from: String(c.from),
          to: String(c.to),
          value: c.value,
        })),
        meta: Effect.map(cell.envelope, (env): MetaSnapshot => ({
          version: env.meta.version,
          id: String(env.id),
          hlc: env.meta.updated,
        })),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return cell.set(o.value);
          if (o._tag === 'update') return cell.update((c) => applyTransform(o.transform, c));
          if (o._tag === 'publishCrossing') {
            return cell.publishCrossing({
              from: StateName(o.from),
              to: StateName(o.to),
              timestamp: syntheticStamp,
              value: o.value,
            });
          }
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** The capture registry — one adapter per reactive primitive. */
export const adapters: Readonly<Record<string, PrimitiveAdapter>> = {
  cell: cellAdapter,
  store: storeAdapter,
  derived: derivedAdapter,
  signal: signalAdapter,
  timeline: timelineAdapter,
  'live-cell': liveCellAdapter,
};

/** Capture a history against a named primitive's adapter. */
export const capture = (primitive: string, history: OpHistory): Promise<Observation> => {
  const adapter = adapters[primitive];
  if (adapter === undefined) return Promise.reject(new Error(`reactive-capture: unknown primitive "${primitive}"`));
  return captureHistory(adapter, history);
};
