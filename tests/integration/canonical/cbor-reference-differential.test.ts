/**
 * Independent CBOR differential: LiteShip's deterministic integer/string domain
 * must agree byte-for-byte with cborg and each decoder must accept the other's
 * bytes. Floats are deliberately excluded because LiteShip's documented identity
 * law always emits float64 while cborg selects the smallest exact float width.
 */

import { decode as referenceDecode, encode as referenceEncode } from 'cborg';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CanonicalCbor, decode } from '@liteship/canonical';

/** One fixed seed → a differential failure replays byte-for-byte on any machine. */
const SEED = 0x5eed;

const differentialValue = fc.letrec<{ value: unknown }>((tie) => ({
  value: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    fc.constant(null),
    fc.boolean(),
    fc.integer({ min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }),
    fc.string(),
    fc.uint8Array({ maxLength: 32 }),
    fc.array(tie('value'), { maxLength: 4 }),
    fc.dictionary(fc.string(), tie('value'), { maxKeys: 4 }),
  ),
})).value;

function normalized(value: unknown): unknown {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return value.map(normalized);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalized(child)]));
  }
  return value;
}

/**
 * Decode the reference implementation's maps through `Map` so poison-key-shaped
 * CBOR keys remain data. cborg's default object mode assigns `__proto__` through
 * the legacy setter and drops the own property; that is a limitation of the
 * independent oracle, not part of LiteShip's accepted value semantics.
 */
function normalizedReference(value: unknown): unknown {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return value.map(normalizedReference);
  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, child]) => [String(key), normalizedReference(child)]));
  }
  return value;
}

/** Compare the byte sequence, not the host-specific Uint8Array subclass. */
function expectSameBytes(actual: Uint8Array, expected: Uint8Array): void {
  expect(Array.from(actual)).toEqual(Array.from(expected));
}

describe('@liteship/canonical ↔ cborg independent differential', () => {
  it('emits the same RFC 8949 deterministic bytes over the shared non-float domain', () => {
    fc.assert(
      fc.property(differentialValue, (value) => {
        expectSameBytes(CanonicalCbor.encode(value), referenceEncode(value));
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('cross-decodes each implementation and preserves the shared value', () => {
    fc.assert(
      fc.property(differentialValue, (value) => {
        const liteBytes = CanonicalCbor.encode(value);
        const referenceBytes = referenceEncode(value);
        expect(decode(referenceBytes)).toStrictEqual(normalized(value));
        expect(normalizedReference(referenceDecode(liteBytes, { useMaps: true }))).toStrictEqual(normalized(value));
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('keeps poison-key maps in the shared byte domain without trusting cborg object materialization', () => {
    const value = Object.fromEntries([['__proto__', null]]);
    const liteBytes = CanonicalCbor.encode(value);
    const referenceBytes = referenceEncode(value);

    expectSameBytes(liteBytes, referenceBytes);
    expect(decode(referenceBytes)).toStrictEqual(value);
    expect(normalizedReference(referenceDecode(liteBytes, { useMaps: true }))).toStrictEqual(value);
  });

  it('treats Buffer and Uint8Array as the same canonical byte sequence', () => {
    const value = {
      nested: Uint8Array.from([0, 0, 0]),
      wideInteger: 4_294_967_296,
    };
    const liteBytes = CanonicalCbor.encode(value);
    const referenceBytes = referenceEncode(value);

    // cborg may select Node's Buffer subclass on some hosts. Constructor
    // identity is not part of RFC 8949 canonical-byte equality.
    expectSameBytes(liteBytes, referenceBytes);
    expectSameBytes(liteBytes, Uint8Array.from(referenceBytes));
  });

  it('pins the intentional float-width divergence instead of laundering it as agreement', () => {
    const value = { exactHalf: 0.5 };
    expect(CanonicalCbor.encode(value)).not.toEqual(referenceEncode(value));
    expect(decode(CanonicalCbor.encode(value))).toEqual(value);
    expect(referenceDecode(referenceEncode(value))).toEqual(value);
  });
});
