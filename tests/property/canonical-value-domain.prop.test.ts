/**
 * Portable canonical-value and FNV byte-law properties.
 *
 * These properties pin the semantic boundary rather than the current encoder
 * branches: every admitted value round-trips through the strict reader, every
 * NaN payload has one byte representation, and string labels equal the label
 * over the exact UTF-8 bytes.
 */

// PROVES: INV-CONTENT-ADDRESS-DETERMINISTIC
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CanonicalCbor,
  decode,
  fnv1a,
  fnv1aBytes,
  isCanonicalCborValue,
} from '@liteship/canonical';

const SEED = 0x43424f52;

const portableValue = fc.letrec<{ value: unknown }>((tie) => ({
  value: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    fc.constant(null),
    fc.boolean(),
    fc.integer({ min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }),
    fc.double({ noNaN: true, noDefaultInfinity: false }),
    fc.string(),
    fc.uint8Array({ maxLength: 32 }),
    fc.array(tie('value'), { maxLength: 4 }),
    fc.dictionary(fc.string(), tie('value'), { maxKeys: 4 }),
  ),
})).value;

function normalize(value: unknown): unknown {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
  }
  return Object.is(value, -0) ? 0 : value;
}

function nanFromPayload(sign: boolean, highMantissa: number, lowMantissa: number): number {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  const high = (sign ? 0xfff00000 : 0x7ff00000) | (highMantissa & 0x000fffff);
  view.setUint32(0, high, false);
  view.setUint32(4, lowMantissa >>> 0, false);
  return view.getFloat64(0, false);
}

describe('canonical portable-value properties', () => {
  it('admits generated portable values and preserves the encoder image exactly', () => {
    fc.assert(
      fc.property(portableValue, (value) => {
        expect(isCanonicalCborValue(value)).toBe(true);
        const bytes = CanonicalCbor.encode(value);
        expect(decode(bytes)).toStrictEqual(normalize(value));
        expect(CanonicalCbor.encode(decode(bytes))).toEqual(bytes);
      }),
      { seed: SEED, numRuns: 500 },
    );
  });

  it('normalizes arbitrary NaN payload bits', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: 0x000fffff }),
        fc.integer({ min: 0, max: 0xffffffff }),
        (sign, highMantissa, lowMantissa) => {
          if (highMantissa === 0 && lowMantissa === 0) return;
          const value = nanFromPayload(sign, highMantissa, lowMantissa);
          expect(Number.isNaN(value)).toBe(true);
          expect(CanonicalCbor.encode(value)).toEqual(
            new Uint8Array([0xfb, 0x7f, 0xf8, 0, 0, 0, 0, 0, 0]),
          );
        },
      ),
      { seed: SEED ^ 0x4e414e, numRuns: 300 },
    );
  });

  it('hashes strings through the same UTF-8 byte law as fnv1aBytes', () => {
    const encoder = new TextEncoder();
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(fnv1a(value)).toBe(fnv1aBytes(encoder.encode(value)));
      }),
      { seed: SEED ^ 0x55544638, numRuns: 500 },
    );
  });
});
