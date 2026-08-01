/**
 * Generative laws for head-preserving receipt-DAG pruning.
 *
 * Ground truth is constructed from explicit branch chains: every generated
 * terminal receipt is a live head before pruning, independent of the pruning
 * implementation's own linearization and retention choices.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DAG, HLC, Receipt } from '../../packages/core/src/index.js';
import type { ReceiptDAG, ReceiptEnvelope, ReceiptSubject } from '../../packages/core/src/index.js';

const subject = (id: string): ReceiptSubject => ({ type: 'effect', id });
const payload = (id: string) => ({ schema_hash: 'sha256:test', content_hash: `sha256:${id}` });

async function branchDag(lengths: readonly number[]): Promise<ReceiptDAG> {
  const root = await Receipt.createEnvelope(
    'op',
    subject('root'),
    payload('root'),
    HLC.increment(HLC.create('root-node'), 1_000),
    Receipt.GENESIS,
  );
  const envelopes: ReceiptEnvelope[] = [root];

  for (const [branchIndex, length] of lengths.entries()) {
    let previous = root.hash;
    let timestamp = HLC.create(`branch-${branchIndex}`);
    for (let depth = 0; depth < length; depth += 1) {
      timestamp = HLC.increment(timestamp, 2_000 + branchIndex * 100 + depth);
      const envelope = await Receipt.createEnvelope(
        'op',
        subject(`actor-${branchIndex}`),
        payload(`${branchIndex}-${depth}`),
        timestamp,
        previous,
      );
      envelopes.push(envelope);
      previous = envelope.hash;
    }
  }

  return DAG.fromReceipts(envelopes);
}

describe('pruneToBound is total over arbitrary fork DAGs', () => {
  it('retains every live head', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 1, max: 8 }),
        async (lengths, bound) => {
          const dag = await branchDag(lengths);
          const originalHeads = new Set(dag.heads);
          const pruned = DAG.pruneToBound(dag, bound);

          expect(new Set(pruned.heads)).toEqual(originalHeads);
          for (const head of originalHeads) expect(pruned.nodes.has(head)).toBe(true);
        },
      ),
      { seed: 0xda62b001, numRuns: 60 },
    );
  });

  it('never exceeds the larger of the requested bound and the live-head count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 1, max: 8 }),
        async (lengths, bound) => {
          const dag = await branchDag(lengths);
          const pruned = DAG.pruneToBound(dag, bound);

          expect(DAG.size(pruned)).toBeLessThanOrEqual(Math.max(bound, dag.heads.length));
        },
      ),
      { seed: 0xda62b002, numRuns: 60 },
    );
  });

  it('re-ingesting a pruned parent reconnects its retained child', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 3, max: 12 }), fc.integer({ min: 1, max: 2 }), async (length, bound) => {
        const chainDag = await branchDag([length]);
        const ordered = DAG.linearize(chainDag);
        const pruned = DAG.pruneToBound(chainDag, bound);
        const retainedChild = ordered.find((envelope) => {
          const parent = chainDag.nodes.get(envelope.hash)?.parents[0];
          return parent !== undefined && pruned.nodes.has(envelope.hash) && !pruned.nodes.has(parent);
        });
        expect(retainedChild).toBeDefined();

        const parentHash = chainDag.nodes.get(retainedChild!.hash)!.parents[0]!;
        const parent = chainDag.nodes.get(parentHash)!.envelope;
        const rewired = DAG.ingest(pruned, parent);

        expect(rewired.nodes.get(parentHash)?.children).toContain(retainedChild!.hash);
        expect(rewired.nodes.get(retainedChild!.hash)?.parents).toContain(parentHash);
        expect(rewired.heads).toEqual(pruned.heads);
      }),
      { seed: 0xda62b003, numRuns: 48 },
    );
  });
});
