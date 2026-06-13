/**
 * Capsule declaration wrapping the CanonicalCbor decoder as a `pureTransform`.
 * The decoder is the strict inverse of `canonicalCborCapsule`'s encoder over
 * the encoder's NORMALIZED domain — registering it here lets the factory
 * compiler audit the round-trip reader alongside the encoder.
 *
 * @module
 */

import { Schema } from 'effect';
import { defineCapsule } from '../assembly.js';
import { CanonicalCbor, decode } from '../cbor.js';

/**
 * Normalize a value into the encoder's image: the encoder coerces top-level
 * `undefined` to `null`, drops object properties whose value is `undefined`,
 * and recurses through arrays/objects. Round-trip equality therefore holds
 * over `normalize(x)`, never raw `x` (which may carry `undefined`).
 */
function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return value;
  if (typeof value === 'number') {
    // The encoder routes safe-integer-valued numbers through the integer
    // path, where `-0` is emitted as `0x00` and decodes back to `+0`. Mirror
    // that collapse so round-trip equality holds over the normalized domain.
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((v) => normalize(v));
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue; // mirror encoder: drop undefined props
      out[k] = normalize(v);
    }
    return out;
  }
  return value;
}

/** Structural deep-equality over the decoder's output domain. */
function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    // float64 round-trips bit-exactly, but NaN !== NaN; treat as equal.
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEquals(a[i], b[i])) return false;
    return true;
  }
  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(b) &&
    !(a instanceof Uint8Array) &&
    !(b instanceof Uint8Array)
  ) {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const ak = Object.keys(ao);
    const bk = Object.keys(bo);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
      if (!deepEquals(ao[k], bo[k])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Declared capsule for the CanonicalCbor decoder. Registered in the
 * module-level catalog at import time; walked by the factory compiler.
 */
export const canonicalCborDecodeCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'core.canonical-cbor-decode',
  input: Schema.instanceOf(Uint8Array),
  output: Schema.Unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'round-trip-over-normalized-domain',
      check: (input: Uint8Array, output: unknown): boolean => {
        // The decoder is the encoder's inverse: re-encoding the decoded value
        // must reproduce the exact input bytes. This binds decode∘encode = id
        // over the canonical (already-normalized) byte domain.
        const reencoded = CanonicalCbor.encode(output);
        if (reencoded.length !== input.length) return false;
        for (let i = 0; i < input.length; i++) if (reencoded[i] !== input[i]) return false;
        return true;
      },
      message: 'decoded value must re-encode to the exact input bytes (decode is the encoder inverse)',
    },
  ],
  budgets: { p95Ms: 1, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: Uint8Array): unknown => decode(input),
});

/**
 * Internal helpers exported for the round-trip property test (the invariant
 * over the encoder's normalized domain): `decode(encode(x))` deep-equals
 * `normalize(x)`.
 */
export const _canonicalCborDecodeInternals = { normalize, deepEquals } as const;
