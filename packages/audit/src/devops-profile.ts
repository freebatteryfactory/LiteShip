/**
 * DevopsProfile (CUT D7 → relocated D9b-1) — the config/profile seam that drives
 * the audit engine. The reusable engine owns no project policy: hosts inject
 * topology, surface, exemption, and suppression data explicitly. Partial
 * downstream profiles resolve to conservative empty policy rather than inheriting
 * the framework host's assumptions.
 *
 * @module
 */
import { ValidationError } from '@liteship/error';
import { normalizeRepoPath } from './policy.js';
import type { AuditAllowlistEntry, PackagePolicy } from './policy.js';
import { listProfilePackageManifests } from './shared.js';

/**
 * Structural shape of the surface policy the audit reads. Every field is
 * OPTIONAL: an absent surface is a surface the profile never declared, so its
 * check does not run — a downstream project with no Astro/Vite host supplies
 * `{}` and carries no host assumptions. A framework host may inject a
 * fully-populated reference policy.
 */
export interface SurfacePolicy {
  /** Astro host package name. Absent/empty — no Astro host, no astro checks. */
  readonly astroPackage?: string;
  readonly astroClientDirectives?: readonly string[];
  /**
   * Shared runtime adapter files, relative to the astro PACKAGE root (e.g.
   * `'src/runtime/boundary.ts'`). Entries starting with `packages/` are
   * treated as repo-root-relative for back-compat with pre-consumer-mode
   * profiles.
   */
  readonly astroRuntimeFiles?: readonly string[];
  readonly viteVirtualModules?: readonly string[];
  /**
   * Package owning the Vite virtual-module inventory.
   * When absent, the legacy repo-root-relative `packages/vite/...` location
   * is used so existing profiles keep working.
   */
  readonly vitePackage?: string;
  /** Virtual-module inventory file, relative to `vitePackage`'s root. */
  readonly viteVirtualModulesFile?: string;
  readonly knownCapabilityNotes?: readonly { readonly file: string; readonly summary: string }[];
}

/**
 * The devops profile that drives the audit engine. `repoRoot` is the single
 * AUTHORITATIVE audit target (CUT D9a) — there is no parallel `root` parameter.
 */
export interface DevopsProfile {
  /** Repo root all engine paths resolve against — the authoritative audit target. */
  readonly repoRoot: string;
  /** Internal workspace package prefix used by the import gate. */
  readonly internalPackagePrefix: string;
  /** Package layering law: package → { allowedInternalImports, kind }. */
  readonly packageTopology: Record<string, PackagePolicy>;
  /**
   * Foundational packages every package may import without an explicit
   * `allowedInternalImports` entry.
   * Optional: absent ⇒ no foundational exemptions (every internal edge must be
   * listed). Downstream profiles may set their own.
   */
  readonly foundationalPackages?: readonly string[];
  /** Sanctioned manifest-absent dynamic edges (`"<importer> -> <target>"`). */
  readonly dynamicImportExemptions: ReadonlySet<string>;
  /** Known public-surface files (orphan-detection seed). */
  readonly surfacePolicy: SurfacePolicy;
  /** Explicit finding suppressions owned by this profile. Absent policy means no suppression. */
  readonly allowlist?: readonly AuditAllowlistEntry[];
  /** Host-owned package/subpath to source-file projection for source-mode analysis. */
  readonly sourceEntrypoints?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Optional explicit package-root map: package name → ABSOLUTE package dir.
   * When present, the passes enumerate THESE roots instead of globbing
   * `repoRoot/packages/*` — the consumer-install seam. Build one with
   * `consumerDevopsProfile()` / `discoverInstalledPackageRoots()` to audit
   * the profile's packages installed in a downstream repo's node_modules.
   */
  readonly packageRoots?: Readonly<Record<string, string>>;
}

/**
 * Exact public key projection for operator/docs/tests. The interface remains
 * the shape owner; the profile-boundary census proves this tuple is exhaustive.
 */
export const DEVOPS_PROFILE_KEYS = [
  'repoRoot',
  'internalPackagePrefix',
  'packageTopology',
  'foundationalPackages',
  'dynamicImportExemptions',
  'surfacePolicy',
  'allowlist',
  'sourceEntrypoints',
  'packageRoots',
] as const satisfies readonly (keyof DevopsProfile)[];

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

/**
 * The single common npm scope of the discovered package manifests, as a
 * prefix (`'@acme/'`). Derivation never guesses: zero scoped manifests or
 * more than one scope is a thrown teaching error naming what was found.
 */
function deriveInternalPackagePrefix(profile: DevopsProfile): string {
  const names = listProfilePackageManifests(profile).map((pkg) => pkg.name);
  const scopes = [
    ...new Set(names.filter((name) => name.startsWith('@')).map((name) => `${name.split('/')[0]}/`)),
  ].sort((a, b) => a.localeCompare(b));
  if (scopes.length === 1) return scopes[0]!;
  const observed =
    scopes.length === 0
      ? `no scoped (@scope/name) package manifests were discovered under ${profile.repoRoot}`
      : `the discovered manifests span multiple scopes [${scopes.join(', ')}]`;
  throw ValidationError(
    'devops-profile',
    `resolveDevopsProfile: internalPackagePrefix was omitted and cannot be derived — ${observed}. ` +
      `Pass it explicitly, e.g. runAuditPasses({ repoRoot, internalPackagePrefix: '@acme/' }). ` +
      `If this repo only consumes a framework fleet from npm (it has no internal scope of its own), run ` +
      `the host's consumer-audit command instead — it audits installed packages and never derives a prefix. ` +
      `(A silent no-op prefix is deliberately NOT the default: a clean audit must never mean "nothing was checked".)`,
  );
}

/**
 * Resolve a PARTIAL profile into a full {@link DevopsProfile} with documented
 * defaults, so `runAuditPasses({ repoRoot })` just works:
 *
 *   • `repoRoot`                 → the current working directory
 *   • `packageTopology`          → `{}` (coverage classifies as policy-absent)
 *   • `dynamicImportExemptions`  → empty set (no sanctioned dynamic edges)
 *   • `surfacePolicy`            → `{}` (no host-surface assumptions)
 *   • `allowlist`                → `[]` (no hidden project suppression)
 *   • `internalPackagePrefix`    → derived from the single common npm scope of
 *     the discovered package manifests; ambiguous or unscoped trees throw a
 *     teaching error instead of guessing.
 *
 * The no-aspirational-fields law pins WHICH fields a profile has — only what the
 * audit actually consumes — not that callers must hand-build them; a fully-specified
 * profile passes through unchanged (modulo repo-path normalization).
 */
export function resolveDevopsProfile(partial: Partial<DevopsProfile>): DevopsProfile {
  const candidate: DevopsProfile = {
    repoRoot: normalizeRepoPath(partial.repoRoot ?? process.cwd()),
    internalPackagePrefix: partial.internalPackagePrefix ?? '',
    packageTopology: partial.packageTopology ?? {},
    dynamicImportExemptions: partial.dynamicImportExemptions ?? new Set<string>(),
    surfacePolicy: partial.surfacePolicy ?? {},
    allowlist: partial.allowlist ?? [],
    ...(partial.sourceEntrypoints !== undefined ? { sourceEntrypoints: partial.sourceEntrypoints } : {}),
    ...(partial.foundationalPackages !== undefined ? { foundationalPackages: partial.foundationalPackages } : {}),
    ...(partial.packageRoots !== undefined ? { packageRoots: partial.packageRoots } : {}),
  };
  if (partial.internalPackagePrefix !== undefined) return candidate;
  return { ...candidate, internalPackagePrefix: deriveInternalPackagePrefix(candidate) };
}
