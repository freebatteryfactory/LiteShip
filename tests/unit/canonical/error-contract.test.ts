// @vitest-environment node
/**
 * Public failure contract for @liteship/canonical.
 *
 * PROVES: canonical rejects invalid brands, unsupported value graphs, and
 * malformed/non-canonical byte streams through the shared tagged algebra.
 */
import { describe, expect, it } from 'vitest';
import { CanonicalCbor, ContentAddress, IntegrityDigest, decode } from '@liteship/canonical';
import { hasTag } from '@liteship/error';

function capture(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new Error('negative control did not fail');
}

describe('@liteship/canonical error contract', () => {
  it('rejects malformed identity and integrity brands as ValidationError values', () => {
    expect(hasTag(capture(() => ContentAddress('fnv1a:XYZ')), 'ValidationError')).toBe(true);
    expect(hasTag(capture(() => IntegrityDigest('sha256:not-a-digest')), 'ValidationError')).toBe(true);
  });

  it('rejects unsupported host objects as UnsupportedError values', () => {
    expect(hasTag(capture(() => CanonicalCbor.encode(new Map())), 'UnsupportedError')).toBe(true);
  });

  it('rejects malformed and non-canonical bytes as ParseError values with bounded reasons', () => {
    for (const bytes of [new Uint8Array([0x18]), new Uint8Array([0x18, 0x17])]) {
      const error = capture(() => decode(bytes));
      expect(hasTag(error, 'ParseError')).toBe(true);
      expect(['unexpected_eof', 'non_canonical']).toContain((error as { code?: string }).code);
      expect((error as { source?: string }).source).toBe('cbor');
    }
  });
});
