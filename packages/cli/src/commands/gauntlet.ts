/**
 * gauntlet — thin wrapper over `pnpm run gauntlet:full`. In `--dry-run`
 * mode emits the canonical phase list without executing anything.
 *
 * @module
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { systemClock, wallClock } from '@liteship/core';
import { emit, emitError } from '../receipts.js';
import { gauntletPhaseLabels } from '../gauntlet-phases.js';
import { formatUnexpectedArgvReceipt, parseGauntletArgv } from '../gauntlet-argv.js';
import { isLiteShipWorkspace } from '../lib/workspace.js';

/** The canonical phase labels (CUT D8) — projected from the ONE source the executor runs. */
const PHASES = gauntletPhaseLabels();

/**
 * Read the failing phase label out of the executor's phase-timings artifact
 * (scripts/gauntlet.ts writes it on both success and failure paths). Null
 * when the artifact is absent, unreadable, or records a passing run — the
 * error then degrades to the bare exit status.
 */
export function readFailedPhase(cwd: string): string | null {
  const path = resolve(cwd, 'benchmarks/gauntlet-phase-timings.json');
  if (!existsSync(path)) return null;
  try {
    const artifact = JSON.parse(readFileSync(path, 'utf8')) as {
      status?: string;
      failedPhase?: string | null;
    };
    return artifact.status === 'failed' && typeof artifact.failedPhase === 'string' ? artifact.failedPhase : null;
  } catch {
    return null;
  }
}

/** Execute the gauntlet command. */
export async function gauntlet(rest: readonly string[], opts: { readonly cwd?: string } = {}): Promise<number> {
  const { dryRun, unexpected } = parseGauntletArgv(rest);
  if (unexpected.length > 0) {
    process.stderr.write(formatUnexpectedArgvReceipt(unexpected));
    emitError('gauntlet', 'cli/invalid-argument', `unexpected_argv: ${unexpected.join(' ')}`);
    return 1;
  }
  if (dryRun) {
    emit({
      status: 'ok',
      command: 'gauntlet',
      timestamp: new Date(wallClock.now()).toISOString(),
      phases: PHASES,
      dryRun: true,
      argvPolicy: 'reject-unknown',
    });
    return 0;
  }
  const cwd = opts.cwd ?? process.cwd();
  // Same class of guard as doctor --fix: `pnpm run gauntlet:full` outside
  // this repo would execute a stranger's same-named script (or die with
  // pnpm's raw missing-script error).
  if (!isLiteShipWorkspace(cwd)) {
    emitError(
      'gauntlet',
      'cli/workspace-required',
      'gauntlet is a LiteShip-workspace verb; run it from the liteship repo root',
    );
    return 1;
  }
  // Monotonic — this is an elapsed-time delta, not a timestamp.
  const start = systemClock.now();
  const r = spawnSync('pnpm', ['run', 'gauntlet:full'], { stdio: 'inherit', shell: true, cwd });
  const elapsedMs = systemClock.now() - start;
  if (r.status !== 0) {
    const failedPhase = readFailedPhase(cwd);
    emitError(
      'gauntlet',
      'cli/command-failed',
      failedPhase
        ? `gauntlet failed in phase ${failedPhase} (exit ${r.status ?? 'signal'})`
        : `gauntlet exited with status ${r.status ?? 'signal'}`,
      'List phases: liteship gauntlet --dry-run',
    );
    return r.status ?? 1;
  }
  emit({
    status: 'ok',
    command: 'gauntlet',
    timestamp: new Date(wallClock.now()).toISOString(),
    phases: PHASES,
    elapsedMs,
    dryRun: false,
    argvPolicy: 'reject-unknown',
  });
  return 0;
}
