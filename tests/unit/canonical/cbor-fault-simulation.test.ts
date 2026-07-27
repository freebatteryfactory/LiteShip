/** Deterministic external-byte fault schedules for the canonical reader. */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CanonicalCbor, decode } from '@liteship/canonical';
import { hasTag } from '@liteship/error';

const boundedValue = fc.letrec<{ value: unknown }>((tie) => ({
  value: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    fc.constant(null),
    fc.boolean(),
    fc.integer({ min: -1_000_000, max: 1_000_000 }),
    fc.string({ maxLength: 24 }),
    fc.uint8Array({ maxLength: 24 }),
    fc.array(tie('value'), { maxLength: 3 }),
    fc.dictionary(fc.string({ maxLength: 12 }), tie('value'), { maxKeys: 3 }),
  ),
})).value;

function rejectionCode(bytes: Uint8Array): string {
  try {
    decode(bytes);
    return 'accepted';
  } catch (error) {
    expect(hasTag(error, 'ParseError')).toBe(true);
    return (error as { code: string }).code;
  }
}

function normalized(value: unknown): unknown {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return value.map(normalized);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalized(child)]));
  }
  return value;
}

describe('canonical CBOR deterministic fault simulation', () => {
  it('every strict prefix of an encoded value fails closed and the complete frame succeeds', () => {
    fc.assert(
      fc.property(boundedValue, (value) => {
        const bytes = CanonicalCbor.encode(value);
        for (let length = 0; length < bytes.length; length += 1) {
          expect(rejectionCode(bytes.slice(0, length))).not.toBe('accepted');
        }
        expect(decode(bytes)).toStrictEqual(normalized(value));
      }),
      { numRuns: 120 },
    );
  });

  it('trailing-byte and duplicate-key schedules are deterministic across replay', () => {
    const schedules = [
      new Uint8Array([0x00, 0x00]),
      new Uint8Array([0xa2, 0x61, 0x61, 0x01, 0x61, 0x61, 0x02]),
      new Uint8Array([0xa2, 0x61, 0x62, 0x01, 0x61, 0x61, 0x02]),
      new Uint8Array([0x9f, 0x01, 0xff]),
    ];
    const first = schedules.map(rejectionCode);
    const replay = schedules.map((bytes) => rejectionCode(new Uint8Array(bytes)));
    expect(replay).toEqual(first);
    expect(first).toEqual(['malformed', 'non_canonical', 'non_canonical', 'non_canonical']);
  });

  it('does not retain or mutate the caller buffer after decoding', () => {
    const encoded = CanonicalCbor.encode(new Uint8Array([1, 2, 3]));
    const decoded = decode(encoded) as Uint8Array;
    encoded.fill(0xff);
    expect(decoded).toEqual(new Uint8Array([1, 2, 3]));
  });
});
