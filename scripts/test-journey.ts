/**
 * `test:journey` — the consumer-JOURNEY harness (root script `pnpm run test:journey`,
 * registered check `check/journey`).
 *
 * A thin orchestrator (mirroring `scripts/test-astro.ts`): it packs every publishable
 * scope ONCE, runs the seven end-to-end consumer journeys, prints a clear PASS / FAIL /
 * GATE line per journey, and exits 0 only when every journey passed. A GATE records
 * why a claim could not run, but authoritative consumer evidence is fail-closed:
 * unexecuted is not green.
 *
 * The journeys prove the real consumer experience against REAL packed artifacts and a
 * REAL headless `astro build` — never mocks:
 *   1. journey-fresh-app          scaffold → packed install → installed CLI build → data-liteship-* HTML
 *   2. journey-add-feature        defineAdaptive hero → rebuild → markup == plan()/explain()
 *   3. journey-debug-diagnostic   plant misconfig → check names a stable code → explain it
 *   4. journey-upgrade            prior-pinned consumer → current packed build → still green
 *   5. journey-package-author     liteship/schema + /evidence typecheck (node16 + bundler)
 *   6. journey-cold-agent-context context pointers all name real files
 *   7. journey-installed-add      packed installed CLI lists + byte-faithfully copies a fragment
 *
 * This script runs ONLY via `test:journey` — `tests/journey/**` is deliberately kept
 * out of `nodeTestInclude` (vitest.shared.ts), so it never rides `check/test`.
 *
 * @module
 */

import { journeyFreshApp } from '../tests/journey/journey-fresh-app.js';
import { journeyAddFeature } from '../tests/journey/journey-add-feature.js';
import { journeyDebugDiagnostic } from '../tests/journey/journey-debug-diagnostic.js';
import { journeyUpgrade } from '../tests/journey/journey-upgrade.js';
import { journeyPackageAuthor } from '../tests/journey/journey-package-author.js';
import { journeyColdAgentContext } from '../tests/journey/journey-cold-agent-context.js';
import { journeyInstalledAdd } from '../tests/journey/journey-installed-add.js';
import { packWorkspace, removeDir, type JourneyResult, type PackedWorkspace } from '../tests/journey/harness.js';

/** Print a single aligned result line: `PASS  journey-name  — detail`. */
function printResult(result: JourneyResult): void {
  const mark = result.status === 'pass' ? 'PASS' : result.status === 'gated' ? 'GATE' : 'FAIL';
  console.log(`  ${mark}  ${result.name.padEnd(28, ' ')}  ${result.detail}`);
  for (const note of result.notes) console.log(`        note: ${note}`);
}

async function main(): Promise<void> {
  console.log('\n=== liteship consumer-journey harness ===\n');

  const results: JourneyResult[] = [];

  // Pack the workspace ONCE — journeys 1, 2, 4 share the tarballs.
  let packed: PackedWorkspace | undefined;
  let packError: string | undefined;
  console.log('[pack] packing every publishable scope in-workspace (ignore-scripts)...');
  try {
    packed = await packWorkspace();
    console.log(`[pack] packed ${packed.tarballByName.size} tarballs.\n`);
  } catch (error) {
    packError = error instanceof Error ? error.message : String(error);
    console.log(`[pack] FAILED: ${packError}\n`);
  }

  try {
    // Tarball-consuming journeys (1, 2, 4, 7). Packing is part of their claim;
    // unavailable packing is a failure, not green evidence.
    const tarballJourneys = [
      { id: 'journey-fresh-app', run: journeyFreshApp },
      { id: 'journey-add-feature', run: journeyAddFeature },
      { id: 'journey-upgrade', run: journeyUpgrade },
      { id: 'journey-installed-add', run: journeyInstalledAdd },
    ] as const;
    for (const { id, run } of tarballJourneys) {
      if (packed === undefined) {
        results.push({
          name: id,
          status: 'fail',
          detail: 'workspace packing unavailable',
          notes: [`packWorkspace failed: ${packError ?? 'unknown'}`],
        });
      } else {
        results.push(await run(packed));
      }
    }

    // Tarball-free journeys (3, 5, 6).
    results.push(await journeyDebugDiagnostic());
    results.push(await journeyPackageAuthor());
    results.push(await journeyColdAgentContext());
  } finally {
    removeDir(packed?.tarballDir);
  }

  console.log('');
  for (const result of results) printResult(result);
  console.log('');

  const failed = results.filter((r) => r.status === 'fail');
  const gated = results.filter((r) => r.status === 'gated');
  if (failed.length > 0 || gated.length > 0) {
    console.log(
      `=== JOURNEY FAILED — ${failed.length} failed, ${gated.length} unverified of ${results.length} journeys ===\n`,
    );
    process.exit(1);
  }
  console.log(`=== ALL ${results.length} JOURNEYS GREEN ===\n`);
}

main().catch((error) => {
  console.error('Unexpected journey-harness error:', error);
  process.exit(1);
});
