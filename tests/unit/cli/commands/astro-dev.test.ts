import { afterEach, describe, expect, test, vi } from 'vitest';
import { astroDev } from '../../../../packages/cli/src/commands/astro-dev.js';
import * as spawnLib from '../../../../packages/cli/src/lib/spawn.js';

async function captureStdout(fn: () => Promise<number>): Promise<{ exit: number; stdout: string }> {
  let stdout = '';
  const orig = process.stdout.write.bind(process.stdout);
  (process.stdout as unknown as { write: unknown }).write = ((chunk: string | Uint8Array) => {
    stdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
    return true;
  });
  try {
    return { exit: await fn(), stdout };
  } finally {
    (process.stdout as unknown as { write: typeof orig }).write = orig;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('astro dev command wrappers', () => {
  test('astro.dev delegates to Astro 7 background mode', async () => {
    const spawn = vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({ exitCode: 0, stdout: 'started', stderr: '' });

    const { exit, stdout } = await captureStdout(() => astroDev('dev', { cwd: '/app' }));

    expect(exit).toBe(0);
    expect(spawn).toHaveBeenCalledWith('pnpm', ['exec', 'astro', 'dev', '--background'], { cwd: '/app' });
    const receipt = JSON.parse(stdout.trim());
    expect(receipt).toMatchObject({ status: 'ok', command: 'astro.dev', exitCode: 0, stdout: 'started' });
  });

  test('astro.status delegates to astro dev status', async () => {
    const spawn = vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({ exitCode: 0, stdout: 'running', stderr: '' });

    const { stdout } = await captureStdout(() => astroDev('status'));

    expect(spawn).toHaveBeenCalledWith('pnpm', ['exec', 'astro', 'dev', 'status'], { cwd: undefined });
    expect(JSON.parse(stdout.trim()).command).toBe('astro.status');
  });

  test('astro.stop delegates to astro dev stop and reflects failures', async () => {
    vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'not running' });

    const { exit, stdout } = await captureStdout(() => astroDev('stop'));

    expect(exit).toBe(1);
    expect(JSON.parse(stdout.trim())).toMatchObject({
      status: 'failed',
      command: 'astro.stop',
      exitCode: 1,
      stderr: 'not running',
    });
  });
});
