/**
 * journey-fresh-app — the cold-start experience: scaffold the `create-liteship`
 * starter, wire it to the PACKED tarballs (never the registry), install, and prove
 * a headless `astro build` emits the adaptive-rendering markers.
 *
 * The load-bearing assertion: the built `dist/**` HTML carries BOTH
 * `data-liteship-boundary` (the serialized boundary identity `adaptiveAttrs`
 * emits) AND `data-liteship-directive="adaptive"` (the directive-boot marker) — the
 * end-to-end proof that a fresh consumer's `define → apply` authoring reaches the
 * shipped page.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
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

export async function journeyFreshApp(packed: PackedWorkspace): Promise<JourneyResult> {
  const name = 'journey-fresh-app';
  let appDir: string | undefined;
  try {
    appDir = scaffoldConsumer();
    rewriteConsumerToTarballs(appDir, packed);

    const install = await installConsumer(appDir);
    if (install.code !== 0) {
      const blob = install.stdout + install.stderr;
      if (isOfflineOrNetworkError(blob)) {
        return {
          name,
          status: 'gated',
          detail: 'scaffold + pack succeeded; install could not reach a registry for store-missing deps',
          notes: ['pnpm install --prefer-offline hit a store miss with no reachable registry (offline sandbox)'],
        };
      }
      throw new Error(`pnpm install failed (exit ${install.code}):\n${blob.slice(-1200)}`);
    }

    const build = await astroBuild(appDir);
    journeyAssert(
      build.code === 0,
      `astro build failed (exit ${build.code}):\n${(build.stderr || build.stdout).slice(-1200)}`,
    );

    const distDir = join(appDir, 'dist');
    journeyAssert(existsSync(distDir), 'dist/ was not emitted by astro build');
    const htmlFiles = findFiles(distDir, '.html');
    journeyAssert(htmlFiles.length > 0, 'astro build emitted no HTML files');

    const boundaryHit = htmlFiles.some((f) => readFileSync(f, 'utf8').includes('data-liteship-boundary'));
    const directiveHit = htmlFiles.some((f) => readFileSync(f, 'utf8').includes('data-liteship-directive="adaptive"'));
    journeyAssert(boundaryHit, 'no built HTML contains data-liteship-boundary');
    journeyAssert(directiveHit, 'no built HTML contains data-liteship-directive="adaptive"');

    return {
      name,
      status: 'pass',
      detail: `scaffold → packed-tarball install → astro build → ${htmlFiles.length} HTML file(s) carry data-liteship-boundary + data-liteship-directive="adaptive"`,
      notes: [],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    // The scaffolded app lives two levels up from projectDir's `app/` — remove the mkdtemp root.
    removeDir(appDir === undefined ? undefined : join(appDir, '..'));
  }
}
