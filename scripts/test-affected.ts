import { PACKAGE_CATALOG } from './package-catalog.js';
import { buildAssuranceInventory } from './lib/assurance-inventory.js';
import { planAffectedTests } from './lib/affected-test-plan.js';
import { spawnArgvCapture } from './lib/spawn.js';
import { runPnpm } from './support/pnpm-process.js';

const cwd = process.cwd();
const base = process.env['LITESHIP_AFFECTED_BASE'] ?? 'origin/main';
const diff = await spawnArgvCapture('git', ['diff', '--name-only', `${base}...HEAD`], {
  cwd,
  captureBytes: 1024 * 1024,
});
const changedPaths =
  diff.exitCode === 0 ? diff.stdout.split(/\r?\n/u).filter(Boolean) : ['package.json']; // Fail broad when the base cannot be resolved.
const plan = planAffectedTests(changedPaths, PACKAGE_CATALOG, buildAssuranceInventory(cwd));

if (process.argv.includes('--print-plan')) {
  process.stdout.write(`${JSON.stringify(plan)}\n`);
  process.exit(0);
}

process.stdout.write(`[affected] ${plan.mode}: ${plan.reason}\n`);
if (plan.affectedPackages.length > 0)
  process.stdout.write(`[affected] packages: ${plan.affectedPackages.join(', ')}\n`);
const args =
  plan.mode === 'full' ? ['test'] : ['exec', 'vitest', 'run', '--config', 'vitest.config.ts', ...plan.testFiles];
const result = await runPnpm(args, { cwd });
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.code);
