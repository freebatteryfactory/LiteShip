/**
 * Shared plumbing for the consumer-JOURNEY family (`pnpm run test:journey`).
 *
 * A journey is an END-TO-END consumer experience proven against REAL packed
 * artifacts and a REAL headless host build — never a mock. The seven journeys
 * (fresh-app, add-feature, debug-diagnostic, upgrade, package-author,
 * cold-agent-context, installed-add) each return a {@link JourneyResult}; the `scripts/test-journey.ts`
 * orchestrator packs the workspace ONCE, runs them, prints a PASS/FAIL line per
 * journey, and exits 0 only when every authoritative journey passed. An
 * unavailable proof is a failure; this authority has no gated-green state.
 *
 * This module owns the machinery the tarball-consuming journeys (1, 2, 4, 5, 7) share:
 * packing every publishable scope in-workspace (REUSING `tests/support/pack.ts`),
 * scaffolding the `create-liteship` starter, rewriting its manifest to
 * `file://…tgz` deps + the package manager's root override map (MIRRORING
 * `packages/cli/src/commands/package-smoke.ts`), an offline-first install, and a
 * headless `astro build` + `data-liteship-*` HTML assertion (the
 * `tests/integration/astro/test.ts` pattern).
 *
 * SANDBOX HONESTY: these are cloud release authorities. A sub-step that cannot
 * run in an environment fails with its exact reason; callers do not relabel the
 * missing execution as evidence.
 *
 * @module
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGES, PEER_INSTALLS } from '../../packages/command/src/commands/package-smoke-registry.js';
import { scaffold } from '../../packages/create-liteship/src/scaffold.js';
import { packInWorkspace } from '../support/pack.js';
import { tarballFileUrl } from '../../packages/cli/src/lib/package-smoke-helpers.js';
import { spawnArgvCapture } from '../../scripts/lib/spawn.js';
import { runPnpm, type PnpmRunResult } from '../../scripts/support/pnpm-process.js';
import { PRIOR_ASTRO_PACKAGE, PRIOR_CORE_PACKAGE } from './prior-operation-brand.js';

/** Absolute repo root (this file lives at `<root>/tests/journey/harness.ts`). */
export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');

/** Frozen pre-operation control used by the upgrade journey. */
export const PRIOR_OPERATION_BASE = '2141ec25fdd4c37882d68c8daba5f870499eac36';

/** The fail-closed verdict of one authoritative journey. */
export type JourneyStatus = 'pass' | 'fail';

/** The structured outcome one journey reports to the orchestrator. */
export interface JourneyResult {
  /** The journey id (`journey-fresh-app`, …). */
  readonly name: string;
  /** Its verdict. */
  readonly status: JourneyStatus;
  /** A one-line human summary of what was proven or why it failed. */
  readonly detail: string;
  /** Sub-step notes surfaced alongside the verdict. */
  readonly notes: readonly string[];
}

/** Authoritative journey verdict: every declared journey executed and passed. */
export function journeysPassed(results: readonly JourneyResult[]): boolean {
  return results.length > 0 && results.every((result) => result.status === 'pass');
}

/** The packed-workspace context the tarball-consuming journeys (1, 2, 4, 5, 7) share. */
export interface PackedWorkspace {
  /** The scratch directory holding every `.tgz`. */
  readonly tarballDir: string;
  /** Publishable package name → its packed tarball path. */
  readonly tarballByName: ReadonlyMap<string, string>;
}

/** A genuinely distinct packed workspace exported from {@link PRIOR_OPERATION_BASE}. */
export interface PriorPackedWorkspace extends PackedWorkspace {
  /** Scratch root containing the archive and extracted historical checkout. */
  readonly rootDir: string;
  /** Extracted historical workspace whose packages produced the tarballs. */
  readonly workspaceDir: string;
}

/** A journey throws this to signal a genuine assertion failure (distinct from an env-gate). */
export class JourneyAssertionError extends Error {}

/** Assert `condition`; on failure throw a {@link JourneyAssertionError} carrying `message`. */
export function journeyAssert(condition: boolean, message: string): void {
  if (!condition) throw new JourneyAssertionError(message);
}

/**
 * `PEER_INSTALLS` specifier (`name@version`, scope-safe on the LAST `@`) → its exact
 * pinned version. Used to install the consumer's `astro` / `typescript` at the exact
 * versions the warm store already holds, maximizing offline hits.
 */
export function peerVersion(name: string): string {
  for (const specifier of PEER_INSTALLS) {
    const at = specifier.lastIndexOf('@');
    if (specifier.slice(0, at) === name) return specifier.slice(at + 1);
  }
  throw new JourneyAssertionError(`PEER_INSTALLS has no pin for ${name}`);
}

/**
 * Pack EVERY publishable scope in-workspace (REUSING `packInWorkspace`, so
 * `catalog:`/`workspace:*` specs resolve to concrete ranges) into a fresh scratch
 * dir. `ignoreScripts` skips the `prepack` `tsc` rebuild — the dist is already
 * built in this phase, and the manifest transform is byte-identical with or
 * without it (per the pack owner's contract) — so packing 25 scopes stays fast.
 */
export async function packWorkspace(): Promise<PackedWorkspace> {
  const tarballDir = mkdtempSync(join(tmpdir(), 'liteship-journey-tarballs-'));
  const tarballByName = new Map<string, string>();
  for (const pkg of PACKAGES) {
    const tgz = await packInWorkspace(resolve(REPO_ROOT, pkg.dir), tarballDir, { ignoreScripts: true });
    tarballByName.set(pkg.name, tgz);
  }
  return { tarballDir, tarballByName };
}

/**
 * Export, build, and pack the exact pre-operation control commit.
 *
 * The current checkout is never reset or mutated. `git archive` materializes the
 * historical source in a scratch directory, that source performs its own frozen
 * install + build, and every publishable package is packed from inside that
 * historical workspace. This is intentionally expensive and belongs only to the
 * cloud consumer-journey authority.
 */
export async function packPriorOperationBase(): Promise<PriorPackedWorkspace> {
  const rootDir = mkdtempSync(join(tmpdir(), 'liteship-journey-prior-'));
  const workspaceDir = join(rootDir, 'workspace');
  const tarballDir = join(rootDir, 'tarballs');
  const archivePath = join(rootDir, `${PRIOR_OPERATION_BASE}.tar`);
  mkdirSync(workspaceDir, { recursive: true });
  mkdirSync(tarballDir, { recursive: true });

  try {
    const archive = await spawnArgvCapture(
      'git',
      ['archive', '--format=tar', '--output', archivePath, PRIOR_OPERATION_BASE],
      { cwd: REPO_ROOT },
    );
    journeyAssert(
      archive.exitCode === 0,
      `git archive ${PRIOR_OPERATION_BASE} failed (exit ${archive.exitCode}): ${archive.stderr.slice(-800)}`,
    );
    const extract = await spawnArgvCapture('tar', ['-xf', archivePath, '-C', workspaceDir], { cwd: REPO_ROOT });
    journeyAssert(
      extract.exitCode === 0,
      `extracting ${PRIOR_OPERATION_BASE} failed (exit ${extract.exitCode}): ${extract.stderr.slice(-800)}`,
    );

    const install = await runPnpm(['install', '--frozen-lockfile', '--prefer-offline'], {
      cwd: workspaceDir,
      env: { FORCE_COLOR: '0' },
    });
    journeyAssert(
      install.code === 0,
      `prior-control install failed (exit ${install.code}):\n${(install.stdout + install.stderr).slice(-1200)}`,
    );
    const build = await runPnpm(['run', 'build'], { cwd: workspaceDir, env: { FORCE_COLOR: '0' } });
    journeyAssert(
      build.code === 0,
      `prior-control build failed (exit ${build.code}):\n${(build.stdout + build.stderr).slice(-1200)}`,
    );

    const tarballByName = new Map<string, string>();
    for (const pkg of PACKAGES) {
      const packageDir = resolve(workspaceDir, pkg.dir);
      const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as { name?: string };
      journeyAssert(typeof manifest.name === 'string', `${pkg.dir} at ${PRIOR_OPERATION_BASE} has no package name`);
      const tgz = await packInWorkspace(packageDir, tarballDir, { ignoreScripts: true });
      tarballByName.set(manifest.name!, tgz);
    }
    journeyAssert(
      tarballByName.size === PACKAGES.length,
      `prior-control pack produced ${tarballByName.size} uniquely named tarballs, expected ${PACKAGES.length}`,
    );
    return { rootDir, workspaceDir, tarballDir, tarballByName };
  } catch (error) {
    removeDir(rootDir);
    throw error;
  }
}

/** Scaffold the `create-liteship` default starter into a fresh scratch app dir; returns its path. */
export function scaffoldConsumer(): string {
  const scratch = mkdtempSync(join(tmpdir(), 'liteship-journey-app-'));
  return scaffold('app', { cwd: scratch }).projectDir;
}

/** Copy the exact historical starter from the extracted pre-operation workspace. */
export function scaffoldPriorConsumer(prior: PriorPackedWorkspace): string {
  const scratch = mkdtempSync(join(tmpdir(), 'liteship-journey-prior-app-'));
  const projectDir = join(scratch, 'app');
  cpSync(resolve(prior.workspaceDir, 'packages', 'create-liteship', 'templates', 'default'), projectDir, {
    recursive: true,
  });
  const authoredGitignore = join(projectDir, 'gitignore');
  if (existsSync(authoredGitignore)) {
    writeFileSync(join(projectDir, '.gitignore'), readFileSync(authoredGitignore));
    rmSync(authoredGitignore);
  }
  return projectDir;
}

/**
 * Apply the current official scaffold as the explicit pre-1.0 source migration
 * over an existing prior consumer while preserving its installed dependency tree.
 */
export function applyCurrentScaffoldMigration(appDir: string): void {
  const current = scaffoldConsumer();
  try {
    rmSync(join(appDir, 'src'), { recursive: true, force: true });
    for (const entry of readdirSync(current)) {
      cpSync(join(current, entry), join(appDir, entry), { recursive: true, force: true });
    }
  } finally {
    removeDir(join(current, '..'));
  }
}

/** Options for {@link rewriteConsumerToTarballs}. */
export interface RewriteOptions {
  /**
   * The version SPEC written for the app's own `liteship` dependency (the manifest
   * range a consumer declares). `pnpm.overrides` force it to resolve to the packed
   * tarball regardless — the spec models "what the consumer's package.json says"
   * (e.g. a prior range in the upgrade journey). Defaults to the packed tarball URL.
   */
  readonly liteshipSpec?: string;
  /** Package manager whose real installed CLI/host route the journey exercises. */
  readonly packageManager?: ConsumerPackageManager;
}

/** Consumer installation authorities covered by packed journeys. */
export type ConsumerPackageManager = 'npm' | 'pnpm';

/**
 * Rewrite the scaffolded app's `package.json` so every `@liteship/*` scope (plus
 * the `liteship` umbrella and `create-liteship`) resolves to its packed
 * `file://…tgz` tarball via the selected package manager's root override map — MIRRORING how
 * `package-smoke.ts` builds its consumer. The app's DIRECT deps stay the real
 * consumer shape (`liteship` + `astro` + `typescript`); the overrides resolve the
 * umbrella's transitive workspace edges to the local tarballs. The pnpm route keeps
 * the default isolated linker: the facade must own its executable and host packages
 * must resolve their runtime entrypoints relative to themselves, never through public
 * hoisting or phantom root dependencies.
 */
export function rewriteConsumerToTarballs(appDir: string, packed: PackedWorkspace, options: RewriteOptions = {}): void {
  const overrides: Record<string, string> = {};
  for (const [name, tgz] of packed.tarballByName) overrides[name] = tarballFileUrl(tgz);

  const liteshipTgz = packed.tarballByName.get('liteship');
  journeyAssert(liteshipTgz !== undefined, 'packed workspace is missing the `liteship` umbrella tarball');

  const manifestPath = join(appDir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  const packageManager = options.packageManager ?? 'pnpm';
  if (packageManager === 'pnpm') {
    manifest['dependencies'] = {
      liteship: options.liteshipSpec ?? tarballFileUrl(liteshipTgz!),
      astro: peerVersion('astro'),
      typescript: peerVersion('typescript'),
    };
    manifest['pnpm'] = { overrides };
  } else {
    // npm supports root overrides using any dependency specifier, including file:
    // tarballs. Keep the authored dependency surface identical to pnpm while the
    // override graph redirects unpublished transitive fleet edges to this pack run.
    manifest['dependencies'] = {
      liteship: options.liteshipSpec ?? tarballFileUrl(liteshipTgz!),
      astro: peerVersion('astro'),
      typescript: peerVersion('typescript'),
    };
    manifest['overrides'] = Object.fromEntries(
      Object.entries(overrides).filter(([name]) => name !== 'liteship' && name !== 'create-liteship'),
    );
    delete manifest['pnpm'];
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  // A prior-control upgrade may have left the historical journey's compatibility
  // linker behind. Current one-install authority always returns to pnpm's default
  // isolated graph before installing the current facade.
  rmSync(join(appDir, '.npmrc'), { force: true });
}

/** Wire the historical starter to the genuinely historical package tarballs. */
export function rewritePriorConsumerToTarballs(appDir: string, prior: PriorPackedWorkspace): void {
  const overrides = Object.fromEntries([...prior.tarballByName].map(([name, tgz]) => [name, tarballFileUrl(tgz)]));
  const core = prior.tarballByName.get(PRIOR_CORE_PACKAGE);
  const astro = prior.tarballByName.get(PRIOR_ASTRO_PACKAGE);
  journeyAssert(
    core !== undefined && astro !== undefined,
    `prior-control tarballs are missing ${PRIOR_CORE_PACKAGE} or ${PRIOR_ASTRO_PACKAGE}`,
  );

  const manifestPath = join(appDir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  manifest['dependencies'] = {
    [PRIOR_CORE_PACKAGE]: tarballFileUrl(core!),
    [PRIOR_ASTRO_PACKAGE]: tarballFileUrl(astro!),
    astro: peerVersion('astro'),
    typescript: peerVersion('typescript'),
  };
  manifest['pnpm'] = { overrides };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(appDir, '.npmrc'), ['node-linker=hoisted', 'public-hoist-pattern[]=*', ''].join('\n'));
}

/** Write a minimal packed package-author manifest using the current tarballs only. */
export function writePackedAuthorManifest(appDir: string, packed: PackedWorkspace): void {
  const overrides = Object.fromEntries([...packed.tarballByName].map(([name, tgz]) => [name, tarballFileUrl(tgz)]));
  const liteship = packed.tarballByName.get('liteship');
  journeyAssert(liteship !== undefined, 'packed workspace is missing the liteship facade tarball');
  writeFileSync(
    join(appDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'liteship-package-author-consumer',
        private: true,
        type: 'module',
        dependencies: { liteship: tarballFileUrl(liteship!), typescript: peerVersion('typescript') },
        pnpm: { overrides },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(appDir, '.npmrc'), ['node-linker=hoisted', 'public-hoist-pattern[]=*', ''].join('\n'));
}

/**
 * Install the consumer with `--prefer-offline` — the warm store (seeded by the
 * workspace install) satisfies the bulk; the file:// tarballs need no network; only
 * the handful of transitively-drifted external versions the store lacks are fetched.
 * A pure `--offline` run store-misses on those drifted versions (a fresh consumer
 * re-resolves ranges the workspace lockfile pinned differently), so `--prefer-offline`
 * is the design-sanctioned install phase. Failure remains a failing journey.
 */
export async function installConsumer(
  appDir: string,
  packageManager: ConsumerPackageManager = 'pnpm',
  options: { readonly updateLockfile?: boolean } = {},
): Promise<PnpmRunResult> {
  if (packageManager === 'pnpm') {
    const args = ['install', '--prefer-offline'];
    if (options.updateLockfile === true) args.push('--no-frozen-lockfile');
    return runPnpm(args, { cwd: appDir, env: { FORCE_COLOR: '0' } });
  }
  const result = await spawnArgvCapture('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund'], {
    cwd: appDir,
  });
  return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

/** Run a headless `astro build` in the consumer app (the `tests/integration/astro/test.ts` pattern). */
export async function astroBuild(appDir: string): Promise<PnpmRunResult> {
  return runPnpm(['exec', 'astro', 'build'], { cwd: appDir, env: { FORCE_COLOR: '0' } });
}

/** Recursively collect every file under `dir` whose name ends with `ext`. */
export function findFiles(dir: string, ext: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findFiles(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

/** Decode the HTML entity encoding astro applies to an attribute VALUE (`&quot;` → `"`, …). */
export function htmlUnescape(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Remove a scratch directory, ignoring errors (best-effort cleanup in a `finally`). */
export function removeDir(dir: string | undefined): void {
  if (dir === undefined) return;
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort: a leftover scratch dir under os.tmpdir() is harmless.
  }
}

/**
 * Run the repo's `packages/cli/src/bin.ts` via the workspace `tsx` in `cwd`, capturing
 * stdout/stderr — the canonical `liteship` CLI invocation a journey drives. Uses the
 * absolute `tsx` binary + absolute `bin.ts` path so `cwd` can be a scratch consumer
 * OUTSIDE the workspace (the CLI reads `process.cwd()` for its repo scope). Never
 * throws on a nonzero exit; resolves with the captured streams + exit code (the
 * canonical `spawnArgvCapture` helper, so subprocess coverage inheritance is preserved).
 */
export async function runLiteshipCli(
  args: readonly string[],
  cwd: string,
): Promise<{ readonly code: number; readonly stdout: string; readonly stderr: string }> {
  const tsx = resolve(REPO_ROOT, 'node_modules', '.bin', 'tsx');
  const bin = resolve(REPO_ROOT, 'packages', 'cli', 'src', 'bin.ts');
  const result = await spawnArgvCapture(tsx, [bin, ...args], { cwd });
  return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

/**
 * Run the `liteship` executable installed in a packed consumer app.
 *
 * This deliberately goes through that app's package-manager executable lookup.
 * It never falls back to the workspace TS source or checkout build, so a missing
 * published bin, broken transitive link, or incomplete tarball is a real journey
 * failure rather than a conveniently bypassed product defect.
 */
export async function runInstalledLiteshipCli(
  args: readonly string[],
  cwd: string,
  packageManager: ConsumerPackageManager = 'pnpm',
): Promise<{ readonly code: number; readonly stdout: string; readonly stderr: string }> {
  if (packageManager === 'pnpm') {
    return runPnpm(['exec', 'liteship', ...args], { cwd, env: { FORCE_COLOR: '0' } });
  }
  const result = await spawnArgvCapture('npm', ['exec', '--', 'liteship', ...args], {
    cwd,
  });
  return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

/** Run one package-owned consumer script through its selected package manager. */
export async function runConsumerScript(
  script: string,
  cwd: string,
  packageManager: ConsumerPackageManager,
): Promise<{ readonly code: number; readonly stdout: string; readonly stderr: string }> {
  if (packageManager === 'pnpm') {
    return runPnpm(['run', script], { cwd, env: { FORCE_COLOR: '0' } });
  }
  const result = await spawnArgvCapture('npm', ['run', script], { cwd });
  return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

/** Run Node inside an installed consumer, resolving imports only from that consumer. */
export async function runInstalledNode(
  args: readonly string[],
  cwd: string,
): Promise<{ readonly code: number; readonly stdout: string; readonly stderr: string }> {
  const result = await spawnArgvCapture(process.execPath, args, { cwd });
  return { code: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

/** Parse the last JSON object emitted on a CLI receipt stdout stream (tolerant of leading log lines). */
export function parseReceipt(stdout: string): Record<string, unknown> {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const line = trimmed
      .split('\n')
      .reverse()
      .find((l) => l.trim().startsWith('{'));
    if (line === undefined) throw new JourneyAssertionError(`no JSON receipt on stdout:\n${stdout.slice(0, 400)}`);
    return JSON.parse(line) as Record<string, unknown>;
  }
}
