/**
 * Workspace verify — first-run aggregate. Sequence:
 *   1. doctor (preflight checks)
 *   2. build (tsc --build)
 *   3. test (fast inner loop)
 *
 * Stops on the first failure. Each phase prints a banner so the human
 * watching the output can see which step they're in.
 *
 * @module
 */

import { color, colorEnabled, header } from '../packages/cli/src/lib/ansi.js';
import { spawnArgv } from './lib/spawn.js';

interface Phase {
  readonly name: string;
  readonly cmd: readonly string[];
  readonly hint?: string;
}

const PHASES: readonly Phase[] = [
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
];

let failed = 0;
const start = Date.now();
const on = colorEnabled();

for (const phase of PHASES) {
  process.stderr.write(`\n${header(`-- verify: ${phase.name} --`, on)}\n`);
  if (phase.hint) process.stderr.write(`    ${color('dim', phase.hint, on)}\n`);
  const r = await spawnArgv(phase.cmd[0]!, phase.cmd.slice(1), { stdio: 'inherit' });
  if (r.exitCode !== 0) {
    process.stderr.write(
      `\n${color('red', `Verify aborted at ${phase.name}`, on)} (exit ${r.exitCode}).\n`,
    );
    process.stderr.write(`Re-run with: ${color('cyan', phase.cmd.join(' '), on)}\n`);
    failed = r.exitCode;
    break;
  }
}

const elapsedSec = Math.round((Date.now() - start) / 1000);

if (failed === 0) {
  process.stderr.write(
    `\n${color('green', 'Workspace verified — ready to develop.', on)} ${color('dim', `(${elapsedSec}s)`, on)}\n`,
  );
  process.exit(0);
} else {
  process.exit(failed);
}
