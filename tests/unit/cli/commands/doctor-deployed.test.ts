import { describe, expect, test, vi, afterEach } from 'vitest';
import { probeDeployedSite } from '../../../../packages/cli/src/commands/doctor/probes-deployed.js';

describe('doctor --deployed (#116)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('reports Accept-CH and Vary from a live response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
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

  test('refuses non-HTTPS URLs (SSRF guard)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const checks = await probeDeployedSite('http://example.test/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(checks[0]?.status).toBe('fail');
    expect(checks[0]?.detail).toMatch(/non-HTTPS/i);
  });

  test('refuses loopback/private hosts without fetching (SSRF guard)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    for (const blocked of [
      'https://localhost/',
      'https://127.0.0.1/',
      'https://169.254.169.254/',
      'https://10.0.0.1/',
      'https://192.168.1.1/',
    ]) {
      const checks = await probeDeployedSite(blocked);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(checks[0]?.status).toBe('fail');
      expect(checks[0]?.detail).toMatch(/SSRF guard/i);
    }
  });

  test('re-validates each redirect hop — a 302 to localhost is refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 302, headers: { location: 'https://127.0.0.1/secret' } })),
    );

    const checks = await probeDeployedSite('https://example.test/');
    expect(checks[0]?.status).toBe('fail');
    expect(checks[0]?.detail).toMatch(/SSRF guard/i);
  });
});
