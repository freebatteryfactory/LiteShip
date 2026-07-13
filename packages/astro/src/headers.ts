/**
 * HTTP header helpers shipped by `@czap/astro`.
 *
 * Encodes the two concerns the integration cares about: asking browsers
 * for the Client Hints czap uses (tier detection), and shipping the
 * COOP/COEP pair required by `SharedArrayBuffer`-backed workers.
 *
 * @module
 */

import { ClientHints, CrossOriginIsolation, type CrossOriginEmbedderPolicy } from '@czap/edge';

/**
 * Default `Accept-CH` / `Critical-CH` response headers czap requests so the browser
 * sends the hints on the next navigation (and resends the critical ones before the first
 * render).
 *
 * DERIVED from `@czap/edge`'s single source (`ClientHints.acceptCHHeader()` /
 * `criticalCHHeader()`) — NOT a hand-kept copy. This module is read by the dev-server
 * middleware while the production middleware calls `ClientHints` directly; deriving both
 * from one list is the only way they can't request different hints. Pinned by
 * tests/unit/astro/critical-ch-drift.test.ts.
 */
export const CLIENT_HINTS_HEADERS: Record<string, string> = {
  'Accept-CH': ClientHints.acceptCHHeader(),
  'Critical-CH': ClientHints.criticalCHHeader(),
  Vary: ClientHints.varyCHHeader(),
};

/**
 * COEP values czap can emit. Both establish cross-origin isolation
 * (required for `SharedArrayBuffer`); `credentialless` loads CORP-less
 * third-party subresources without credentials instead of blocking them.
 *
 * DERIVED from `@czap/edge` (the single cross-origin vocabulary source) — re-exported
 * so existing `@czap/astro` importers keep the same type name.
 */
export type { CrossOriginEmbedderPolicy };

/**
 * COOP/COEP header pair required for `SharedArrayBuffer` (used by
 * `@czap/worker`'s SPSC ring). Applied only when the integration is
 * configured with `workers: { enabled: true }`; the COEP value is
 * overridable via `workers.coep`.
 *
 * DERIVED from `@czap/edge`'s `CrossOriginIsolation.isolationHeaders()` (NOT a
 * hand-kept copy) so the values czap EMITS and the values `czap doctor --deployed`
 * VALIDATES can never diverge. Pinned by tests/unit/astro/critical-ch-drift.test.ts.
 *
 * Parked-by-design (#129): COEP is consumer-overridable (set-only-when-absent
 * via {@link CONSUMER_OVERRIDABLE_HEADERS}) but cannot be disabled while workers
 * are enabled — `SharedArrayBuffer` requires cross-origin isolation. A workers-off
 * isolation escape remains a future first-party option; neither dogfood site needs it.
 */
export const CROSS_ORIGIN_HEADERS: Record<string, string> = CrossOriginIsolation.isolationHeaders();

/** Header names whose pre-existing response values czap must not clobber. */
const CONSUMER_OVERRIDABLE_HEADERS: ReadonlySet<string> = new Set([
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Embedder-Policy',
]);

/** Split a `Vary` field value into its trimmed, non-empty tokens. */
function splitVaryTokens(value: string): string[] {
  return value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * Union czap's `Vary` tokens with any pre-existing `Vary` value.
 *
 * `Vary` is an ADDITIVE token-list header (RFC 9110 §12.5.5): each token names a
 * request header a cache must key on. czap adds its Client-Hint axes, but a consumer,
 * a compression layer, or the app may already vary on `Cookie` / `Accept-Encoding` /
 * app-specific axes — a `headers.set('Vary', …)` clobber silently drops those and can
 * make a CDN serve a gzip response as identity, or one user's cookie'd page to another.
 *
 * Existing tokens keep their order and casing; new tokens are appended; matching is
 * case-insensitive (field names are case-insensitive) so we never emit a duplicate.
 * A literal `*` on either side means "varies on everything" and absorbs the merge.
 *
 * Single source for the merge law — both the `Headers` sink ({@link applyCzapHeaders})
 * and the dev-server `res.setHeader` sink call through here so they cannot drift.
 */
export function mergeVaryHeader(existing: string | null | undefined, incoming: string): string {
  const incomingTokens = splitVaryTokens(incoming);
  if (existing === null || existing === undefined || existing.trim().length === 0) {
    return incomingTokens.join(', ');
  }
  const existingTokens = splitVaryTokens(existing);
  if (existingTokens.includes('*') || incomingTokens.includes('*')) {
    return '*';
  }
  const seen = new Set(existingTokens.map((token) => token.toLowerCase()));
  const merged = [...existingTokens];
  for (const token of incomingTokens) {
    const key = token.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(token);
    }
  }
  return merged.join(', ');
}

/**
 * Build the `[header, value]` entries czap wants to emit for a given
 * feature toggle set. Used by dev-server middleware and edge adapters
 * that prefer tuple iteration over the `Headers` API.
 */
export function getCzapHeaderEntries(options: {
  readonly detectEnabled: boolean;
  readonly workersEnabled: boolean;
  readonly coep?: CrossOriginEmbedderPolicy;
  readonly acceptCH?: string;
  readonly criticalCH?: string;
}): Array<readonly [string, string]> {
  const entries: Array<readonly [string, string]> = [];

  if (options.detectEnabled) {
    const acceptCH = options.acceptCH ?? CLIENT_HINTS_HEADERS['Accept-CH'];
    const criticalCH = options.criticalCH ?? CLIENT_HINTS_HEADERS['Critical-CH'];
    const vary = CLIENT_HINTS_HEADERS['Vary'];
    if (acceptCH) {
      entries.push(['Accept-CH', acceptCH]);
    }
    if (criticalCH) {
      entries.push(['Critical-CH', criticalCH]);
    }
    // Vary tracks Accept-CH / Critical-CH: empty overrides suppress all three
    // (there is nothing for caches to vary on once hints are blanked).
    if (vary && (acceptCH || criticalCH)) {
      entries.push(['Vary', vary]);
    }
  }

  if (options.workersEnabled) {
    for (const [header, value] of Object.entries(CROSS_ORIGIN_HEADERS)) {
      entries.push([header, header === 'Cross-Origin-Embedder-Policy' ? (options.coep ?? value) : value]);
    }
  }

  return entries;
}

/**
 * Apply the czap header set to an existing {@link Headers} bag and
 * return it (for chaining). Convenience wrapper over
 * {@link getCzapHeaderEntries} for middleware that already has a
 * `Headers` object in hand.
 *
 * COOP/COEP are set only when absent: a consumer middleware (or route
 * handler) that explicitly set either one wins regardless of
 * `sequence()` order. Weakening or removing them is then on the
 * consumer — workers still need cross-origin isolation to get
 * `SharedArrayBuffer`. Client-hints headers are always czap's to own
 * and are set unconditionally.
 */
export function applyCzapHeaders(
  headers: Headers,
  options: {
    readonly detectEnabled: boolean;
    readonly workersEnabled: boolean;
    readonly coep?: CrossOriginEmbedderPolicy;
    readonly acceptCH?: string;
    readonly criticalCH?: string;
  },
): Headers {
  for (const [header, value] of getCzapHeaderEntries(options)) {
    if (CONSUMER_OVERRIDABLE_HEADERS.has(header) && headers.has(header)) {
      continue;
    }
    if (header === 'Vary') {
      // Additive header — union with any existing Vary rather than clobber it.
      headers.set('Vary', mergeVaryHeader(headers.get('Vary'), value));
      continue;
    }
    headers.set(header, value);
  }

  return headers;
}
