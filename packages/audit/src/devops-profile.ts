/**
 * DevopsProfile (CUT D7 → relocated D9b-1) — the config/profile seam that drives
 * the audit engine. The default `liteshipDevopsProfile` references this package's
 * reference policy consts; `repoRoot` defaults to the current working directory
 * so the engine audits the caller's tree. A downstream project supplies its own
 * profile (programmatically or via `czap audit --profile`).
 *
 * @module
 */
import { packageTopology, surfacePolicy, dynamicImportExemptions, normalizeRepoPath } from './policy.js';
import type { PackagePolicy } from './policy.js';

/**
 * Structural shape of the surface policy the audit reads (wide — `string[]`, not
 * the `as const` literal tuples of the LiteShip default — so an alternate project
 * profile can supply its own). The LiteShip `surfacePolicy` const assigns into this.
 */
export interface SurfacePolicyShape {
  readonly astroPackage: string;
  readonly astroClientDirectives: readonly string[];
  readonly astroRuntimeFiles: readonly string[];
  readonly viteVirtualModules: readonly string[];
  readonly knownCapabilityNotes: readonly { readonly file: string; readonly summary: string }[];
}

/**
 * The devops profile that drives the audit engine. `repoRoot` is the single
 * AUTHORITATIVE audit target (CUT D9a) — there is no parallel `root` parameter.
 */
export interface DevopsProfile {
  /** Repo root all engine paths resolve against — the authoritative audit target. */
  readonly repoRoot: string;
  /** Internal workspace package prefix — replaces the hardcoded `'@czap/'` import gate. */
  readonly internalPackagePrefix: string;
  /** Package layering law: package → { allowedInternalImports, kind }. */
  readonly packageTopology: Record<string, PackagePolicy>;
  /** Sanctioned manifest-absent dynamic edges (`"<importer> -> <target>"`). */
  readonly dynamicImportExemptions: ReadonlySet<string>;
  /** Known public-surface files (orphan-detection seed). */
  readonly surfacePolicy: SurfacePolicyShape;
}

/**
 * LiteShip's own profile — the reference DEFAULT. It references this package's
 * policy consts verbatim; `repoRoot` defaults to the current working directory
 * (for in-repo `pnpm run audit`, run from the repo root). Tests and downstream
 * callers point it elsewhere with `withRepoRoot`.
 */
export const liteshipDevopsProfile: DevopsProfile = {
  repoRoot: normalizeRepoPath(process.cwd()),
  internalPackagePrefix: '@czap/',
  packageTopology,
  dynamicImportExemptions,
  surfacePolicy,
};

/**
 * Derive a profile pointed at a different repo root (CUT D9a). `repoRoot` is the
 * single source of the audit target — the engines read `profile.repoRoot`, never
 * a parallel `root` param. A caller (or test) that wants to audit another tree
 * constructs a profile with this helper rather than passing a second argument
 * that would silently shadow the profile's own root.
 */
export function withRepoRoot(profile: DevopsProfile, repoRoot: string): DevopsProfile {
  return { ...profile, repoRoot: normalizeRepoPath(repoRoot) };
}
