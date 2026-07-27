/**
 * Shell-free execution owner for the generated capsule corpus.
 *
 * Generated tests and generated benchmarks are different Vitest lanes. A
 * successful `vitest run tests/generated/` proves only the `.test.ts` files;
 * the `.bench.ts` files require `vitest bench --run`. This owner executes both
 * exact manifest-derived file sets and reports which lane failed.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix, relative, resolve } from 'node:path';
import { spawnArgv, type SpawnArgvOpts, type SpawnResult } from '@liteship/command/host';
import { ValidationError } from '@liteship/error';

export interface GeneratedCorpusFiles {
  readonly testFiles: readonly string[];
  readonly benchFiles: readonly string[];
}

export interface GeneratedCorpusRun {
  readonly ok: boolean;
  readonly failedLane: 'test' | 'bench' | null;
  readonly test: SpawnResult | null;
  readonly bench: GeneratedBenchRun | null;
}

/** One measured Vitest benchmark task admitted from the machine report. */
export interface GeneratedBenchmarkMeasurement {
  readonly id: string;
  readonly name: string;
  readonly sampleCount: number;
  readonly totalTime: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly mean: number;
  readonly variance: number;
  readonly standardDeviation: number;
  readonly standardError: number;
  readonly marginOfError: number;
  readonly relativeMarginOfError: number;
}

/**
 * Execution-qualified receipt for the generated benchmark lane.
 *
 * This is deliberately not a performance-regression verdict. It proves that
 * the exact generated source bytes executed, produced a real sample
 * distribution and uncertainty statistics, and names the environment that
 * observed them. Claim-class thresholds remain owned by the benchmark
 * constitution rather than being invented by this runner.
 */
export interface GeneratedBenchmarkExecutionReceipt {
  readonly schemaVersion: 1;
  readonly environment: {
    readonly platform: NodeJS.Platform;
    readonly arch: string;
    readonly runtime: string;
  };
  readonly files: readonly {
    readonly file: string;
    readonly sourceDigest: `sha256:${string}`;
    readonly benchmarks: readonly GeneratedBenchmarkMeasurement[];
  }[];
}

/** Subprocess result plus the admitted machine receipt when execution succeeds. */
export interface GeneratedBenchRun extends SpawnResult {
  readonly receipt: GeneratedBenchmarkExecutionReceipt | null;
}

export type GeneratedCorpusSpawn = (
  command: string,
  args: readonly string[],
  options: SpawnArgvOpts,
) => Promise<SpawnResult>;

export type GeneratedBenchRunner = (cwd: string, benchFiles: readonly string[]) => Promise<GeneratedBenchRun>;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finite(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw ValidationError('generated-benchmark-report', `has no finite ${field}`);
  }
  return value;
}

function nonEmpty(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationError('generated-benchmark-report', `has no ${field}`);
  }
  return value;
}

function samePhysicalPath(left: string, right: string): boolean {
  const normalize = (value: string): string => {
    const absolute = resolve(value).replace(/\\/gu, '/');
    return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
  };
  return normalize(left) === normalize(right);
}

function sourceDigest(file: string): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(readFileSync(file)).digest('hex')}`;
}

/**
 * Admit Vitest's benchmark JSON only when it covers the exact requested files
 * and every task carries a real multi-sample distribution plus uncertainty.
 */
export function admitGeneratedBenchmarkReport(
  cwd: string,
  benchFiles: readonly string[],
  value: unknown,
  expectedSourceDigests?: ReadonlyMap<string, `sha256:${string}`>,
): GeneratedBenchmarkExecutionReceipt {
  const top = record(value);
  if (top === null || !Array.isArray(top.files)) {
    throw ValidationError('generated-benchmark-report', 'has no files array');
  }
  if (top.files.length !== benchFiles.length) {
    throw ValidationError(
      'generated-benchmark-report',
      `covered ${top.files.length} files; expected ${benchFiles.length}`,
    );
  }

  const remaining = new Set(benchFiles.map((file) => resolve(cwd, file)));
  const files = top.files.map((rawFile) => {
    const file = record(rawFile);
    if (file === null) throw ValidationError('generated-benchmark-report', 'contains a malformed file record');
    const filepath = nonEmpty(file.filepath, 'file path');
    const expected = [...remaining].find((candidate) => samePhysicalPath(candidate, filepath));
    if (expected === undefined) {
      throw ValidationError('generated-benchmark-report', `contains an unexpected or duplicate file: ${filepath}`);
    }
    remaining.delete(expected);
    if (!Array.isArray(file.groups) || file.groups.length === 0) {
      throw ValidationError('generated-benchmark-report', `contains no groups for ${filepath}`);
    }

    const benchmarks: GeneratedBenchmarkMeasurement[] = [];
    for (const rawGroup of file.groups) {
      const group = record(rawGroup);
      if (group === null || !Array.isArray(group.benchmarks) || group.benchmarks.length === 0) {
        throw ValidationError('generated-benchmark-report', `contains an empty group for ${filepath}`);
      }
      for (const rawBenchmark of group.benchmarks) {
        const benchmark = record(rawBenchmark);
        if (benchmark === null)
          throw ValidationError('generated-benchmark-report', `contains a malformed task in ${filepath}`);
        const sampleCount = finite(benchmark.sampleCount, 'sampleCount');
        if (!Number.isInteger(sampleCount) || sampleCount < 2) {
          throw ValidationError(
            'generated-benchmark-report',
            `${String(benchmark.name)} produced ${sampleCount} samples; at least two are required to establish uncertainty`,
          );
        }
        const minimum = finite(benchmark.min, 'minimum');
        const maximum = finite(benchmark.max, 'maximum');
        const mean = finite(benchmark.mean, 'mean');
        const variance = finite(benchmark.variance, 'variance');
        const standardDeviation = finite(benchmark.sd, 'standard deviation');
        const standardError = finite(benchmark.sem, 'standard error');
        const marginOfError = finite(benchmark.moe, 'margin of error');
        const relativeMarginOfError = finite(benchmark.rme, 'relative margin of error');
        if (
          minimum < 0 ||
          maximum < minimum ||
          mean < minimum ||
          mean > maximum ||
          variance < 0 ||
          standardDeviation < 0 ||
          standardError < 0 ||
          marginOfError < 0 ||
          relativeMarginOfError < 0
        ) {
          throw ValidationError(
            'generated-benchmark-report',
            `${String(benchmark.name)} has an incoherent distribution`,
          );
        }
        const totalTime = finite(benchmark.totalTime, 'total time');
        if (totalTime < 0) {
          throw ValidationError('generated-benchmark-report', `${String(benchmark.name)} has a negative total time`);
        }
        benchmarks.push({
          id: nonEmpty(benchmark.id, 'benchmark id'),
          name: nonEmpty(benchmark.name, 'benchmark name'),
          sampleCount,
          totalTime,
          minimum,
          maximum,
          mean,
          variance,
          standardDeviation,
          standardError,
          marginOfError,
          relativeMarginOfError,
        });
      }
    }

    const digest = sourceDigest(expected);
    const expectedDigest = expectedSourceDigests?.get(expected);
    if (expectedDigest !== undefined && expectedDigest !== digest) {
      throw ValidationError('generated-benchmark-report', `source changed during execution: ${filepath}`);
    }
    const relativeFile = posix.normalize(relative(resolve(cwd), expected).replace(/\\/gu, '/'));
    return Object.freeze({
      file: relativeFile,
      sourceDigest: digest,
      benchmarks: Object.freeze(benchmarks),
    });
  });

  if (remaining.size !== 0) {
    throw ValidationError('generated-benchmark-report', `omitted ${remaining.size} requested files`);
  }
  return Object.freeze({
    schemaVersion: 1,
    environment: Object.freeze({ platform: process.platform, arch: process.arch, runtime: process.version }),
    files: Object.freeze(files),
  });
}

/** Low-level exact-file benchmark execution, exported for the planted red canary. */
export function runGeneratedBenchFiles(
  cwd: string,
  benchFiles: readonly string[],
  spawn: GeneratedCorpusSpawn = spawnArgv,
): Promise<GeneratedBenchRun> {
  const receiptDir = mkdtempSync(join(tmpdir(), 'liteship-generated-bench-'));
  const receiptPath = join(receiptDir, 'vitest-bench.json');
  const expectedSourceDigests = new Map(
    benchFiles.map((file) => {
      const absolute = resolve(cwd, file);
      return [absolute, sourceDigest(absolute)] as const;
    }),
  );
  return spawn(
    'pnpm',
    ['exec', 'vitest', 'bench', '--run', ...benchFiles, '--maxWorkers=1', `--outputJson=${receiptPath}`],
    { cwd },
  )
    .then((result): GeneratedBenchRun => {
      if (result.exitCode !== 0) return { ...result, receipt: null };
      try {
        const report = JSON.parse(readFileSync(receiptPath, 'utf8')) as unknown;
        return {
          ...result,
          receipt: admitGeneratedBenchmarkReport(cwd, benchFiles, report, expectedSourceDigests),
        };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return {
          exitCode: 1,
          stderrTail: `${result.stderrTail}\ngenerated benchmark admission failed: ${detail}`.trim(),
          receipt: null,
        };
      }
    })
    .finally(() => rmSync(receiptDir, { recursive: true, force: true }));
}

function exactFiles(files: readonly string[], suffix: '.test.ts' | '.bench.ts'): readonly string[] {
  const authored = files.map((file) => file.replace(/\\/gu, '/'));
  const normalized = authored.map((file) => posix.normalize(file));
  if (
    normalized.some(
      (file, index) => file !== authored[index] || !file.startsWith('tests/generated/') || !file.endsWith(suffix),
    )
  ) {
    throw ValidationError('generated-corpus', `${suffix} files must stay beneath tests/generated/`);
  }
  const unique = [...new Set(normalized)].sort();
  if (unique.length !== normalized.length) throw ValidationError('generated-corpus', `${suffix} files must be unique`);
  return unique;
}

/** Execute exact generated test and benchmark files through their real runners. */
export async function runGeneratedCorpus(
  cwd: string,
  files: GeneratedCorpusFiles,
  spawn: GeneratedCorpusSpawn = spawnArgv,
  runBench: GeneratedBenchRunner = (root, benchFiles) => runGeneratedBenchFiles(root, benchFiles, spawn),
): Promise<GeneratedCorpusRun> {
  const testFiles = exactFiles(files.testFiles, '.test.ts');
  const benchFiles = exactFiles(files.benchFiles, '.bench.ts');

  const test =
    testFiles.length === 0
      ? null
      : await spawn('pnpm', ['exec', 'vitest', 'run', ...testFiles, '--maxWorkers=1'], { cwd });
  if (test !== null && test.exitCode !== 0) {
    return { ok: false, failedLane: 'test', test, bench: null };
  }

  const bench = benchFiles.length === 0 ? null : await runBench(cwd, benchFiles);
  if (bench !== null && bench.exitCode !== 0) {
    return { ok: false, failedLane: 'bench', test, bench };
  }

  return { ok: true, failedLane: null, test, bench };
}
