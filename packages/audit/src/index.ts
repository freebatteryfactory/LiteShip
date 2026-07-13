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
export * from './ts-program.js';
export * from './code-ranges.js';
export * from './repo-ir-build.js';
export * from './repo-ir-language-service.js';
export * from './repo-ir-taint.js';
export * from './repo-ir-capability-link.js';
export * from './mutation-engine.js';
export * from './mutation-verdict.js';
export * from './mutation-equivalents.js';
export * from './mutation-facts-build.js';
export * from './mcdc-engine.js';
export * from './mcdc-facts-build.js';
export * from './structure.js';
export * from './integrity.js';
export * from './surface.js';
export * from './skip-detect-ast.js';
export * from './active-surface-reader.js';
export * from './workers-date-scan.js';

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
    .map((name): AuditFinding => ({
      id: `support/consumer-missing/${name}`,
      section: 'support',
      rule: 'consumer-package-missing',
      severity: 'info',
      title: 'Topology package is not installed',
      summary:
        `${name} is listed in the profile's packageTopology but is not installed under ${profile.repoRoot}, ` +
        `so it was not audited. Install ${name} to audit it, or remove it from packageTopology if you do not ship it.`,
    }));
}

/**
 * CUT A0: clean must never read as unchecked. Zero discovered packages means
 * nothing was audited, so the run carries a support-section ERROR instead of
 * a deceptively green zero-findings result.
 */
function nothingAuditedFinding(profile: DevopsProfile): AuditFinding {
  const prefix = profile.internalPackagePrefix || '@czap/';
  const summary = profile.packageRoots
    ? `No installed packages from the profile's packageTopology were found under ${profile.repoRoot} — ` +
      `nothing was audited. Install the ${prefix}* packages you ship, or audit a workspace by passing --profile instead.`
    : `No packages were discovered under ${profile.repoRoot}/packages/* — nothing was audited. ` +
      `If this repo consumes ${prefix}* packages from npm, run \`czap audit --consumer\`; ` +
      `otherwise pass --profile pointing at your workspace.`;
  return {
    id: 'support/no-packages',
    section: 'support',
    rule: 'no-packages-discovered',
    severity: 'error',
    title: 'Nothing was audited',
    summary,
  };
}

function skippedConsumerStructureAudit(profile: DevopsProfile): AuditSectionResult<StructureSummary> {
  const packageCount = profile.packageRoots ? Object.keys(profile.packageRoots).length : 0;
  return {
    section: 'structure',
    summary: {
      packageCount,
      sourceFileCount: 0,
      internalImportEdges: 0,
      externalImportCount: 0,
      publicExportCount: 0,
      orphanCandidateCount: 0,
      defaultExportCount: 0,
      packageEdges: [],
      coverageClassification: {
        topology: [],
        orphan: {
          coverage: 'file-proxy-only',
          candidateCount: 0,
          note: 'Consumer aggregate mode skips the source-structure pass; run runStructureAudit(profile) explicitly to inspect installed-package source topology.',
        },
        symbol: {
          coverage: 'symbol-evidenced',
          consumedCount: 0,
          starCoveredCount: 0,
          candidateCount: 0,
          note: 'Consumer aggregate mode skips symbol-orphan structure evidence.',
        },
        allowlistUnexercised: [],
      },
    },
    findings: [],
    suppressed: [],
  };
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
  const structure = resolved.packageRoots ? skippedConsumerStructureAudit(resolved) : runStructureAudit(resolved);
  const integrity = runIntegrityAudit(resolved);
  const surface = runSurfaceAudit(resolved);
  const auditedPackageCount = resolved.packageRoots
    ? Object.keys(resolved.packageRoots).length
    : structure.summary.packageCount;
  const findings = [
    ...structure.findings,
    ...integrity.findings,
    ...surface.findings,
    ...(auditedPackageCount === 0 ? [nothingAuditedFinding(resolved)] : []),
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
