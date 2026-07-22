/**
 * The one content-addressing kernel — `canonicalize → CanonicalCbor → fnv1a`.
 *
 * Identity is minted through the single canonical encoder (`CanonicalCbor`,
 * always-float64), never cborg (smallest-float) — the two diverge on
 * float16-exact values, which silently forked `QuantizerConfig`/`EntityId` ids
 * (CUT B1). Every content address in the repo (EntityId, BoundaryDef.id,
 * DocumentGraph node + graph ids) routes through here so they cannot diverge.
 *
 * @module
 */

import type { ContentAddress } from '../schema/brands.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { fnv1aBytes } from './fnv.js';

/**
 * Recursively normalize a value for content addressing: drop `undefined` object
 * properties, map `undefined` array entries to `null`, and sort object keys so
 * authoring order never forks identity. Returns the canonical structure for
 * {@link CanonicalCbor.encode}.
 */
export function canonicalizeForAddress(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => {
      const canonical = canonicalizeForAddress(entry);
      return canonical === undefined ? null : canonical;
    });
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      // Deterministic UTF-16 code-unit order, NOT localeCompare — content
      // addresses must be byte-identical across machines/locales (CUT B1).
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => [key, canonicalizeForAddress(entry)]);
    return Object.fromEntries(entries);
  }
  return String(value);
}

/**
 * Canonical CBOR bytes for a value — the shared byte sequence both a fnv1a
 * identity ({@link contentAddressOf}) and a sha256 integrity digest
 * (`AddressedDigest.of`) derive from, so the two laws cannot disagree.
 */
export function canonicalAddressBytes(value: unknown): Uint8Array {
  return CanonicalCbor.encode(canonicalizeForAddress(value));
}

/**
 * Mint a {@link ContentAddress} (fnv1a over canonical CBOR) — the one identity
 * kernel (CUT B1). The mint expression is written explicitly (not via
 * {@link canonicalAddressBytes}) so the canonical-identity source guard can see
 * that identity is paired with `CanonicalCbor`, never cborg / JSON.
 */
export function contentAddressOf(value: unknown): ContentAddress {
  return fnv1aBytes(CanonicalCbor.encode(canonicalizeForAddress(value)));
}
