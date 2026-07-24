/**
 * Astro dev-server wrappers.
 *
 * These commands intentionally delegate to Astro 7's own background dev
 * process management instead of reimplementing lock-file or process handling.
 *
 * @module
 */

import { wallClock } from '@liteship/core';
import { spawnArgvCapture } from '../lib/spawn.js';
import { emit } from '../receipts.js';

export type AstroDevAction = 'dev' | 'status' | 'stop';

export interface AstroDevReceipt {
  readonly status: 'ok' | 'failed';
  readonly command: 'astro.dev' | 'astro.status' | 'astro.stop';
  readonly timestamp: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function astroArgs(action: AstroDevAction): readonly string[] {
  if (action === 'dev') return ['exec', 'astro', 'dev', '--background'];
  return ['exec', 'astro', 'dev', action];
}

function commandName(action: AstroDevAction): AstroDevReceipt['command'] {
  return action === 'dev' ? 'astro.dev' : action === 'status' ? 'astro.status' : 'astro.stop';
}

/** Execute one Astro background-dev command and emit a single JSON receipt. */
export async function astroDev(action: AstroDevAction, opts: { readonly cwd?: string } = {}): Promise<number> {
  const result = await spawnArgvCapture('pnpm', astroArgs(action), { cwd: opts.cwd }).catch((error: unknown) => ({
    exitCode: 1,
    stdout: '',
    stderr: error instanceof Error ? error.message : String(error),
  }));
  const receipt: AstroDevReceipt = {
    status: result.exitCode === 0 ? 'ok' : 'failed',
    command: commandName(action),
    timestamp: new Date(wallClock.now()).toISOString(),
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
  emit(receipt);
  return result.exitCode === 0 ? 0 : 1;
}
