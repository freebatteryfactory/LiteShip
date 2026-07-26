/**
 * Engine audit types (CUT D9b-1) — the reusable, downstream-facing type surface
 * for the structure/integrity/surface passes. The LiteShip HICP report types
 * (FileAuditEntry, FullAuditSection, CodebaseAuditReport, …) stay repo-local in
 * scripts/audit/types.ts and are NOT shipped here.
 *
 * @module
 */
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '@liteship/error';

/** Stable audit rule slug, derived from the canonical diagnostic registry. */
export type AuditRuleId = Extract<DiagnosticCode, `audit/${string}`> extends `audit/${infer Rule}` ? Rule : never;

/** Exact audit-rule projection derived from the one diagnostic registry owner. */
export const AUDIT_RULE_IDS = Object.freeze(
  Object.keys(DIAGNOSTIC_REGISTRY)
    .filter((code): code is Extract<DiagnosticCode, `audit/${string}`> => code.startsWith('audit/'))
    .map((code) => code.slice('audit/'.length) as AuditRuleId)
    .sort((left, right) => left.localeCompare(right)),
);

/** Project an audit rule slug onto its stable diagnostic identity. */
export function auditDiagnosticCode(rule: AuditRuleId): Extract<DiagnosticCode, `audit/${string}`> {
  return `audit/${rule}` as Extract<DiagnosticCode, `audit/${string}`>;
}

export type AuditSeverity = 'error' | 'warning' | 'info';

export type AuditSection = 'structure' | 'integrity' | 'surface';

/**
 * Audit self-trust coverage class (CUT A0). Every audit check result carries one
 * of these so a clean result can never be silently confused with an unchecked one.
 */
export type AuditCoverageClass =
  'clean' | 'symbol-evidenced' | 'file-proxy-only' | 'allowlisted' | 'policy-absent' | 'not-checked';

export interface TopologyCoverageEntry {
  readonly package: string;
  /** `clean` when a topology policy governs this package; `policy-absent` when none exists. */
  readonly coverage: 'clean' | 'policy-absent';
}

export interface AllowlistUnexercisedEntry {
  readonly package: string;
  readonly permitted: string;
  readonly coverage: 'allowlisted';
  readonly exercised: false;
}

export interface OrphanCoverage {
  readonly coverage: 'file-proxy-only';
  readonly candidateCount: number;
  readonly note: string;
}

/** An audit relation that was deliberately not executed and therefore proves nothing. */
export interface AuditCoverageNotChecked {
  readonly coverage: 'not-checked';
  readonly reason: string;
}

/**
 * Symbol-level orphan evidence (CUT A6) — finer than {@link OrphanCoverage}.
 */
export interface SymbolOrphanCoverage {
  readonly coverage: 'symbol-evidenced';
  /** Exact-name references (incl. barrel re-exports) — proven consumed. */
  readonly consumedCount: number;
  /** Covered only by a namespace/`*` import — broad evidence, not exact proof. */
  readonly starCoveredCount: number;
  /** Exported but unreferenced despite the file being reached — the file-proxy gap. */
  readonly candidateCount: number;
  readonly note: string;
}

export interface StructureCoverageClassification {
  readonly topology: readonly TopologyCoverageEntry[];
  readonly orphan: OrphanCoverage | AuditCoverageNotChecked;
  /** Symbol-level orphan evidence layered on top of the file-level proxy (CUT A6). */
  readonly symbol: SymbolOrphanCoverage | AuditCoverageNotChecked;
  readonly allowlistUnexercised: readonly AllowlistUnexercisedEntry[];
}

/** A package whose declared audit artifacts were physically discovered. */
export interface AnalyzedPackageArtifacts {
  readonly package: string;
  readonly coverage: 'analyzed';
  readonly expectedArtifacts: readonly string[];
  readonly matchedFiles: readonly string[];
}

/** A discovered package whose declared audit artifacts matched no files. */
export interface UnverifiedPackageArtifacts {
  readonly package: string;
  readonly coverage: 'unverified';
  readonly expectedArtifacts: readonly string[];
  readonly reason: string;
}

/** Exact per-package evidence for the artifact surface the audit consumed. */
export type PackageArtifactCoverage = AnalyzedPackageArtifacts | UnverifiedPackageArtifacts;

export interface AuditLocation {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
}

export interface AuditFinding {
  readonly id: string;
  readonly section: AuditSection | 'support';
  readonly rule: AuditRuleId;
  readonly severity: AuditSeverity;
  readonly title: string;
  readonly summary: string;
  readonly location?: AuditLocation;
  readonly metadata?: Record<string, unknown>;
}

export interface AuditSuppression {
  readonly rule: AuditRuleId;
  readonly reason: string;
  readonly finding: AuditFinding;
}

export interface AuditCounts {
  readonly error: number;
  readonly warning: number;
  readonly info: number;
}

export interface AuditSectionResult<TSummary> {
  readonly section: AuditSection;
  readonly summary: TSummary;
  readonly findings: readonly AuditFinding[];
  readonly suppressed: readonly AuditSuppression[];
}
