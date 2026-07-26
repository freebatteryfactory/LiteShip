/**
 * The benchmark distribution parser is one gauntlet-owned contract. Audit may
 * add AST reachability facts, but it must not reinterpret the registry bytes.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseQualifiedBenchDistribution } from '@liteship/gauntlet';
import { parseBenchmarkSubjectDistribution } from '../../../packages/audit/src/benchmark-subject-facts.js';

const valid = {
  name: 'boundary evaluate',
  file: 'tests/bench/core.bench.ts',
  inputSize: 3,
  shape: 'boundary-thresholds',
  replicates: 5,
  subjects: [
    {
      role: 'sut' as const,
      origin: { kind: 'module' as const, specifier: '@liteship/core' },
      symbol: 'Boundary.evaluate',
      binding: 'Boundary.evaluate',
    },
  ],
  execution: { kind: 'callback' as const },
};

describe('benchmark distribution parser ownership', () => {
  it('projects byte-identical normalized records through gauntlet and audit', () => {
    expect(parseBenchmarkSubjectDistribution(valid)).toEqual(parseQualifiedBenchDistribution(valid));
    expect(parseQualifiedBenchDistribution(valid)).toEqual(valid);
  });

  it.each([
    ['foreign top-level field', { ...valid, surprise: true }],
    ['missing subject field', { ...valid, subjects: [{ ...valid.subjects[0], binding: undefined }] }],
    [
      'foreign origin field',
      {
        ...valid,
        subjects: [{ ...valid.subjects[0], origin: { ...valid.subjects[0].origin, path: 'wrong-owner' } }],
      },
    ],
    ['fractional replicate count', { ...valid, replicates: 1.5 }],
    ['zero replicate count', { ...valid, replicates: 0 }],
    ['non-positive input size', { ...valid, inputSize: 0 }],
    ['blank identity', { ...valid, name: '  ' }],
  ] as const)('refuses %s instead of normalizing it away', (_label, candidate) => {
    expect(parseQualifiedBenchDistribution(candidate)).toBeNull();
    expect(parseBenchmarkSubjectDistribution(candidate)).toBeNull();
  });

  it('round-trips the accepted module/file/intrinsic/wasm origin union deterministically', () => {
    const nonBlank = fc.string({ minLength: 1 }).filter((value) => value.trim().length > 0);
    const origin = fc.oneof(
      fc.record({ kind: fc.constant('module' as const), specifier: nonBlank }),
      fc.record({ kind: fc.constant('file' as const), path: nonBlank }),
      fc.record({ kind: fc.constant('intrinsic' as const), name: nonBlank }),
      fc.record({ kind: fc.constant('wasm' as const), crate: nonBlank }),
    );
    fc.assert(
      fc.property(origin, (generatedOrigin) => {
        const candidate = {
          ...valid,
          subjects: [{ ...valid.subjects[0], origin: generatedOrigin }],
        };
        const parsed = parseQualifiedBenchDistribution(candidate);
        expect(parsed).not.toBeNull();
        expect(JSON.stringify(parsed)).toBe(JSON.stringify(parseBenchmarkSubjectDistribution(candidate)));
      }),
      { numRuns: 100, seed: 0xb3ec },
    );
  });
});
