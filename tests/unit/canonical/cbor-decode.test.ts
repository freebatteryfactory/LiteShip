/**
 * Strict canonical CBOR decoder conformance + round-trip tests.
 *
 * The decoder is the inverse of `CanonicalCbor.encode` over the encoder's
 * NORMALIZED domain (top-level `undefined`→`null`, undefined object props
 * dropped). It accepts ONLY the RFC 8949 §4.2.1 deterministic subset the
 * encoder emits and rejects everything else with a typed `@czap/error`
 * `ParseError` (source `'cbor'`, `code` = the reason discriminant).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Effect, Schema } from 'effect';
import { CanonicalCbor, decode } from '@czap/canonical';
import { hasTag } from '@czap/error';
import {
  canonicalCborDecodeCapsule,
  _canonicalCborDecodeInternals,
} from '../../../packages/core/src/capsules/canonical-cbor-decode.js';

const { normalize } = _canonicalCborDecodeInternals;

describe('decode — RFC 8949 Appendix A round-trips', () => {
  it('decodes unsigned integers in shortest form', () => {
    expect(decode(new Uint8Array([0x00]))).toBe(0);
    expect(decode(new Uint8Array([0x17]))).toBe(23);
    expect(decode(new Uint8Array([0x18, 0x18]))).toBe(24);
    expect(decode(new Uint8Array([0x19, 0x03, 0xe8]))).toBe(1000);
    expect(decode(new Uint8Array([0x1a, 0x00, 0x0f, 0x42, 0x40]))).toBe(1000000);
    expect(decode(new Uint8Array([0x1b, 0x00, 0x00, 0x00, 0xe8, 0xd4, 0xa5, 0x10, 0x00]))).toBe(1_000_000_000_000);
  });

  it('decodes negative integers via -1-n form', () => {
    expect(decode(new Uint8Array([0x20]))).toBe(-1);
    expect(decode(new Uint8Array([0x29]))).toBe(-10);
    expect(decode(new Uint8Array([0x38, 0x63]))).toBe(-100);
    expect(decode(new Uint8Array([0x39, 0x03, 0xe7]))).toBe(-1000);
  });

  it('decodes simple values', () => {
    expect(decode(new Uint8Array([0xf4]))).toBe(false);
    expect(decode(new Uint8Array([0xf5]))).toBe(true);
    expect(decode(new Uint8Array([0xf6]))).toBe(null);
  });

  it('decodes float64 (major 7 simple 27)', () => {
    expect(decode(CanonicalCbor.encode(1.5))).toBe(1.5);
    expect(decode(CanonicalCbor.encode(Number.POSITIVE_INFINITY))).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(decode(CanonicalCbor.encode(Number.NaN)) as number)).toBe(true);
  });

  it('decodes UTF-8 strings with length prefix', () => {
    expect(decode(new Uint8Array([0x60]))).toBe('');
    expect(decode(new Uint8Array([0x61, 0x61]))).toBe('a');
    expect(decode(new Uint8Array([0x64, 0x49, 0x45, 0x54, 0x46]))).toBe('IETF');
  });

  it('decodes byte strings to Uint8Array', () => {
    const out = decode(new Uint8Array([0x44, 0x01, 0x02, 0x03, 0x04]));
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out as Uint8Array)).toEqual([1, 2, 3, 4]);
  });

  it('decodes definite-length arrays', () => {
    expect(decode(new Uint8Array([0x80]))).toEqual([]);
    expect(decode(new Uint8Array([0x83, 0x01, 0x02, 0x03]))).toEqual([1, 2, 3]);
  });

  it('decodes definite-length maps with canonical keys', () => {
    expect(decode(new Uint8Array([0xa0]))).toEqual({});
    expect(decode(new Uint8Array([0xa2, 0x61, 0x61, 0x01, 0x61, 0x62, 0x82, 0x02, 0x03]))).toEqual({
      a: 1,
      b: [2, 3],
    });
  });
});

describe('decode — strict rejection of non-canonical input', () => {
  it('rejects float32 (major 7, ai=26) with reason non_canonical', () => {
    // 0xfa = major 7, ai 26 (float32), followed by 4 bytes (1.5f = 0x3fc00000).
    const float32 = new Uint8Array([0xfa, 0x3f, 0xc0, 0x00, 0x00]);
    expect(() => decode(float32)).toThrow();
    try {
      decode(float32);
    } catch (e) {
      expect(hasTag(e, 'ParseError')).toBe(true);
      expect((e as { code: string }).code).toBe('non_canonical');
    }
  });

  it('rejects float16 (major 7, ai=25) with reason non_canonical', () => {
    const float16 = new Uint8Array([0xf9, 0x3c, 0x00]); // 1.0 as half-float
    try {
      decode(float16);
      expect.unreachable('float16 should be rejected');
    } catch (e) {
      expect(hasTag(e, 'ParseError')).toBe(true);
      expect((e as { code: string }).code).toBe('non_canonical');
    }
  });

  it('rejects indefinite-length arrays (ai=31) with reason non_canonical', () => {
    // 0x9f = major 4, ai 31 (indefinite array), 0x01 0x02, 0xff (break).
    const indefinite = new Uint8Array([0x9f, 0x01, 0x02, 0xff]);
    try {
      decode(indefinite);
      expect.unreachable('indefinite-length array should be rejected');
    } catch (e) {
      expect(hasTag(e, 'ParseError')).toBe(true);
      expect((e as { code: string }).code).toBe('non_canonical');
    }
  });

  it('rejects out-of-order map keys with reason non_canonical', () => {
    // Map of two pairs emitted in DESCENDING key order: 'b' then 'a'.
    // Canonical order is 'a' then 'b', so this must be rejected.
    const outOfOrder = new Uint8Array([0xa2, 0x61, 0x62, 0x02, 0x61, 0x61, 0x01]);
    try {
      decode(outOfOrder);
      expect.unreachable('out-of-order map keys should be rejected');
    } catch (e) {
      expect(hasTag(e, 'ParseError')).toBe(true);
      expect((e as { code: string }).code).toBe('non_canonical');
    }
  });

  it('rejects duplicate map keys with reason non_canonical', () => {
    const dup = new Uint8Array([0xa2, 0x61, 0x61, 0x01, 0x61, 0x61, 0x02]);
    try {
      decode(dup);
      expect.unreachable('duplicate map keys should be rejected');
    } catch (e) {
      expect(hasTag(e, 'ParseError')).toBe(true);
      expect((e as { code: string }).code).toBe('non_canonical');
    }
  });

  it('rejects non-shortest integer encoding with reason non_canonical', () => {
    // 24 encoded in a 2-byte head (0x19 0x00 0x18) instead of 0x18 0x18.
    const nonShortest = new Uint8Array([0x19, 0x00, 0x18]);
    try {
      decode(nonShortest);
      expect.unreachable('non-shortest integer encoding should be rejected');
    } catch (e) {
      expect(hasTag(e, 'ParseError')).toBe(true);
      expect((e as { code: string }).code).toBe('non_canonical');
    }
  });

  it('rejects truncated input with reason unexpected_eof', () => {
    // 0x64 declares a 4-byte string but only 2 bytes follow.
    const truncated = new Uint8Array([0x64, 0x49, 0x45]);
    try {
      decode(truncated);
      expect.unreachable('truncated input should be rejected');
    } catch (e) {
      expect(hasTag(e, 'ParseError')).toBe(true);
      expect((e as { code: string }).code).toBe('unexpected_eof');
      // The decoder carries the byte offset where it ran out of input.
      expect((e as { offset: number }).offset).toBe(1);
    }
  });

  it('rejects trailing bytes after the top-level item with reason malformed', () => {
    const trailing = new Uint8Array([0x00, 0x00]);
    try {
      decode(trailing);
      expect.unreachable('trailing bytes should be rejected');
    } catch (e) {
      expect(hasTag(e, 'ParseError')).toBe(true);
      expect((e as { code: string }).code).toBe('malformed');
    }
  });
});

describe('canonicalCborDecodeCapsule input schema', () => {
  it('accepts canonical encoder bytes and rejects non-canonical Uint8Array input at parse time', async () => {
    const canonical = CanonicalCbor.encode({ ok: true });
    const parsed = await Effect.runPromise(Schema.decodeUnknownEffect(canonicalCborDecodeCapsule.input)(canonical));
    expect(parsed).toBeInstanceOf(Uint8Array);

    const trailing = new Uint8Array([0x00, 0x00]);
    const rejected = await Effect.runPromiseExit(
      Schema.decodeUnknownEffect(canonicalCborDecodeCapsule.input)(trailing),
    );
    expect(rejected._tag).toBe('Failure');
  });
});

describe('decode — round-trip invariant over the normalized domain', () => {
  // Arbitrary that excludes raw `undefined` so it lives in the encoder's image.
  // (The encoder coerces undefined→null and drops undefined props; we compare
  // against normalize(x) to state the invariant honestly.)
  const jsonValue = fc.letrec<{ node: unknown }>((tie) => ({
    node: fc.oneof(
      { depthSize: 'small', withCrossShrink: true },
      fc.boolean(),
      fc.constant(null),
      fc.integer({ min: -1_000_000, max: 1_000_000 }),
      // Floats are bit-exact under float64 round-trip; exclude NaN here
      // (compared separately) since NaN !== NaN under plain deep-equal.
      fc.double({ noNaN: true, noDefaultInfinity: false }),
      fc.string(),
      fc.array(tie('node'), { maxLength: 4 }),
      fc.dictionary(fc.string(), tie('node'), { maxKeys: 4 }),
    ),
  })).node;

  it('decode(encode(x)) deep-equals normalize(x)', () => {
    fc.assert(
      fc.property(jsonValue, (x) => {
        const round = decode(CanonicalCbor.encode(x));
        expect(round).toStrictEqual(normalize(x));
      }),
      { numRuns: 500 },
    );
  });

  it('round-trips explicit normalized fixtures', () => {
    const fixtures: unknown[] = [
      0,
      -1,
      42,
      -1000,
      1.5,
      'hello',
      '',
      true,
      false,
      null,
      [],
      [1, 'two', false, null],
      {},
      { a: 1, b: [2, 3], c: { nested: true } },
      { z: 1, a: 2, m: 3 }, // re-encoded canonically; decode verifies key order
    ];
    for (const x of fixtures) {
      expect(decode(CanonicalCbor.encode(x))).toStrictEqual(normalize(x));
    }
  });

  // Regression: a `__proto__` map key is DATA, not a prototype mutation. Found by
  // the round-trip property at ~1-in-400k (a `__proto__` string key generated by
  // fc.dictionary). Plain `out[key] = v` invokes the prototype setter — both a
  // prototype-pollution vector for untrusted CBOR and a silent key loss that broke
  // decode∘encode === normalize. Pinned deterministically here, both sites.
  it('treats a `__proto__` map key as an own data property (no prototype pollution)', () => {
    // The shrunk counterexample shape: an object carrying a `__proto__` OWN key
    // (a computed key, NOT the `{ __proto__: … }` prototype-literal special case).
    const subject: Record<string, unknown> = {};
    Object.defineProperty(subject, '__proto__', { value: [], enumerable: true, writable: true, configurable: true });
    subject[''] = false;
    subject[' '] = false;

    for (const candidate of [subject, [subject], { nested: subject }] as unknown[]) {
      // Round-trips to the normalized form, prototype included.
      expect(decode(CanonicalCbor.encode(candidate))).toStrictEqual(normalize(candidate));
    }

    // The decoded `__proto__` is an OWN property, the object's prototype is still
    // the ordinary Object.prototype, and Object.prototype was never polluted.
    const roundtrip = decode(CanonicalCbor.encode(subject)) as object;
    expect(Object.prototype.hasOwnProperty.call(roundtrip, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(roundtrip)).toBe(Object.prototype);
    expect(Array.isArray((roundtrip as Record<string, unknown>)['__proto__'])).toBe(true);
    expect(({} as Record<string, unknown>)['__polluted__']).toBeUndefined();
  });
});
