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
import { DAG, Receipt, HLC, type ChainValidationError } from '@liteship/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const payload = { schema_hash: 'test', content_hash: 'test' };

/** Build a real linear receipt chain of `n` envelopes with strictly-increasing HLC. */
const buildLinearChain = (n: number, nodeId = 'node-a'): Promise<Receipt.Envelope[]> =>
  Receipt.buildChain(
    Array.from({ length: n }, (_, i) => ({
      kind: `step-${i}`,
      subject: { type: 'effect' as const, id: nodeId },
      payload,
      timestamp: { wall_ms: 1000 + i, counter: 0, node_id: nodeId } as HLC,
    })),
  );

/**
 * Await a validation expected to FAIL and return its typed error — the Promise-world
 * stand-in for the old `Effect.flip` (which surfaced the failure channel as the
 * success value). `validateChainDetailed` throws the plain tagged `ChainValidationError`
 * for a structural-floor violation; a hash-primitive `Error` (the defect channel)
 * still propagates, and an unexpected success throws so the test fails loudly.
 */
const flip = async (p: Promise<unknown>): Promise<ChainValidationError> => {
  try {
    await p;
  } catch (error) {
    if (error instanceof Error) throw error;
    return error as ChainValidationError;
  }
  throw new Error('expected validateChainDetailed to reject, but it resolved');
};

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
  test('a compacted tail needs BOTH base and a verified checkpoint (base alone is rejected)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 4, max: 12 }), fc.integer({ min: 1, max: 8 }), async (n, kRaw) => {
        const chain = await buildLinearChain(n);
        const k = kRaw % (n - 1); // watermark index in [0, n-2] so a tail survives
        const dag = DAG.fromReceipts(chain);
        const watermark = chain[k]!.hash;

        const { checkpoint, dropped } = await DAG.checkpoint(dag, { below: watermark });
        const droppedSet = new Set(dropped);
        const tail = chain.filter((e) => !droppedSet.has(e.hash));

        // No base: the retained tail's first envelope points at W, not GENESIS.
        const without = await flip(Receipt.validateChainDetailed(tail));
        // base WITHOUT a checkpoint is REJECTED — base alone proves nothing about
        // the omitted prefix, so it must not authorize a truncated chain (Codex #3).
        const baseAlone = await flip(Receipt.validateChainDetailed(tail, { base: watermark }));
        // base bound to the VERIFIED checkpoint authorizes the compacted tail.
        const bound = await Receipt.validateChainDetailed(tail, { base: watermark, checkpoint });

        return without.type === 'not_genesis' && baseAlone.type === 'checkpoint_invalid' && bound === true;
      }),
    );
  });

  test('the checkpoint validates standalone; a base without a checkpoint is rejected', async () => {
    const chain = await buildLinearChain(6);
    const dag = DAG.fromReceipts(chain);
    const watermark = chain[2]!.hash;
    const { checkpoint, dropped } = await DAG.checkpoint(dag, { below: watermark });
    const droppedSet = new Set(dropped);
    const tail = chain.filter((e) => !droppedSet.has(e.hash));

    // Genesis-shaped attestation validates as a single-element chain.
    expect(await Receipt.validateChain([checkpoint])).toBe(true);

    // A base with NO checkpoint to authorize it is rejected — wrong base or the
    // real watermark, base alone never proves the omitted prefix was compacted.
    const wrong = await flip(Receipt.validateChainDetailed(tail, { base: chain[0]!.hash }));
    expect(wrong.type).toBe('checkpoint_invalid');
  });

  test('a checkpoint whose subject.id does not commit the base fails checkpoint_invalid', async () => {
    const chain = await buildLinearChain(6);
    const dag = DAG.fromReceipts(chain);
    const watermark = chain[2]!.hash;
    const { checkpoint, dropped } = await DAG.checkpoint(dag, { below: watermark });
    const droppedSet = new Set(dropped);
    const tail = chain.filter((e) => !droppedSet.has(e.hash));

    // Real checkpoint (subject = liteship/checkpoint:W) bound to a different base.
    const mismatched = await flip(Receipt.validateChainDetailed(tail, { base: chain[1]!.hash, checkpoint }));
    expect(mismatched.type).toBe('checkpoint_invalid');

    // Correctly bound: passes.
    const bound = await Receipt.validateChainDetailed(tail, { base: watermark, checkpoint });
    expect(bound).toBe(true);
  });

  test('an empty chain cannot bypass checkpoint authorization', async () => {
    const chain = await buildLinearChain(6);
    const dag = DAG.fromReceipts(chain);
    const watermark = chain[2]!.hash;
    const { checkpoint } = await DAG.checkpoint(dag, { below: watermark });

    // Empty chain + base but NO checkpoint is rejected — the empty-chain fast path
    // runs AFTER checkpoint authorization, so an empty tail cannot launder a base.
    const noCheckpoint = await flip(Receipt.validateChainDetailed([], { base: watermark }));
    expect(noCheckpoint.type).toBe('checkpoint_invalid');

    // Empty chain with the verified checkpoint is vacuously valid; with no options
    // it stays trivially valid.
    expect(await Receipt.validateChainDetailed([], { base: watermark, checkpoint })).toBe(true);
    expect(await Receipt.validateChainDetailed([])).toBe(true);
  });

  test('a genesis-shaped receipt with a non-checkpoint kind does NOT authorize a compacted tail', async () => {
    const chain = await buildLinearChain(6);
    const dag = DAG.fromReceipts(chain);
    const watermark = chain[2]!.hash;
    const { dropped } = await DAG.checkpoint(dag, { below: watermark });
    const droppedSet = new Set(dropped);
    const tail = chain.filter((e) => !droppedSet.has(e.hash));

    // chain[0] is genesis-shaped with a VALID hash, but kind = "step-0", not
    // "checkpoint" — a non-checkpoint receipt must never authorize a compacted tail,
    // even when it otherwise mimics the attestation shape.
    const rejected = await flip(Receipt.validateChainDetailed(tail, { base: watermark, checkpoint: chain[0]! }));
    expect(rejected.type).toBe('checkpoint_invalid');
  });

  test('a checkpoint with the wrong subject.type does NOT authorize a compacted tail', async () => {
    const chain = await buildLinearChain(6);
    const dag = DAG.fromReceipts(chain);
    const watermark = chain[2]!.hash;
    const { checkpoint, dropped } = await DAG.checkpoint(dag, { below: watermark });
    const droppedSet = new Set(dropped);
    const tail = chain.filter((e) => !droppedSet.has(e.hash));

    // Identical kind / subject.id / payload / genesis shape as the real checkpoint,
    // but subject.type "effect" instead of the minted "run" — a structural forgery
    // must NOT authorize a truncated tail (bound to the minted shape).
    const forged = await Receipt.createEnvelope(
      'checkpoint',
      { type: 'effect', id: checkpoint.subject.id },
      checkpoint.payload,
      checkpoint.timestamp,
      checkpoint.previous,
    );
    const rejected = await flip(Receipt.validateChainDetailed(tail, { base: watermark, checkpoint: forged }));
    expect(rejected.type).toBe('checkpoint_invalid');
  });

  test('the verifyCheckpoint provenance seam rejects a forged checkpoint the structural floor accepts', async () => {
    // The residual limit (ADR-0026): the structural checks prove a checkpoint is
    // WELL-FORMED but not that it attests to the real dropped set — a compacted-tail
    // validator lacks that set, so it cannot recompute the summary content_hash. A
    // forger can therefore mint a genesis-shaped kind:"checkpoint" for an arbitrary
    // truncation point and authorize a MORE-truncated tail than was ever compacted.
    // The injected `verifyCheckpoint` capability closes it — engine owns the seam,
    // host owns the key. (Mirrors Greptile's T-Rex forgery repro.)
    const chain = await buildLinearChain(6);
    const truncateAt = chain[3]!.hash; // attacker claims everything <= chain[3] was compacted
    const tail = chain.slice(4); // tail[0] = chain[4], previous === truncateAt

    // Forged: correct shape (kind / subject.type / schema / genesis / subject.id),
    // a VALID self-hash, timestamp well below tail[0] — but NEVER produced by
    // DAG.checkpoint over a real dropped set.
    const [forged] = await Receipt.buildChain([
      {
        kind: 'checkpoint',
        subject: { type: 'run' as const, id: `liteship/checkpoint:${truncateAt}` },
        payload: { schema_hash: 'liteship/checkpoint-summary/v1', content_hash: 'fabricated' },
        timestamp: { wall_ms: 1, counter: 0, node_id: 'attacker' } as HLC,
      },
    ]);

    // (1) The structural floor ACCEPTS the forgery — the documented residual limit.
    expect(await Receipt.validateChainDetailed(tail, { base: truncateAt, checkpoint: forged! })).toBe(true);

    // (2) An injected provenance verifier that rejects it CLOSES the gap.
    const rejecting = await flip(
      Receipt.validateChainDetailed(tail, {
        base: truncateAt,
        checkpoint: forged!,
        verifyCheckpoint: () => Promise.resolve(false),
      }),
    );
    expect(rejecting.type).toBe('checkpoint_invalid');
    expect(rejecting.type === 'checkpoint_invalid' && rejecting.reason).toContain('provenance verifier');

    // (3) A verifier that attests provenance still accepts — the seam delegates the
    // trust decision to the host, it is not a blanket denial.
    expect(
      await Receipt.validateChainDetailed(tail, {
        base: truncateAt,
        checkpoint: forged!,
        verifyCheckpoint: () => Promise.resolve(true),
      }),
    ).toBe(true);

    // (4) The verifier receives the exact checkpoint under scrutiny (so a real
    // implementation can check its signature / recompute its summary).
    let seen: Receipt.Envelope | null = null;
    await Receipt.validateChainDetailed(tail, {
      base: truncateAt,
      checkpoint: forged!,
      verifyCheckpoint: (cp) => {
        seen = cp;
        return Promise.resolve(true);
      },
    });
    expect(seen).toBe(forged);
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

        const { dag: spliced, dropped } = await DAG.checkpoint(dag, { below: watermark });
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

        const { dag: spliced } = await DAG.checkpoint(dag, { below: watermark });

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
    const a1 = await Receipt.createEnvelope(
      'a1',
      { type: 'effect', id: 'a' },
      payload,
      { wall_ms: 2000, counter: 0, node_id: 'a' } as HLC,
      watermark,
    );
    const a2 = await Receipt.createEnvelope(
      'a2',
      { type: 'effect', id: 'a' },
      payload,
      { wall_ms: 2001, counter: 0, node_id: 'a' } as HLC,
      a1.hash,
    );
    const b1 = await Receipt.createEnvelope(
      'b1',
      { type: 'effect', id: 'b' },
      payload,
      { wall_ms: 2000, counter: 0, node_id: 'b' } as HLC,
      watermark,
    );
    const b2 = await Receipt.createEnvelope(
      'b2',
      { type: 'effect', id: 'b' },
      payload,
      { wall_ms: 2001, counter: 0, node_id: 'b' } as HLC,
      b1.hash,
    );
    const branch = { a1, a2, b1, b2 };
    const all = [...trunk, branch.a1, branch.a2, branch.b1, branch.b2];
    const dag = DAG.fromReceipts(all);

    expect(DAG.isFork(dag)).toBe(true); // heads a2, b2

    const { dag: spliced, checkpoint } = await DAG.checkpoint(dag, { below: watermark });

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

        const a = await DAG.checkpoint(forward, { below: watermark });
        const b = await DAG.checkpoint(reversed, { below: watermark });

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
    await expect(DAG.checkpoint(dag, { below: 'sha256:not-a-real-node' })).rejects.toThrow(
      /dag\.checkpoint\.unknown-watermark/,
    );
  });

  test('a non-dominated watermark throws', async () => {
    // G -> X -> W and G -> Y: Y is retained but its parent G is dropped and G !== W.
    const trunk = await buildLinearChain(3); // [G, X, W]
    const genesisHash = trunk[0]!.hash;
    const watermark = trunk[2]!.hash;
    const stray = await Receipt.createEnvelope(
      'y',
      { type: 'effect', id: 'y' },
      payload,
      { wall_ms: 1500, counter: 0, node_id: 'y' } as HLC,
      genesisHash,
    );
    const dag = DAG.fromReceipts([...trunk, stray]);
    await expect(DAG.checkpoint(dag, { below: watermark })).rejects.toThrow(/dag\.checkpoint\.not-dominated/);
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

        const { checkpoint, dropped } = await DAG.checkpoint(dag, { below: watermark });

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

// ---------------------------------------------------------------------------
// (H) the anti-fork rule survives compaction
// ---------------------------------------------------------------------------

describe('DAG.checkpoint — anti-fork survives compaction (H)', () => {
  test('a fork off a compacted watermark is still rejected (dropping W must not weaken fork detection)', async () => {
    const trunk = await buildLinearChain(3); // [G, X, W]
    const watermark = trunk[2]!.hash;

    // A single retained child of W by actor 'a' (dominance holds: the only edge
    // crossing the drop boundary lands on W).
    const c1 = await Receipt.createEnvelope(
      'c1',
      { type: 'effect', id: 'a' },
      payload,
      {
        wall_ms: 3000,
        counter: 0,
        node_id: 'a',
      } as HLC,
      watermark,
    );
    const dag = DAG.fromReceipts([...trunk, c1]);

    // A SECOND child of W by the same actor is a fork — detected pre-compaction.
    const c2 = await Receipt.createEnvelope(
      'c2',
      { type: 'effect', id: 'a' },
      payload,
      {
        wall_ms: 3001,
        counter: 0,
        node_id: 'a',
      } as HLC,
      watermark,
    );
    expect(DAG.checkForkRule(dag, c2)).not.toBeNull();

    // Compact below W: drops {G, X, W}, retains c1 as a now-rootless node whose
    // `previous` still names the dropped W.
    const { dag: spliced, dropped } = await DAG.checkpoint(dag, { below: watermark });
    expect(dropped).toContain(watermark);
    expect(spliced.nodes.has(watermark)).toBe(false);

    // The fork is STILL detected after W's node is gone: checkForkRule scans the
    // retained children that name the missing parent, so dropping a watermark does
    // not silently weaken the anti-fork rule. `merge` rejects it for the same reason.
    const violation = DAG.checkForkRule(spliced, c2);
    expect(violation).not.toBeNull();
    expect(violation?.existing).toBe(c1.hash);
    expect(() => DAG.merge(spliced, [c2])).toThrow(/dag\.anti-fork/);
  });
});
