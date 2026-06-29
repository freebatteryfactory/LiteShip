/**
 * package-smoke (CLI adapter, CUT A5) — thin projection over `@czap/command`'s
 * package-smoke handler (the release-grade pack/install/import smoke, migrated
 * from `scripts/package-smoke.ts`). The pass/fail decision lives in
 * `@czap/command`; the CLI is the ONLY adapter that wires the heavy
 * `runPackageSmoke` capability: it spawns `pnpm pack` per publishable scope,
 * installs the tarballs into an isolated consumer fixture, asserts no `workspace:`
 * leak, and import-smokes every declared specifier (plus the `czap` binstub).
 * `@czap/command` and `@czap/mcp-server` never see the subprocess engine. Exit 0
 * ok, 1 gate failed.
 *
 * @module
 */
import { cpSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  packageSmokeCommand,
  type PackageSmokePayload,
  type PackageSmokeSummary,
  PACKAGES,
  PEER_INSTALLS,
  type PackageSmokeSpec,
} from '@czap/command';
import type { CommandContext } from '@czap/command';
import { IntegrityError, InvariantViolationError } from '@czap/error';
import {
  assertConsumerDependencyInstalled,
  findConsumerDependencyRoot,
  peerDependenciesOnly as peerDependenciesOnlyHelper,
  resolveExecutable,
  tarballFileUrl,
} from '../lib/package-smoke-helpers.js';
import { emit, type WallClockTimestamp } from '../receipts.js';

/** `PEER_INSTALLS` → `{name: version}` map (the extracted, unit-tested helper). */
function peerDependenciesOnly(): Record<string, string> {
  return peerDependenciesOnlyHelper(PEER_INSTALLS);
}

/** Receipt emitted by `czap package-smoke`. */
export interface PackageSmokeReceipt extends PackageSmokePayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'package-smoke';
  readonly timestamp: WallClockTimestamp;
}

/**
 * Scratch root for pack/install smoke. On Windows use a repo-local dir so we never
 * depend on `%TEMP%` short paths; POSIX keeps `os.tmpdir()` to avoid writing under
 * the workspace on dev machines.
 */
async function createScratchDir(root: string): Promise<string> {
  if (process.platform === 'win32') {
    const base = join(root, 'node_modules', '.cache', 'package-smoke');
    await mkdir(base, { recursive: true });
    return mkdtemp(join(base, 'run-'));
  }
  return mkdtemp(join(tmpdir(), 'czap-package-smoke-'));
}

function run(command: string, args: readonly string[], cwd: string): string {
  const executable = resolveExecutable(command);
  // Node-wrapper case (JS pnpm CLI): `executable` is node and `npm_execpath` is
  // the script arg. Native-binary case (@pnpm/exe) or plain command: args go
  // straight to the executable.
  const commandArgs =
    command === 'pnpm' && executable === process.execPath && process.env['npm_execpath']
      ? [process.env['npm_execpath'], ...args]
      : args;
  return execFileSync(executable, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

/** Read `package/package.json` from a `pnpm pack` tarball (layout-stable on every OS). */
function readPackedManifest(tarballPath: string): {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
} {
  const raw = execFileSync('tar', ['-xOf', tarballPath, 'package/package.json'], { encoding: 'utf8' });
  return JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
}

/** Expand a `pnpm pack` tarball into `node_modules/@czap/<name>/` (Windows-safe). */
function extractPackedPackage(tarballPath: string, destinationDir: string): void {
  mkdirSync(destinationDir, { recursive: true });
  execFileSync('tar', ['-xzf', tarballPath, '-C', destinationDir, '--strip-components=1'], { stdio: 'inherit' });
}

/** npm deps declared in packed manifests (e.g. mediabunny, cborg) — not installed by tar extract alone. */
function collectPackedExternalDependencies(tarballByPackage: Map<string, string>): Record<string, string> {
  const peers = peerDependenciesOnly();
  const external: Record<string, string> = {};
  for (const pkg of PACKAGES) {
    const manifest = readPackedManifest(tarballByPackage.get(pkg.name)!);
    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      for (const [name, version] of Object.entries(manifest[field] ?? {})) {
        if (name.startsWith('@czap/') || version.startsWith('workspace:') || name in peers) {
          continue;
        }
        external[name] = version;
      }
    }
  }
  return external;
}

/**
 * Tar-extracted `@czap/*` trees live under nested `node_modules/`. Node resolves
 * bare imports from the importing file upward; pnpm's default linker often leaves
 * mediabunny/cborg only at the consumer root. Mirror them beside each package
 * that declares them so `import 'mediabunny'` from `@czap/web/dist/...` works.
 */
function linkHoistedDepsBesidePackedPackages(
  consumerDir: string,
  tarballByPackage: Map<string, string>,
  externalDeps: Record<string, string>,
): void {
  const peers = peerDependenciesOnly();
  const linkable = new Set([...Object.keys(externalDeps), ...Object.keys(peers)]);

  for (const pkg of PACKAGES) {
    const manifest = readPackedManifest(tarballByPackage.get(pkg.name)!);
    const pkgDir = join(consumerDir, 'node_modules', ...pkg.name.split('/'));
    const nestedRoot = join(pkgDir, 'node_modules');

    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      for (const name of Object.keys(manifest[field] ?? {})) {
        if (!linkable.has(name)) {
          continue;
        }
        const source = findConsumerDependencyRoot(consumerDir, name);
        const target = join(nestedRoot, ...name.split('/'));
        if (!source || existsSync(join(target, 'package.json'))) {
          continue;
        }
        mkdirSync(dirname(target), { recursive: true });
        if (process.platform === 'win32') {
          // Junction symlinks are brittle on GHA Windows (ENOENT when the
          // hoisted store path and nested @czap/*/node_modules layout diverge).
          // A recursive copy matches Linux symlink semantics for import-smoke.
          cpSync(source, target, { recursive: true });
        } else {
          symlinkSync(source, target, 'dir');
        }
      }
    }
  }
}

function ensureNoWorkspaceProtocolsInTarball(tarballPath: string, packageName: string): void {
  const pkg = readPackedManifest(tarballPath);

  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const entries = Object.entries(pkg[field] ?? {});
    for (const [dependency, version] of entries) {
      if (version.startsWith('workspace:')) {
        throw IntegrityError(
          'package-smoke',
          `${packageName} packed metadata still contains workspace protocol for ${dependency}: ${version}`,
        );
      }
    }
  }
}

async function packPackage(cwd: string, tarballDir: string): Promise<string> {
  const before = new Set(await readdir(tarballDir));
  run('pnpm', ['pack', '--pack-destination', tarballDir], cwd);
  const after = await readdir(tarballDir);
  const created = after.filter((entry) => !before.has(entry) && entry.endsWith('.tgz'));
  if (created.length !== 1) {
    throw InvariantViolationError(
      'package-smoke pack output',
      `Expected exactly one tarball from ${cwd}, found ${created.length}.`,
    );
  }
  return join(tarballDir, created[0]!);
}

/**
 * The CLI-only `runPackageSmoke` capability: pack/install/import-smoke every
 * publishable scope over the repo at `root`. Ported verbatim from the deleted
 * `scripts/package-smoke.ts` `main()`, but returns a structured verdict instead
 * of self-executing on `process.exit`: any thrown failure is captured into
 * `{ ok:false, failedStep, failure }` keyed by the bracketed step label that was
 * running when it threw. The scratch tree is always removed in `finally`.
 */
export async function runPackageSmokeScan(root: string): Promise<PackageSmokeSummary> {
  const scratch = await createScratchDir(root);
  const tarballDir = join(scratch, 'tarballs');
  const consumerDir = join(scratch, 'consumer');

  await mkdir(tarballDir, { recursive: true });
  await mkdir(consumerDir, { recursive: true });

  // Bracketed step prints so the failing step is identifiable from the CI log
  // alone when artifact download or auth-gated logs aren't reachable. Each
  // step gets a STEP/STEP-OK pair; the failing step's STEP-OK never prints.
  // `currentStep` is captured for the structured verdict on failure.
  let currentStep = 'init';
  const step = (label: string): void => {
    currentStep = label;
    process.stderr.write(`[package:smoke] > ${label} (platform=${process.platform}, arch=${process.arch})\n`);
  };
  const stepOk = (label: string): void => {
    process.stderr.write(`[package:smoke] ok ${label}\n`);
  };

  let packagesPacked = 0;
  let importsSmoked = 0;

  try {
    const tarballByPackage = new Map<string, string>();

    step(`pack ${PACKAGES.length} packages via pnpm pack`);
    for (const pkg of PACKAGES) {
      const cwd = resolve(root, pkg.dir);
      const tarball = await packPackage(cwd, tarballDir);
      tarballByPackage.set(pkg.name, tarball);
      packagesPacked += 1;
    }
    stepOk(`packed ${PACKAGES.length} tarballs into ${tarballDir}`);

    if (process.platform === 'win32') {
      const externalDeps = collectPackedExternalDependencies(tarballByPackage);

      // Install peers + packed externals before extracting @czap/* tarballs. If the
      // scoped trees land first, pnpm treats their package.json deps as already
      // materialized and skips hoisting cborg/mediabunny to the consumer root.
      await writeFile(
        join(consumerDir, 'package.json'),
        JSON.stringify(
          {
            name: 'czap-package-smoke-consumer',
            private: true,
            type: 'module',
            dependencies: { ...peerDependenciesOnly(), ...externalDeps },
          },
          null,
          2,
        ),
      );
      stepOk(
        `consumer package.json written (peers + packed externals: ${Object.keys(externalDeps).join(', ') || 'none'})`,
      );

      await writeFile(join(consumerDir, '.npmrc'), ['node-linker=hoisted', 'public-hoist-pattern[]=*', ''].join('\n'));
      stepOk('consumer .npmrc written (hoisted linker)');

      // Consumer scratch lives under the repo; without --ignore-workspace pnpm
      // treats this as a workspace root install and never materializes cborg/mediabunny here.
      step(`pnpm install consumer dependencies in ${consumerDir}`);
      run('pnpm', ['install', '--ignore-workspace'], consumerDir);
      stepOk('pnpm install complete');

      for (const name of Object.keys(externalDeps)) {
        assertConsumerDependencyInstalled(consumerDir, name);
      }
      stepOk(`verified externals on disk: ${Object.keys(externalDeps).join(', ') || 'none'}`);

      step(`materialize ${PACKAGES.length} packed @czap/* trees under consumer node_modules (Windows)`);
      for (const pkg of PACKAGES) {
        const dest = join(consumerDir, 'node_modules', ...pkg.name.split('/'));
        extractPackedPackage(tarballByPackage.get(pkg.name)!, dest);
      }
      stepOk(`extracted ${PACKAGES.length} @czap/* packages into node_modules`);

      step('link hoisted peers/externals beside tar-extracted @czap/* packages (Windows)');
      linkHoistedDepsBesidePackedPackages(consumerDir, tarballByPackage, externalDeps);
      stepOk('nested node_modules links materialized');
    } else {
      step('build consumer package.json (dependencies + pnpm.overrides as file:// URLs)');
      const dependencies = Object.fromEntries([
        // pnpm accepts `file:<path>` specifiers, but on Windows a raw absolute
        // path like `file:C:\Users\runner\…\.tgz` is malformed (backslashes,
        // drive-letter colon collides with URL scheme parsing). pathToFileURL
        // produces a proper `file:///C:/Users/runner/…/.tgz` URL that pnpm
        // accepts on every platform.
        ...PACKAGES.map((pkg) => [pkg.name, tarballFileUrl(tarballByPackage.get(pkg.name)!)]),
        ...Object.entries(peerDependenciesOnly()),
      ]);

      await writeFile(
        join(consumerDir, 'package.json'),
        JSON.stringify(
          {
            name: 'czap-package-smoke-consumer',
            private: true,
            type: 'module',
            dependencies,
            pnpm: {
              overrides: Object.fromEntries(
                PACKAGES.map((pkg) => [pkg.name, tarballFileUrl(tarballByPackage.get(pkg.name)!)]),
              ),
            },
          },
          null,
          2,
        ),
      );
      const firstPkg: PackageSmokeSpec = PACKAGES[0]!;
      const sampleDep = dependencies[firstPkg.name];
      stepOk(`consumer package.json written (sample dep: ${firstPkg.name} → ${sampleDep})`);

      step(`pnpm install in consumer dir (${consumerDir})`);
      run('pnpm', ['install'], consumerDir);
      stepOk('pnpm install complete');
    }

    step('verify no workspace: protocols leaked into packed tarball manifests');
    for (const pkg of PACKAGES) {
      ensureNoWorkspaceProtocolsInTarball(tarballByPackage.get(pkg.name)!, pkg.name);
    }
    stepOk('no workspace: protocols found in packed manifests');

    const allImports = PACKAGES.flatMap((pkg) => pkg.imports);
    step(`import-smoke ${allImports.length} module specifiers via node smoke.mjs`);
    const smokeModule = `
const imports = ${JSON.stringify(allImports, null, 2)};
for (const specifier of imports) {
  const mod = await import(specifier);
  if (!mod || typeof mod !== 'object') {
    throw new Error(\`Import "\${specifier}" did not resolve to a module object.\`);
  }
}
`;
    await writeFile(join(consumerDir, 'smoke.mjs'), smokeModule);
    run('node', ['smoke.mjs'], consumerDir);
    importsSmoked = allImports.length;
    stepOk('all imports resolved');

    step('czap describe --format=json (binstub resolution check)');
    if (process.platform === 'win32') {
      // Tar-extracted @czap/cli has no node_modules/.bin shim; run the packed bin directly.
      const czapBin = join(consumerDir, 'node_modules', '@czap', 'cli', 'bin', 'czap.mjs');
      run('node', [czapBin, 'describe', '--format=json'], consumerDir);
    } else {
      run('pnpm', ['exec', 'czap', 'describe', '--format=json'], consumerDir);
    }
    stepOk('czap binstub resolved and produced a describe receipt');

    process.stderr.write(`[package:smoke] ok Package smoke passed for ${PACKAGES.length} packages.\n`);
    return { ok: true, packagesPacked, importsSmoked, failedStep: null, failure: null };
  } catch (error) {
    return {
      ok: false,
      packagesPacked,
      importsSmoked,
      failedStep: currentStep,
      failure: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

/** Execute `czap package-smoke` — pack/install/import-smoke every publishable scope; emit a verdict. */
export async function packageSmoke(opts: { cwd?: string; pretty?: boolean } = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const context: CommandContext = { cwd, runPackageSmoke: async () => runPackageSmokeScan(cwd) };

  const result = await packageSmokeCommand.handler({ name: 'package-smoke', args: {} }, context);
  const payload = result.payload as PackageSmokePayload;

  const receipt: PackageSmokeReceipt = {
    status: result.status === 'ok' ? 'ok' : 'failed',
    command: 'package-smoke',
    timestamp: result.timestamp,
    ...payload,
  };
  emit(receipt);

  // Human failure line on stderr (preserves the deleted script's diagnostic output).
  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (!payload.ok && wantPretty) {
    process.stderr.write(
      `PACKAGE-SMOKE GATE FAILED — at step "${payload.failedStep ?? 'unknown'}": ${payload.failure ?? 'unknown failure'}\n`,
    );
  }

  return typeof result.exitCode === 'number' ? result.exitCode : payload.ok ? 0 : 1;
}
