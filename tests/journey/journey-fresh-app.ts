/**
 * journey-fresh-app — the cold-start experience: scaffold the `create-liteship`
 * starter, wire it to the PACKED tarballs (never the registry), install, and prove
 * a headless `astro build` emits the adaptive-rendering markers.
 *
 * The journey invokes the executable resolved from the packed consumer's own
 * install under both npm and pnpm. The load-bearing assertion is that each
 * strict one-install consumer resolves `liteship/genui` through the facade's
 * own dependency graph with an exact runtime namespace/reference match to
 * `@liteship/genui`, and that each
 * built `dist/**` HTML carries BOTH `data-liteship-boundary` (the serialized
 * boundary identity `adaptiveAttrs` emits) AND
 * `data-liteship-directive="adaptive"` (the directive-boot marker) — the end-to-end
 * proof that a fresh consumer's `define → apply` authoring reaches the shipped page.
 *
 * @module
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { spawnArgvCapture } from '../../scripts/lib/spawn.js';
import {
  boundedJourneyOutput,
  findFiles,
  installConsumer,
  journeyAssert,
  parseReceipt,
  proveInstalledRuntimeFacadeIdentity,
  rewriteConsumerToTarballs,
  removeDir,
  runConsumerScript,
  runInstalledLiteshipCli,
  scaffoldConsumer,
  type ConsumerPackageManager,
  type JourneyResult,
  type PackedWorkspace,
} from './harness.js';

const MANAGERS: readonly ConsumerPackageManager[] = ['npm', 'pnpm'];

async function proveGenuiFacadeIdentity(appDir: string, manager: ConsumerPackageManager): Promise<number> {
  const proof = await proveInstalledRuntimeFacadeIdentity(appDir, 'liteship/genui', '@liteship/genui');
  journeyAssert(proof.exportNames.length > 0, `${manager} liteship/genui exposed an empty runtime namespace`);

  for (const [role, url] of [
    ['facade', proof.facadeUrl],
    ['owner', proof.ownerUrl],
  ] as const) {
    const normalized = url.replaceAll('\\', '/');
    journeyAssert(normalized.includes('/node_modules/'), `${manager} GenUI ${role} escaped the packed install: ${url}`);
    journeyAssert(
      !normalized.includes('/packages/liteship/') && !normalized.includes('/packages/genui/'),
      `${manager} GenUI ${role} resolved through workspace source instead of packed node_modules: ${url}`,
    );
  }

  return proof.exportNames.length;
}

async function proveOwnedDirectiveEntrypoints(appDir: string, manager: ConsumerPackageManager): Promise<void> {
  const probePath = join(appDir, '.liteship-owned-entrypoints.mjs');
  writeFileSync(
    probePath,
    [
      "import { integration } from 'liteship/astro';",
      "import { pathToFileURL } from 'node:url';",
      'const directives = [];',
      "const hook = integration({ workers: { enabled: true }, wasm: { enabled: true } }).hooks['astro:config:setup'];",
      'const root = pathToFileURL(`${process.cwd()}/`);',
      'await hook({',
      "  command: 'build',",
      '  config: { root, srcDir: new URL("src/", root) },',
      '  updateConfig() {},',
      '  addClientDirective(directive) { directives.push(directive); },',
      '  injectScript() {},',
      '  logger: { info() {} },',
      '});',
      "process.stdout.write(JSON.stringify(directives.filter(({ name }) => name === 'worker' || name === 'wasm')));",
      '',
    ].join('\n'),
  );

  const probe = await spawnArgvCapture(process.execPath, [probePath], { cwd: appDir });
  journeyAssert(
    probe.exitCode === 0,
    `${manager} owned-entrypoint probe failed (exit ${probe.exitCode}):\n${boundedJourneyOutput(probe.stderr || probe.stdout)}`,
  );
  const directives = JSON.parse(probe.stdout) as readonly { readonly name: string; readonly entrypoint: string }[];
  for (const name of ['worker', 'wasm'] as const) {
    const entrypoint = directives.find((entry) => entry.name === name)?.entrypoint;
    journeyAssert(typeof entrypoint === 'string', `${manager} registered no ${name} directive`);
    journeyAssert(
      isAbsolute(entrypoint!),
      `${manager} ${name} directive is not package-owned absolute path: ${entrypoint}`,
    );
    journeyAssert(existsSync(entrypoint!), `${manager} ${name} directive entrypoint does not exist: ${entrypoint}`);
    const normalized = entrypoint!.replaceAll('\\', '/');
    journeyAssert(
      normalized.includes('/node_modules/@liteship/astro/dist/client-directives/'),
      `${manager} ${name} directive escaped the packed Astro owner: ${entrypoint}`,
    );
    journeyAssert(
      normalized.endsWith(`/client-directives/${name}.js`),
      `${manager} ${name} directive did not resolve to packed dist/${name}.js: ${entrypoint}`,
    );
  }
}

interface FreshAppProof {
  readonly htmlCount: number;
  readonly genuiExportCount: number;
}

async function proveManager(manager: ConsumerPackageManager, packed: PackedWorkspace): Promise<FreshAppProof> {
  const appDir = scaffoldConsumer();
  try {
    rewriteConsumerToTarballs(appDir, packed, { packageManager: manager });

    const manifest = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8')) as {
      readonly dependencies?: Readonly<Record<string, string>>;
      readonly scripts?: Readonly<Record<string, string>>;
    };
    journeyAssert(
      JSON.stringify(Object.keys(manifest.dependencies ?? {}).sort()) ===
        JSON.stringify(['astro', 'liteship', 'typescript']),
      `${manager} consumer direct dependencies are not exactly astro + liteship + typescript`,
    );
    journeyAssert(
      manifest.scripts?.['check'] === 'liteship check --profile quick',
      `${manager} consumer does not own the portable check script`,
    );
    journeyAssert(!existsSync(join(appDir, '.npmrc')), `${manager} one-install proof must not enable package hoisting`);

    const install = await installConsumer(appDir, manager);
    if (install.code !== 0) {
      throw new Error(
        `${manager} install failed (exit ${install.code}):\n${boundedJourneyOutput(install.stdout, install.stderr)}`,
      );
    }

    const binDir = join(appDir, 'node_modules', '.bin');
    journeyAssert(
      existsSync(join(binDir, 'liteship')) || existsSync(join(binDir, 'liteship.cmd')),
      `${manager} one-install did not link the facade-owned liteship executable`,
    );

    const genuiExports = await proveGenuiFacadeIdentity(appDir, manager);
    await proveOwnedDirectiveEntrypoints(appDir, manager);

    const check = await runConsumerScript('check', appDir, manager);
    journeyAssert(
      check.code === 0,
      `${manager} project-owned check script failed (exit ${check.code}):\n${boundedJourneyOutput(check.stderr || check.stdout)}`,
    );

    const build = await runInstalledLiteshipCli(['build'], appDir, manager);
    journeyAssert(
      build.code === 0,
      `${manager} installed liteship build failed (exit ${build.code}):\n${boundedJourneyOutput(build.stderr || build.stdout)}`,
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
    return { htmlCount: htmlFiles.length, genuiExportCount: genuiExports };
  } finally {
    removeDir(join(appDir, '..'));
  }
}

export async function journeyFreshApp(packed: PackedWorkspace): Promise<JourneyResult> {
  const name = 'journey-fresh-app';
  try {
    const proofs = new Map<ConsumerPackageManager, FreshAppProof>();
    for (const manager of MANAGERS) proofs.set(manager, await proveManager(manager, packed));

    return {
      name,
      status: 'pass',
      detail:
        `npm (${proofs.get('npm')?.htmlCount} HTML, ${proofs.get('npm')?.genuiExportCount} GenUI exports) + ` +
        `pnpm (${proofs.get('pnpm')?.htmlCount} HTML, ${proofs.get('pnpm')?.genuiExportCount} GenUI exports) ` +
        'packed installs each proved ' +
        'liteship/genui owner identity, ran installed liteship build, and emitted dist with ' +
        'data-liteship-boundary + data-liteship-directive="adaptive"',
      notes: [],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  }
}
