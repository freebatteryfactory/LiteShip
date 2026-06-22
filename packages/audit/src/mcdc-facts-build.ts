/**
 * The HOST-SIDE MC/DC-facts builder (the avionics tier — the bridge that folds the
 * deterministic CONDITION-mutation engine + the injected per-pin test runner into the
 * flat {@link McdcFacts} the lean `mcdcCoverageGate` consumes).
 *
 * `@czap/gauntlet` DEFINES the {@link McdcFacts} interface but carries no `typescript`
 * dep and runs no test suite — it is the lean engine and MC/DC is an INJECTED capability
 * (the same ADR-0012 boundary as the IR / mutation facts). THIS module is the host half:
 * `@czap/audit` (which deps `typescript`) generates the deterministic condition-mutant
 * catalogue per file ({@link generateConditionMutants}), evaluates each FORCE-TRUE /
 * FORCE-FALSE pin against the INJECTED test runner ({@link evaluateMutant} — the SAME
 * verdict/cache path the classic mutation engine uses), and FOLDS the two pins per atomic
 * condition into a single {@link McdcConditionOutcome} (the condition is MC/DC-covered iff
 * BOTH pins were KILLED). The CLI integrator wires the production vitest runner + the B2
 * verdict cache + the propagated-L4 scoping; the meta-proof wires a deterministic stub
 * runner. Pure w.r.t. its inputs (the runner + the source bytes).
 *
 * AIM THE CANNON. MC/DC is HEAVY (a suite run per pin, TWO pins per condition), so a
 * production caller scopes `files` to the propagated-L4 seams; the B2 cache makes it
 * changed-only-cost and the caller may shard the file list. The builder itself is
 * deterministic: same source bytes + same runner verdicts → byte-identical facts
 * (the conditions are sorted by (file, line, column)).
 *
 * @module
 */
import ts from 'typescript';
import { InvariantViolationError } from '@czap/error';
import { CanonicalCbor, addressedDigestOf } from '@czap/canonical';
import type { McdcFacts, McdcConditionOutcome, McdcPinVerdict } from '@czap/gauntlet';
import {
  generateConditionMutants,
  type ConditionMutant,
  type ConditionForce,
} from './mcdc-engine.js';
import {
  evaluateMutant,
  type CoverageMap,
  type MutantTestRunner,
  type MutantVerdictCache,
} from './mutation-verdict.js';

/** One source file to condition-mutate — its repo-relative id + its current source text. */
export interface McdcTargetFile {
  readonly file: string;
  readonly text: string;
}

/** Options for {@link buildMcdcFacts} — the host-injection surface (mirrors the mutation builder). */
export interface McdcBuildOptions {
  /** The injected test runner (production vitest; the meta-proof's stub). */
  readonly runner: MutantTestRunner;
  /** The deterministic covering-tests map ((file,line) → sorted test ids). */
  readonly coverage: CoverageMap;
  /** The B2 verdict cache (changed-only-cost) — threaded straight to evaluateMutant. */
  readonly cache?: MutantVerdictCache;
  /** The toolchain digest the verdict cache keys against (required iff `cache`). */
  readonly toolchainDigest?: string;
}

/** Parse a target file's source into a `ts.SourceFile` for the engine. */
function parseTarget(target: McdcTargetFile): ts.SourceFile {
  return ts.createSourceFile(target.file, target.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** US separator for the condition identity key. */
const UNIT = '\x1f';

/**
 * The stable, FORCE-INDEPENDENT content address of an atomic condition — blake3 over the
 * canonical CBOR of `{kind:'mcdc-condition', file, line, column, condition}`. The two
 * pins of one condition fold into ONE outcome keyed by this id (the force is deliberately
 * EXCLUDED, unlike the per-pin mutant id which folds it in). Routes through the same
 * `addressedDigestOf` kernel the engine uses, never a fork.
 */
function conditionId(file: string, line: number, column: number, condition: string): string {
  const bytes = CanonicalCbor.encode({ kind: 'mcdc-condition', file, line, column, condition });
  return addressedDigestOf(bytes, 'blake3').integrity_digest;
}

/** A `(file, line, column, condition)` group key for folding the two pins together. */
function groupKey(m: ConditionMutant): string {
  return [m.file, String(m.line), String(m.column), m.condition].join(UNIT);
}

/**
 * Narrow a mutant verdict tag to the {@link McdcPinVerdict} the fold reads. A condition
 * pin can only ever be killed / survived / no-coverage — a forced constant `(true)` /
 * `(false)` is a behaviour change at a reachable decision, so it is NEVER `equivalent`
 * (there is no justified-equivalent pin). An `equivalent` tag here would be an impossible
 * verdict state (the MC/DC builder injects no equivalent-mutant registry), so it is a
 * tagged invariant violation, never a silent coercion.
 */
function pinVerdict(tag: 'killed' | 'survived' | 'no-coverage' | 'equivalent', mutant: ConditionMutant): McdcPinVerdict {
  if (tag === 'killed' || tag === 'survived' || tag === 'no-coverage') return tag;
  throw InvariantViolationError(
    'buildMcdcFacts',
    `condition pin ${mutant.id} (${mutant.file}:${mutant.line}:${mutant.column}, ${mutant.force}) earned an "equivalent" verdict — a forced constant is a reachable behaviour change and can never be equivalent (the MC/DC builder injects no equivalent registry), so this is an impossible state`,
  );
}

/**
 * Build the {@link McdcFacts} for a set of target files — generate the deterministic
 * condition-mutants per file, evaluate each FORCE-TRUE / FORCE-FALSE pin against the
 * injected runner (the SAME verdict path the mutation builder uses), and FOLD the two
 * pins per atomic condition into one {@link McdcConditionOutcome}. Deterministic: the
 * outcomes are sorted by (file, line, column) so the facts are byte-stable across runs
 * over unchanged source + identical runner verdicts. The lean gate folds these.
 *
 * @throws InvariantViolationError if a condition is missing one of its two pins (the
 *         engine always mints both per condition; a missing pin would be an engine bug,
 *         surfaced loud rather than folded into a partial outcome).
 */
export function buildMcdcFacts(files: readonly McdcTargetFile[], options: McdcBuildOptions): McdcFacts {
  // Per-condition accumulator: the group key → the partial outcome being assembled.
  interface Partial {
    file: string;
    line: number;
    column: number;
    decision: string;
    condition: string;
    forceTrue?: McdcPinVerdict;
    forceFalse?: McdcPinVerdict;
    conditionId: string;
  }
  const byCondition = new Map<string, Partial>();

  for (const target of files) {
    const mutants = generateConditionMutants(parseTarget(target), { file: target.file });
    for (const mutant of mutants) {
      const verdict = evaluateMutant(mutant, {
        runner: options.runner,
        coverage: options.coverage,
        originalSource: target.text,
        ...(options.cache !== undefined ? { cache: options.cache } : {}),
        ...(options.toolchainDigest !== undefined ? { toolchainDigest: options.toolchainDigest } : {}),
      });
      const tag = pinVerdict(verdict._tag, mutant);

      const key = groupKey(mutant);
      const existing = byCondition.get(key);
      const partial: Partial =
        existing ??
        {
          file: mutant.file,
          line: mutant.line,
          column: mutant.column,
          decision: mutant.decision,
          condition: mutant.condition,
          conditionId: conditionId(mutant.file, mutant.line, mutant.column, mutant.condition),
        };
      assignPin(partial, mutant.force, tag);
      byCondition.set(key, partial);
    }
  }

  const conditions: McdcConditionOutcome[] = [];
  for (const partial of byCondition.values()) {
    if (partial.forceTrue === undefined || partial.forceFalse === undefined) {
      throw InvariantViolationError(
        'buildMcdcFacts',
        `the condition \`${partial.condition}\` at ${partial.file}:${partial.line}:${partial.column} is missing one of its two pins (force-true=${String(partial.forceTrue)}, force-false=${String(partial.forceFalse)}) — the condition-mutation engine must mint BOTH pins per condition`,
      );
    }
    conditions.push({
      conditionId: partial.conditionId,
      file: partial.file,
      line: partial.line,
      column: partial.column,
      decision: partial.decision,
      condition: partial.condition,
      forceTrueVerdict: partial.forceTrue,
      forceFalseVerdict: partial.forceFalse,
    });
  }

  // Deterministic order — same input → byte-identical facts.
  conditions.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.column - b.column ||
      a.condition.localeCompare(b.condition),
  );
  return { conditions };
}

/** Assign one pin's verdict into the partial outcome by its force direction. */
function assignPin(
  partial: { forceTrue?: McdcPinVerdict; forceFalse?: McdcPinVerdict },
  force: ConditionForce,
  verdict: McdcPinVerdict,
): void {
  if (force === 'force-condition-true') partial.forceTrue = verdict;
  else partial.forceFalse = verdict;
}
