/**
 * HTTP header helpers shipped by `@czap/astro`.
 *
 * Encodes the two concerns the integration cares about: asking browsers
 * for the Client Hints czap uses (tier detection), and shipping the
 * COOP/COEP pair required by `SharedArrayBuffer`-backed workers.
 *
 * @module
 */

import { ClientHints } from '@czap/edge';

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
 */
export type CrossOriginEmbedderPolicy = 'require-corp' | 'credentialless';

/**
 * COOP/COEP header pair required for `SharedArrayBuffer` (used by
 * `@czap/worker`'s SPSC ring). Applied only when the integration is
 * configured with `workers: { enabled: true }`; the COEP value is
 * overridable via `workers.coep`.
 *
 * Parked-by-design (#129): COEP is consumer-overridable (set-only-when-absent
 * via {@link CONSUMER_OVERRIDABLE_HEADERS}) but cannot be disabled while workers
 * are enabled — `SharedArrayBuffer` requires cross-origin isolation. A workers-off
 * isolation escape remains a future first-party option; neither dogfood site needs it.
 */
export const CROSS_ORIGIN_HEADERS: Record<string, string> = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/** Header names whose pre-existing response values czap must not clobber. */
const CONSUMER_OVERRIDABLE_HEADERS: ReadonlySet<string> = new Set([
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Embedder-Policy',
]);

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
    if (vary) {
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
    headers.set(header, value);
  }

  return headers;
}
