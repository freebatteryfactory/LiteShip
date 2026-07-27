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
import {
  GraphPatch,
  handleGraphMutation,
  sendGraphMutation,
  verifyAppliedGraph,
} from '../../../../packages/core/src/index.js';
import type { DocumentGraph, GraphStore } from '../../../../packages/core/src/index.js';
import { node, graph } from '../../../helpers/graph-fixtures.js';

/** An in-memory host graph store — the authority boundary, with a compare-and-swap save. */
function memStore(initial: DocumentGraph): GraphStore & { current: DocumentGraph; saves: number } {
  const store = {
    current: initial,
    saves: 0,
    loadGraph: () => store.current,
    saveGraph: (next: DocumentGraph, expected: DocumentGraph) => {
      if (store.current.id !== expected.id) return false; // the store moved — reject the stale write
      store.current = next;
      store.saves += 1;
      return true;
    },
  };
  return store;
}

/**
 * A store that simulates the concurrent-read race: `loadGraph` always returns the ORIGINAL
 * base (as if two requests read it before either wrote), while `saveGraph` compare-and-swaps
 * against the REAL current. So both requests validate against the same base, but only the
 * first commit wins — the second's CAS fails.
 */
function racyStore(initial: DocumentGraph): GraphStore & { current: DocumentGraph; saves: number } {
  const store = {
    original: initial,
    current: initial,
    saves: 0,
    loadGraph: () => store.original,
    saveGraph: (next: DocumentGraph, expected: DocumentGraph) => {
      if (store.current.id !== expected.id) return false;
      store.current = next;
      store.saves += 1;
      return true;
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
    if (res.status === 'refused') expect(res.staleBase).toBe(true);
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

  test('two commits racing the SAME base: the second is REFUSED by compare-and-swap (no lost update)', async () => {
    const base = graph([node('scroll.y')]);
    const store = racyStore(base); // both requests read `base` before either writes
    const patchA = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('a.signal') }]);
    const patchB = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b.signal') }]);

    const a = await handleGraphMutation({ patch: overTheWire(patchA) }, store);
    const b = await handleGraphMutation({ patch: overTheWire(patchB) }, store);

    // Both validated against the same base; A's CAS wins, B's stale write is rejected.
    expect(a.status).toBe('applied');
    expect(b.status).toBe('refused');
    if (b.status === 'refused') {
      expect(b.errors[0]).toContain('concurrent modification');
      expect(b.staleBase).toBe(true);
    }
    expect(store.saves).toBe(1); // B did NOT clobber A
  });

  test('a valid add-edge APPLIES — regression guard for the extraneous-field fix', async () => {
    const a = node('a.signal');
    const b = node('b.signal');
    const base = graph([a, b]);
    const store = memStore(base);
    const patch = GraphPatch.propose(base, [{ op: 'add', edge: { from: a.id, to: b.id, type: 'seq' } }]);

    const res = await handleGraphMutation({ patch: overTheWire(patch) }, store);

    expect(res.status).toBe('applied');
    expect(store.saves).toBe(1);
  });

  test('an edge carrying an extra nested field is REFUSED — no un-addressed bytes reach the store', async () => {
    const a = node('a.signal');
    const b = node('b.signal');
    const base = graph([a, b]);
    const store = memStore(base);
    // The edge itself is structurally valid (real endpoints, real type). An attacker smuggles an
    // off-contract field onto it in the raw wire payload — the digest addresses only [from, to, type],
    // so without the nested additionalProperties gate this rides into the sealed graph UN-ADDRESSED.
    const clean = GraphPatch.propose(base, [{ op: 'add', edge: { from: a.id, to: b.id, type: 'seq' } }]);
    const wire = overTheWire(clean) as { ops: { edge?: Record<string, unknown> }[] };
    wire.ops[0].edge!.smuggled = 'arbitrary-unaddressed-bytes';

    const res = await handleGraphMutation({ patch: wire }, store);

    expect(res.status).toBe('refused');
    if (res.status === 'refused') expect(res.errors.join(' ')).toMatch(/smuggled|does not model/);
    expect(store.saves).toBe(0); // never persisted
    expect(store.current.id).toBe(base.id); // byte-identical
  });

  test('an invalid proposal against the CURRENT base is REFUSED without staleBase', async () => {
    const a = node('a.signal');
    const base = graph([a]);
    const store = memStore(base);
    const invalid = GraphPatch.propose(base, [{ op: 'add', edge: { from: a.id, to: 'fnv1a:ghost' as typeof a.id, type: 'seq' } }]);

    const res = await handleGraphMutation({ patch: overTheWire(invalid) }, store);

    expect(res.status).toBe('refused');
    if (res.status === 'refused') {
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.staleBase).toBeUndefined();
    }
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

  test('a non-JSON response (proxy 502 / HTML error page) → error status, never a raw throw', async () => {
    const fetchImpl: typeof fetch = async () =>
      ({
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      }) as unknown as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([node('scroll.y')]), []), fetchImpl);
    expect(res.status).toBe('error');
  });

  test('a JSON payload that is not a channel reply → error status (shape-validated, not blind-cast)', async () => {
    const fetchImpl: typeof fetch = async () => ({ status: 200, json: async () => ({ notAStatus: true }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([node('scroll.y')]), []), fetchImpl);
    expect(res.status).toBe('error');
  });

  test('a transport failure (network down / fetch rejects) → error status, never a raw throw', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([node('scroll.y')]), []), fetchImpl);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('request failed');
  });

  test('a status with MISSING required fields is rejected (a bare {status:"applied"} without graph is not accepted)', async () => {
    const fetchImpl: typeof fetch = async () => ({ status: 200, json: async () => ({ status: 'applied' }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([node('scroll.y')]), []), fetchImpl);
    expect(res.status).toBe('error'); // no `graph` → not a well-formed applied response
  });

  test('an applied reply whose graph is not a DocumentGraph → error (adopting it would crash on `.nodes`)', async () => {
    // `{ status: 'applied', graph: {} }` clears the discriminant+presence guard but is NOT a graph;
    // without decoding, the client dereferences graph.nodes.length and throws. Decode it to an error.
    const fetchImpl: typeof fetch = async () => ({ status: 200, json: async () => ({ status: 'applied', graph: {} }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([node('scroll.y')]), []), fetchImpl);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('malformed applied graph');
  });

  test('an applied graph whose id does not address its content → error (forged base is not adopted)', async () => {
    const base = graph([node('scroll.y')]);
    // Shape-valid, but the top-level id is FORGED (does not match the content). Without re-deriving
    // identity, the client would adopt this and then have every proposal refused as stale by the real server.
    const forged = { ...base, id: 'fnv1a:deadbeef' };
    const fetchImpl: typeof fetch = async () =>
      ({ status: 200, json: async () => ({ status: 'applied', graph: forged }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(base, []), fetchImpl);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('does not address its content');
  });

  test('an applied graph with a dangling edge → error (invalid topology the server would refuse)', async () => {
    const a = node('a.signal');
    // Sealed so its id DOES address its content (passes decode + reseal), but the edge points at a node
    // that isn't in the graph — a topology the mutation seam would never have produced.
    const dangling = graph([a], [{ from: a.id, to: 'fnv1a:ghost' as typeof a.id, type: 'seq' }]);
    const fetchImpl: typeof fetch = async () =>
      ({ status: 200, json: async () => ({ status: 'applied', graph: dangling }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([a]), []), fetchImpl);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('invalid topology');
  });

  test('a refused reply whose errors are not all strings → error (payload fields validated)', async () => {
    const fetchImpl: typeof fetch = async () =>
      ({ status: 422, json: async () => ({ status: 'refused', errors: ['ok', { not: 'a string' }] }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([node('scroll.y')]), []), fetchImpl);
    expect(res.status).toBe('error'); // the guard rejects a malformed refused payload, never a bad cast
  });

  test('a refused reply whose staleBase is not true → error (payload fields fail closed)', async () => {
    const fetchImpl: typeof fetch = async () =>
      ({ status: 409, json: async () => ({ status: 'refused', errors: ['stale'], staleBase: 'yes' }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([node('scroll.y')]), []), fetchImpl);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('unexpected response shape');
  });

  test('an applied graph with an invalid edge type → error (decode enforces the EdgeType enum)', async () => {
    const a = node('a.signal');
    const b = node('b.signal');
    // Real endpoints, but a bogus `type` string that is not an EdgeType — sealed so its id is valid.
    const bad = graph([a, b], [{ from: a.id, to: b.id, type: 'bogus' } as unknown as DocumentGraphEdge]);
    const fetchImpl: typeof fetch = async () =>
      ({ status: 200, json: async () => ({ status: 'applied', graph: bad }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([a]), []), fetchImpl);
    expect(res.status).toBe('error');
  });

  test('an applied graph whose digest does not match its content → error (digest verified, not just id)', async () => {
    const base = graph([node('scroll.y')]);
    const other = graph([node('other.signal')]);
    // The id is correct (addresses base's content), but the digest is ANOTHER graph's — a
    // forged/inconsistent response the id-only check would have waved through.
    const forged = { ...base, digest: other.digest };
    const fetchImpl: typeof fetch = async () =>
      ({ status: 200, json: async () => ({ status: 'applied', graph: forged }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(base, []), fetchImpl);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('id/digest');
  });

  test('an applied graph with duplicate node ids → error (not a normalized base the server emits)', async () => {
    const a = node('a.signal');
    // Two entries with the SAME node id — the apply-Map would collapse them; the server never emits it.
    const dup = graph([a, a]);
    const fetchImpl: typeof fetch = async () =>
      ({ status: 200, json: async () => ({ status: 'applied', graph: dup }) }) as Response;
    const res = await sendGraphMutation('/api/graph', GraphPatch.propose(graph([a]), []), fetchImpl);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('duplicate');
  });

  test('verifyAppliedGraph accepts a sealed graph and returns the canonical graph', () => {
    const base = graph([node('scroll.y')]);

    const verified = verifyAppliedGraph(overTheWire(base));

    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.graph.id).toBe(base.id);
  });

  test('verifyAppliedGraph rejects a forged applied graph id', () => {
    const base = graph([node('scroll.y')]);

    const verified = verifyAppliedGraph({ ...overTheWire(base), id: 'fnv1a:deadbeef' });

    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.message).toContain('does not address its content');
  });
});

describe('graph mutation channel — server/store failures map to `error` (retryable), not a throw', () => {
  const validPatch = (base: DocumentGraph) =>
    overTheWire(GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('x.signal') }]));

  test('a loadGraph failure → error (server-side), not refused and not a crash', async () => {
    const base = graph([node('scroll.y')]);
    const store: GraphStore = {
      loadGraph: () => {
        throw new Error('KV read failed');
      },
      saveGraph: () => true,
    };
    const res = await handleGraphMutation({ patch: validPatch(base) }, store);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('loadGraph');
  });

  test('a saveGraph failure → error, not applied (the store never silently loses the write)', async () => {
    const base = graph([node('scroll.y')]);
    const store: GraphStore = {
      loadGraph: () => base,
      saveGraph: () => {
        throw new Error('KV write failed');
      },
    };
    const res = await handleGraphMutation({ patch: validPatch(base) }, store);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('saveGraph');
  });
});
