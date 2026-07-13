/**
 * Cross-origin isolation response headers — the SINGLE source of truth for the
 * `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` pair czap emits so
 * `SharedArrayBuffer`-backed workers (`@czap/worker`'s SPSC ring) get cross-origin
 * isolation.
 *
 * Owned here (next to `ClientHints`, the other header-vocabulary source) so every
 * consumer DERIVES from one list instead of hand-mirroring it (Law 6):
 *  - `@czap/astro`'s `CROSS_ORIGIN_HEADERS` builds itself from {@link CrossOriginIsolation.isolationHeaders};
 *  - `czap doctor --deployed`'s live header probe validates a deployed response's
 *    COOP/COEP against {@link CrossOriginIsolation.openerPolicy} / {@link CrossOriginIsolation.embedderPolicies}.
 * Pinned by tests/unit/astro/critical-ch-drift.test.ts (astro↔edge) so the emitter
 * and the validator can never request/emit/accept a different policy.
 *
 * @module
 */

/** The COOP value that establishes cross-origin isolation (required for `SharedArrayBuffer`). */
const CROSS_ORIGIN_OPENER_POLICY = 'same-origin' as const;

/**
 * COEP values czap can emit; both establish cross-origin isolation. `require-corp`
 * is the default; `credentialless` loads CORP-less third-party subresources without
 * credentials instead of blocking them. The exported {@link CrossOriginEmbedderPolicy}
 * TYPE is DERIVED from this array, so the runtime accept-set and the compile-time
 * union can never diverge.
 */
const CROSS_ORIGIN_EMBEDDER_POLICIES = ['require-corp', 'credentialless'] as const;

/**
 * COEP values czap can emit. Both establish cross-origin isolation (required for
 * `SharedArrayBuffer`); `credentialless` loads CORP-less third-party subresources
 * without credentials instead of blocking them.
 */
export type CrossOriginEmbedderPolicy = (typeof CROSS_ORIGIN_EMBEDDER_POLICIES)[number];

/** The COEP value czap emits by default (consumer-overridable to `credentialless`). */
const DEFAULT_CROSS_ORIGIN_EMBEDDER_POLICY: CrossOriginEmbedderPolicy = 'require-corp';

/** The COOP value that establishes cross-origin isolation (`same-origin`). */
function openerPolicy(): string {
  return CROSS_ORIGIN_OPENER_POLICY;
}

/** Every COEP value that establishes cross-origin isolation (`require-corp`, `credentialless`). */
function embedderPolicies(): readonly CrossOriginEmbedderPolicy[] {
  return CROSS_ORIGIN_EMBEDDER_POLICIES;
}

/**
 * The COOP/COEP header pair czap emits for cross-origin isolation, in emit order
 * (COOP then COEP). `coep` selects the embedder policy; it defaults to
 * `require-corp`. Consumed by `@czap/astro`'s `CROSS_ORIGIN_HEADERS` so the emitted
 * values derive from this one source.
 */
function isolationHeaders(
  coep: CrossOriginEmbedderPolicy = DEFAULT_CROSS_ORIGIN_EMBEDDER_POLICY,
): Record<string, string> {
  return {
    'Cross-Origin-Opener-Policy': CROSS_ORIGIN_OPENER_POLICY,
    'Cross-Origin-Embedder-Policy': coep,
  };
}

/**
 * Cross-origin isolation header vocabulary.
 *
 * The single source of truth for the COOP/COEP pair czap emits so
 * `SharedArrayBuffer`-backed workers get cross-origin isolation. Both the emitter
 * (`@czap/astro`) and the deployed-header validator (`czap doctor --deployed`)
 * derive from here.
 *
 * @example
 * ```ts
 * import { CrossOriginIsolation } from '@czap/edge';
 *
 * const response = new Response(body, { headers: CrossOriginIsolation.isolationHeaders() });
 * // → Cross-Origin-Opener-Policy: same-origin
 * // → Cross-Origin-Embedder-Policy: require-corp
 * ```
 */
export const CrossOriginIsolation = {
  /** The isolating COOP value (`same-origin`). */
  openerPolicy,
  /** The COEP values that establish isolation (`require-corp`, `credentialless`). */
  embedderPolicies,
  /** The COOP/COEP header pair czap emits, in emit order. */
  isolationHeaders,
} as const;
