/**
 * RFC 8949 §4.2.1 canonical CBOR encoder conformance tests.
 *
 * Vectors taken from RFC 8949 Appendix A (canonical subset). Plus
 * key-order stability and integer-form preference for our content-address
 * use case.
 */

import { describe, it, expect } from 'vitest';
import { CanonicalCbor, decode } from '@liteship/canonical';
import { hasTag } from '@liteship/error';

function float64Bytes(high: number, low: number): Uint8Array {
  const bytes = new Uint8Array(9);
  bytes[0] = 0xfb;
  const view = new DataView(bytes.buffer);
  view.setUint32(1, high, false);
  view.setUint32(5, low, false);
  return bytes;
}

function numberFromBits(high: number, low: number): number {
  const bytes = float64Bytes(high, low);
  return new DataView(bytes.buffer).getFloat64(1, false);
}

describe('CanonicalCbor.encode — RFC 8949 Appendix A vectors', () => {
  it('encodes unsigned integers in shortest form', () => {
    expect(CanonicalCbor.encode(0)).toEqual(new Uint8Array([0x00]));
    expect(CanonicalCbor.encode(1)).toEqual(new Uint8Array([0x01]));
    expect(CanonicalCbor.encode(10)).toEqual(new Uint8Array([0x0a]));
    expect(CanonicalCbor.encode(23)).toEqual(new Uint8Array([0x17]));
    expect(CanonicalCbor.encode(24)).toEqual(new Uint8Array([0x18, 0x18]));
    expect(CanonicalCbor.encode(25)).toEqual(new Uint8Array([0x18, 0x19]));
    expect(CanonicalCbor.encode(100)).toEqual(new Uint8Array([0x18, 0x64]));
    expect(CanonicalCbor.encode(1000)).toEqual(new Uint8Array([0x19, 0x03, 0xe8]));
    expect(CanonicalCbor.encode(1000000)).toEqual(new Uint8Array([0x1a, 0x00, 0x0f, 0x42, 0x40]));
  });

  it('encodes negative integers via -1-n form', () => {
    expect(CanonicalCbor.encode(-1)).toEqual(new Uint8Array([0x20]));
    expect(CanonicalCbor.encode(-10)).toEqual(new Uint8Array([0x29]));
    expect(CanonicalCbor.encode(-100)).toEqual(new Uint8Array([0x38, 0x63]));
    expect(CanonicalCbor.encode(-1000)).toEqual(new Uint8Array([0x39, 0x03, 0xe7]));
  });

  it('encodes 8-byte integer head for values above uint32 range', () => {
    // 1_000_000_000_000 → 0x1b 00 00 00 e8 d4 a5 10 00 (RFC 8949 Appendix A).
    expect(CanonicalCbor.encode(1_000_000_000_000)).toEqual(
      new Uint8Array([0x1b, 0x00, 0x00, 0x00, 0xe8, 0xd4, 0xa5, 0x10, 0x00]),
    );
  });

  it('encodes simple values', () => {
    expect(CanonicalCbor.encode(false)).toEqual(new Uint8Array([0xf4]));
    expect(CanonicalCbor.encode(true)).toEqual(new Uint8Array([0xf5]));
    expect(CanonicalCbor.encode(null)).toEqual(new Uint8Array([0xf6]));
  });

  it('treats undefined as null', () => {
    expect(CanonicalCbor.encode(undefined)).toEqual(new Uint8Array([0xf6]));
  });

  it('encodes UTF-8 strings with length prefix', () => {
    expect(CanonicalCbor.encode('')).toEqual(new Uint8Array([0x60]));
    expect(CanonicalCbor.encode('a')).toEqual(new Uint8Array([0x61, 0x61]));
    expect(CanonicalCbor.encode('IETF')).toEqual(new Uint8Array([0x64, 0x49, 0x45, 0x54, 0x46]));
  });

  it('encodes definite-length arrays', () => {
    expect(CanonicalCbor.encode([])).toEqual(new Uint8Array([0x80]));
    expect(CanonicalCbor.encode([1, 2, 3])).toEqual(new Uint8Array([0x83, 0x01, 0x02, 0x03]));
  });

  it('encodes definite-length maps with sorted keys', () => {
    expect(CanonicalCbor.encode({})).toEqual(new Uint8Array([0xa0]));
    expect(CanonicalCbor.encode({ a: 1, b: [2, 3] })).toEqual(
      new Uint8Array([0xa2, 0x61, 0x61, 0x01, 0x61, 0x62, 0x82, 0x02, 0x03]),
    );
  });

  it('encodes Uint8Array as byte string', () => {
    expect(CanonicalCbor.encode(new Uint8Array([1, 2, 3, 4]))).toEqual(new Uint8Array([0x44, 0x01, 0x02, 0x03, 0x04]));
  });
});

describe('CanonicalCbor.encode — canonical determinism', () => {
  it('is key-order stable', () => {
    const a = CanonicalCbor.encode({ a: 1, b: 2, c: 3 });
    const b = CanonicalCbor.encode({ c: 3, a: 1, b: 2 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('sorts keys by encoded-byte order, not insertion order', () => {
    // Single-byte 'a' (0x61) sorts before two-byte 'aa' (0x62 0x61 0x61) →
    // RFC 8949 length-then-lex implied via head-byte ordering.
    const out = CanonicalCbor.encode({ aa: 2, a: 1 });
    // Map of two pairs: a(1), aa(2)
    expect(out).toEqual(new Uint8Array([0xa2, 0x61, 0x61, 0x01, 0x62, 0x61, 0x61, 0x02]));
  });

  it('prefers integer form over float for integer-valued numbers', () => {
    expect(CanonicalCbor.encode(1.0)).toEqual(CanonicalCbor.encode(1));
  });

  it('encodes non-integer floats as float64 (major 7 simple 27)', () => {
    const out = CanonicalCbor.encode(1.5);
    expect(out[0]).toBe(0xfb);
    expect(out.length).toBe(9);
  });

  it('encodes NaN and Infinity as float64 with pinned byte patterns', () => {
    // Lock current behavior so content-address payloads stay byte-stable.
    const nan = CanonicalCbor.encode(Number.NaN);
    expect(nan).toEqual(float64Bytes(0x7ff80000, 0));
    const posInf = CanonicalCbor.encode(Number.POSITIVE_INFINITY);
    expect(posInf).toEqual(new Uint8Array([0xfb, 0x7f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
    const negInf = CanonicalCbor.encode(Number.NEGATIVE_INFINITY);
    expect(negInf).toEqual(new Uint8Array([0xfb, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  });

  it('normalizes every JavaScript NaN payload to one portable byte sequence', () => {
    const payloads = [
      numberFromBits(0x7ff00000, 1),
      numberFromBits(0x7fffffff, 0xffffffff),
      numberFromBits(0xfff80000, 0x12345678),
    ];
    for (const value of payloads) {
      expect(Number.isNaN(value)).toBe(true);
      expect(CanonicalCbor.encode(value)).toEqual(float64Bytes(0x7ff80000, 0));
    }
  });

  it('skips undefined values in objects (JSON-compatible)', () => {
    const a = CanonicalCbor.encode({ a: 1, b: undefined, c: 3 });
    const b = CanonicalCbor.encode({ a: 1, c: 3 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('round-trips identical bytes for nested permuted objects', () => {
    const a = CanonicalCbor.encode({ outer: { x: 1, y: 2 }, name: 'capsule' });
    const b = CanonicalCbor.encode({ name: 'capsule', outer: { y: 2, x: 1 } });
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});

describe('CanonicalCbor portable value domain', () => {
  it.each([
    ['Map', new Map([['a', 1]])],
    ['Set', new Set([1])],
    ['Date', new Date(0)],
    ['RegExp', /x/],
    ['Error', new Error('x')],
    ['ArrayBuffer', new ArrayBuffer(4)],
    ['custom prototype', Object.assign(Object.create({ inherited: true }) as object, { own: 1 })],
  ])('refuses %s rather than collapsing it to a map', (_name, value) => {
    expect(() => CanonicalCbor.encode(value)).toThrow();
    try {
      CanonicalCbor.encode(value);
    } catch (error) {
      expect(hasTag(error, 'UnsupportedError')).toBe(true);
    }
  });

  it('refuses cycles, accessors, enumerable symbols, and extra array properties without invoking getters', () => {
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    let getterCalls = 0;
    const accessor = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    const symbolRecord = { ok: true } as Record<PropertyKey, unknown>;
    symbolRecord[Symbol('hidden-semantics')] = 1;
    const array = [1, 2] as number[] & { label?: string };
    array.label = 'not-an-element';

    for (const value of [cycle, accessor, symbolRecord, array]) {
      expect(() => CanonicalCbor.encode(value)).toThrow();
    }
    expect(getterCalls).toBe(0);
  });

  it.each([
    ['safe integer encoded as float64', float64Bytes(0x3ff00000, 0)],
    ['negative zero encoded as float64', float64Bytes(0x80000000, 0)],
    ['alternate positive NaN payload', float64Bytes(0x7ff00000, 1)],
    ['negative NaN payload', float64Bytes(0xfff80000, 0)],
  ])('decoder refuses %s because the encoder cannot emit those bytes', (_name, bytes) => {
    expect(() => decode(bytes)).toThrow();
    try {
      decode(bytes);
    } catch (error) {
      expect(hasTag(error, 'ParseError')).toBe(true);
      expect((error as { code: string }).code).toBe('non_canonical');
    }
  });
});
