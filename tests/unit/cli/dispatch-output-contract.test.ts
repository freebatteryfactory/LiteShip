import { describe, expect, it, vi } from 'vitest';
import { run } from '../../../packages/cli/src/dispatch.js';
import { captureCli } from '../../integration/cli/capture.js';

function parseJsonLines(stdout: string): readonly unknown[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

describe('catalog output-mode controls', () => {
  it.each([
    ['version', ['version']],
    ['describe', ['describe', '--format=json']],
  ] as const)('%s emits JSON-only stdout', async (_name, argv) => {
    const { exit, stdout } = await captureCli(() => run(argv));
    expect(exit).toBe(0);
    expect(parseJsonLines(stdout).length).toBeGreaterThan(0);
  });

  it.each([
    ['help', ['help']],
    ['completion', ['completion', 'bash']],
  ] as const)('%s emits intentional non-JSON text', async (_name, argv) => {
    const { exit, stdout } = await captureCli(() => run(argv));
    expect(exit).toBe(0);
    expect(stdout.trim().length).toBeGreaterThan(0);
    expect(() => JSON.parse(stdout)).toThrow();
  });

  it('mcp owns its process channel, emits no CLI receipt, and remains pending until handle.done', async () => {
    let release!: () => void;
    const done = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const startObserved = new Promise<void>((resolve) => {
      started = resolve;
    });
    let settled = false;

    const execution = captureCli(() =>
      run(['mcp'], {
        importMcpServer: async () => ({
          start: async () => {
            started();
            return { transport: 'stdio' as const, done, stop: async (): Promise<void> => release() };
          },
          runLspStdio: async (): Promise<void> => {},
        }),
      }),
    ).finally(() => {
      settled = true;
    });

    await startObserved;
    await Promise.resolve();
    expect(settled).toBe(false);
    release();

    const { exit, stdout, stderr } = await execution;
    expect(exit).toBe(0);
    expect(stdout).toBe('');
    expect(stderr).toBe('');
  });

  it.each([
    { argv: ['mcp'] as const, expectedOpts: {}, transport: 'stdio' as const },
    { argv: ['mcp', '--http', ':3838'] as const, expectedOpts: { http: ':3838' }, transport: 'http' as const },
  ])('mcp $transport lifecycle is start -> running -> done -> returned', async ({ argv, expectedOpts, transport }) => {
    const events: string[] = [];
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = (): void => {
        events.push('done');
        resolve();
      };
    });
    const stop = vi.fn(async (): Promise<void> => resolveDone());
    const start = vi.fn(async () => {
      events.push('start');
      return { transport, done, stop };
    });

    const execution = run(argv, {
      importMcpServer: async () => ({ start, runLspStdio: async (): Promise<void> => {} }),
    }).then((exit) => {
      events.push('returned');
      return exit;
    });

    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());
    expect(start).toHaveBeenCalledWith(expectedOpts);
    expect(events).toEqual(['start']);
    expect(stop).not.toHaveBeenCalled();

    await stop();
    await expect(execution).resolves.toBe(0);
    expect(events).toEqual(['start', 'done', 'returned']);
  });

  it('mcp propagates handle.done rejection instead of minting a false exit 0', async () => {
    const lifecycleFailure = new Error('transport failed after start');

    await expect(
      run(['mcp'], {
        importMcpServer: async () => ({
          start: async () => ({
            transport: 'stdio' as const,
            done: Promise.reject(lifecycleFailure),
            stop: async (): Promise<void> => {},
          }),
          runLspStdio: async (): Promise<void> => {},
        }),
      }),
    ).rejects.toBe(lifecycleFailure);
  });
});
