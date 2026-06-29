/**
 * DevopsProfile (CUT D7 → relocated D9b-1) — the config/profile seam that drives
 * the audit engine. The default `liteshipDevopsProfile` references this package's
 * reference policy consts; `repoRoot` defaults to the current working directory
 * so the engine audits the caller's tree. A downstream project supplies its own
 * profile (programmatically or via `czap audit --profile`).
 *
 * @module
 */
import { ValidationError } from '@czap/error';
import {
  packageTopology,
  surfacePolicy,
  dynamicImportExemptions,
  foundationalPackages,
  normalizeRepoPath,
} from './policy.js';
import type { PackagePolicy } from './policy.js';
import { listProfilePackageManifests } from './shared.js';

/**
 * Structural shape of the surface policy the audit reads. Every field is
 * OPTIONAL: an absent surface is a surface the profile never declared, so its
 * check does not run — a downstream project with no Astro/Vite host supplies
 * `{}` and carries no host assumptions. The LiteShip `surfacePolicy` const is
 * the fully-populated reference.
 */
export interface SurfacePolicyShape {
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
   * Package owning the Vite virtual-module inventory (e.g. `'@czap/vite'`).
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
  /** Internal workspace package prefix — replaces the hardcoded `'@czap/'` import gate. */
  readonly internalPackagePrefix: string;
  /** Package layering law: package → { allowedInternalImports, kind }. */
  readonly packageTopology: Record<string, PackagePolicy>;
  /**
   * Foundational packages every package may import without an explicit
   * `allowedInternalImports` entry (the runtime analogue of `@czap/_spine`).
   * Optional: absent ⇒ no foundational exemptions (every internal edge must be
   * listed). Downstream profiles may set their own.
   */
  readonly foundationalPackages?: readonly string[];
  /** Sanctioned manifest-absent dynamic edges (`"<importer> -> <target>"`). */
  readonly dynamicImportExemptions: ReadonlySet<string>;
  /** Known public-surface files (orphan-detection seed). */
  readonly surfacePolicy: SurfacePolicyShape;
  /**
   * Optional explicit package-root map: package name → ABSOLUTE package dir.
   * When present, the passes enumerate THESE roots instead of globbing
   * `repoRoot/packages/*` — the consumer-install seam. Build one with
   * `consumerDevopsProfile()` / `discoverInstalledPackageRoots()` to audit
   * the `@czap/*` packages installed in a downstream repo's node_modules.
   */
  readonly packageRoots?: Readonly<Record<string, string>>;
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
  foundationalPackages,
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
      `If this repo only CONSUMES @czap/* from npm (it has no internal scope of its own), run ` +
      `\`czap audit --consumer\` instead — it audits the installed packages and never derives a prefix. ` +
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
 *   • `internalPackagePrefix`    → derived from the single common npm scope of
 *     the discovered package manifests; ambiguous or unscoped trees throw a
 *     teaching error instead of guessing.
 *
 * ADR-0012 pins WHICH fields a profile has, not that callers must hand-build
 * them; a fully-specified profile passes through unchanged (modulo repo-path
 * normalization).
 */
export function resolveDevopsProfile(partial: Partial<DevopsProfile>): DevopsProfile {
  const candidate: DevopsProfile = {
    repoRoot: normalizeRepoPath(partial.repoRoot ?? process.cwd()),
    internalPackagePrefix: partial.internalPackagePrefix ?? '',
    packageTopology: partial.packageTopology ?? {},
    dynamicImportExemptions: partial.dynamicImportExemptions ?? new Set<string>(),
    surfacePolicy: partial.surfacePolicy ?? {},
    ...(partial.foundationalPackages !== undefined ? { foundationalPackages: partial.foundationalPackages } : {}),
    ...(partial.packageRoots !== undefined ? { packageRoots: partial.packageRoots } : {}),
  };
  if (partial.internalPackagePrefix !== undefined) return candidate;
  return { ...candidate, internalPackagePrefix: deriveInternalPackagePrefix(candidate) };
}
