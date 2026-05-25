export type AuditSeverity = 'error' | 'warning' | 'info';

export type AuditSection = 'structure' | 'integrity' | 'surface';

export type FullAuditSectionId =
  | '@czap/core'
  | '@czap/quantizer'
  | '@czap/compiler'
  | '@czap/detect'
  | '@czap/web'
  | '@czap/edge'
  | '@czap/worker'
  | '@czap/vite'
  | '@czap/astro'
  | '@czap/remotion'
  | 'czap-compute'
  | 'packages/_spine'
  | 'tests'
  | 'scripts'
  | 'docs'
  | 'examples'
  | 'repo/system/devops';

export type AuditFileClass =
  | 'runtime/library source'
  | 'package/crate meta'
  | 'tests/benchmarks'
  | 'scripts/audit tooling'
  | 'docs/specs'
  | 'examples/integration'
  | 'repo/system/devops';

export type AuditScoreValue = 0 | 0.5 | 1;
export type AuditCoverageStatus = 'present' | 'partial' | 'missing' | 'not_applicable';
export type ManualReviewStatus = 'seeded' | 'spot_checked' | 'reviewed';
export type ProtocolAreaId =
  | 'bidirectional-traceability'
  | 'flow-verification'
  | 'test-honesty'
  | 'semantic-consistency'
  | 'proof-inventory';
export type FullTreeClassification =
  | 'scored-authored'
  | 'evidence-artifact'
  | 'excluded-generated'
  | 'excluded-vendor'
  | 'excluded-runtime-artifact'
  | 'excluded-binary-or-large';
export type FrameworkCapabilityStatus = 'present' | 'partial' | 'absent' | 'out_of_scope';
export type FrameworkRecommendation =
  | 'no_action'
  | 'architecture_hardening'
  | 'new_runtime_work'
  | 'documentation_clarification';

/**
 * Audit self-trust coverage class (CUT A0). Every audit check result carries one
 * of these so a clean result can never be silently confused with an unchecked one.
 *
 * - `clean`            checked against real evidence / an explicit policy, no finding
 * - `symbol-evidenced` verified at the symbol level
 * - `file-proxy-only`  verified only at file granularity (coarser than the claim)
 * - `allowlisted`      permitted by an explicit allowlist/policy entry
 * - `policy-absent`    no policy exists to evaluate this subject
 * - `not-checked`      out of scope for this check
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
 * For each exported symbol in a file that IS imported, the audit checks whether
 * that exact name is referenced (or re-exported by a barrel). This is what the
 * file-level proxy cannot prove: a file imported for one export no longer
 * launders its other exports.
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

export interface AuditControlEvaluation {
  readonly family: string;
  readonly weight: number;
  readonly score: AuditScoreValue;
  readonly note: string;
}

export interface FileEvidenceRef {
  readonly kind: 'finding' | 'coverage' | 'artifact' | 'doc' | 'test' | 'report';
  readonly ref: string;
  readonly summary: string;
}

export interface FileProtocolCoverage {
  readonly area: ProtocolAreaId;
  readonly status: AuditCoverageStatus;
  readonly summary: string;
}

export interface FileAuditEntry {
  readonly path: string;
  readonly sectionId: FullAuditSectionId;
  readonly fileClass: AuditFileClass;
  readonly applicableControlFamilies: readonly string[];
  readonly controlEvaluations: readonly AuditControlEvaluation[];
  readonly namedOffenses: readonly string[];
  readonly forbiddenRemedies: readonly string[];
  readonly blockingSignals: readonly string[];
  readonly evidenceRefs: readonly FileEvidenceRef[];
  readonly protocolCoverage: readonly FileProtocolCoverage[];
  readonly manualReviewStatus: ManualReviewStatus;
  readonly roadTo100: readonly string[];
  readonly notes: readonly string[];
  readonly rawScore: number;
  readonly score: number;
  readonly criticalityMultiplier: number;
  readonly criticalEscalation: boolean;
}

export interface FullAuditSection {
  readonly id: FullAuditSectionId;
  readonly title: string;
  readonly score: number;
  readonly notes: readonly string[];
  readonly files: readonly FileAuditEntry[];
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

export interface AuditArtifactStatus {
  readonly status: 'present' | 'missing' | 'failed';
  readonly path: string;
  readonly summary: string;
  readonly metadata?: Record<string, unknown>;
}

export interface FullTreeAccountingEntry {
  readonly path: string;
  readonly tracked: boolean;
  readonly classification: FullTreeClassification;
  readonly reason: string;
  readonly scored: boolean;
}

export interface FullTreeAccountingSummary {
  readonly totalFiles: number;
  readonly trackedFiles: number;
  readonly scoredFiles: number;
  readonly evidenceArtifactFiles: number;
  readonly excludedFiles: number;
  readonly countsByClassification: Record<FullTreeClassification, number>;
  readonly reconciled: boolean;
}

export interface FullTreeAccountingReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly root: string;
  readonly summary: FullTreeAccountingSummary;
  readonly entries: readonly FullTreeAccountingEntry[];
}

export interface ProtocolGapArea {
  readonly id: ProtocolAreaId;
  readonly title: string;
  readonly status: AuditCoverageStatus;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly recommendations: readonly string[];
}

export interface ProtocolGapReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly root: string;
  readonly areas: readonly ProtocolGapArea[];
}

export interface FrameworkBlueprintCapability {
  readonly id: string;
  readonly group: string;
  readonly title: string;
  readonly status: FrameworkCapabilityStatus;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly recommendation: FrameworkRecommendation;
}

export interface FrameworkBlueprintReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly root: string;
  readonly capabilities: readonly FrameworkBlueprintCapability[];
}

export interface AuditStrikeItem {
  readonly kind: 'file' | 'architecture';
  readonly id: string;
  readonly title: string;
  readonly score: number;
  readonly rationale: string;
  readonly evidence: readonly string[];
  readonly nextMoves: readonly string[];
}

export interface AuditStrikeBoardReport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly root: string;
  readonly items: readonly AuditStrikeItem[];
}

export interface CodebaseAuditReport<
  TStructureSummary = Record<string, unknown>,
  TIntegritySummary = Record<string, unknown>,
  TSurfaceSummary = Record<string, unknown>,
> {
  readonly schemaVersion: 2;
  readonly generatedAt: string;
  readonly gauntletRunId: string;
  readonly sourceFingerprint: string;
  readonly environmentFingerprint: string;
  readonly expectedCounts: Record<string, number>;
  readonly advisory: true;
  readonly root: string;
  readonly counts: AuditCounts;
  readonly structure: AuditSectionResult<TStructureSummary>;
  readonly integrity: AuditSectionResult<TIntegritySummary>;
  readonly surface: AuditSectionResult<TSurfaceSummary>;
  readonly supportingArtifacts: {
    readonly invariants: AuditArtifactStatus;
    readonly coverage: AuditArtifactStatus;
    readonly benchmarks: AuditArtifactStatus;
    readonly runtimeSeams: AuditArtifactStatus;
  };
  readonly fullTreeAccounting: FullTreeAccountingSummary;
  readonly protocolGap: {
    readonly present: number;
    readonly partial: number;
    readonly missing: number;
    readonly notApplicable: number;
  };
  readonly frameworkBlueprintDelta: {
    readonly present: number;
    readonly partial: number;
    readonly absent: number;
    readonly outOfScope: number;
  };
  readonly strikeBoard: {
    readonly totalItems: number;
    readonly topItemTitle: string | null;
  };
  readonly inventoryCount: number;
  readonly aggregateScore: number;
  readonly sections: readonly FullAuditSection[];
  readonly findings: readonly AuditFinding[];
  readonly suppressed: readonly AuditSuppression[];
}
