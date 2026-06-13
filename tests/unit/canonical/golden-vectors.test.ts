/**
 * Golden vectors — pin exact bytes and digests for the canonical kernel.
 *
 * Falsified: changing CanonicalCbor.encode, fnv1aBytes, or noble SHA-256
 * wiring breaks these fixtures.
 */

import { describe, it, expect } from 'vitest';
import { AddressedDigest, CanonicalCbor, fnv1aBytes } from '@czap/canonical';

describe('canonical golden vectors', () => {
  it('CanonicalCbor.encode pins integer zero', () => {
    expect(CanonicalCbor.encode(0)).toEqual(new Uint8Array([0x00]));
  });

  it('fnv1aBytes pins empty input', () => {
    expect(fnv1aBytes(new Uint8Array(0))).toBe('fnv1a:811c9dc5');
  });

  it('AddressedDigest.of pins [1,2,3,4,5] sha256 pair', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const d = AddressedDigest.of(bytes);
    expect(d.display_id).toBe('fnv1a:bfe534e8');
    expect(d.integrity_digest).toBe(
      'sha256:74f81fe167d99b4cb41d6d0ccda82278caee9f3e2f25d5e5a3936ff3dcec60d0',
    );
    expect(d.algo).toBe('sha256');
  });

  it('AddressedDigest.of pins boundary-like payload bytes', () => {
    const payload = CanonicalCbor.encode({
      input: 'viewport.width',
      thresholds: [0, 768],
      states: ['compact', 'wide'],
    });
    const d = AddressedDigest.of(payload);
    expect(d.display_id).toBe('fnv1a:ec066d5e');
    expect(d.integrity_digest).toBe(
      'sha256:abbcd2e128f338218465330a4b9cc8486b04d6ee08183c5b8fa80477475c2ca6',
    );
  });
});
