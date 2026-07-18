/**
 * Lockfile policy — the host-injectable DATA that the supply-chain analyzer
 * enforces over pnpm-lock.yaml + the workspace deps (Slice C, the avionics
 * tier).
 *
 * The POLICY is DATA, not code (ADR-0012, the same shape as the audit
 * `DevopsProfile` and `auditAllowlist`): a {@link LockfilePolicy} record names
 * the allowed registries, whether non-registry resolutions are permitted, and an
 * ALLOWLIST of dependencies sanctioned to carry a prerelease/range specifier
 * (each with a documented reason — never the rule weakened, only a named
 * exception). LiteShip's REFERENCE policy lives here as repo-local data; a
 * downstream project supplies its own and never inherits LiteShip's exceptions.
 *
 * The four hermeticity laws the policy enforces:
 *  (a) NO git / github / http(s) / tarball / directory dependencies — only
 *      registry artifacts (a non-registry `resolution:` is refused).
 *  (b) NO unsanctioned prerelease/range specs in PUBLISHED-package RUNTIME
 *      dependencies — a consumer's fresh install could drift to a different
 *      prerelease. A dep on {@link LockfilePolicy.prereleaseAllowlist} is an
 *      explicit, reasoned exception.
 *  (c) Every dependency RESOLVED + integrity-hashed in the lockfile (no
 *      floating / missing-integrity unit).
 *  (d) The lockfile is the single resolution truth (a recognized, frozen
 *      `lockfileVersion`).
 *
 * @module
 */

import type { SupplyChainViolation } from '@czap/gauntlet';
import type { ParsedLockfile, LockfileImporter } from './lockfile.js';

/** A dependency sanctioned to use a prerelease/range spec, with its reason. */
export interface PrereleaseException {
  /** The dependency name the exception covers (exact match). */
  readonly dependency: string;
  /** Why the prerelease/range is allowed (a real, reviewable justification). */
  readonly reason: string;
}

/** The host-injectable lockfile policy (DATA — ADR-0012). */
export interface LockfilePolicy {
  /**
   * Whether non-registry resolutions (git / tarball / directory) are allowed.
   * LiteShip's reference policy: `false` — registry artifacts only.
   */
  readonly allowNonRegistryResolutions: boolean;
  /**
   * The set of `lockfileVersion`s this policy recognizes as a frozen,
   * single-truth lockfile. A lockfile stamped with anything else is a
   * `unrecognized-lockfile-version` violation (law (d)).
   */
  readonly recognizedLockfileVersions: readonly string[];
  /**
   * Dependencies sanctioned to carry a prerelease/range specifier in a
   * published package's RUNTIME deps (law (b)). Everything NOT here that carries
   * a prerelease range reds the policy.
   */
  readonly prereleaseAllowlist: readonly PrereleaseException[];
}

/**
 * LiteShip's REFERENCE lockfile policy. Repo-local data — a downstream project
 * supplies its own. The prerelease allowlist is EMPTY: `effect` was the whole
 * monorepo's one sanctioned prerelease exception (its algebraic-effect
 * substrate, published upstream only as a bounded prerelease line), and Wave 8
 * shed it entirely — no published runtime dep carries a prerelease range any
 * more. The MECHANISM is retained (a downstream project, or a future reviewed
 * seam, can name its own exception here); with the list empty, ANY prerelease
 * runtime dep in this repo now reds the policy.
 */
export const LITESHIP_LOCKFILE_POLICY: LockfilePolicy = {
  allowNonRegistryResolutions: false,
  recognizedLockfileVersions: ['9.0'],
  prereleaseAllowlist: [],
};

/** A specifier is a prerelease form iff it carries a SemVer prerelease tag. */
function isPrereleaseSpecifier(specifier: string): boolean {
  // A SemVer prerelease has a `-tag` after the `major.minor.patch` (e.g.
  // `1.2.3-beta.1`, `>=4.0.0-beta.32 <5`). Match `<digits>.<digits>.<digits>-`.
  return /\d+\.\d+\.\d+-/.test(specifier);
}

/** Workspace-protocol specs (`workspace:*`) are internal links, not registry deps. */
function isWorkspaceSpecifier(specifier: string): boolean {
  return specifier.startsWith('workspace:') || specifier.startsWith('link:');
}

/**
 * The set of importer paths that correspond to PUBLISHED (non-private) packages.
 * The host computes this from the workspace manifests and passes it in — law (b)
 * applies ONLY to a published package's runtime deps (the surface a consumer
 * installs), never to the repo root or a private package's devDependencies.
 */
export interface PublishedImporters {
  /** Importer path (lockfile-relative, e.g. `packages/cli`) → package name. */
  readonly byPath: ReadonlyMap<string, string>;
}

/**
 * Evaluate the lockfile policy over a parsed lockfile. Returns the decided
 * violations (EMPTY ⇒ policy-clean). Pure: no I/O, no clock.
 */
export function evaluateLockfilePolicy(
  lockfile: ParsedLockfile,
  policy: LockfilePolicy,
  published: PublishedImporters,
): readonly SupplyChainViolation[] {
  const violations: SupplyChainViolation[] = [];

  // Law (d): recognized, frozen lockfile version.
  if (!policy.recognizedLockfileVersions.includes(lockfile.lockfileVersion)) {
    violations.push({
      code: 'unrecognized-lockfile-version',
      subject: `lockfileVersion: ${lockfile.lockfileVersion}`,
      detail: `the lockfile version is not in the policy's recognized set [${policy.recognizedLockfileVersions.join(', ')}] — the single-resolution-truth invariant (a frozen lockfile) cannot be vouched for.`,
    });
  }

  // Laws (a) + (c): every resolved unit is a registry artifact with an integrity hash.
  for (const pkg of lockfile.packages) {
    if (pkg.resolutionKind !== null && !policy.allowNonRegistryResolutions) {
      violations.push({
        code: 'git-url-dependency',
        subject: pkg.key,
        detail: `resolved from a non-registry ${pkg.resolutionKind} source — not a registry artifact; the policy forbids git/URL/directory deps because they break reproducible, hermetic installs.`,
      });
      continue;
    }
    if (pkg.integrity === null && pkg.resolutionKind === null) {
      violations.push({
        code: 'floating-resolution',
        subject: pkg.key,
        detail:
          'resolved without an integrity hash — a floating/unverifiable unit; every dependency must be integrity-pinned in the lockfile.',
      });
    }
  }

  // Law (b): no unsanctioned prerelease range in a PUBLISHED package's RUNTIME deps.
  const allowed = new Set(policy.prereleaseAllowlist.map((e) => e.dependency));
  for (const importer of lockfile.importers) {
    const pkgName = published.byPath.get(importer.path);
    if (pkgName === undefined) continue; // not a published package — skip law (b)
    for (const spec of runtimeDeps(importer)) {
      if (isWorkspaceSpecifier(spec.specifier)) continue;
      if (!isPrereleaseSpecifier(spec.specifier)) continue;
      if (allowed.has(spec.name)) continue;
      violations.push({
        code: 'prerelease-range',
        subject: `${pkgName} → ${spec.name}@${spec.specifier}`,
        detail: `published package "${pkgName}" declares a prerelease specifier on runtime dependency "${spec.name}" that is not on the policy's prerelease allowlist — a consumer's fresh install could drift to a different prerelease, breaking reproducibility.`,
      });
    }
  }

  return violations;
}

/** Runtime deps of an importer (the consumer-facing surface): dependencies + optionalDependencies. */
function runtimeDeps(importer: LockfileImporter): readonly { name: string; specifier: string }[] {
  return importer.specifiers
    .filter((s) => s.section === 'dependencies' || s.section === 'optionalDependencies')
    .map((s) => ({ name: s.name, specifier: s.specifier }));
}
