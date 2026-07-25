import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ACCEPTED_ALLOCATION_CEILINGS } from '../../../packages/gauntlet/src/gates/performance-contracts.js';
import {
  verifyMeasuredAllocationMap,
  type AllocationMap,
  type AllocationMapEntry,
} from '../../../scripts/allocation-contracts.js';
import { fitGrowthClass } from '../../../scripts/bench/contracts.js';
import { measureRetainedAllocationCurve } from '../../../scripts/bench/allocation-curves.js';
import { repoRoot } from '../../../vitest.shared.js';

function entry(path: string, klass: AllocationMapEntry['class'], fittedR2 = 0.99): AllocationMapEntry {
  return {
    path,
    describe: path,
    shape: 'fixture',
    sizes: [8, 16],
    repetitions: 1,
    samples: [
      { size: 8, retainedBytesPerOperation: 8 },
      { size: 16, retainedBytesPerOperation: 16 },
    ],
    class: klass,
    fittedSlope: klass === 'O(n^2)' ? 2 : 1,
    fittedR2,
  };
}

function map(entries: readonly AllocationMapEntry[]): AllocationMap {
  return { schemaVersion: 1, entries };
}

describe('retained-allocation contract producer', () => {
  it('classifies deterministic linear and planted quadratic growth independently of wall time', () => {
    expect(
      fitGrowthClass([
        { size: 8, cost: 80 },
        { size: 16, cost: 160 },
        { size: 32, cost: 320 },
      ]).class,
    ).toBe('O(n)');
    expect(
      fitGrowthClass([
        { size: 8, cost: 64 },
        { size: 16, cost: 256 },
        { size: 32, cost: 1024 },
      ]).class,
    ).toBe('O(n^2)');
  });

  it('accepts a complete map at its ceilings', () => {
    expect(
      verifyMeasuredAllocationMap(
        map(Object.entries(ACCEPTED_ALLOCATION_CEILINGS).map(([path, ceiling]) => entry(path, ceiling))),
      ),
    ).toEqual([]);
  });

  it('rejects quadratic, noisy, and missing retained-allocation evidence', () => {
    const paths = Object.keys(ACCEPTED_ALLOCATION_CEILINGS);
    const issues = verifyMeasuredAllocationMap(map([entry(paths[0]!, 'O(n^2)', 0.1)]));
    expect(issues.filter((issue) => issue.reason === 'class-regression')).toHaveLength(1);
    expect(issues.filter((issue) => issue.reason === 'noisy-fit')).toHaveLength(1);
    expect(issues.filter((issue) => issue.reason === 'missing')).toHaveLength(paths.length - 1);
  });

  it('measures through the injected retained-memory authority', () => {
    let retainedBytes = 0;
    const curve = measureRetainedAllocationCurve(
      {
        path: 'fixture.linear',
        describe: 'fixture',
        shape: 'elements',
        sizes: [8, 16, 32],
        repetitions: 4,
        operationFor: (size) => () => {
          retainedBytes += size;
          return { size };
        },
      },
      { collect: () => undefined, retainedBytes: () => retainedBytes },
    );
    expect(curve.fit.class).toBe('O(n)');
    expect(curve.samples.map((sample) => sample.retainedBytesPerOperation)).toEqual([8, 16, 32]);
  });

  it('uses exact retained output bytes when the SUT exposes them', () => {
    const curve = measureRetainedAllocationCurve({
      path: 'fixture.bytes',
      describe: 'fixture',
      shape: 'bytes',
      sizes: [8, 16, 32],
      repetitions: 2,
      operationFor: (size) => () => new Uint8Array(size),
      retainedSizeOf: (result) => (result as Uint8Array).byteLength,
    });
    expect(curve.fit.class).toBe('O(n)');
    expect(curve.samples.map((sample) => sample.retainedBytesPerOperation)).toEqual([8, 16, 32]);
  });

  it('the committed allocation map is complete and currently within contract', () => {
    const committed = JSON.parse(readFileSync(`${repoRoot}/benchmarks/allocation-map.json`, 'utf8')) as AllocationMap;
    expect(verifyMeasuredAllocationMap(committed)).toEqual([]);
    expect(committed.entries.map((entry) => entry.path).sort()).toEqual(
      Object.keys(ACCEPTED_ALLOCATION_CEILINGS).sort(),
    );
  });
});
