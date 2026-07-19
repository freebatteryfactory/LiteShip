/**
 * Owner unit test for the canonical digest/comparator helpers consolidated in
 * Wave 7 (ownership consolidation): `bytesToHex`, `sha256Hex`, and the
 * module-internal `compareBytes`. Pins the exact behavior the copy-sites rely
 * on so Phase 2 consumers can import a single owner.
 *
 * Identity-law separation (ADR-0011/ADR-0012): `sha256Hex` returns PLAIN hex
 * with NO `sha256:` label — it is the hex HALF of `addressedDigestOf`'s
 * `integrity_digest`, NOT a merge of the labeled receipt law (#3). The labeled
 * form stays separately named and pinned (see canonical-identity.test.ts).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { CanonicalCbor, addressedDigestOf, bytesToHex, decode, sha256Hex } from '@liteship/canonical';
// compareBytes is module-internal (kept OUT of the public index for minimal
// surface), so it is imported from the source leaf directly.
import { compareBytes } from '../../../packages/canonical/src/compare-bytes.js';

describe('bytesToHex — lowercase hex, two chars per byte, no separators', () => {
  it('encodes each byte as zero-padded lowercase hex', () => {
    expect(bytesToHex(new Uint8Array([0, 1, 15, 16, 255]))).toBe('00010f10ff');
  });

  it('empty input → empty string', () => {
    expect(bytesToHex(new Uint8Array(0))).toBe('');
  });

  it('is a bare byte-to-hex map — no separators, no prefix', () => {
    expect(bytesToHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef');
  });
});

describe('sha256Hex — plain hex matching the addressedDigestOf hex, with NO label', () => {
  const hexOf = (labeled: string): string => labeled.slice(labeled.indexOf(':') + 1);

  it('Uint8Array input matches the hex half of addressedDigestOf (sha256), unlabeled', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const labeled = addressedDigestOf(bytes).integrity_digest; // `sha256:<64-hex>`
    expect(sha256Hex(bytes)).toBe(hexOf(labeled));
    expect(sha256Hex(bytes)).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex(bytes)).not.toContain('sha256:');
  });

  it('string input is hashed as UTF-8 bytes and matches addressedDigestOf of those bytes', () => {
    const str = 'the-slug-input';
    const bytes = new TextEncoder().encode(str);
    expect(sha256Hex(str)).toBe(sha256Hex(bytes));
    expect(sha256Hex(str)).toBe(hexOf(addressedDigestOf(bytes).integrity_digest));
  });

  it('same input → identical digest; one flipped byte → different digest', () => {
    expect(sha256Hex(new Uint8Array([9, 8, 7]))).toBe(sha256Hex(new Uint8Array([9, 8, 7])));
    expect(sha256Hex(new Uint8Array([9, 8, 7]))).not.toBe(sha256Hex(new Uint8Array([9, 8, 6])));
  });

  it('the labeled receipt law stays SEPARATE — addressedDigestOf keeps its `sha256:` prefix', () => {
    const bytes = new Uint8Array([0, 0, 0]);
    expect(addressedDigestOf(bytes).integrity_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    // sha256Hex is exactly that label stripped — a helper for slugs, not a merge.
    expect(sha256Hex(bytes)).toBe(addressedDigestOf(bytes).integrity_digest.slice('sha256:'.length));
  });
});

describe('compareBytes — byte-lexicographic comparator returning -1/0/1', () => {
  it('returns exactly -1, 0, or 1 on the first differing byte', () => {
    expect(compareBytes(new Uint8Array([1]), new Uint8Array([2]))).toBe(-1);
    expect(compareBytes(new Uint8Array([2]), new Uint8Array([1]))).toBe(1);
    expect(compareBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(0);
  });

  it('a strict prefix sorts before the longer array', () => {
    expect(compareBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2, 0]))).toBe(-1);
    expect(compareBytes(new Uint8Array([1, 2, 0]), new Uint8Array([1, 2]))).toBe(1);
  });

  it('is antisymmetric: compareBytes(a,b) === -compareBytes(b,a)', () => {
    const samples = [
      new Uint8Array(0),
      new Uint8Array([0]),
      new Uint8Array([0, 0]),
      new Uint8Array([255]),
      new Uint8Array([1, 2, 3]),
    ];
    for (const a of samples) {
      for (const b of samples) {
        const ba = compareBytes(b, a);
        // `ba === 0 ? 0` avoids the `-0` vs `+0` Object.is artifact when equal.
        expect(compareBytes(a, b)).toBe(ba === 0 ? 0 : -ba);
      }
    }
  });
});

describe('compareBytes — encode/decode sort-verify symmetry (the copy-site law)', () => {
  it('CanonicalCbor sorts map keys by compareBytes; decode verifies the same order → round-trips', () => {
    // The encoder sorts pairs by compareBytes over encoded key bytes; the
    // decoder `fail('non_canonical', ...)`s on any key out of that order. A
    // clean round-trip proves the two share one comparator by construction.
    const obj = { zebra: 1, apple: 2, mango: 3, b: 4, aa: 5 };
    expect(decode(CanonicalCbor.encode(obj))).toEqual(obj);
  });

  it('sorting encoded keys with compareBytes reproduces the encoder byte order (length-first, then bytes)', () => {
    // RFC 8949 §4.2.1 sorts on ENCODED key bytes: a CBOR text string's head
    // carries its length, so shorter keys sort first — NOT plain lexicographic.
    const keys = ['bb', 'a', 'zzz', 'ab', 'c'];
    const encKey = (k: string): Uint8Array => CanonicalCbor.encode(k);
    const viaCompare = [...keys].sort((p, q) => compareBytes(encKey(p), encKey(q)));
    // Independently recover the encoder's order by decoding the map it emits;
    // decode rebuilds the object in canonical byte order.
    const obj = Object.fromEntries(keys.map((k, i) => [k, i]));
    const decodedOrder = Object.keys(decode(CanonicalCbor.encode(obj)) as Record<string, unknown>);
    expect(decodedOrder).toEqual(viaCompare);
    // Guards that this is byte-lex over encoded keys, not plain string sort.
    expect(viaCompare).toEqual(['a', 'c', 'ab', 'bb', 'zzz']);
  });
});
