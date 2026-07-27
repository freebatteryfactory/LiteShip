import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { canonicalJson } from '@liteship/canonical';

function reverseRecordOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseRecordOrder);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([key, child]) => [key, reverseRecordOrder(child)]),
    );
  }
  return value;
}

describe('canonical JSON owner', () => {
  it('is invariant under recursive record-key permutations while preserving JSON meaning', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const encoded = canonicalJson(value);
        expect(canonicalJson(reverseRecordOrder(value))).toBe(encoded);
        expect(JSON.parse(encoded)).toEqual(JSON.parse(JSON.stringify(value)));
      }),
      { seed: 0xca901ca, numRuns: 120 },
    );
  });

  it('refuses unsupported or ambiguous host values instead of minting misleading bytes', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    const sparse = Array.from({ length: 2 }) as unknown[];
    sparse[1] = 'present';
    const getter = Object.defineProperty({}, 'value', { enumerable: true, get: () => 1 });

    for (const candidate of [undefined, Number.NaN, Infinity, 1n, new Date(0), cyclic, sparse, getter]) {
      let failure: unknown;
      try {
        canonicalJson(candidate);
      } catch (error) {
        failure = error;
      }
      expect(failure).toMatchObject({ _tag: 'ValidationError', module: 'canonicalJson' });
    }
  });
});
