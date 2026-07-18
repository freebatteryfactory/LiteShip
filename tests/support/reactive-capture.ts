/**
 * reactive-capture — the empirical capture harness (Wave 5.5 transition cage;
 * impl side flipped to CellKernel in Wave 6).
 *
 * Drives the reactive primitives (Cell / Derived / Store / Signal / Timeline /
 * LiveCell) over a {@link OpHistory} and records the normalized
 * {@link Observation} — the nine behaviors the converged set enumerates: initial
 * replay, duplicate consecutive values, subscriber order, nested writes,
 * subscribe/unsubscribe-during-publish, listener failure, disposal, completion,
 * concurrent async. As of Wave 6 every adapter drives the migrated,
 * CellKernel-backed primitive (plain `read`/`subscribe`/`set`), bridged onto the
 * runner's Effect `Stream` via {@link bridge} — so this SAME harness is now the
 * CellKernel-impl side of the differential oracle (the capture that pinned the
 * golden fixtures against the old Effect transport is preserved byte-for-byte).
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

import { Effect, Scope, Stream, Fiber, Exit, Queue } from 'effect';
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
import type { BoundaryCrossing } from '@czap/core';
import type { Disposer } from '@czap/core';
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

/**
 * Bridge a Wave-6 plain `CellKernel` subscription onto the Effect `Stream` the
 * generic runner drives. Each time the stream is RUN (once per subscriber fiber)
 * it opens an INDEPENDENT kernel subscription that offers every delivery into the
 * `Stream.callback` queue; the returned teardown Effect disposes it when the
 * fiber is interrupted (unsubscribe / scope-close). Deliveries flow through the
 * async queue, so a nested write issued from a delivery handler is fanned out
 * AFTER the synchronous kernel pass unwinds — the harness reproduces the captured
 * async-append ordering exactly as the old forked-fiber `changes` stream did.
 */
const bridge = <A>(subscribe: (sink: (value: A) => void) => Disposer): Stream.Stream<A> =>
  Stream.callback<A>((queue) => {
    // The callback effect is SETUP (it carries `Scope`), not a finalizer: subscribe
    // the kernel now (its replay offers the current value), then register the
    // disposer as a scope finalizer so it runs on fiber interruption / teardown.
    // The stream stays open (the queue is never ended) until that teardown.
    const dispose = subscribe((value: A) => {
      Queue.offerUnsafe(queue, value);
    });
    return Effect.addFinalizer(() => Effect.sync(() => dispose()));
  });

const captureBoundary = (): Boundary.Shape =>
  Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'idle'],
      [100, 'active'],
      [200, 'done'],
    ] as const,
  });

/** Cell — the replay-1 workhorse (Wave 6: plain CellKernel, bridged to Stream). */
export const cellAdapter: PrimitiveAdapter = {
  primitive: 'cell',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'update', 'dispose']),
  build: () =>
    Effect.sync(() => {
      const cell = Cell.make(0);
      return {
        changes: bridge<TraceValue>((sink) => cell.subscribe(sink)),
        read: Effect.sync((): TraceValue => cell.read()),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return Effect.sync(() => cell.set(o.value));
          if (o._tag === 'update') return Effect.sync(() => cell.update((c) => applyTransform(o.transform, c)));
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** Store — TEA reducer; `set(v)` maps to `dispatch(v)` under a replace reducer.
 * Wave 6: plain CellKernel-backed Store, bridged to the runner's `Stream`. Like the
 * cell adapter, the store's lifetime is NOT bound to the harness scope — a `dispose`
 * op interrupts only subscriber fibers, so a post-dispose dispatch still advances
 * `read()` (the captured `disposal` behavior: read returns the last value). */
export const storeAdapter: PrimitiveAdapter = {
  primitive: 'store',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'dispose']),
  build: () =>
    Effect.sync(() => {
      const store = Store.make<number, number>(0, (_state, msg) => msg);
      return {
        changes: bridge<TraceValue>((sink) => store.subscribe(sink)),
        read: Effect.sync((): TraceValue => store.read()),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return Effect.sync(() => store.dispatch(o.value));
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** Derived — recompute-on-source-change; `set(v)` drives the source cell.
 * Wave 6: plain CellKernel-backed Derived, bridged to the runner's `Stream`. The
 * old adapter bound the derived to the harness scope via `Scope.provide` so a
 * `dispose` op tore down its recompute pipeline; reproduce that by disposing the
 * derived's `lifetime` on scope close. Post-dispose the derived unsubscribes from
 * `base`, so a later `base.set(...)` no longer recomputes and `read()` freezes at
 * the last value (the captured recompute-teardown behavior). `base` stays live
 * (not scope-bound), so the post-dispose set still runs — it just reaches no one. */
export const derivedAdapter: PrimitiveAdapter = {
  primitive: 'derived',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'dispose']),
  build: (scope) =>
    Effect.gen(function* () {
      const base = Cell.make(0);
      const derived = Derived.combine([base] as const, (x: number): number => x + 100);
      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          void derived.lifetime.dispose();
        }),
      );
      return {
        changes: bridge<TraceValue>((sink) => derived.subscribe(sink)),
        read: Effect.sync((): TraceValue => derived.read()),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return Effect.sync(() => base.set(o.value));
          return Effect.void;
        },
      } satisfies CaptureHandle;
    }),
};

/** Signal — the fully-deterministic controllable surface (Wave 6: plain CellKernel, bridged). */
export const signalAdapter: PrimitiveAdapter = {
  primitive: 'signal',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'pause', 'resume', 'dispose']),
  build: () =>
    Effect.sync(() => {
      // Like the cell adapter, the signal's own lifetime is NOT bound to the
      // harness scope: a `dispose` op interrupts only the subscriber fibers (the
      // controllable signal has no listeners), so the value channel stays live —
      // a post-dispose seek still updates `read()` (the captured behavior).
      const sig = Signal.controllable();
      return {
        changes: bridge<TraceValue>((sink) => sig.subscribe(sink)),
        read: Effect.sync((): TraceValue => sig.read()),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return Effect.sync(() => sig.seek(o.value));
          if (o._tag === 'pause') return Effect.sync(() => sig.pause());
          if (o._tag === 'resume') return Effect.sync(() => sig.resume());
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
      const timeline = Timeline.from(captureBoundary(), { duration: Millis(200), loop: false, scheduler });
      // The old Effect timeline bound `sched.cancel` to the harness scope (via
      // Scope.provide); reproduce that so a `dispose` op cancels the scheduler
      // (a post-dispose tick is inert). Disposing the timeline lifetime also closes
      // the state kernel — harmless, since `read()` still returns the current slot.
      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          void timeline.lifetime.dispose();
        }),
      );
      return {
        changes: bridge<TraceValue>((sink) => timeline.subscribe(sink)),
        read: Effect.sync((): TraceValue => timeline.state()),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return Effect.sync(() => timeline.seek(Millis(o.value)));
          if (o._tag === 'scrub') return Effect.sync(() => timeline.scrub(o.progress));
          if (o._tag === 'play') return Effect.sync(() => timeline.play());
          if (o._tag === 'pause') return Effect.sync(() => timeline.pause());
          if (o._tag === 'reverse') return Effect.sync(() => timeline.reverse());
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
  build: () =>
    Effect.sync(() => {
      const cell = LiveCell.makeBoundary(captureBoundary(), 0);
      const syntheticStamp = HLC.increment(HLC.create('capture'), 0);
      return {
        changes: bridge<TraceValue>((sink) => cell.subscribe(sink)),
        read: Effect.sync((): TraceValue => cell.read()),
        crossings: Stream.map(
          bridge<BoundaryCrossing<string>>((sink) => cell.crossings.subscribe(sink)),
          (c): CrossingObservation => ({
            from: String(c.from),
            to: String(c.to),
            value: c.value,
          }),
        ),
        meta: Effect.sync((): MetaSnapshot => {
          const env = cell.envelope();
          return {
            version: env.meta.version,
            id: String(env.id),
            hlc: env.meta.updated,
          };
        }),
        mutate: (o: ReactiveOp): Effect.Effect<void> => {
          if (o._tag === 'set') return Effect.sync(() => cell.set(o.value));
          if (o._tag === 'update') return Effect.sync(() => cell.update((c) => applyTransform(o.transform, c)));
          if (o._tag === 'publishCrossing') {
            return Effect.sync(() =>
              cell.publishCrossing({
                from: StateName(o.from),
                to: StateName(o.to),
                timestamp: syntheticStamp,
                value: o.value,
              }),
            );
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
