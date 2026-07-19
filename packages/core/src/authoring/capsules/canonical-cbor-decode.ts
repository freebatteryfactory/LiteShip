/**
 * Capsule declaration wrapping the CanonicalCbor decoder as a `pureTransform`.
 * The decoder is the strict inverse of `canonicalCborCapsule`'s encoder over
 * the encoder's NORMALIZED domain — registering it here lets the factory
 * compiler audit the round-trip reader alongside the encoder.
 *
 * @module
 */

import type { Arbitrary } from 'fast-check';
import { defineCapsule } from '../assembly.js';
import { S, withArbitrary } from '../../schema/constructors.js';
import { CanonicalCbor, decode } from '../../schema/cbor.js';
import { ValidationError } from '@liteship/error';

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
      // Mirror the decoder: a `__proto__` key is an OWN data property, never a
      // prototype mutation — so normalize(x) and decode(encode(x)) agree (and
      // neither pollutes Object.prototype). See cbor-decode.ts map branch.
      const nv = normalize(v);
      if (k === '__proto__') {
        Object.defineProperty(out, k, { value: nv, enumerable: true, writable: true, configurable: true });
      } else {
        out[k] = nv;
      }
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

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isCanonicalCborBytes(bytes: Uint8Array<ArrayBuffer>): bytes is Uint8Array<ArrayBuffer> {
  try {
    return bytesEqual(CanonicalCbor.encode(decode(bytes)), bytes);
  } catch (cause) {
    void cause;
    // Schema refinement predicates report invalid input with `false`, including non-Error throwables.
    return false;
  }
}

/**
 * Branded input schema for the decoder: NOT "any `Uint8Array`" but the narrow
 * domain "canonical CBOR bytes". Its encoded carrier is still a `Uint8Array`,
 * but decode now runs an `S.brand` refinement that REJECTS a non-canonical
 * `Uint8Array` (folding a thrown {@link ValidationError} into a `schema/brand`
 * issue) instead of forwarding it to the decoder. It also carries an explicit
 * harness arbitrary that samples a value with `fc.anything()` and runs it
 * through the canonical encoder — so every generated sample is, by
 * construction, valid canonical CBOR the refinement and decoder both accept.
 *
 * This is the source-of-truth fix for the decoder's domain: a bare
 * `Uint8Array` carrier UNDER-SPECIFIES it (random bytes are `Uint8Array`-
 * conformant but not decodable), which would force the harness onto a
 * precondition-mismatch skip. The `withArbitrary` thunk instead samples the
 * encoder's own image, so `decode` is exercised over exactly the inputs it is
 * the inverse of — the round-trip invariant (`encode(decode(bytes)) === bytes`)
 * holds because the canonical encoder is idempotent under `decode`. The
 * standing definition of that domain is {@link isCanonicalCborBytes}.
 */
// The kernel `S.bytes(Uint8Array)` DECLARATION node carries a precise Type AND
// Encoded of `Uint8Array`; the `S.brand` wrapper layers a DECODE-TIME refinement
// that narrows that carrier to the canonical-CBOR-bytes domain, and the
// `withArbitrary` pass-through preserves the (now branded) schema type — so the
// capsule's `SchemaPort<In>` input slot is still satisfied with no cast. The
// generated domain is narrowed by the thunk (canonical CBOR bytes ⊂ Uint8Array)
// AND checked at decode time: a non-canonical `Uint8Array` folds into a
// `schema/brand` decode issue instead of silently reaching `run`. The refinement
// decodes once to verify canonicality (`decode` then re-`encode`, via
// {@link isCanonicalCborBytes}) and `run` decodes again — a deliberate double
// decode, bounded by the capsule's `p95Ms` budget, that buys a self-checking input
// contract in place of a bare `Uint8Array` that under-specifies the decoder domain.
export const CanonicalCborBytes = withArbitrary(
  S.brand(
    S.bytes(Uint8Array),
    (bytes: Uint8Array): Uint8Array => {
      if (!isCanonicalCborBytes(bytes as Uint8Array<ArrayBuffer>)) {
        throw ValidationError(
          'CanonicalCborBytes',
          'input bytes are not canonical CBOR (decode∘encode is not the identity over them)',
        );
      }
      return bytes;
    },
    'CanonicalCborBytes',
  ),
  (fc) => (fc as { anything(): Arbitrary<unknown> }).anything().map((value) => CanonicalCbor.encode(value)),
);

/**
 * Declared capsule for the CanonicalCbor decoder. Registered in the
 * module-level catalog at import time; walked by the factory compiler.
 */
export const canonicalCborDecodeCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'core.canonical-cbor-decode',
  input: CanonicalCborBytes,
  output: S.unknown,
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
 * `normalize(x)`. {@link isCanonicalCborBytes} is the standing definition of the
 * decoder's input domain ("canonical CBOR bytes ⊂ Uint8Array") — the predicate
 * the `withArbitrary` thunk samples within — exposed for direct assertions.
 */
export const _canonicalCborDecodeInternals = { normalize, deepEquals, isCanonicalCborBytes } as const;
