/**
 * DevopsProfile (CUT D7) — the config/profile seam for LiteShip's devops engines.
 *
 * Today the engines (audit, invariants, bench, coverage, gauntlet) assume THIS
 * repo's hardcoded topology + `@czap/` prefix. D7 introduces an explicit profile
 * the AUDIT engine is threaded with (the highest-signal, most-pinned engine — the
 * proof slice). Other engines thread in later cuts (D7b); the gauntlet phase list
 * is D8; packaging + CLI exposure is D9.
 *
 * D7 LAW: this is a config SEAM, not a platform. The default `liteshipDevopsProfile`
 * REFERENCES the existing policy consts (single definition stays in
 * `scripts/audit/policy.ts`); the profile is the typed aggregation/injection point.
 * Decoupling is proven by THREADING the profile as a parameter and feeding a
 * different profile in tests — not by relocating policy data here.
 *
 * @module
 */
import { packageTopology, surfacePolicy, dynamicImportExemptions } from '../audit/policy.js';
import type { PackagePolicy } from '../audit/policy.js';
import { repoRoot } from '../audit/shared.js';

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
 * The devops profile that drives the audit engine (CUT D7 scope). Only fields the
 * AUDIT consumes are present (no unconsumed/aspirational fields). Sits BESIDE
 * `@czap/core`'s product `Config` — it is a different shape, not an extension.
 */
export interface DevopsProfile {
  /** Repo root all engine paths resolve against. */
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
 * LiteShip's own profile — the DEFAULT. It references the existing policy consts
 * verbatim, so threading it through the audit reproduces current behavior
 * byte-for-byte. (Relocating the consts into the profile is explicitly NOT D7.)
 */
export const liteshipDevopsProfile: DevopsProfile = {
  repoRoot,
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
  return { ...profile, repoRoot };
}
