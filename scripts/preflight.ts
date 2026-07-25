/**
 * Builder preflight — the ONE command an agent or human runs to self-verify a
 * slice before claiming green (scar S6.3, "builder green ≠ full-gate green").
 *
 * The recurring tax the ledger records: a builder reports green, then prettier
 * (`format:check`) and typedoc freshness (`docs:check`) bite at commit time
 * (Waves 0, 1, 4, 5.5, 6). This script runs the exact FAST pre-commit subset a
 * builder must clear — the same checks the gauntlet/CI run, invoked the same
 * way — so the bite happens on the builder's own turn, not at integration.
 *
 * Scope: the fast lane ONLY. No full vitest, no browser, no e2e, no bench.
 * An optional trailing arg runs the builder's OWN targeted test(s) as a final
 * step:  `pnpm preflight tests/unit/core/cell-kernel.test.ts`.
 *
 * Authority: this is a convenience + discipline WRAPPER over the existing
 * scripts. It mints no new gate and changes no gate's authority — each step is
 * `pnpm run <existing-script>`, so the sub-checks remain the sole authorities.
 * A green preflight is NECESSARY for a green claim, never sufficient on its own
 * (integration owns the global gates; see docs/plan/scar-ledger.md S6.3).
 *
 * Fail-fast: steps run cheapest→heaviest and STOP at the first failure, so a
 * broken slice surfaces the first problem quickly instead of paying for the
 * heavy typedoc build behind a one-line lint error.
 *
 * @module
 */

import { spawnArgv, spawnArgvCapture } from './lib/spawn.js';
import { isDirectExecution } from './audit/shared.js';
import { buildLocalVerificationPlan } from './lib/local-verification-plan.js';
import {
  formatLocalResourcePlan,
  sampleLocalResources,
  selectLocalResourcePlan,
} from './lib/local-resource-profile.js';

/** One preflight step: a label plus the `pnpm run` script it invokes. */
const RULE = '='.repeat(64);

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Run one `pnpm run <script>` step with fully visible output. */
async function runStep(label: string, args: readonly string[]): Promise<number> {
  console.log(`\n${RULE}`);
  console.log(`  preflight → ${label}`);
  console.log(RULE);
  const start = Date.now();
  const result = await spawnArgv('pnpm', args, {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  const durationMs = Date.now() - start;
  console.log(`  ${label} ${result.exitCode === 0 ? 'ok' : 'FAILED'} (${formatDuration(durationMs)})`);
  return result.exitCode;
}

const HELP = `Builder preflight — the fast pre-commit self-verify (scar S6.3).

Usage:
  pnpm preflight [--staged] [--plan] [--json] [test-path...]

--staged limits the expensive TypeDoc proof to staged TypeDoc inputs. The
remaining static authorities always run. --plan prints the exact execution plan
without running it; combine with --json for an agent-readable receipt.

With a trailing path (or several), also runs your OWN targeted test(s) as the
final step, e.g.:
  pnpm preflight tests/unit/core/cell-kernel.test.ts

The fast lane only — no full vitest sweep, no browser, no e2e. A green
preflight is necessary before claiming green, never sufficient on its own:
integration owns the global gates.`;

async function main(argv: readonly string[]): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }

  const staged = argv.includes('--staged');
  const printPlan = argv.includes('--plan');
  const json = argv.includes('--json');
  let changedPaths: readonly string[] | undefined;
  if (staged) {
    const changed = await spawnArgvCapture('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRD']);
    if (changed.exitCode !== 0) {
      console.error(
        `preflight — cannot inspect staged paths: ${changed.stderr.trim() || `git exit ${changed.exitCode}`}`,
      );
      process.exit(1);
    }
    changedPaths = changed.stdout.split(/\r?\n/u).filter(Boolean);
  }
  const plan = buildLocalVerificationPlan({ staged, ...(changedPaths === undefined ? {} : { changedPaths }) });
  const resourcePlan = selectLocalResourcePlan(await sampleLocalResources(), {
    ci: process.env.CI === 'true',
    allowSwap: process.env.LITESHIP_DOCS_USE_SWAP === '1',
  });
  if (printPlan) {
    if (json) console.log(JSON.stringify({ ...plan, resource: resourcePlan }, null, 2));
    else {
      console.log(`preflight plan (${plan.mode}; docs=${plan.docsReason})`);
      console.log(formatLocalResourcePlan(resourcePlan));
      for (const step of plan.steps) console.log(`- pnpm ${step.argv.join(' ')}`);
    }
    return;
  }

  const testTargets = argv.filter((arg) => !arg.startsWith('-'));
  const overallStart = Date.now();

  console.log(`[preflight] mode=${plan.mode} docs=${plan.docsReason}`);
  console.log(formatLocalResourcePlan(resourcePlan));
  const inheritedWorkers = process.env.LITESHIP_NATIVE_TSC_WORKERS;
  if (inheritedWorkers === undefined) {
    process.env.LITESHIP_NATIVE_TSC_WORKERS = String(resourcePlan.nativeTypeScriptWorkers);
  }

  for (const step of plan.steps) {
    const exitCode = await runStep(step.label, step.argv);
    if (exitCode !== 0) {
      console.error(`\n${RULE}`);
      console.error('  PREFLIGHT FAILED');
      console.error(RULE);
      console.error(`\n  step: ${step.label} (exit ${exitCode})`);
      console.error(`  fix:  ${step.remedy}`);
      console.error('\n  Remaining steps were skipped (fail-fast). Not green.\n');
      process.exit(1);
    }
  }

  if (testTargets.length > 0) {
    const exitCode = await runStep(`test ${testTargets.join(' ')}`, ['run', 'test', ...testTargets]);
    if (exitCode !== 0) {
      console.error(`\n${RULE}`);
      console.error('  PREFLIGHT FAILED');
      console.error(RULE);
      console.error(`\n  step: targeted test (exit ${exitCode})`);
      console.error(`  fix:  make the failing assertions above pass. Not green.\n`);
      process.exit(1);
    }
  }

  const totalMs = Date.now() - overallStart;
  console.log(`\n${RULE}`);
  console.log('  PREFLIGHT PASSED');
  console.log(RULE);
  console.log(
    `\n  ${plan.steps.length} static checks${testTargets.length > 0 ? ' + targeted tests' : ''} green in ${formatDuration(totalMs)}.`,
  );
  console.log('  Necessary, not sufficient — integration owns the global gates.\n');
  if (inheritedWorkers === undefined) delete process.env.LITESHIP_NATIVE_TSC_WORKERS;
}

if (isDirectExecution(import.meta.url)) {
  void main(process.argv.slice(2));
}
