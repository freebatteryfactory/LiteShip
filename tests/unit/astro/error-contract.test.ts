/** @liteship/astro error contract — host refusals stay structured at the public route boundary. */
import { describe, it, expect } from 'vitest';
import { graphQueryRoute } from '@liteship/astro';

describe('@liteship/astro error contract', () => {
  it('graphQueryRoute refuses an unsupported method with a bounded JSON error', async () => {
    const route = graphQueryRoute({
      loadGraph: async () => {
        throw new Error('unsupported methods must not reach the store');
      },
    });
    const response = await route(new Request('https://example.test/graph', { method: 'GET' }));

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toContain('QUERY');
    await expect(response.json()).resolves.toEqual({
      status: 'refused',
      errors: ['unsupported method GET for graph query'],
    });
  });
});
