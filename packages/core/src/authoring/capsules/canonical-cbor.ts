/**
 * Capsule declaration wrapping CanonicalCbor as a `pureTransform`. Anchors
 * the content-address kernel inside the 7-arm factory so the harness can
 * audit the encoder alongside boundary evaluation and token buffering.
 *
 * @module
 */

import type { Arbitrary } from 'fast-check';
import { defineCapsule } from '../assembly.js';
import { withArbitrary, schema } from '../../schema/constructors.js';
import { CanonicalCbor } from '../../schema/cbor.js';

/**
 * Declared capsule for `CanonicalCbor.encode`. Registered in the module-level
 * catalog at import time; walked by the factory compiler.
 */
export const canonicalCborCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'core.canonical-cbor',
  input: schema.unknown,
  // The encoder's output is an opaque `Uint8Array` carrier (a declaration node);
  // the `withArbitrary` thunk samples the encoder's own image — canonical CBOR
  // bytes — so any structural walk over the output stays in the valid domain.
  output: withArbitrary(schema.bytes(Uint8Array), (fc) =>
    (fc as { anything(): Arbitrary<unknown> }).anything().map((value) => CanonicalCbor.encode(value)),
  ),
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'output-is-uint8array',
      check: (_input: unknown, output: Uint8Array): boolean => output instanceof Uint8Array,
      message: 'encoder output must be Uint8Array',
    },
    {
      name: 'key-order-stable',
      check: (input: unknown, output: Uint8Array): boolean => {
        // For plain objects, re-encoding a key-permuted shallow copy must
        // produce identical bytes. Cheap structural check that binds the
        // capsule's intent (canonical key order) to its observable output.
        if (input === null || typeof input !== 'object' || Array.isArray(input) || input instanceof Uint8Array) {
          return true;
        }
        const keys = Object.keys(input as Record<string, unknown>);
        if (keys.length < 2) return true;
        // Use Object.fromEntries to build the reversed copy so dangerous keys
        // like '__proto__' become own properties (not prototype assignments).
        // Mutating `reversed[k] = ...` would set the prototype for k === '__proto__'
        // and silently produce a different object shape than the input had.
        const reversed = Object.fromEntries(
          [...keys].reverse().map((k) => [k, (input as Record<string, unknown>)[k]] as const),
        );
        const reencoded = CanonicalCbor.encode(reversed);
        if (reencoded.length !== output.length) return false;
        for (let i = 0; i < output.length; i++) {
          if (reencoded[i] !== output[i]) return false;
        }
        return true;
      },
      message: 'encoded output must be invariant under key permutation',
    },
  ],
  budgets: { p95Ms: 1, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  // The kernel `schema.bytes(Uint8Array)` carrier type is `Uint8Array<ArrayBuffer>`
  // (the constructor's own instance type), narrower than the lib-default
  // `Uint8Array` (`<ArrayBufferLike>`) the encoder is annotated to return. The
  // encoder builds its result over a FRESH regular ArrayBuffer, so the value IS
  // an `Uint8Array<ArrayBuffer>`; the narrowing reconciles the lib-widened return
  // type with the schema carrier (a sound one-step assertion, never through
  // `unknown`, and no copy — Doctrine Law 1).
  run: (input: unknown): Uint8Array<ArrayBuffer> => CanonicalCbor.encode(input) as Uint8Array<ArrayBuffer>,
});
