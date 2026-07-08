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
