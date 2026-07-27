// @vitest-environment node
/** Property proof for the gauntlet's named set algebra. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { composeGateSets, memoryContext, replaceGate, type Gate } from '@liteship/gauntlet';

function gate(id: string): Gate {
  const context = memoryContext({});
  const value: Gate = {
    id,
    level: 'L1',
    describe: `property gate ${id}`,
    access: {},
    run: () => [],
    fixtures: {
      red: { name: 'red', context },
      green: { name: 'green', context },
      mutation: { describe: 'identity', mutate: (original) => original },
    },
  };
  return Object.freeze(value);
}

const idArbitrary = fc.stringMatching(/^[a-z][a-z0-9-]{0,18}$/u);

describe('gate composition set algebra', () => {
  it('preserves first-seen order and equals the identity union for arbitrary partitions', () => {
    fc.assert(
      fc.property(fc.uniqueArray(idArbitrary, { maxLength: 40 }), fc.nat(), (ids, cutSeed) => {
        const values = ids.map(gate);
        const cut = values.length === 0 ? 0 : cutSeed % (values.length + 1);
        const left = values.slice(0, cut);
        const right = values.slice(cut);
        const composed = composeGateSets(left, right, left);
        expect(composed).toEqual(values);
        expect(new Set(composed.map((value) => value.id)).size).toBe(composed.length);
        expect(Object.isFrozen(composed)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects conflicting identities instead of silently shadowing a gate', () => {
    fc.assert(
      fc.property(idArbitrary, (id) => {
        expect(() => composeGateSets([gate(id)], [gate(id)])).toThrow(/conflicting gate definitions/u);
      }),
      { numRuns: 100 },
    );
  });

  it('replaces exactly one matching identity and preserves every other position', () => {
    fc.assert(
      fc.property(fc.uniqueArray(idArbitrary, { minLength: 1, maxLength: 30 }), fc.nat(), (ids, seed) => {
        const values = ids.map(gate);
        const index = seed % values.length;
        const replacement = gate(ids[index]!);
        const replaced = replaceGate(values, replacement);
        expect(replaced[index]).toBe(replacement);
        expect(replaced.filter((value) => value.id === replacement.id)).toHaveLength(1);
        expect(replaced.filter((_, at) => at !== index)).toEqual(values.filter((_, at) => at !== index));
      }),
      { numRuns: 150 },
    );
  });

  it('refuses zero-match and duplicate-match replacements', () => {
    const original = gate('original');
    expect(() => replaceGate([original], gate('missing'))).toThrow(/matched 0/u);
    expect(() => replaceGate([original, original], gate('original'))).toThrow(/matched 2/u);
  });
});
