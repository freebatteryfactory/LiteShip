/**
 * Property test: IntegrityDigest determinism + format conformance (ADR-0011).
 *
 * Mirrors the shape of `content-address.prop.test.ts` for the sha256 sibling.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { AddressedDigest } from '@czap/core';

const SHA_RE = /^sha256:[0-9a-f]{64}$/;
const FNV_RE = /^fnv1a:[0-9a-f]{8}$/;

const digestOf = (bytes: Uint8Array) => AddressedDigest.of(bytes);

describe('AddressedDigest properties', () => {
  test('integrity_digest format is sha256:<64-hex>', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 256 }), (raw) => {
        const d = digestOf(raw);
        return SHA_RE.test(d.integrity_digest);
      }),
      { numRuns: 50 },
    );
  });

  test('display_id format is fnv1a:<8-hex>', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 256 }), (raw) => {
        const d = digestOf(raw);
        return FNV_RE.test(d.display_id);
      }),
      { numRuns: 50 },
    );
  });

  test('same bytes → identical digests', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 256 }), (raw) => {
        const a = digestOf(raw);
        const b = digestOf(new Uint8Array(raw));
        return a.display_id === b.display_id && a.integrity_digest === b.integrity_digest;
      }),
      { numRuns: 50 },
    );
  });

  test('bytes that differ in at least one position → digests differ', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 64 }),
        fc.nat({ max: 255 }),
        fc.nat({ max: 1000 }),
        (raw, delta, idxSeed) => {
          if (delta === 0) return true;
          const idx = idxSeed % raw.length;
          const mutated = new Uint8Array(raw);
          mutated[idx] = (mutated[idx]! + delta) & 0xff;
          if (mutated[idx] === raw[idx]) return true;
          const a = digestOf(raw);
          const b = digestOf(mutated);
          return a.integrity_digest !== b.integrity_digest;
        },
      ),
      { numRuns: 50 },
    );
  });
});
