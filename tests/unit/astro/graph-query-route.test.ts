// @vitest-environment node
/**
 * graphQueryRoute — HTTP QUERY read-leg adapter (#119).
 */
import { describe, test, expect } from 'vitest';
import { graphQueryRoute } from '../../../packages/astro/src/graph-query-route.js';
import { graphQueryEtag } from '../../../packages/core/src/index.js';
import type { DocumentGraph, GraphStore } from '@czap/core';
import { sealNode, sealGraph } from '../../../packages/core/src/index.js';
import type { CellMeta, DocumentGraphEdge, DocumentGraphNode, SignalNode } from '@czap/core';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};
const node = (input: string): SignalNode =>
  sealNode({ _tag: 'DocGraphSignalNode', _version: 1, family: 'signal', id: '', meta: META, input } as unknown as SignalNode);
const graph = (nodes: DocumentGraphNode[], edges: DocumentGraphEdge[] = []): DocumentGraph =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<DocumentGraph, 'id' | 'digest'>);

function readOnlyStore(initial: DocumentGraph): Pick<GraphStore, 'loadGraph'> {
  return { loadGraph: () => initial };
}

const queryRequest = (headers: Record<string, string> = {}): Request =>
  new Request('http://host/api/graph', {
    method: 'QUERY',
    headers: { 'content-type': 'application/json', ...headers },
    body: '{}',
  });

describe('graphQueryRoute — read-only store, conditional etag', () => {
  test('QUERY returns 200 ok graph + weak sha256 etag header', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(queryRequest());

    expect(res.status).toBe(200);
    // Weak validator: the digest excludes mutable meta, so byte-equality is not guaranteed.
    expect(res.headers.get('etag')).toBe(`W/"${graphQueryEtag(base)}"`);
    const body = (await res.json()) as { status: string; graph?: DocumentGraph; etag?: string };
    expect(body.status).toBe('ok');
    expect(body.graph!.id).toBe(base.id);
    expect(body.etag).toBe(graphQueryEtag(base));
  });

  test('If-None-Match on integrity digest → 304 not modified', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(
      queryRequest({ 'if-none-match': `"${graphQueryEtag(base)}"` }),
    );

    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe(`W/"${graphQueryEtag(base)}"`);
    expect(await res.text()).toBe('');
  });

  test('multi-member If-None-Match matches ANY listed validator (RFC 9110)', async () => {
    const base = graph([node('scroll.y')]);
    const other = graph([node('pointer.x')]);
    const res = await graphQueryRoute(readOnlyStore(base))(
      queryRequest({ 'if-none-match': `"${graphQueryEtag(other)}", W/"${graphQueryEtag(base)}"` }),
    );

    expect(res.status).toBe(304);
  });

  test('If-None-Match: * matches the current representation → 304', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(queryRequest({ 'if-none-match': '*' }));

    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe(`W/"${graphQueryEtag(base)}"`);
  });

  test('multi-member list with a valid sha256 but a stale first member is NOT refused', async () => {
    const base = graph([node('scroll.y')]);
    const other = graph([node('pointer.x')]);
    // First member stale, second current: a spec-compliant cache listing several
    // stored validators must get a 304, not a full 200 (or a 422).
    const res = await graphQueryRoute(readOnlyStore(base))(
      queryRequest({ 'if-none-match': `"${graphQueryEtag(other)}", "${graphQueryEtag(base)}"` }),
    );
    expect(res.status).toBe(304);
  });

  test('fnv1a If-None-Match → 422 refused', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(queryRequest({ 'if-none-match': base.id }));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { status: string; errors?: readonly string[] };
    expect(body.status).toBe('refused');
    expect(body.errors!.join(' ')).toContain('fnv1a');
  });

  test('POST with X-Czap-Query fallback is accepted', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(
      new Request('http://host/api/graph', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Czap-Query': '1' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(200);
  });

  test('unsupported method → 405 with Allow header', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(
      new Request('http://host/api/graph', { method: 'GET' }),
    );
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('QUERY, POST, OPTIONS');
  });

  test('OPTIONS → 204 with Allow (CORS preflight must not see 405)', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(
      new Request('http://host/api/graph', { method: 'OPTIONS' }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('allow')).toBe('QUERY, POST, OPTIONS');
  });

  test('oversized body → 413 without buffering it (body is unused on the read leg)', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(
      new Request('http://host/api/graph', {
        method: 'QUERY',
        headers: { 'content-type': 'application/json' },
        body: `{"pad":"${'x'.repeat(8192)}"}`,
      }),
    );
    expect(res.status).toBe(413);
  });

  test('text/plain body → 415 (CSRF discipline mirrors mutation route)', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(
      new Request('http://host/api/graph', {
        method: 'QUERY',
        headers: { 'content-type': 'text/plain' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(415);
  });

  test('malformed JSON body → 400', async () => {
    const base = graph([node('scroll.y')]);
    const res = await graphQueryRoute(readOnlyStore(base))(
      new Request('http://host/api/graph', {
        method: 'QUERY',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      }),
    );
    expect(res.status).toBe(400);
  });

  test('store load failure → 500 error shape', async () => {
    const store: Pick<GraphStore, 'loadGraph'> = {
      loadGraph: () => {
        throw new Error('db unavailable');
      },
    };
    const res = await graphQueryRoute(store)(queryRequest());
    expect(res.status).toBe(500);
    const body = (await res.json()) as { status: string; message?: string };
    expect(body.status).toBe('error');
    expect(body.message).toContain('loadGraph');
  });
});
