import { describe, expect, test, vi, afterEach } from 'vitest';
import { probeDeployedSite } from '../../../../packages/cli/src/commands/doctor/probes-deployed.js';

describe('doctor --deployed (#116)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('reports Accept-CH and Vary from a live response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('ok', {
          status: 200,
          headers: {
            'content-security-policy': "default-src 'self'",
            'cross-origin-opener-policy': 'same-origin',
            'cross-origin-embedder-policy': 'require-corp',
            'accept-ch': 'Sec-CH-Viewport-Width',
            'critical-ch': 'Sec-CH-Viewport-Width',
            vary: 'Sec-CH-Viewport-Width',
          },
        }),
      ),
    );

    const checks = await probeDeployedSite('https://example.test/');
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
    expect(byId['deployed.accept-ch']?.status).toBe('ok');
    expect(byId['deployed.vary']?.status).toBe('ok');
  });
});
