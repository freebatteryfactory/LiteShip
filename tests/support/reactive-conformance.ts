/**
 * reactive-conformance — the SHARED, deterministic bisimulation runner (Wave 5.5 CAGE-A,
 * the transition cage's single source of truth).
 *
 * ONE runner, TWO consumers (the "no second oracle / no second corpus / no second law"
 * discipline). This module owns the model configs, the native adapters, the reaction
 * vocabulary, the PINNED op-history corpus, and the per-family DECLARED product law
 * (emission tolerance + kernel mapping). Both:
 *   • `tests/property/reactive-conformance.prop.test.ts` — adds GENERATED histories +
 *     shrinking + the plant-a-divergence red-proof, and asserts the fine-grained
 *     relation ({all} for the no-dedup families, {distinct} for the dedup families); and
 *   • `scripts/transition-conformance-gate.ts` — runs the SAME pinned corpus under each
 *     family's DECLARED law, folds `buildTransitionFacts` → `transitionConformanceGate`,
 *     and reds CI on a regression from the current chosen model,
 * consume THIS module. Neither re-derives a model, a corpus, or a law table.
 *
 * DELIBERATE DIVERGENCES ARE PRODUCT LAW, NOT FAILURES. The gate compares the native
 * transport to the CURRENT DECLARED model (each family's chosen EmissionPolicy), never to
 * the retired Effect transport. So Timeline's state-channel dedup and Derived's
 * construction-time leading-republish are CONFORMANT under their declared `{distinct}`
 * tolerance — not false L4 errors. The one delta that is ABOVE the kernel altitude
 * (Derived's recompute-teardown on dispose — a post-dispose source set no longer
 * recomputes) is a RECORDED delta the property test pins as a known divergence; it is
 * deliberately NOT part of the must-hold {@link GATE_CORPUS} (a documented recorded delta
 * is not a conformance claim). The gate blocks only when a pinned history that bisimulates
 * TODAY flips to divergent.
 *
 * @module
 */

import { Boundary } from '@liteship/core';
import { buildTransitionFacts, type TransitionRun } from '@liteship/audit';
import { CanonicalCbor, sha256Hex } from '@liteship/canonical';
import type { TransitionFacts } from '@liteship/gauntlet';
import { op } from './reactive-trace.js';
import type { OpHistory, ReactionSpec } from './reactive-trace.js';
import { adapters } from './reactive-capture.js';
import {
  differential,
  modelTraceSource,
  implTraceSource,
  emissionPolicy,
  type ModelConfig,
  type EmissionPolicy,
  type TraceSource,
} from './reactive-oracle.js';

// ---------------------------------------------------------------------------
// § Model configs — how each primitive family maps onto the kernel channel.
// ---------------------------------------------------------------------------

/** The Timeline boundary projection: elapsed ms → the discrete state string. */
export const CAPTURE_BOUNDARY = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'idle'],
    [100, 'active'],
    [200, 'done'],
  ] as const,
});

/** Project an elapsed-ms value onto the Timeline state (clamped to the boundary domain). */
export const timelineState = (ms: number): string =>
  Boundary.evaluate(CAPTURE_BOUNDARY, Math.max(0, Math.min(200, ms)));

/** Self-ref replay-1 identity projection (Cell / Store / Signal / LiveCell value channel). */
export const IDENTITY: ModelConfig = { channel: 'replay1', initialRaw: 0 };
/** Derived's base(0) + the `+100` value projection applied at observation time. */
export const DERIVED: ModelConfig = { channel: 'replay1', initialRaw: 0, project: (x) => x + 100 };
/** Timeline's elapsed(0) + the boundary-state projection. */
export const TIMELINE: ModelConfig = { channel: 'replay1', initialRaw: 0, project: timelineState };
/**
 * Cell / Store / Signal / LiveCell-value ride the 'deferred' reentrancy arm (Wave 6
 * nested-write RULING — PRESERVE async-append; scar S6.F.2). The model runs the SAME arm
 * so the oracle asserts that I5 law POSITIVELY rather than recording a
 * sync-model-vs-async-impl divergence. Identity projection.
 */
export const DEFERRED: ModelConfig = { channel: 'replay1', initialRaw: 0, reentrancy: 'deferred' };

/** Build the MODEL side TraceSource for a family under a config. */
export const modelFor = (primitive: string, cfg: ModelConfig): TraceSource =>
  modelTraceSource({ ...cfg, label: `model:${primitive}` });
/** Build the IMPL side TraceSource — the native, Effect-free primitive adapter. */
export const implFor = (primitive: string): TraceSource => implTraceSource(adapters[primitive]!);

// Reaction builders — the DATA encoding of the during-delivery behaviors.
export const setOn = (onValue: number, value: number): ReactionSpec => ({ kind: 'set', onValue, value });
export const subOn = (onValue: number, newSink: string): ReactionSpec => ({ kind: 'subscribe', onValue, newSink });
export const throwOn = (onValue: number): ReactionSpec => ({ kind: 'throw', onValue });
export const unsubOn = (onValue: number, target: string): ReactionSpec => ({ kind: 'unsubscribe', onValue, target });

// ---------------------------------------------------------------------------
// § The pinned corpus — seeded op histories, grouped by relation.
// ---------------------------------------------------------------------------

/** One pinned case: a family, its model config, a replay-key seed, and the op history. */
export interface BisimCase {
  readonly primitive: string;
  readonly cfg: ModelConfig;
  readonly seed: string;
  readonly history: OpHistory;
}

/**
 * BISIMULATION HOLDS under {all} — the reference model is a faithful projection of the
 * native CellKernel transport on the shared kernel vocabulary. The no-dedup families
 * (Cell / Store / Signal / LiveCell-value) and Timeline's non-consecutive-equal seeks.
 */
export const BISIM_HOLDS: readonly BisimCase[] = [
  // Cell — the replay-1 workhorse. Every shared-vocabulary behavior bisimulates.
  { primitive: 'cell', cfg: IDENTITY, seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  {
    primitive: 'cell',
    cfg: IDENTITY,
    seed: 'late-subscriber-replay',
    history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()],
  },
  {
    primitive: 'cell',
    cfg: IDENTITY,
    seed: 'duplicate-consecutive',
    history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()],
  },
  {
    primitive: 'cell',
    cfg: IDENTITY,
    seed: 'subscriber-order',
    history: [op.subscribe('a'), op.subscribe('b'), op.subscribe('c'), op.set(5)],
  },
  {
    primitive: 'cell',
    cfg: IDENTITY,
    seed: 'unsubscribe-during-publish',
    history: [op.subscribe('a', [unsubOn(5, 'b')]), op.subscribe('b'), op.set(5), op.set(6)],
  },
  {
    primitive: 'cell',
    cfg: IDENTITY,
    seed: 'listener-failure',
    history: [op.subscribe('a', [throwOn(3)]), op.subscribe('b'), op.set(3), op.set(4), op.read()],
  },
  {
    primitive: 'cell',
    cfg: IDENTITY,
    seed: 'disposal-completion',
    history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()],
  },
  {
    primitive: 'cell',
    cfg: IDENTITY,
    seed: 'update-path',
    history: [op.subscribe('a'), op.update({ kind: 'add', n: 10 }), op.update({ kind: 'mul', n: 2 }), op.read()],
  },
  // Store — a replace reducer is a replay-1 channel; every dispatch publishes.
  { primitive: 'store', cfg: IDENTITY, seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  {
    primitive: 'store',
    cfg: IDENTITY,
    seed: 'late-subscriber-replay',
    history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()],
  },
  {
    primitive: 'store',
    cfg: IDENTITY,
    seed: 'duplicate-consecutive',
    history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()],
  },
  {
    primitive: 'store',
    cfg: IDENTITY,
    seed: 'subscriber-order',
    history: [op.subscribe('a'), op.subscribe('b'), op.subscribe('c'), op.set(5)],
  },
  {
    primitive: 'store',
    cfg: IDENTITY,
    seed: 'listener-failure',
    history: [op.subscribe('a', [throwOn(3)]), op.subscribe('b'), op.set(3), op.set(4), op.read()],
  },
  {
    primitive: 'store',
    cfg: IDENTITY,
    seed: 'disposal',
    history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()],
  },
  // Signal (controllable) — seek is a self-ref replay-1 write.
  { primitive: 'signal', cfg: IDENTITY, seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  {
    primitive: 'signal',
    cfg: IDENTITY,
    seed: 'duplicate-consecutive',
    history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()],
  },
  {
    primitive: 'signal',
    cfg: IDENTITY,
    seed: 'subscriber-order',
    history: [op.subscribe('a'), op.subscribe('b'), op.set(5)],
  },
  {
    primitive: 'signal',
    cfg: IDENTITY,
    seed: 'late-subscriber-replay',
    history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()],
  },
  {
    primitive: 'signal',
    cfg: IDENTITY,
    seed: 'disposal',
    history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()],
  },
  // Timeline — the state channel over a boundary projection; non-equal seeks bisimulate under {all}.
  { primitive: 'timeline', cfg: TIMELINE, seed: 'initial-state', history: [op.subscribe('a'), op.read()] },
  {
    primitive: 'timeline',
    cfg: TIMELINE,
    seed: 'seek-across-thresholds',
    history: [op.subscribe('a'), op.set(150), op.set(50), op.set(150), op.read()],
  },
  // LiveCell — value channel inherits the Cell replay-1 policy; crossings/meta are ABOVE the kernel altitude (excluded).
  { primitive: 'live-cell', cfg: IDENTITY, seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  {
    primitive: 'live-cell',
    cfg: IDENTITY,
    seed: 'duplicate-consecutive',
    history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()],
  },
  {
    primitive: 'live-cell',
    cfg: IDENTITY,
    seed: 'manual-crossing-fanout',
    history: [op.subscribe('a'), op.publishCrossing('idle', 'active', 120), op.read()],
  },
  {
    primitive: 'live-cell',
    cfg: IDENTITY,
    seed: 'disposal',
    history: [op.subscribe('a'), op.set(150), op.dispose(), op.set(50), op.read()],
  },
];

/**
 * EMISSION-POLICY AXIS — divergent under {all}, EQUIVALENT under the family's declared
 * `{distinct}` tolerance. Derived (construction-time source-replay leading republish) and
 * Timeline (hand-rolled state dedup) are the intentional deltas Wave 6 RESOLVED by
 * choosing `{distinct}`. Under that declared law they are conformant, not divergent — the
 * property test proves both arms; the gate enforces the chosen `{distinct}` arm.
 */
export const EMISSION_AXIS: readonly BisimCase[] = [
  // Derived — the construction-time source-replay adds a leading republish the kernel
  // model does not; {distinct} collapses it.
  { primitive: 'derived', cfg: DERIVED, seed: 'initial-value', history: [op.subscribe('a'), op.read()] },
  {
    primitive: 'derived',
    cfg: DERIVED,
    seed: 'recompute-on-source',
    history: [op.subscribe('a'), op.set(5), op.read()],
  },
  {
    primitive: 'derived',
    cfg: DERIVED,
    seed: 'duplicate-source',
    history: [op.subscribe('a'), op.set(5), op.set(5), op.set(8), op.read()],
  },
  {
    primitive: 'derived',
    cfg: DERIVED,
    seed: 'subscriber-order',
    history: [op.subscribe('a'), op.subscribe('b'), op.set(5)],
  },
  {
    primitive: 'derived',
    cfg: DERIVED,
    seed: 'late-subscriber-replay',
    history: [op.subscribe('a'), op.set(5), op.subscribe('b'), op.read()],
  },
  // Timeline — the hand-rolled `newState !== oldState` dedup on the state channel.
  {
    primitive: 'timeline',
    cfg: TIMELINE,
    seed: 'duplicate-state-seek',
    history: [op.subscribe('a'), op.set(150), op.set(160), op.read()],
  },
];

// ---------------------------------------------------------------------------
// § The DECLARED per-family product law + the gate corpus derivation.
// ---------------------------------------------------------------------------

/**
 * One family's DECLARED product law — the model mapping + the emission tolerance the GATE
 * enforces (the CHOSEN post-migration contract, never the retired Effect baseline).
 *  - The no-dedup families (`cell` / `store` / `signal` / `live-cell`) enforce `{all}`
 *    (the pinned I4 no-dedup law) via the identity kernel projection.
 *  - The dedup families (`derived` / `timeline`) enforce `{distinct}` — Derived's leading
 *    republish and Timeline's state dedup are conformant under this declared tolerance.
 */
export interface FamilyLaw {
  readonly family: string;
  readonly cfg: ModelConfig;
  readonly policy: EmissionPolicy;
}

/** The declared law table — the single owner of "which tolerance each reactive family conforms under". */
export const FAMILY_LAWS: readonly FamilyLaw[] = [
  { family: 'cell', cfg: IDENTITY, policy: emissionPolicy.all() },
  { family: 'store', cfg: IDENTITY, policy: emissionPolicy.all() },
  { family: 'signal', cfg: IDENTITY, policy: emissionPolicy.all() },
  { family: 'live-cell', cfg: IDENTITY, policy: emissionPolicy.all() },
  { family: 'derived', cfg: DERIVED, policy: emissionPolicy.distinct() },
  { family: 'timeline', cfg: TIMELINE, policy: emissionPolicy.distinct() },
];

/** The family ids the gate covers, in declared order. */
export const TRANSITION_FAMILIES: readonly string[] = FAMILY_LAWS.map((l) => l.family);

/**
 * The MUST-HOLD corpus the gate proves — every pinned history that bisimulates TODAY under
 * its family's declared law. It is exactly `BISIM_HOLDS ∪ EMISSION_AXIS`: the same seeded
 * histories the property test exercises (no second corpus). The Derived recompute-teardown
 * delta is a RECORDED above-kernel divergence, so it is deliberately absent here.
 */
export const GATE_CORPUS: readonly BisimCase[] = [...BISIM_HOLDS, ...EMISSION_AXIS];

/** The canonical SHA-256 content address (`sha256:<64-hex>`) of a value's canonical CBOR bytes. */
const sha256Address = (value: unknown): string => `sha256:${sha256Hex(CanonicalCbor.encode(value))}`;

/**
 * Run one family's slice of the pinned corpus under its DECLARED law and fold it into the
 * flat {@link TransitionFacts} the lean `transitionConformanceGate` consumes. Each case is
 * driven over BOTH the reference model and the native transport by the shared oracle; the
 * two NORMALIZED-under-the-declared-policy observations are handed to `buildTransitionFacts`,
 * which content-addresses the op history, byte-compares the two observations, and decides
 * the per-case bisimulation verdict. Deterministic: the facts sort by (seed, traceDigest).
 */
export async function buildFamilyTransitionFacts(law: FamilyLaw): Promise<TransitionFacts> {
  const cases = GATE_CORPUS.filter((c) => c.primitive === law.family);
  const model = modelFor(law.family, law.cfg);
  const impl = implFor(law.family);
  const runs: TransitionRun[] = [];
  for (const c of cases) {
    // The shared oracle runs the SAME model + native transport, normalized under the
    // declared policy — no second interpretation of the laws.
    const result = await differential(model, impl, c.history, law.policy);
    runs.push({
      seed: c.seed,
      history: c.history,
      operations: c.history.map((o) => o._tag),
      model: { kind: 'observed', observation: result.model },
      implementation: { kind: 'observed', observation: result.impl },
    });
  }
  return buildTransitionFacts(runs, {
    family: law.family,
    // The transport fingerprints — a stable content address of the declared model config
    // and the native adapter identity (the replayable transport identity halves).
    modelDigest: sha256Address({
      family: law.family,
      cfg: {
        channel: law.cfg.channel,
        initialRaw: law.cfg.initialRaw,
        reentrancy: law.cfg.reentrancy ?? 'synchronous',
      },
      policy: law.policy.kind,
    }),
    implementationDigest: sha256Address({ family: law.family, transport: 'cell-kernel' }),
  });
}
