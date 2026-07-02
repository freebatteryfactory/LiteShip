/**
 * Edge-side tier detection -- wraps the pure tier mapping functions from
 * `@czap/detect` for use with HTTP Client Hints headers at the edge.
 *
 * @module
 */

import type { CapTier } from '@czap/core';
import {
  capTierFromCapabilities,
  motionTierFromCapabilities,
  designTierFromCapabilities,
  CAP_AXES,
  capAxisAttr,
} from '@czap/detect';
import type { DesignTier, ExtendedDeviceCapabilities, MotionTier, CapAxis } from '@czap/detect';
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
  /** Highest {@link CapTier} the device qualifies for. */
  readonly capTier: CapTier;
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
  const capTier = capTierFromCapabilities(caps);
  const motionTier = motionTierFromCapabilities(caps);
  const designTier = designTierFromCapabilities(caps);
  return { capTier, motionTier, designTier };
}

/**
 * Detect capability tiers from HTTP headers using Client Hints parsing
 * and the same pure tier mapping functions used on the client.
 */
function detectTier(headers: Headers | ClientHintsHeaders): EdgeTierResult {
  return tierFromParsed(ClientHints.parseClientHints(headers));
}

/**
 * Structured `data-czap-*` attribute map for the root `<html>` element — the
 * spreadable form of {@link tierDataAttributes}.
 *
 * Keyed by the FULL attribute name (`data-czap-<axis>`), built by iterating the
 * canonical CAP_AXES registry, so a newly-added capability axis appears
 * automatically. A consumer that spreads this map (`<html {...map}>`) can never
 * silently MISS an axis the way a hand-written attribute list does — the whole
 * point of exposing it alongside the pre-serialized string.
 *
 * @example
 * ```ts
 * // Astro: <html {...EdgeTier.tierDataAttributesMap(result)}>
 * tierDataAttributesMap(result)
 * // => { 'data-czap-tier': 'reactive', 'data-czap-motion': 'animations', 'data-czap-design': 'enhanced' }
 * ```
 */
function tierDataAttributesMap(result: EdgeTierResult): Readonly<Record<`data-czap-${CapAxis}`, string>> {
  // The canonical axis registry is the single source: attribute names can never
  // drift from the `Astro.locals.czap.tiers` field names / runtime readers.
  const value: Record<CapAxis, string> = {
    tier: result.capTier,
    motion: result.motionTier,
    design: result.designTier,
  };
  return Object.fromEntries(CAP_AXES.map((axis) => [capAxisAttr(axis), value[axis]])) as Readonly<
    Record<`data-czap-${CapAxis}`, string>
  >;
}

/**
 * Generate the HTML data-attribute STRING for injection into the `<html>`
 * element. Serialized from {@link tierDataAttributesMap}, so the string and
 * spreadable-map forms can never disagree.
 *
 * @example
 * ```
 * tierDataAttributes(result)
 * // => 'data-czap-tier="reactive" data-czap-motion="animations" data-czap-design="enhanced"'
 * ```
 */
function tierDataAttributes(result: EdgeTierResult): string {
  return Object.entries(tierDataAttributesMap(result))
    .map(([attr, val]) => `${attr}="${val}"`)
    .join(' ');
}

// ---------------------------------------------------------------------------
// Namespace export
// ---------------------------------------------------------------------------

/**
 * Edge tier detection namespace.
 *
 * Pairs {@link ClientHints.parseClientHints} with the pure tier-mapping
 * functions from `@czap/detect` so the edge and the browser produce the
 * same `capTier`/`motionTier`/`designTier` triple for a given device.
 *
 * @example
 * ```ts
 * import { EdgeTier } from '@czap/edge';
 *
 * const result = EdgeTier.detectTier(request.headers);
 * const html = `<html ${EdgeTier.tierDataAttributes(result)}>`;
 * // `<html data-czap-tier="reactive" data-czap-motion="animations" data-czap-design="enhanced">`
 * ```
 */
export const EdgeTier = {
  /** Detect {@link EdgeTierResult} from a `Headers`-like bag. */
  detectTier,
  /** Map parsed Client Hints capabilities to an {@link EdgeTierResult}. */
  tierFromParsed,
  /** Render an `EdgeTierResult` into a `data-czap-*` attribute STRING for the root HTML element. */
  tierDataAttributes,
  /** Structured, spreadable `data-czap-*` map for the root HTML element (auto-includes every CAP_AXES axis). */
  tierDataAttributesMap,
} as const;

export declare namespace EdgeTier {
  /** Alias for {@link EdgeTierResult}. */
  export type Result = EdgeTierResult;
}
