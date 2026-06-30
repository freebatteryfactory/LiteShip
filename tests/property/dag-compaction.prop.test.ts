/**
 * Property test: DAG compaction (drop-only checkpoints).
 *
 * `DAG.checkpoint` reclaims a watermark and its ancestors WITHOUT re-pointing any
 * retained node's content-addressed parents. The spliced DAG must equal a fresh
 * reload of the survivors, the retained tail must validate against the checkpoint
 * watermark, structure above the watermark must be invariant, and the checkpoint
 * attestation must be replica-deterministic.
 *
 * Mirrors `tests/property/dag.prop.test.ts`; chains are built via
 * `Receipt.buildChain` with strictly-increasing HLC so identity is real (no
 * hand-stamped hashes — the watermark is a genuine SHA-256 content address).
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { Effect } from 'effect';
import { DAG, Receipt, HLC } from '@czap/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const payload = { schema_hash: 'test', content_hash: 'test' };

/** Build a real linear receipt chain of `n` envelopes with strictly-increasing HLC. */
const buildLinearChain = (n: number, nodeId = 'node-a'): Promise<Receipt.Envelope[]> =>
  Effect.runPromise(
    Receipt.buildChain(
      Array.from({ length: n }, (_, i) => ({
        kind: `step-${i}`,
        subject: { type: 'effect' as const, id: nodeId },
        payload,
        timestamp: { wall_ms: 1000 + i, counter: 0, node_id: nodeId } as HLC.Shape,
      })),
    ),
  );

/** Structural fingerprint of a DAG, order-insensitive (sets), for reload round-trip equality. */
const fingerprint = (dag: DAG.Graph) => ({
  hashes: new Set(dag.nodes.keys()),
  parents: new Map([...dag.nodes].map(([h, n]) => [h, new Set(n.parents)])),
  children: new Map([...dag.nodes].map(([h, n]) => [h, new Set(n.children)])),
  heads: new Set(dag.heads),
  genesis: dag.genesis,
});

// ---------------------------------------------------------------------------
// (A) boundary validation
// ---------------------------------------------------------------------------

describe('DAG.checkpoint — boundary validation (A)', () => {
  test('bare retained tail fails not_genesis without a base; passes with { base: W }', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 4, max: 12 }), fc.integer({ min: 1, max: 8 }), async (n, kRaw) => {
        const chain = await buildLinearChain(n);
        const k = kRaw % (n - 1); // watermark index in [0, n-2] so a tail survives
        const dag = DAG.fromReceipts(chain);
        const watermark = chain[k]!.hash;

        const { dropped } = await Effect.runPromise(DAG.checkpoint(dag, { below: watermark }));
        const droppedSet = new Set(dropped);
        const tail = chain.filter((e) => !droppedSet.has(e.hash));

        // The retained tail's first envelope points at W, not GENESIS.
        const without = await Effect.runPromise(Receipt.validateChainDetailed(tail).pipe(Effect.flip));
        const withBase = await Effect.runPromise(Receipt.validateChainDetailed(tail, { base: watermark }));

        return without.type === 'not_genesis' && withBase === true;
      }),
    );
  });

  test('the checkpoint validates standalone; a wrong base still fails not_genesis', async () => {
    const chain = await buildLinearChain(6);
    const dag = DAG.fromReceipts(chain);
    const watermark = chain[2]!.hash;
    const { checkpoint, dropped } = await Effect.runPromise(DAG.checkpoint(dag, { below: watermark }));
    const droppedSet = new Set(dropped);
    const tail = chain.filter((e) => !droppedSet.has(e.hash));

    // Genesis-shaped attestation validates as a single-element chain.
    expect(await Effect.runPromise(Receipt.validateChain([checkpoint]))).toBe(true);

    // A base that is NOT the tail's actual predecessor does not satisfy the predicate.
    const wrong = await Effect.runPromise(
      Receipt.validateChainDetailed(tail, { base: chain[0]!.hash }).pipe(Effect.flip),
    );
    expect(wrong.type).toBe('not_genesis');
  });

  test('a checkpoint whose subject.id does not commit the base fails checkpoint_invalid', async () => {
    const chain = await buildLinearChain(6);
    const dag = DAG.fromReceipts(chain);
    const watermark = chain[2]!.hash;
    const { checkpoint, dropped } = await Effect.runPromise(DAG.checkpoint(dag, { below: watermark }));
    const droppedSet = new Set(dropped);
    const tail = chain.filter((e) => !droppedSet.has(e.hash));

    // Real checkpoint (subject = czap/checkpoint:W) bound to a different base.
    const mismatched = await Effect.runPromise(
      Receipt.validateChainDetailed(tail, { base: chain[1]!.hash, checkpoint }).pipe(Effect.flip),
    );
    expect(mismatched.type).toBe('checkpoint_invalid');

    // Correctly bound: passes.
    const bound = await Effect.runPromise(Receipt.validateChainDetailed(tail, { base: watermark, checkpoint }));
    expect(bound).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (B) reload round-trip
// ---------------------------------------------------------------------------

describe('DAG.checkpoint — reload round-trip (B)', () => {
  test('spliced DAG deep-equals fromReceipts(retained)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 14 }), fc.integer({ min: 1, max: 12 }), async (n, kRaw) => {
        const chain = await buildLinearChain(n);
        const k = kRaw % (n - 1);
        const dag = DAG.fromReceipts(chain);
        const watermark = chain[k]!.hash;

        const { dag: spliced, dropped } = await Effect.runPromise(DAG.checkpoint(dag, { below: watermark }));
        const droppedSet = new Set(dropped);
        const retained = chain.filter((e) => !droppedSet.has(e.hash));
        const reloaded = DAG.fromReceipts(retained);

        expect(fingerprint(spliced)).toEqual(fingerprint(reloaded));
        // The old root is gone, so genesis collapses to null.
        expect(spliced.genesis).toBeNull();
        return true;
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// (C) tail-identity
// ---------------------------------------------------------------------------

describe('DAG.checkpoint — tail identity (C)', () => {
  test('linearize(spliced) === linearizeFrom(original, W)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 14 }), fc.integer({ min: 1, max: 12 }), async (n, kRaw) => {
        const chain = await buildLinearChain(n);
        const k = kRaw % (n - 1);
        const dag = DAG.fromReceipts(chain);
        const watermark = chain[k]!.hash;

        const { dag: spliced } = await Effect.runPromise(DAG.checkpoint(dag, { below: watermark }));

        const fromSpliced = DAG.linearize(spliced).map((e) => e.hash);
        const fromOriginal = DAG.linearizeFrom(dag, watermark).map((e) => e.hash);
        return JSON.stringify(fromSpliced) === JSON.stringify(fromOriginal);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// (D) ancestor / fork invariance above W (forked retained region)
// ---------------------------------------------------------------------------

describe('DAG.checkpoint — structural invariance above W (D)', () => {
  test('isAncestor/isFork preserved; collapsed LCA -> null; checkpoint is not an ancestor', async () => {
    // G -> X -> W, then two retained branches off W (dominance holds: only edge
    // crossing the drop boundary lands on W).
    const trunk = await buildLinearChain(3); // [G, X, W]
    const watermark = trunk[2]!.hash;
    const branch = await Effect.runPromise(
      Effect.gen(function* () {
        const a1 = yield* Receipt.createEnvelope('a1', { type: 'effect', id: 'a' }, payload,
          { wall_ms: 2000, counter: 0, node_id: 'a' } as HLC.Shape, watermark);
        const a2 = yield* Receipt.createEnvelope('a2', { type: 'effect', id: 'a' }, payload,
          { wall_ms: 2001, counter: 0, node_id: 'a' } as HLC.Shape, a1.hash);
        const b1 = yield* Receipt.createEnvelope('b1', { type: 'effect', id: 'b' }, payload,
          { wall_ms: 2000, counter: 0, node_id: 'b' } as HLC.Shape, watermark);
        const b2 = yield* Receipt.createEnvelope('b2', { type: 'effect', id: 'b' }, payload,
          { wall_ms: 2001, counter: 0, node_id: 'b' } as HLC.Shape, b1.hash);
        return { a1, a2, b1, b2 };
      }),
    );
    const all = [...trunk, branch.a1, branch.a2, branch.b1, branch.b2];
    const dag = DAG.fromReceipts(all);

    expect(DAG.isFork(dag)).toBe(true); // heads a2, b2

    const { dag: spliced, checkpoint } = await Effect.runPromise(DAG.checkpoint(dag, { below: watermark }));

    // Fork preserved (two heads survive).
    expect(DAG.isFork(spliced)).toBe(true);

    // Retained ancestor relations unchanged.
    expect(DAG.isAncestor(spliced, branch.a1.hash, branch.a2.hash)).toBe(
      DAG.isAncestor(dag, branch.a1.hash, branch.a2.hash),
    );
    expect(DAG.isAncestor(spliced, branch.a1.hash, branch.a2.hash)).toBe(true);

    // Original LCA of a2,b2 was W; after compaction the shared ancestor is gone.
    expect(DAG.commonAncestor(dag, branch.a2.hash, branch.b2.hash)).toBe(watermark);
    expect(DAG.commonAncestor(spliced, branch.a2.hash, branch.b2.hash)).toBeNull();

    // The checkpoint is a sibling-root attestation, never an ancestor of a survivor.
    expect(DAG.isAncestor(spliced, checkpoint.hash, branch.a2.hash)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (E) replica determinism
// ---------------------------------------------------------------------------

describe('DAG.checkpoint — replica determinism (E)', () => {
  test('two ingest orderings + same W mint a byte-identical checkpoint', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 12 }), fc.integer({ min: 1, max: 10 }), async (n, kRaw) => {
        const chain = await buildLinearChain(n);
        const k = kRaw % (n - 1);
        const watermark = chain[k]!.hash;

        const forward = DAG.fromReceipts(chain);
        const reversed = DAG.fromReceipts([...chain].reverse());

        const a = await Effect.runPromise(DAG.checkpoint(forward, { below: watermark }));
        const b = await Effect.runPromise(DAG.checkpoint(reversed, { below: watermark }));

        return (
          a.checkpoint.hash === b.checkpoint.hash &&
          a.checkpoint.subject.id === b.checkpoint.subject.id &&
          JSON.stringify(a.checkpoint.timestamp) === JSON.stringify(b.checkpoint.timestamp) &&
          JSON.stringify([...a.dropped].sort()) === JSON.stringify([...b.dropped].sort())
        );
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// (F) preconditions
// ---------------------------------------------------------------------------

describe('DAG.checkpoint — preconditions (F)', () => {
  test('unknown watermark throws', async () => {
    const chain = await buildLinearChain(4);
    const dag = DAG.fromReceipts(chain);
    await expect(
      Effect.runPromise(DAG.checkpoint(dag, { below: 'sha256:not-a-real-node' })),
    ).rejects.toThrow(/dag\.checkpoint\.unknown-watermark/);
  });

  test('a non-dominated watermark throws', async () => {
    // G -> X -> W and G -> Y: Y is retained but its parent G is dropped and G !== W.
    const trunk = await buildLinearChain(3); // [G, X, W]
    const genesisHash = trunk[0]!.hash;
    const watermark = trunk[2]!.hash;
    const stray = await Effect.runPromise(
      Receipt.createEnvelope('y', { type: 'effect', id: 'y' }, payload,
        { wall_ms: 1500, counter: 0, node_id: 'y' } as HLC.Shape, genesisHash),
    );
    const dag = DAG.fromReceipts([...trunk, stray]);
    await expect(
      Effect.runPromise(DAG.checkpoint(dag, { below: watermark })),
    ).rejects.toThrow(/dag\.checkpoint\.not-dominated/);
  });
});

// ---------------------------------------------------------------------------
// (G) max-HLC
// ---------------------------------------------------------------------------

describe('DAG.checkpoint — causal stamp (G)', () => {
  test('checkpoint timestamp is the HLC-max over the dropped envelopes', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 14 }), fc.integer({ min: 1, max: 12 }), async (n, kRaw) => {
        const chain = await buildLinearChain(n);
        const k = kRaw % (n - 1);
        const dag = DAG.fromReceipts(chain);
        const watermark = chain[k]!.hash;

        const { checkpoint, dropped } = await Effect.runPromise(DAG.checkpoint(dag, { below: watermark }));

        // The HLC-max over a strictly-increasing linear prefix is the watermark itself.
        const droppedEnvelopes = chain.filter((e) => dropped.includes(e.hash));
        let max = droppedEnvelopes[0]!.timestamp;
        for (const e of droppedEnvelopes) if (HLC.compare(e.timestamp, max) > 0) max = e.timestamp;

        return (
          JSON.stringify(checkpoint.timestamp) === JSON.stringify(max) &&
          JSON.stringify(checkpoint.timestamp) === JSON.stringify(chain[k]!.timestamp)
        );
      }),
    );
  });
});
