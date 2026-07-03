// @vitest-environment node
/**
 * The client→server mutation channel — the return leg of the stream.
 *
 * Proves the round-trip: a client-proposed GraphPatch, serialized over the wire and
 * decoded server-side, is VALIDATED against the server's own truth before it can
 * apply. A valid patch advances the store to the new sealed graph; a patch cast
 * against a stale base, or a malformed envelope, is REFUSED and the store is
 * byte-identical — the same refuse-seam the AI cast enforces, now bidirectional.
 */
import { describe, test, expect } from 'vitest';
import { GraphPatch, sealNode, sealGraph, handleGraphMutation, sendGraphMutation } from '../../../packages/core/src/index.js';
import type {
  DocumentGraph,
  DocumentGraphNode,
  DocumentGraphEdge,
  SignalNode,
  CellMeta,
  GraphStore,
} from '../../../packages/core/src/index.js';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

const node = (input: string): SignalNode =>
  sealNode({ _tag: 'DocGraphSignalNode', _version: 1, family: 'signal', id: '', meta: META, input } as unknown as SignalNode);

const graph = (nodes: DocumentGraphNode[], edges: DocumentGraphEdge[] = []): DocumentGraph =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<DocumentGraph, 'id' | 'digest'>);

/** An in-memory host graph store — the authority boundary, with a save counter. */
function memStore(initial: DocumentGraph): GraphStore & { current: DocumentGraph; saves: number } {
  const store = {
    current: initial,
    saves: 0,
    loadGraph: () => store.current,
    saveGraph: (graphToSave: DocumentGraph) => {
      store.current = graphToSave;
      store.saves += 1;
    },
  };
  return store;
}

/** Serialize a patch the way a client would put it on the wire, then parse it back as untrusted `unknown`. */
const overTheWire = (patch: GraphPatch): unknown => JSON.parse(JSON.stringify(patch));

describe('graph mutation channel — handleGraphMutation (server)', () => {
  test('a valid patch APPLIES — the store advances to the new re-addressed graph, saved once', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('viewport.width') }]);

    const res = await handleGraphMutation({ patch: overTheWire(patch) }, store);

    expect(res.status).toBe('applied');
    if (res.status !== 'applied') throw new Error('expected applied');
    expect(res.graph.nodes.length).toBe(2);
    expect(res.graph.id).not.toBe(base.id); // content re-addressed
    expect(store.current.id).toBe(res.graph.id); // persisted
    expect(store.saves).toBe(1);
  });

  test('a patch cast against a STALE/different base is REFUSED — graph byte-identical, no save', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);
    // Proposed against a DIFFERENT graph → patch.base !== server graph.id (stale write).
    const stale = GraphPatch.propose(graph([node('other.graph')]), [{ op: 'add', family: 'signal', node: node('x') }]);

    const res = await handleGraphMutation({ patch: overTheWire(stale) }, store);

    expect(res.status).toBe('refused');
    expect(store.current.id).toBe(base.id); // unchanged
    expect(store.saves).toBe(0); // never persisted
  });

  test('a malformed / off-version envelope is REFUSED (never a crash), with structured errors', async () => {
    const store = memStore(graph([node('scroll.y')]));

    const res = await handleGraphMutation({ patch: { _tag: 'GraphPatch', _version: 999, ops: [] } }, store);

    expect(res.status).toBe('refused');
    if (res.status === 'refused') expect(res.errors.length).toBeGreaterThan(0);
    expect(store.saves).toBe(0);
  });
});

describe('graph mutation channel — sendGraphMutation (client → wire → server)', () => {
  test('the full round-trip: client sender POSTs the patch, the server store actually mutates', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('viewport.width') }]);

    // The fake fetch IS the wire: it routes the POST body through the server handler.
    const fetchImpl: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { patch: unknown };
      const result = await handleGraphMutation({ patch: body.patch }, store);
      return { json: async () => result } as Response;
    };

    const res = await sendGraphMutation('/api/graph-mutate', patch, fetchImpl);

    expect(res.status).toBe('applied');
    expect(store.saves).toBe(1); // the client's proposal round-tripped and mutated the server truth
    expect(store.current.nodes.length).toBe(2);
  });
});
