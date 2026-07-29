/**
 * LiteShip's audit profile, owned by the terminal host that injects audit facts.
 *
 * The reusable `@liteship/audit` engine deliberately carries no fleet topology,
 * host-surface assumptions, dynamic exemptions, or suppressions. This module
 * composes those project facts from the generated package catalog and supplies
 * them at the host boundary that keeps the engine lean and downstream-installable.
 *
 * @module
 */
import { consumerDevopsProfile, normalizeRepoPath, withRepoRoot, type DevopsProfile } from '@liteship/audit';
import {
  GENERATED_LITESHIP_PACKAGE_ROSTER,
  GENERATED_LITESHIP_SOURCE_ENTRYPOINTS,
} from './audit-package-catalog.generated.js';
import {
  auditAllowlist,
  dynamicImportExemptions,
  foundationalPackages,
  packageTopology,
  surfacePolicy,
} from './liteship-audit-policy.js';

/** Exact generated scoped fleet used by LiteShip's consumer audit profile. */
export const LITESHIP_PACKAGE_ROSTER: readonly string[] = GENERATED_LITESHIP_PACKAGE_ROSTER;

/** LiteShip project policy injected into the reusable audit engine. */
export const liteshipDevopsProfile: DevopsProfile = Object.freeze({
  repoRoot: normalizeRepoPath(process.cwd()),
  internalPackagePrefix: '@liteship/',
  packageTopology,
  foundationalPackages,
  dynamicImportExemptions,
  surfacePolicy,
  allowlist: auditAllowlist,
  sourceEntrypoints: GENERATED_LITESHIP_SOURCE_ENTRYPOINTS,
});

/** Re-root LiteShip's host policy without changing any project law. */
export function liteshipProfileAt(repoRoot: string): DevopsProfile {
  return withRepoRoot(liteshipDevopsProfile, repoRoot);
}

/** Discover the installed LiteShip fleet beneath a consumer project. */
export function liteshipConsumerDevopsProfile(cwd: string = process.cwd()): DevopsProfile {
  return consumerDevopsProfile(cwd, liteshipDevopsProfile);
}
