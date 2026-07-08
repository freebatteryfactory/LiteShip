/**
 * doctor — live deployed-site header probes (`--deployed <url>`).
 *
 * Fetches the production response and verifies CSP / COOP / COEP plus the
 * Accept-CH / Critical-CH pair (#116).
 *
 * SSRF hardening: the probe only ever fetches public HTTPS origins. The URL
 * (and every redirect hop — redirects are followed MANUALLY so each hop is
 * re-validated) must be `https:` and must not name a loopback / private /
 * link-local host. Each hop is bounded by a timeout so a black-holed URL
 * cannot hang `--ci` runs. Hostname checks are literal (no DNS resolution),
 * which is the right trade-off for a dev CLI: the https requirement means a
 * rebinding host still has to present a valid certificate for the name.
 *
 * @module
 */

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
  return false;
}

/** Extract an embedded IPv4 from a v4-mapped tail (dotted OR hex — URL normalizes to hex). */
function ipv4FromV4MappedTail(tail: string): string | null {
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
    if (host.startsWith('::ffff:')) {
      const embedded = ipv4FromV4MappedTail(host.slice('::ffff:'.length));
      if (embedded !== null) {
        const octets = IPV4_RE.exec(embedded);
        if (octets) {
          return isBlockedIpv4(Number(octets[1]), Number(octets[2]), Number(octets[3]), Number(octets[4]));
        }
      }
      // Unparseable or any v4-mapped form — never a canonical public probe target.
      return true;
    }
  }

  return false;
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

      response = await fetch(current.href, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

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
