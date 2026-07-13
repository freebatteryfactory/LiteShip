import { describe, expect, test, vi, afterEach, beforeEach } from 'vitest';
import { lookup as dnsLookup } from 'node:dns/promises';
import { probeDeployedSite } from '../../../../packages/cli/src/commands/doctor/probes-deployed.js';
// Source of truth for what czap emits — the probe validates DEPLOYED headers against
// exactly these, so the tests derive their "ok" fixtures from them too (no hardcoded
// header copy that could drift from the framework — Law 6).
import { ClientHints, CrossOriginIsolation } from '../../../../packages/edge/src/index.js';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));

const mockedLookup = vi.mocked(dnsLookup);

/** A full, valid czap response-header set derived from `@czap/edge` — the "everything ok" case. */
function czapHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  const isolation = CrossOriginIsolation.isolationHeaders(); // COOP same-origin, COEP require-corp
  return {
    'content-security-policy': "default-src 'self'",
    'cross-origin-opener-policy': isolation['Cross-Origin-Opener-Policy']!,
    'cross-origin-embedder-policy': isolation['Cross-Origin-Embedder-Policy']!,
    'accept-ch': ClientHints.acceptCHHeader(),
    'critical-ch': ClientHints.criticalCHHeader(),
    vary: ClientHints.varyCHHeader(),
    ...overrides,
  };
}

/** Drive the probe against a single 200 response carrying `headers`, return checks keyed by id. */
async function probeWith(headers: Record<string, string>): Promise<Record<string, { status: string; detail: string }>> {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200, headers })));
  const checks = await probeDeployedSite('https://example.test/');
  return Object.fromEntries(checks.map((c) => [c.id, { status: c.status, detail: c.detail }]));
}

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
    if (host === 'docv6.example') {
      return [{ address: '2001:db8::1', family: 6 }];
    }
    if (host === 'mcastv6.example') {
      return [{ address: 'ff02::1', family: 6 }];
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

  test('a fully czap-configured response is ok across every header check', async () => {
    const byId = await probeWith(czapHeaders());
    expect(byId['deployed.cross-origin-opener-policy']?.status).toBe('ok');
    expect(byId['deployed.cross-origin-embedder-policy']?.status).toBe('ok');
    expect(byId['deployed.accept-ch']?.status).toBe('ok');
    expect(byId['deployed.critical-ch']?.status).toBe('ok');
    expect(byId['deployed.vary']?.status).toBe('ok');
    expect(mockedLookup).toHaveBeenCalledWith('example.test', { all: true, verbatim: true });
  });

  // ── F-PROTO-2: semantic header validation, not mere presence ──────────────────

  test('COOP/COEP set to unsafe-none are a warn — the header is present but does not isolate', async () => {
    const byId = await probeWith(
      czapHeaders({ 'cross-origin-opener-policy': 'unsafe-none', 'cross-origin-embedder-policy': 'unsafe-none' }),
    );
    expect(byId['deployed.cross-origin-opener-policy']?.status).toBe('warn');
    expect(byId['deployed.cross-origin-opener-policy']?.detail).toMatch(/does not establish cross-origin isolation/i);
    expect(byId['deployed.cross-origin-embedder-policy']?.status).toBe('warn');
  });

  test('both isolating COEP tokens (require-corp AND credentialless) are accepted', async () => {
    for (const coep of CrossOriginIsolation.embedderPolicies()) {
      const byId = await probeWith(czapHeaders({ 'cross-origin-embedder-policy': coep }));
      expect(byId['deployed.cross-origin-embedder-policy']?.status, `COEP ${coep}`).toBe('ok');
    }
  });

  test('COOP with a report-to parameter still isolates (leading token compared)', async () => {
    const byId = await probeWith(czapHeaders({ 'cross-origin-opener-policy': 'same-origin; report-to="coop"' }));
    expect(byId['deployed.cross-origin-opener-policy']?.status).toBe('ok');
  });

  test('Accept-CH missing a required hint is a warn; the full requested set is ok', async () => {
    const partial = ClientHints.acceptCHHeader().split(',').slice(0, 1).join(','); // one hint only
    const warned = await probeWith(czapHeaders({ 'accept-ch': partial }));
    expect(warned['deployed.accept-ch']?.status).toBe('warn');
    expect(warned['deployed.accept-ch']?.detail).toMatch(/missing/i);

    const full = await probeWith(czapHeaders({ 'accept-ch': ClientHints.acceptCHHeader() }));
    expect(full['deployed.accept-ch']?.status).toBe('ok');
  });

  test('Critical-CH missing a required hint is a warn; the full set is ok', async () => {
    const partial = ClientHints.criticalCHHeader().split(',').slice(0, 1).join(',');
    const warned = await probeWith(czapHeaders({ 'critical-ch': partial }));
    expect(warned['deployed.critical-ch']?.status).toBe('warn');

    const full = await probeWith(czapHeaders({ 'critical-ch': ClientHints.criticalCHHeader() }));
    expect(full['deployed.critical-ch']?.status).toBe('ok');
  });

  test('Vary is compared case-insensitively and tokenized — lowercased full set is ok', async () => {
    const lowercased = ClientHints.varyCHHeader().toLowerCase();
    const byId = await probeWith(czapHeaders({ vary: lowercased }));
    expect(byId['deployed.vary']?.status).toBe('ok');
  });

  test('Vary missing a required Client-Hint axis is a warn (not a bare Sec-CH substring pass)', async () => {
    const byId = await probeWith(czapHeaders({ vary: 'Sec-CH-Viewport-Width' })); // one axis only
    expect(byId['deployed.vary']?.status).toBe('warn');
    expect(byId['deployed.vary']?.detail).toMatch(/missing/i);
  });

  test('missing COOP/COEP/Accept-CH/Critical-CH/Vary each warn (advisory, never fail)', async () => {
    const byId = await probeWith({ 'content-security-policy': "default-src 'self'" });
    for (const id of [
      'deployed.cross-origin-opener-policy',
      'deployed.cross-origin-embedder-policy',
      'deployed.accept-ch',
      'deployed.critical-ch',
      'deployed.vary',
    ]) {
      expect(byId[id]?.status, id).toBe('warn');
    }
    // The deployed fetch itself succeeded — header gaps never escalate to fail.
    expect(byId['deployed.fetch']?.status).toBe('ok');
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
      'https://[ff02::1]/',
      'https://[2001:db8::1]/',
      'https://[fec0::1]/',
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

  test('refuses hostname resolving to IPv6 special-use address before fetch (DNS SSRF)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    for (const host of ['https://docv6.example/', 'https://mcastv6.example/']) {
      const checks = await probeDeployedSite(host);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(checks[0]?.status).toBe('fail');
      expect(checks[0]?.detail).toMatch(/DNS resolution returned a loopback\/private/i);
    }
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

  test('falls back to later public DNS address when first pin is unreachable', async () => {
    mockedLookup.mockImplementation(async () => [
      { address: '2607:f8b0:4005:8000::2003', family: 6 },
      { address: '93.184.216.34', family: 4 },
    ]);
    let fetchAttempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetchAttempts += 1;
        if (fetchAttempts === 1) {
          throw new Error('connect EHOSTUNREACH');
        }
        return new Response('ok', { status: 200, headers: {} });
      }),
    );

    const checks = await probeDeployedSite('https://dual-stack.example/');
    expect(checks[0]?.status).not.toBe('fail');
    expect(fetchAttempts).toBe(2);
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
