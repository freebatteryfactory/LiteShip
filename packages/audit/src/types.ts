/**
 * Engine audit types (CUT D9b-1) — the reusable, downstream-facing type surface
 * for the structure/integrity/surface passes. The LiteShip HICP report types
 * (FileAuditEntry, FullAuditSection, CodebaseAuditReport, …) stay repo-local in
 * scripts/audit/types.ts and are NOT shipped here.
 *
 * @module
 */
export type AuditSeverity = 'error' | 'warning' | 'info';

export type AuditSection = 'structure' | 'integrity' | 'surface';

/**
 * Audit self-trust coverage class (CUT A0). Every audit check result carries one
 * of these so a clean result can never be silently confused with an unchecked one.
 */
export type AuditCoverageClass =
  | 'clean'
  | 'symbol-evidenced'
  | 'file-proxy-only'
  | 'allowlisted'
  | 'policy-absent'
  | 'not-checked';

export interface TopologyCoverageEntry {
  readonly package: string;
  /** `clean` when a topology policy governs this package; `policy-absent` when none exists. */
  readonly coverage: AuditCoverageClass;
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
  readonly orphan: OrphanCoverage;
  /** Symbol-level orphan evidence layered on top of the file-level proxy (CUT A6). */
  readonly symbol: SymbolOrphanCoverage;
  readonly allowlistUnexercised: readonly AllowlistUnexercisedEntry[];
}

export interface AuditLocation {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
}

export interface AuditFinding {
  readonly id: string;
  readonly section: AuditSection | 'support';
  readonly rule: string;
  readonly severity: AuditSeverity;
  readonly title: string;
  readonly summary: string;
  readonly location?: AuditLocation;
  readonly metadata?: Record<string, unknown>;
}

export interface AuditSuppression {
  readonly rule: string;
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
