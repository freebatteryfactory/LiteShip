/**
 * Real-process proof for the shell-free launcher shared by command hosts,
 * repository scripts, and package smoke. Unit tests pin the projected argv;
 * these controls cross the operating-system process boundary and prove those
 * bytes arrive as data rather than becoming shell syntax.
 */
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  mergedEnv,
  resolveLauncher,
  spawnArgvCaptureWithEnv,
  spawnCrossPlatform,
} from '../../packages/command/src/host/launcher.js';
import { runPnpm } from '../../scripts/support/pnpm-process.js';

const roots: string[] = [];

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-argv-proof-'));
  roots.push(root);
  return root;
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

const argvEcho = 'process.stdout.write(JSON.stringify(process.argv.slice(1)))';

describe('cross-platform process boundary', () => {
  test('round-trips shell metacharacters as exact argv data and performs no injected write', async () => {
    const root = scratch();
    const marker = join(root, 'injected.txt');
    const hostile = [
      `& echo owned>${marker}`,
      `| echo owned>${marker}`,
      `; echo owned>${marker}`,
      `&& echo owned>${marker}`,
      `$(echo owned>${marker})`,
      '`echo owned`',
      '%COMSPEC%',
      '$SHELL',
      'two words',
      'a"quoted"value',
      "a'single'value",
      'caret^value',
      '<input >output',
      '(grouped)',
    ];

    const result = await spawnArgvCaptureWithEnv(process.execPath, ['-e', argvEcho, ...hostile], { cwd: root });
    expect(result).toMatchObject({ exitCode: 0, stderr: '', signal: null });
    expect(JSON.parse(result.stdout)).toEqual(hostile);
    expect(existsSync(marker)).toBe(false);
  });

  test('round-trips a generated hostile argv corpus through one real child', async () => {
    const arbitrary = fc
      .array(
        fc.constantFrom(' ', '\t', '"', "'", '\\', '/', '$', '%', '&', '|', ';', '<', '>', '^', '(', ')', 'a', '0'),
        { minLength: 1, maxLength: 32 },
      )
      .map((chars) => chars.join(''));
    const args = fc.sample(arbitrary, { seed: 0xa76, numRuns: 128 });
    const result = await spawnArgvCaptureWithEnv(process.execPath, ['-e', argvEcho, ...args]);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(args);
  });

  test('captures stdout, stderr, exit code, and inherited additions without losing parent env', async () => {
    const source = [
      "process.stdout.write(process.env.LITESHIP_PROCESS_PROOF ?? 'missing');",
      "process.stderr.write('diagnostic-tail');",
      'process.exitCode = 7;',
    ].join('');
    const result = await spawnArgvCaptureWithEnv(process.execPath, ['-e', source], {
      envAdditions: { LITESHIP_PROCESS_PROOF: 'admitted' },
    });
    expect(result).toEqual({
      exitCode: 7,
      stdout: 'admitted',
      stderr: 'diagnostic-tail',
      signal: null,
    });
  });

  test('an inherited npm_execpath cannot replace the closed pnpm executable', async () => {
    const result = await spawnArgvCaptureWithEnv('pnpm', ['--version'], {
      envAdditions: {
        npm_execpath: join(scratch(), 'attacker-controlled-missing-shim.cjs'),
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(result.stderr).toBe('');
  });

  test('the pnpm-specific script helper uses the same real shim-safe path', async () => {
    const result = await runPnpm(['--version'], {
      cwd: scratch(),
      env: { npm_execpath: join(scratch(), 'not-the-owner.cjs') },
    });
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(result.stderr).toBe('');
  });

  test('a missing executable rejects through the process error channel', async () => {
    await expect(
      spawnArgvCaptureWithEnv(`liteship-command-that-does-not-exist-${process.pid}`, ['--version']),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('launcher ownership laws', () => {
  test('resolution preserves one argv tuple on every supported platform', () => {
    const args = ['run', 'test', '--', '--label', 'two words'];
    for (const platform of ['linux', 'darwin', 'win32'] as const) {
      expect(resolveLauncher('pnpm', args, platform)).toEqual({
        command: 'pnpm',
        args,
        windowsVerbatimArguments: false,
      });
    }
  });

  test('environment additions extend rather than replace the parent environment', () => {
    const merged = mergedEnv({ LITESHIP_PROCESS_PROOF: 'yes' });
    expect(merged?.LITESHIP_PROCESS_PROOF).toBe('yes');
    if (process.env.PATH !== undefined) expect(merged?.PATH).toBe(process.env.PATH);
  });

  test('the primitive forcibly disables shell mode even when a caller asks for it', async () => {
    const root = scratch();
    const child = spawnCrossPlatform(process.execPath, ['-e', "process.stdout.write('ok')"], {
      cwd: root,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
    const code = await new Promise<number | null>((resolve) => child.on('close', resolve));
    expect(code).toBe(0);
    expect(Buffer.concat(stdout).toString('utf8')).toBe('ok');
  });
});
