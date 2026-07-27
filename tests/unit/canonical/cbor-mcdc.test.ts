/**
 * MC/DC decision table for the canonical encoder/decoder's boundary-heavy heads,
 * map ordering, and simple-value refusal arms.
 */

import { describe, expect, it } from 'vitest';
import { CanonicalCbor, decode } from '@liteship/canonical';
import { hasTag } from '@liteship/error';

function codeOf(bytes: readonly number[]): string {
  try {
    decode(new Uint8Array(bytes));
    return 'accepted';
  } catch (error) {
    expect(hasTag(error, 'ParseError')).toBe(true);
    return (error as { code: string }).code;
  }
}

describe('canonical CBOR MC/DC decision table', () => {
  it.each([
    [23, 0x17, 1],
    [24, 0x18, 2],
    [0xff, 0x18, 2],
    [0x100, 0x19, 3],
    [0xffff, 0x19, 3],
    [0x10000, 0x1a, 5],
    [0xffffffff, 0x1a, 5],
    [0x100000000, 0x1b, 9],
  ] as const)('selects the shortest integer head for %d', (value, head, length) => {
    const encoded = CanonicalCbor.encode(value);
    expect(encoded[0]).toBe(head);
    expect(encoded).toHaveLength(length);
    expect(decode(encoded)).toBe(value);
  });

  it.each([
    ['inline boundary accepted', [0x17], 'accepted'],
    ['one-byte shortest boundary accepted', [0x18, 0x18], 'accepted'],
    ['one-byte non-shortest rejected', [0x18, 0x17], 'non_canonical'],
    ['two-byte shortest boundary accepted', [0x19, 0x01, 0x00], 'accepted'],
    ['two-byte non-shortest rejected', [0x19, 0x00, 0xff], 'non_canonical'],
    ['four-byte shortest boundary accepted', [0x1a, 0x00, 0x01, 0x00, 0x00], 'accepted'],
    ['four-byte non-shortest rejected', [0x1a, 0x00, 0x00, 0xff, 0xff], 'non_canonical'],
    ['reserved additional-info rejected', [0x1c], 'malformed'],
    ['indefinite argument rejected', [0x1f], 'non_canonical'],
  ] as const)('%s', (_name, bytes, expected) => {
    expect(codeOf(bytes)).toBe(expected);
  });

  it.each([
    ['first map key has no predecessor', [0xa1, 0x61, 0x61, 0x01], 'accepted'],
    ['ascending keys accepted', [0xa2, 0x61, 0x61, 0x01, 0x61, 0x62, 0x02], 'accepted'],
    ['descending keys rejected', [0xa2, 0x61, 0x62, 0x02, 0x61, 0x61, 0x01], 'non_canonical'],
    ['equal keys rejected', [0xa2, 0x61, 0x61, 0x01, 0x61, 0x61, 0x02], 'non_canonical'],
    ['non-text key rejected', [0xa1, 0x01, 0x01], 'malformed'],
  ] as const)('%s', (_name, bytes, expected) => {
    expect(codeOf(bytes)).toBe(expected);
  });

  it.each([
    ['false', [0xf4], 'accepted'],
    ['true', [0xf5], 'accepted'],
    ['null', [0xf6], 'accepted'],
    ['undefined', [0xf7], 'non_canonical'],
    ['float16', [0xf9, 0x3c, 0x00], 'non_canonical'],
    ['float32', [0xfa, 0x3f, 0x80, 0x00, 0x00], 'non_canonical'],
    ['break', [0xff], 'non_canonical'],
    ['foreign simple', [0xf8, 0x20], 'malformed'],
  ] as const)('classifies simple condition %s', (_name, bytes, expected) => {
    expect(codeOf(bytes)).toBe(expected);
  });
});
