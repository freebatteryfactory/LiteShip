/**
 * Edge-side tier detection -- wraps the pure tier mapping functions from
 * `@czap/detect` for use with HTTP Client Hints headers at the edge.
 *
 * @module
 */

import type { CapLevel } from '@czap/core';
import { tierFromCapabilities, motionTierFromCapabilities, designTierFromCapabilities } from '@czap/detect';
import type { DesignTier, ExtendedDeviceCapabilities, MotionTier } from '@czap/detect';
import { ClientHints } from './client-hints.js';
import type { ClientHintsHeaders } from './client-hints.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Outcome of an edge-side tier detection sweep.
 *
 * All three fields use the same branded tier types as the client runtime,
 * so downstream boundary evaluation and output gating reuse the exact
 * code paths from `@czap/detect`.
 */
export interface EdgeTierResult {
  /** Highest {@link CapLevel} the device qualifies for. */
  readonly capLevel: CapLevel;
  /** Motion complexity tier permitted for this device. */
  readonly motionTier: MotionTier;
  /** Visual fidelity tier permitted for this device. */
  readonly designTier: DesignTier;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map already-parsed {@link ExtendedDeviceCapabilities} to the tier triple
 * using the same pure functions as the client runtime.
 */
function tierFromParsed(caps: ExtendedDeviceCapabilities): EdgeTierResult {
  const capLevel = tierFromCapabilities(caps);
  const motionTier = motionTierFromCapabilities(caps);
  const designTier = designTierFromCapabilities(caps);
  return { capLevel, motionTier, designTier };
}

/**
 * Detect capability tiers from HTTP headers using Client Hints parsing
 * and the same pure tier mapping functions used on the client.
 */
function detectTier(headers: Headers | ClientHintsHeaders): EdgeTierResult {
  return tierFromParsed(ClientHints.parseClientHints(headers));
}

/**
 * Generate HTML data attribute string for injection into the `<html>` element.
 *
 * @example
 * ```
 * tierDataAttributes(result)
 * // => 'data-czap-cap="reactive" data-czap-motion="animations" data-czap-design="enhanced"'
 * ```
 */
function tierDataAttributes(result: EdgeTierResult): string {
  return `data-czap-cap="${result.capLevel}" data-czap-motion="${result.motionTier}" data-czap-design="${result.designTier}"`;
}

// ---------------------------------------------------------------------------
// Namespace export
// ---------------------------------------------------------------------------

/**
 * Edge tier detection namespace.
 *
 * Pairs {@link ClientHints.parseClientHints} with the pure tier-mapping
 * functions from `@czap/detect` so the edge and the browser produce the
 * same `capLevel`/`motionTier`/`designTier` triple for a given device.
 *
 * @example
 * ```ts
 * import { EdgeTier } from '@czap/edge';
 *
 * const result = EdgeTier.detectTier(request.headers);
 * const html = `<html ${EdgeTier.tierDataAttributes(result)}>`;
 * // `<html data-czap-cap="reactive" data-czap-motion="animations" data-czap-design="enhanced">`
 * ```
 */
export const EdgeTier = {
  /** Detect {@link EdgeTierResult} from a `Headers`-like bag. */
  detectTier,
  /** Map parsed Client Hints capabilities to an {@link EdgeTierResult}. */
  tierFromParsed,
  /** Render an `EdgeTierResult` into `data-czap-*` attributes for the root HTML element. */
  tierDataAttributes,
} as const;

export declare namespace EdgeTier {
  /** Alias for {@link EdgeTierResult}. */
  export type Result = EdgeTierResult;
}
