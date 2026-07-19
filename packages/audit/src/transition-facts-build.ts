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
 * DETERMINISM + IDENTITY CLASS. The builder OWNS the bisimulation comparison: it
 * canonical-encodes each side's observation through the ONE encoder (`@czap/canonical`'s
 * `CanonicalCbor`) and decides `equivalent` by comparing the EXACT canonical bytes — never
 * a hash equality, so no digest collision can ever launder a real divergence into a false
 * `equivalent` green (SKILL.md §4: a weak hash may not be the sole witness of an L4
 * conformance decision). The stored fact digests (the two observation addresses + the
 * history `traceDigest`) are the canonical SHA-256 content address (`sha256:<hex>`) of those
 * same bytes — a collision-resistant, trust-bearing replay identity. Cases sort by `(seed,
 * traceDigest)`, so the same inputs yield BYTE-IDENTICAL facts across runs.
 *
 * @module
 */
import { CanonicalCbor, sha256Hex } from '@czap/canonical';
import type { TransitionFacts, TransitionCase, TransitionStatus } from '@czap/gauntlet';

/** The canonical SHA-256 content address (`sha256:<64-hex>`) of a value's canonical CBOR bytes. */
function sha256Address(value: unknown): string {
  return `sha256:${sha256Hex(CanonicalCbor.encode(value))}`;
}

/** Byte-exact equality of two `Uint8Array`s — the bisimulation decision's collision-free witness. */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * One oracle side's outcome for a case — either the NORMALIZED OBSERVATION the side
 * produced (any CBOR-encodable trace value: the closed `Observation` record the Foundation
 * harness folds, e.g.) or an UNEVIDENCED marker (the side produced no trace: a construction
 * fault, an unsupported op, a drained-empty result). The caller hands the builder the raw
 * observation, NOT a pre-computed digest: the builder owns the canonical encoding + the
 * byte-exact comparison, so the bisimulation verdict never rides a hash equality (a digest
 * collision could otherwise certify a real divergence as `equivalent` — a false L4 green).
 */
export type OracleOutcome =
  | { readonly kind: 'observed'; readonly observation: unknown }
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
 * EITHER side produced no trace (Axiom 4: an absent witness is kept separate from a fidelity
 * claim); otherwise `equivalent` iff the two NORMALIZED observations are BYTE-IDENTICAL under
 * the canonical encoder, else `divergent`. The decision is on the exact canonical bytes — NOT
 * a hash equality — so no digest collision can ever certify a real divergence as `equivalent`
 * (a false L4 green). Returns the verdict + the two SHA-256 addresses the case records (a
 * missing side's digest is the {@link NO_OBSERVATION} sentinel).
 */
function decideCase(run: TransitionRun): {
  readonly status: TransitionStatus;
  readonly modelObservationDigest: string;
  readonly implementationObservationDigest: string;
} {
  const model = run.model;
  const impl = run.implementation;
  if (model.kind === 'unevidenced' || impl.kind === 'unevidenced') {
    return {
      status: 'unevidenced',
      modelObservationDigest: model.kind === 'observed' ? sha256Address(model.observation) : NO_OBSERVATION,
      implementationObservationDigest: impl.kind === 'observed' ? sha256Address(impl.observation) : NO_OBSERVATION,
    };
  }
  // Both sides observed: decide on the EXACT canonical bytes; the stored digests are the
  // SHA-256 of those same bytes (the compact, collision-resistant replay identity).
  const modelBytes = CanonicalCbor.encode(model.observation);
  const implBytes = CanonicalCbor.encode(impl.observation);
  const status: TransitionStatus = bytesEqual(modelBytes, implBytes) ? 'equivalent' : 'divergent';
  return {
    status,
    modelObservationDigest: `sha256:${sha256Hex(modelBytes)}`,
    implementationObservationDigest: `sha256:${sha256Hex(implBytes)}`,
  };
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
    const traceDigest = sha256Address(run.history);
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
