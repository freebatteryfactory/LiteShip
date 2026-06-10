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

import { liteshipDevopsProfile } from './devops-profile.js';
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
 * Run all three engine passes against a profile and merge their findings. This
 * is the reusable, repo-agnostic audit — it does NOT compute the LiteShip HICP
 * score, verify artifacts, or render reports (those compose this in scripts/).
 */
export function runAuditPasses(profile: DevopsProfile = liteshipDevopsProfile): AuditPassResult {
  const structure = runStructureAudit(profile);
  const integrity = runIntegrityAudit(profile);
  const surface = runSurfaceAudit(profile);
  const findings = [...structure.findings, ...integrity.findings, ...surface.findings];
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
