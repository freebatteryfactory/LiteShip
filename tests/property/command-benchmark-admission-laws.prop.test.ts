/**
 * Command benchmark admission is a relation between the public module subject,
 * the literal measured callback, the declared distribution, and fresh addressed
 * evidence. A benchmark-shaped file alone earns no command assurance.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  COMMAND_CATALOG,
  createCommandRegistry,
  type CapsuleCommandDescriptor,
  type RegisteredCommand,
} from '@liteship/command';
import type { IntegrityDigest } from '@liteship/canonical';
import { qualifyBenchDistribution } from '../../packages/audit/src/benchmark-subject-facts.js';
import { COMPLEXITY_ADMISSION_POLICY } from '../../packages/gauntlet/src/gates/performance-contracts.js';
import type { QualifiedBenchDistribution } from '../../packages/gauntlet/src/gates/bench-subjects.js';
import {
  admitBenchmarkEvidence,
  createBenchmarkEvidence,
  fitGrowthClass,
  readDistributionRegistry,
  type BenchmarkEvidence,
  type BenchmarkEvidenceAuthority,
  type BenchmarkEvidenceInput,
} from '../../scripts/bench/contracts.js';
import { benchScriptTargets } from '../../scripts/bench/contract-coverage.js';
import { repoRoot } from '../../vitest.shared.js';

const BENCH_FILE = 'tests/bench/command.bench.ts';
const COMMAND_BENCH_NAMES = [
  'command planChecks -- release profile',
  'command registry construction -- full catalog',
  'command cache identity -- structured inputs',
] as const;
const SOURCE_SHA = 'c'.repeat(40);
const ENVIRONMENT_DIGEST = `sha256:${'e'.repeat(64)}` as IntegrityDigest;

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

function sha256(text: string): IntegrityDigest {
  return `sha256:${createHash('sha256').update(text).digest('hex')}` as IntegrityDigest;
}

function liveCommandDistributions(): readonly QualifiedBenchDistribution[] {
  const registry = readDistributionRegistry(repoRoot);
  if (registry === null) throw new TypeError('benchmark distribution registry must parse');
  return registry.distributions.filter((entry) => COMMAND_BENCH_NAMES.includes(entry.name as never));
}

function benchmarkWorkspaceModules(): readonly string[] {
  const registry = readDistributionRegistry(repoRoot);
  if (registry === null) throw new TypeError('benchmark distribution registry must parse');
  const executed = new Set(benchScriptTargets(repoRoot));
  return [
    ...new Set(
      registry.distributions
        .filter((entry) => executed.has(entry.file))
        .flatMap((entry) => entry.subjects)
        .flatMap((subject) => {
          if (subject.origin.kind !== 'module' || !subject.origin.specifier.startsWith('@liteship/')) return [];
          return [subject.origin.specifier.split('/').slice(0, 2).join('/')];
        }),
    ),
  ].sort();
}

function missingBenchmarkHostDependencies(
  manifest: Readonly<{
    dependencies?: Readonly<Record<string, string>>;
    devDependencies?: Readonly<Record<string, string>>;
  }>,
): readonly string[] {
  const installed = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]);
  return benchmarkWorkspaceModules().filter((specifier) => !installed.has(specifier));
}

function authority(evidence: BenchmarkEvidence): BenchmarkEvidenceAuthority {
  return {
    sourceSha: evidence.environment.sourceSha,
    sourceDigest: evidence.environment.sourceDigest,
    environmentDigest: evidence.environment.environmentDigest,
    toolchain: evidence.environment.toolchain,
  };
}

function commandEvidence(overrides: Partial<BenchmarkEvidenceInput> = {}): BenchmarkEvidence {
  const input: BenchmarkEvidenceInput = {
    sut: {
      id: 'command.registry.construct',
      owner: '@liteship/command',
      benchmark: 'command registry construction -- full catalog',
      file: BENCH_FILE,
    },
    input: {
      dimensions: [
        {
          name: 'command-count',
          unit: 'descriptors',
          distribution: 'geometric-catalog-size-sweep',
        },
      ],
      sizes: [16, 32, 64, 128, 256],
    },
    measurement: {
      mode: 'warm',
      warmupIterations: 10,
      repetitions: 7,
      canaries: [{ id: 'public-module-subject-reached', verdict: 'pass' }],
    },
    environment: {
      sourceSha: SOURCE_SHA,
      sourceDigest: sha256(source(BENCH_FILE)),
      environmentDigest: ENVIRONMENT_DIGEST,
      platform: 'test',
      arch: 'deterministic',
      runtime: 'vitest',
      toolchain: 'typescript-parser-qualified',
    },
    complexity: {
      expected: 'O(n log n)',
      measured: 'O(n log n)',
      fittedSlope: 1.5,
      fittedR2: 0.99,
    },
    allocation: null,
    confidence: {
      minimumR2: COMPLEXITY_ADMISSION_POLICY.minimumR2,
      coefficientOfVariation: 0.04,
      maximumCoefficientOfVariation: COMPLEXITY_ADMISSION_POLICY.maximumCoefficientOfVariation,
    },
  };
  return createBenchmarkEvidence({ ...input, ...overrides });
}

function descriptor(name: string): CapsuleCommandDescriptor {
  return {
    name,
    summary: `model command ${name}`,
    inputSchema: { type: 'object', properties: {} },
  };
}

function commands(names: readonly string[]): readonly RegisteredCommand[] {
  return names.map((name) => ({ descriptor: descriptor(name) }));
}

function measuredNameReads(size: number): number {
  let reads = 0;
  const entries: RegisteredCommand[] = Array.from({ length: size }, (_, index) => {
    const stable = `command-${String(size - index).padStart(6, '0')}`;
    const candidate = {
      summary: `instrumented ${stable}`,
      inputSchema: { type: 'object' as const, properties: {} },
      get name(): string {
        reads += 1;
        return stable;
      },
    };
    return { descriptor: candidate };
  });
  const registry = createCommandRegistry(entries);
  expect(registry.list()).toHaveLength(size);
  return reads;
}

describe('command benchmark admission laws', () => {
  it('admits every live command benchmark through the public @liteship/command module', () => {
    const distributions = liveCommandDistributions();
    expect(distributions.map((entry) => entry.name).sort()).toEqual([...COMMAND_BENCH_NAMES].sort());

    for (const distribution of distributions) {
      const qualification = qualifyBenchDistribution(distribution, source);
      expect(qualification.issues).toEqual([]);
      expect(qualification.qualifyingSutSubjects).not.toHaveLength(0);
      if (distribution.name !== 'command cache identity -- structured inputs') {
        expect(qualification.qualifyingSutSubjects).toContainEqual(
          expect.objectContaining({
            role: 'sut',
            origin: { kind: 'module', specifier: '@liteship/command' },
          }),
        );
      }
    }
  });

  it('declares every executed workspace benchmark subject in the private benchmark host', () => {
    const manifest = JSON.parse(source('package.json')) as {
      dependencies?: Readonly<Record<string, string>>;
      devDependencies?: Readonly<Record<string, string>>;
    };
    expect(missingBenchmarkHostDependencies(manifest)).toEqual([]);
    const modules = benchmarkWorkspaceModules();
    expect(modules).not.toHaveLength(0);

    fc.assert(
      fc.property(fc.constantFrom(...(modules as [string, ...string[]])), (removed) => {
        const dependencies = { ...manifest.dependencies };
        const devDependencies = { ...manifest.devDependencies };
        delete dependencies[removed];
        delete devDependencies[removed];
        expect(missingBenchmarkHostDependencies({ dependencies, devDependencies })).toContain(removed);
      }),
      { seed: 0xbe_4c_4d_05, numRuns: modules.length * 2 },
    );
  });

  it('rejects a declared public subject when the measured callback stops invoking it', () => {
    const distribution = liveCommandDistributions().find(
      (entry) => entry.name === 'command registry construction -- full catalog',
    )!;
    const uninvokedFixture = [
      "import { createCommandRegistry } from '@liteship/command';",
      "bench.add('command registry construction -- full catalog', () => commands.length);",
      'void createCommandRegistry;',
    ].join('\n');
    const qualification = qualifyBenchDistribution(distribution, (path) =>
      path === BENCH_FILE ? uninvokedFixture : source(path),
    );
    expect(qualification.issues).toContainEqual(expect.objectContaining({ kind: 'uninvoked-subject' }));
    expect(qualification.qualifyingSutSubjects).toEqual([]);
  });

  it('rejects a file-origin ownership claim even when the callback calls the same binding', () => {
    const distribution = liveCommandDistributions().find(
      (entry) => entry.name === 'command planChecks -- release profile',
    )!;
    const wrongOrigin: QualifiedBenchDistribution = {
      ...distribution,
      subjects: distribution.subjects.map((subject) => ({
        ...subject,
        origin: { kind: 'file' as const, path: 'packages/command/src/checks/plan.ts' },
      })),
    };
    expect(qualifyBenchDistribution(wrongOrigin, source).issues).toContainEqual(
      expect.objectContaining({ kind: 'wrong-origin' }),
    );
  });

  it('keeps registry lookup and sorted listing equivalent to a Map model under arbitrary insertion order', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z][a-z0-9.-]{0,24}$/u), {
          minLength: 1,
          maxLength: 96,
        }),
        fc.integer(),
        (names, rotation) => {
          const offset = ((rotation % names.length) + names.length) % names.length;
          const ordered = [...names.slice(offset), ...names.slice(0, offset)];
          const registry = createCommandRegistry(commands(ordered));
          const model = new Map(ordered.map((name) => [name, descriptor(name)]));

          expect(registry.list().map((entry) => entry.name)).toEqual([...model.keys()].sort());
          for (const name of names) expect(registry.get(name)?.descriptor.name).toBe(name);
          expect(registry.get('not-in-the-model')).toBeUndefined();
        },
      ),
      { seed: 0xc0_4d_4e_44, numRuns: 120 },
    );
  });

  it('refuses duplicate command identity independently of where the duplicate appears', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z][a-z0-9-]{0,16}$/u), { minLength: 2, maxLength: 48 }),
        fc.nat(),
        (names, position) => {
          const duplicate = names[position % names.length]!;
          const insertion = position % (names.length + 1);
          const planted = [...names.slice(0, insertion), duplicate, ...names.slice(insertion)];
          expect(() => createCommandRegistry(commands(planted))).toThrow(/duplicate command name/u);
        },
      ),
      { seed: 0xd0_01_1c_47, numRuns: 100 },
    );
  });

  it('bounds registry construction name work by n log n and records a well-fitted growth curve', () => {
    const sizes = [16, 32, 64, 128, 256];
    const samples = sizes.map((size) => {
      const reads = measuredNameReads(size);
      const ceiling = size + 4 * size * Math.ceil(Math.log2(size));
      expect(reads).toBeLessThanOrEqual(ceiling);
      return { size, cost: reads };
    });
    const fit = fitGrowthClass(samples);
    expect(['O(n)', 'O(n log n)']).toContain(fit.class);
    expect(fit.r2).toBeGreaterThanOrEqual(COMPLEXITY_ADMISSION_POLICY.minimumR2);
  });

  it('admits only the complete five-size, seven-replicate, fresh-source command receipt', () => {
    const evidence = commandEvidence();
    expect(evidence.input.sizes).toHaveLength(COMPLEXITY_ADMISSION_POLICY.minimumSizes);
    expect(evidence.measurement.repetitions).toBe(COMPLEXITY_ADMISSION_POLICY.minimumReplicatesPerSize);
    expect(evidence.admission).toEqual({ disposition: 'pass', reasons: [] });
    expect(admitBenchmarkEvidence(evidence, authority(evidence))).toEqual(evidence.admission);

    const thin = commandEvidence({ input: { ...evidence.input, sizes: [16, 32, 64, 128] } });
    expect(thin.admission).toEqual({ disposition: 'unknown', reasons: ['insufficient-size-sweep'] });
    const underReplicated = commandEvidence({
      measurement: { ...evidence.measurement, repetitions: 6 },
    });
    expect(underReplicated.admission).toEqual({ disposition: 'unknown', reasons: ['under-replicated'] });
  });

  it('makes source-byte drift and a worse complexity class loud instead of retaining a pass', () => {
    const evidence = commandEvidence();
    expect(
      admitBenchmarkEvidence(evidence, {
        ...authority(evidence),
        sourceDigest: sha256(`${source(BENCH_FILE)}\n// changed`),
      }),
    ).toEqual({ disposition: 'unknown', reasons: ['stale-source-digest'] });

    const regressed = commandEvidence({
      complexity: { expected: 'O(n log n)', measured: 'O(n^2)', fittedSlope: 2, fittedR2: 0.99 },
    });
    expect(regressed.admission).toEqual({ disposition: 'fail', reasons: ['complexity-regression'] });
  });

  it('keeps the benchmarked catalog subject identical to the live catalog census', () => {
    const distribution = liveCommandDistributions().find(
      (entry) => entry.name === 'command registry construction -- full catalog',
    )!;
    expect(distribution.inputSize).toBe(COMMAND_CATALOG.length);
    expect(new Set(COMMAND_CATALOG.map((entry) => entry.name)).size).toBe(COMMAND_CATALOG.length);
  });
});
