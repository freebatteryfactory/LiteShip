/**
 * journey-upgrade — prove a consumer built from the exact pre-operation
 * implementation (`2141ec25`) can take the explicit pre-1.0 source migration,
 * install the current packed fleet, and rebuild green.
 *
 * This is a genuine two-version control. The prior phase is exported from Git,
 * installed, built, and packed independently; it emits the old `data-czap-*`
 * wire marker. The migration then applies the current canonical starter source,
 * replaces the prior tarballs with the current packed fleet, and drives the
 * installed current `liteship build`, which must emit `data-liteship-*`.
 *
 * There is deliberately no compatibility alias: LiteShip is pre-1.0 and the
 * ratified policy is explicit source migration rather than an immortal shim.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyCurrentScaffoldMigration,
  astroBuild,
  findFiles,
  installConsumer,
  journeyAssert,
  packPriorOperationBase,
  parseReceipt,
  PRIOR_OPERATION_BASE,
  removeDir,
  rewriteConsumerToTarballs,
  rewritePriorConsumerToTarballs,
  runInstalledLiteshipCli,
  scaffoldPriorConsumer,
  type JourneyResult,
  type PackedWorkspace,
  type PriorPackedWorkspace,
} from './harness.js';

/** True iff any built HTML carries `marker`. */
function builtWithMarker(appDir: string, marker: string): boolean {
  const dist = join(appDir, 'dist');
  return existsSync(dist) && findFiles(dist, '.html').some((file) => readFileSync(file, 'utf8').includes(marker));
}

export async function journeyUpgrade(current: PackedWorkspace): Promise<JourneyResult> {
  const name = 'journey-upgrade';
  let prior: PriorPackedWorkspace | undefined;
  let appDir: string | undefined;
  try {
    // Phase A: real historical implementation, not a current-tarball range label.
    prior = await packPriorOperationBase();
    appDir = scaffoldPriorConsumer(prior);
    rewritePriorConsumerToTarballs(appDir, prior);

    const priorInstall = await installConsumer(appDir);
    journeyAssert(
      priorInstall.code === 0,
      `prior-control consumer install failed (exit ${priorInstall.code}):\n${(
        priorInstall.stdout + priorInstall.stderr
      ).slice(-1200)}`,
    );
    const priorBuild = await astroBuild(appDir);
    journeyAssert(
      priorBuild.code === 0,
      `prior-control consumer build failed (exit ${priorBuild.code}):\n${(priorBuild.stderr || priorBuild.stdout).slice(
        -1200,
      )}`,
    );
    journeyAssert(
      builtWithMarker(appDir, 'data-czap-boundary'),
      `consumer built from ${PRIOR_OPERATION_BASE} emitted no data-czap-boundary marker`,
    );

    // Phase B: apply the explicit breaking source migration, then install the
    // current fleet over the same consumer and drive its installed public CLI.
    applyCurrentScaffoldMigration(appDir);
    rewriteConsumerToTarballs(appDir, current);

    const currentInstall = await installConsumer(appDir);
    journeyAssert(
      currentInstall.code === 0,
      `current upgrade install failed (exit ${currentInstall.code}):\n${(
        currentInstall.stdout + currentInstall.stderr
      ).slice(-1200)}`,
    );
    const currentBuild = await runInstalledLiteshipCli(['build'], appDir);
    journeyAssert(
      currentBuild.code === 0,
      `installed current liteship build failed (exit ${currentBuild.code}):\n${(
        currentBuild.stderr || currentBuild.stdout
      ).slice(-1200)}`,
    );
    const receipt = parseReceipt(currentBuild.stdout);
    journeyAssert(receipt['status'] === 'ok', `current build receipt status was ${String(receipt['status'])}`);
    journeyAssert(receipt['host'] === 'astro', `current build selected ${String(receipt['host'])}, not astro`);
    journeyAssert(
      builtWithMarker(appDir, 'data-liteship-boundary'),
      'post-migration current build emitted no data-liteship-boundary marker',
    );

    return {
      name,
      status: 'pass',
      detail:
        `${PRIOR_OPERATION_BASE} source built + packed a real data-czap consumer; explicit pre-1.0 source migration ` +
        'installed the current packed fleet and rebuilt data-liteship output through the installed CLI',
      notes: ['no compatibility alias and no current-to-current range substitution'],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    removeDir(appDir === undefined ? undefined : join(appDir, '..'));
    removeDir(prior?.rootDir);
  }
}
