/**
 * The HOST-SIDE transition-facts builder (Wave 5.5, the transition cage — the bridge
 * that folds the single-oracle MODEL + the IMPLEMENTATION capture into the flat
 * {@link TransitionFacts} the lean {@link transitionConformanceGate} consumes).
 *
 * `@czap/gauntlet` DEFINES the {@link TransitionFacts} interface but constructs no
 * reactive primitive and forks no fiber — it is the lean engine and transition
 * conformance is an INJECTED capability (the same ADR-0012 boundary as the IR /
 * mutation facts). THIS module is the host half: the CALLER (the CLI, wiring the
 * Foundation `reactive-capture` + `reactive-model` harnesses; the meta-proof, wiring a
 * deterministic stub) runs each seeded op history over BOTH the model and the
 * implementation and hands this builder the two content-addressed OBSERVATIONS per
 * case; the builder content-addresses each op history, DECIDES the per-case
 * bisimulation verdict by comparing the two observation digests, folds the operation
 * coverage, and emits the flat, sorted, byte-stable facts. Pure w.r.t. its inputs (the
 * per-case oracle outcomes + the histories).
 *
 * WHY THE OBSERVATIONS ARE INJECTED (not run here). Capturing a reactive primitive's
 * trace is an `Effect.runPromise` fiber walk over `@czap/core`, drained to quiescence —
 * heavy, async, and dependent on the Foundation harnesses that live in the test tree.
 * The builder keeps `@czap/audit` free of that dependency exactly as
 * {@link buildMutationFacts} keeps it free of a real vitest run: the heavy work is an
 * INJECTED capability (there, the {@link MutantTestRunner}; here, the pre-run oracle
 * outcomes), and the builder is the deterministic FOLD the gate then reports over. The
 * bisimulation DECISION (equivalent iff the two observation digests agree) is the
 * builder's, so the single-oracle law (a divergence is a real digest disagreement, not
 * a re-derivation) lives here, in the host, not smuggled into the lean gate.
 *
 * DETERMINISM. The builder content-addresses each history through the ONE canonical
 * encoder (`@czap/canonical`'s `CanonicalCbor` → `fnv1aBytes`, the exact currency the
 * Foundation `reactive-trace.traceDigest` uses) and sorts the cases by `(seed,
 * traceDigest)`, so the same inputs yield BYTE-IDENTICAL facts across runs.
 *
 * @module
 */
import { CanonicalCbor, fnv1aBytes } from '@czap/canonical';
import type { TransitionFacts, TransitionCase, TransitionStatus } from '@czap/gauntlet';

/**
 * One oracle side's outcome for a case — either a content-addressed OBSERVATION (the
 * side produced a comparable trace) or an UNEVIDENCED marker (the side produced no
 * trace: a construction fault, an unsupported op, a drained-empty result). The caller's
 * harness computes the observation digest through the SAME canonical encoder the
 * builder uses for the history (so the digests are comparable across the cage).
 */
export type OracleOutcome =
  | { readonly kind: 'observed'; readonly observationDigest: string }
  | { readonly kind: 'unevidenced'; readonly reason: string };

/**
 * One case's raw run — both oracle sides over ONE seeded op history. The `history` is
 * any CBOR-encodable op-history value (the builder content-addresses it, so it needs no
 * knowledge of the `ReactiveOp` shape — the closed vocabulary stays in the Foundation
 * layer); `operations` is the flat list of op tags the history exercised (the coverage
 * fold, passed explicitly so the builder never parses the history).
 */
export interface TransitionRun {
  /** The pinned seed that generated this op history — the replay key half. */
  readonly seed: string;
  /** The CBOR-encodable op history — content-addressed to the case's `traceDigest`. */
  readonly history: unknown;
  /** The op tags exercised by this history (e.g. `['subscribe','set','read','dispose']`) — the coverage fold. */
  readonly operations: readonly string[];
  /** The MODEL's outcome (the single-oracle side). */
  readonly model: OracleOutcome;
  /** The IMPLEMENTATION's outcome (the transport under test). */
  readonly implementation: OracleOutcome;
}

/** Options for {@link buildTransitionFacts} — the family + the two transport fingerprints + the ratchet. */
export interface TransitionBuildOptions {
  /** The conformance family this run covers (e.g. `'cell'`) — aims the gate's level, woven into findings. */
  readonly family: string;
  /** The content address of the MODEL transport (the single-oracle fingerprint). */
  readonly modelDigest: string;
  /** The content address of the IMPLEMENTATION transport under test. */
  readonly implementationDigest: string;
  /**
   * The committed maximum tolerated `unevidenced` case count for this family (the
   * ratchet floor). Omitted → no committed floor (the family's first measurement,
   * reported informationally, never a regression).
   */
  readonly unevidencedBaseline?: number;
}

/** The sentinel digest a case records for an oracle side that produced NO observation. */
const NO_OBSERVATION = '' as const;

/**
 * Decide one case's bisimulation verdict from the two oracle outcomes. `unevidenced` iff
 * EITHER side produced no trace (Axiom 4: an absent witness is kept separate from a
 * fidelity claim); otherwise `equivalent` iff the two observation digests AGREE, else
 * `divergent`. Returns the verdict + the two digests the case records (a missing side's
 * digest is the {@link NO_OBSERVATION} sentinel).
 */
function decideCase(run: TransitionRun): {
  readonly status: TransitionStatus;
  readonly modelObservationDigest: string;
  readonly implementationObservationDigest: string;
} {
  const modelDigest = run.model.kind === 'observed' ? run.model.observationDigest : NO_OBSERVATION;
  const implDigest = run.implementation.kind === 'observed' ? run.implementation.observationDigest : NO_OBSERVATION;
  if (run.model.kind === 'unevidenced' || run.implementation.kind === 'unevidenced') {
    return { status: 'unevidenced', modelObservationDigest: modelDigest, implementationObservationDigest: implDigest };
  }
  const status: TransitionStatus = modelDigest === implDigest ? 'equivalent' : 'divergent';
  return { status, modelObservationDigest: modelDigest, implementationObservationDigest: implDigest };
}

/**
 * Build the {@link TransitionFacts} for one conformance family's run — content-address
 * each op history, decide each case's bisimulation verdict, fold the operation coverage,
 * and assemble the flat, sorted facts. Deterministic: the cases are sorted by (seed,
 * traceDigest) so the facts are byte-stable across runs over identical inputs + oracle
 * outcomes. The lean gate folds these.
 */
export function buildTransitionFacts(runs: readonly TransitionRun[], options: TransitionBuildOptions): TransitionFacts {
  const cases: TransitionCase[] = [];
  const operationCoverage: Record<string, number> = {};

  for (const run of runs) {
    const traceDigest = fnv1aBytes(CanonicalCbor.encode(run.history));
    const decided = decideCase(run);
    cases.push({
      seed: run.seed,
      traceDigest,
      operationCount: run.operations.length,
      modelObservationDigest: decided.modelObservationDigest,
      implementationObservationDigest: decided.implementationObservationDigest,
      status: decided.status,
    });
    for (const tag of run.operations) {
      operationCoverage[tag] = (operationCoverage[tag] ?? 0) + 1;
    }
  }

  // Deterministic order — same inputs → byte-identical facts.
  cases.sort((a, b) => a.seed.localeCompare(b.seed) || a.traceDigest.localeCompare(b.traceDigest));

  // Sort the coverage keys so the folded record is byte-stable regardless of run order.
  const sortedCoverage: Record<string, number> = {};
  for (const tag of Object.keys(operationCoverage).sort((a, b) => a.localeCompare(b))) {
    sortedCoverage[tag] = operationCoverage[tag]!;
  }

  return {
    family: options.family,
    modelDigest: options.modelDigest,
    implementationDigest: options.implementationDigest,
    cases,
    operationCoverage: sortedCoverage,
    ...(options.unevidencedBaseline !== undefined ? { unevidencedBaseline: options.unevidencedBaseline } : {}),
  };
}
