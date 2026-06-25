/**
 * doctor — Astro dev-server probe tests.
 *
 * Pins the three liveness verdicts against a mocked `/_astro/status`: healthy
 * (`{ ok: true }` → ok), unreachable (refused → warn, the expected idle state),
 * and up-but-unhealthy (non-2xx → fail).
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { probeAstroDevStatus } from '../../../../../packages/cli/src/commands/doctor/probes-astro.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(impl: (url: string) => Promise<Response> | Response): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(impl(typeof input === 'string' ? input : String(input))),
  );
}

describe('probeAstroDevStatus', () => {
  test('ok when /_astro/status returns { ok: true }', async () => {
    mockFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const check = await probeAstroDevStatus('http://127.0.0.1:4321');
    expect(check.id).toBe('astro.dev-status');
    expect(check.status).toBe('ok');
  });

  test('queries the /_astro/status path on the given base url', async () => {
    let seen = '';
    mockFetch((url) => {
      seen = url;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await probeAstroDevStatus('http://localhost:9999/');
    expect(seen).toBe('http://localhost:9999/_astro/status');
  });

  test('warn (not fail) when the server is unreachable — the expected idle state', async () => {
    mockFetch(() => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:4321');
    });
    const check = await probeAstroDevStatus('http://127.0.0.1:4321');
    expect(check.status).toBe('warn');
    expect(check.detail).toContain('no dev server reachable');
  });

  test('fail when the endpoint returns a non-2xx status', async () => {
    mockFetch(() => new Response('nope', { status: 500 }));
    const check = await probeAstroDevStatus('http://127.0.0.1:4321');
    expect(check.status).toBe('fail');
    expect(check.detail).toContain('500');
  });

  test('warn when the server answers without the healthy shape', async () => {
    mockFetch(() => new Response(JSON.stringify({ ok: false }), { status: 200 }));
    const check = await probeAstroDevStatus('http://127.0.0.1:4321');
    expect(check.status).toBe('warn');
  });
});
