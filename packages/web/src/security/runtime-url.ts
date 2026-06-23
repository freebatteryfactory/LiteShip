/**
 * Runtime URL resolution -- resolve user-supplied URLs for streaming,
 * snapshots, replays, LLMs, GPU shaders, and WASM modules under a
 * {@link RuntimeEndpointPolicy}. Prevents common SSRF-style pitfalls
 * (private IPs, `file:` URLs, cross-origin escape) and returns a
 * structured rejection reason instead of silently dropping the URL.
 *
 * @module
 */
import type { RuntimeEndpointKind, RuntimeEndpointPolicy } from '../types.js';

/**
 * Discriminated union returned by {@link resolveRuntimeUrl}. Every
 * non-`allowed` variant preserves enough context for the caller to log
 * or report why the URL was rejected.
 */
export type RuntimeUrlResolution =
  | { readonly type: 'missing' }
  | {
      readonly type: 'malformed';
      readonly rawUrl: string;
      readonly baseOrigin: string;
      readonly reason: 'url-can-parse-rejected' | 'url-constructor-threw';
      readonly detail?: string;
    }
  | { readonly type: 'cross-origin-rejected'; readonly resolved: URL }
  | { readonly type: 'origin-not-allowed'; readonly resolved: URL }
  | { readonly type: 'kind-not-allowed'; readonly resolved: URL }
  | { readonly type: 'private-ip-rejected'; readonly resolved: URL }
  | { readonly type: 'allowed'; readonly url: string; readonly resolved: URL };

/**
 * Options passed to {@link resolveRuntimeUrl}.
 *
 * `kind` is required because per-endpoint-kind allowlists are a core
 * part of the runtime policy. `baseOrigin` defaults to
 * `globalThis.location.origin` on the client.
 */
export interface ResolveRuntimeUrlOptions {
  /** Endpoint category used to pick a per-kind allowlist. */
  readonly kind: RuntimeEndpointKind;
  /** Host-configured endpoint policy (defaults to same-origin). */
  readonly policy?: RuntimeEndpointPolicy;
  /** Base origin for resolving relative URLs; defaults to `location.origin`. */
  readonly baseOrigin?: string;
}

type MalformedRuntimeUrlResolution = Extract<RuntimeUrlResolution, { readonly type: 'malformed' }>;
type NormalizedRuntimeEndpointPolicy = {
  readonly mode: RuntimeEndpointPolicy['mode'];
  readonly allowOrigins: readonly string[];
  readonly byKind: Record<RuntimeEndpointKind, readonly string[]>;
};

function parseAbsoluteUrl(value: string): URL | null {
  let parsed: URL | null = null;

  try {
    if (typeof URL.parse === 'function') {
      parsed = URL.parse(value);
    } else if (typeof URL.canParse === 'function') {
      parsed = URL.canParse(value) ? new URL(value) : null;
    }
  } catch {
    parsed = null;
  }

  return parsed;
}

function normalizeComparableOrigin(origin: string): string | null {
  const parsed = parseAbsoluteUrl(origin);
  return parsed ? parsed.origin.toLowerCase() : null;
}

function runtimeBaseOrigin(baseOrigin?: string): string {
  if (baseOrigin && baseOrigin !== 'null') {
    return baseOrigin;
  }

  const origin = globalThis.location?.origin;
  if (origin && origin !== 'null') {
    return origin;
  }

  return 'http://localhost';
}

function normalizeOriginAllowlist(origins?: readonly string[]): readonly string[] {
  if (!origins || origins.length === 0) {
    return [];
  }

  return origins
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map(normalizeComparableOrigin)
    .filter((origin): origin is string => origin !== null);
}

function normalizeEndpointPolicy(policy?: RuntimeEndpointPolicy): NormalizedRuntimeEndpointPolicy {
  return {
    mode: policy?.mode ?? 'same-origin',
    allowOrigins: normalizeOriginAllowlist(policy?.allowOrigins),
    byKind: {
      stream: normalizeOriginAllowlist(policy?.byKind?.stream),
      snapshot: normalizeOriginAllowlist(policy?.byKind?.snapshot),
      replay: normalizeOriginAllowlist(policy?.byKind?.replay),
      llm: normalizeOriginAllowlist(policy?.byKind?.llm),
      'gpu-shader': normalizeOriginAllowlist(policy?.byKind?.['gpu-shader']),
      wasm: normalizeOriginAllowlist(policy?.byKind?.wasm),
    },
  };
}

function parseIPv4Octets(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map(Number);
  if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
  return octets as [number, number, number, number];
}

function isIPv6PrivateOrReserved(hostname: string): boolean {
  // URL parser wraps IPv6 in brackets
  const raw = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  const lower = raw.toLowerCase();

  // :: all-zeros (IPv6 equivalent of 0.0.0.0)
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;

  // ::1 loopback
  if (lower === '::1') return true;

  // ::ffff:x.x.x.x IPv4-mapped IPv6 — extract the IPv4 part and check it
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) {
    const octets = parseIPv4Octets(v4Mapped[1]!);
    if (octets) {
      const [a, b] = octets;
      if (a === 0) return true;
      if (a === 127) return true;
      if (a === 10) return true;
      if (a === 100 && b >= 64 && b <= 127) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
      if (a >= 224) return true;
    }
    return false;
  }

  const hexMapped = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    const high = Number.parseInt(hexMapped[1]!, 16);
    const low = Number.parseInt(hexMapped[2]!, 16);
    const octets: [number, number, number, number] = [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff];
    const [a, b] = octets;
    if (a === 0) return true;
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a >= 224) return true;
    return false;
  }

  // fe80::/10 link-local
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true;
  }

  // fc00::/7 unique local (fc00:: - fdff::)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  return false;
}

/**
 * Return `true` when `hostname` resolves to `localhost`, a private
 * RFC 1918 network, link-local, carrier-grade NAT, or a reserved
 * range. Handles both IPv4 and IPv6 literals. Used to block SSRF
 * attempts against metadata services (e.g. 169.254.169.254).
 */
export function isPrivateOrReservedIP(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (lower === 'localhost') return true;

  // IPv4 checks
  const octets = parseIPv4Octets(lower);
  if (octets) {
    const [a, b] = octets;
    // 0.0.0.0/8 (reserved, RFC 1122)
    if (a === 0) return true;
    // 127.0.0.0/8
    if (a === 127) return true;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 100.64.0.0/10 carrier-grade NAT
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16
    if (a === 169 && b === 254) return true;
    // 224.0.0.0/4 multicast and 240.0.0.0/4 reserved
    if (a >= 224) return true;

    return false;
  }

  // IPv6 checks
  if (isIPv6PrivateOrReserved(lower)) return true;

  return false;
}

function isBlockedProtocol(protocol: string): boolean {
  return protocol === 'file:';
}

function malformedResolution(
  rawUrl: string,
  baseOrigin: string,
  reason: MalformedRuntimeUrlResolution['reason'],
  detail?: string,
): MalformedRuntimeUrlResolution {
  return {
    type: 'malformed',
    rawUrl,
    baseOrigin,
    reason,
    ...(detail ? { detail } : {}),
  };
}

/**
 * Inner-whitespace test — a single URL TOKEN carries NO inner whitespace or
 * newline. This is the load-bearing distinguisher between a fetchable URL token and
 * an inline body: the WHATWG URL parser SILENTLY percent-encodes/strips inner
 * whitespace (a multi-line shader body becomes a mangled path that would never fetch
 * the intended resource), so any string with inner whitespace was NOT authored as a
 * URL — it is a body. Trailing/leading whitespace is trimmed by the caller before
 * this runs, so only INNER whitespace reaches here. Pure + deterministic.
 */
const INNER_WHITESPACE_RE = /\s/;

/**
 * The CANONICAL "is this a fetchable runtime URL?" predicate — the single source of
 * truth that the shader-integrity classifier ({@link isExternalShaderSource})
 * DELEGATES to, so the two can never drift. A token is a fetchable runtime URL IFF:
 *
 *   1. it is a single URL TOKEN (no inner whitespace / newline); a string with
 *      inner whitespace is an inline body the URL parser would silently mangle,
 *      never a URL the author meant; AND
 *   2. {@link resolveRuntimeUrl} treats it as a URL — i.e. the resolution is NEITHER
 *      `'missing'` (empty) NOR `'malformed'` (the parser rejected it). EVERY other
 *      variant (`allowed`, `cross-origin-rejected`, `origin-not-allowed`,
 *      `kind-not-allowed`, `private-ip-rejected`) means "this IS a URL the policy
 *      reasoned about" — fetchable in shape, even when the policy then refuses the
 *      ORIGIN. A refused-origin URL is still a URL, never an inline body.
 *
 * This captures EXACTLY the inputs `resolveRuntimeUrl` would treat as a fetchable
 * URL vs an opaque body. It deliberately uses the `'gpu-shader'` kind and a
 * `same-origin` policy: the classification question is "URL-or-body?", which the
 * kind/origin-allowlist does NOT change (a cross-origin URL is still URL-SHAPED, it
 * is merely refused) — so the predicate is stable regardless of the host's policy.
 *
 * Shapes this accepts (all URL-shaped, none an inline body): root-absolute
 * (`/x.glsl`), path-relative (`shaders/x.glsl`, `./x`, `../x`), query-relative
 * (`?shader=wave`), bare same-dir (`wave`), protocol-relative (`//host/x`),
 * scheme-absolute (`http(s)://…`), and URL-scheme tokens (`data:…`, `blob:…`). A
 * genuine multi-line GLSL/WGSL body is rejected (inner whitespace ⟹ not a token).
 *
 * Pure + deterministic: no clock, no network — the resolution is a syntactic
 * classification only. Never throws ({@link resolveRuntimeUrl} never throws).
 *
 * @param rawUrl - the candidate token (e.g. a `data-czap-shader-src` value).
 */
export function isFetchableRuntimeUrl(rawUrl: string | null | undefined): boolean {
  if (rawUrl === null || rawUrl === undefined) return false;
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) return false;
  // A body carries inner whitespace; a URL token does not. Reject bodies up front so
  // the URL parser never silently mangles a multi-line shader into a fake path.
  if (INNER_WHITESPACE_RE.test(trimmed)) return false;
  // Delegate the URL-or-not decision to the canonical resolver. Any variant other
  // than `missing` / `malformed` means the resolver treated it as a URL it reasoned
  // about — i.e. URL-shaped, hence fetchable in shape (origin refusal is separate).
  const resolution = resolveRuntimeUrl(trimmed, { kind: 'gpu-shader', policy: { mode: 'same-origin' } });
  return resolution.type !== 'missing' && resolution.type !== 'malformed';
}

/**
 * Resolve a user-supplied `rawUrl` under `options.policy` and classify
 * the result as one of {@link RuntimeUrlResolution}'s variants.
 *
 * The function never throws; malformed URLs produce a `malformed`
 * variant and cross-origin / policy violations produce correspondingly
 * typed rejections. Path-relative URLs (no leading `//`) inherit the base
 * origin and skip the private-IP SSRF check; any URL that resolves
 * cross-origin — scheme-absolute OR protocol-relative — is SSRF-checked.
 */
export function resolveRuntimeUrl(
  rawUrl: string | null | undefined,
  options: ResolveRuntimeUrlOptions,
): RuntimeUrlResolution {
  if (!rawUrl) {
    return { type: 'missing' };
  }

  const baseOrigin = runtimeBaseOrigin(options.baseOrigin);
  if (typeof URL.canParse === 'function' && !URL.canParse(rawUrl, baseOrigin)) {
    return malformedResolution(rawUrl, baseOrigin, 'url-can-parse-rejected');
  }

  let resolved: URL;
  try {
    resolved = new URL(rawUrl, baseOrigin);
  } catch (error) {
    return malformedResolution(
      rawUrl,
      baseOrigin,
      'url-constructor-threw',
      error instanceof Error ? error.message : String(error),
    );
  }

  const normalizedBaseOrigin = normalizeComparableOrigin(baseOrigin) ?? baseOrigin.toLowerCase();
  const normalizedResolvedOrigin = resolved.origin.toLowerCase();

  // Block file: protocol unconditionally.
  if (isBlockedProtocol(resolved.protocol)) {
    return { type: 'private-ip-rejected', resolved };
  }

  // Block private/reserved IPs to prevent SSRF whenever the URL resolves
  // CROSS-ORIGIN — anything that does not inherit the page's own origin. This
  // covers scheme-absolute URLs (http://169.254.169.254) AND protocol-relative
  // ones (//169.254.169.254 — no scheme, yet still a foreign origin). Same-origin
  // / path-relative URLs (e.g. "/stream") inherit the page origin, so they skip it.
  if (normalizedResolvedOrigin !== normalizedBaseOrigin && isPrivateOrReservedIP(resolved.hostname)) {
    return { type: 'private-ip-rejected', resolved };
  }

  if (normalizedResolvedOrigin === normalizedBaseOrigin) {
    return { type: 'allowed', url: rawUrl, resolved };
  }

  const policy = normalizeEndpointPolicy(options.policy);
  if (policy.mode === 'same-origin') {
    return { type: 'cross-origin-rejected', resolved };
  }

  const globalAllowlist = policy.allowOrigins;
  const kindAllowlist = policy.byKind[options.kind];
  if (globalAllowlist.includes(normalizedResolvedOrigin) || kindAllowlist.includes(normalizedResolvedOrigin)) {
    return { type: 'allowed', url: rawUrl, resolved };
  }

  const hasKindRules = Object.values(policy.byKind).some((allowlist) => allowlist.length > 0);
  if (globalAllowlist.length === 0 && hasKindRules && kindAllowlist.length === 0) {
    return { type: 'kind-not-allowed', resolved };
  }

  return { type: 'origin-not-allowed', resolved };
}
