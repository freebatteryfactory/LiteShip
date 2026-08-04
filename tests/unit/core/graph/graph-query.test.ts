// @vitest-environment node
/**
 * HTTP QUERY read-leg (#119) — handleGraphQuery + sendGraphQuery.
 */
import { describe, test, expect, vi } from 'vitest';
import {
  GRAPH_QUERY_DEFAULT_TIMEOUT_MS,
  GRAPH_QUERY_FALLBACK_HEADER,
  createGraphQueryRefreshBase,
  graphQueryEtag,
  handleGraphQuery,
  normalizeGraphQueryEtag,
  sendGraphQuery,
} from '../../../../packages/core/src/index.js';
import type { DocumentGraph, GraphStore } from '../../../../packages/core/src/index.js';
import { graph, node } from '../../../helpers/graph-fixtures.js';

function memStore(initial: DocumentGraph): Pick<GraphStore, 'loadGraph'> & { current: DocumentGraph } {
  return {
    current: initial,
    loadGraph: () => initial,
  };
}

describe('graph query — handleGraphQuery (server)', () => {
  test('returns the verified server graph with sha256 etag', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);

    const res = await handleGraphQuery({}, store);

    expect(res.status).toBe('ok');
    if (res.status !== 'ok') throw new Error('expected ok');
    expect(res.graph.id).toBe(base.id);
    expect(res.etag).toBe(graphQueryEtag(base));
    expect(res.etag).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(res.etag).not.toBe(base.id);
  });

  test('conditional read: matching sha256 integrity_digest → not_modified', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);

    const res = await handleGraphQuery({ ifNoneMatch: graphQueryEtag(base) }, store);

    expect(res.status).toBe('not_modified');
    if (res.status === 'not_modified') {
      expect(res.etag).toBe(graphQueryEtag(base));
    }
  });

  test('refuses fnv1a If-None-Match — silent-stale 304 vector', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);

    const res = await handleGraphQuery({ ifNoneMatch: base.id }, store);

    expect(res.status).toBe('refused');
    if (res.status === 'refused') {
      expect(res.errors.join(' ')).toContain('fnv1a');
    }
  });

  test('refuses malformed etag validators', async () => {
    const store = memStore(graph([node('scroll.y')]));
    const res = await handleGraphQuery({ ifNoneMatch: 'not-a-digest' }, store);
    expect(res.status).toBe('refused');
  });

  test('loadGraph failure → error (retryable), not refused', async () => {
    const store: Pick<GraphStore, 'loadGraph'> = {
      loadGraph: () => {
        throw new Error('KV read failed');
      },
    };
    const res = await handleGraphQuery({}, store);
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('loadGraph');
  });

  test('store graph that fails verification → refused', async () => {
    const base = graph([node('scroll.y')]);
    const forged = { ...base, id: 'fnv1a:deadbeef' };
    const store = memStore(forged);

    const res = await handleGraphQuery({}, store);

    expect(res.status).toBe('refused');
    if (res.status === 'refused') expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe('graph query — normalizeGraphQueryEtag', () => {
  test('strips quotes and weak prefix', () => {
    const base = graph([node('scroll.y')]);
    const etag = graphQueryEtag(base);
    expect(normalizeGraphQueryEtag(`W/"${etag}"`)).toBe(etag);
  });
});

describe('graph query — sendGraphQuery (client)', () => {
  test('full round-trip via QUERY returns verified graph', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);

    const fetchImpl: typeof fetch = async (_url, init) => {
      expect(init?.method).toBe('QUERY');
      const result = await handleGraphQuery({}, store);
      return {
        status: 200,
        headers: new Headers({ etag: `"${graphQueryEtag(base)}"` }),
        json: async () => result,
      } as Response;
    };

    const res = await sendGraphQuery('/api/graph', { fetchImpl });
    expect(res.status).toBe('ok');
  });

  test('304 HTTP response maps to not_modified', async () => {
    const base = graph([node('scroll.y')]);
    const etag = graphQueryEtag(base);
    const fetchImpl: typeof fetch = async () =>
      ({ status: 304, headers: new Headers({ etag: `"${etag}"` }), json: async () => null }) as Response;

    const res = await sendGraphQuery('/api/graph', { fetchImpl, ifNoneMatch: etag });
    expect(res.status).toBe('not_modified');
    if (res.status === 'not_modified') expect(res.etag).toBe(etag);
  });

  test('QUERY 405 falls back to POST with X-Liteship-Query (loud ladder)', async () => {
    const base = graph([node('scroll.y')]);
    const store = memStore(base);
    const methods: string[] = [];
    const headers: string[] = [];

    const fetchImpl: typeof fetch = async (_url, init) => {
      methods.push(String(init?.method));
      const hdrs = init?.headers as Record<string, string> | undefined;
      if (hdrs?.[GRAPH_QUERY_FALLBACK_HEADER]) {
        headers.push(hdrs[GRAPH_QUERY_FALLBACK_HEADER]);
      }
      if (methods.length === 1) {
        return { status: 405, json: async () => ({}) } as Response;
      }
      const result = await handleGraphQuery({}, store);
      return { status: 200, json: async () => result } as Response;
    };

    const res = await sendGraphQuery('/api/graph', { fetchImpl });
    expect(methods).toEqual(['QUERY', 'POST']);
    expect(headers).toEqual(['1']);
    expect(res.status).toBe('ok');
  });

  test('retries transport failures up to maxRetries', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      throw new TypeError('Failed to fetch');
    };

    const res = await sendGraphQuery('/api/graph', { fetchImpl, maxRetries: 2 });
    expect(calls).toBe(3);
    expect(res.status).toBe('error');
  });

  test('rejects response whose etag disagrees with graph digest', async () => {
    const base = graph([node('scroll.y')]);
    const other = graph([node('other.signal')]);
    const fetchImpl: typeof fetch = async () =>
      ({
        status: 200,
        json: async () => ({ status: 'ok', graph: base, etag: graphQueryEtag(other) }),
      }) as Response;

    const res = await sendGraphQuery('/api/graph', { fetchImpl });
    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('etag does not match');
  });

  test('createGraphQueryRefreshBase throws on refused/error', async () => {
    const refresh = createGraphQueryRefreshBase('/api/graph', {
      fetchImpl: async () => ({ status: 422, json: async () => ({ status: 'refused', errors: ['nope'] }) }) as Response,
    });
    await expect(refresh()).rejects.toThrow(/refused/);
  });
});

describe('graph query — conditional polling is near-free', () => {
  test('sendGraphQuery passes If-None-Match from current etag', async () => {
    const base = graph([node('scroll.y')]);
    const etag = graphQueryEtag(base);
    let seen: string | undefined;

    const fetchImpl: typeof fetch = async (_url, init) => {
      const hdrs = init?.headers as Record<string, string>;
      seen = hdrs['if-none-match'];
      return {
        status: 200,
        json: async () => ({ status: 'not_modified', etag }),
      } as Response;
    };

    const res = await sendGraphQuery('/api/graph', { fetchImpl, ifNoneMatch: etag });
    expect(seen).toBe(`"${etag}"`);
    expect(res.status).toBe('not_modified');
  });
});

/**
 * The read leg had NO deadline at all — zero occurrences of `deadline`,
 * `AbortSignal` or `timeout` in the module — and consumed a body with
 * `await response.json()`. `fetch` settles on response HEADERS, so a server that
 * commits a 200 and then wedges (a proxy that has lost its upstream) held this
 * sender forever. Through `createGraphQueryRefreshBase` that stall reaches the
 * mutation client's SERIALIZED submit queue, so an unbounded read wedges the
 * write leg too. `42ba28d4` cured this exact shape on the mutation leg and
 * recorded the read leg as the sibling; this is that sibling.
 */
describe('graph query — the deadline covers the body, not just the headers', () => {
  /** Real headers over a stream that never enqueues and never closes. */
  const headersThenStalledBody = (): Response =>
    new Response(
      new ReadableStream<Uint8Array>({
        start() {
          // Deliberately never enqueue and never close.
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  const jsonResponse = (payload: unknown): Response =>
    new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });

  test('a stalled response BODY settles at the deadline and the retry proceeds', async () => {
    const base = graph([node('scroll.y')]);
    const ok = await handleGraphQuery({}, memStore(base));

    vi.useFakeTimers();
    try {
      let calls = 0;
      const fetchImpl: typeof fetch = async () => {
        calls += 1;
        return calls === 1 ? headersThenStalledBody() : jsonResponse(ok);
      };

      const pending = sendGraphQuery('/api/graph', {
        fetchImpl,
        maxRetries: 1,
        retryDelayMs: 0,
        timeoutMs: 5_000,
      });
      let settled = false;
      void pending.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(5_000);

      // STRONG assertion first: with an unbounded body read this stays false
      // forever and every later caller waits with it.
      expect(settled, 'a stalled response BODY must still settle at the deadline').toBe(true);
      await expect(pending).resolves.toMatchObject({ status: 'ok' });
      // The expired attempt is a retryable transport failure, so the read
      // recovers rather than surfacing the stall.
      expect(calls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test('with no retries left the deadline is what the caller is told', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl: typeof fetch = async () => headersThenStalledBody();
      const pending = sendGraphQuery('/api/graph', { fetchImpl, maxRetries: 0, timeoutMs: 5_000 });
      let settled = false;
      void pending.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(5_000);

      expect(settled, 'a stalled response BODY must still settle at the deadline').toBe(true);
      await expect(pending).resolves.toMatchObject({
        status: 'error',
        message: expect.stringContaining('query request timed out after 5000ms'),
      });
    } finally {
      vi.useRealTimers();
    }
  });

  test('an unbounded read is not expressible through the option', async () => {
    // The default is finite, and the non-finite / negative spellings a caller
    // might reach for all fall back to it rather than disabling the deadline.
    expect(Number.isFinite(GRAPH_QUERY_DEFAULT_TIMEOUT_MS)).toBe(true);
    expect(GRAPH_QUERY_DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);

    vi.useFakeTimers();
    try {
      for (const timeoutMs of [undefined, Number.POSITIVE_INFINITY, Number.NaN, -1]) {
        const fetchImpl: typeof fetch = async () => headersThenStalledBody();
        const pending = sendGraphQuery('/api/graph', { fetchImpl, maxRetries: 0, timeoutMs });
        let settled = false;
        void pending.then(() => {
          settled = true;
        });

        await vi.advanceTimersByTimeAsync(GRAPH_QUERY_DEFAULT_TIMEOUT_MS);

        expect(settled, `timeoutMs=${String(timeoutMs)} must fall back to the finite default`).toBe(true);
        await expect(pending).resolves.toMatchObject({
          status: 'error',
          message: expect.stringContaining(`query request timed out after ${GRAPH_QUERY_DEFAULT_TIMEOUT_MS}ms`),
        });
      }
    } finally {
      vi.useRealTimers();
    }
  });

  test('the abort signal reaches the transport, so a real fetch unwinds its socket', async () => {
    vi.useFakeTimers();
    try {
      let seen: AbortSignal | undefined;
      const fetchImpl: typeof fetch = async (_url, init) => {
        seen = init?.signal ?? undefined;
        return headersThenStalledBody();
      };
      const pending = sendGraphQuery('/api/graph', { fetchImpl, maxRetries: 0, timeoutMs: 5_000 });
      void pending.then(() => undefined);

      expect(seen, 'every query attempt must carry the deadline signal').toBeInstanceOf(AbortSignal);
      expect(seen!.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(5_000);

      expect(seen!.aborted, 'the deadline must abort the transport, not just settle the race').toBe(true);
      await expect(pending).resolves.toMatchObject({ status: 'error' });
    } finally {
      vi.useRealTimers();
    }
  });
});
