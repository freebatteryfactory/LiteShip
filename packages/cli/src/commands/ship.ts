/**
 * `czap ship` — ADR-0011 publisher verb.
 *
 * For each target package: validates git, packs the tarball, runs
 * `pnpm publish --dry-run`, addresses each input via ShipCapsule helpers,
 * mints the capsule, writes `<slug>-<version>.shipcapsule.cbor` next to
 * the `.tgz`, and (unless `--dry-run`) hands off to `pnpm publish` for
 * the real upload.
 *
 * Doctrinal notes:
 *   - Git dirtiness is *recorded*, never blocked. The sin is lying.
 *   - The capsule lives next to the tarball, never inside it (ADR-0011
 *     §Rejected alternatives).
 *   - Emission goes through the `cli.ship-emit` `receiptedMutation`
 *     capsule — the seven-arm closure is preserved.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { Cause, Effect, Result } from 'effect';
import { HLC, ShipCapsule, wallClock, type AddressedDigest } from '@czap/core';
import {
  packageSlug,
  selectTargets,
  observedLifecycleScripts,
  readPackageManagerVersion,
  deriveBuildEnv,
  type PackageJsonLite,
  type WorkspacePackage,
} from '@czap/command';
import {
  findWorkspaceSpecLeaks,
  lockfileAddress,
  normalizedDryRunAddress,
  tarballManifestAddress,
  workspaceManifestAddress,
} from '../ship-manifest.js';
import { spawnArgv, spawnArgvCapture } from '../spawn-helpers.js';
import { emit, emitError } from '../receipts.js';
import type { ShipReceipt, ShipSkippedReceipt } from '../receipts.js';
import { ShipEmit } from '../capsules/ship-emit.js';

interface EffectOk<A> {
  readonly ok: true;
  readonly value: A;
}
interface EffectErr<E> {
  readonly ok: false;
  readonly error: E;
}
type EffectResult<A, E> = EffectOk<A> | EffectErr<E>;

/**
 * Adapter that materializes an Effect into a tagged result. We avoid
 * `Effect.either` (not in effect@4.0.0-beta.32) and rely on the Exit
 * primitive — first error wins, in line with how the core helpers fail
 * (single typed failure per Effect).
 */
async function runEffect<A, E>(effect: Effect.Effect<A, E>): Promise<EffectResult<A, E>> {
  const exit = await Effect.runPromiseExit(effect);
  if (exit._tag === 'Success') return { ok: true, value: exit.value };
  const found = Cause.findError(exit.cause);
  if (Result.isSuccess(found)) {
    return { ok: false, error: Result.getOrThrow(found) as E };
  }
  // Defect / interrupt path — surface as a plain Error to the caller. The
  // `as unknown as E` cast is the one sanctioned shape break here: callers
  // observe a structured E in 99.9% of cases; this is the never-happens
  // fallback for impossible defects (no Fail reasons in the Cause chain).
  return {
    ok: false,
    error: new Error(
      Cause.prettyErrors(exit.cause)
        .map((e) => e.message)
        .join('; '),
    ) as unknown as E,
  };
}

interface ShipOptions {
  readonly cwd: string;
  readonly filter?: string;
  readonly dryRun: boolean;
  readonly otp?: string;
  readonly provenance: boolean;
  /** `--help`/`-h` was passed: print usage and exit WITHOUT shipping. */
  readonly help: boolean;
  /** Unrecognized `-`/`--` flags. A real ship is REFUSED if any are present. */
  readonly unknownFlags: readonly string[];
}

const SHIP_USAGE = `czap ship — publish workspace packages (ADR-0011 publisher verb).

Usage:
  czap ship [--filter <pkg>] [--dry-run] [--provenance] [--otp <code>]

Options:
  --filter <pkg>   Ship only the named package (path or name). Default: ALL.
  --dry-run        Pack + mint the capsule, but do NOT publish.
  --provenance     Publish with npm provenance (CI/OIDC only).
  --otp <code>     npm one-time password.
  -h, --help       Show this help and exit (no publish).

With no --filter, ship publishes EVERY workspace package. Unrecognized flags are
refused (fail-closed) so a typo like \`czap ship --hepl\` can never trigger a
publish.`;

/**
 * npm/pnpm registry-conflict signatures for "this exact version is already
 * published". Idempotent re-runs (a release workflow retried mid-batch) hit
 * this in the publish pre-check; ship treats it as success-with-skip rather
 * than failure. Mirrors the patterns the release workflow's per-package
 * loop used to grep for before ship owned the idempotency contract.
 */
const ALREADY_PUBLISHED_PATTERN = /previously published|cannot publish over|EPUBLISHCONFLICT/i;

/**
 * Decide whether a failed publish pre-check means "this exact version is
 * already on the registry" (idempotent skip) as opposed to a real failure
 * (auth, network, packument validation) that must stop the ship.
 */
export function isAlreadyPublishedFailure(output: string): boolean {
  return ALREADY_PUBLISHED_PATTERN.test(output);
}

const readWorkspacePackagesGlobs = (cwd: string): string[] => {
  const ymlPath = join(cwd, 'pnpm-workspace.yaml');
  if (!existsSync(ymlPath)) return [];
  const text = readFileSync(ymlPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const globs: string[] = [];
  let inPackages = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = /^\s+-\s+['"]?([^'"]+)['"]?\s*$/.exec(line);
      if (m) {
        globs.push(m[1]!);
        continue;
      }
      // Non-list-item, non-empty line ends the `packages:` block.
      if (line.length > 0 && !line.startsWith(' ')) inPackages = false;
    }
  }
  return globs;
};

const resolveGlob = (cwd: string, pattern: string): string[] => {
  if (pattern.endsWith('/*')) {
    const parentRel = pattern.slice(0, -2);
    const parentAbs = join(cwd, parentRel);
    if (!existsSync(parentAbs)) return [];
    const stat = statSync(parentAbs);
    if (!stat.isDirectory()) return [];
    const out: string[] = [];
    for (const entry of readdirSync(parentAbs)) {
      const full = join(parentAbs, entry);
      try {
        if (statSync(full).isDirectory() && existsSync(join(full, 'package.json'))) {
          out.push(`${parentRel}/${entry}`);
        }
      } catch {
        /* unreadable entry — skip */
      }
    }
    return out;
  }
  const abs = join(cwd, pattern);
  if (existsSync(abs) && existsSync(join(abs, 'package.json'))) return [pattern];
  return [];
};

const loadWorkspace = (cwd: string): WorkspacePackage[] => {
  const globs = readWorkspacePackagesGlobs(cwd);
  const seen = new Set<string>();
  const out: WorkspacePackage[] = [];
  for (const g of globs) {
    for (const rel of resolveGlob(cwd, g)) {
      if (seen.has(rel)) continue;
      seen.add(rel);
      const absolutePath = join(cwd, rel);
      const pkgJsonPath = join(absolutePath, 'package.json');
      const packageJsonBytes = new Uint8Array(readFileSync(pkgJsonPath));
      const packageJson = JSON.parse(Buffer.from(packageJsonBytes).toString('utf8')) as PackageJsonLite;
      out.push({ absolutePath, relativePath: rel, packageJsonBytes, packageJson });
    }
  }
  out.sort((a, b) => (a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0));
  return out;
};

const lastNonEmptyLine = (text: string): string => {
  const lines = text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]!.trim();
    if (l.length > 0) return l;
  }
  return '';
};

/** Execute the ship command for one or more workspace packages. */
export async function ship(args: readonly string[]): Promise<number> {
  const cwd = process.cwd();
  const opts = parseArgs(args, cwd);

  // FAIL-CLOSED before any side effect: `--help` prints usage and exits, and an
  // unrecognized flag REFUSES to ship. Without this, `czap ship --help` (or any
  // typo'd flag) fell through to "no filter → publish EVERY package".
  if (opts.help) {
    process.stdout.write(`${SHIP_USAGE}\n`);
    return 0;
  }
  if (opts.unknownFlags.length > 0) {
    emitError(
      'ship',
      `unrecognized flag(s): ${opts.unknownFlags.join(', ')}`,
      'Run `czap ship --help`. Ship refuses to run with unknown flags so a typo cannot trigger a publish.',
    );
    return 1;
  }

  // Git state — never blocks, only records.
  const headRes = await spawnArgvCapture('git', ['rev-parse', 'HEAD'], { cwd });
  if (headRes.exitCode !== 0) {
    emitError('ship', `git rev-parse HEAD failed: ${headRes.stderr.trim()}`);
    return 1;
  }
  const sourceCommit = headRes.stdout.trim();
  const statusRes = await spawnArgvCapture('git', ['status', '--porcelain'], { cwd });
  if (statusRes.exitCode !== 0) {
    emitError('ship', `git status --porcelain failed: ${statusRes.stderr.trim()}`);
    return 1;
  }
  const sourceDirty = statusRes.stdout.trim().length > 0;

  // Lockfile + workspace manifest (computed once; shared across packages).
  const lockfilePath = join(cwd, 'pnpm-lock.yaml');
  if (!existsSync(lockfilePath)) {
    emitError('ship', `pnpm-lock.yaml not found at ${lockfilePath}`);
    return 1;
  }
  const lockBytes = new Uint8Array(readFileSync(lockfilePath));
  const workspace = loadWorkspace(cwd);
  if (workspace.length === 0) {
    emitError('ship', 'no workspace packages discovered (pnpm-workspace.yaml empty or missing)');
    return 1;
  }
  const workspaceInput = workspace.map((p) => ({
    relative_path: p.relativePath,
    package_json_bytes: p.packageJsonBytes,
  }));

  const lockAddrResult = await runEffect(lockfileAddress(lockBytes));
  if (!lockAddrResult.ok) {
    emitError('ship', `lockfileAddress failed: ${lockAddrResult.error.message}`);
    return 1;
  }
  const lockfileAddr = lockAddrResult.value;

  const wsAddrResult = await runEffect(workspaceManifestAddress(workspaceInput));
  if (!wsAddrResult.ok) {
    emitError('ship', `workspaceManifestAddress failed: ${wsAddrResult.error.message}`);
    return 1;
  }
  const workspaceManifestAddr = wsAddrResult.value;

  const rootPkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as PackageJsonLite & {
    packageManager?: string;
  };
  const pmVersion = readPackageManagerVersion(rootPkg);
  let buildEnv: ShipCapsule.BuildEnv;
  try {
    buildEnv = deriveBuildEnv({ os: process.platform, arch: process.arch, nodeVersion: process.version, pmVersion });
  } catch (e) {
    emitError('ship', e instanceof Error ? e.message : String(e));
    return 1;
  }

  const targets = selectTargets(workspace, opts.filter);
  if (targets.length === 0) {
    emitError('ship', `no packages matched${opts.filter !== undefined ? ` --filter ${opts.filter}` : ''}`);
    return 1;
  }

  const node = hostname();
  // HLC wall_ms is epoch milliseconds — seed it from the wall clock, never the monotonic one.
  const seedHlc = HLC.increment(HLC.create(node), wallClock.now());

  // Per-package emission loop. Any failure aborts before we hand off to
  // `pnpm publish` — we never publish without a capsule.
  const mintedNames: string[] = [];
  let skippedCount = 0;
  for (let i = 0; i < targets.length; i++) {
    const pkg = targets[i]!;
    const name = pkg.packageJson.name;
    const version = pkg.packageJson.version;
    if (typeof name !== 'string' || typeof version !== 'string') {
      emitError('ship', `${pkg.relativePath}: package.json missing name or version`);
      return 1;
    }

    // pnpm pack — writes the .tgz into the package dir and prints its path
    // on stdout (last non-empty line). We don't trust the stdout filename
    // alone; we recompute the canonical slug and resolve it relative to
    // the package dir, then sanity-check existence.
    const packRes = await spawnArgvCapture('pnpm', ['pack'], { cwd: pkg.absolutePath });
    if (packRes.exitCode !== 0) {
      emitError('ship', `pnpm pack failed in ${pkg.relativePath}: ${packRes.stderr.trim()}`);
      return 1;
    }
    const slug = packageSlug(name);
    const tarballName = `${slug}-${version}.tgz`;
    const tarballPath = join(pkg.absolutePath, tarballName);
    if (!existsSync(tarballPath)) {
      // Fall back to whatever pnpm printed in case slug logic ever drifts.
      const printed = lastNonEmptyLine(packRes.stdout);
      const candidate = printed.startsWith('/') ? printed : join(pkg.absolutePath, printed);
      if (printed.length > 0 && existsSync(candidate)) {
        emitError(
          'ship',
          `tarball slug mismatch: expected ${tarballPath} but pnpm wrote ${candidate}. ` +
            `Refusing to ship a mislabeled artifact.`,
        );
      } else {
        emitError('ship', `pnpm pack did not produce ${tarballName} in ${pkg.relativePath}`);
      }
      return 1;
    }
    const tarballBytes = new Uint8Array(readFileSync(tarballPath));

    // Refuse to publish a tarball whose package.json still carries
    // workspace: specs — npm consumers cannot install them (the
    // @czap/core@0.1.4 defect), and a ShipCapsule minted over one would
    // be evidence of a broken artifact. package:smoke gates this in CI;
    // this closes the manual/local ship path.
    let workspaceLeaks: readonly string[];
    try {
      workspaceLeaks = findWorkspaceSpecLeaks(tarballBytes);
    } catch (e) {
      emitError(
        'ship',
        `could not read package/package.json from ${tarballPath}: ${e instanceof Error ? e.message : String(e)} — ` +
          `the tarball is malformed; re-pack with \`pnpm pack\` from the workspace root.`,
      );
      return 1;
    }
    if (workspaceLeaks.length > 0) {
      emitError(
        'ship',
        `${name} packed with unresolved workspace: specs (${workspaceLeaks.join('; ')}) — npm consumers cannot ` +
          `install these. This usually means the tarball was packed outside pnpm's workspace context. ` +
          `Fix: re-pack via \`pnpm pack\` (or publish through \`czap ship\` from the workspace root) so pnpm ` +
          `rewrites workspace: to concrete versions, then ship again.`,
      );
      return 1;
    }

    const tmAddrResult = await runEffect(tarballManifestAddress(tarballBytes));
    if (!tmAddrResult.ok) {
      emitError('ship', `tarballManifestAddress failed for ${pkg.relativePath}: ${tmAddrResult.error.message}`);
      return 1;
    }
    const tarballManifestAddr: AddressedDigest = tmAddrResult.value;

    // pnpm publish --dry-run — notice block goes to stderr; the `+ name@ver`
    // line goes to stdout. Both are part of the observed dry-run; the
    // normalizer redacts repo-root + timestamps so two clean publishes
    // produce byte-identical canonical text.
    const dryRes = await spawnArgvCapture('pnpm', ['publish', '--dry-run', '--no-git-checks'], {
      cwd: pkg.absolutePath,
    });
    if (dryRes.exitCode !== 0) {
      const failureText = `${dryRes.stderr}\n${dryRes.stdout}`;
      if (isAlreadyPublishedFailure(failureText)) {
        // Idempotent re-run: this exact version is already on the registry.
        // The package on npm matches the canonical state — skip mint+publish
        // for it and keep going (ROADMAP §4: replaces the release workflow's
        // per-package grep fallback).
        const skipped: ShipSkippedReceipt = {
          status: 'ok',
          command: 'ship',
          timestamp: new Date(wallClock.now()).toISOString(),
          package_name: name,
          package_version: version,
          already_published: true,
        };
        emit(skipped);
        skippedCount += 1;
        continue;
      }
      emitError(
        'ship',
        `pnpm publish --dry-run failed in ${pkg.relativePath}: ${dryRes.stderr.trim() || dryRes.stdout.trim()}`,
      );
      return 1;
    }
    const dryRunRaw = `${dryRes.stderr}\n${dryRes.stdout}`;
    const dryAddrResult = await runEffect(normalizedDryRunAddress(dryRunRaw, { repo_root_absolute_path: cwd }));
    if (!dryAddrResult.ok) {
      emitError('ship', `normalizedDryRunAddress failed for ${pkg.relativePath}: ${dryAddrResult.error.message}`);
      return 1;
    }
    const publishDryRunAddr = dryAddrResult.value;

    // Each capsule advances the seed HLC so a multi-package ship batch
    // carries strictly-monotone generated_at values. Named generatedHlc — it is an
    // HLC (causal, identity-bearing), NOT a wall-clock string (CUT generated-time).
    const generatedHlc = HLC.increment(i === 0 ? seedHlc : seedHlc, wallClock.now() + i);

    const input: ShipCapsule.Input = {
      _kind: 'shipCapsule',
      schema_version: 1,
      package_name: name,
      package_version: version,
      source_commit: sourceCommit,
      source_dirty: sourceDirty,
      lockfile_address: lockfileAddr,
      workspace_manifest_address: workspaceManifestAddr,
      tarball_manifest_address: tarballManifestAddr,
      build_env: buildEnv,
      package_manager: 'pnpm',
      package_manager_version: pmVersion,
      publish_dry_run_address: publishDryRunAddr,
      lifecycle_scripts_observed: observedLifecycleScripts(pkg.packageJson),
      generated_at: generatedHlc,
      previous_ship_capsule: null,
    };

    const makeResult = await runEffect(ShipCapsule.make(input));
    if (!makeResult.ok) {
      emitError('ship', `ShipCapsule.make failed for ${pkg.relativePath}: ${makeResult.error.message}`);
      return 1;
    }
    const capsule = makeResult.value;
    const capsulePath = join(pkg.absolutePath, `${slug}-${version}.shipcapsule.cbor`);
    try {
      ShipEmit.run({ capsule, capsule_path: capsulePath });
    } catch (e) {
      emitError(
        'ship',
        `ship-emit capsule failed for ${pkg.relativePath}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return 1;
    }

    const receipt: ShipReceipt = {
      status: 'ok',
      command: 'ship',
      timestamp: new Date(wallClock.now()).toISOString(),
      package_name: name,
      package_version: version,
      capsule_id: capsule.id,
      capsule_path: capsulePath,
      tarball_path: tarballPath,
      generated_at: generatedHlc,
      dry_run: opts.dryRun,
    };
    emit(receipt);
    mintedNames.push(name);
  }

  if (opts.dryRun) return 0;

  if (mintedNames.length === 0) {
    if (skippedCount > 0) {
      // Every selected package is already at this version on the registry —
      // a fully idempotent re-run succeeds with the skip receipts above.
      return 0;
    }
    emitError('ship', 'no packages were minted; nothing to publish');
    return 1;
  }

  // Hand off to pnpm publish — publish exactly the packages we just
  // addressed by passing each as a global --filter, plus -r to make
  // pnpm iterate. `--access public` is required for scoped packages
  // on a free npm org; `--no-git-checks` matches the documented release
  // workflow (we publish from a release branch, not main).
  const filterArgs = mintedNames.flatMap((n) => ['--filter', n]);
  const publishArgs = [...filterArgs, '-r', 'publish', '--access', 'public', '--no-git-checks'];
  if (opts.otp !== undefined) {
    publishArgs.push('--otp', opts.otp);
  }
  if (opts.provenance) {
    publishArgs.push('--provenance');
  }
  const publishRes = await spawnArgv('pnpm', publishArgs);
  if (publishRes.exitCode !== 0) {
    emitError(
      'ship',
      `pnpm publish exited ${publishRes.exitCode}${publishRes.stderrTail ? `: ${publishRes.stderrTail.trim()}` : ''}`,
    );
    return 2;
  }
  return 0;
}

function parseArgs(args: readonly string[], cwd: string): ShipOptions {
  let filter: string | undefined;
  let otp: string | undefined;
  let dryRun = false;
  let provenance = false;
  let help = false;
  const unknownFlags: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--help' || a === '-h') {
      help = true;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--provenance') {
      provenance = true;
      continue;
    }
    if (a === '--filter') {
      const next = args[i + 1];
      if (next !== undefined) {
        filter = next;
        i++;
      }
      continue;
    }
    if (a.startsWith('--filter=')) {
      filter = a.slice('--filter='.length);
      continue;
    }
    if (a === '--otp') {
      const next = args[i + 1];
      if (next !== undefined) {
        otp = next;
        i++;
      }
      continue;
    }
    if (a.startsWith('--otp=')) {
      otp = a.slice('--otp='.length);
      continue;
    }
    if (a.startsWith('-')) {
      // An unrecognized flag (e.g. `--help` typo, `--all`, `--yes`). Collect it
      // so ship() can REFUSE rather than silently fall through to "no filter →
      // publish everything" — the footgun where `czap ship --help` shipped.
      unknownFlags.push(a);
      continue;
    }
    if (filter === undefined) {
      // Positional package path/name.
      filter = a;
    }
  }
  return { filter, dryRun, otp, provenance, help, unknownFlags, cwd };
}
