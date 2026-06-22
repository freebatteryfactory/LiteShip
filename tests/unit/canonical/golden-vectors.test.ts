/**
 * Golden vectors — pin exact bytes and digests for the canonical kernel.
 *
 * Falsified: changing CanonicalCbor.encode, fnv1aBytes, or noble SHA-256
 * wiring breaks these fixtures.
 */

import { describe, it, expect } from 'vitest';
import { AddressedDigest, CanonicalCbor, addressedDigestOf, fnv1a, fnv1aBytes } from '@czap/canonical';

describe('canonical golden vectors', () => {
  it('CanonicalCbor.encode pins integer zero', () => {
    expect(CanonicalCbor.encode(0)).toEqual(new Uint8Array([0x00]));
  });

  it('fnv1aBytes pins empty input', () => {
    expect(fnv1aBytes(new Uint8Array(0))).toBe('fnv1a:811c9dc5');
  });

  it('fnv1aBytes pins a NON-EMPTY input — exercises the loop body (the MC/DC bytes-guard law)', () => {
    // The empty-input vector alone leaves `fnv1aBytes`'s `i < bytes.length` loop guard
    // MC/DC-uncovered (the loop body never runs): force-false (skip the loop) and
    // force-true (never exit → hang) are only distinguished when a test actually iterates.
    // This non-empty known-answer vector enters the loop, so both condition pins are killed.
    expect(fnv1aBytes(new Uint8Array([1, 2, 3, 4, 5]))).toBe('fnv1a:bfe534e8');
  });

  it('fnv1a (string) pins known-answer vectors — the FNV-1a loop-bound law', () => {
    // KNOWN-ANSWER pins for the string FNV-1a. The full-string fold MUST visit
    // exactly str[0..length-1]; the committed hexes are the real algorithm output.
    // This is the kill for the `i < str.length` → `i <= str.length` boundary mutant:
    // `<=` reads str[str.length] = undefined → charCodeAt → NaN → a DIFFERENT hash, so
    // these pins go red on the mutation. (L4: the canonical FNV deserves a golden pin.)
    expect(fnv1a('hello')).toBe('fnv1a:4f9f2cab');
    expect(fnv1a('czap')).toBe('fnv1a:f9752f31');
    // The empty string folds nothing → the FNV offset basis (the same anchor the loop
    // bound must respect: 0 iterations for an empty string).
    expect(fnv1a('')).toBe('fnv1a:811c9dc5');
    // A vector whose raw hex is SHORT (7 digits, 0x023e1b60 → '23e1b60') so the
    // 8-wide zero-pad is load-bearing. This is the kill for the `padStart(8, '0')` →
    // `padStart(8, '')` mutant: an empty fill leaves '23e1b60' (un-padded), a DIFFERENT
    // display id, so the leading-zero pin goes red on the mutation.
    expect(fnv1a('padme')).toBe('fnv1a:023e1b60');
  });

  it('addressedDigestOf default algo routes to sha256 (≡ explicit sha256, ≠ blake3)', () => {
    // The DEFAULT-VALUE contract of the `algo` parameter: calling with NO algo arg
    // produces a digest IDENTICAL to the explicit `'sha256'` and DISTINCT from
    // `'blake3'`. Pins that the default genuinely selects the sha256 branch.
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const def = addressedDigestOf(bytes);
    const sha = addressedDigestOf(bytes, 'sha256');
    const blake = addressedDigestOf(bytes, 'blake3');
    expect(def.integrity_digest).toBe(sha.integrity_digest);
    expect(def.algo).toBe('sha256');
    expect(def.integrity_digest).not.toBe(blake.integrity_digest);
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
