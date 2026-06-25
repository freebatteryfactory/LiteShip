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
 * The marker-free discriminator: a raw newline (`\n` or `\r`).
 *
 * PLATFORM REALITY (do NOT mis-state this): a raw newline does NOT make a string
 * un-URL-parseable. The WHATWG URL parser STRIPS ASCII tab (`\t`), newline (`\n`),
 * and carriage-return (`\r`) from its input before parsing, so
 * `URL.canParse("shader\n.wgsl", base)` is `true` and silently normalizes to
 * `…/shader.wgsl`. A newline's PRESENCE therefore does NOT prove "this is not a URL".
 *
 * What the newline DOES mark is intent: a value carrying a raw newline is multi-line
 * PROGRAM TEXT (a shader BODY the author typed), not a single fetch target. The
 * classifier uses this as a DELIBERATE policy choice, not as a parse-impossibility:
 * a multi-line value is treated as an inline body and is never fetched. (The bytes
 * the URL parser would have salvaged after stripping the newline are intentionally
 * NOT followed — see `isInlineShaderBody`.)
 *
 * This is the ONLY content test the classifier makes. Every in-content CHARACTER
 * heuristic (`{`/`}`/`;`/`fn `/`#version`/…) is unsound because those characters are
 * LEGAL in a URL/path/query/fragment (`shader{1}.wgsl`, `./shader;v=1.wgsl`,
 * `shader?x={y}`, `shaders/fn file.wgsl` are all valid same-origin URLs), so any such
 * marker collides with a real URL and reopens the bypass. A raw newline does not
 * collide as an INTENT signal — a real external shader URL is authored single-line.
 */
const NEWLINE_RE = /[\n\r]/;

/**
 * Is `value` a genuine inline shader BODY (compile literally) rather than a URL/path
 * to fetch? The FOUNDATIONAL discriminator — NEWLINE-based, with NO in-content
 * CHARACTER markers. The earlier heuristics (a space, then a `{`/`;`/`fn ` syntax
 * marker) all lost the SAME way: a URL and shader source share characters, so ANY
 * character test misclassifies a URL that happens to contain that character. The
 * rule depends on the one property that signals authored multi-line PROGRAM TEXT — a
 * raw newline:
 *
 *   1. MULTI-LINE (contains `\n`/`\r`) → treated as an INLINE shader BODY, compiled
 *      literally — NEVER fetched. NOTE this is a DELIBERATE policy choice, not a
 *      parse impossibility: the WHATWG URL parser STRIPS `\t`/`\n`/`\r` from its
 *      input, so a value like `"shader\n.wgsl"` WOULD `URL.canParse` (normalizing to
 *      `…/shader.wgsl`). We do NOT follow that salvaged URL. A real external shader
 *      URL is authored on a single line; a multi-line value is the author's own body
 *      text. Treating it as inline is secure-by-default: if it is not valid shader
 *      source, it FAILS LOUD at compile (`gl.shaderSource` / `createShaderModule`) —
 *      it is never silently fetched as the newline-stripped URL.
 *   2. SINGLE-LINE → NOT an inline body here; it is a potential URL the caller
 *      DELEGATES to the URL policy ({@link isFetchableRuntimeUrl} →
 *      {@link resolveRuntimeUrl}). Secure-by-default: a single-line token the policy
 *      accepts as fetchable is treated as a URL (external fetch+verify or refuse),
 *      NOT compiled as an unverified string.
 *
 * SECURE-BY-DEFAULT TRADE-OFF: a genuine SINGLE-LINE inline body (e.g.
 * `void main(){discard;}` on one line) is classified EXTERNAL (it will be fetched,
 * which fails loudly) rather than compiled inline. You cannot distinguish a one-liner
 * body from a URL by content without a marker an attacker controls, so we never
 * compile an unverified single-line string. Real shader bodies are virtually always
 * multi-line, so this costs nothing in practice.
 *
 * Pure + deterministic; never throws.
 */
function isInlineShaderBody(value: string): boolean {
  // A raw newline ⟹ authored multi-line program text ⟹ treat as a BODY (compile
  // inline, fail-loud if invalid — never fetch the newline-stripped URL the WHATWG
  // parser would salvage). A single-line value is left to the URL policy.
  return NEWLINE_RE.test(value);
}

/**
 * The CANONICAL "is this a fetchable runtime URL?" predicate — the single source of
 * truth that the shader-integrity classifier ({@link isExternalShaderSource})
 * DELEGATES to, so the two can never drift. A token is a fetchable runtime URL IFF:
 *
 *   1. it is NOT a genuine inline shader BODY (`isInlineShaderBody`) — i.e. it
 *      is not MULTI-LINE program text (a raw newline). A URL/path CAN contain a space
 *      (`shader file.wgsl`) AND legal-but-shader-looking characters (`shader{1}.wgsl`,
 *      `./shader;v=1.wgsl`, `shader?x={y}`, `shaders/fn file.wgsl`), so NEITHER inner
 *      whitespace NOR any in-content character marker is the discriminator — only a
 *      raw newline marks an authored multi-line body. This is a DELIBERATE divergence
 *      from {@link resolveRuntimeUrl}, NOT an equivalence: the WHATWG URL parser
 *      STRIPS `\t`/`\n`/`\r`, so `resolveRuntimeUrl("shader\n.wgsl", …)` would resolve
 *      the newline-stripped `…/shader.wgsl` as `'allowed'`. This predicate refuses to
 *      follow that salvaged URL — a multi-line value is rejected here (returns false)
 *      so it is compiled inline (fail-loud) rather than fetched. The divergence is the
 *      secure-by-default guarantee: shader bytes are never fetched from a URL the
 *      author smuggled across a newline; AND
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
 * (`/x.glsl`), path-relative (`shaders/x.glsl`, `./x`, `../x`), path-WITH-A-SPACE
 * (`shader file.wgsl`, `./shader file.wgsl` — a fetchable URL the policy accepts),
 * path-WITH-SHADER-LOOKING-PUNCTUATION (`shader{1}.wgsl`, `./shader;v=1.wgsl`,
 * `shader?x={y}`, `shaders/fn file.wgsl` — all single-line, all legal URLs),
 * query-relative (`?shader=wave`), bare same-dir (`wave`), protocol-relative
 * (`//host/x`), scheme-absolute (`http(s)://…`), and URL-scheme tokens (`data:…`,
 * `blob:…`). A MULTI-LINE value (a raw newline) is rejected here even though the
 * WHATWG parser could newline-strip it into a valid URL — the multi-line case is
 * deliberately routed to inline-compile (fail-loud), not fetched.
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
  // NEWLINE discriminator: a MULTI-LINE value (a raw newline) is treated as a genuine
  // shader body compiled inline; it is NOT reported as a fetchable URL. This is a
  // DELIBERATE divergence from `resolveRuntimeUrl`, NOT an equivalence: the WHATWG URL
  // parser STRIPS `\t`/`\n`/`\r`, so `resolveRuntimeUrl("shader\n.wgsl", …)` would
  // resolve `…/shader.wgsl` as `'allowed'` — we refuse to follow that salvaged URL so
  // multi-line author text is compiled (fail-loud) rather than fetched. No in-content
  // character marker is consulted (`{`/`;`/`fn `/… are all LEGAL URL characters, so
  // any such marker collides with a real URL). A single-line token — even one with a
  // space (`shader file.wgsl`) or shader-looking punctuation (`shader{1}.wgsl`) — is
  // left to the URL policy: it stays a URL and is fetched+verified, never silently
  // compiled. For SINGLE-LINE values this predicate agrees exactly with
  // `resolveRuntimeUrl`; the only intentional divergence is the multi-line case above.
  if (isInlineShaderBody(trimmed)) return false;
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
