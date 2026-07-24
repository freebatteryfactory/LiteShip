/**
 * `@liteship/core` re-export conformance — canonical kernel output matches core shim.
 */

import { describe, it, expect } from 'vitest';
import { AddressedDigest as CoreAddressedDigest, CanonicalCbor as CoreCbor, fnv1aBytes as coreFnv1aBytes } from '@liteship/core';
import { AddressedDigest, CanonicalCbor, fnv1aBytes } from '@liteship/canonical';

describe('@liteship/core canonical shim conformance', () => {
  it('CanonicalCbor.encode matches @liteship/canonical byte-for-byte', () => {
    const value = { b: 2, a: 1, nested: { z: 3, y: 2 } };
    expect(CoreCbor.encode(value)).toEqual(CanonicalCbor.encode(value));
  });

  it('fnv1aBytes matches @liteship/canonical', () => {
    const bytes = CanonicalCbor.encode({ name: 'accent', category: 'color' });
    expect(coreFnv1aBytes(bytes)).toBe(fnv1aBytes(bytes));
  });

  it('AddressedDigest.of matches @liteship/canonical for sha256 and blake3', () => {
    const bytes = new Uint8Array([9, 8, 7, 6, 5]);
    expect(CoreAddressedDigest.of(bytes)).toEqual(AddressedDigest.of(bytes));
    expect(CoreAddressedDigest.of(bytes, 'blake3')).toEqual(AddressedDigest.of(bytes, 'blake3'));
  });
});
