/**
 * reactive-oracle — the cross-transport DIFFERENTIAL ORACLE (Wave 5.5, CAGE-A).
 *
 * The BISIMULATION half of the algebraic backbone made executable (constitution
 * §3): two implementations of one reactive coalgebra, run over ONE operation
 * history, must produce observationally-equivalent traces. This module is the
 * reusable harness that decides that relation.
 *
 * ── What it does ────────────────────────────────────────────────────────────
 * Given a seeded {@link OpHistory}, it runs it through TWO {@link TraceSource}s —
 *   • a MODEL side: the pure reference channel `reactive-model.ts` exports
 *     ({@link ModelChannel}, the law-derived projection of CellKernel's I1-I8),
 *     driven with the `reactive-trace.ts` op vocabulary and folded to a
 *     `reactive-trace.ts` {@link Observation};
 *   • an IMPL side: any reactive implementation, folded to the SAME
 *     {@link Observation} shape. THIS wave: the CURRENT Effect-backed primitives
 *     via `reactive-capture.ts`. WAVE 6: the SAME model side, IMPL side flipped
 *     to the CellKernel-backed primitives — the oracle and the model do not
 *     change, only `implTraceSource`'s adapter does.
 * It {@link normalize}s both observations to a comparable core, applies the
 * declared {@link EmissionPolicy} as a symmetric comparison tolerance, and
 * reports a structured {@link OracleResult}: `equivalent` (a named bisimulation
 * relation + a content-address) or `divergent` (the first structured
 * {@link Difference}). {@link shrinkDivergence} reduces any divergent history to
 * a 1-minimal op sequence, content-addressed by `traceDigest`.
 *
 * ── SINGLE ORACLE (LS-001) ───────────────────────────────────────────────────
 * The model side REUSES `reactive-model.ts`'s {@link ModelChannel} for ALL
 * channel semantics (replay-on-subscribe I1, current slot I2, subscriber order
 * I3, no-dedup I4, reentrancy I5, live/snapshot mid-fan-out I6, disposer I7).
 * This file authors NO second law spec — it is a DRIVER (op-vocabulary +
 * value projection + Observation folding), never a law. Everything the laws pin
 * is imported from the projection the `reactive-model` test proves faithful to
 * the real CellKernel.
 *
 * ── ALTITUDE / SCOPE (honest boundaries, not silent omissions) ───────────────
 *   • The model is a KERNEL channel model. It faithfully predicts primitives
 *     whose `set` directly updates their own replayed slot (Cell / Store /
 *     Signal / LiveCell value channel) via an identity projection, and Derived /
 *     Timeline via a supplied VALUE PROJECTION (`+100`, boundary-state). It does
 *     NOT predict primitive semantics ABOVE the kernel (Signal pause-gate,
 *     Timeline scheduler `play`/`tick`/`scrub`, Derived recompute-teardown on
 *     dispose). A history that exercises those is a RECORDED divergence, not a
 *     forced pass — Wave 6's EmissionPolicy/coupling decisions resolve them.
 *   • The comparison covers the PRIMARY replay-1 / value channel + reads +
 *     finalValue + disposed + per-sink lifecycle. The LiveCell no-replay
 *     `crossings` channel and envelope `meta` are ABOVE the kernel model's
 *     altitude and are captured (not differentially checked) by Foundation-A;
 *     {@link normalize} deliberately excludes them, and this is stated at the
 *     seam rather than hidden.
 *
 * ── The EmissionPolicy is a symmetric COMPARISON tolerance ───────────────────
 * The model always runs raw `{all}` (the pinned I4 no-dedup law). The declared
 * policy is applied to BOTH sides' delivery sequences at {@link normalize} time
 * (collapse consecutive-equal under `{distinct}`), so a primitive that dedups
 * internally (Timeline state channel) is `equivalent` under `{distinct}` and
 * `divergent` under `{all}` — the exact axis Wave 6 chooses. Neither side is
 * forced; the tolerance is a declared axis of the verdict.
 *
 * PURE + DETERMINISTIC on the model side; the impl side is drained to quiescence
 * by `reactive-capture.ts`. No wall-clock enters a compared value.
 *
 * @module
 */

import { CanonicalCbor, fnv1aBytes } from '@czap/canonical';
import type { ContentAddress } from '@czap/canonical';
import { ModelChannel, EmissionPolicies } from './reactive-model.js';
import type { ChannelLike, ReentrancyPolicy } from './reactive-model.js';
import { applyTransform, traceDigest } from './reactive-trace.js';
import type {
  OpHistory,
  Observation,
  SubscriberObservation,
  ReadObservation,
  ReactionSpec,
  TraceValue,
} from './reactive-trace.js';
import { captureHistory } from './reactive-capture.js';
import type { PrimitiveAdapter } from './reactive-capture.js';

// ===========================================================================
// § Emission policy — the symmetric comparison tolerance (the third axis)
// ===========================================================================

/**
 * How the oracle treats a delivered value equal to its predecessor when
 * comparing the two sides. The SAME `{all}|{distinct}` axis `reactive-model.ts`
 * pins, widened to `reactive-trace.ts`'s `TraceValue` (the Timeline state
 * channel carries strings). Applied SYMMETRICALLY to both sides — a comparison
 * tolerance, never a mutation of either observation.
 */
export type EmissionPolicy =
  | { readonly kind: 'all' }
  | { readonly kind: 'distinct'; readonly equals: (a: TraceValue, b: TraceValue) => boolean };

/** Policy constructors. `distinct` defaults to `Object.is` (the I4/{distinct} default). */
export const emissionPolicy = {
  all: (): EmissionPolicy => ({ kind: 'all' }),
  distinct: (equals: (a: TraceValue, b: TraceValue) => boolean = (a, b) => Object.is(a, b)): EmissionPolicy => ({
    kind: 'distinct',
    equals,
  }),
} as const;

/** Collapse a delivery sequence under a policy. `{all}` is identity; `{distinct}` drops consecutive-equal. */
export const collapse = (deliveries: readonly TraceValue[], policy: EmissionPolicy): readonly TraceValue[] => {
  if (policy.kind === 'all') return [...deliveries];
  const out: TraceValue[] = [];
  for (const v of deliveries) {
    const prev = out.length === 0 ? undefined : out[out.length - 1];
    if (out.length === 0 || !policy.equals(prev as TraceValue, v)) out.push(v);
  }
  return out;
};

// ===========================================================================
// § Normalized observation — the comparable core (the bisimulation currency)
// ===========================================================================

/** One subscriber's observable behavior, delivery sequence collapsed under the policy. */
export interface NormalizedSubscriber {
  readonly sink: string;
  readonly deliveries: readonly TraceValue[];
  readonly interruptedOnDispose: boolean;
  readonly errored: boolean;
  readonly completed: boolean;
}

/**
 * The projection of a `reactive-trace.ts` {@link Observation} onto the axes the
 * kernel model can and does predict: per-subscriber (sorted by sink) delivery
 * sequence + lifecycle, reads, terminal value, disposal. Deliberately EXCLUDES
 * `primitive`/`opCount`/`subscribedAtOp` (identical metadata across a shared
 * history) and `crossings`/`meta`/`metaMonotonic` (above the kernel altitude —
 * see the module scope note).
 */
export interface NormalizedObservation {
  readonly subscribers: readonly NormalizedSubscriber[];
  readonly reads: readonly TraceValue[];
  readonly finalValue: TraceValue | null;
  readonly disposed: boolean;
}

const bySink = (a: SubscriberObservation, b: SubscriberObservation): number =>
  a.sink < b.sink ? -1 : a.sink > b.sink ? 1 : 0;

/** Project a full {@link Observation} onto the comparable {@link NormalizedObservation}, under a policy. */
export const normalize = (obs: Observation, policy: EmissionPolicy): NormalizedObservation => ({
  subscribers: [...obs.subscribers].sort(bySink).map((s) => ({
    sink: s.sink,
    deliveries: collapse(s.deliveries, policy),
    interruptedOnDispose: s.interruptedOnDispose,
    errored: s.errored,
    completed: s.completed,
  })),
  reads: obs.reads.map((r) => r.value),
  finalValue: obs.finalValue,
  disposed: obs.disposed,
});

/** Content-address a normalized observation through the ONE canonical encoder (CBOR → fnv1a). */
export const normalizedDigest = (n: NormalizedObservation): ContentAddress => fnv1aBytes(CanonicalCbor.encode(n));

// ===========================================================================
// § Structured difference — the shrink target + the finding payload
// ===========================================================================

/** The axis on which two normalized observations first differ. */
export type DifferenceAxis =
  | 'subscriber-set'
  | 'deliveries'
  | 'lifecycle'
  | 'reads'
  | 'finalValue'
  | 'disposed';

/**
 * The FIRST structured difference between model and impl — the self-explaining
 * payload a `divergent` verdict carries (and, later, the `transition-conformance`
 * finding folds). Deterministic: axes checked in a fixed order, sinks in sorted
 * order, indices ascending.
 */
export interface Difference {
  readonly axis: DifferenceAxis;
  readonly sink?: string;
  readonly index?: number;
  readonly model: unknown;
  readonly impl: unknown;
  readonly message: string;
}

const sinkSet = (n: NormalizedObservation): readonly string[] => n.subscribers.map((s) => s.sink);

/**
 * Compute the first difference between two normalized observations, or
 * `undefined` when they are observationally equal (the bisimulation holds).
 */
export const firstDifference = (
  model: NormalizedObservation,
  impl: NormalizedObservation,
): Difference | undefined => {
  // 1. Subscriber membership.
  const mSinks = sinkSet(model);
  const iSinks = sinkSet(impl);
  if (mSinks.length !== iSinks.length || mSinks.some((s, i) => s !== iSinks[i])) {
    return {
      axis: 'subscriber-set',
      model: mSinks,
      impl: iSinks,
      message: `subscriber sets differ: model {${mSinks.join(',')}} vs impl {${iSinks.join(',')}}`,
    };
  }

  // 2. Per-sink deliveries + lifecycle (sorted order).
  for (let s = 0; s < model.subscribers.length; s++) {
    const ms = model.subscribers[s]!;
    const is = impl.subscribers[s]!;
    const len = Math.max(ms.deliveries.length, is.deliveries.length);
    for (let i = 0; i < len; i++) {
      const mv = i < ms.deliveries.length ? ms.deliveries[i] : undefined;
      const iv = i < is.deliveries.length ? is.deliveries[i] : undefined;
      if (!Object.is(mv, iv)) {
        return {
          axis: 'deliveries',
          sink: ms.sink,
          index: i,
          model: ms.deliveries,
          impl: is.deliveries,
          message: `sink "${ms.sink}" delivery #${i} differs: model ${JSON.stringify(mv)} vs impl ${JSON.stringify(iv)}`,
        };
      }
    }
    if (ms.interruptedOnDispose !== is.interruptedOnDispose || ms.errored !== is.errored || ms.completed !== is.completed) {
      return {
        axis: 'lifecycle',
        sink: ms.sink,
        model: { interruptedOnDispose: ms.interruptedOnDispose, errored: ms.errored, completed: ms.completed },
        impl: { interruptedOnDispose: is.interruptedOnDispose, errored: is.errored, completed: is.completed },
        message: `sink "${ms.sink}" lifecycle differs`,
      };
    }
  }

  // 3. Reads.
  const rlen = Math.max(model.reads.length, impl.reads.length);
  for (let i = 0; i < rlen; i++) {
    const mv = i < model.reads.length ? model.reads[i] : undefined;
    const iv = i < impl.reads.length ? impl.reads[i] : undefined;
    if (!Object.is(mv, iv)) {
      return {
        axis: 'reads',
        index: i,
        model: model.reads,
        impl: impl.reads,
        message: `read #${i} differs: model ${JSON.stringify(mv)} vs impl ${JSON.stringify(iv)}`,
      };
    }
  }

  // 4. Terminal value.
  if (!Object.is(model.finalValue, impl.finalValue)) {
    return {
      axis: 'finalValue',
      model: model.finalValue,
      impl: impl.finalValue,
      message: `finalValue differs: model ${JSON.stringify(model.finalValue)} vs impl ${JSON.stringify(impl.finalValue)}`,
    };
  }

  // 5. Disposal.
  if (model.disposed !== impl.disposed) {
    return {
      axis: 'disposed',
      model: model.disposed,
      impl: impl.disposed,
      message: `disposed differs: model ${model.disposed} vs impl ${impl.disposed}`,
    };
  }

  return undefined;
};

// ===========================================================================
// § TraceSource — the uniform "fold a history to an Observation" seam
// ===========================================================================

/**
 * A transport that folds an {@link OpHistory} to a normalized-comparable
 * {@link Observation}. The oracle is agnostic to what is inside — this is the
 * seam that makes it REUSABLE across the model, the current Effect impl, and
 * (Wave 6) the CellKernel impl.
 */
export interface TraceSource {
  readonly label: string;
  readonly run: (history: OpHistory) => Promise<Observation>;
}

/** Wrap a `reactive-capture.ts` {@link PrimitiveAdapter} as the IMPL side. Wave 6 swaps the adapter here. */
export const implTraceSource = (adapter: PrimitiveAdapter): TraceSource => ({
  label: adapter.primitive,
  run: (history) => captureHistory(adapter, history),
});

// ===========================================================================
// § The model side — driving ModelChannel with the trace op vocabulary
// ===========================================================================

/**
 * How the model channel maps a primitive onto the kernel:
 *  - `channel`: the replay-1 (value) or fan-out (crossings) semantics.
 *  - `initialRaw`: the RAW numeric value the channel is seeded with (Cell 0,
 *    Derived's base 0, Timeline elapsed 0).
 *  - `project`: RAW numeric channel value → the emitted {@link TraceValue}. The
 *    kernel stores raw numbers; the projection is applied at OBSERVATION time so
 *    a late-subscriber replay is projected consistently. Identity for the
 *    self-ref primitives; `+100` for Derived; boundary-state for Timeline.
 */
export interface ModelConfig {
  readonly label?: string;
  readonly channel: 'replay1' | 'fanout';
  readonly initialRaw: number;
  readonly project?: (raw: number) => TraceValue;
  /**
   * The reentrancy arm the model channel runs under (Wave 6 nested-write ruling).
   * Defaults to `'synchronous'` (the pinned I5 kernel law). Cell / Store / Signal /
   * LiveCell-value select `'deferred'` so the oracle asserts their PRESERVED
   * async-append behavior POSITIVELY (model ≡ impl) rather than recording a delta.
   */
  readonly reentrancy?: ReentrancyPolicy;
}

interface ModelSubState {
  readonly deliveries: TraceValue[];
  readonly reactions: readonly ReactionSpec[];
  readonly fired: Set<ReactionSpec>;
  readonly subscribedAtOp: number;
  disposer: (() => void) | undefined;
  stopped: boolean;
  unsubscribed: boolean;
  interruptedOnDispose: boolean;
  errored: boolean;
  completed: boolean;
}

/**
 * Fold a `reactive-trace.ts` {@link OpHistory} over the reference
 * {@link ModelChannel} into a `reactive-trace.ts` {@link Observation}. Pure and
 * deterministic. The channel semantics (I1-I8) come ENTIRELY from ModelChannel;
 * this driver only maps ops, projects values, and records the observation —
 * exactly mirroring `reactive-capture.ts`'s generic runner so a comparison is
 * pure channel semantics, never runner logic.
 */
export const runModelTrace = (history: OpHistory, config: ModelConfig): Observation => {
  const project = config.project ?? ((raw: number): TraceValue => raw);
  const ch: ChannelLike =
    config.channel === 'replay1'
      ? ModelChannel.replay1(config.initialRaw, EmissionPolicies.all(), config.reentrancy ?? 'synchronous')
      : ModelChannel.fanout(EmissionPolicies.all());

  const subs = new Map<string, ModelSubState>();
  const reads: ReadObservation[] = [];
  let disposed = false;

  const startSub = (sink: string, reactions: readonly ReactionSpec[], atOp: number): void => {
    const state: ModelSubState = {
      deliveries: [],
      reactions,
      fired: new Set<ReactionSpec>(),
      subscribedAtOp: atOp,
      disposer: undefined,
      stopped: false,
      unsubscribed: false,
      interruptedOnDispose: false,
      errored: false,
      completed: false,
    };
    subs.set(sink, state);
    const disposer = ch.subscribe({
      next: (raw: number) => {
        if (state.stopped) return;
        const value = project(raw);
        state.deliveries.push(value);
        for (const r of state.reactions) {
          if (state.fired.has(r) || !Object.is(value, r.onValue)) continue;
          state.fired.add(r);
          if (r.kind === 'set') {
            ch.publish(r.value);
          } else if (r.kind === 'subscribe') {
            startSub(r.newSink, [], atOp);
          } else if (r.kind === 'unsubscribe') {
            stopSub(r.target, 'unsubscribe');
          } else {
            // 'throw' — the listener dies: it records nothing further (its
            // stream stops), mirroring the capture's Effect.die.
            state.stopped = true;
            state.errored = true;
          }
        }
      },
    });
    state.disposer = disposer;
  };

  const stopSub = (sink: string, reason: 'unsubscribe' | 'dispose'): void => {
    const s = subs.get(sink);
    if (s === undefined || s.stopped) return;
    s.stopped = true;
    if (reason === 'unsubscribe') s.unsubscribed = true;
    else s.interruptedOnDispose = true;
    s.disposer?.();
  };

  for (let atOp = 0; atOp < history.length; atOp++) {
    const o = history[atOp]!;
    switch (o._tag) {
      case 'subscribe':
        startSub(o.sink, o.react ?? [], atOp);
        break;
      case 'unsubscribe':
        stopSub(o.sink, 'unsubscribe');
        break;
      case 'read':
        if (ch.read !== undefined) reads.push({ atOp, value: project(ch.read()) });
        break;
      case 'set':
        ch.publish(o.value);
        break;
      case 'update':
        if (ch.read !== undefined) ch.publish(applyTransform(o.transform, ch.read()));
        break;
      case 'dispose':
        // Mirror the capture: mark still-live subscribers interrupted (skipping
        // the already-unsubscribed / errored ones), then sever delivery. The
        // channel slot still updates on later sets and read still returns it —
        // exactly the current impl's post-dispose behavior for self-ref
        // primitives. (Derived's recompute-teardown is ABOVE this — a RECORDED
        // divergence, not modelled.)
        for (const s of subs.values()) {
          if (!s.unsubscribed && !s.errored && !s.interruptedOnDispose) s.interruptedOnDispose = true;
          if (!s.stopped) {
            s.stopped = true;
            s.disposer?.();
          }
        }
        disposed = true;
        break;
      // publishCrossing / pause / resume / play / reverse / scrub / tick are
      // ABOVE the kernel channel — no effect on the replay-1 value slot. A
      // history that depends on their SEMANTICS is a RECORDED divergence.
      default:
        break;
    }
  }

  const finalValue: TraceValue | null = ch.read !== undefined ? project(ch.read()) : null;

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
    primitive: config.label ?? `model:${config.channel}`,
    opCount: history.length,
    subscribers,
    reads,
    finalValue,
    disposed,
  };
};

/** Build the MODEL side {@link TraceSource} from a {@link ModelConfig}. Reused UNCHANGED in Wave 6. */
export const modelTraceSource = (config: ModelConfig): TraceSource => ({
  label: config.label ?? `model:${config.channel}`,
  run: (history) => Promise.resolve(runModelTrace(history, config)),
});

// ===========================================================================
// § The oracle — differential + shrink
// ===========================================================================

/** The relation the oracle decided over one history, up to a declared policy. */
export type OracleVerdict =
  | { readonly kind: 'equivalent'; readonly relation: 'bisimulation'; readonly digest: ContentAddress }
  | { readonly kind: 'divergent'; readonly difference: Difference };

/** The full result of one differential run — the reusable, content-addressed record. */
export interface OracleResult {
  readonly modelLabel: string;
  readonly implLabel: string;
  readonly policy: EmissionPolicy['kind'];
  readonly history: OpHistory;
  readonly traceDigest: ContentAddress;
  readonly model: NormalizedObservation;
  readonly impl: NormalizedObservation;
  readonly verdict: OracleVerdict;
}

/**
 * Run ONE op history through both sides, normalize under the policy, and decide
 * the bisimulation relation. The core reusable primitive — Wave 6 calls it with
 * the SAME model source and a CellKernel-backed impl source.
 */
export const differential = async (
  model: TraceSource,
  impl: TraceSource,
  history: OpHistory,
  policy: EmissionPolicy,
): Promise<OracleResult> => {
  const [modelObs, implObs] = await Promise.all([model.run(history), impl.run(history)]);
  const m = normalize(modelObs, policy);
  const i = normalize(implObs, policy);
  const diff = firstDifference(m, i);
  const verdict: OracleVerdict =
    diff === undefined
      ? { kind: 'equivalent', relation: 'bisimulation', digest: normalizedDigest(m) }
      : { kind: 'divergent', difference: diff };
  return {
    modelLabel: model.label,
    implLabel: impl.label,
    policy: policy.kind,
    history,
    traceDigest: traceDigest(history),
    model: m,
    impl: i,
    verdict,
  };
};

/** The minimal divergent history a {@link shrinkDivergence} converged to. */
export interface ShrinkResult {
  readonly minimal: OpHistory;
  readonly traceDigest: ContentAddress;
  readonly result: OracleResult;
  /** Op-removal steps applied to reach the minimum (for provenance / debugging). */
  readonly steps: number;
}

/**
 * DELTA-DEBUG a divergent history to a 1-minimal op sequence: repeatedly remove
 * one op (first index first) and keep the reduction whenever the shorter history
 * STILL diverges, until no single removal preserves divergence. Deterministic;
 * content-addressed by `traceDigest(minimal)`. Throws if the full history is not
 * divergent (nothing to shrink — an oracle asked to shrink a passing history is
 * a caller bug).
 */
export const shrinkDivergence = async (
  model: TraceSource,
  impl: TraceSource,
  history: OpHistory,
  policy: EmissionPolicy,
): Promise<ShrinkResult> => {
  const full = await differential(model, impl, history, policy);
  if (full.verdict.kind !== 'divergent') {
    throw new Error(
      `shrinkDivergence: the full history is ${full.verdict.kind} — nothing to shrink (traceDigest ${full.traceDigest})`,
    );
  }
  let current = history;
  let currentResult = full;
  let steps = 0;
  let reduced = true;
  while (reduced) {
    reduced = false;
    for (let i = 0; i < current.length; i++) {
      const candidate = [...current.slice(0, i), ...current.slice(i + 1)];
      // ddmin is inherently sequential: each accepted reduction changes the candidate set.
      const r = await differential(model, impl, candidate, policy);
      if (r.verdict.kind === 'divergent') {
        current = candidate;
        currentResult = r;
        steps += 1;
        reduced = true;
        break;
      }
    }
  }
  return { minimal: current, traceDigest: traceDigest(current), result: currentResult, steps };
};

/** Throw a descriptive error if a result is not `equivalent` — the assertion helper for tests. */
export const assertBisimulation = (result: OracleResult): void => {
  if (result.verdict.kind !== 'equivalent') {
    throw new Error(
      `bisimulation FAILED (${result.modelLabel} vs ${result.implLabel}, policy=${result.policy}): ${result.verdict.difference.message}\n` +
        `  model: ${JSON.stringify(result.model)}\n  impl:  ${JSON.stringify(result.impl)}`,
    );
  }
};

// ===========================================================================
// § Fault injection — the oracle's OWN red-proof (an oracle never seen red is
//   decoration). A shim that drops one delivery from a source's observation.
// ===========================================================================

/** Drop the delivery at `index` for `sink` (if present) from an observation. */
const dropDelivery = (obs: Observation, spec: { readonly sink: string; readonly index: number }): Observation => ({
  ...obs,
  subscribers: obs.subscribers.map((s) =>
    s.sink === spec.sink && spec.index >= 0 && spec.index < s.deliveries.length
      ? { ...s, deliveries: [...s.deliveries.slice(0, spec.index), ...s.deliveries.slice(spec.index + 1)] }
      : s,
  ),
});

/**
 * Wrap a {@link TraceSource} so it drops exactly one delivery — the deliberately
 * WRONG impl the PLANT-A-DIVERGENCE self-test hands the oracle to prove it REDS.
 * A no-op when the target delivery is absent (so shrinking terminates at the
 * minimal history that actually has that delivery to drop).
 */
export const withDroppedDelivery = (
  source: TraceSource,
  spec: { readonly sink: string; readonly index: number },
): TraceSource => ({
  label: `${source.label}#drop(${spec.sink}[${spec.index}])`,
  run: async (history) => dropDelivery(await source.run(history), spec),
});
