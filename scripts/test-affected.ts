import { assertAffectedPlanHead, createAffectedPlan, readGitSha } from './affected-plan.js';
import { parseAffectedTestPlan } from './lib/affected-test-plan.js';
import { runPnpm } from './support/pnpm-process.js';

const cwd = process.cwd();
const base = process.env['LITESHIP_AFFECTED_BASE'] ?? 'origin/main';
const supplied = process.env['LITESHIP_AFFECTED_PLAN'];
const plan =
  supplied === undefined ? createAffectedPlan(cwd, base) : parseAffectedTestPlan(JSON.parse(supplied) as unknown);
if (supplied !== undefined) assertAffectedPlanHead(plan, readGitSha(cwd, 'HEAD'));

process.stdout.write(`[affected] ${plan.mode}: ${plan.reason}\n`);
if (plan.affectedPackages.length > 0)
  process.stdout.write(`[affected] packages: ${plan.affectedPackages.join(', ')}\n`);
const args =
  plan.mode === 'full' ? ['test'] : ['exec', 'vitest', 'run', '--config', 'vitest.config.ts', ...plan.testFiles];
const result = await runPnpm(args, { cwd });
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.code);
