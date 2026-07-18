/**
 * reactive-conformance — the cross-transport DIFFERENTIAL ORACLE, driven
 * (Wave 5.5, CAGE-A). RED-FIRST: the oracle is PROVEN to red before it is
 * trusted green (the PLANT-A-DIVERGENCE self-test below — an oracle never seen
 * red is decoration).
 *
 * This suite runs `tests/support/reactive-oracle.ts` over the CURRENT
 * Effect-backed primitives (`reactive-capture.ts` adapters) AND the law-derived
 * reference model (`reactive-model.ts` via the oracle's model side), over ONE
 * op history, and asserts observational equivalence — a BISIMULATION
 * (constitution §3). It establishes the Wave-6 BASELINE: it PROVES the relation
 * where it holds and RECORDS the intentional deltas where it does not, WITHOUT
 * forcing either side (the Wave-6 EmissionPolicy / coupling decisions resolve
 * the deltas). The SAME oracle + SAME model re-run in Wave 6 with the impl side
 * flipped to CellKernel-backed primitives.
 *
 * The relation the current impl exhibits, captured (not concluded):
 *   • BISIMULATION HOLDS under {all} for Cell / Store / Signal / LiveCell-value
 *     / Timeline (non-consecutive-equal seeks) — the kernel model is a faithful
 *     projection of the current transport on the shared vocabulary.
 *   • EMISSIONPOLICY AXIS: Derived (construction-time source-replay republish)
 *     and Timeline (hand-rolled state dedup) are divergent under {all},
 *     equivalent under {distinct} — the exact tolerance Wave 6 chooses.
 *   • ROBUST DELTAS (divergent under BOTH policies — Wave 6 must PIN, not
 *     policy-resolve): the reentrancy law I5 (a nested write is synchronous in
 *     the kernel model, async-appended in the current Effect impl → a delivery
 *     REORDERING) and Derived's recompute-teardown on dispose (post-dispose
 *     read freezes). These are the intentional-delta ledger for Wave 6.
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
// Cell / LiveCell-value ride the 'deferred' reentrancy arm (Wave 6 nested-write
// RULING — PRESERVE async-append; scar S6.F.2). The model runs 'deferred' so the
// oracle asserts that law POSITIVELY (model ≡ CellKernel-backed impl) rather than
// merely recording a sync-model-vs-async-impl divergence.
const CELL_DEFERRED: ModelConfig = { channel: 'replay1', initialRaw: 0, reentrancy: 'deferred' };

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
// 1. BISIMULATION HOLDS — model ≡ current Effect impl, up to {all}.
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

describe('bisimulation holds — reference model ≡ current Effect impl (up to {all})', () => {
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
// 3. ROBUST DELTAS — divergent under BOTH policies. The intentional-delta
//    LEDGER for Wave 6: pinned EXACTLY so a Wave-6 change reds this suite and
//    forces a deliberate ledger update (record, do not force either side).
// ===========================================================================

describe('nested-write ruling (S6.F.2) — Cell async-append PRESERVED, bisimulates a deferred model', () => {
  test(
    'Cell nested-write — the CellKernel-backed impl bisimulates the deferred model (b: [0,1,99])',
    async () => {
      // RULING (scar S6.F.2): PRESERVE async-append (glitch-free / breadth-first).
      // The migrated Cell uses CellKernel.replay1 with 'deferred', so a set(99)
      // issued from a delivery handler is fanned out AFTER the outer set(1) reaches
      // every subscriber → BOTH a and b see [0,1,99] (every live subscriber's
      // terminal delivery equals read()). The model runs the SAME 'deferred' arm,
      // so the oracle proves the preserved law POSITIVELY (bisimulation holds).
      const history = [op.subscribe('a', [setOn(1, 99)]), op.subscribe('b'), op.set(1), op.read()];
      const model = modelFor('cell', CELL_DEFERRED);
      const impl = implFor('cell');
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
});

describe('recorded delta — reentrancy law I5 (nested write: sync-nested model vs async-appended impl)', () => {
  test(
    'Store nested-dispatch — the same I5 reordering on the reducer channel',
    async () => {
      const history = [op.subscribe('a', [setOn(1, 99)]), op.subscribe('b'), op.set(1), op.read()];
      const underAll = await differential(modelFor('store', IDENTITY), implFor('store'), history, emissionPolicy.all());
      expect(underAll.verdict.kind).toBe('divergent');
      if (underAll.verdict.kind !== 'divergent') return;
      expect(underAll.verdict.difference.sink).toBe('b');
      expect(underAll.verdict.difference.model).toEqual([0, 99, 1]);
      expect(underAll.verdict.difference.impl).toEqual([0, 1, 99]);
    },
    TIMEOUT,
  );
});

describe('recorded delta — mutation-during-notify I6 (subscribe-during-publish: live-set model vs snapshot impl)', () => {
  test(
    'Cell subscribe-during-publish — the mid-fan-out subscriber receives the in-flight value in the model, misses it in the impl',
    async () => {
      // Model replay-1 LIVE-set (I6): 'late', attached mid-fan-out of set(5),
      // RECEIVES the in-flight 5 → late=[5,5,6]. Impl SNAPSHOT: 'late' MISSES it
      // → late=[5,6]. Under {distinct} the consecutive-equal 5 collapses, MASKING
      // the root difference — a subtlety Wave 6 must decide deliberately.
      const history = [op.subscribe('a', [subOn(5, 'late')]), op.set(5), op.set(6), op.read()];
      const model = modelFor('cell', IDENTITY);
      const impl = implFor('cell');
      const underAll = await differential(model, impl, history, emissionPolicy.all());
      const underDistinct = await differential(model, impl, history, emissionPolicy.distinct());
      expect(underAll.verdict.kind).toBe('divergent');
      expect(underDistinct.verdict.kind).toBe('equivalent'); // masked by the collapse
      if (underAll.verdict.kind !== 'divergent') return;
      const d = underAll.verdict.difference;
      expect(d.sink).toBe('late');
      expect(d.model).toEqual([5, 5, 6]);
      expect(d.impl).toEqual([5, 6]);
    },
    TIMEOUT,
  );
});

describe('recorded delta — Derived recompute-teardown (post-dispose read freezes)', () => {
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

describe('seeded property — random clean kernel histories bisimulate (Cell, model ≡ Effect impl)', () => {
  test(
    'model ≡ current Cell over random shared-vocabulary histories ({all})',
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
