/**
 * The Finding — the one structured result a gate emits, and the one shape both
 * humans and agents read.
 *
 * A Finding is a tagged DATA record (composition, not a class): an assurance
 * level, a severity, where it is, WHY it is, and — crucially — a remediation
 * that is either a machine-applicable patch or a precise work-instruction. That
 * last field is what lets an agent act on a Finding without a human in the loop,
 * and what lets a human read the same record and understand it.
 *
 * Findings deliberately mirror the {@link @czap/error} algebra: a `LiteShipError`
 * (a tagged failure value) projects to a Finding via {@link fromError}, so the
 * error a gate catches and the finding it reports are the same vocabulary.
 *
 * @module
 */

import { isTaggedError, type TaggedError } from '@czap/error';
import type { AssuranceLevel } from './assurance.js';
import type { CoverageClass } from './repo-ir.js';

/**
 * How loud a finding is. `advisory` is the authority ratchet's pre-blocking
 * tier — a real finding that does NOT yet fail the gate (it is calibrating).
 * `warning` is tracked-but-tolerated; `error` blocks.
 */
export type Severity = 'advisory' | 'warning' | 'error';

/** Severities in ascending loudness — canonical ordering for rollups. */
export const SEVERITIES = ['advisory', 'warning', 'error'] as const;

/** Where a finding points, when it points at source. */
export interface SourceLocation {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
}

/**
 * How to fix a finding. A `patch` is machine-applicable (an agent or the
 * `--fix` path can apply the diff under the raccoon rule); an `instruction`
 * is a precise, ordered work-list for a human or a planning agent. Either way
 * it is structured — never a vague "consider refactoring".
 */
export type Remediation =
  | { readonly kind: 'patch'; readonly description: string; readonly diff: string }
  | { readonly kind: 'instruction'; readonly description: string; readonly steps: readonly string[] };

/**
 * The gate output. `ruleId` traces to the gate that produced it; `level` is the
 * assurance level of the code it concerns (rigor-aiming); `detail` is the WHY
 * (not just the what); `remediation` is the actionable fix.
 */
export interface Finding {
  /** Stable id of the rule/gate that produced this — the traceability anchor. */
  readonly ruleId: string;
  /** How loud: advisory (calibrating) / warning / error (blocks). */
  readonly severity: Severity;
  /** Assurance level of the concerned code — aims rigor + groups the report. */
  readonly level: AssuranceLevel;
  /** Short human summary. */
  readonly title: string;
  /** The WHY — enough for a human or agent to understand without the source. */
  readonly detail: string;
  /** Where it points, when it points at source. */
  readonly location?: SourceLocation;
  /** The actionable fix — a machine-applicable patch or a precise work-list. */
  readonly remediation?: Remediation;
  /**
   * How the evidence behind this finding was classified (Slice B). A
   * triangulation/divergence finding carries it — it is the explanation of WHY
   * two oracles can disagree (`text-only` regex vs `symbol-evidenced` checker).
   * Existing regex gates omit it (additive, non-breaking). See {@link CoverageClass}.
   */
  readonly coverageClass?: CoverageClass;
}

/** Fields a caller supplies to {@link finding} (everything but defaults). */
export interface FindingInput {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly level: AssuranceLevel;
  readonly title: string;
  readonly detail: string;
  readonly location?: SourceLocation;
  readonly remediation?: Remediation;
  readonly coverageClass?: CoverageClass;
}

/**
 * Build a {@link Finding} — the one composer. Drops `undefined` optional fields
 * so two findings with the same meaning are structurally equal (stable reports,
 * content-addressable results).
 */
export function finding(input: FindingInput): Finding {
  return {
    ruleId: input.ruleId,
    severity: input.severity,
    level: input.level,
    title: input.title,
    detail: input.detail,
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.remediation !== undefined ? { remediation: input.remediation } : {}),
    ...(input.coverageClass !== undefined ? { coverageClass: input.coverageClass } : {}),
  };
}

/** Type guard for a {@link Finding} value. */
export function isFinding(u: unknown): u is Finding {
  return (
    typeof u === 'object' &&
    u !== null &&
    typeof (u as Finding).ruleId === 'string' &&
    typeof (u as Finding).title === 'string' &&
    typeof (u as Finding).severity === 'string'
  );
}

/**
 * Project a tagged error (any {@link @czap/error} variant or downstream
 * variant) into a Finding — the bridge that keeps the error a gate CATCHES and
 * the finding it REPORTS in one vocabulary. The error's `_tag` seeds the title
 * and the `ruleId` namespace; its `message` becomes the detail.
 */
export function fromError(
  error: TaggedError,
  meta: { readonly ruleId: string; readonly level: AssuranceLevel; readonly severity?: Severity } & {
    readonly location?: SourceLocation;
    readonly remediation?: Remediation;
  },
): Finding {
  return finding({
    ruleId: meta.ruleId,
    severity: meta.severity ?? 'error',
    level: meta.level,
    title: error._tag,
    detail: error.message,
    ...(meta.location !== undefined ? { location: meta.location } : {}),
    ...(meta.remediation !== undefined ? { remediation: meta.remediation } : {}),
  });
}

/** True iff `u` is a tagged error this module knows how to {@link fromError}. */
export function isProjectableError(u: unknown): u is TaggedError {
  return isTaggedError(u);
}

/** Count findings by severity — the rollup a receipt/report header carries. */
export function tallyBySeverity(findings: readonly Finding[]): Readonly<Record<Severity, number>> {
  const tally: Record<Severity, number> = { advisory: 0, warning: 0, error: 0 };
  for (const f of findings) tally[f.severity] += 1;
  return tally;
}
