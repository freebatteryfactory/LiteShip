/**
 * The CLI benchmark measures the one public `run()` entrypoint. Its receipt is
 * admitted only when that callback remains reachable, its package owner is the
 * public module (never `src/internal`), and its source identity is current.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IntegrityDigest } from '@liteship/canonical';
import { run } from '@liteship/cli';
import { qualifyBenchDistribution } from '../../packages/audit/src/benchmark-subject-facts.js';
import { COMPLEXITY_ADMISSION_POLICY } from '../../packages/gauntlet/src/gates/performance-contracts.js';
import type { QualifiedBenchDistribution } from '../../packages/gauntlet/src/gates/bench-subjects.js';
import { HELP_TEXT } from '../../packages/cli/src/commands/help.js';
import {
  admitBenchmarkEvidence,
  createBenchmarkEvidence,
  readDistributionRegistry,
  type BenchmarkEvidence,
  type BenchmarkEvidenceAuthority,
  type BenchmarkEvidenceInput,
} from '../../scripts/bench/contracts.js';
import { projectBenchmarkOwnerCoverage } from '../../scripts/bench/contract-coverage.js';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { repoRoot } from '../../vitest.shared.js';

const BENCH_FILE = 'tests/bench/command.bench.ts';
const CLI_BENCH_NAME = 'cli run -- public help projection';
const SOURCE_SHA = 'a'.repeat(40);
const ENVIRONMENT_DIGEST = `sha256:${'d'.repeat(64)}` as IntegrityDigest;

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

function sha256(text: string): IntegrityDigest {
  return `sha256:${createHash('sha256').update(text).digest('hex')}` as IntegrityDigest;
}

function distributionRegistry() {
  const registry = readDistributionRegistry(repoRoot);
  if (registry === null) throw new TypeError('benchmark distribution registry must parse');
  return registry;
}

function cliDistribution(): QualifiedBenchDistribution {
  const distribution = distributionRegistry().distributions.find((entry) => entry.name === CLI_BENCH_NAME);
  if (distribution === undefined) throw new TypeError(`${CLI_BENCH_NAME} distribution is missing`);
  return distribution;
}

function authority(evidence: BenchmarkEvidence): BenchmarkEvidenceAuthority {
  return {
    sourceSha: evidence.environment.sourceSha,
    sourceDigest: evidence.environment.sourceDigest,
    environmentDigest: evidence.environment.environmentDigest,
    toolchain: evidence.environment.toolchain,
  };
}

function cliEvidence(overrides: Partial<BenchmarkEvidenceInput> = {}): BenchmarkEvidence {
  const input: BenchmarkEvidenceInput = {
    sut: {
      id: 'cli.run.help-projection',
      owner: '@liteship/cli',
      benchmark: CLI_BENCH_NAME,
      file: BENCH_FILE,
    },
    input: {
      dimensions: [
        {
          name: 'catalog-command-count',
          unit: 'descriptors',
          distribution: 'geometric-projection-size-sweep',
        },
      ],
      sizes: [8, 16, 32, 64, 128],
    },
    measurement: {
      mode: 'warm',
      warmupIterations: 10,
      repetitions: 7,
      canaries: [{ id: 'public-run-callback-invoked', verdict: 'pass' }],
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
      expected: 'O(n)',
      measured: 'O(n)',
      fittedSlope: 1,
      fittedR2: 0.99,
    },
    allocation: null,
    confidence: {
      minimumR2: COMPLEXITY_ADMISSION_POLICY.minimumR2,
      coefficientOfVariation: 0.05,
      maximumCoefficientOfVariation: COMPLEXITY_ADMISSION_POLICY.maximumCoefficientOfVariation,
      minimumObservedBatchDurationMs: COMPLEXITY_ADMISSION_POLICY.calibrationTargetBatchDurationMs,
      minimumTimedBatchDurationMs: COMPLEXITY_ADMISSION_POLICY.minimumTimedBatchDurationMs,
    },
  };
  return createBenchmarkEvidence({ ...input, ...overrides });
}

async function capturePublicRun(argv: readonly string[]): Promise<{
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  let stdout = '';
  let stderr = '';
  const out = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    stdout += String(chunk);
    return true;
  }) as typeof process.stdout.write);
  const err = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    stderr += String(chunk);
    return true;
  }) as typeof process.stderr.write);
  try {
    return { code: await run(argv), stdout, stderr };
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
}

afterEach(() => vi.restoreAllMocks());

describe('CLI benchmark admission laws', () => {
  it('qualifies the measured callback as the public @liteship/cli run subject', () => {
    const distribution = cliDistribution();
    const qualification = qualifyBenchDistribution(distribution, source);
    expect(qualification.issues).toEqual([]);
    expect(qualification.qualifyingSutSubjects).toEqual([
      {
        role: 'sut',
        origin: { kind: 'module', specifier: '@liteship/cli' },
        symbol: 'run',
        binding: 'run',
      },
    ]);
  });

  it('rejects the benchmark if the public run call disappears from the measured callback', () => {
    const uninvokedFixture = [
      "import { run } from '@liteship/cli';",
      "bench.add('cli run -- public help projection', async () => Promise.resolve(0));",
      'void run;',
    ].join('\n');
    const qualification = qualifyBenchDistribution(cliDistribution(), (path) =>
      path === BENCH_FILE ? uninvokedFixture : source(path),
    );
    expect(qualification.issues).toContainEqual(expect.objectContaining({ kind: 'uninvoked-subject' }));
    expect(qualification.qualifyingSutSubjects).toEqual([]);
  });

  it('rejects a private deep-import claim even though the public binding has the same spelling', () => {
    const distribution = cliDistribution();
    const privateClaim: QualifiedBenchDistribution = {
      ...distribution,
      subjects: distribution.subjects.map((subject) => ({
        ...subject,
        origin: { kind: 'module' as const, specifier: '@liteship/cli/internal/dispatch' },
      })),
    };
    expect(qualifyBenchDistribution(privateClaim, source).issues).toContainEqual(
      expect.objectContaining({ kind: 'wrong-origin' }),
    );
  });

  it('keeps the published CLI surface closed while its benchmark traverses only the root entrypoint', () => {
    const manifest = JSON.parse(source('packages/cli/package.json')) as {
      readonly exports: Readonly<Record<string, unknown>>;
    };
    expect(Object.keys(manifest.exports)).toEqual(['.']);
    expect(cliDistribution().subjects).toEqual([
      expect.objectContaining({ origin: { kind: 'module', specifier: '@liteship/cli' } }),
    ]);
  });

  it('projects every help alias through the same public bytes and exit receipt', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('help', '--help', '-h'), async (alias) => {
        const result = await capturePublicRun([alias]);
        expect(result).toEqual({ code: 0, stdout: HELP_TEXT, stderr: '' });
      }),
      { seed: 0xc1_1a_11a5, numRuns: 30 },
    );
  });

  it('keeps arbitrary unknown verbs loud with one machine-readable terminal envelope', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-z][a-z0-9-]{1,24}$/u).filter((value) => !HELP_TEXT.includes(`liteship ${value}`)),
        async (verb) => {
          const result = await capturePublicRun([verb]);
          expect(result.code).toBe(1);
          expect(result.stdout).toBe('');
          const lines = result.stderr.trim().split(/\r?\n/u);
          expect(JSON.parse(lines.at(-1)!)).toEqual({ error: 'unknown_command', command: verb });
          expect(lines.filter((line) => line.startsWith('{'))).toHaveLength(1);
        },
      ),
      { seed: 0xc1_1f_a115, numRuns: 80 },
    );
  });

  it('projects distribution ownership to both command and CLI without fabricated evidence', () => {
    const coverage = projectBenchmarkOwnerCoverage(PACKAGE_CATALOG, distributionRegistry().distributions, []);
    const command = coverage.find((entry) => entry.packageName === '@liteship/command')!;
    const cli = coverage.find((entry) => entry.packageName === '@liteship/cli')!;

    // Tooling packages are outside the runtime-only owner-coverage status fold,
    // but their parser-qualified distributions still carry exact ownership and
    // are what the assurance inventory admits.
    expect(command.status).toBe('not-eligible');
    expect(command.distributionCount).toBeGreaterThanOrEqual(2);
    expect(command.benchmarks).toContain(`${BENCH_FILE}::command registry construction -- full catalog`);
    expect(cli).toMatchObject({ status: 'not-eligible', distributionCount: 1, evidenceCount: 0 });
    expect(cli.benchmarks).toEqual([`${BENCH_FILE}::${CLI_BENCH_NAME}`]);
  });

  it('admits the complete five-size, seven-replicate CLI projection receipt', () => {
    const evidence = cliEvidence();
    expect(evidence.input.sizes).toHaveLength(COMPLEXITY_ADMISSION_POLICY.minimumSizes);
    expect(evidence.measurement.repetitions).toBe(COMPLEXITY_ADMISSION_POLICY.minimumReplicatesPerSize);
    expect(evidence.admission).toEqual({ disposition: 'pass', reasons: [] });
    expect(admitBenchmarkEvidence(evidence, authority(evidence))).toEqual(evidence.admission);
  });

  it('refuses low-confidence, under-replicated, or geometrically invalid projection claims', () => {
    const baseline = cliEvidence();
    const lowFit = cliEvidence({
      complexity: { ...baseline.complexity!, fittedR2: COMPLEXITY_ADMISSION_POLICY.minimumR2 - 0.01 },
    });
    expect(lowFit.admission).toEqual({ disposition: 'unknown', reasons: ['low-r2'] });

    const underReplicated = cliEvidence({
      measurement: { ...baseline.measurement, repetitions: 6 },
    });
    expect(underReplicated.admission).toEqual({ disposition: 'unknown', reasons: ['under-replicated'] });

    const clustered = cliEvidence({ input: { ...baseline.input, sizes: [8, 16, 24, 48, 96] } });
    expect(clustered.admission).toEqual({ disposition: 'unknown', reasons: ['invalid-size-sweep'] });
  });

  it('binds admission to exact benchmark source bytes and exact SUT identity', () => {
    const baseline = cliEvidence();
    expect(
      admitBenchmarkEvidence(baseline, {
        ...authority(baseline),
        sourceDigest: sha256('counterfeit benchmark source bytes'),
      }),
    ).toEqual({ disposition: 'unknown', reasons: ['stale-source-digest'] });

    const renamed = cliEvidence({ sut: { ...baseline.sut, id: 'cli.run.help-projection.renamed' } });
    expect(renamed.evidenceId).not.toBe(baseline.evidenceId);
  });

  it('snapshots mutable benchmark inputs before they can poison admitted evidence', () => {
    const sizes = [8, 16, 32, 64, 128];
    const dimensions = [
      { name: 'catalog-command-count', unit: 'descriptors', distribution: 'geometric-projection-size-sweep' },
    ];
    const evidence = cliEvidence({ input: { sizes, dimensions } });
    sizes[0] = 4;
    dimensions[0]!.distribution = 'mutated-after-admission';

    expect(evidence.input.sizes).toEqual([8, 16, 32, 64, 128]);
    expect(evidence.input.dimensions[0]?.distribution).toBe('geometric-projection-size-sweep');
    expect(Object.isFrozen(evidence.input.sizes)).toBe(true);
    expect(Object.isFrozen(evidence.input.dimensions)).toBe(true);
  });

  it('keeps qualification invariant under unrelated comment and import-free source noise', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (noise) => {
        const safe = noise.replaceAll('*/', '* /');
        const noisy = `${source(BENCH_FILE)}\n/* ${safe} */\n`;
        expect(
          qualifyBenchDistribution(cliDistribution(), (path) => (path === BENCH_FILE ? noisy : source(path))).issues,
        ).toEqual([]);
      }),
      { seed: 0xc1_1c_0ded, numRuns: 80 },
    );
  });
});
