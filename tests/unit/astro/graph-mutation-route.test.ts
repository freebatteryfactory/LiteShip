// @vitest-environment node
/**
 * The Astro/host route adapter for the client→server mutation channel — proves the
 * real HTTP round-trip: a POSTed GraphPatch becomes a validated apply (200 + new
 * graph) or a refusal (422 + errors), a non-application/json body is rejected 415
 * (CSRF hardening), and a malformed JSON body is a 400. Same seam guarantees as the
 * pure core handler, now over real `Request`/`Response`.
 */
import { describe, test, expect } from 'vitest';
import { graphMutationRoute } from '../../../packages/astro/src/graph-mutation-route.js';
import { GraphPatch, sealNode, sealGraph } from '../../../packages/core/src/index.js';
import type { DocumentGraph, DocumentGraphNode, DocumentGraphEdge, SignalNode, CellMeta, GraphStore } from '@czap/core';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};
const node = (input: string): SignalNode =>
  sealNode({ _tag: 'DocGraphSignalNode', _version: 1, family: 'signal', id: '', meta: META, input } as unknown as SignalNode);
const graph = (nodes: DocumentGraphNode[], edges: DocumentGraphEdge[] = []): DocumentGraph =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<DocumentGraph, 'id' | 'digest'>);

function memStore(initial: DocumentGraph): GraphStore & { current: DocumentGraph; saves: number } {
  const store = {
    current: initial,
    saves: 0,
    loadGraph: () => store.current,
    saveGraph: (next: DocumentGraph, expected: DocumentGraph) => {
      if (store.current.id !== expected.id) return false;
      store.current = next;
      store.saves += 1;
      return true;
    },
  };
  return store;
}

const postPatch = (patch: unknown): Request =>
  new Request('http://host/api/graph', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
const wire = (patch: GraphPatch): unknown => JSON.parse(JSON.stringify(patch));

describe('graphMutationRoute — real HTTP Request → Response', () => {
  test('POST a valid patch → 200 applied, store advances to the new graph', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('viewport.width') }]);

    const res = await graphMutationRoute(store)(postPatch(wire(patch)));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; graph?: DocumentGraph };
    expect(body.status).toBe('applied');
    expect(body.graph!.nodes.length).toBe(2);
    expect(store.saves).toBe(1);
    expect(store.current.id).toBe(body.graph!.id);
  });

  test('POST a stale-base patch → 422 refused, graph byte-identical, no save', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);
    const stale = GraphPatch.propose(graph([node('other.graph')]), [{ op: 'add', family: 'signal', node: node('x') }]);

    const res = await graphMutationRoute(store)(postPatch(wire(stale)));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { status: string; errors?: readonly string[] };
    expect(body.status).toBe('refused');
    expect(body.errors!.length).toBeGreaterThan(0);
    expect(store.saves).toBe(0);
    expect(store.current.id).toBe(base.id);
  });

  test('POST application/json with a malformed body → 400 refused (surfaced, not swallowed)', async () => {
    const store = memStore(graph([node('scroll.y')]));
    const res = await graphMutationRoute(store)(
      new Request('http://host/api/graph', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'definitely not json {',
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { status: string; errors?: readonly string[] };
    expect(body.status).toBe('refused');
    expect(store.saves).toBe(0);
  });

  test('CSRF gate: a text/plain body (cross-site simple request) → 415, never parsed, store untouched', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);
    // A perfectly valid patch envelope — but smuggled with a simple-request content type that
    // dodges the CORS preflight. The gate rejects it before handleGraphMutation ever sees it.
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('viewport.width') }]);
    const res = await graphMutationRoute(store)(
      new Request('http://host/api/graph', {
        method: 'POST',
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ patch: wire(patch) }),
      }),
    );
    expect(res.status).toBe(415);
    const body = (await res.json()) as { status: string; errors?: readonly string[] };
    expect(body.status).toBe('refused');
    expect(store.saves).toBe(0);
    expect(store.current.id).toBe(base.id); // byte-identical: the smuggled patch never applied
  });

  test('CSRF gate: a missing content-type → 415 (a form/no-CORS POST defaults away from JSON)', async () => {
    const store = memStore(graph([node('scroll.y')]));
    const res = await graphMutationRoute(store)(
      new Request('http://host/api/graph', { method: 'POST', body: '{"patch":{}}' }),
    );
    expect(res.status).toBe(415);
    expect(store.saves).toBe(0);
  });

  test('content-type with a charset (application/json; charset=utf-8) is accepted', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('viewport.width') }]);
    const res = await graphMutationRoute(store)(
      new Request('http://host/api/graph', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ patch: wire(patch) }),
      }),
    );
    expect(res.status).toBe(200);
    expect(store.saves).toBe(1);
  });

  test('a store I/O failure → 500 with the structured error shape (not a raw 500)', async () => {
    const base = graph([node('scroll.y')]);
    const store: GraphStore = {
      loadGraph: () => base,
      saveGraph: () => {
        throw new Error('db unavailable');
      },
    };
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('x') }]);

    const res = await graphMutationRoute(store)(postPatch(wire(patch)));

    expect(res.status).toBe(500);
    const body = (await res.json()) as { status: string; message?: string };
    expect(body.status).toBe('error');
    expect(body.message).toContain('saveGraph');
  });
});
