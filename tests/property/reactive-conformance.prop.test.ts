/**
 * reactive-conformance — the cross-transport DIFFERENTIAL ORACLE, driven over the
 * NATIVE CellKernel-backed primitives (Wave 5.5 CAGE-A; impl side flipped to
 * CellKernel in Wave 6; Effect shed from the transport in Wave 6.5, scar S6.1).
 * RED-FIRST: the oracle is PROVEN to red before it is trusted green (the
 * PLANT-A-DIVERGENCE self-test below — an oracle never seen red is decoration).
 *
 * This suite runs `tests/support/reactive-oracle.ts` over the migrated,
 * Effect-free primitives (`reactive-capture.ts` adapters, now driven through their
 * PLAIN SYNCHRONOUS public API — no Effect, no Stream, no Queue, no `runPromise`)
 * AND the law-derived reference model (`reactive-model.ts` via the oracle's model
 * side), over ONE op history, and asserts observational equivalence — a
 * BISIMULATION (constitution §3). It is the STANDING post-migration acceptance
 * proof: the durable committed evidence that the CellKernel transport is the
 * faithful projection the reference model pins, exercising the NATIVE transport
 * directly (no Effect bridge between the proof and the product).
 *
 * The relation the native impl exhibits, PROVEN (not merely recorded):
 *   • BISIMULATION HOLDS under {all} for Cell / Store / Signal / LiveCell-value
 *     / Timeline (non-consecutive-equal seeks) — the kernel model is a faithful
 *     projection of the native transport on the shared vocabulary. This now
 *     INCLUDES, asserted POSITIVELY, the two edges the OLD Effect transport
 *     recorded as robust deltas: the reentrancy law I5 (a nested write is
 *     async-appended — Cell/Store ride `'deferred'`, so the model runs the SAME
 *     arm and bisimulates) and the mutation-during-notify I6 live-set law (a
 *     subscriber attached mid-fan-out RECEIVES the in-flight value — the kernel's
 *     LIVE-set fan-out, which the Effect fibers' snapshot delivery had masked).
 *   • EMISSIONPOLICY AXIS: Derived (construction-time source-replay republish)
 *     and Timeline (hand-rolled state dedup) are divergent under {all},
 *     equivalent under {distinct} — the tolerance Wave 6 chose ({distinct} for
 *     Timeline; the leading-republish PRESERVED for Derived).
 *   • REMAINING DELTA (above the kernel altitude — NOT a kernel-channel law):
 *     Derived's recompute-teardown on dispose (a post-dispose source set no
 *     longer recomputes, so `read()` freezes). The kernel model keeps updating
 *     its slot, so this diverges even under {distinct} — the recorded delta the
 *     oracle's altitude note (`reactive-oracle.ts`) draws.
 *
 * Seeds pinned; no unseeded fast-check.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { Boundary } from '@czap/core';
import { op, traceDigest } from '../support/reactive-trace.js';
import type { OpHistory, ReactiveOp, ReactionSpec, UpdateTransform } from '../support/reactive-trace.js';
import { adapters } from '../support/reactive-capture.js';
import {
  differential,
  shrinkDivergence,
  modelTraceSource,
  implTraceSource,
  withDroppedDelivery,
  emissionPolicy,
  runModelTrace,
  type ModelConfig,
  type TraceSource,
} from '../support/reactive-oracle.js';
import { scaledTimeout } from '../../vitest.shared.js';

// ---------------------------------------------------------------------------
// Model configs — how each primitive maps onto the kernel channel.
// ---------------------------------------------------------------------------

const CAPTURE_BOUNDARY = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'idle'],
    [100, 'active'],
    [200, 'done'],
  ] as const,
});
const timelineState = (ms: number): string => Boundary.evaluate(CAPTURE_BOUNDARY, Math.max(0, Math.min(200, ms)));

const IDENTITY: ModelConfig = { channel: 'replay1', initialRaw: 0 };
const DERIVED: ModelConfig = { channel: 'replay1', initialRaw: 0, project: (x) => x + 100 };
const TIMELINE: ModelConfig = { channel: 'replay1', initialRaw: 0, project: timelineState };
// Cell / Store / Signal / LiveCell-value ride the 'deferred' reentrancy arm (Wave
// 6 nested-write RULING — PRESERVE async-append; scar S6.F.2). The model runs the
// SAME 'deferred' arm so the oracle asserts that I5 law POSITIVELY (model ≡
// native CellKernel-backed impl) rather than recording a sync-model-vs-async-impl
// divergence. Identity projection — reused by both the Cell and Store proofs.
const DEFERRED: ModelConfig = { channel: 'replay1', initialRaw: 0, reentrancy: 'deferred' };

const modelFor = (primitive: string, cfg: ModelConfig): TraceSource =>
  modelTraceSource({ ...cfg, label: `model:${primitive}` });
const implFor = (primitive: string): TraceSource => implTraceSource(adapters[primitive]!);

// Reaction builders (the DATA encoding of the during-delivery behaviors).
const setOn = (onValue: number, value: number): ReactionSpec => ({ kind: 'set', onValue, value });
const subOn = (onValue: number, newSink: string): ReactionSpec => ({ kind: 'subscribe', onValue, newSink });
const throwOn = (onValue: number): ReactionSpec => ({ kind: 'throw', onValue });
const unsubOn = (onValue: number, target: string): ReactionSpec => ({ kind: 'unsubscribe', onValue, target });

const TIMEOUT = scaledTimeout(60_000);

// ===========================================================================
// 1. BISIMULATION HOLDS — model ≡ native CellKernel impl, up to {all}.
// ===========================================================================

interface BisimCase {
  readonly primitive: string;
  readonly cfg: ModelConfig;
  readonly seed: string;
  readonly history: OpHistory;
}

const BISIM_HOLDS: readonly BisimCase[] = [
  // Cell — the replay-1 workhorse. Every shared-vocabulary behavior bisimulates.
  { primitive: 'cell', cfg: IDENTITY, seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  { primitive: 'cell', cfg: IDENTITY, seed: 'late-subscriber-replay', history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()] },
  { primitive: 'cell', cfg: IDENTITY, seed: 'duplicate-consecutive', history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()] },
  { primitive: 'cell', cfg: IDENTITY, seed: 'subscriber-order', history: [op.subscribe('a'), op.subscribe('b'), op.subscribe('c'), op.set(5)] },
  { primitive: 'cell', cfg: IDENTITY, seed: 'unsubscribe-during-publish', history: [op.subscribe('a', [unsubOn(5, 'b')]), op.subscribe('b'), op.set(5), op.set(6)] },
  { primitive: 'cell', cfg: IDENTITY, seed: 'listener-failure', history: [op.subscribe('a', [throwOn(3)]), op.subscribe('b'), op.set(3), op.set(4), op.read()] },
  { primitive: 'cell', cfg: IDENTITY, seed: 'disposal-completion', history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()] },
  { primitive: 'cell', cfg: IDENTITY, seed: 'update-path', history: [op.subscribe('a'), op.update({ kind: 'add', n: 10 }), op.update({ kind: 'mul', n: 2 }), op.read()] },
  // Store — a replace reducer is a replay-1 channel; every dispatch publishes.
  { primitive: 'store', cfg: IDENTITY, seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  { primitive: 'store', cfg: IDENTITY, seed: 'late-subscriber-replay', history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()] },
  { primitive: 'store', cfg: IDENTITY, seed: 'duplicate-consecutive', history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()] },
  { primitive: 'store', cfg: IDENTITY, seed: 'subscriber-order', history: [op.subscribe('a'), op.subscribe('b'), op.subscribe('c'), op.set(5)] },
  { primitive: 'store', cfg: IDENTITY, seed: 'listener-failure', history: [op.subscribe('a', [throwOn(3)]), op.subscribe('b'), op.set(3), op.set(4), op.read()] },
  { primitive: 'store', cfg: IDENTITY, seed: 'disposal', history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()] },
  // Signal (controllable) — seek is a self-ref replay-1 write.
  { primitive: 'signal', cfg: IDENTITY, seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  { primitive: 'signal', cfg: IDENTITY, seed: 'duplicate-consecutive', history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()] },
  { primitive: 'signal', cfg: IDENTITY, seed: 'subscriber-order', history: [op.subscribe('a'), op.subscribe('b'), op.set(5)] },
  { primitive: 'signal', cfg: IDENTITY, seed: 'late-subscriber-replay', history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()] },
  { primitive: 'signal', cfg: IDENTITY, seed: 'disposal', history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()] },
  // Timeline — the state channel over a boundary projection; non-equal seeks bisimulate under {all}.
  { primitive: 'timeline', cfg: TIMELINE, seed: 'initial-state', history: [op.subscribe('a'), op.read()] },
  { primitive: 'timeline', cfg: TIMELINE, seed: 'seek-across-thresholds', history: [op.subscribe('a'), op.set(150), op.set(50), op.set(150), op.read()] },
  // LiveCell — value channel inherits the Cell replay-1 policy; crossings/meta are ABOVE the kernel altitude (excluded).
  { primitive: 'live-cell', cfg: IDENTITY, seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  { primitive: 'live-cell', cfg: IDENTITY, seed: 'duplicate-consecutive', history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()] },
  { primitive: 'live-cell', cfg: IDENTITY, seed: 'manual-crossing-fanout', history: [op.subscribe('a'), op.publishCrossing('idle', 'active', 120), op.read()] },
  { primitive: 'live-cell', cfg: IDENTITY, seed: 'disposal', history: [op.subscribe('a'), op.set(150), op.dispose(), op.set(50), op.read()] },
];

describe('bisimulation holds — reference model ≡ native CellKernel impl (up to {all})', () => {
  for (const c of BISIM_HOLDS) {
    test(
      `${c.primitive} / ${c.seed}`,
      async () => {
        const res = await differential(modelFor(c.primitive, c.cfg), implFor(c.primitive), c.history, emissionPolicy.all());
        if (res.verdict.kind !== 'equivalent') {
          throw new Error(`expected bisimulation, got divergence: ${res.verdict.difference.message}`);
        }
        expect(res.verdict.relation).toBe('bisimulation');
        // The equivalence carries a content-address (the replayable witness half).
        expect(res.verdict.digest).toMatch(/^fnv1a:/);
        expect(res.traceDigest).toBe(traceDigest(c.history));
      },
      TIMEOUT,
    );
  }
});

// ===========================================================================
// 2. EMISSIONPOLICY AXIS — divergent under {all}, reconciled under {distinct}.
//    This is the intentional delta Wave 6 resolves by CHOOSING {distinct}, not
//    a bug. Recorded, not forced.
// ===========================================================================

const EMISSION_AXIS: readonly BisimCase[] = [
  // Derived — the construction-time source-replay adds a leading republish the
  // kernel model does not; {distinct} collapses it.
  { primitive: 'derived', cfg: DERIVED, seed: 'initial-value', history: [op.subscribe('a'), op.read()] },
  { primitive: 'derived', cfg: DERIVED, seed: 'recompute-on-source', history: [op.subscribe('a'), op.set(5), op.read()] },
  { primitive: 'derived', cfg: DERIVED, seed: 'duplicate-source', history: [op.subscribe('a'), op.set(5), op.set(5), op.set(8), op.read()] },
  { primitive: 'derived', cfg: DERIVED, seed: 'subscriber-order', history: [op.subscribe('a'), op.subscribe('b'), op.set(5)] },
  { primitive: 'derived', cfg: DERIVED, seed: 'late-subscriber-replay', history: [op.subscribe('a'), op.set(5), op.subscribe('b'), op.read()] },
  // Timeline — the hand-rolled `newState !== oldState` dedup on the state channel.
  { primitive: 'timeline', cfg: TIMELINE, seed: 'duplicate-state-seek', history: [op.subscribe('a'), op.set(150), op.set(160), op.read()] },
];

describe('EmissionPolicy axis — divergent under {all}, equivalent under {distinct}', () => {
  for (const c of EMISSION_AXIS) {
    test(
      `${c.primitive} / ${c.seed}`,
      async () => {
        const model = modelFor(c.primitive, c.cfg);
        const impl = implFor(c.primitive);
        const underAll = await differential(model, impl, c.history, emissionPolicy.all());
        const underDistinct = await differential(model, impl, c.history, emissionPolicy.distinct());
        // Under the pinned no-dedup law {all}, the current transport diverges.
        expect(underAll.verdict.kind).toBe('divergent');
        // Under {distinct} the consecutive-equal collapse reconciles them.
        if (underDistinct.verdict.kind !== 'equivalent') {
          throw new Error(`expected {distinct} to reconcile ${c.primitive}/${c.seed}: ${underDistinct.verdict.difference.message}`);
        }
      },
      TIMEOUT,
    );
  }
});

// ===========================================================================
// 3. RESOLVED DELTAS + THE REMAINING ABOVE-KERNEL DELTA. The Effect transport's
//    two robust deltas (I5 nested-write, I6 subscribe-during-publish) are now
//    asserted POSITIVELY against the native CellKernel impl — the migration
//    resolved them per the Wave-6 rulings. The one delta that survives is above
//    the kernel channel (Derived recompute-teardown), pinned EXACTLY so a change
//    reds this suite.
// ===========================================================================

describe('nested-write ruling I5 (S6.F.2) — Cell/Store async-append PRESERVED, bisimulates the deferred model', () => {
  // RULING (scar S6.F.2): PRESERVE async-append (glitch-free / breadth-first).
  // The migrated Cell and Store ride CellKernel.replay1 with 'deferred', so a
  // nested write issued from a delivery handler is fanned out AFTER the outer
  // write reaches every subscriber → BOTH subscribers see [0,1,99] (every live
  // subscriber's terminal delivery equals read()). The model runs the SAME
  // 'deferred' arm, so the oracle proves the preserved I5 law POSITIVELY. This is
  // the flip the Foundation ruling anticipated ("§3 Cell/Store nested-write cases
  // from 'robust delta' to 'bisimulation holds'").
  for (const primitive of ['cell', 'store'] as const) {
    test(
      `${primitive} nested-write — the CellKernel-backed impl bisimulates the deferred model (both: [0,1,99])`,
      async () => {
        const history = [op.subscribe('a', [setOn(1, 99)]), op.subscribe('b'), op.set(1), op.read()];
        const model = modelFor(primitive, DEFERRED);
        const impl = implFor(primitive);
        const underAll = await differential(model, impl, history, emissionPolicy.all());
        if (underAll.verdict.kind !== 'equivalent') {
          throw new Error(`expected bisimulation (async-append preserved), got: ${underAll.verdict.difference.message}`);
        }
        expect(underAll.verdict.relation).toBe('bisimulation');
        // Both subscribers observe the same total order — a is [0,1,99], b is [0,1,99].
        expect(underAll.model.subscribers.map((s) => [s.sink, s.deliveries])).toEqual([
          ['a', [0, 1, 99]],
          ['b', [0, 1, 99]],
        ]);
        expect(underAll.impl.subscribers.map((s) => [s.sink, s.deliveries])).toEqual([
          ['a', [0, 1, 99]],
          ['b', [0, 1, 99]],
        ]);
      },
      TIMEOUT,
    );
  }
});

describe('mutation-during-notify I6 — subscribe-during-publish LIVE-set, bisimulates the model', () => {
  test(
    'Cell subscribe-during-publish — the mid-fan-out subscriber RECEIVES the in-flight value in BOTH model and native impl',
    async () => {
      // The kernel's replay-1 LIVE-set fan-out law (I6): 'late', attached
      // mid-fan-out of set(5) from a's delivery handler, RECEIVES the in-flight 5
      // → late=[5,5,6]. The native CellKernel transport honors this directly (the
      // synchronous fan-out visits the just-added registration). The OLD Effect
      // transport delivered through forked fibers, so 'late' MISSED the in-flight
      // value (snapshot → [5,6]) — a masked I6 VIOLATION the migration corrected.
      // The model is the SAME live-set law, so the oracle proves the native impl
      // bisimulates it POSITIVELY (and byte-matches the regenerated fixture).
      const history = [op.subscribe('a', [subOn(5, 'late')]), op.set(5), op.set(6), op.read()];
      const model = modelFor('cell', IDENTITY);
      const impl = implFor('cell');
      const underAll = await differential(model, impl, history, emissionPolicy.all());
      if (underAll.verdict.kind !== 'equivalent') {
        throw new Error(`expected I6 live-set bisimulation, got: ${underAll.verdict.difference.message}`);
      }
      expect(underAll.verdict.relation).toBe('bisimulation');
      // The mid-fan-out subscriber sees the in-flight 5 on BOTH sides.
      const lateModel = underAll.model.subscribers.find((s) => s.sink === 'late')?.deliveries;
      const lateImpl = underAll.impl.subscribers.find((s) => s.sink === 'late')?.deliveries;
      expect(lateModel).toEqual([5, 5, 6]);
      expect(lateImpl).toEqual([5, 5, 6]);
    },
    TIMEOUT,
  );
});

describe('remaining delta — Derived recompute-teardown (post-dispose read freezes)', () => {
  test(
    'Derived disposal — a post-dispose source set does NOT recompute the derived value (read diverges even under {distinct})',
    async () => {
      // Impl: dispose tears down the recompute pipeline, so set(9) after dispose
      // never reaches the derived → read stays 105. Model: the kernel slot keeps
      // updating → read is 109. Divergent even under {distinct} (a value, not a dup).
      const history = [op.subscribe('a'), op.set(5), op.dispose(), op.set(9), op.read()];
      const res = await differential(modelFor('derived', DERIVED), implFor('derived'), history, emissionPolicy.distinct());
      expect(res.verdict.kind).toBe('divergent');
      if (res.verdict.kind !== 'divergent') return;
      expect(res.verdict.difference.axis).toBe('reads');
      expect(res.verdict.difference.model).toEqual([109]);
      expect(res.verdict.difference.impl).toEqual([105]);
    },
    TIMEOUT,
  );
});

// ===========================================================================
// 4. SEEDED PROPERTY — random clean kernel histories bisimulate.
//    The generator stays inside the shared kernel vocabulary (subscribe /
//    unsubscribe / read / set / update; unique sinks; no dispose, no
//    during-delivery reactions), where the model is a faithful projection —
//    so this property is genuinely GREEN and exercises the oracle broadly.
// ===========================================================================

type CleanAction =
  | { readonly t: 'sub' }
  | { readonly t: 'unsub'; readonly k: number }
  | { readonly t: 'read' }
  | { readonly t: 'set'; readonly v: number }
  | { readonly t: 'update'; readonly transform: UpdateTransform };

const buildClean = (actions: readonly CleanAction[]): OpHistory => {
  const history: ReactiveOp[] = [];
  const live: string[] = [];
  let n = 0;
  for (const a of actions) {
    switch (a.t) {
      case 'sub': {
        const id = `s${n++}`;
        live.push(id);
        history.push(op.subscribe(id));
        break;
      }
      case 'unsub': {
        if (live.length > 0) {
          const idx = a.k % live.length;
          const id = live[idx]!;
          live.splice(idx, 1);
          history.push(op.unsubscribe(id));
        }
        break;
      }
      case 'read':
        history.push(op.read());
        break;
      case 'set':
        history.push(op.set(a.v));
        break;
      case 'update':
        history.push(op.update(a.transform));
        break;
    }
  }
  return history;
};

const transformArb: fc.Arbitrary<UpdateTransform> = fc.oneof(
  fc.integer({ min: -10, max: 10 }).map((n): UpdateTransform => ({ kind: 'add', n })),
  fc.integer({ min: -3, max: 3 }).map((n): UpdateTransform => ({ kind: 'mul', n })),
  fc.integer({ min: -20, max: 20 }).map((n): UpdateTransform => ({ kind: 'replace', n })),
  fc.constant<UpdateTransform>({ kind: 'identity' }),
);

const actionArb: fc.Arbitrary<CleanAction> = fc.oneof(
  fc.constant<CleanAction>({ t: 'sub' }),
  fc.nat({ max: 12 }).map((k): CleanAction => ({ t: 'unsub', k })),
  fc.constant<CleanAction>({ t: 'read' }),
  fc.integer({ min: -30, max: 30 }).map((v): CleanAction => ({ t: 'set', v })),
  transformArb.map((transform): CleanAction => ({ t: 'update', transform })),
);

const cleanHistoryArb: fc.Arbitrary<OpHistory> = fc.array(actionArb, { maxLength: 6 }).map(buildClean);

describe('seeded property — random clean kernel histories bisimulate (Cell, model ≡ native impl)', () => {
  test(
    'model ≡ native Cell over random shared-vocabulary histories ({all})',
    async () => {
      const model = modelFor('cell', IDENTITY);
      const impl = implFor('cell');
      await fc.assert(
        fc.asyncProperty(cleanHistoryArb, async (history) => {
          const res = await differential(model, impl, history, emissionPolicy.all());
          return res.verdict.kind === 'equivalent';
        }),
        { seed: 0xb15150, numRuns: 25 },
      );
    },
    scaledTimeout(120_000),
  );
});

// ===========================================================================
// 5. PLANT-A-DIVERGENCE — the oracle's OWN red-proof. An oracle never seen red
//    is decoration: hand it a deliberately-wrong impl (drops one delivery) and
//    prove it REDS, then that it SHRINKS the divergence to a minimal sequence.
// ===========================================================================

describe('PLANT-A-DIVERGENCE — the oracle reds on a dropped delivery and shrinks', () => {
  const history: OpHistory = [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()];

  test(
    'the correct impl is equivalent — the drop is the SOLE cause of divergence',
    async () => {
      const res = await differential(modelFor('cell', IDENTITY), implFor('cell'), history, emissionPolicy.all());
      expect(res.verdict.kind).toBe('equivalent');
    },
    TIMEOUT,
  );

  test(
    'a shim that drops one delivery makes the oracle RED (divergent)',
    async () => {
      const model = modelFor('cell', IDENTITY);
      const broken = withDroppedDelivery(implFor('cell'), { sink: 'a', index: 1 });
      const res = await differential(model, broken, history, emissionPolicy.all());
      expect(res.verdict.kind).toBe('divergent');
      if (res.verdict.kind !== 'divergent') return;
      expect(res.verdict.difference.axis).toBe('deliveries');
      expect(res.verdict.difference.sink).toBe('a');
    },
    TIMEOUT,
  );

  test(
    'shrinkDivergence reduces the red to a 1-minimal, content-addressed op sequence',
    async () => {
      const model = modelFor('cell', IDENTITY);
      const broken = withDroppedDelivery(implFor('cell'), { sink: 'a', index: 1 });
      const shrunk = await shrinkDivergence(model, broken, history, emissionPolicy.all());
      expect(shrunk.minimal.length).toBeLessThan(history.length);
      // The minimal divergence is exactly "subscribe then one set" — the shortest
      // history that has an index-1 delivery to drop.
      expect(shrunk.minimal.map((o) => o._tag)).toEqual(['subscribe', 'set']);
      expect(shrunk.result.verdict.kind).toBe('divergent');
      // Content-addressed by the canonical trace digest of the minimal history.
      expect(shrunk.traceDigest).toBe(traceDigest(shrunk.minimal));
    },
    TIMEOUT,
  );

  test(
    'shrinkDivergence refuses a passing history (a caller asking to shrink green is a bug)',
    async () => {
      await expect(
        shrinkDivergence(modelFor('cell', IDENTITY), implFor('cell'), history, emissionPolicy.all()),
      ).rejects.toThrow(/nothing to shrink/);
    },
    TIMEOUT,
  );
});

// ===========================================================================
// 6. DETERMINISM — the oracle is a pure function of (history, policy).
// ===========================================================================

describe('the oracle is a pure function of (history, policy)', () => {
  const history: OpHistory = [op.subscribe('a'), op.set(3), op.set(3), op.subscribe('b'), op.read()];

  test(
    'differential yields a stable verdict, digests, and normalized observations',
    async () => {
      const model = modelFor('cell', IDENTITY);
      const impl = implFor('cell');
      const r1 = await differential(model, impl, history, emissionPolicy.all());
      const r2 = await differential(model, impl, history, emissionPolicy.all());
      expect(r2.traceDigest).toBe(r1.traceDigest);
      expect(r2.verdict).toEqual(r1.verdict);
      expect(r2.model).toEqual(r1.model);
      expect(r2.impl).toEqual(r1.impl);
    },
    TIMEOUT,
  );

  test('the model side (runModelTrace) is pure — a double-run is byte-identical', () => {
    const a = runModelTrace(history, { ...IDENTITY, label: 'model:cell' });
    const b = runModelTrace(history, { ...IDENTITY, label: 'model:cell' });
    expect(b).toEqual(a);
  });
});
