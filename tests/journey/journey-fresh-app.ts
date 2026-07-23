/**
 * journey-fresh-app — the cold-start experience: scaffold the `create-liteship`
 * starter, wire it to the PACKED tarballs (never the registry), install, and prove
 * a headless `astro build` emits the adaptive-rendering markers.
 *
 * The journey invokes the executable resolved from the packed consumer's own
 * install under both npm and pnpm. The load-bearing assertion is that each
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
  type ConsumerPackageManager,
  type JourneyResult,
  type PackedWorkspace,
} from './harness.js';

const MANAGERS: readonly ConsumerPackageManager[] = ['npm', 'pnpm'];

async function proveManager(manager: ConsumerPackageManager, packed: PackedWorkspace): Promise<number> {
  const appDir = scaffoldConsumer();
  try {
    rewriteConsumerToTarballs(appDir, packed, { packageManager: manager });

    const install = await installConsumer(appDir, manager);
    if (install.code !== 0) {
      const blob = install.stdout + install.stderr;
      throw new Error(`${manager} install failed (exit ${install.code}):\n${blob.slice(-1200)}`);
    }

    const build = await runInstalledLiteshipCli(['build'], appDir, manager);
    journeyAssert(
      build.code === 0,
      `${manager} installed liteship build failed (exit ${build.code}):\n${(build.stderr || build.stdout).slice(-1200)}`,
    );
    const receipt = parseReceipt(build.stdout);
    journeyAssert(
      receipt['status'] === 'ok',
      `${manager} build receipt status was ${String(receipt['status'])}, not ok`,
    );
    journeyAssert(receipt['command'] === 'build', `${manager} build receipt command was ${String(receipt['command'])}`);
    journeyAssert(receipt['host'] === 'astro', `${manager} build selected ${String(receipt['host'])}, not astro`);
    journeyAssert(
      receipt['packageManager'] === manager,
      `${manager} build receipt reported package manager ${String(receipt['packageManager'])}`,
    );
    journeyAssert(receipt['exitCode'] === 0, `${manager} build receipt exitCode was ${String(receipt['exitCode'])}`);

    const distDir = join(appDir, 'dist');
    journeyAssert(existsSync(distDir), `${manager} build emitted no dist/`);
    const htmlFiles = findFiles(distDir, '.html');
    journeyAssert(htmlFiles.length > 0, `${manager} build emitted no HTML files`);

    const boundaryHit = htmlFiles.some((file) => readFileSync(file, 'utf8').includes('data-liteship-boundary'));
    const directiveHit = htmlFiles.some((file) =>
      readFileSync(file, 'utf8').includes('data-liteship-directive="adaptive"'),
    );
    journeyAssert(boundaryHit, `${manager} built HTML contains no data-liteship-boundary`);
    journeyAssert(directiveHit, `${manager} built HTML contains no data-liteship-directive="adaptive"`);
    return htmlFiles.length;
  } finally {
    removeDir(join(appDir, '..'));
  }
}

export async function journeyFreshApp(packed: PackedWorkspace): Promise<JourneyResult> {
  const name = 'journey-fresh-app';
  try {
    const htmlCounts = new Map<ConsumerPackageManager, number>();
    for (const manager of MANAGERS) htmlCounts.set(manager, await proveManager(manager, packed));

    return {
      name,
      status: 'pass',
      detail:
        `npm (${htmlCounts.get('npm')} HTML) + pnpm (${htmlCounts.get('pnpm')} HTML) packed installs each ran ` +
        'installed liteship build and emitted dist with data-liteship-boundary + data-liteship-directive="adaptive"',
      notes: [],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  }
}
