/**
 * The HOST-SIDE mutation-facts builder (Slice C, the avionics tier — the bridge
 * that folds the deterministic mutation engine + the injected test runner into the
 * flat {@link MutationFacts} the lean `mutationDivergenceGate` consumes).
 *
 * `@liteship/gauntlet` DEFINES the {@link MutationFacts} interface but carries no
 * `typescript` dep and runs no test suite — it is the lean engine and mutation is an
 * INJECTED capability (the same ADR-0012 boundary as the IR / supply-chain). THIS
 * module is the host half: `@liteship/audit` (which deps `typescript`) generates the
 * deterministic mutant catalogue per file ({@link generateMutants}), evaluates each
 * mutant against the INJECTED test runner ({@link evaluateMutant}), and folds the
 * verdicts into the flat facts. The CLI integrator wires the production vitest runner
 * + the B2 verdict cache + the propagated-L4 scoping; the meta-proof wires a
 * deterministic stub runner. Pure w.r.t. its inputs (the runner + the source bytes).
 *
 * AIM THE CANNON. Mutation is HEAVY (a suite run per mutant), so a production caller
 * scopes `files` to the propagated-L4 seams (the {@link MutationBuildOptions.budget}
 * caps the per-file catalogue, the B2 cache makes it changed-only-cost, and the
 * caller may shard the file list). The builder itself is deterministic: same source
 * bytes + same runner verdicts → byte-identical facts.
 *
 * @module
 */
import ts from 'typescript';
import type { MutationFacts, MutantOutcome } from '@liteship/gauntlet';
import { CanonicalCbor, addressedDigestOf } from '@liteship/canonical';
import { generateMutants, MUTATION_OPERATORS, type GenerateMutantsOptions } from './mutation-engine.js';
import {
  evaluateMutant,
  type CoverageMap,
  type MutantTestRunner,
  type MutantVerdictCache,
  type EquivalentMutantRegistry,
} from './mutation-verdict.js';

/** One source file to mutate — its repo-relative id + its current source text. */
export interface MutationTargetFile {
  readonly file: string;
  readonly text: string;
}

/** Options for {@link buildMutationFacts} — the host-injection surface. */
export interface MutationBuildOptions {
  /** The injected test runner (production vitest; the meta-proof's stub). */
  readonly runner: MutantTestRunner;
  /** The deterministic covering-tests map ((file,line) → sorted test ids). */
  readonly coverage: CoverageMap;
  /** The committed per-file score baseline (the ratchet artifact). Empty → no ratchet. */
  readonly scoreBaseline?: Readonly<Record<string, number>>;
  /**
   * Per-file mutant BUDGET cap (the seeded deterministic sample). Omitted → the full
   * catalogue (the L4 cannon). A production run over many files passes a budget to
   * bound the suite-runs-per-file.
   */
  readonly budget?: number;
  /** The B2 verdict cache (changed-only-cost) — threaded straight to evaluateMutant. */
  readonly cache?: MutantVerdictCache;
  /** The toolchain digest the verdict cache keys against (required iff `cache`). */
  readonly toolchainDigest?: string;
  /**
   * The injected equivalent-mutant registry (the committed, content-addressed
   * `mutation-equivalents.json`). A mutant whose content address it matches is
   * recorded `equivalent` (excluded from the survivor work-list + the score
   * denominator). Omitted → no mutant is treated as equivalent.
   */
  readonly equivalents?: EquivalentMutantRegistry;
}

/** Parse a target file's source into a `ts.SourceFile` for the engine. */
function parseTarget(target: MutationTargetFile): ts.SourceFile {
  return ts.createSourceFile(target.file, target.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/**
 * Build the {@link MutationFacts} for a set of target files — generate the
 * deterministic mutants per file, evaluate each against the injected runner, and
 * fold the verdicts into the flat outcomes. Deterministic: the outcomes are sorted
 * by (file, line, column, operator) so the facts are byte-stable across runs over
 * unchanged source + identical runner verdicts. The lean gate folds these.
 */
export function buildMutationFacts(files: readonly MutationTargetFile[], options: MutationBuildOptions): MutationFacts {
  const outcomes: MutantOutcome[] = [];
  const operatorApplicability: MutationFacts['operatorApplicability'][number][] = [];
  for (const target of files) {
    const genOptions: GenerateMutantsOptions =
      options.budget !== undefined ? { file: target.file, budget: options.budget } : { file: target.file };
    const mutants = generateMutants(parseTarget(target), genOptions);
    for (const operator of MUTATION_OPERATORS) {
      operatorApplicability.push({
        file: target.file,
        operator,
        applicableMutants: mutants.filter((mutant) => mutant.operator === operator).length,
      });
    }
    for (const mutant of mutants) {
      const coveringTests = [...options.coverage.covering(mutant.file, mutant.line)].sort((a, b) => a.localeCompare(b));
      const verdict = evaluateMutant(mutant, {
        runner: options.runner,
        coverage: options.coverage,
        originalSource: target.text,
        ...(options.cache !== undefined ? { cache: options.cache } : {}),
        ...(options.toolchainDigest !== undefined ? { toolchainDigest: options.toolchainDigest } : {}),
        ...(options.equivalents !== undefined ? { equivalents: options.equivalents } : {}),
      });
      outcomes.push({
        mutantId: mutant.id,
        verdict: verdict._tag,
        file: mutant.file,
        line: mutant.line,
        column: mutant.column,
        operator: mutant.operator,
        originalText: mutant.originalText,
        mutatedText: mutant.mutatedText,
        coveringTests,
        equivalentJustification: verdict._tag === 'equivalent' ? verdict.justification : null,
        equivalentJustificationDigest:
          verdict._tag === 'equivalent'
            ? addressedDigestOf(
                CanonicalCbor.encode({
                  kind: 'equivalent-mutant-justification',
                  mutantId: mutant.id,
                  justification: verdict.justification,
                }),
                'blake3',
              ).integrity_digest
            : null,
        // This engine executes every emitted mutant independently. It performs no
        // mutation-subsumption optimization, so the honest recorded status is none.
        subsumedBy: [],
      });
    }
  }
  // Deterministic order — same input → byte-identical facts.
  outcomes.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.column - b.column ||
      a.operator.localeCompare(b.operator) ||
      a.mutatedText.localeCompare(b.mutatedText),
  );
  operatorApplicability.sort((a, b) => a.file.localeCompare(b.file) || a.operator.localeCompare(b.operator));
  return { outcomes, operatorApplicability, scoreBaseline: options.scoreBaseline ?? {} };
}
