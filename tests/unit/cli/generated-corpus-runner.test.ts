/**
 * Generated corpus execution uses two real Vitest modes. The subprocess canary
 * proves a throwing `.bench.ts` file makes the benchmark lane red.
 *
 * @module
 */

import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  admitGeneratedBenchmarkReport,
  runGeneratedBenchFiles,
  runGeneratedCorpus,
  type GeneratedBenchRunner,
  type GeneratedCorpusSpawn,
} from '../../../packages/cli/src/lib/generated-corpus-runner.js';
import { repoRoot, scaledTimeout } from '../../../vitest.shared.js';

describe('generated corpus runner', () => {
  it('executes tests and benchmarks through their distinct Vitest modes', async () => {
    const spawn = vi.fn<GeneratedCorpusSpawn>().mockResolvedValue({ exitCode: 0, stderrTail: '' });
    const runBench = vi.fn<GeneratedBenchRunner>().mockResolvedValue({
      exitCode: 0,
      stderrTail: '',
      receipt: {
        schemaVersion: 1,
        environment: { platform: process.platform, arch: process.arch, runtime: process.version },
        files: [],
      },
    });
    const result = await runGeneratedCorpus(
      repoRoot,
      {
        testFiles: ['tests/generated/z.test.ts', 'tests/generated/a.test.ts'],
        benchFiles: ['tests/generated/z.bench.ts', 'tests/generated/a.bench.ts'],
      },
      spawn,
      runBench,
    );
    expect(result.ok).toBe(true);
    expect(spawn.mock.calls).toEqual([
      [
        'pnpm',
        ['exec', 'vitest', 'run', 'tests/generated/a.test.ts', 'tests/generated/z.test.ts', '--maxWorkers=1'],
        { cwd: repoRoot },
      ],
    ]);
    expect(runBench).toHaveBeenCalledWith(repoRoot, ['tests/generated/a.bench.ts', 'tests/generated/z.bench.ts']);
  });

  it('does not launder a failed generated test by running the benchmark lane', async () => {
    const spawn = vi.fn<GeneratedCorpusSpawn>().mockResolvedValue({ exitCode: 1, stderrTail: 'test red' });
    const result = await runGeneratedCorpus(
      repoRoot,
      {
        testFiles: ['tests/generated/red.test.ts'],
        benchFiles: ['tests/generated/unreached.bench.ts'],
      },
      spawn,
    );
    expect(result).toMatchObject({ ok: false, failedLane: 'test', bench: null });
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it.each([
    [['tests/generated/../escape.test.ts'], []],
    [[], ['tests/bench/not-generated.bench.ts']],
    [['tests/generated/a.test.ts', 'tests/generated/a.test.ts'], []],
  ] as const)('refuses paths outside or duplicated within the manifest corpus', async (testFiles, benchFiles) => {
    await expect(runGeneratedCorpus(repoRoot, { testFiles, benchFiles }, vi.fn())).rejects.toMatchObject({
      _tag: 'ValidationError',
      module: 'generated-corpus',
    });
  });

  it('admits only exact-file multi-sample measurements with uncertainty and environment', () => {
    const file = 'tests/generated/remotion-video-frame-output.bench.ts';
    const report = {
      files: [
        {
          filepath: `${repoRoot}/${file}`,
          groups: [
            {
              fullName: file,
              benchmarks: [
                {
                  id: 'bench-1',
                  name: 'measured SUT',
                  rank: 1,
                  rme: 2.5,
                  totalTime: 500,
                  min: 1,
                  max: 3,
                  mean: 2,
                  variance: 0.25,
                  sd: 0.5,
                  sem: 0.05,
                  moe: 0.1,
                  sampleCount: 100,
                },
              ],
            },
          ],
        },
      ],
    };

    const receipt = admitGeneratedBenchmarkReport(repoRoot, [file], report);
    expect(receipt).toMatchObject({
      schemaVersion: 1,
      environment: { platform: process.platform, arch: process.arch, runtime: process.version },
      files: [
        {
          file,
          sourceDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
          benchmarks: [{ name: 'measured SUT', sampleCount: 100, relativeMarginOfError: 2.5 }],
        },
      ],
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.files[0]?.benchmarks)).toBe(true);
  });

  it.each([
    ['throwing callback/missing measurements', { id: 'red', name: 'red', rank: 1, rme: 0, samples: [] }],
    [
      'single sample',
      {
        id: 'one',
        name: 'one',
        rank: 1,
        rme: 0,
        totalTime: 1,
        min: 1,
        max: 1,
        mean: 1,
        variance: 0,
        sd: 0,
        sem: 0,
        moe: 0,
        sampleCount: 1,
      },
    ],
    [
      'non-finite uncertainty',
      {
        id: 'noisy',
        name: 'noisy',
        rank: 1,
        rme: Number.NaN,
        totalTime: 2,
        min: 1,
        max: 2,
        mean: 1.5,
        variance: 0.25,
        sd: 0.5,
        sem: 0.25,
        moe: 0.5,
        sampleCount: 2,
      },
    ],
  ])('refuses %s benchmark evidence', (_label, benchmark) => {
    const file = 'tests/generated/remotion-video-frame-output.bench.ts';
    let failure: unknown;
    try {
      admitGeneratedBenchmarkReport(repoRoot, [file], {
        files: [{ filepath: `${repoRoot}/${file}`, groups: [{ fullName: file, benchmarks: [benchmark] }] }],
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ _tag: 'ValidationError', module: 'generated-benchmark-report' });
  });

  it('refuses omitted, foreign, and source-stale execution receipts', () => {
    const file = 'tests/generated/remotion-video-frame-output.bench.ts';
    expect(() => admitGeneratedBenchmarkReport(repoRoot, [file], { files: [] })).toThrow(/covered 0 files/u);
    expect(() =>
      admitGeneratedBenchmarkReport(repoRoot, [file], {
        files: [{ filepath: `${repoRoot}/tests/generated/foreign.bench.ts`, groups: [] }],
      }),
    ).toThrow(/unexpected or duplicate file/u);

    const measurement = {
      id: 'bench-1',
      name: 'measured SUT',
      rank: 1,
      rme: 2.5,
      totalTime: 500,
      min: 1,
      max: 3,
      mean: 2,
      variance: 0.25,
      sd: 0.5,
      sem: 0.05,
      moe: 0.1,
      sampleCount: 100,
    };
    expect(() =>
      admitGeneratedBenchmarkReport(
        repoRoot,
        [file],
        {
          files: [{ filepath: `${repoRoot}/${file}`, groups: [{ fullName: file, benchmarks: [measurement] }] }],
        },
        new Map([[resolve(repoRoot, file), `sha256:${'0'.repeat(64)}`]]),
      ),
    ).toThrow(/source changed during execution/u);
  });

  it(
    'the real Vitest benchmark runner fails on a throwing generated-bench canary',
    async () => {
      const result = await runGeneratedBenchFiles(repoRoot, ['tests/fixtures/generated-bench/failure-canary.bench.ts']);
      expect(result.exitCode).not.toBe(0);
      expect(result.receipt).toBeNull();
      expect(result.stderrTail).toContain('generated benchmark admission failed');
      expect(result.stderrTail).toContain('sampleCount');
    },
    scaledTimeout(30_000),
  );

  it(
    'the real Vitest benchmark runner admits a measured generated SUT receipt',
    async () => {
      const result = await runGeneratedBenchFiles(repoRoot, ['tests/generated/remotion-video-frame-output.bench.ts']);
      expect(result.exitCode).toBe(0);
      expect(result.receipt).toMatchObject({
        schemaVersion: 1,
        environment: { platform: process.platform, arch: process.arch, runtime: process.version },
        files: [
          {
            file: 'tests/generated/remotion-video-frame-output.bench.ts',
            sourceDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
            benchmarks: [
              {
                name: 'remotion.video-frame-output — native -> liteship -> native round trip',
                sampleCount: expect.any(Number),
                relativeMarginOfError: expect.any(Number),
              },
            ],
          },
        ],
      });
    },
    scaledTimeout(30_000),
  );
});
