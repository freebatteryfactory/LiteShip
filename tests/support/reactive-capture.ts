/**
 * reactive-capture — the NATIVE reactive driver (Wave 5.5 transition cage;
 * impl side flipped to the CellKernel-backed primitives in Wave 6; Effect shed
 * from the transport in Wave 6.5, scar S6.1).
 *
 * Drives the reactive primitives (Cell / Derived / Store / Signal / Timeline /
 * LiveCell) over a {@link OpHistory} through their PLAIN SYNCHRONOUS PUBLIC API
 * (`read` / `subscribe(sink): Disposer` / `set` / `dispatch` / `seek` / …) and
 * records the normalized {@link Observation} — the nine behaviors the converged
 * set enumerates: initial replay, duplicate consecutive values, subscriber order,
 * nested writes, subscribe/unsubscribe-during-publish, listener failure,
 * disposal, completion, concurrent async. As of Wave 6.5 there is NO Effect, NO
 * Stream, NO fiber, NO Queue, NO `runPromise`: a subscriber's delivery handler
 * runs SYNCHRONOUSLY inside the kernel fan-out, so this harness observes the
 * migrated CellKernel transport EXACTLY as a product consumer would.
 *
 * WHY DIRECT SYNCHRONOUS DRIVING IS FAITHFUL (S6.1). The Wave-6 Cell/Store/Signal/
 * LiveCell-value channel ride `CellKernel.replay1(..., 'deferred')`, whose
 * async-append (breadth-first / glitch-free) nested-write order is realized
 * SYNCHRONOUSLY by the kernel's re-entrancy guard (no microtask, no Effect). So a
 * nested `set` issued from a delivery handler is ordered by the KERNEL, and the
 * harness needs no queue of its own to reproduce it — it just calls the sync API
 * and the kernel's `'deferred'` arm does the async-append. The subscribe- and
 * unsubscribe-during-publish edges are the kernel's dispatch-snapshot I6 MEMBERSHIP
 * law observed directly (a mid-fan-out subscriber is outside the commit's dispatch,
 * so it observes each commit at most once — its replay, not the in-flight value a
 * second time; the pinned `CellKernel` behavior the reference model encodes, S6.1a),
 * no longer masked by the old forked-fiber snapshot delivery.
 *
 * WHY THIS IS A CAPTURE, NOT A CONCLUSION (S1.5.3): the dedup question — does
 * today's Cell suppress consecutive-equal emissions? — is answered by RUNNING the
 * primitive and reading what it delivered, never by reasoning about the kernel
 * source. The committed golden fixtures (`tests/fixtures/reactive-capture/*.json`)
 * are the authority the migration is checked against.
 *
 * DETERMINISM DISCIPLINE. Delivery is fully synchronous, so the recorded VALUES
 * are a pure function of the op history for the deterministic primitives (no
 * wall-clock enters an observed value): a double-run re-serializes byte-identical.
 * That double-run diff is the capture-harness's own red/green gate (a
 * nondeterministic harness reds it). There is no settle loop to tune — quiescence
 * is reached the instant a synchronous op returns.
 *
 * NONDETERMINISTIC SOURCES ARE CAPTURED THROUGH AN INJECTED CLOCK. `Signal.make`
 * viewport/scroll sources read DOM + rAF (captured via the deterministic
 * `controllable` surface); the `LiveCell` envelope HLC now reads an INJECTED
 * `Clock` (clock.ts cake-and-eat-it law), so the capture drives it with a
 * `fixedClock(0)` and pins the RAW HLC bytes (`wall_ms`/`counter`) in the golden as
 * a pure function of the op-sequence — no ambient `Date.now()`, no
 * monotonicity-boolean workaround. The fnv1a id + version + the raw HLC are all
 * byte-law facts now; {@link Observation.metaMonotonic} is retained as an explicit
 * ordering assertion.
 *
 * ZERO RUNTIME EDITS. This harness imports the primitives and observes them; it
 * changes no runtime file. The Wave 5.5 PRIME CONSTRAINT holds.
 *
 * @module
 */

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
  fixedClock,
} from '@liteship/core';
import type { BoundaryCrossing } from '@liteship/core';
import type { Disposer } from '@liteship/core';
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
  readonly hlc: HLC;
}

/** A no-replay crossings channel folded to {@link CrossingObservation}. */
interface CrossingsChannel {
  readonly subscribe: (sink: (crossing: CrossingObservation) => void) => Disposer;
}

/** The live handle a {@link PrimitiveAdapter} exposes to the generic runner. */
interface CaptureHandle {
  /** Read the current replay-1 value (Cell.read / Signal.read / Timeline.state). */
  readonly read: () => TraceValue;
  /**
   * Subscribe to the primary replay-1 `changes` channel — the sink is invoked
   * SYNCHRONOUSLY on each delivery (replay-on-attach included). Returns the
   * primitive's {@link Disposer}.
   */
  readonly subscribe: (sink: (value: TraceValue) => void) => Disposer;
  /** Apply a mutation / control op (set/update/pause/resume/play/reverse/scrub/tick/publishCrossing). */
  readonly mutate: (o: ReactiveOp) => void;
  /** The no-replay crossings channel (LiveCell only). */
  readonly crossings?: CrossingsChannel;
  /** Read the deterministic envelope byte-law fields (LiveCell only). */
  readonly meta?: () => MetaSnapshot;
  /**
   * Tear down the primitive's OWN lifetime on a `dispose` op (Derived / Timeline
   * only — their recompute pipeline / scheduler is scope-bound). Absent for the
   * self-ref primitives (Cell / Store / Signal / LiveCell), whose value channel
   * stays live after a `dispose` op (a post-dispose set still advances `read()`).
   */
  readonly disposeLifetime?: () => void;
}

/** A primitive under capture: its name, the ops it supports, and a synchronous builder. */
export interface PrimitiveAdapter {
  readonly primitive: string;
  readonly supports: ReadonlySet<ReactiveOpTag>;
  /** Build the primitive (plain synchronous construction — no scope, no Effect). */
  readonly build: () => CaptureHandle;
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

const equalsTraceValue = (a: TraceValue, b: TraceValue): boolean => Object.is(a, b);

// ---------------------------------------------------------------------------
// The generic runner
// ---------------------------------------------------------------------------

interface SubState {
  readonly deliveries: TraceValue[];
  readonly reactions: readonly ReactionSpec[];
  readonly subscribedAtOp: number;
  readonly fired: Set<ReactionSpec>;
  disposer: Disposer | undefined;
  stopped: boolean;
  unsubscribed: boolean;
  interruptedOnDispose: boolean;
  errored: boolean;
  completed: boolean;
}

const hlcMonotonic = (trail: readonly HLC[]): boolean => {
  for (let i = 1; i < trail.length; i++) {
    if (HLC.compare(trail[i - 1]!, trail[i]!) > 0) return false;
  }
  return true;
};

/**
 * Drive `adapter` over `history` and record the normalized {@link Observation}.
 * The whole run is a SINGLE synchronous pass: subscriber sinks are invoked inline
 * by the kernel fan-out, so a `dispose` op tears down mid-history and the run
 * observes post-dispose behavior with no async settling. Structurally mirrors the
 * model driver (`reactive-oracle.ts` `runModelTrace`) so a differential compares
 * pure channel semantics, never runner logic.
 */
const runCapture = (adapter: PrimitiveAdapter, history: OpHistory): Observation => {
  for (const o of history) {
    if (!adapter.supports.has(o._tag)) {
      throw new Error(`reactive-capture: primitive "${adapter.primitive}" does not support op "${o._tag}"`);
    }
  }

  const handle = adapter.build();

  const subs = new Map<string, SubState>();
  const reads: ReadObservation[] = [];
  const crossings: CrossingObservation[] = [];
  const metaTrail: MetaObservation[] = [];
  const hlcTrail: HLC[] = [];
  let historyDisposed = false;
  let lifetimeDisposed = false;

  // Crossings collector (LiveCell): a no-replay fan-out channel recorded inline.
  // Bound to the capture scope like the value subscribers — a `dispose` op severs
  // it, so a post-dispose crossing is not observed (the captured scope-teardown).
  let crossingsDisposer: Disposer | undefined;
  if (handle.crossings !== undefined) {
    crossingsDisposer = handle.crossings.subscribe((c: CrossingObservation) => {
      crossings.push(c);
    });
  }

  const stopSub = (sink: string, reason: 'unsubscribe' | 'dispose'): void => {
    const s = subs.get(sink);
    if (s === undefined || s.stopped) return;
    s.stopped = true;
    if (reason === 'unsubscribe') s.unsubscribed = true;
    else s.interruptedOnDispose = true;
    s.disposer?.();
  };

  const startSub = (sink: string, reactions: readonly ReactionSpec[], atOp: number): void => {
    const state: SubState = {
      deliveries: [],
      reactions,
      subscribedAtOp: atOp,
      fired: new Set<ReactionSpec>(),
      disposer: undefined,
      stopped: false,
      unsubscribed: false,
      interruptedOnDispose: false,
      errored: false,
      completed: false,
    };
    subs.set(sink, state);

    // The delivery handler runs SYNCHRONOUSLY inside the kernel fan-out. A
    // during-delivery reaction is applied inline: a nested `set` re-enters the
    // kernel (ordered by its `'deferred'` arm), a `subscribe` attaches mid-fan-out
    // (the kernel's dispatch-snapshot I6 MEMBERSHIP law: it is OUTSIDE this commit's
    // dispatch, so it gets its replay, not the in-flight value — S6.1a), an
    // `unsubscribe` severs another sink, and a `throw` is an ISOLATED listener
    // failure — the sink stops recording without propagating (mirroring the
    // captured per-subscriber failure isolation), so the outer fan-out is
    // unaffected.
    const body = (v: TraceValue): void => {
      if (state.stopped) return;
      state.deliveries.push(v);
      for (const r of state.reactions) {
        if (state.fired.has(r) || !equalsTraceValue(v, r.onValue)) continue;
        state.fired.add(r);
        if (r.kind === 'set') {
          handle.mutate(op.set(r.value));
        } else if (r.kind === 'subscribe') {
          startSub(r.newSink, [], atOp);
        } else if (r.kind === 'unsubscribe') {
          stopSub(r.target, 'unsubscribe');
        } else {
          // 'throw' — a listener failure isolated to this sink (captured
          // behavior 6): mark it and stop recording; do NOT propagate.
          state.stopped = true;
          state.errored = true;
        }
      }
    };

    state.disposer = handle.subscribe(body);
  };

  const snapshotMeta = (atOp: number): void => {
    if (handle.meta === undefined) return;
    const m = handle.meta();
    metaTrail.push({
      atOp,
      version: m.version,
      id: m.id,
      hlc: { wall_ms: m.hlc.wall_ms, counter: m.hlc.counter, node_id: m.hlc.node_id },
    });
    hlcTrail.push(m.hlc);
  };

  // Fold the history.
  for (let atOp = 0; atOp < history.length; atOp++) {
    const o = history[atOp]!;
    if (o._tag === 'subscribe') {
      startSub(o.sink, o.react ?? [], atOp);
    } else if (o._tag === 'unsubscribe') {
      stopSub(o.sink, 'unsubscribe');
    } else if (o._tag === 'read') {
      reads.push({ atOp, value: handle.read() });
    } else if (o._tag === 'dispose') {
      // Sever every still-live subscriber (mark interrupted) then, for a
      // scope-bound primitive (Derived / Timeline), dispose its own lifetime so
      // the recompute pipeline / scheduler tears down — reproducing the captured
      // recompute-teardown (a post-dispose source change no longer recomputes).
      for (const s of subs.values()) {
        if (!s.unsubscribed && !s.errored && !s.interruptedOnDispose) s.interruptedOnDispose = true;
        if (!s.stopped) {
          s.stopped = true;
          s.disposer?.();
        }
      }
      crossingsDisposer?.();
      crossingsDisposer = undefined;
      if (!lifetimeDisposed && handle.disposeLifetime !== undefined) {
        handle.disposeLifetime();
        lifetimeDisposed = true;
      }
      historyDisposed = true;
    } else if (MUTATION_OPS.has(o._tag)) {
      handle.mutate(o);
      if (META_SNAPSHOT_OPS.has(o._tag)) snapshotMeta(atOp);
    }
  }

  const finalValueRaw: TraceValue = handle.read();

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

  return {
    primitive: adapter.primitive,
    opCount: history.length,
    subscribers,
    reads,
    ...(handle.crossings !== undefined ? { crossings } : {}),
    ...(handle.meta !== undefined ? { meta: metaTrail, metaMonotonic: hlcMonotonic(hlcTrail) } : {}),
    finalValue: finalValueRaw,
    disposed: historyDisposed,
  };
};

/**
 * Drive `adapter` over `history` and record the normalized {@link Observation}.
 * The computation is fully synchronous; the `Promise` wrapper preserves the
 * {@link TraceSource} contract the oracle folds (`reactive-oracle.ts`) and the
 * `await capture(...)` call sites, with no Effect runtime underneath.
 */
export const captureHistory = (adapter: PrimitiveAdapter, history: OpHistory): Promise<Observation> => {
  try {
    return Promise.resolve(runCapture(adapter, history));
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
};

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

const captureBoundary = (): Boundary =>
  Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'idle'],
      [100, 'active'],
      [200, 'done'],
    ] as const,
  });

/** Cell — the replay-1 workhorse (Wave 6: plain CellKernel, driven synchronously). */
export const cellAdapter: PrimitiveAdapter = {
  primitive: 'cell',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'update', 'dispose']),
  build: (): CaptureHandle => {
    const cell = Cell.make(0);
    return {
      read: (): TraceValue => cell.read(),
      subscribe: (sink) => cell.subscribe(sink),
      mutate: (o: ReactiveOp): void => {
        if (o._tag === 'set') cell.set(o.value);
        else if (o._tag === 'update') cell.update((c) => applyTransform(o.transform, c));
      },
    };
  },
};

/** Store — TEA reducer; `set(v)` maps to `dispatch(v)` under a replace reducer.
 * Wave 6: plain CellKernel-backed Store. Like the cell adapter, the store's
 * lifetime is NOT torn down by a `dispose` op — it interrupts only subscribers, so
 * a post-dispose dispatch still advances `read()` (the captured `disposal`
 * behavior: read returns the last value). */
export const storeAdapter: PrimitiveAdapter = {
  primitive: 'store',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'dispose']),
  build: (): CaptureHandle => {
    const store = Store.make<number, number>(0, (_state, msg) => msg);
    return {
      read: (): TraceValue => store.read(),
      subscribe: (sink) => store.subscribe(sink),
      mutate: (o: ReactiveOp): void => {
        if (o._tag === 'set') store.dispatch(o.value);
      },
    };
  },
};

/** Derived — recompute-on-source-change; `set(v)` drives the source cell.
 * Wave 6: plain CellKernel-backed Derived. A `dispose` op disposes the derived's
 * `lifetime`, which unsubscribes from `base` then closes the kernel, so a later
 * `base.set(...)` no longer recomputes and `read()` freezes at the last value (the
 * captured recompute-teardown behavior). `base` stays live (not disposed), so the
 * post-dispose set still runs — it just reaches no one. */
export const derivedAdapter: PrimitiveAdapter = {
  primitive: 'derived',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'dispose']),
  build: (): CaptureHandle => {
    const base = Cell.make(0);
    const derived = Derived.combine([base] as const, (x: number): number => x + 100);
    return {
      read: (): TraceValue => derived.read(),
      subscribe: (sink) => derived.subscribe(sink),
      mutate: (o: ReactiveOp): void => {
        if (o._tag === 'set') base.set(o.value);
      },
      disposeLifetime: (): void => {
        void derived.lifetime.dispose();
      },
    };
  },
};

/** Signal — the fully-deterministic controllable surface (Wave 6: plain CellKernel). */
export const signalAdapter: PrimitiveAdapter = {
  primitive: 'signal',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'pause', 'resume', 'dispose']),
  build: (): CaptureHandle => {
    // Like the cell adapter, the signal's own lifetime is NOT torn down by a
    // `dispose` op: it interrupts only the subscribers (the controllable signal
    // has no listeners), so the value channel stays live — a post-dispose seek
    // still updates `read()` (the captured behavior).
    const sig = Signal.controllable();
    return {
      read: (): TraceValue => sig.read(),
      subscribe: (sink) => sig.subscribe(sink),
      mutate: (o: ReactiveOp): void => {
        if (o._tag === 'set') sig.seek(o.value);
        else if (o._tag === 'pause') sig.pause();
        else if (o._tag === 'resume') sig.resume();
      },
    };
  },
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
  build: (): CaptureHandle => {
    const scheduler = Scheduler.fixedStep(10); // dt = 100ms per step
    const timeline = Timeline.from(captureBoundary(), { duration: Millis(200), loop: false, scheduler });
    return {
      read: (): TraceValue => timeline.state(),
      subscribe: (sink) => timeline.subscribe(sink),
      mutate: (o: ReactiveOp): void => {
        if (o._tag === 'set') timeline.seek(Millis(o.value));
        else if (o._tag === 'scrub') timeline.scrub(o.progress);
        else if (o._tag === 'play') timeline.play();
        else if (o._tag === 'pause') timeline.pause();
        else if (o._tag === 'reverse') timeline.reverse();
        else if (o._tag === 'tick') {
          for (let i = 0; i < o.count; i++) scheduler.step();
        }
      },
      // A `dispose` op cancels the scheduler (a post-dispose tick is inert) and
      // closes the state kernel — `read()` still returns the current slot.
      disposeLifetime: (): void => {
        void timeline.lifetime.dispose();
      },
    };
  },
};

/** LiveCell — boundary kind: value channel + crossings + envelope byte-law. */
export const liveCellAdapter: PrimitiveAdapter = {
  primitive: 'live-cell',
  supports: new Set<ReactiveOpTag>(['subscribe', 'unsubscribe', 'read', 'set', 'update', 'publishCrossing', 'dispose']),
  build: (): CaptureHandle => {
    // Drive the envelope HLC with a fixed clock so `wall_ms`/`counter` are a pure
    // function of the op-sequence — the raw bytes are pinned in the golden (no
    // ambient Date.now(), no monotonicity-boolean workaround).
    const cell = LiveCell.makeBoundary(captureBoundary(), 0, fixedClock(0));
    const syntheticStamp = HLC.increment(HLC.create('capture'), 0);
    return {
      read: (): TraceValue => cell.read(),
      subscribe: (sink) => cell.subscribe(sink),
      crossings: {
        subscribe: (sink) =>
          cell.crossings.subscribe((c: BoundaryCrossing<string>) =>
            sink({ from: String(c.from), to: String(c.to), value: c.value }),
          ),
      },
      meta: (): MetaSnapshot => {
        const env = cell.envelope();
        return { version: env.meta.version, id: String(env.id), hlc: env.meta.updated };
      },
      mutate: (o: ReactiveOp): void => {
        if (o._tag === 'set') cell.set(o.value);
        else if (o._tag === 'update') cell.update((c) => applyTransform(o.transform, c));
        else if (o._tag === 'publishCrossing') {
          cell.publishCrossing({
            from: StateName(o.from),
            to: StateName(o.to),
            timestamp: syntheticStamp,
            value: o.value,
          });
        }
      },
    };
  },
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
