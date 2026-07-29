/**
 * Pnpm-specific re-export shim.
 *
 * Historically held its own copy of quoteWindowsArg + spawn helpers; that
 * implementation now lives at scripts/lib/spawn.ts. This file keeps
 * `runPnpm` / `spawnPnpm` for callers that pre-pend the `pnpm` command, and
 * re-exports `quoteWindowsArg` for the drift-guard test.
 *
 * @module
 */

import { spawnCrossPlatform } from '../../packages/command/src/host/launcher.js';
export { quoteWindowsArg } from '../lib/spawn.js';

export interface PnpmRunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface PnpmRunOptions {
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
}

export function runPnpm(args: readonly string[], options: PnpmRunOptions): Promise<PnpmRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawnCrossPlatform('pnpm', args, {
      cwd: options.cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout === null || child.stderr === null) {
      child.kill();
      reject(new Error('pnpm capture launched without the requested stdout/stderr pipes'));
      return;
    }
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export function spawnPnpm(args: readonly string[], options: PnpmRunOptions & { readonly stdio?: 'inherit' | 'pipe' }) {
  return spawnCrossPlatform('pnpm', args, {
    cwd: options.cwd,
    shell: false,
    stdio: options.stdio ?? 'inherit',
    env: { ...process.env, ...options.env },
  });
}
