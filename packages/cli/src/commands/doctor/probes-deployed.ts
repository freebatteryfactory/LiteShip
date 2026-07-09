/**
 * doctor — live deployed-site header probes (`--deployed <url>`).
 *
 * Fetches the production response and verifies CSP / COOP / COEP plus the
 * Accept-CH / Critical-CH pair (#116).
 *
 * SSRF hardening: the probe only ever fetches public HTTPS origins. The URL
 * (and every redirect hop — redirects are followed MANUALLY so each hop is
 * re-validated) must be `https:` and must not name a loopback / private /
 * link-local host. Each hop resolves DNS, rejects any private/reserved address
 * in the A/AAAA set (fail-closed), then tries each validated public address via
 * a pinned undici dispatcher (closing active DNS rebinding TOCTOU).
 *
 * @module
 */

import { lookup as dnsLookup } from 'node:dns/promises';
import { Agent, type Dispatcher } from 'undici';
import type { DoctorCheck } from './types.js';

const REQUIRED_ISOLATION = ['Cross-Origin-Opener-Policy', 'Cross-Origin-Embedder-Policy'] as const;

const MAX_REDIRECT_HOPS = 5;
const FETCH_TIMEOUT_MS = 10_000;

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** True when dotted-quad `a.b.c.d` is loopback / private / link-local / CGNAT. */
function isBlockedIpv4(a: number, b: number, _c: number, _d: number): boolean {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 198.18.0.0/15 — benchmarking (RFC 2544); not a public probe target.
  if (a === 198 && b >= 18 && b <= 19) return true;
  // 224.0.0.0/4 multicast and 240.0.0.0/4 reserved — align with runtime-url SSRF guard.
  if (a >= 224) return true;
  return false;
}

/** Extract an embedded IPv4 from a hex/dotted two-hextet tail (`a9fe:a9fe` / `127.0.0.1`). */
function ipv4FromEmbeddedTail(tail: string): string | null {
  const dotted = IPV4_RE.exec(tail);
  if (dotted) {
    return tail;
  }
  const parts = tail.split(':').filter(Boolean);
  if (parts.length !== 2) {
    return null;
  }
  const high = Number.parseInt(parts[0]!, 16);
  const low = Number.parseInt(parts[1]!, 16);
  if (!Number.isFinite(high) || !Number.isFinite(low) || high < 0 || low < 0 || high > 0xffff || low > 0xffff) {
    return null;
  }
  return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
}

/** True when a blocked IPv4 is embedded in a v4-mapped or IPv4-compatible IPv6 host. */
function isBlockedEmbeddedIpv4(host: string): boolean {
  if (host.startsWith('::ffff:')) {
    const embedded = ipv4FromEmbeddedTail(host.slice('::ffff:'.length));
    if (embedded !== null) {
      const octets = IPV4_RE.exec(embedded);
      if (octets) {
        return isBlockedIpv4(Number(octets[1]), Number(octets[2]), Number(octets[3]), Number(octets[4]));
      }
    }
    // Unparseable v4-mapped — never a canonical public probe target.
    return true;
  }

  // Deprecated IPv4-compatible form (`::7f00:1`, `::a9fe:a9fe`) — URL normalizes
  // `::127.0.0.1` to this shape. Fail-closed when the embedded v4 is blocked.
  if (host.startsWith('::') && host !== '::' && host !== '::1' && !host.startsWith('::ffff:')) {
    const embedded = ipv4FromEmbeddedTail(host.slice(2));
    if (embedded !== null) {
      const octets = IPV4_RE.exec(embedded);
      if (octets) {
        return isBlockedIpv4(Number(octets[1]), Number(octets[2]), Number(octets[3]), Number(octets[4]));
      }
    }
  }

  return false;
}

/**
 * True when an IPv6 literal is a non-public special-use range not covered by the
 * ULA/link-local/loopback checks above — multicast (ff00::/8), deprecated
 * site-local (fec0::/10), documentation (2001:db8::/32), 6to4 (2002::/16).
 * Prefix heuristics on the normalized host string (DNS verbatim form).
 */
function isBlockedIpv6SpecialUse(host: string): boolean {
  const lower = host.toLowerCase();
  if (/^ff/i.test(lower)) return true;
  if (/^fec[0-3]/i.test(lower)) return true;
  if (/^2001:0?db8:/i.test(lower)) return true;
  if (/^2002:/i.test(lower)) return true;
  if (/^100:/i.test(lower)) return true;
  return false;
}

/** True when `hostname` is a loopback / private / link-local / special-use host. */
function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === '' || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }

  const v4 = IPV4_RE.exec(host);
  if (v4) {
    return isBlockedIpv4(Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4]));
  }

  if (host.includes(':')) {
    if (host === '::' || host === '::1') return true;
    if (host.startsWith('fc') || host.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(host)) return true;
    if (isBlockedIpv6SpecialUse(host)) return true;
    if (isBlockedEmbeddedIpv4(host)) return true;
  }

  return false;
}

/** True when the hostname is a literal IP (v4 or v6) — skip DNS, use string guard only. */
function isLiteralIpHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '');
  return IPV4_RE.test(host) || host.includes(':');
}

interface PinnedAddress {
  readonly address: string;
  readonly family: 4 | 6;
}

type ResolvePinnedResult =
  | { readonly _tag: 'ok'; readonly pins: readonly PinnedAddress[] }
  | { readonly _tag: 'blocked' }
  | { readonly _tag: 'dnsError'; readonly detail: string };

/**
 * Resolve `hostname` to connectable public addresses. Fail-closed when any
 * A/AAAA record is blocked or when resolution yields nothing usable.
 */
async function resolvePinnedPublicAddresses(hostname: string): Promise<ResolvePinnedResult> {
  const bare = hostname.replace(/^\[|\]$/g, '');

  if (isLiteralIpHostname(hostname)) {
    if (isBlockedHostname(bare)) return { _tag: 'blocked' };
    return { _tag: 'ok', pins: [{ address: bare, family: bare.includes(':') ? 6 : 4 }] };
  }

  let records: { address: string; family: number }[];
  try {
    const lookedUp = await dnsLookup(hostname, { all: true, verbatim: true });
    records = Array.isArray(lookedUp) ? lookedUp : [lookedUp];
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { _tag: 'dnsError', detail };
  }

  if (records.length === 0) return { _tag: 'blocked' };

  for (const record of records) {
    if (isBlockedHostname(record.address)) {
      return { _tag: 'blocked' };
    }
  }

  return {
    _tag: 'ok',
    pins: records.map((record) => ({
      address: record.address,
      family: record.family === 6 ? 6 : 4,
    })),
  };
}

/** undici dispatcher that connects only to a pre-validated address (DNS rebinding guard). */
function pinnedDispatcher(pin: PinnedAddress): Agent {
  return new Agent({
    connect: {
      lookup(_hostname, _options, callback) {
        callback(null, pin.address, pin.family);
      },
    },
  });
}

/** Fetch one hop with DNS pinning; try each validated public address before failing. */
async function fetchPinnedHop(url: URL, pins: readonly PinnedAddress[]): Promise<Response> {
  let lastError: unknown;
  for (const pin of pins) {
    const agent = pinnedDispatcher(pin);
    try {
      const response = await fetch(url.href, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        dispatcher: agent,
      } as RequestInit & { dispatcher: Dispatcher });
      await response.body?.cancel();
      return response;
    } catch (error) {
      lastError = error;
    } finally {
      await agent.close();
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Reason a URL is refused as a deployed-probe target, or null when acceptable. */
function rejectedDeployedUrl(url: URL): string | null {
  if (url.protocol !== 'https:') {
    return `Refusing to probe non-HTTPS URL ${url.href} — deployed probes only fetch public https:// origins`;
  }
  if (isBlockedHostname(url.hostname)) {
    return `Refusing to probe ${url.href} — host resolves to a loopback/private/link-local range (SSRF guard)`;
  }
  return null;
}

function headerSummary(headers: Headers, name: string): string | null {
  const value = headers.get(name);
  return value && value.trim().length > 0 ? value.trim() : null;
}

const refusedCheck = (detail: string): readonly DoctorCheck[] => [
  {
    id: 'deployed.fetch',
    label: 'Deployed site fetch',
    status: 'fail',
    detail,
    hint: 'Pass a public HTTPS URL to `czap doctor --deployed <url>`',
  },
];

/**
 * Probe a deployed URL's response headers. Returns one check per concern.
 */
export async function probeDeployedSite(url: string): Promise<readonly DoctorCheck[]> {
  let current: URL;
  try {
    current = new URL(url);
  } catch {
    return refusedCheck(`Not a valid URL: ${url}`);
  }

  let response: Response;
  try {
    let hops = 0;
    for (;;) {
      const rejection = rejectedDeployedUrl(current);
      if (rejection) {
        return refusedCheck(rejection);
      }

      const resolved = await resolvePinnedPublicAddresses(current.hostname);
      if (resolved._tag === 'dnsError') {
        return refusedCheck(`Refusing to probe ${current.href} — DNS resolution failed: ${resolved.detail}`);
      }
      if (resolved._tag === 'blocked') {
        return refusedCheck(
          `Refusing to probe ${current.href} — DNS resolution returned a loopback/private/link-local address (SSRF guard)`,
        );
      }

      response = await fetchPinnedHop(current, resolved.pins);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          break; // 3xx without Location — report it as-is below
        }
        hops += 1;
        if (hops > MAX_REDIRECT_HOPS) {
          return refusedCheck(`Too many redirects (> ${MAX_REDIRECT_HOPS}) starting from ${url}`);
        }
        // Each hop re-enters the loop and is re-validated against the SSRF guard.
        current = new URL(location, current);
        continue;
      }
      break;
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return refusedCheck(`Could not fetch ${current.href}: ${detail}`);
  }

  const headers = response.headers;
  const checks: DoctorCheck[] = [
    {
      id: 'deployed.fetch',
      label: 'Deployed site fetch',
      status: response.ok ? 'ok' : 'warn',
      detail: response.ok
        ? `${response.status} ${response.statusText}`
        : `HTTP ${response.status} from ${current.href}`,
    },
  ];

  const csp = headerSummary(headers, 'content-security-policy');
  checks.push({
    id: 'deployed.csp',
    label: 'Content-Security-Policy',
    status: csp ? 'ok' : 'warn',
    detail: csp ?? 'missing — worker-src/connect-src may be required for client:worker / SSE',
    hint: "Add a CSP with worker-src 'self' blob: and connect-src for your runtime endpoints",
  });

  for (const name of REQUIRED_ISOLATION) {
    const value = headerSummary(headers, name);
    checks.push({
      id: `deployed.${name.toLowerCase()}`,
      label: name,
      status: value ? 'ok' : 'warn',
      detail: value ?? `missing — required for SharedArrayBuffer / client:worker`,
      hint: 'Enable workers in czap integration or set COOP/COEP on your host middleware',
    });
  }

  const acceptCH = headerSummary(headers, 'Accept-CH');
  const criticalCH = headerSummary(headers, 'Critical-CH');
  checks.push({
    id: 'deployed.accept-ch',
    label: 'Accept-CH',
    status: acceptCH ? 'ok' : 'warn',
    detail: acceptCH ?? 'missing — tier detection may degrade on first navigation',
  });
  checks.push({
    id: 'deployed.critical-ch',
    label: 'Critical-CH',
    status: criticalCH ? 'ok' : 'warn',
    detail: criticalCH ?? 'missing — Sec-CH-Viewport-Width may be absent before first render',
    hint: 'Use czapMiddleware or cloudflareMiddleware so Client Hints are requested',
  });

  const vary = headerSummary(headers, 'Vary');
  checks.push({
    id: 'deployed.vary',
    label: 'Vary',
    status: vary && vary.includes('Sec-CH') ? 'ok' : 'warn',
    detail: vary ?? 'missing — CDN may serve wrong-tier HTML (#122)',
    hint: 'czap detect middleware emits Vary on Client Hint inputs',
  });

  return checks;
}
