import { describe, expect, test, vi, afterEach, beforeEach } from 'vitest';
import { lookup as dnsLookup } from 'node:dns/promises';
import { probeDeployedSite } from '../../../../packages/cli/src/commands/doctor/probes-deployed.js';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));

const mockedLookup = vi.mocked(dnsLookup);

function mockPublicDns(hostname = 'example.test') {
  mockedLookup.mockImplementation(async (host: string) => {
    if (host === 'evil.example' || host === 'dual.example') {
      return [
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ];
    }
    if (host === 'private.example') {
      return [{ address: '10.0.0.1', family: 4 }];
    }
    if (host === 'benchmark.example') {
      return [{ address: '198.18.0.1', family: 4 }];
    }
    return [{ address: '93.184.216.34', family: 4 }];
  });
}

describe('doctor --deployed (#116)', () => {
  beforeEach(() => {
    mockPublicDns();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockedLookup.mockReset();
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
    expect(mockedLookup).toHaveBeenCalledWith('example.test', { all: true, verbatim: true });
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
      'https://198.18.0.1/',
      'https://224.0.0.1/',
      'https://240.0.0.1/',
    ]) {
      const checks = await probeDeployedSite(blocked);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(checks[0]?.status).toBe('fail');
      expect(checks[0]?.detail).toMatch(/SSRF guard/i);
    }
  });

  test('refuses hostname resolving to private address before fetch (DNS SSRF)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const checks = await probeDeployedSite('https://private.example/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(checks[0]?.status).toBe('fail');
    expect(checks[0]?.detail).toMatch(/DNS resolution returned a loopback\/private/i);
  });

  test('refuses hostname resolving to special-use address before fetch (DNS SSRF)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const checks = await probeDeployedSite('https://benchmark.example/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(checks[0]?.status).toBe('fail');
    expect(checks[0]?.detail).toMatch(/DNS resolution returned a loopback\/private/i);
  });

  test('refuses when any A/AAAA record is private (multi-record fail-closed)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const checks = await probeDeployedSite('https://dual.example/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(checks[0]?.status).toBe('fail');
    expect(checks[0]?.detail).toMatch(/DNS resolution returned a loopback\/private/i);
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

  test('pin-and-connect: connect uses pinned public IP even if DNS would rebind on second lookup', async () => {
    let lookupCalls = 0;
    mockedLookup.mockImplementation(async () => {
      lookupCalls += 1;
      if (lookupCalls === 1) {
        return [{ address: '93.184.216.34', family: 4 }];
      }
      return [{ address: '10.0.0.1', family: 4 }];
    });

    const fetchSpy = vi.fn(async () => new Response('ok', { status: 200, headers: {} }));
    vi.stubGlobal('fetch', fetchSpy);

    const checks = await probeDeployedSite('https://rebind-safe.example/');
    expect(checks[0]?.status).not.toBe('fail');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(lookupCalls).toBe(1);
    const init = fetchSpy.mock.calls[0]?.[1] as { dispatcher?: unknown } | undefined;
    expect(init?.dispatcher).toBeDefined();
  });

  test('red-team: v4-mapped IPv6 hex loopback is refused before fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const checks = await probeDeployedSite('https://[::ffff:7f00:1]/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(checks[0]?.status).toBe('fail');
    expect(checks[0]?.detail).toMatch(/SSRF guard/i);
  });

  test('red-team: v4-mapped IPv6 hex cloud metadata (169.254.169.254) is refused before fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const checks = await probeDeployedSite('https://[::ffff:a9fe:a9fe]/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(checks[0]?.status).toBe('fail');
    expect(checks[0]?.detail).toMatch(/SSRF guard/i);
  });

  test('red-team: IPv4-compatible ::7f00:1 / ::a9fe:a9fe refuse before fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    for (const blocked of ['https://[::7f00:1]/', 'https://[::a9fe:a9fe]/', 'https://[::127.0.0.1]/']) {
      const checks = await probeDeployedSite(blocked);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(checks[0]?.status).toBe('fail');
      expect(checks[0]?.detail).toMatch(/SSRF guard/i);
    }
  });

  test('red-team: numeric/hex/octal IPv4 forms normalize then refuse (no live bypass)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    for (const blocked of ['https://2130706433/', 'https://0x7f000001/', 'https://0177.0.0.1/']) {
      const checks = await probeDeployedSite(blocked);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(checks[0]?.status).toBe('fail');
      expect(checks[0]?.detail).toMatch(/SSRF guard/i);
    }
  });

  test('public v4-mapped Google DNS (::ffff:8.8.8.8) is allowed through the host filter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('ok', { status: 200, headers: { 'accept-ch': 'Sec-CH-Viewport-Width' } })),
    );

    const checks = await probeDeployedSite('https://[::ffff:808:808]/');
    expect(checks[0]?.status).not.toBe('fail');
    expect(checks[0]?.detail).not.toMatch(/SSRF guard/i);
  });
});
