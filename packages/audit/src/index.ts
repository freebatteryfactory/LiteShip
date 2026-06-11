/**
 * @czap/audit — the profile-driven, downstream-installable audit engine.
 *
 * Runs the structure / integrity / surface passes against a `DevopsProfile`
 * (`profile.repoRoot` is the authoritative audit target). The LiteShip HICP
 * report bundle (scoring, strike-board, artifact provenance) is NOT part of this
 * package — it stays repo-local and composes these passes.
 *
 * @module
 */
export * from './types.js';
export * from './policy.js';
export * from './shared.js';
export * from './devops-profile.js';
export * from './consumer.js';
export * from './structure.js';
export * from './integrity.js';
export * from './surface.js';

import { liteshipDevopsProfile, resolveDevopsProfile } from './devops-profile.js';
import type { DevopsProfile } from './devops-profile.js';
import { runStructureAudit, type StructureSummary } from './structure.js';
import { runIntegrityAudit, type IntegritySummary } from './integrity.js';
import { runSurfaceAudit, type SurfaceSummary } from './surface.js';
import { createCounts } from './shared.js';
import type { AuditCounts, AuditFinding, AuditSectionResult, AuditSuppression } from './types.js';

/** The three audit passes plus their merged counts, run against one profile. */
export interface AuditPassResult {
  readonly structure: AuditSectionResult<StructureSummary>;
  readonly integrity: AuditSectionResult<IntegritySummary>;
  readonly surface: AuditSectionResult<SurfaceSummary>;
  readonly counts: AuditCounts;
  readonly findings: readonly AuditFinding[];
  readonly suppressed: readonly AuditSuppression[];
}

/**
 * Topology packages absent from a consumer install, surfaced as informational
 * findings — the README's "missing packages are reported" promise, recomputed
 * from the profile so the ADR-0012 profile shape stays untouched. A consumer
 * audits what it ships, so these are info, never errors.
 */
function consumerMissingFindings(profile: DevopsProfile): AuditFinding[] {
  const packageRoots = profile.packageRoots;
  if (!packageRoots) return [];
  return Object.keys(profile.packageTopology)
    .filter((name) => !(name in packageRoots))
    .sort((a, b) => a.localeCompare(b))
    .map(
      (name): AuditFinding => ({
        id: `support/consumer-missing/${name}`,
        section: 'support',
        rule: 'consumer-package-missing',
        severity: 'info',
        title: 'Topology package is not installed',
        summary:
          `${name} is listed in the profile's packageTopology but is not installed under ${profile.repoRoot}, ` +
          `so it was not audited. Install ${name} to audit it, or remove it from packageTopology if you do not ship it.`,
      }),
    );
}

/**
 * Run all three engine passes against a profile and merge their findings. This
 * is the reusable, repo-agnostic audit — it does NOT compute the LiteShip HICP
 * score, verify artifacts, or render reports (those compose this in scripts/).
 *
 * Accepts a PARTIAL profile: omitted fields take the documented defaults of
 * {@link resolveDevopsProfile}, so `runAuditPasses({ repoRoot })` just works.
 * With no argument at all, the full LiteShip reference profile applies.
 */
export function runAuditPasses(profile: Partial<DevopsProfile> = liteshipDevopsProfile): AuditPassResult {
  const resolved = resolveDevopsProfile(profile);
  const structure = runStructureAudit(resolved);
  const integrity = runIntegrityAudit(resolved);
  const surface = runSurfaceAudit(resolved);
  const findings = [
    ...structure.findings,
    ...integrity.findings,
    ...surface.findings,
    ...consumerMissingFindings(resolved),
  ];
  const suppressed = [...structure.suppressed, ...integrity.suppressed, ...surface.suppressed];
  return {
    structure,
    integrity,
    surface,
    counts: createCounts(findings),
    findings,
    suppressed,
  };
}
