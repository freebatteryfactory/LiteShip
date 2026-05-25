/**
 * Pure ship-planning helpers (CUT A1) — the genuinely side-effect-free parts of
 * the `czap ship` release workflow: tarball slug derivation, target selection,
 * lifecycle-script detection, build-env validation, package-manager version
 * parsing. No fs / spawn / process here — the CLI owns the orchestration,
 * destructive publish, and streaming; these are the planning primitives it uses.
 *
 * @module
 */
import type { ShipCapsule } from '@czap/core';

const LIFECYCLE_KEYS = ['prepack', 'prepare', 'prepublishOnly', 'prepublish'] as const;

/** Minimal package.json view the planners need. */
export interface PackageJsonLite {
  readonly name?: string;
  readonly version?: string;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly private?: boolean;
}

/** A discovered workspace package (the fs walk that produces these stays in the CLI). */
export interface WorkspacePackage {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly packageJsonBytes: Uint8Array;
  readonly packageJson: PackageJsonLite;
}

/**
 * Slug used by pnpm for tarball filenames (mirrors npm-packlist / libnpmpack).
 * `@scope/name` → `scope-name`; plain `name` → `name`.
 */
export function packageSlug(name: string): string {
  if (name.startsWith('@')) {
    const [scope, local] = name.slice(1).split('/');
    if (scope === undefined || local === undefined) return name;
    return `${scope}-${local}`;
  }
  return name;
}

/**
 * Select the packages to ship. No filter → all non-private packages. A filter
 * matches either a relative path (`./packages/core`) or a package name.
 */
export function selectTargets(
  workspace: readonly WorkspacePackage[],
  filter: string | undefined,
): WorkspacePackage[] {
  if (filter === undefined) return workspace.filter((p) => p.packageJson.private !== true);
  const filterNormalized = filter.replace(/^\.\//, '').replace(/\/$/, '');
  return workspace.filter((p) => p.relativePath === filterNormalized || p.packageJson.name === filter);
}

/** Report which publish lifecycle scripts a package actually declares. */
export function observedLifecycleScripts(pkg: PackageJsonLite): readonly string[] {
  const scripts = pkg.scripts ?? {};
  return LIFECYCLE_KEYS.filter((key) => typeof scripts[key] === 'string' && scripts[key]!.trim().length > 0);
}

/** Parse `pnpm@10.32.1(+sha…)` from a `packageManager` field. */
export function readPackageManagerVersion(rootPackageJson: PackageJsonLite & { packageManager?: string }): string {
  const raw = rootPackageJson.packageManager;
  if (typeof raw !== 'string') return 'unknown';
  const at = raw.indexOf('@');
  if (at < 0) return raw;
  const tail = raw.slice(at + 1);
  const plus = tail.indexOf('+');
  return plus < 0 ? tail : tail.slice(0, plus);
}

/**
 * Validate + assemble a ShipCapsule.BuildEnv. The OS/arch come from the caller
 * (the CLI reads process.*); only linux/darwin/win32 and x64/arm64 are modeled
 * in v0.1.0 — anything else is a hard failure, never a silent cast.
 */
export function deriveBuildEnv(input: {
  readonly os: string;
  readonly arch: string;
  readonly nodeVersion: string;
  readonly pmVersion: string;
}): ShipCapsule.BuildEnv {
  const { os, arch, nodeVersion, pmVersion } = input;
  if (os !== 'linux' && os !== 'darwin' && os !== 'win32') {
    throw new Error(`czap ship: unsupported platform ${os} (ShipCapsule.BuildEnv only models linux/darwin/win32)`);
  }
  if (arch !== 'x64' && arch !== 'arm64') {
    throw new Error(`czap ship: unsupported arch ${arch} (ShipCapsule.BuildEnv only models x64/arm64)`);
  }
  return { node_version: nodeVersion, pnpm_version: pmVersion, os, arch };
}
