/** Benchmark-owner coverage derives from package and distribution truth, never a mirror. @module */

import { describe, expect, it } from 'vitest';
import { projectBenchmarkOwnerCoverage } from '../../../scripts/bench/contract-coverage.ts';
import { readDistributionRegistry, type BenchDistribution } from '../../../scripts/bench/contracts.ts';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.ts';
import { repoRoot } from '../../../vitest.shared.ts';

describe('benchmark owner coverage projection', () => {
  it('projects every canonical package exactly once and reports real uncovered runtime owners', () => {
    const registry = readDistributionRegistry(repoRoot);
    expect(registry).not.toBeNull();
    const coverage = projectBenchmarkOwnerCoverage(PACKAGE_CATALOG, registry!.distributions, []);

    expect(coverage).toHaveLength(PACKAGE_CATALOG.length);
    expect(coverage.map((entry) => entry.packageName)).toEqual([...PACKAGE_CATALOG].map((entry) => entry.name).sort());
    expect(coverage.find((entry) => entry.packageName === '@liteship/_spine')).toMatchObject({
      eligible: false,
      status: 'not-eligible',
    });
    expect(coverage.find((entry) => entry.packageName === '@liteship/core')).toMatchObject({
      eligible: true,
      status: 'covered',
    });
    expect(coverage.some((entry) => entry.status === 'uncovered')).toBe(true);
  });

  it('attributes exact package subpaths but never prefix-lookalike module names', () => {
    const core = PACKAGE_CATALOG.find((entry) => entry.name === '@liteship/core')!;
    const distribution = (specifier: string): BenchDistribution => ({
      name: `bench:${specifier}`,
      file: 'tests/bench/fixture.bench.ts',
      inputSize: 1,
      shape: 'single-call',
      replicates: 1,
      subjects: [
        {
          role: 'sut',
          origin: { kind: 'module', specifier },
          symbol: 'fixture',
          binding: 'fixture',
        },
      ],
    });

    expect(projectBenchmarkOwnerCoverage([core], [distribution('@liteship/core/harness')], [])[0]).toMatchObject({
      distributionCount: 1,
      status: 'covered',
    });
    expect(projectBenchmarkOwnerCoverage([core], [distribution('@liteship/core-ish')], [])[0]).toMatchObject({
      distributionCount: 0,
      status: 'uncovered',
    });
  });

  it('attributes a qualified file-owned subject to its package without requiring a public API expansion', () => {
    const web = PACKAGE_CATALOG.find((entry) => entry.name === '@liteship/web')!;
    const distribution: BenchDistribution = {
      name: 'web file-owned hot path',
      file: 'tests/bench/web.bench.ts',
      inputSize: 256,
      shape: 'saturated-buffer',
      replicates: 1,
      subjects: [
        {
          role: 'sut',
          origin: { kind: 'file', path: 'packages/web/src/stream/sse-pure.ts' },
          symbol: 'applyOverflow',
          binding: 'applyOverflow',
        },
      ],
    };

    expect(projectBenchmarkOwnerCoverage([web], [distribution], [])[0]).toMatchObject({
      packageName: '@liteship/web',
      distributionCount: 1,
      status: 'covered',
    });
  });
});
