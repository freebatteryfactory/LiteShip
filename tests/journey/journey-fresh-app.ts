/**
 * journey-fresh-app — the cold-start experience: scaffold the `create-liteship`
 * starter, wire it to the PACKED tarballs (never the registry), install, and prove
 * a headless `astro build` emits the adaptive-rendering markers.
 *
 * The journey invokes the executable resolved from the packed consumer's own
 * install (`pnpm exec liteship build`). The load-bearing assertion is that the
 * built `dist/**` HTML carries BOTH `data-liteship-boundary` (the serialized
 * boundary identity `adaptiveAttrs` emits) AND
 * `data-liteship-directive="adaptive"` (the directive-boot marker) — the end-to-end
 * proof that a fresh consumer's `define → apply` authoring reaches the shipped page.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  findFiles,
  installConsumer,
  journeyAssert,
  parseReceipt,
  rewriteConsumerToTarballs,
  removeDir,
  runInstalledLiteshipCli,
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
      throw new Error(`pnpm install failed (exit ${install.code}):\n${blob.slice(-1200)}`);
    }

    const build = await runInstalledLiteshipCli(['build'], appDir);
    journeyAssert(
      build.code === 0,
      `installed liteship build failed (exit ${build.code}):\n${(build.stderr || build.stdout).slice(-1200)}`,
    );
    const receipt = parseReceipt(build.stdout);
    journeyAssert(receipt['status'] === 'ok', `liteship build receipt status was ${String(receipt['status'])}, not ok`);
    journeyAssert(receipt['command'] === 'build', `liteship build receipt command was ${String(receipt['command'])}`);
    journeyAssert(receipt['host'] === 'astro', `liteship build selected ${String(receipt['host'])}, not astro`);
    journeyAssert(receipt['exitCode'] === 0, `liteship build receipt exitCode was ${String(receipt['exitCode'])}`);

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
      detail: `scaffold → packed-tarball install → installed liteship build (astro, exit 0) → ${htmlFiles.length} HTML file(s) carry data-liteship-boundary + data-liteship-directive="adaptive"`,
      notes: [],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    // The scaffolded app lives two levels up from projectDir's `app/` — remove the mkdtemp root.
    removeDir(appDir === undefined ? undefined : join(appDir, '..'));
  }
}
