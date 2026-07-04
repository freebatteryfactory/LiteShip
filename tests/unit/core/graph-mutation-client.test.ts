// @vitest-environment node
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  GraphPatch,
  createGraphMutationClient,
  type DocumentGraph,
  type GraphMutationResponse,
  type PatchOp,
} from '../../../packages/core/src/index.js';
import { node, graph } from '../../helpers/graph-fixtures.js';

const response = (body: GraphMutationResponse, status = 200): Response =>
  ({ status, json: async () => body }) as unknown as Response;

const patchFromInit = (init?: RequestInit): GraphPatch => {
  const body = JSON.parse(String(init?.body ?? '{}')) as { patch: unknown };
  return GraphPatch.decode(body.patch);
};

describe('GraphMutationClient', () => {
  test('serializes concurrent submits and advances the second proposal from the first applied base', async () => {
    const base = graph([node('base')]);
    let serverBase = base;
    const postedBases: string[] = [];
    let active = 0;
    let maxActive = 0;
    let releaseFirst: (() => void) | undefined;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const fetchImpl: typeof fetch = async (_url, init) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      const patch = patchFromInit(init);
      postedBases.push(patch.base);
      if (postedBases.length === 1) await firstBlocked;
      serverBase = GraphPatch.apply(serverBase, patch);
      active -= 1;
      return response({ status: 'applied', graph: serverBase });
    };
    const client = createGraphMutationClient({ url: '/api/graph', base, fetchImpl });

    const first = client.submit([{ op: 'add', family: 'signal', node: node('first') }]);
    const second = client.submit([{ op: 'add', family: 'signal', node: node('second') }]);
    await Promise.resolve();
    expect(postedBases).toEqual([base.id]);
    releaseFirst?.();
    const [a, b] = await Promise.all([first, second]);

    expect(a.status).toBe('applied');
    expect(b.status).toBe('applied');
    if (a.status !== 'applied' || b.status !== 'applied') throw new Error('expected applied responses');
    expect(postedBases).toEqual([base.id, a.graph.id]);
    expect(client.base().id).toBe(b.graph.id);
    expect(maxActive).toBe(1);
  });

  test('advances the base on applied responses', async () => {
    const base = graph([node('base')]);
    const applied = graph([node('base'), node('next')]);
    const fetchImpl: typeof fetch = async () => response({ status: 'applied', graph: applied });
    const client = createGraphMutationClient({ url: '/api/graph', base, fetchImpl });

    const res = await client.submit([]);

    expect(res.status).toBe('applied');
    expect(client.base().id).toBe(applied.id);
  });

  test('retries a stale-base refusal by refreshing, rebuilding ops, and resubmitting', async () => {
    const base = graph([node('base')]);
    const refreshed = graph([node('fresh')]);
    const seenBases: string[] = [];
    let posts = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      posts += 1;
      const patch = patchFromInit(init);
      if (posts === 1) return response({ status: 'refused', errors: ['stale'], staleBase: true }, 409);
      return response({ status: 'applied', graph: GraphPatch.apply(refreshed, patch) });
    };
    const client = createGraphMutationClient({
      url: '/api/graph',
      base,
      fetchImpl,
      refreshBase: async () => refreshed,
    });

    const res = await client.submit((current) => {
      seenBases.push(current.id);
      return [{ op: 'add', family: 'signal', node: node(`from-${seenBases.length}`) }];
    });

    expect(res.status).toBe('applied');
    expect(posts).toBe(2);
    expect(seenBases).toEqual([base.id, refreshed.id]);
    if (res.status === 'applied') expect(client.base().id).toBe(res.graph.id);
  });

  test('bounds stale-base retries', async () => {
    const base = graph([node('base')]);
    let posts = 0;
    const fetchImpl: typeof fetch = async () => {
      posts += 1;
      return response({ status: 'refused', errors: ['still stale'], staleBase: true }, 409);
    };
    const client = createGraphMutationClient({
      url: '/api/graph',
      base,
      fetchImpl,
      refreshBase: async () => graph([node(`fresh-${posts}`)]),
      maxStaleRetries: 1,
    });

    const res = await client.submit([{ op: 'add', family: 'signal', node: node('next') }]);

    expect(res).toEqual({ status: 'refused', errors: ['still stale'], staleBase: true });
    expect(posts).toBe(2);
  });

  test('does not retry non-stale refusals', async () => {
    const base = graph([node('base')]);
    let posts = 0;
    const fetchImpl: typeof fetch = async () => {
      posts += 1;
      return response({ status: 'refused', errors: ['dangling edge'] }, 422);
    };
    const client = createGraphMutationClient({
      url: '/api/graph',
      base,
      fetchImpl,
      refreshBase: async () => graph([node('fresh')]),
    });

    const res = await client.submit([{ op: 'add', family: 'signal', node: node('next') }]);

    expect(res).toEqual({ status: 'refused', errors: ['dangling edge'] });
    expect(posts).toBe(1);
  });

  test('maps ops builder throws to error without posting', async () => {
    const base = graph([node('base')]);
    let posts = 0;
    const fetchImpl: typeof fetch = async () => {
      posts += 1;
      return response({ status: 'error', message: 'unexpected' }, 500);
    };
    const client = createGraphMutationClient({ url: '/api/graph', base, fetchImpl });

    const res = await client.submit(() => {
      throw new Error('builder failed');
    });

    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toBe('ops builder threw: builder failed');
    expect(posts).toBe(0);
  });

  test('maps propose throws to error without posting', async () => {
    const base = graph([node('base')]);
    let posts = 0;
    const fetchImpl: typeof fetch = async () => {
      posts += 1;
      return response({ status: 'error', message: 'unexpected' }, 500);
    };
    const client = createGraphMutationClient({ url: '/api/graph', base, fetchImpl });

    const res = await client.submit([null as unknown as PatchOp]);

    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toContain('propose failed:');
    expect(posts).toBe(0);
  });

  test('maps refreshBase throws to error', async () => {
    const base = graph([node('base')]);
    const fetchImpl: typeof fetch = async () => response({ status: 'refused', errors: ['stale'], staleBase: true }, 409);
    const client = createGraphMutationClient({
      url: '/api/graph',
      base,
      fetchImpl,
      refreshBase: async () => {
        throw new Error('read failed');
      },
    });

    const res = await client.submit([{ op: 'add', family: 'signal', node: node('next') }]);

    expect(res.status).toBe('error');
    if (res.status === 'error') expect(res.message).toBe('refreshBase failed: read failed');
  });

  test('adopt changes the base used by the next submit', async () => {
    const base = graph([node('base')]);
    const adopted = graph([node('adopted')]);
    const postedBases: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      const patch = patchFromInit(init);
      postedBases.push(patch.base);
      return response({ status: 'applied', graph: GraphPatch.apply(adopted, patch) });
    };
    const client = createGraphMutationClient({ url: '/api/graph', base, fetchImpl });

    client.adopt(adopted);
    const res = await client.submit([{ op: 'add', family: 'signal', node: node('next') }]);

    expect(res.status).toBe('applied');
    expect(postedBases).toEqual([adopted.id]);
  });

  test('concurrent submit order is the applied-base chain for any short batch', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uniqueArray(fc.stringMatching(/^[a-z]{1,6}$/), { minLength: 1, maxLength: 5 }), async (inputs) => {
        const base = graph([node('base')]);
        let serverBase = base;
        const postedBases: string[] = [];
        const fetchImpl: typeof fetch = async (_url, init) => {
          const patch = patchFromInit(init);
          postedBases.push(patch.base);
          if (patch.base !== serverBase.id) return response({ status: 'refused', errors: ['stale'], staleBase: true }, 409);
          serverBase = GraphPatch.apply(serverBase, patch);
          return response({ status: 'applied', graph: serverBase });
        };
        const client = createGraphMutationClient({ url: '/api/graph', base, fetchImpl });

        const results = await Promise.all(
          inputs.map((input) => client.submit([{ op: 'add', family: 'signal', node: node(input) }])),
        );

        expect(results.every((result) => result.status === 'applied')).toBe(true);
        expect(postedBases[0]).toBe(base.id);
        for (let i = 1; i < postedBases.length; i += 1) {
          const prior = results[i - 1];
          if (prior.status !== 'applied') throw new Error('expected applied prior response');
          expect(postedBases[i]).toBe(prior.graph.id);
        }
        expect(client.base().id).toBe(serverBase.id);
      }),
      { numRuns: 20, seed: 0x80_00_01 },
    );
  });
});

describe('createGraphMutationClient — timeoutMs', () => {
  test('a hung request is aborted at the deadline and settles to the error shape', async () => {
    // A fetch that never settles EXCEPT on abort — deterministic: the promise resolves
    // exactly when the client's own AbortController fires, no timing races.
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(init.signal?.reason ?? new Error('aborted'));
        });
      });
    const client = createGraphMutationClient({
      url: '/api/graph',
      base: graph([node('a')]),
      fetchImpl: hangingFetch,
      timeoutMs: 5,
    });

    const res = await client.submit([]);

    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.message).toContain('timed out after 5ms');
    }
  });
});
