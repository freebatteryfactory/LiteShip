/**
 * doctor — live deployed-site header probes (`--deployed <url>`).
 *
 * Fetches the production response and verifies CSP / COOP / COEP plus the
 * Accept-CH / Critical-CH pair (#116).
 *
 * SSRF hardening: the probe only ever fetches public HTTPS origins. The URL
 * (and every redirect hop — redirects are followed MANUALLY so each hop is
 * re-validated) must be `https:` and must not name a local-only host. Each hop
 * resolves DNS, admits only parsed global-unicast addresses in the A/AAAA set
 * (fail-closed), then tries each validated public address via
 * a pinned undici dispatcher (closing active DNS rebinding TOCTOU).
 *
 * @module
 */

import { lookup as dnsLookup } from 'node:dns/promises';
import { Agent, type Dispatcher } from 'undici';
import { ClientHints, CrossOriginIsolation } from '@liteship/edge';
import type { DoctorCheck } from './types.js';

const MAX_REDIRECT_HOPS = 5;
const FETCH_TIMEOUT_MS = 10_000;

interface SpecialPurposeAddressBlock {
  readonly cidr: string;
  readonly name: string;
}

/**
 * THE CLASS RULE — ANCHOR: every current IANA IPv4/IPv6 special-purpose
 * registry entry. ALLOWLIST: only a parsed address in the global-unicast
 * allocation and outside every entry below may be dialled. The former
 * denylist lost several ranges at once; adding bad-address spellings can
 * never make an address admissible.
 *
 * Embedded authority: IANA IPv4/IPv6 Special-Purpose Address Registries,
 * last updated 2025-10-09. A registry row is retained even when it overlaps a
 * broader row, so the test can prove that this embedded inventory stays live.
 */
export const SPECIAL_PURPOSE_ADDRESS_BLOCKS = [
  { cidr: '0.0.0.0/8', name: 'This network' },
  { cidr: '0.0.0.0/32', name: 'This host on this network' },
  { cidr: '10.0.0.0/8', name: 'Private-Use' },
  { cidr: '100.64.0.0/10', name: 'Shared Address Space' },
  { cidr: '127.0.0.0/8', name: 'Loopback' },
  { cidr: '169.254.0.0/16', name: 'Link Local' },
  { cidr: '172.16.0.0/12', name: 'Private-Use' },
  { cidr: '192.0.0.0/24', name: 'IETF Protocol Assignments' },
  { cidr: '192.0.0.0/29', name: 'IPv4 Service Continuity Prefix' },
  { cidr: '192.0.0.8/32', name: 'IPv4 dummy address' },
  { cidr: '192.0.0.9/32', name: 'Port Control Protocol Anycast' },
  { cidr: '192.0.0.10/32', name: 'Traversal Using Relays around NAT Anycast' },
  { cidr: '192.0.0.170/32', name: 'NAT64/DNS64 Discovery' },
  { cidr: '192.0.0.171/32', name: 'NAT64/DNS64 Discovery' },
  { cidr: '192.0.2.0/24', name: 'Documentation (TEST-NET-1)' },
  { cidr: '192.31.196.0/24', name: 'AS112-v4' },
  { cidr: '192.52.193.0/24', name: 'AMT' },
  { cidr: '192.88.99.0/24', name: 'Deprecated (6to4 Relay Anycast)' },
  { cidr: '192.88.99.2/32', name: '6a44-relay anycast address' },
  { cidr: '192.168.0.0/16', name: 'Private-Use' },
  { cidr: '192.175.48.0/24', name: 'Direct Delegation AS112 Service' },
  { cidr: '198.18.0.0/15', name: 'Benchmarking' },
  { cidr: '198.51.100.0/24', name: 'Documentation (TEST-NET-2)' },
  { cidr: '203.0.113.0/24', name: 'Documentation (TEST-NET-3)' },
  { cidr: '240.0.0.0/4', name: 'Reserved' },
  { cidr: '255.255.255.255/32', name: 'Limited Broadcast' },
  { cidr: '::1/128', name: 'Loopback Address' },
  { cidr: '::/128', name: 'Unspecified Address' },
  { cidr: '::ffff:0:0/96', name: 'IPv4-mapped Address' },
  { cidr: '64:ff9b::/96', name: 'IPv4-IPv6 Translation' },
  { cidr: '64:ff9b:1::/48', name: 'IPv4-IPv6 Translation' },
  { cidr: '100::/64', name: 'Discard-Only Address Block' },
  { cidr: '100:0:0:1::/64', name: 'Dummy IPv6 Prefix' },
  { cidr: '2001::/23', name: 'IETF Protocol Assignments' },
  { cidr: '2001::/32', name: 'TEREDO' },
  { cidr: '2001:1::1/128', name: 'Port Control Protocol Anycast' },
  { cidr: '2001:1::2/128', name: 'Traversal Using Relays around NAT Anycast' },
  { cidr: '2001:1::3/128', name: 'DNS-SD Service Registration Protocol Anycast' },
  { cidr: '2001:2::/48', name: 'Benchmarking' },
  { cidr: '2001:3::/32', name: 'AMT' },
  { cidr: '2001:4:112::/48', name: 'AS112-v6' },
  { cidr: '2001:10::/28', name: 'Deprecated (previously ORCHID)' },
  { cidr: '2001:20::/28', name: 'ORCHIDv2' },
  { cidr: '2001:30::/28', name: 'Drone Remote ID Protocol Entity Tags Prefix' },
  { cidr: '2001:db8::/32', name: 'Documentation' },
  { cidr: '2002::/16', name: '6to4' },
  { cidr: '2620:4f:8000::/48', name: 'Direct Delegation AS112 Service' },
  { cidr: '3fff::/20', name: 'Documentation' },
  { cidr: '5f00::/16', name: 'Segment Routing SIDs' },
  { cidr: 'fc00::/7', name: 'Unique-Local' },
  { cidr: 'fe80::/10', name: 'Link-Local Unicast' },
] as const satisfies readonly SpecialPurposeAddressBlock[];

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function parseIpv4Address(address: string): readonly [number, number, number, number] | null {
  const match = IPV4_RE.exec(address);
  if (!match) return null;
  const octets = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])] as const;
  return octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) ? octets : null;
}

function ipv4Value(octets: readonly [number, number, number, number]): number {
  return ((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3];
}

function ipv6SideWords(side: string): readonly number[] | null {
  if (side === '') return [];
  const tokens = side.split(':');
  if (tokens.some((token) => token === '')) return null;
  const words: number[] = [];
  for (const [index, token] of tokens.entries()) {
    if (token.includes('.')) {
      if (index !== tokens.length - 1) return null;
      const octets = parseIpv4Address(token);
      if (octets === null) return null;
      words.push(octets[0] * 256 + octets[1], octets[2] * 256 + octets[3]);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/iu.test(token)) return null;
    words.push(Number.parseInt(token, 16));
  }
  return words;
}

function parseIpv6Address(address: string): readonly number[] | null {
  const bare = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (bare.includes('%')) return null;
  const compression = bare.indexOf('::');
  if (compression !== -1 && compression !== bare.lastIndexOf('::')) return null;
  const leftText = compression === -1 ? bare : bare.slice(0, compression);
  const rightText = compression === -1 ? '' : bare.slice(compression + 2);
  const left = ipv6SideWords(leftText);
  const right = ipv6SideWords(rightText);
  if (left === null || right === null) return null;
  if (compression === -1) return left.length === 8 ? left : null;
  const omitted = 8 - left.length - right.length;
  return omitted > 0 ? [...left, ...Array.from({ length: omitted }, () => 0), ...right] : null;
}

function addressInCidr(address: string, cidr: string): boolean {
  const separator = cidr.lastIndexOf('/');
  const network = cidr.slice(0, separator);
  const prefix = Number(cidr.slice(separator + 1));
  const addressV4 = parseIpv4Address(address);
  const networkV4 = parseIpv4Address(network);
  if (addressV4 !== null || networkV4 !== null) {
    if (addressV4 === null || networkV4 === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32)
      return false;
    const divisor = 2 ** (32 - prefix);
    return Math.floor(ipv4Value(addressV4) / divisor) === Math.floor(ipv4Value(networkV4) / divisor);
  }

  const addressV6 = parseIpv6Address(address);
  const networkV6 = parseIpv6Address(network);
  if (addressV6 === null || networkV6 === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 128) return false;
  const wholeWords = Math.floor(prefix / 16);
  for (let index = 0; index < wholeWords; index += 1) {
    if (addressV6[index] !== networkV6[index]) return false;
  }
  const remainingBits = prefix % 16;
  if (remainingBits === 0) return true;
  const divisor = 2 ** (16 - remainingBits);
  return Math.floor(addressV6[wholeWords]! / divisor) === Math.floor(networkV6[wholeWords]! / divisor);
}

/** True only for a parsed, globally routable unicast address. */
export function isAdmissiblePublicAddress(address: string): boolean {
  const bare = address.toLowerCase().replace(/^\[|\]$/g, '');
  const ipv4 = parseIpv4Address(bare);
  if (ipv4 !== null) {
    // IPv4 multicast is not in the special-purpose registry, but it is never unicast.
    if (ipv4[0] >= 224) return false;
  } else {
    const ipv6 = parseIpv6Address(bare);
    if (ipv6 === null) return false;
    // Current IANA global-unicast allocation is 2000::/3; ff00::/8 multicast
    // and every other unallocated family fail closed before the table check.
    if ((ipv6[0]! & 0xe000) !== 0x2000) return false;
  }
  return !SPECIAL_PURPOSE_ADDRESS_BLOCKS.some(({ cidr }) => addressInCidr(bare, cidr));
}

function isLiteralIpHostname(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, '');
  return parseIpv4Address(bare) !== null || parseIpv6Address(bare) !== null;
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === '' || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local');
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
    if (!isAdmissiblePublicAddress(bare)) return { _tag: 'blocked' };
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

  const pins: PinnedAddress[] = [];
  for (const record of records) {
    if (record.family !== 4 && record.family !== 6) return { _tag: 'blocked' };
    const familyMatchesAddress =
      record.family === 4 ? parseIpv4Address(record.address) !== null : parseIpv6Address(record.address) !== null;
    if (!familyMatchesAddress || !isAdmissiblePublicAddress(record.address)) {
      return { _tag: 'blocked' };
    }
    pins.push({ address: record.address, family: record.family });
  }

  return { _tag: 'ok', pins };
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
  if (
    isLocalHostname(url.hostname) ||
    (isLiteralIpHostname(url.hostname) && !isAdmissiblePublicAddress(url.hostname))
  ) {
    return `Refusing to probe ${url.href} — host is not a public global-unicast address (SSRF guard)`;
  }
  return null;
}

function headerSummary(headers: Headers, name: string): string | null {
  const value = headers.get(name);
  return value && value.trim().length > 0 ? value.trim() : null;
}

/** Split a comma-separated list header into trimmed, LOWERCASED, non-empty tokens (case-insensitive comparison). */
function tokenizeHeader(value: string): string[] {
  return value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}

/** The leading structured token of a policy header (drop any `; report-to="…"` params), lowercased. */
function policyToken(value: string): string {
  return value.split(';')[0]!.trim().toLowerCase();
}

/**
 * Advisory check that a deployed list-header CONTAINS every token liteship requests.
 * `ok` only when the full expected set is present; `warn` (never `fail`) when the
 * header is absent or missing any required token. The expected set is DERIVED from
 * the passed liteship header value (e.g. `ClientHints.acceptCHHeader()`), never a
 * hand-kept copy — so it tracks the framework automatically (Law 6).
 */
function listHeaderCoverageCheck(args: {
  readonly id: string;
  readonly label: string;
  readonly actual: string | null;
  readonly expected: string;
  readonly missingDetail: string;
  readonly unit: string;
  readonly hint?: string;
}): DoctorCheck {
  const required = tokenizeHeader(args.expected);
  const present = new Set(args.actual ? tokenizeHeader(args.actual) : []);
  const missing = required.filter((token) => !present.has(token));
  const status: DoctorCheck['status'] = args.actual === null ? 'warn' : missing.length === 0 ? 'ok' : 'warn';
  const detail =
    args.actual === null
      ? args.missingDetail
      : missing.length === 0
        ? args.actual
        : `present but missing ${missing.length} required ${args.unit}: ${missing.join(', ')}`;
  return {
    id: args.id,
    label: args.label,
    status,
    detail,
    ...(args.hint ? { hint: args.hint } : {}),
  };
}

const refusedCheck = (detail: string): readonly DoctorCheck[] => [
  {
    id: 'deployed.fetch',
    label: 'Deployed site fetch',
    status: 'fail',
    detail,
    hint: 'Pass a public HTTPS URL to `liteship doctor --deployed <url>`',
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
          `Refusing to probe ${current.href} — DNS resolution returned a loopback/private/link-local/special-use or unparseable address (SSRF guard)`,
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

  // COOP/COEP must carry the ACTUAL isolating token, not merely be present:
  // `unsafe-none` sets the header but does NOT establish cross-origin isolation, so
  // `SharedArrayBuffer` (client:worker) stays unavailable. The accepted values are
  // DERIVED from `@liteship/edge`'s `CrossOriginIsolation` (the same source `@liteship/astro`
  // emits from), never hand-listed here (Law 6). Advisory — `warn`, never `fail`.
  const isolationExpectations: ReadonlyArray<{
    readonly name: string;
    readonly isolating: (token: string) => boolean;
    readonly needs: string;
  }> = [
    {
      name: 'Cross-Origin-Opener-Policy',
      isolating: (token) => token === CrossOriginIsolation.openerPolicy().toLowerCase(),
      needs: `needs "${CrossOriginIsolation.openerPolicy()}"`,
    },
    {
      name: 'Cross-Origin-Embedder-Policy',
      isolating: (token) => CrossOriginIsolation.embedderPolicies().some((p) => p.toLowerCase() === token),
      needs: `needs one of ${CrossOriginIsolation.embedderPolicies().join(' | ')}`,
    },
  ];
  for (const { name, isolating, needs } of isolationExpectations) {
    const value = headerSummary(headers, name);
    const isolates = value !== null && isolating(policyToken(value));
    checks.push({
      id: `deployed.${name.toLowerCase()}`,
      label: name,
      status: isolates ? 'ok' : 'warn',
      detail:
        value === null
          ? 'missing — required for SharedArrayBuffer / client:worker'
          : isolates
            ? value
            : `"${value}" does not establish cross-origin isolation — ${needs}`,
      hint: 'Enable workers in liteship integration or set COOP/COEP on your host middleware',
    });
  }

  // Accept-CH / Critical-CH / Vary must CONTAIN liteship's requested Client-Hint set —
  // any single junk hint used to pass. The expected token sets are DERIVED from
  // `@liteship/edge`'s `ClientHints` (the source `@liteship/astro`/`@liteship/edge` request the
  // hints from), tokenized + compared case-insensitively (Law 6). Advisory.
  checks.push(
    listHeaderCoverageCheck({
      id: 'deployed.accept-ch',
      label: 'Accept-CH',
      actual: headerSummary(headers, 'Accept-CH'),
      expected: ClientHints.acceptCHHeader(),
      missingDetail: 'missing — tier detection may degrade on first navigation',
      unit: 'hint(s)',
    }),
  );
  checks.push(
    listHeaderCoverageCheck({
      id: 'deployed.critical-ch',
      label: 'Critical-CH',
      actual: headerSummary(headers, 'Critical-CH'),
      expected: ClientHints.criticalCHHeader(),
      missingDetail: 'missing — Sec-CH-Viewport-Width may be absent before first render',
      unit: 'hint(s)',
      hint: 'Use liteshipMiddleware or cloudflareMiddleware so Client Hints are requested',
    }),
  );
  checks.push(
    listHeaderCoverageCheck({
      id: 'deployed.vary',
      label: 'Vary',
      actual: headerSummary(headers, 'Vary'),
      expected: ClientHints.varyCHHeader(),
      missingDetail: 'missing — CDN may serve wrong-tier HTML (#122)',
      unit: 'Client-Hint axis(es)',
      hint: 'liteship detect middleware emits Vary on Client Hint inputs',
    }),
  );

  return checks;
}
