/**
 * `liteship ship` — ADR-0011 publisher verb.
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
import { HLC, ShipCapsule, wallClock, type AddressedDigest } from '@liteship/core';
import {
  packageSlug,
  selectTargets,
  observedLifecycleScripts,
  readPackageManagerVersion,
  deriveBuildEnv,
  type PackageJsonLite,
  type WorkspacePackage,
} from '@liteship/command';
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

const SHIP_USAGE = `liteship ship — publish workspace packages (ADR-0011 publisher verb).

Usage:
  liteship ship [--filter <pkg>] [--dry-run] [--provenance] [--otp <code>]

Options:
  --filter <pkg>   Ship only the named package (path or name). Default: ALL.
  --dry-run        Pack + mint the capsule, but do NOT publish.
  --provenance     Publish with npm provenance (CI/OIDC only).
  --otp <code>     npm one-time password.
  -h, --help       Show this help and exit (no publish).

With no --filter, ship publishes EVERY workspace package. Unrecognized flags are
refused (fail-closed) so a typo like \`liteship ship --hepl\` can never trigger a
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
        // An entry that cannot be statSync-d (permission / race) is not a publishable
        // package — skip it and continue discovery. Conservative + non-corrupting: a
        // genuinely unreadable directory entry is never a package we could ship.
        continue;
      }
    }
    return out;
  }
  const abs = join(cwd, pattern);
  if (existsSync(abs) && existsSync(join(abs, 'package.json'))) return [pattern];
  return [];
};

/**
 * Build the argv for the publish handoff. ship publishes each ALREADY-PACKED,
 * `workspace:*`-rewritten tarball via the **npm CLI** (>= 11.5.1) rather than
 * `pnpm publish`: npm performs npm's OIDC trusted-publishing token exchange natively in
 * CI, which pnpm does not (pnpm#11513 / pnpm#9812) — that gap was the `ENEEDAUTH` at every
 * OIDC cut. The tarball is tool-agnostic: pnpm packed it (rewriting `workspace:` specs,
 * still enforced by `findWorkspaceSpecLeaks`), npm just uploads it. `--access public` is
 * required for scoped packages on a free org; provenance/otp ride through when requested.
 * (Defined below the glob helpers so it never shifts the line-anchored no-silent-catch
 * waiver in `resolveGlob` — traceability/standards-waivers.json.)
 */
export function buildNpmPublishArgv(tarballPath: string, opts: { provenance: boolean; otp?: string }): string[] {
  const args = ['publish', tarballPath, '--access', 'public'];
  if (opts.provenance) args.push('--provenance');
  if (opts.otp !== undefined) args.push('--otp', opts.otp);
  return args;
}

/**
 * Topologically sort ship targets so each package publishes AFTER its in-batch `@liteship/*`
 * dependencies. `pnpm -r publish` did this implicitly (dependencies before dependents);
 * the per-tarball `npm publish` handoff must preserve it, or a no-filter ship could push
 * a dependent — notably the `liteship` umbrella — before a same-version dependency exists
 * on the registry, leaving a window where the dependent is installable but unresolvable.
 * Ties keep input (workspace-path) order; a dependency cycle degrades to input order for
 * the cycle members (publish still happens, just unsorted among them). The manifests were
 * already parsed by the workspace loader, so `JSON.parse` here needs no guard.
 */
export function topoSortByDependencies(targets: readonly WorkspacePackage[]): WorkspacePackage[] {
  const byName = new Map<string, WorkspacePackage>();
  for (const t of targets) {
    if (typeof t.packageJson.name === 'string') byName.set(t.packageJson.name, t);
  }
  const inBatchDeps = (t: WorkspacePackage): string[] => {
    const manifest = JSON.parse(new TextDecoder().decode(t.packageJsonBytes)) as {
      dependencies?: Record<string, string>;
    };
    return Object.keys(manifest.dependencies ?? {}).filter((dep) => byName.has(dep));
  };
  const sorted: WorkspacePackage[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (t: WorkspacePackage): void => {
    const name = t.packageJson.name;
    if (typeof name !== 'string') {
      sorted.push(t);
      return;
    }
    if (state.has(name)) return; // 'done' → placed; 'visiting' → cycle, don't recurse
    state.set(name, 'visiting');
    for (const dep of inBatchDeps(t)) {
      const depTarget = byName.get(dep);
      if (depTarget) visit(depTarget);
    }
    state.set(name, 'done');
    sorted.push(t);
  };
  for (const t of targets) visit(t);
  return sorted;
}

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
  // unrecognized flag REFUSES to ship. Without this, `liteship ship --help` (or any
  // typo'd flag) fell through to "no filter → publish EVERY package".
  if (opts.help) {
    process.stdout.write(`${SHIP_USAGE}\n`);
    return 0;
  }
  if (opts.unknownFlags.length > 0) {
    emitError(
      'ship',
      'cli/invalid-argument',
      `unrecognized flag(s): ${opts.unknownFlags.join(', ')}`,
      'Run `liteship ship --help`. Ship refuses to run with unknown flags so a typo cannot trigger a publish.',
    );
    return 1;
  }

  // Git state — never blocks, only records.
  const headRes = await spawnArgvCapture('git', ['rev-parse', 'HEAD'], { cwd });
  if (headRes.exitCode !== 0) {
    emitError('ship', 'cli/command-failed', `git rev-parse HEAD failed: ${headRes.stderr.trim()}`);
    return 1;
  }
  const sourceCommit = headRes.stdout.trim();
  const statusRes = await spawnArgvCapture('git', ['status', '--porcelain'], { cwd });
  if (statusRes.exitCode !== 0) {
    emitError('ship', 'cli/command-failed', `git status --porcelain failed: ${statusRes.stderr.trim()}`);
    return 1;
  }
  const sourceDirty = statusRes.stdout.trim().length > 0;

  // Lockfile + workspace manifest (computed once; shared across packages).
  const lockfilePath = join(cwd, 'pnpm-lock.yaml');
  if (!existsSync(lockfilePath)) {
    emitError('ship', 'cli/workspace-required', `pnpm-lock.yaml not found at ${lockfilePath}`);
    return 1;
  }
  const lockBytes = new Uint8Array(readFileSync(lockfilePath));
  const workspace = loadWorkspace(cwd);
  if (workspace.length === 0) {
    emitError(
      'ship',
      'cli/workspace-required',
      'no workspace packages discovered (pnpm-workspace.yaml empty or missing)',
    );
    return 1;
  }
  const workspaceInput = workspace.map((p) => ({
    relative_path: p.relativePath,
    package_json_bytes: p.packageJsonBytes,
  }));

  const lockfileAddr = lockfileAddress(lockBytes);
  const workspaceManifestAddr = workspaceManifestAddress(workspaceInput);

  const rootPkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as PackageJsonLite & {
    packageManager?: string;
  };
  const pmVersion = readPackageManagerVersion(rootPkg);
  let buildEnv: ShipCapsule.BuildEnv;
  try {
    buildEnv = deriveBuildEnv({ os: process.platform, arch: process.arch, nodeVersion: process.version, pmVersion });
  } catch (e) {
    emitError('ship', 'cli/config-invalid', e instanceof Error ? e.message : String(e));
    return 1;
  }

  // Dependency order so the per-tarball npm publish loop pushes deps before dependents
  // (pnpm -r did this implicitly). No-op for the release path (one package per ship
  // invocation) — matters for a local no-filter ship of the whole workspace.
  const targets = topoSortByDependencies(selectTargets(workspace, opts.filter));
  if (targets.length === 0) {
    emitError(
      'ship',
      'cli/not-found',
      `no packages matched${opts.filter !== undefined ? ` --filter ${opts.filter}` : ''}`,
    );
    return 1;
  }

  const node = hostname();
  // HLC wall_ms is epoch milliseconds — seed it from the wall clock, never the monotonic one.
  const seedHlc = HLC.increment(HLC.create(node), wallClock.now());

  // Per-package emission loop. Any failure aborts before we hand off to
  // `pnpm publish` — we never publish without a capsule.
  const mintedNames: string[] = [];
  // The already-packed tarball path for each minted package — the publish handoff
  // uploads exactly these (npm publish <tgz>), not the workspace dir.
  const mintedTarballs: string[] = [];
  let skippedCount = 0;
  for (let i = 0; i < targets.length; i++) {
    const pkg = targets[i]!;
    const name = pkg.packageJson.name;
    const version = pkg.packageJson.version;
    if (typeof name !== 'string' || typeof version !== 'string') {
      emitError('ship', 'cli/config-invalid', `${pkg.relativePath}: package.json missing name or version`);
      return 1;
    }

    // pnpm pack — writes the .tgz into the package dir and prints its path
    // on stdout (last non-empty line). We don't trust the stdout filename
    // alone; we recompute the canonical slug and resolve it relative to
    // the package dir, then sanity-check existence.
    const packRes = await spawnArgvCapture('pnpm', ['pack'], { cwd: pkg.absolutePath });
    if (packRes.exitCode !== 0) {
      emitError('ship', 'cli/command-failed', `pnpm pack failed in ${pkg.relativePath}: ${packRes.stderr.trim()}`);
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
          'cli/integrity-failed',
          `tarball slug mismatch: expected ${tarballPath} but pnpm wrote ${candidate}. ` +
            `Refusing to ship a mislabeled artifact.`,
        );
      } else {
        emitError('ship', 'cli/no-output', `pnpm pack did not produce ${tarballName} in ${pkg.relativePath}`);
      }
      return 1;
    }
    const tarballBytes = new Uint8Array(readFileSync(tarballPath));

    // Refuse to publish a tarball whose package.json still carries
    // workspace: specs — npm consumers cannot install them (the
    // @liteship/core@0.1.4 defect), and a ShipCapsule minted over one would
    // be evidence of a broken artifact. package:smoke gates this in CI;
    // this closes the manual/local ship path.
    let workspaceLeaks: readonly string[];
    try {
      workspaceLeaks = findWorkspaceSpecLeaks(tarballBytes);
    } catch (e) {
      emitError(
        'ship',
        'cli/integrity-failed',
        `could not read package/package.json from ${tarballPath}: ${e instanceof Error ? e.message : String(e)} — ` +
          `the tarball is malformed; re-pack with \`pnpm pack\` from the workspace root.`,
      );
      return 1;
    }
    if (workspaceLeaks.length > 0) {
      emitError(
        'ship',
        'cli/integrity-failed',
        `${name} packed with unresolved workspace: specs (${workspaceLeaks.join('; ')}) — npm consumers cannot ` +
          `install these. This usually means the tarball was packed outside pnpm's workspace context. ` +
          `Fix: re-pack via \`pnpm pack\` (or publish through \`liteship ship\` from the workspace root) so pnpm ` +
          `rewrites workspace: to concrete versions, then ship again.`,
      );
      return 1;
    }

    let tarballManifestAddr: AddressedDigest;
    try {
      tarballManifestAddr = tarballManifestAddress(tarballBytes);
    } catch (e) {
      emitError(
        'ship',
        'cli/integrity-failed',
        `tarballManifestAddress failed for ${pkg.relativePath}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return 1;
    }

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
        'cli/command-failed',
        `pnpm publish --dry-run failed in ${pkg.relativePath}: ${dryRes.stderr.trim() || dryRes.stdout.trim()}`,
      );
      return 1;
    }
    const dryRunRaw = `${dryRes.stderr}\n${dryRes.stdout}`;
    const publishDryRunAddr = normalizedDryRunAddress(dryRunRaw, { repo_root_absolute_path: cwd });

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

    const capsule = ShipCapsule.make(input);
    const capsulePath = join(pkg.absolutePath, `${slug}-${version}.shipcapsule.cbor`);
    try {
      ShipEmit.run({ capsule, capsule_path: capsulePath });
    } catch (e) {
      emitError(
        'ship',
        'cli/integrity-failed',
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
    mintedTarballs.push(tarballPath);
  }

  if (opts.dryRun) return 0;

  if (mintedNames.length === 0) {
    if (skippedCount > 0) {
      // Every selected package is already at this version on the registry —
      // a fully idempotent re-run succeeds with the skip receipts above.
      return 0;
    }
    emitError('ship', 'cli/no-output', 'no packages were minted; nothing to publish');
    return 1;
  }

  // Hand off to the npm CLI — publish each already-packed tarball via
  // `npm publish <tgz>` (see buildNpmPublishArgv). npm does the OIDC trusted-publishing
  // token exchange natively in CI; `pnpm publish` does not, which is why every OIDC cut
  // hit ENEEDAUTH. One publish per tarball (release.yml already ships one package per
  // ship invocation; a local no-filter ship loops). The pnpm dry-run pre-check above
  // already skipped anything already on the registry, but we still treat an
  // already-published error here as an idempotent skip so a retry racing the gate can't
  // fail the batch.
  for (let i = 0; i < mintedTarballs.length; i++) {
    const tarballPath = mintedTarballs[i]!;
    const publishRes = await spawnArgv(
      'npm',
      buildNpmPublishArgv(tarballPath, { provenance: opts.provenance, otp: opts.otp }),
    );
    if (publishRes.exitCode !== 0) {
      const tail = publishRes.stderrTail?.trim() ?? '';
      if (isAlreadyPublishedFailure(tail)) continue;
      emitError(
        'ship',
        'cli/command-failed',
        `npm publish exited ${publishRes.exitCode} for ${mintedNames[i]}${tail ? `: ${tail}` : ''}`,
      );
      return 2;
    }
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
      // publish everything" — the footgun where `liteship ship --help` shipped.
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
