/**
 * Workspace verify — first-run aggregate. Sequence:
 *   1. doctor (preflight checks)
 *   2. build (tsc --build)
 *   3. test (fast inner loop)
 *   4. LiteShip quick profile (the registry-backed local coherence claim)
 *
 * Stops on the first failure. Each phase prints a banner so the human
 * watching the output can see which step they're in.
 *
 * @module
 */

import { color, colorEnabled, header } from '../packages/cli/src/lib/ansi.js';
import { spawnArgv } from './lib/spawn.js';
import { isDirectExecution } from './audit/shared.js';

export interface VerifyPhase {
  readonly name: string;
  readonly cmd: readonly string[];
  readonly hint?: string;
}

export type VerifySpawn = (
  command: string,
  args: readonly string[],
  options: { readonly stdio: 'inherit' },
) => Promise<{ readonly exitCode: number }>;

export const VERIFY_PHASES: readonly VerifyPhase[] = [
  {
    name: 'environment',
    cmd: ['pnpm', 'run', 'doctor'],
    hint: 'Preflight checks. `pnpm run doctor` to re-run in isolation.',
  },
  {
    name: 'build',
    cmd: ['pnpm', 'run', 'build'],
    hint: 'tsc --build across the whole workspace.',
  },
  {
    name: 'test',
    cmd: ['pnpm', 'test'],
    hint: 'Fast inner loop — unit + component + property + integration (~75s).',
  },
  {
    name: 'quick checks',
    cmd: ['node', 'packages/cli/bin/liteship.mjs', 'check', '--profile', 'quick'],
    hint: 'Registry-backed quick profile — the same claim exposed by `liteship check --profile quick`.',
  },
];

/** Execute the fixed first-run sequence, stopping at the first failed phase. */
export async function runVerify(
  spawn: VerifySpawn = spawnArgv,
  write: (message: string) => void = (message) => process.stderr.write(message),
): Promise<number> {
  const start = Date.now();
  const on = colorEnabled();
  for (const phase of VERIFY_PHASES) {
    write(`\n${header(`-- verify: ${phase.name} --`, on)}\n`);
    if (phase.hint) write(`    ${color('dim', phase.hint, on)}\n`);
    const result = await spawn(phase.cmd[0]!, phase.cmd.slice(1), { stdio: 'inherit' });
    if (result.exitCode !== 0) {
      write(`\n${color('red', `Verify aborted at ${phase.name}`, on)} (exit ${result.exitCode}).\n`);
      write(`Re-run with: ${color('cyan', phase.cmd.join(' '), on)}\n`);
      return result.exitCode;
    }
  }

  const elapsedSec = Math.round((Date.now() - start) / 1000);
  write(`\n${color('green', 'Workspace verified — ready to develop.', on)} ${color('dim', `(${elapsedSec}s)`, on)}\n`);
  return 0;
}

if (isDirectExecution(import.meta.url)) {
  process.exit(await runVerify());
}
