/**
 * package-smoke (CLI adapter, CUT A5) — thin projection over `@liteship/command`'s
 * package-smoke handler (the release-grade pack/install/import smoke, migrated
 * from `scripts/package-smoke.ts`). The pass/fail decision lives in
 * `@liteship/command`; the CLI is the ONLY adapter that wires the heavy
 * `runPackageSmoke` capability: it spawns `pnpm pack` per publishable scope,
 * installs the tarballs into an isolated consumer fixture, asserts no `workspace:`
 * leak, and import-smokes every declared specifier (plus the `liteship` binstub).
 * `@liteship/command` and `@liteship/mcp-server` never see the subprocess engine. Exit 0
 * ok, 1 gate failed.
 *
 * @module
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  packageSmokeCommand,
  type PackageSmokePayload,
  type PackageSmokeSummary,
  PACKAGES,
  PEER_INSTALLS,
  type PackageSmokeSpec,
} from '@liteship/command';
import type { CommandContext } from '@liteship/command';
import { wallClock } from '@liteship/core';
import { IntegrityError, InvariantViolationError } from '@liteship/error';
import type * as TypeScript from 'typescript';
import {
  assertConsumerDependencyInstalled,
  assertPackedTypeClosure,
  diffJsonFields,
  findConsumerDependencyRoot,
  diffSemanticClosures,
  partitionRuntimeClosureSpecifiers,
  packedLiteshipBin,
  peerDependenciesOnly as peerDependenciesOnlyHelper,
  resolveExecutable,
  semanticClosureFileHash,
  tarballFileUrl,
} from '../lib/package-smoke-helpers.js';
import { checkPackedMetadata } from '../lib/package-metadata-catalog.js';
import {
  buildColdImportGraph,
  COLD_IMPORT_PROBE_SOURCE,
  measureOneInstallCostReport,
  type ColdImportGraph,
  type FacadeDependencyReason,
} from '../lib/one-install-cost-evidence.js';
import { PACKAGE_METADATA_CATALOG } from '../lib/package-metadata-catalog.js';
import {
  buildOneInstallCostBaseline,
  ONE_INSTALL_COST_BASELINE_PATH,
  ONE_INSTALL_COST_REPORT_PATH,
  ONE_INSTALL_COST_UPDATE_ENV,
  oneInstallCostFindings,
  parseOneInstallCostBaseline,
} from '../lib/one-install-cost-gate.js';
import { verifyReleaseArtifactBundle } from '../lib/release-artifact-bundle.js';
import { emit, type WallClockTimestamp } from '../receipts.js';

/** `PEER_INSTALLS` → `{name: version}` map (the extracted, unit-tested helper). */
function peerDependenciesOnly(): Record<string, string> {
  return peerDependenciesOnlyHelper(PEER_INSTALLS);
}

/** Receipt emitted by `liteship package-smoke`. */
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
  return mkdtemp(join(tmpdir(), 'liteship-package-smoke-'));
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

function measureFacadeColdImports(consumerDir: string): readonly ColdImportGraph[] {
  const specifiers = PACKAGES.find((entry) => entry.name === 'liteship')?.imports;
  if (specifiers === undefined || specifiers.length === 0) {
    throw IntegrityError('package-smoke', 'the facade package has no generated public import census');
  }
  const probePath = join(consumerDir, '.liteship-cold-import-probe.mjs');
  writeFileSync(probePath, COLD_IMPORT_PROBE_SOURCE, 'utf8');
  return specifiers.map((specifier) => {
    const raw = execFileSync(process.execPath, [probePath, specifier], {
      cwd: consumerDir,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
      timeout: 30_000,
    });
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== 'string')) {
      throw IntegrityError('package-smoke', `cold-import probe emitted invalid paths for ${specifier}`);
    }
    return buildColdImportGraph({
      specifier,
      nodeModulesRoot: join(consumerDir, 'node_modules'),
      scriptPaths: parsed as string[],
    });
  });
}

function facadeDependencyReasons(tarballByPackage: ReadonlyMap<string, string>): readonly FacadeDependencyReason[] {
  const facadeTarball = tarballByPackage.get('liteship');
  if (facadeTarball === undefined) throw IntegrityError('package-smoke', 'packed fleet contains no liteship facade');
  const dependencies = Object.keys(readPackedManifest(facadeTarball).dependencies ?? {}).sort();
  return dependencies.map((packageName) => {
    const metadata = PACKAGE_METADATA_CATALOG[packageName];
    if (metadata === undefined) {
      throw IntegrityError('package-smoke', `facade dependency ${packageName} has no package-catalog reason`);
    }
    return { package: packageName, reason: metadata.description };
  });
}

/** Read `package/package.json` from a `pnpm pack` tarball (layout-stable on every OS). */
function readPackedManifest(tarballPath: string): {
  name?: string;
  description?: string;
  keywords?: readonly string[];
  private?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
} {
  const raw = execFileSync('tar', ['-xOf', tarballPath, 'package/package.json'], { encoding: 'utf8' });
  return JSON.parse(raw) as {
    name?: string;
    description?: string;
    keywords?: readonly string[];
    private?: boolean;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
}

/** Expand a `pnpm pack` tarball into `node_modules/@liteship/<name>/` (Windows-safe). */
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
        if (name.startsWith('@liteship/') || version.startsWith('workspace:') || name in peers) {
          continue;
        }
        external[name] = version;
      }
    }
  }
  return external;
}

/**
 * Tar-extracted `@liteship/*` trees live under nested `node_modules/`. Node resolves
 * bare imports from the importing file upward; pnpm's default linker often leaves
 * mediabunny/cborg only at the consumer root. Mirror them beside each package
 * that declares them so `import 'mediabunny'` from `@liteship/web/dist/...` works.
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
          // hoisted store path and nested @liteship/*/node_modules layout diverge).
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
 * The consumer fixture's `package.json` for the POSIX install path: every packed
 * `@liteship/*` scope pinned to its `file://` tarball (both as a direct dependency
 * and a `pnpm.overrides` entry, so transitive `@liteship/*` edges resolve to the
 * packed artifacts, not the workspace), plus the external peer set. ONE source of
 * truth so the online install and the offline `hermetic-build` reinstall are
 * byte-identical. `tarballFileUrl` yields a proper `file:///…/.tgz` URL (pnpm
 * accepts it on every platform, unlike a raw `file:` + backslash path).
 */
function buildConsumerManifest(tarballByPackage: Map<string, string>): {
  name: string;
  private: true;
  type: 'module';
  dependencies: Record<string, string>;
  pnpm: { overrides: Record<string, string> };
} {
  const dependencies = Object.fromEntries([
    ...PACKAGES.map((pkg) => [pkg.name, tarballFileUrl(tarballByPackage.get(pkg.name)!)]),
    ...Object.entries(peerDependenciesOnly()),
  ]);
  return {
    name: 'liteship-package-smoke-consumer',
    private: true,
    type: 'module',
    dependencies,
    pnpm: {
      overrides: Object.fromEntries(PACKAGES.map((pkg) => [pkg.name, tarballFileUrl(tarballByPackage.get(pkg.name)!)])),
    },
  };
}

/**
 * `run`, but with the CHILD's network DISABLED via its spawn env ONLY: pnpm's
 * `npm_config_offline=true` plus a dead HTTP(S) proxy so any accidental fetch dies
 * fast instead of hanging. The session's own `process.env` (its real proxy) is
 * NEVER mutated — the overrides live only on the object handed to this one child,
 * so the offline constraint is scoped to the install subprocess.
 */
function runOffline(command: string, args: readonly string[], cwd: string): string {
  const executable = resolveExecutable(command);
  const commandArgs =
    command === 'pnpm' && executable === process.execPath && process.env['npm_execpath']
      ? [process.env['npm_execpath'], ...args]
      : args;
  const deadProxy = 'http://127.0.0.1:1';
  return execFileSync(executable, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: {
      ...process.env,
      npm_config_offline: 'true',
      HTTPS_PROXY: deadProxy,
      HTTP_PROXY: deadProxy,
      https_proxy: deadProxy,
      http_proxy: deadProxy,
    },
  }).trim();
}

interface PublicSubpath {
  readonly packageName: string;
  readonly specifier: string;
  readonly runtimeTarget: string | null;
  readonly typesTarget: string | null;
  readonly assetTarget: string | null;
}

/**
 * Enumerate EVERY non-null public subpath across all export maps and classify how
 * a packed consumer must prove it: runtime import, TypeScript resolution, or
 * host asset existence (`.astro`). A types-only entry remains part of the closure.
 */
function enumeratePublicSubpaths(root: string): readonly PublicSubpath[] {
  const entries: PublicSubpath[] = [];
  for (const pkg of PACKAGES) {
    const manifest = JSON.parse(readFileSync(join(root, pkg.dir, 'package.json'), 'utf8')) as {
      exports?: Record<string, unknown> | string;
    };
    const exportsMap = manifest.exports;
    if (exportsMap === undefined) continue;
    if (typeof exportsMap === 'string') {
      entries.push({
        packageName: pkg.name,
        specifier: pkg.name,
        runtimeTarget: exportsMap.endsWith('.astro') ? null : exportsMap,
        typesTarget: null,
        assetTarget: exportsMap.endsWith('.astro') ? exportsMap : null,
      });
      continue;
    }
    for (const [subpath, condition] of Object.entries(exportsMap)) {
      if (condition === null || condition === undefined) continue;
      const specifier = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`;
      const conditions = typeof condition === 'string' ? null : (condition as Record<string, unknown>);
      const target =
        typeof condition === 'string'
          ? condition
          : typeof conditions?.['import'] === 'string'
            ? conditions['import']
            : typeof conditions?.['default'] === 'string'
              ? conditions['default']
              : null;
      const typesTarget = conditions !== null && typeof conditions?.['types'] === 'string' ? conditions['types'] : null;
      entries.push({
        packageName: pkg.name,
        specifier,
        runtimeTarget: target !== null && !target.endsWith('.astro') ? target : null,
        typesTarget,
        assetTarget: target?.endsWith('.astro') === true ? target : null,
      });
    }
  }
  return entries;
}

/** SHA-256 hex of a file's bytes. */
function sha256File(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * The per-file-content closure of a `pnpm pack` tarball: `{ package-relative path
 * → sha256(content) }`. Extracted to `destDir` and walked; keyed on content, not
 * tar metadata, so it is the SEMANTIC repro signal (two packs whose files carry
 * identical bytes match here even when the gzip envelopes differ).
 */
function tarballClosure(tarballPath: string, destDir: string): Map<string, string> {
  mkdirSync(destDir, { recursive: true });
  execFileSync('tar', ['-xzf', tarballPath, '-C', destDir], { stdio: 'inherit' });
  const closure = new Map<string, string>();
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(abs, rel);
      else if (entry.isFile()) closure.set(rel, semanticClosureFileHash(rel, readFileSync(abs)));
    }
  };
  walk(destDir, '');
  return closure;
}

/** First line of an error message (the actionable head; the full stream already inherited to stderr). */
function firstLine(message: string): string {
  return message.split('\n')[0] ?? message;
}

/** Keep multi-line authority failures useful without allowing an unbounded child dump. */
function boundedFailure(message: string, lineLimit = 16, characterLimit = 16_000): string {
  const lines = message.split(/\r?\n/);
  const bounded = lines.slice(0, lineLimit);
  if (lines.length > lineLimit) bounded.push(`... ${lines.length - lineLimit} more lines`);
  const report = bounded.join('\n');
  return report.length <= characterLimit
    ? report
    : `${report.slice(0, characterLimit)}\n... failure report truncated at ${characterLimit} characters`;
}

type HermeticResult = NonNullable<PackageSmokePayload['hermetic']>;

/**
 * `hermetic-build` — reinstall the packed consumer with the child install's
 * network DISABLED ({@link runOffline}). Must succeed from the warm pnpm store
 * (the online install two steps earlier populated it) + the `file://` tarballs.
 * Blocking in every authority. An unavailable offline install is absence of the
 * promised proof, never a green skip. The release/consumer lane runs this on
 * Linux; an explicit invocation on an unsupported host fails with the reason.
 */
function runHermeticBuild(scratch: string, tarballByPackage: Map<string, string>): HermeticResult['hermeticBuild'] {
  if (process.platform === 'win32') {
    return {
      ok: false,
      skipped: true,
      reason:
        'hermetic offline reinstall is unavailable on win32; run the release/consumer authority on its supported Linux host',
    };
  }
  const dir = join(scratch, 'consumer-hermetic');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(buildConsumerManifest(tarballByPackage), null, 2));
  process.stderr.write('[package:smoke] > hermetic-build: offline pnpm install (network disabled on the child only)\n');
  try {
    runOffline('pnpm', ['install'], dir);
    process.stderr.write(
      '[package:smoke] ok hermetic-build: offline install succeeded from warm store + file:// tarballs\n',
    );
    return { ok: true, skipped: false, reason: null };
  } catch (error) {
    const message = firstLine(error instanceof Error ? error.message : String(error));
    process.stderr.write(`[package:smoke] hermetic-build FAILED — ${message}\n`);
    return { ok: false, skipped: false, reason: message };
  }
}

/**
 * `packed-consumer-closure` — prove EVERY public subpath enumerated from the
 * packages' exports maps. Runtime/default entries are imported, types entries
 * resolve through TypeScript's bundler resolver, and host assets exist in the
 * physical packed package. Blocking; the first failing specifier is named.
 */
async function runPackedConsumerClosure(
  root: string,
  consumerDir: string,
): Promise<HermeticResult['packedConsumerClosure']> {
  const subpaths = enumeratePublicSubpaths(root);
  const runtime = partitionRuntimeClosureSpecifiers(subpaths, PACKAGES);
  const runtimeSpecifiers = runtime.imports;
  const refusalSpecifiers = runtime.refusals;
  const typeEntries = subpaths.flatMap((entry) =>
    entry.typesTarget === null
      ? []
      : [{ packageName: entry.packageName, specifier: entry.specifier, typesTarget: entry.typesTarget }],
  );
  process.stderr.write(
    `[package:smoke] > packed-consumer-closure: prove ${subpaths.length} enumerated public subpaths ` +
      `(${runtimeSpecifiers.length} runtime, ${refusalSpecifiers.length} type-only refusal, ${typeEntries.length} typed)\n`,
  );

  for (const entry of subpaths) {
    if (entry.assetTarget === null) continue;
    const packageRoot = findConsumerDependencyRoot(consumerDir, entry.packageName);
    const target = packageRoot === undefined ? null : resolve(packageRoot, entry.assetTarget);
    if (target === null || !existsSync(target)) {
      return {
        ok: false,
        subpathCount: subpaths.length,
        failure: `packed host asset missing for ${entry.specifier}: ${entry.assetTarget}`,
      };
    }
  }

  const closureModule = `
const imports = ${JSON.stringify(runtimeSpecifiers, null, 2)};
const refusals = ${JSON.stringify(refusalSpecifiers, null, 2)};
for (const specifier of imports) {
  try {
    const mod = await import(specifier);
    if (!mod || typeof mod !== 'object') {
      process.stdout.write(specifier + '\\t' + 'did not resolve to a module object');
      process.exit(1);
    }
  } catch (error) {
    process.stdout.write(specifier + '\\t' + (error && error.message ? error.message : String(error)));
    process.exit(1);
  }
}
for (const refusal of refusals) {
  const { packageName, specifier } = refusal;
  try {
    await import(specifier);
    process.stdout.write(specifier + '\\t' + 'type-only package unexpectedly allowed a runtime import');
    process.exit(1);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    if (!message.includes(packageName + ' is type-only') || !message.includes('no runtime exports')) {
      process.stdout.write(specifier + '\\t' + 'runtime refusal was not the packed type-only teaching contract: ' + message);
      process.exit(1);
    }
  }
}
process.stdout.write('OK ' + imports.length + ' imports + ' + refusals.length + ' refusals');
`;
  writeFileSync(join(consumerDir, 'closure.mjs'), closureModule);
  try {
    execFileSync(process.execPath, ['closure.mjs'], {
      cwd: consumerDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const ts = createRequire(import.meta.url)('typescript') as typeof TypeScript;
    assertPackedTypeClosure(ts, consumerDir, typeEntries);
    process.stderr.write(`[package:smoke] ok packed-consumer-closure: all ${subpaths.length} public subpaths proved\n`);
    return { ok: true, subpathCount: subpaths.length, failure: null };
  } catch (error) {
    const out = String((error as { stdout?: unknown }).stdout ?? '');
    const [spec, ...rest] = out.split('\t');
    const failure = out
      ? `closure import failed at ${spec}: ${firstLine(rest.join('\t'))}`
      : boundedFailure(error instanceof Error ? error.message : String(error));
    return { ok: false, subpathCount: subpaths.length, failure };
  }
}

/**
 * `double-build-repro` — pack every scope a SECOND time and compare against the
 * first pack. Reports two verdicts to `benchmarks/reproducibility-report.json`:
 * a per-file-hash "semantic" repro (do the packed file CONTENTS match) and a
 * byte-identical "artifact" repro (do the `.tgz` bytes match). Semantic drift is
 * blocking because it means the same source produced different packed contents;
 * artifact drift remains advisory because gzip envelopes may differ. The report
 * file is gitignored — written, never committed. Any failure to re-pack or compare
 * yields a non-reproducible semantic verdict, which the caller treats as blocking.
 */
async function runDoubleBuildRepro(args: {
  root: string;
  scratch: string;
  tarballByPackage: Map<string, string>;
  generatedAt: string;
}): Promise<HermeticResult['doubleBuildRepro']> {
  const { root, scratch, tarballByPackage, generatedAt } = args;
  const reportRelative = 'benchmarks/reproducibility-report.json';
  process.stderr.write(
    '[package:smoke] > double-build-repro: compare semantic package contents (blocking) and tarball bytes (advisory)\n',
  );
  try {
    const secondDir = join(scratch, 'tarballs-2');
    await mkdir(secondDir, { recursive: true });
    const extractBase = join(scratch, 'repro-extract');
    await mkdir(extractBase, { recursive: true });

    const perPackage: {
      package: string;
      semantic: boolean;
      artifact: boolean;
      fileCount: number;
      semanticDiff: ReturnType<typeof diffSemanticClosures>;
      packageJsonDiff: ReturnType<typeof diffJsonFields> | null;
    }[] = [];
    let semanticAll = true;
    let artifactAll = true;
    for (const pkg of PACKAGES) {
      const first = tarballByPackage.get(pkg.name)!;
      const second = await packPackage(resolve(root, pkg.dir), secondDir);
      const artifact = sha256File(first) === sha256File(second);
      const slug = pkg.name.replace(/[^a-z0-9]+/gi, '_');
      const extractA = join(extractBase, `${slug}-a`);
      const extractB = join(extractBase, `${slug}-b`);
      const closureA = tarballClosure(first, extractA);
      const closureB = tarballClosure(second, extractB);
      const semanticDiff = diffSemanticClosures(closureA, closureB);
      const packageJsonDiff =
        closureA.get('package/package.json') !== closureB.get('package/package.json')
          ? diffJsonFields(
              JSON.parse(readFileSync(join(extractA, 'package', 'package.json'), 'utf8')),
              JSON.parse(readFileSync(join(extractB, 'package', 'package.json'), 'utf8')),
            )
          : null;
      const semantic = semanticDiff.total === 0;
      if (!artifact) artifactAll = false;
      if (!semantic) {
        semanticAll = false;
        const preview = semanticDiff.paths
          .map((entry) => `${entry.path} (${entry.firstHash ?? 'missing'} -> ${entry.secondHash ?? 'missing'})`)
          .join(', ');
        process.stderr.write(
          `[package:smoke] ! semantic drift ${pkg.name}: ${semanticDiff.total} path(s): ${preview}` +
            `${semanticDiff.truncated ? ', ...' : ''}\n`,
        );
      }
      perPackage.push({
        package: pkg.name,
        semantic,
        artifact,
        fileCount: closureA.size,
        semanticDiff,
        packageJsonDiff,
      });
    }

    const report = {
      schemaVersion: 1,
      generatedAt,
      semantic: {
        reproducible: semanticAll,
        packageCount: PACKAGES.length,
        drift: perPackage.filter((entry) => !entry.semantic).map((entry) => entry.package),
        details: perPackage
          .filter((entry) => !entry.semantic)
          .map((entry) => ({ package: entry.package, ...entry.semanticDiff, packageJsonDiff: entry.packageJsonDiff })),
      },
      artifact: {
        reproducible: artifactAll,
        packageCount: PACKAGES.length,
        drift: perPackage.filter((entry) => !entry.artifact).map((entry) => entry.package),
      },
      packages: perPackage,
    };
    const benchmarksDir = join(root, 'benchmarks');
    await mkdir(benchmarksDir, { recursive: true });
    await writeFile(join(benchmarksDir, 'reproducibility-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    process.stderr.write(
      `[package:smoke] ok double-build-repro: semantic=${semanticAll} (blocking) artifact=${artifactAll} (advisory) -> ${reportRelative}\n`,
    );
    return { semanticRepro: semanticAll, artifactRepro: artifactAll, reportPath: reportRelative };
  } catch (error) {
    process.stderr.write(
      `[package:smoke] ! double-build-repro could not establish semantic reproducibility — ${firstLine(error instanceof Error ? error.message : String(error))}\n`,
    );
    return { semanticRepro: false, artifactRepro: false, reportPath: reportRelative };
  }
}

/**
 * Run the three `--hermetic` sub-results over an already-packed, already-installed
 * consumer: the offline reinstall, the enumerated packed-consumer closure, and the
 * double-build reproducibility report. Never throws — each sub-runner captures its
 * own failure — so the caller can block on semantic reproducibility while retaining
 * byte-identical artifact reproducibility as advisory evidence.
 */
async function runHermeticChecks(args: {
  root: string;
  scratch: string;
  consumerDir: string;
  tarballByPackage: Map<string, string>;
  generatedAt: string;
}): Promise<HermeticResult> {
  const { root, scratch, consumerDir, tarballByPackage, generatedAt } = args;
  const hermeticBuild = runHermeticBuild(scratch, tarballByPackage);
  const packedConsumerClosure = await runPackedConsumerClosure(root, consumerDir);
  const doubleBuildRepro = await runDoubleBuildRepro({ root, scratch, tarballByPackage, generatedAt });
  return { hermeticBuild, packedConsumerClosure, doubleBuildRepro };
}

/** {@link runPackageSmokeScan}'s verdict, widened with the optional `--hermetic` sub-results. */
type PackageSmokeScanResult = PackageSmokeSummary & { readonly hermetic?: HermeticResult };

/**
 * The CLI-only `runPackageSmoke` capability: pack/install/import-smoke every
 * publishable scope over the repo at `root`. Ported verbatim from the deleted
 * `scripts/package-smoke.ts` `main()`, but returns a structured verdict instead
 * of self-executing on `process.exit`: any thrown failure is captured into
 * `{ ok:false, failedStep, failure }` keyed by the bracketed step label that was
 * running when it threw. The scratch tree is always removed in `finally`.
 *
 * Under `opts.hermetic` it appends the three release-hermeticity sub-results
 * ({@link runHermeticChecks}) after the base smoke passes: `hermetic-build` +
 * `packed-consumer-closure` and `double-build-repro.semanticRepro` are blocking;
 * only byte-identical `double-build-repro.artifactRepro` remains advisory.
 * `opts.generatedAt` seeds the repro report's timestamp (a passed-in stamp keeps
 * the receipt's time source at the adapter).
 */
export async function runPackageSmokeScan(
  root: string,
  opts: {
    hermetic?: boolean;
    generatedAt?: string;
    artifactDir?: string;
    expectedSourceCommit?: string;
    expectedPlanId?: string;
  } = {},
): Promise<PackageSmokeScanResult> {
  const scratch = await createScratchDir(root);
  const tarballDir = opts.artifactDir ?? join(scratch, 'tarballs');
  const consumerDir = join(scratch, 'consumer');
  const generatedAt = opts.generatedAt ?? new Date(wallClock.now()).toISOString();

  if (opts.artifactDir === undefined) await mkdir(tarballDir, { recursive: true });
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
    let tarballByPackage: Map<string, string>;
    if (opts.artifactDir !== undefined) {
      step(`verify immutable release artifact bundle (${opts.artifactDir})`);
      const verified = verifyReleaseArtifactBundle(opts.artifactDir, opts.expectedSourceCommit, opts.expectedPlanId);
      tarballByPackage = new Map(verified.tarballByPackage);
      packagesPacked = tarballByPackage.size;
      stepOk(`verified ${packagesPacked} prepacked tarballs at manifest ${verified.manifest.manifestDigest}`);
    } else {
      tarballByPackage = new Map<string, string>();
      step(`pack ${PACKAGES.length} packages via pnpm pack`);
      for (const pkg of PACKAGES) {
        const cwd = resolve(root, pkg.dir);
        const tarball = await packPackage(cwd, tarballDir);
        tarballByPackage.set(pkg.name, tarball);
        packagesPacked += 1;
      }
      stepOk(`packed ${PACKAGES.length} tarballs into ${tarballDir}`);
    }

    if (process.platform === 'win32') {
      const externalDeps = collectPackedExternalDependencies(tarballByPackage);

      // Install peers + packed externals before extracting @liteship/* tarballs. If the
      // scoped trees land first, pnpm treats their package.json deps as already
      // materialized and skips hoisting cborg/mediabunny to the consumer root.
      await writeFile(
        join(consumerDir, 'package.json'),
        JSON.stringify(
          {
            name: 'liteship-package-smoke-consumer',
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

      step(`materialize ${PACKAGES.length} packed @liteship/* trees under consumer node_modules (Windows)`);
      for (const pkg of PACKAGES) {
        const dest = join(consumerDir, 'node_modules', ...pkg.name.split('/'));
        extractPackedPackage(tarballByPackage.get(pkg.name)!, dest);
      }
      stepOk(`extracted ${PACKAGES.length} @liteship/* packages into node_modules`);

      step('link hoisted peers/externals beside tar-extracted @liteship/* packages (Windows)');
      linkHoistedDepsBesidePackedPackages(consumerDir, tarballByPackage, externalDeps);
      stepOk('nested node_modules links materialized');
    } else {
      step('build consumer package.json (dependencies + pnpm.overrides as file:// URLs)');
      // ONE manifest builder shared with the hermetic-build offline reinstall, so
      // both installs are byte-identical (see buildConsumerManifest).
      const manifest = buildConsumerManifest(tarballByPackage);
      await writeFile(join(consumerDir, 'package.json'), JSON.stringify(manifest, null, 2));
      const firstPkg: PackageSmokeSpec = PACKAGES[0]!;
      const sampleDep = manifest.dependencies[firstPkg.name];
      stepOk(`consumer package.json written (sample dep: ${firstPkg.name} → ${sampleDep})`);

      step(`pnpm install in consumer dir (${consumerDir})`);
      run('pnpm', ['install'], consumerDir);
      stepOk('pnpm install complete');
    }

    step('record one-install fleet cost evidence from the existing pack/install');
    const coldImports = measureFacadeColdImports(consumerDir);
    const costReport = measureOneInstallCostReport({
      generatedAt,
      environment: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        packageManager: 'pnpm',
        packageManagerVersion: run('pnpm', ['--version'], root),
      },
      fleetPackages: PACKAGES.map((pkg) => pkg.name),
      tarballs: tarballByPackage,
      consumerDir,
      facadeDependencies: facadeDependencyReasons(tarballByPackage),
      coldImports,
    });
    const costReportRelative = ONE_INSTALL_COST_REPORT_PATH;
    const costBaselineRelative = ONE_INSTALL_COST_BASELINE_PATH;
    await mkdir(join(root, 'benchmarks'), { recursive: true });
    await writeFile(join(root, costReportRelative), `${JSON.stringify(costReport, null, 2)}\n`);
    if (process.env[ONE_INSTALL_COST_UPDATE_ENV] === '1') {
      const baseline = buildOneInstallCostBaseline(costReport);
      await writeFile(join(root, costBaselineRelative), `${JSON.stringify(baseline, null, 2)}\n`);
      stepOk(`one-install cost baseline updated at ${baseline.baselineId} -> ${costBaselineRelative}`);
    } else {
      if (!existsSync(join(root, costBaselineRelative))) {
        throw IntegrityError(
          'package-smoke',
          `one-install cost baseline is missing: ${costBaselineRelative} (regenerate explicitly with ${ONE_INSTALL_COST_UPDATE_ENV}=1)`,
        );
      }
      const baseline = parseOneInstallCostBaseline(
        JSON.parse(readFileSync(join(root, costBaselineRelative), 'utf8')) as unknown,
      );
      const findings = oneInstallCostFindings(costReport, baseline);
      if (findings.length > 0) {
        throw IntegrityError(
          'package-smoke',
          `one-install cost exceeded the addressed baseline:\n${findings
            .map((finding) => `  - ${finding.code} [${finding.subject}]: ${finding.detail}`)
            .join('\n')}`,
        );
      }
      stepOk(`one-install cost admitted by baseline ${baseline.baselineId}`);
    }
    stepOk(
      `one-install cost recorded (${costReport.observation.compressedTarballs.totalBytes} compressed bytes; ` +
        `${costReport.observation.compressedTarballs.totalUnpackedBytes} unpacked bytes; ` +
        `${costReport.observation.installed.uniqueRegularFileBytes} installed unique-file bytes) -> ` +
        costReportRelative,
    );

    step('verify no workspace: protocols leaked into packed tarball manifests');
    for (const pkg of PACKAGES) {
      ensureNoWorkspaceProtocolsInTarball(tarballByPackage.get(pkg.name)!, pkg.name);
    }
    stepOk('no workspace: protocols found in packed manifests');

    // F-EXTRA (#146): the release gate is the enforcement point for answer-first
    // package metadata. Every packed manifest must still MATCH its canonical
    // catalog entry (description + keywords derived from PACKAGE_METADATA_CATALOG,
    // Law 6) and carry no accidental private/`internal` metadata — so a drifted or
    // jargon description can never reach npm.
    step('verify answer-first package metadata (description + keywords) in packed manifests');
    const metadataViolations: string[] = [];
    for (const pkg of PACKAGES) {
      const manifest = readPackedManifest(tarballByPackage.get(pkg.name)!);
      for (const violation of checkPackedMetadata(manifest, pkg.name)) {
        metadataViolations.push(`${violation.package} [${violation.field}]: ${violation.message}`);
      }
    }
    if (metadataViolations.length > 0) {
      throw IntegrityError(
        'package-smoke',
        `Publishable package metadata failed the answer-first check:\n  - ${metadataViolations.join('\n  - ')}`,
      );
    }
    stepOk(`answer-first metadata verified for ${PACKAGES.length} packed manifests`);

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

    step('liteship describe --format=json (binstub resolution check)');
    if (process.platform === 'win32') {
      // Tar extraction has no node_modules/.bin shim; execute the facade-owned
      // public binary directly. @liteship/cli is implementation-only and ships no bin.
      const liteshipBin = packedLiteshipBin(consumerDir);
      run('node', [liteshipBin, 'describe', '--format=json'], consumerDir);
    } else {
      run('pnpm', ['exec', 'liteship', 'describe', '--format=json'], consumerDir);
    }
    stepOk('liteship binstub resolved and produced a describe receipt');

    if (opts.hermetic) {
      step('hermetic release checks (hermetic-build + packed-consumer-closure + double-build-repro)');
      const hermetic = await runHermeticChecks({
        root,
        scratch,
        consumerDir,
        tarballByPackage,
        generatedAt,
      });
      const { hermeticBuild, packedConsumerClosure, doubleBuildRepro } = hermetic;

      // Offline reinstall, public-subpath closure, and semantic package-content
      // reproducibility are release authorities. Byte-identical `.tgz` output is
      // retained as advisory evidence because archive envelopes may vary.
      if (!hermeticBuild.ok || !packedConsumerClosure.ok || !doubleBuildRepro.semanticRepro) {
        const parts: string[] = [];
        if (!hermeticBuild.ok) parts.push(`hermetic-build: ${hermeticBuild.reason ?? 'failed'}`);
        if (!packedConsumerClosure.ok)
          parts.push(`packed-consumer-closure: ${packedConsumerClosure.failure ?? 'failed'}`);
        if (!doubleBuildRepro.semanticRepro)
          parts.push('double-build-repro: semantic package contents were not reproducible');
        const failure = parts.join(' | ');
        process.stderr.write(`[package:smoke] hermetic gate FAILED — ${failure}\n`);
        return { ok: false, packagesPacked, importsSmoked, failedStep: 'hermetic', failure, hermetic };
      }
      stepOk(
        `hermetic checks passed (closure=${packedConsumerClosure.subpathCount} subpaths; ` +
          `hermetic-build ${hermeticBuild.skipped ? 'SKIPPED' : 'ok'}; ` +
          `repro semantic=${doubleBuildRepro.semanticRepro} artifact=${doubleBuildRepro.artifactRepro})`,
      );
      process.stderr.write(`[package:smoke] ok Package smoke (+hermetic) passed for ${PACKAGES.length} packages.\n`);
      return { ok: true, packagesPacked, importsSmoked, failedStep: null, failure: null, hermetic };
    }

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

/** Execute `liteship package-smoke` — pack/install/import-smoke every publishable scope; emit a verdict. */
export async function packageSmoke(
  opts: {
    cwd?: string;
    pretty?: boolean;
    hermetic?: boolean;
    artifactDir?: string;
    expectedSourceCommit?: string;
    expectedPlanId?: string;
  } = {},
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const hermetic = opts.hermetic ?? false;
  // The passed-in timestamp for the reproducibility report — stamped at the
  // adapter (the wall-clock boundary) so the engine stays clock-injection-clean.
  const generatedAt = new Date(wallClock.now()).toISOString();

  const context: CommandContext = {
    cwd,
    runPackageSmoke: async () =>
      runPackageSmokeScan(cwd, {
        hermetic,
        generatedAt,
        ...(opts.artifactDir ? { artifactDir: opts.artifactDir } : {}),
        ...(opts.expectedSourceCommit ? { expectedSourceCommit: opts.expectedSourceCommit } : {}),
        ...(opts.expectedPlanId ? { expectedPlanId: opts.expectedPlanId } : {}),
      }),
  };

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
