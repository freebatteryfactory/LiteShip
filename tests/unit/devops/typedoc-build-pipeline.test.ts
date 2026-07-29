import { describe, expect, test } from 'vitest';
import { runTypeDocBuildPipeline, type TypeDocBuildRunner } from '../../../scripts/lib/typedoc-build-pipeline.js';

const plan = {
  nativeTypeScriptWorkers: 1,
  docs: {
    admitted: true,
    heapMiB: 4_096,
    reservedMemoryMiB: 768,
    swapBacked: true,
    reason: 'admitted-swap',
  },
} as const;

describe('TypeDoc build pipeline', () => {
  test('refreshes declarations before TypeDoc under one admitted resource plan', async () => {
    const environment: NodeJS.ProcessEnv = { NODE_OPTIONS: '--trace-warnings' };
    const calls: Array<{ readonly args: readonly string[]; readonly workers?: string; readonly node?: string }> = [];
    const run: TypeDocBuildRunner = async (_command, args) => {
      calls.push({ args, workers: environment.LITESHIP_NATIVE_TSC_WORKERS, node: environment.NODE_OPTIONS });
      return { exitCode: 0, stderrTail: '' };
    };

    await runTypeDocBuildPipeline({ repoRoot: '/repo', tempDir: '/tmp/docs', plan, run, environment });

    expect(calls).toEqual([
      {
        args: ['exec', 'tsx', 'scripts/native-tsc.ts', '--', '--build'],
        workers: '1',
        node: '--trace-warnings',
      },
      {
        args: ['exec', 'typedoc', '--out', '/tmp/docs'],
        workers: undefined,
        node: '--max-old-space-size=4096 --trace-warnings',
      },
    ]);
    expect(environment).toEqual({ NODE_OPTIONS: '--trace-warnings' });
  });

  test('a declaration failure restores the host and prevents a stale TypeDoc projection', async () => {
    const environment: NodeJS.ProcessEnv = { LITESHIP_NATIVE_TSC_WORKERS: '2' };
    const calls: string[][] = [];
    const run: TypeDocBuildRunner = async (_command, args) => {
      calls.push([...args]);
      return { exitCode: 2, stderrTail: 'TS error' };
    };

    await expect(
      runTypeDocBuildPipeline({ repoRoot: '/repo', tempDir: '/tmp/docs', plan, run, environment }),
    ).rejects.toThrow('declaration build exited 2');
    expect(calls).toEqual([['exec', 'tsx', 'scripts/native-tsc.ts', '--', '--build']]);
    expect(environment).toEqual({ LITESHIP_NATIVE_TSC_WORKERS: '2' });
  });

  test('a TypeDoc failure restores inherited heap policy', async () => {
    const environment: NodeJS.ProcessEnv = { NODE_OPTIONS: '--trace-warnings' };
    let invocation = 0;
    const run: TypeDocBuildRunner = async () => {
      invocation += 1;
      return { exitCode: invocation === 1 ? 0 : 3, stderrTail: '' };
    };

    await expect(
      runTypeDocBuildPipeline({ repoRoot: '/repo', tempDir: '/tmp/docs', plan, run, environment }),
    ).rejects.toThrow('TypeDoc exited 3');
    expect(environment).toEqual({ NODE_OPTIONS: '--trace-warnings' });
  });
});
