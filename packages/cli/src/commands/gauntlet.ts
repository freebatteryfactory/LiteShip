/**
 * gauntlet — thin wrapper over `pnpm run gauntlet:full`. In `--dry-run`
 * mode emits the canonical phase list without executing anything.
 *
 * @module
 */

import { spawnSync } from 'node:child_process';
import { emit, emitError } from '../receipts.js';
import { gauntletPhaseLabels } from '../gauntlet-phases.js';
import { formatUnexpectedArgvReceipt, parseGauntletArgv } from '../gauntlet-argv.js';

/** The canonical phase labels (CUT D8) — projected from the ONE source the executor runs. */
const PHASES = gauntletPhaseLabels();

/** Execute the gauntlet command. */
export async function gauntlet(rest: readonly string[]): Promise<number> {
  const { dryRun, unexpected } = parseGauntletArgv(rest);
  if (unexpected.length > 0) {
    process.stderr.write(formatUnexpectedArgvReceipt(unexpected));
    emitError('gauntlet', `unexpected_argv: ${unexpected.join(' ')}`);
    return 1;
  }
  if (dryRun) {
    emit({
      status: 'ok',
      command: 'gauntlet',
      timestamp: new Date().toISOString(),
      phases: PHASES,
      dryRun: true,
      argvPolicy: 'reject-unknown',
    });
    return 0;
  }
  const start = Date.now();
  const r = spawnSync('pnpm', ['run', 'gauntlet:full'], { stdio: 'inherit', shell: true });
  const elapsedMs = Date.now() - start;
  if (r.status !== 0) {
    emitError('gauntlet', `gauntlet exited with status ${r.status ?? 'signal'}`);
    return r.status ?? 1;
  }
  emit({
    status: 'ok',
    command: 'gauntlet',
    timestamp: new Date().toISOString(),
    phases: PHASES,
    elapsedMs,
    dryRun: false,
    argvPolicy: 'reject-unknown',
  });
  return 0;
}
