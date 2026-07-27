/**
 * Fail closed when the governed-exception view refuses — locally, at commit
 * time, instead of first inside CI's delivery-evidence-collect job.
 *
 * CI run 30165793375 failed there with "governed exception … is stale;
 * refusing the view": a recorded exception outlived the tree it described,
 * and no local authority evaluated the view before push. This gate runs the
 * SAME semantic projection (scripts/lib/governed-exceptions.ts) with a
 * prospective commit date, so staged canonical-owner edits remain committable
 * while stale, expired, divergent, and unsigned records bite locally first.
 * Final delivery evidence separately requires clean committed provenance.
 */

import { buildProspectiveGovernedExceptionView } from './lib/governed-exceptions.js';

try {
  const view = buildProspectiveGovernedExceptionView(process.cwd(), new Date());
  process.stdout.write(`governed-exceptions: ${view.length} active exception(s); the view is admissible.\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    [
      `governed-exceptions: the view refused — ${message}`,
      'Fix or retire the stale/expired exception record now: CI delivery-evidence-collect',
      'evaluates this same view and fails there otherwise (after the tests already ran).',
    ].join('\n') + '\n',
  );
  process.exitCode = 1;
}
