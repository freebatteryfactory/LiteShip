/**
 * journey-upgrade — a consumer pinned to a PRIOR `liteship` range takes the current
 * packed build and rebuilds green.
 *
 * Phase A stands up a "prior-version fixture consumer": the scaffolded starter with
 * its `liteship` dependency pinned to a PRIOR range (`^0.17.0`) — the manifest an app
 * authored against the last release carries. Phase B performs the upgrade: bump the
 * range to the current `^0.18.0`, reinstall over the existing tree, and rebuild. Both
 * builds must stay green (dist HTML carrying `data-liteship-boundary`).
 *
 * ENV-GATE (honest): a genuinely-distinct PRIOR PUBLISHED `liteship@0.17.x` cannot be
 * fetched here — the package is unpublished and the sandbox is offline-first. Both
 * phases therefore resolve, via `pnpm.overrides`, to the CURRENT packed tarballs; the
 * journey proves the manifest-range upgrade + reinstall + rebuild sequence stays
 * green, and records the unfetchable-prior-artifact as a note rather than faking a
 * second version.
 *
 * @module
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  astroBuild,
  findFiles,
  installConsumer,
  isOfflineOrNetworkError,
  journeyAssert,
  rewriteConsumerToTarballs,
  removeDir,
  scaffoldConsumer,
  type JourneyResult,
  type PackedWorkspace,
} from './harness.js';

const PRIOR_RANGE = '^0.17.0';
const CURRENT_RANGE = '^0.18.0';

/** True iff any built HTML under `appDir/dist` carries the adaptive boundary marker. */
function builtGreen(appDir: string): boolean {
  const dist = join(appDir, 'dist');
  if (!existsSync(dist)) return false;
  return findFiles(dist, '.html').some((f) => readFileSync(f, 'utf8').includes('data-liteship-boundary'));
}

export async function journeyUpgrade(packed: PackedWorkspace): Promise<JourneyResult> {
  const name = 'journey-upgrade';
  let appDir: string | undefined;
  try {
    // Phase A — the prior-version fixture consumer (liteship pinned to ^0.17.0).
    appDir = scaffoldConsumer();
    rewriteConsumerToTarballs(appDir, packed, { liteshipSpec: PRIOR_RANGE });

    const installA = await installConsumer(appDir);
    if (installA.code !== 0) {
      const blob = installA.stdout + installA.stderr;
      if (isOfflineOrNetworkError(blob)) {
        return {
          name,
          status: 'gated',
          detail: 'prior-version fixture scaffolded; install could not reach a registry for store-missing deps',
          notes: ['pnpm install --prefer-offline hit a store miss with no reachable registry (offline sandbox)'],
        };
      }
      throw new Error(`prior-version install failed (exit ${installA.code}):\n${blob.slice(-1200)}`);
    }
    const buildA = await astroBuild(appDir);
    journeyAssert(
      buildA.code === 0,
      `prior-version build failed (exit ${buildA.code}):\n${(buildA.stderr || buildA.stdout).slice(-1000)}`,
    );
    journeyAssert(builtGreen(appDir), 'prior-version build emitted no data-liteship-boundary HTML');

    // Phase B — the upgrade: bump the range to current, reinstall over the tree, rebuild.
    const manifestPath = join(appDir, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { dependencies: Record<string, string> };
    manifest.dependencies['liteship'] = CURRENT_RANGE;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const installB = await installConsumer(appDir);
    journeyAssert(
      installB.code === 0,
      `upgrade install failed (exit ${installB.code}):\n${(installB.stdout + installB.stderr).slice(-1000)}`,
    );
    const buildB = await astroBuild(appDir);
    journeyAssert(
      buildB.code === 0,
      `upgrade build failed (exit ${buildB.code}):\n${(buildB.stderr || buildB.stdout).slice(-1000)}`,
    );
    journeyAssert(builtGreen(appDir), 'post-upgrade build emitted no data-liteship-boundary HTML');

    return {
      name,
      status: 'pass',
      detail: `prior-pinned (${PRIOR_RANGE}) consumer built green → range bumped to ${CURRENT_RANGE} → reinstall + rebuild still green`,
      notes: [
        'the real prior-published liteship@0.17.x tarball is unfetchable (unpublished / offline sandbox); both phases resolve to the CURRENT packed tarballs via pnpm.overrides, proving the range-upgrade + reinstall + rebuild sequence stays green',
      ],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    removeDir(appDir === undefined ? undefined : join(appDir, '..'));
  }
}
