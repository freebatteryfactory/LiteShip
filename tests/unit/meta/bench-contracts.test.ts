/**
 * The performance-CONTRACT library — the declared-distribution law, the
 * complexity-class fit, and the LIVE committed artifacts.
 *
 * These pin the math + the folds the gate and the bench-contracts script rest on,
 * plus the REAL committed `benchmarks/distributions.json` and
 * `benchmarks/complexity-map.json` against drift: every governed bench in
 * `tests/bench/*.bench.ts` must be declared (no undeclared, no orphan), and every
 * committed complexity-map entry must hold a recognized, well-fitted class.
 *
 * The complexity FIT is asserted as a CLASS (load-robust), never an absolute-ns
 * pin — a property test drives synthetic O(1)/O(n)/O(n²) curves and asserts the
 * fit classifies each correctly, which is hardware-independent.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COMPLEXITY_CLASSES,
  classifySlope,
  complexityRank,
  extractRegisteredBenches,
  fitComplexityClass,
  lowerEnvelopeCoefficientOfVariation,
  readComplexityMap,
  readDistributionRegistry,
  type ComplexitySample,
} from '../../../scripts/bench/contracts.ts';
import {
  foldDeclaredDistributions,
  verifyDeclaredDistributions,
  benchScriptTargets,
  distributionFilesWithoutExecutionPath,
} from '../../../scripts/bench/contract-coverage.ts';
import {
  ACCEPTED_COMPLEXITY_CEILINGS,
  COMPLEXITY_ADMISSION_POLICY,
  complexityAdmissionReasons,
} from '../../../packages/gauntlet/src/gates/performance-contracts.ts';
import { verifyMeasuredComplexityMap } from '../../../scripts/bench-contracts.ts';
import { commentsBlanked } from '../../../packages/gauntlet/src/gates/code-only.ts';
import { qualifyBenchDistribution } from '../../../packages/audit/src/benchmark-subject-facts.ts';
import { repoRoot } from '../../../vitest.shared.ts';

describe('extractRegisteredBenches — the bench-name fold', () => {
  it('extracts tinybench bench.add() and vitest bench() registrations', () => {
    const src = "const bench = new Bench();\nbench.add('alpha', () => {});\nbench('beta', () => {});\n";
    const names = extractRegisteredBenches(src).map((b) => b.name);
    expect(names).toEqual(['alpha', 'beta']);
  });

  it('does NOT extract a nested helper call (tree.add / store.set are not bench)', () => {
    const src = "bench.add('real', () => {\n  tree.add('a', x, 1);\n  store.set('id', 2);\n});\n";
    const names = extractRegisteredBenches(src).map((b) => b.name);
    expect(names).toEqual(['real']);
  });

  it('a commented-out registration vanishes once comments are blanked', () => {
    const src = "bench.add('live', () => {});\n// bench.add('disabled', () => {});\n";
    const names = extractRegisteredBenches(commentsBlanked(src)).map((b) => b.name);
    expect(names).toEqual(['live']);
  });
});

describe('fitComplexityClass — the log-log slope fit (a CLASS verdict, not an ns pin)', () => {
  function curve(coefficient: number, exponent: number, sizes: readonly number[]): ComplexitySample[] {
    return sizes.map((size) => ({ size, latencyNs: coefficient * size ** exponent }));
  }
  const sizes = [8, 32, 128, 512, 2048];

  it('classifies a constant curve as O(1)', () => {
    expect(fitComplexityClass(curve(100, 0, sizes)).class).toBe('O(1)');
  });

  it('classifies a linear curve as O(n)', () => {
    const fit = fitComplexityClass(curve(5, 1, sizes));
    expect(fit.class).toBe('O(n)');
    expect(fit.slope).toBeCloseTo(1, 1);
    expect(fit.r2).toBeGreaterThan(0.99);
  });

  it('classifies a quadratic curve as O(n^2)', () => {
    expect(fitComplexityClass(curve(0.1, 2, sizes)).class).toBe('O(n^2)');
  });

  it('rejects a degenerate input (fewer than two distinct sizes) — fails LOUD', () => {
    expect(() => fitComplexityClass([{ size: 10, latencyNs: 5 }])).toThrow(/fitComplexityClass/);
    expect(() =>
      fitComplexityClass([
        { size: 10, latencyNs: 5 },
        { size: 10, latencyNs: 6 },
      ]),
    ).toThrow();
  });

  it('PROPERTY: a pure power-law curve k·n^e classifies by its exponent e (load-robust)', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 500, noNaN: true }), fc.constantFrom(0, 1, 2), (k, e) => {
        const fit = fitComplexityClass(curve(k, e, sizes));
        const expected = e === 0 ? 'O(1)' : e === 1 ? 'O(n)' : 'O(n^2)';
        // The fit recovers the exponent the curve was generated from — the slope
        // is a ratio (scale-free), so the coefficient k never changes the class.
        return fit.class === expected;
      }),
      { numRuns: 200 },
    );
  });
});

describe('classifySlope — wide bands keep the verdict load-robust', () => {
  it('centres O(n) on slope 1 with wide margins on both sides (jitter-safe)', () => {
    expect(classifySlope(0.8)).toBe('O(n)');
    expect(classifySlope(1.0)).toBe('O(n)');
    expect(classifySlope(1.3)).toBe('O(n)');
  });

  it('never lets linear jitter cross into O(n^2)', () => {
    // The whole plausible-jitter band around slope 1 stays O(n); only a real
    // quadratic (slope ~2) lands past 1.70.
    for (const slope of [0.75, 0.9, 1.1, 1.35]) {
      expect(complexityRank(classifySlope(slope))).toBe(complexityRank('O(n)'));
    }
    expect(classifySlope(2.0)).toBe('O(n^2)');
  });

  it('the script ladder and the gate ceilings agree on the class ordering', () => {
    // The gate duplicates the ladder (lean — no script import); pin them in sync.
    expect([...COMPLEXITY_CLASSES]).toEqual(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)']);
    for (const ceiling of Object.values(ACCEPTED_COMPLEXITY_CEILINGS)) {
      expect(COMPLEXITY_CLASSES).toContain(ceiling);
    }
  });
});

describe('lower-envelope variance — uncertainty matches the best-of-k estimator', () => {
  it('ignores unrelated additive stalls but retains instability in the attainable floor', () => {
    expect(lowerEnvelopeCoefficientOfVariation([100, 101, 99, 102, 10_000, 20_000, 30_000])).toBeLessThan(0.02);
    expect(lowerEnvelopeCoefficientOfVariation([100, 140, 190, 260, 10_000, 20_000, 30_000])).toBeGreaterThan(0.25);
  });

  it('PROPERTY: coefficient of variation is invariant under positive machine-speed scaling', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 1, max: 1_000_000, noNaN: true }), { minLength: 2, maxLength: 20 }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (samples, scale) => {
          const baseline = lowerEnvelopeCoefficientOfVariation(samples);
          const scaled = lowerEnvelopeCoefficientOfVariation(samples.map((sample) => sample * scale));
          return Math.abs(baseline - scaled) <= 1e-10;
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('live complexity producer self-proof', () => {
  const entry = (path: string, klass: (typeof COMPLEXITY_CLASSES)[number], fittedR2 = 0.99) => ({
    path,
    describe: path,
    shape: 'fixture',
    sizes: [8, 16, 32, 64, 128],
    class: klass,
    fittedSlope: klass === 'O(n^2)' ? 2 : 1,
    fittedR2,
    coefficientOfVariation: 0.03,
    measurement: { innerIterations: 10, replicates: 7, warmupIterations: 2 },
  });

  it('accepts complete, trustworthy measurements at their ceilings', () => {
    expect(
      verifyMeasuredComplexityMap({
        schemaVersion: 2,
        entries: Object.entries(ACCEPTED_COMPLEXITY_CEILINGS).map(([path, klass]) => entry(path, klass)),
      }),
    ).toEqual([]);
  });

  it('reds on missing, noisy, and complexity-regressed live evidence', () => {
    const paths = Object.keys(ACCEPTED_COMPLEXITY_CEILINGS);
    const reasons = verifyMeasuredComplexityMap({
      schemaVersion: 2,
      entries: [entry(paths[0]!, 'O(n^2)', 0.1)],
    }).map((issue) => issue.reason);
    expect(reasons.filter((reason) => reason === 'class-regression')).toHaveLength(1);
    expect(reasons.filter((reason) => reason === 'low-r2')).toHaveLength(1);
    expect(reasons.filter((reason) => reason === 'missing')).toHaveLength(paths.length - 1);
  });

  it('reds each independent claim-bearing admission defect', () => {
    const path = Object.keys(ACCEPTED_COMPLEXITY_CEILINGS)[0]!;
    const baseline = entry(path, 'O(n)');
    const cases = [
      [{ ...baseline, sizes: [8, 16, 32, 64] }, 'insufficient-size-sweep'],
      [{ ...baseline, sizes: [8, 16, 24, 48, 96] }, 'invalid-size-sweep'],
      [{ ...baseline, measurement: { ...baseline.measurement, replicates: 6 } }, 'under-replicated'],
      [{ ...baseline, fittedR2: 0.8999 }, 'low-r2'],
      [{ ...baseline, coefficientOfVariation: 0.2501 }, 'unstable-variance'],
    ] as const;

    for (const [candidate, expected] of cases) {
      const issues = verifyMeasuredComplexityMap({ schemaVersion: 2, entries: [candidate] });
      expect(
        issues.map((issue) => issue.reason),
        expected,
      ).toContain(expected);
    }
  });

  it('PROPERTY: admission is monotone when evidence is strengthened', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: COMPLEXITY_ADMISSION_POLICY.minimumSizes, max: 9 }),
        fc.integer({ min: COMPLEXITY_ADMISSION_POLICY.minimumReplicatesPerSize, max: 20 }),
        fc.double({ min: COMPLEXITY_ADMISSION_POLICY.minimumR2, max: 1, noNaN: true }),
        fc.double({ min: 0, max: COMPLEXITY_ADMISSION_POLICY.maximumCoefficientOfVariation, noNaN: true }),
        (sizeCount, replicates, fittedR2, coefficientOfVariation) => {
          const sizes = Array.from({ length: sizeCount }, (_, index) => 8 * 2 ** index);
          return (
            complexityAdmissionReasons({ sizes, replicates, fittedR2, coefficientOfVariation }).length === 0 &&
            complexityAdmissionReasons({
              sizes: [...sizes, sizes.at(-1)! * 2],
              replicates: replicates + 1,
              fittedR2: Math.min(1, fittedR2 + 0.01),
              coefficientOfVariation: Math.max(0, coefficientOfVariation - 0.01),
            }).length === 0
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('foldDeclaredDistributions — the headline-law cross-check', () => {
  it('reports no issues when declarations and registrations match exactly', () => {
    const sources = new Map([
      ['tests/bench/x.bench.ts', "import { fastPath } from '@liteship/x';\nbench.add('a', () => fastPath());\n"],
    ]);
    const result = foldDeclaredDistributions(sources, [
      {
        name: 'a',
        file: 'tests/bench/x.bench.ts',
        inputSize: 1,
        shape: 'single-call',
        replicates: 1,
        subjects: [
          {
            role: 'sut',
            origin: { kind: 'module', specifier: '@liteship/x' },
            symbol: 'fastPath',
            binding: 'fastPath',
          },
        ],
      },
    ]);
    expect(result.issues).toHaveLength(0);
    expect(result.discoveredBenchCount).toBe(1);
  });

  it('reports UNDECLARED and ORPHAN in their respective directions', () => {
    const sources = new Map([
      [
        'tests/bench/x.bench.ts',
        "import { fastPath } from '@liteship/x';\nbench.add('a', () => fastPath());\nbench.add('b', () => {});\n",
      ],
    ]);
    const result = foldDeclaredDistributions(sources, [
      {
        name: 'a',
        file: 'tests/bench/x.bench.ts',
        inputSize: 1,
        shape: 's',
        replicates: 1,
        subjects: [
          {
            role: 'sut',
            origin: { kind: 'module', specifier: '@liteship/x' },
            symbol: 'fastPath',
            binding: 'fastPath',
          },
        ],
      },
      {
        name: 'gone',
        file: 'tests/bench/x.bench.ts',
        inputSize: 1,
        shape: 's',
        replicates: 1,
        subjects: [
          {
            role: 'sut',
            origin: { kind: 'module', specifier: '@liteship/x' },
            symbol: 'fastPath',
            binding: 'fastPath',
          },
        ],
      },
    ]);
    expect(result.issues.filter((i) => i.kind === 'undeclared').map((i) => i.name)).toEqual(['b']);
    expect(result.issues.filter((i) => i.kind === 'orphan').map((i) => i.name)).toEqual(['gone']);
  });
});

describe('benchmark subject qualification — measured implementation, not names', () => {
  const distribution = {
    name: 'fastPath -- wrapper',
    file: 'tests/bench/x.bench.ts',
    inputSize: 1,
    shape: 'single-call',
    replicates: 1,
    subjects: [
      {
        role: 'sut' as const,
        origin: { kind: 'module' as const, specifier: '@liteship/x' },
        symbol: 'fastPath',
        binding: 'fastPath',
      },
    ],
  };

  it('follows a bounded same-file wrapper to the imported SUT', () => {
    const source =
      "import { fastPath } from '@liteship/x';\nfunction runFast(){ return fastPath(); }\nbench.add('fastPath -- wrapper', () => runFast());\n";
    expect(qualifyBenchDistribution(distribution, () => source)).toMatchObject({
      issues: [],
      qualifyingSutSubjects: [{ symbol: 'fastPath' }],
    });
  });

  it('traces a destructured product returned by an imported factory to its module owner', () => {
    const factoryDistribution = {
      ...distribution,
      name: 'pair -- push and pop',
      subjects: [
        {
          role: 'sut' as const,
          origin: { kind: 'module' as const, specifier: '@liteship/x' },
          symbol: 'Factory.createPair().producer.push',
          binding: 'producer.push',
        },
        {
          role: 'sut' as const,
          origin: { kind: 'module' as const, specifier: '@liteship/x' },
          symbol: 'Factory.createPair().consumer.pop',
          binding: 'consumer.pop',
        },
      ],
    };
    const source =
      "import { Factory } from '@liteship/x';\nconst { producer, consumer } = Factory.createPair();\nbench.add('pair -- push and pop', () => { producer.push(1); consumer.pop(); });\n";
    expect(qualifyBenchDistribution(factoryDistribution, () => source)).toMatchObject({
      issues: [],
      qualifyingSutSubjects: [
        { symbol: 'Factory.createPair().producer.push' },
        { symbol: 'Factory.createPair().consumer.pop' },
      ],
    });
  });

  it('rejects a comment/reference mention when the callback invokes no SUT', () => {
    const source =
      "import { fastPath } from '@liteship/x';\nbench.add('fastPath -- wrapper', () => { void fastPath; /* fastPath() */ });\n";
    expect(qualifyBenchDistribution(distribution, () => source).issues.map((issue) => issue.kind)).toContain(
      'uninvoked-subject',
    );
  });
});

describe('LIVE committed artifacts — the real registry + map, pinned against drift', () => {
  it('benchmarks/distributions.json declares every governed bench with no orphans', () => {
    const registry = readDistributionRegistry(repoRoot);
    expect(registry).not.toBeNull();
    const result = verifyDeclaredDistributions(repoRoot, registry!.distributions);
    // The committed registry MUST be in sync with the real benches — every bench
    // declared, no stale declaration. A drift here means a bench shipped an
    // uncomparable number (undeclared) or a declaration silently rotted (orphan).
    expect(result.issues).toEqual([]);
    expect(result.discoveredBenchCount).toBeGreaterThan(0);
  });

  it('benchmarks/distributions.json — every declared file is executed by pnpm bench or generated benches', () => {
    const registry = readDistributionRegistry(repoRoot);
    expect(registry).not.toBeNull();
    const uncovered = distributionFilesWithoutExecutionPath(registry!.distributions, benchScriptTargets(repoRoot));
    expect(uncovered, `distribution files without bench execution path: ${uncovered.join(', ')}`).toEqual([]);
  });

  it('Stage render and Remotion frame projection have declared, SUT-reachable throughput contracts', () => {
    const registry = readDistributionRegistry(repoRoot)!;
    const names = ['Stage exportVideo -- 32 components x 4 frames', 'Remotion cssVarsFromState -- 1024 frame outputs'];
    const declared = registry.distributions.filter((entry) => names.includes(entry.name));
    const source = readFileSync(join(repoRoot, 'tests/bench/video.bench.ts'), 'utf8');

    expect(declared.map((entry) => entry.name).sort()).toEqual([...names].sort());
    expect(declared.map((entry) => entry.shape).sort()).toEqual(
      ['frame-component-projections', 'frame-css-outputs'].sort(),
    );
    for (const entry of declared) {
      expect(qualifyBenchDistribution(entry, () => source).issues).toEqual([]);
    }
  });

  it('benchmarks/complexity-map.json holds a recognized, well-fitted class per ceiling-pinned path', () => {
    const map = readComplexityMap(repoRoot);
    expect(map).not.toBeNull();
    const byPath = new Map(map!.entries.map((e) => [e.path, e]));
    for (const [path, ceiling] of Object.entries(ACCEPTED_COMPLEXITY_CEILINGS)) {
      const entry = byPath.get(path);
      expect(entry, `complexity map must contain ceiling-pinned path ${path}`).toBeDefined();
      // The committed class is at or below its ceiling (no committed regression).
      expect(complexityRank(entry!.class as (typeof COMPLEXITY_CLASSES)[number])).toBeLessThanOrEqual(
        complexityRank(ceiling),
      );
      // The fit is trustworthy (well above the gate's R² floor).
      expect(
        complexityAdmissionReasons({
          sizes: entry!.sizes,
          replicates: entry!.measurement.replicates,
          fittedR2: entry!.fittedR2,
          coefficientOfVariation: entry!.coefficientOfVariation,
        }),
        path,
      ).toEqual([]);
    }
  });
});
