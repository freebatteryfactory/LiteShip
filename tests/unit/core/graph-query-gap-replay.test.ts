// @vitest-environment node
/**
 * #133-full — graph-native gap replay via StateCell + DiscreteStateTransition
 * receipt chain + QUERY read-leg. Rewritten to the TRANSITION model: the dead
 * `discreteSignalPayloadsFromPatch` (which derived a state value from a
 * SignalNode content-address) is gone. Value arrives typed in the receipt.
 */
import { describe, test, expect } from 'vitest';
import { Effect } from 'effect';
import {
  GraphPatch,
  HLC,
  StateCellStore,
  StateName,
  chainPatchesBetween,
  graphQueryEtag,
  handleGraphQuery,
  replayDiscreteFromPatchReceipts,
  runGraphNativeGapReplay,
  transitionReceipt,
  type DiscreteStateTransition,
  type PatchReceiptEntry,
} from '../../../packages/core/src/index.js';
import { graph, node } from '../../helpers/graph-fixtures.js';

type Ids = ReturnType<typeof graph>['id'];

const mkTransition = (
  base: Ids,
  resultId: Ids,
  cell: string,
  next: string,
  generation: number,
): DiscreteStateTransition => ({
  _tag: 'DiscreteStateTransition',
  _version: 1,
  cell,
  next: StateName(next),
  generation,
  authority: 'graph',
  base,
  resultId,
  kind: 'discrete',
});

let clock = HLC.increment(HLC.create('test'), 1_000);
const nextTs = () => (clock = HLC.increment(clock, clock.wall_ms + 1));

/** Mint an attested entry linking onto `previousHash` with a strictly-advancing HLC. */
const mkEntry = async (transition: DiscreteStateTransition, previousHash?: string): Promise<PatchReceiptEntry> => {
  const receipt = await Effect.runPromise(
    transitionReceipt(transition, { timestamp: nextTs(), ...(previousHash ? { previous: previousHash } : {}) }),
  );
  return { receipt, transition };
};

/** base → mid → server, with two crossings on the `state` cell (alpha then beta). */
const scenario = async () => {
  const base = graph([node('a')]);
  const midPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b.signal') }]);
  const mid = GraphPatch.apply(base, midPatch);
  const tailPatch = GraphPatch.propose(mid, [{ op: 'add', family: 'signal', node: node('c.signal') }]);
  const server = GraphPatch.apply(mid, tailPatch);

  const t1 = mkTransition(base.id, mid.id, 'state', 'alpha', 1);
  const t2 = mkTransition(mid.id, server.id, 'state', 'beta', 2);
  const e1 = await mkEntry(t1);
  const e2 = await mkEntry(t2, e1.receipt.hash);
  return { base, mid, server, t1, t2, e1, e2 };
};

const freshStore = () => {
  const store = StateCellStore.create();
  store.register('state', ['a', 'alpha', 'beta'], { kind: 'discrete' });
  return store;
};

describe('graph-query gap replay — chain selection (#133-full)', () => {
  test('chainPatchesBetween walks transition entries from local base to server graph', async () => {
    const { base, mid, server, t1, t2, e1, e2 } = await scenario();
    const chain = chainPatchesBetween(base.id, server.id, [e1, e2]);
    expect(chain).toHaveLength(2);
    expect(chain[0]).toBe(t1);
    expect(chain[1]).toBe(t2);
    expect(chain[0]!.resultId).toBe(mid.id);
    expect(chain[1]!.resultId).toBe(server.id);
  });

  test('FORKED buffer: selects the branch that reaches the server graph, not buffer order', async () => {
    const base = graph([node('a')]);
    const midPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('live.mode') }]);
    const mid = GraphPatch.apply(base, midPatch);
    const tailPatch = GraphPatch.propose(mid, [{ op: 'add', family: 'signal', node: node('tail.mode') }]);
    const server = GraphPatch.apply(mid, tailPatch);
    const deadPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('dead.mode') }]);
    const dead = GraphPatch.apply(base, deadPatch);

    const deadT = mkTransition(base.id, dead.id, 'state', 'alpha', 1);
    const midT = mkTransition(base.id, mid.id, 'state', 'alpha', 1);
    const tailT = mkTransition(mid.id, server.id, 'state', 'beta', 2);

    // Dead fork FIRST in the buffer — insertion order must not win.
    const chain = chainPatchesBetween(base.id, server.id, [
      await mkEntry(deadT),
      await mkEntry(midT),
      await mkEntry(tailT),
    ]);
    expect(chain).toEqual([midT, tailT]);
    expect(chain).not.toContain(deadT);
  });

  test('PARTIAL buffer: a chain that never reaches the server graph is refused (empty)', async () => {
    const base = graph([node('a')]);
    const forkPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('fork.mode') }]);
    const fork = GraphPatch.apply(base, forkPatch);
    const unrelated = graph([node('b'), node('c')]);
    const chain = chainPatchesBetween(base.id, unrelated.id, [
      await mkEntry(mkTransition(base.id, fork.id, 'state', 'alpha', 1)),
    ]);
    expect(chain).toEqual([]);
  });

  test('layered fork DAG with no reaching branch completes in bounded time (cannot-reach memo)', () => {
    const mkFast = (base: string, result: string): PatchReceiptEntry => ({
      receipt: { kind: 'discrete-transition' } as PatchReceiptEntry['receipt'],
      transition: { base, resultId: result } as DiscreteStateTransition,
    });
    const entries: PatchReceiptEntry[] = [];
    let frontier = ['czap:base'];
    for (let depth = 0; depth < 12; depth++) {
      const next: string[] = [];
      for (const base of frontier) {
        const left = `czap:L${depth}-${base}-0`;
        const right = `czap:L${depth}-${base}-1`;
        entries.push(mkFast(base, left), mkFast(base, right));
        next.push(left, right);
      }
      frontier = next;
    }
    const start = performance.now();
    const chain = chainPatchesBetween('czap:base' as never, 'czap:unreachable' as never, entries);
    expect(chain).toEqual([]);
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe('graph-query gap replay — attested replay (#133-full)', () => {
  test('replayDiscreteFromPatchReceipts hydrates the highest-generation crossing per cell', async () => {
    const { base, server, e1, e2 } = await scenario();
    const store = freshStore();
    const applied: DiscreteStateTransition[] = [];
    const { replayedCells, transitions } = await replayDiscreteFromPatchReceipts({
      localBaseId: base.id,
      serverGraphId: server.id,
      entries: [e1, e2],
      cellStore: store,
      applyTransition: (t) => applied.push(t),
    });
    expect(replayedCells).toHaveLength(1);
    expect(replayedCells[0]!.kind).toBe('discrete');
    expect(store.snapshot('state')!.state).toBe('beta');
    expect(store.snapshot('state')!.generation).toBe(2);
    expect(transitions.map((t) => t.next)).toEqual(['beta']);
    expect(applied).toHaveLength(1);
  });

  test('runGraphNativeGapReplay queries, adopts, and replays discrete crossings', async () => {
    const { base, server, e1, e2 } = await scenario();
    const store = freshStore();
    let adopted: typeof server | undefined;
    const fetchImpl: typeof fetch = async () => {
      const result = await handleGraphQuery({}, { loadGraph: () => server });
      return { status: 200, json: async () => result } as Response;
    };
    const result = await runGraphNativeGapReplay({
      queryUrl: '/api/graph',
      localBase: base,
      entries: [e1, e2],
      cellStore: store,
      adopt: (next) => (adopted = next),
      fetchImpl,
    });
    expect(result.query.status).toBe('ok');
    expect(adopted?.id).toBe(server.id);
    expect(store.snapshot('state')!.state).toBe('beta');
    expect(result.transitions).toHaveLength(1);
  });

  test('not_modified still replays local transition-chain crossings', async () => {
    const { base, e1 } = await scenario();
    const store = freshStore();
    const fetchImpl: typeof fetch = async () =>
      ({
        status: 304,
        headers: new Headers({ etag: `"${graphQueryEtag(base)}"` }),
        json: async () => null,
      }) as Response;
    // localBase === serverGraphId on 304 → no branch bridges → nothing to replay.
    const result = await runGraphNativeGapReplay({
      queryUrl: '/api/graph',
      localBase: base,
      entries: [e1],
      cellStore: store,
      adopt: () => undefined,
      fetchImpl,
    });
    expect(result.query.status).toBe('not_modified');
    expect(result.transitions).toHaveLength(0);
  });
});

describe('graph-query gap replay — HOSTILE fixtures (Law 15)', () => {
  test('forged hash: a tampered receipt breaks the chain floor → nothing replayed', async () => {
    const { base, server, e1, e2 } = await scenario();
    const store = freshStore();
    // Tamper the second receipt's stored hash — hash self-consistency fails.
    const tampered: PatchReceiptEntry = { ...e2, receipt: { ...e2.receipt, hash: `${e2.receipt.hash}00` } };
    const { replayedCells, transitions } = await replayDiscreteFromPatchReceipts({
      localBaseId: base.id,
      serverGraphId: server.id,
      entries: [e1, tampered],
      cellStore: store,
    });
    expect(replayedCells).toEqual([]);
    expect(transitions).toEqual([]);
    // Law 15: byte-identical — the cell never left its registered default.
    expect(store.snapshot('state')!.state).toBe('a');
    expect(store.snapshot('state')!.generation).toBe(0);
  });

  test('wrong subject: a receipt whose subject names another cell is refused', async () => {
    const { base, mid, server } = await scenario();
    const store = freshStore();
    // Two transitions that FORM a valid graph branch, but the first receipt is
    // minted for a DIFFERENT cell than the transition it is paired with.
    const t1 = mkTransition(base.id, mid.id, 'state', 'alpha', 1);
    const t2 = mkTransition(mid.id, server.id, 'state', 'beta', 2);
    const wrongReceipt = await Effect.runPromise(
      transitionReceipt(mkTransition(base.id, mid.id, 'OTHER', 'x', 1), { timestamp: nextTs() }),
    );
    const e1: PatchReceiptEntry = { receipt: wrongReceipt, transition: t1 };
    const e2 = await mkEntry(t2, wrongReceipt.hash);
    const { transitions } = await replayDiscreteFromPatchReceipts({
      localBaseId: base.id,
      serverGraphId: server.id,
      entries: [e1, e2],
      cellStore: store,
    });
    expect(transitions).toEqual([]);
    expect(store.snapshot('state')!.state).toBe('a');
  });

  test('reordered / broken chain: HLC + previous continuity floor refuses replay', async () => {
    const { base, mid, server } = await scenario();
    const store = freshStore();
    const t1 = mkTransition(base.id, mid.id, 'state', 'alpha', 1);
    const t2 = mkTransition(mid.id, server.id, 'state', 'beta', 2);
    // e2 links onto a BOGUS previous (not e1.hash) → chain_break.
    const e1 = await mkEntry(t1);
    const e2 = await mkEntry(t2, 'sha256:not-a-real-predecessor');
    const { transitions } = await replayDiscreteFromPatchReceipts({
      localBaseId: base.id,
      serverGraphId: server.id,
      entries: [e1, e2],
      cellStore: store,
    });
    expect(transitions).toEqual([]);
    expect(store.snapshot('state')!.state).toBe('a');
  });

  test('unknown cell: a transition naming an unregistered cell is a loud no-op, not a throw', async () => {
    const { base, server } = await scenario();
    // Store WITHOUT the 'state' cell registered → applyTransition throws inside,
    // caught + diagnosed; the replay never throws through.
    const store = StateCellStore.create();
    store.register('other', ['x'], { kind: 'discrete' });
    const t1 = mkTransition(base.id, server.id, 'state', 'alpha', 1);
    const e1 = await mkEntry(t1);
    const { replayedCells, transitions } = await replayDiscreteFromPatchReceipts({
      localBaseId: base.id,
      serverGraphId: server.id,
      entries: [e1],
      cellStore: store,
    });
    expect(replayedCells).toEqual([]);
    expect(transitions).toEqual([]);
  });
});
