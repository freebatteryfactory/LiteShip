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
import { isCanonicalCborValue, type CanonicalCborValue } from '@liteship/canonical';
import { UnsupportedError } from '@liteship/error';
import { CanonicalCbor } from '../schema/cbor.js';
import { fnv1aBytes } from './fnv.js';

/**
 * Recursively normalize a value for content addressing: drop `undefined` object
 * properties, map `undefined` array entries to `null`, and sort object keys so
 * authoring order never forks identity. Returns the canonical structure for
 * {@link CanonicalCbor.encode}.
 */
function canonicalizeAdmitted(value: CanonicalCborValue): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => {
      const canonical = canonicalizeAdmitted(entry);
      return canonical === undefined ? null : canonical;
    });
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      // Deterministic UTF-16 code-unit order, NOT localeCompare — content
      // addresses must be byte-identical across machines/locales (CUT B1).
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => [key, canonicalizeAdmitted(entry as CanonicalCborValue)]);
    return Object.fromEntries(entries);
  }
  // The shared canonical-domain guard above makes this branch unreachable.
  throw UnsupportedError('content-address value', 'value is outside the portable canonical domain');
}

/**
 * Validate and normalize one value before it enters the canonical addressing
 * domain. Undefined record fields are omitted and every other admitted value
 * preserves its portable meaning.
 */
export function canonicalizeForAddress(value: unknown): unknown {
  if (!isCanonicalCborValue(value)) {
    throw UnsupportedError(
      'content-address value',
      'value must be portable data (primitives, byte strings, arrays, or plain records without cycles/accessors)',
    );
  }
  return canonicalizeAdmitted(value);
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
