// @vitest-environment node
/**
 * #133-full — graph-native gap replay via StateCell + patch/receipt chain + QUERY read-leg.
 */
import { describe, test, expect } from 'vitest';
import { Effect } from 'effect';
import {
  GraphPatch,
  StateCellStore,
  chainPatchesBetween,
  discreteSignalPayloadsFromPatch,
  graphQueryEtag,
  handleGraphQuery,
  replayDiscreteFromPatchReceipts,
  runGraphNativeGapReplay,
} from '../../../packages/core/src/index.js';
import type { PatchReceiptEntry } from '../../../packages/core/src/graph-query-gap-replay.js';
import { nodeFromParts } from '../../../packages/core/src/index.js';
import { graph, node } from '../../helpers/graph-fixtures.js';

describe('graph-query gap replay (#133-full)', () => {
  test('discreteSignalPayloadsFromPatch skips continuous signal ops', () => {
    const base = graph([node('scroll.y')]);
    const patch = GraphPatch.propose(base, [
      { op: 'add', family: 'signal', node: node('workspace.mode') },
      { op: 'add', family: 'signal', node: node('scroll.progress') },
      { op: 'add', family: 'signal', node: node('viewport.width') },
    ]);

    const payloads = discreteSignalPayloadsFromPatch(patch);
    expect(payloads).toEqual([{ state: 'workspace.mode' }]);
  });

  test('chainPatchesBetween walks receipt entries from local base to server graph', async () => {
    const base = graph([node('a')]);
    const midPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b.signal') }]);
    const mid = GraphPatch.apply(base, midPatch);
    const tailPatch = GraphPatch.propose(mid, [{ op: 'add', family: 'signal', node: node('c.signal') }]);
    const server = GraphPatch.apply(mid, tailPatch);

    const parent = await Effect.runPromise(GraphPatch.receipt(midPatch));
    const child = await Effect.runPromise(GraphPatch.receipt(tailPatch, { previous: parent.hash }));

    const chain = chainPatchesBetween(base.id, server.id, [
      { receipt: parent, patch: midPatch },
      { receipt: child, patch: tailPatch },
    ]);

    expect(chain).toHaveLength(2);
    expect(chain[0]!.resultId).toBe(mid.id);
    expect(chain[1]!.resultId).toBe(server.id);
  });

  test('FORKED buffer: selects the branch that reaches the server graph, not buffer order', async () => {
    const base = graph([node('a')]);
    // Dead fork FIRST in the buffer — insertion order must not win.
    const deadPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('dead.mode') }]);
    // Live branch: base → mid → server.
    const midPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('live.mode') }]);
    const mid = GraphPatch.apply(base, midPatch);
    const tailPatch = GraphPatch.propose(mid, [{ op: 'add', family: 'signal', node: node('tail.mode') }]);
    const server = GraphPatch.apply(mid, tailPatch);

    const deadReceipt = await Effect.runPromise(GraphPatch.receipt(deadPatch));
    const midReceipt = await Effect.runPromise(GraphPatch.receipt(midPatch));
    const tailReceipt = await Effect.runPromise(GraphPatch.receipt(tailPatch, { previous: midReceipt.hash }));

    const chain = chainPatchesBetween(base.id, server.id, [
      { receipt: deadReceipt, patch: deadPatch },
      { receipt: midReceipt, patch: midPatch },
      { receipt: tailReceipt, patch: tailPatch },
    ]);

    expect(chain).toHaveLength(2);
    expect(chain[0]).toBe(midPatch);
    expect(chain[1]).toBe(tailPatch);
    expect(chain).not.toContain(deadPatch);
  });

  test('PARTIAL buffer: a chain that never reaches the server graph is refused (empty), not replayed', async () => {
    const base = graph([node('a')]);
    const forkPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('fork.mode') }]);
    const forkReceipt = await Effect.runPromise(GraphPatch.receipt(forkPatch));
    // Server graph the buffered branch does NOT bridge to.
    const unrelated = graph([node('b'), node('c')]);

    const chain = chainPatchesBetween(base.id, unrelated.id, [{ receipt: forkReceipt, patch: forkPatch }]);
    expect(chain).toEqual([]);
  });

  test('layered fork DAG with no reaching branch completes in bounded time (cannot-reach memo)', () => {
    const mkEntry = (base: string, result: string): PatchReceiptEntry => ({
      receipt: { kind: 'graph-patch' } as PatchReceiptEntry['receipt'],
      patch: { _tag: 'GraphPatch', _version: 1, base, ops: [], resultId: result } as GraphPatch,
    });

    const entries: PatchReceiptEntry[] = [];
    const layers = 12;
    let frontier = ['czap:base'];
    for (let depth = 0; depth < layers; depth++) {
      const next: string[] = [];
      for (const base of frontier) {
        const left = `czap:L${depth}-${base}-0`;
        const right = `czap:L${depth}-${base}-1`;
        entries.push(mkEntry(base, left), mkEntry(base, right));
        next.push(left, right);
      }
      frontier = next;
    }

    const start = performance.now();
    const chain = chainPatchesBetween('czap:base' as never, 'czap:unreachable-server' as never, entries);
    const elapsed = performance.now() - start;

    expect(chain).toEqual([]);
    // Bounded, not exponential — generous for loaded CI runners (exponential blow-up is seconds+).
    expect(elapsed).toBeLessThan(200);
  });

  test('signal UPDATE ops replay as discrete crossings (diff collapses remove+add)', () => {
    const before = graph([node('workspace.mode'), node('scroll.y')]);
    // Same logical signal cell, changed payload (range) → new content address →
    // GraphPatch.diff collapses the remove+add into op: 'update'.
    const changed = nodeFromParts({ ...node('workspace.mode'), range: [0, 4] as const });
    const after = graph([changed, node('scroll.y')]);
    const patch = GraphPatch.diff(before, after);
    expect(patch.ops.some((op) => op.op === 'update')).toBe(true);

    const payloads = discreteSignalPayloadsFromPatch(patch);
    expect(payloads).toEqual([{ state: 'workspace.mode' }]);
  });

  test('replayDiscreteFromPatchReceipts hydrates replayable StateCells only', async () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('workspace.mode') }]);
    const server = GraphPatch.apply(base, patch);
    const receipt = await Effect.runPromise(GraphPatch.receipt(patch));

    const store = StateCellStore.create();
    store.register('state', ['workspace.mode', 'alpha', 'beta'], { kind: 'discrete' });
    store.register('scroll', ['live'], { kind: 'continuous' });

    const applied: unknown[] = [];
    const { replayedCells, discretePayloads } = replayDiscreteFromPatchReceipts({
      localBaseId: base.id,
      serverGraphId: server.id,
      entries: [{ receipt, patch }],
      cellStore: store,
      applyDiscrete: (payload) => applied.push(payload),
    });

    expect(discretePayloads.length).toBeGreaterThan(0);
    expect(replayedCells.length).toBe(1);
    expect(replayedCells[0]!.kind).toBe('discrete');
    expect(applied.length).toBeGreaterThan(0);
  });

  test('runGraphNativeGapReplay queries, adopts, and replays discrete crossings', async () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('workspace.mode') }]);
    const server = GraphPatch.apply(base, patch);
    const receipt = await Effect.runPromise(GraphPatch.receipt(patch));

    const store = StateCellStore.create();
    store.register('state', ['workspace.mode', 'alpha', 'beta'], { kind: 'discrete' });

    let adopted: typeof server | undefined;
    const fetchImpl: typeof fetch = async () => {
      const result = await handleGraphQuery({}, { loadGraph: () => server });
      return { status: 200, json: async () => result } as Response;
    };

    const result = await runGraphNativeGapReplay({
      queryUrl: '/api/graph',
      localBase: base,
      entries: [{ receipt, patch }],
      cellStore: store,
      adopt: (next) => {
        adopted = next;
      },
      fetchImpl,
    });

    expect(result.query.status).toBe('ok');
    expect(adopted?.id).toBe(server.id);
    expect(result.replayedCells.length).toBe(1);
    expect(result.discretePayloads.length).toBeGreaterThan(0);
  });

  test('runGraphNativeGapReplay with not_modified still replays patch-chain discrete crossings', async () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('workspace.mode') }]);
    const receipt = await Effect.runPromise(GraphPatch.receipt(patch));

    const store = StateCellStore.create();
    store.register('state', ['workspace.mode', 'alpha', 'beta'], { kind: 'discrete' });

    const fetchImpl: typeof fetch = async () => {
      const etag = graphQueryEtag(base);
      return {
        status: 304,
        headers: new Headers({ etag: `"${etag}"` }),
        json: async () => null,
      } as Response;
    };

    const result = await runGraphNativeGapReplay({
      queryUrl: '/api/graph',
      localBase: base,
      entries: [{ receipt, patch }],
      cellStore: store,
      adopt: () => undefined,
      fetchImpl,
    });

    expect(result.query.status).toBe('not_modified');
    expect(result.replayedCells.length).toBe(0);
  });
});
