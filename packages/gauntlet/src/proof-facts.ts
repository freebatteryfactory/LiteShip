/**
 * Proof facts — the pre-computed, host-injected PROOF-STRENGTH evidence the
 * {@link proofPropagationGate} folds into {@link Finding}s (the LOCAL-VS-GLOBAL
 * correctness family — the lax-functor: local proof ≤ weakest dependency).
 *
 * This module defines the {@link ProofFacts} INTERFACE and nothing else. Like
 * {@link RepoIR} and {@link MutationFacts}, it carries NO heavy dependency:
 * `@czap/gauntlet` stays the lean engine, so it never reads a coverage report, a
 * mutation-score baseline, or the invariants ledger. A HOST (the CLI's
 * `czap check --ir --proof` path) reads those proof signals, blends them into a
 * per-module proof scalar, and hands the engine these flat, already-decided facts.
 * The gate's only job is to PROPAGATE the scalar along the IR's dep DAG (the
 * `min`-fold mirroring {@link propagateAssuranceLevels}) and FOLD a weak-link finding
 * (ADR-0012: the lean engine folds facts; the host computes them).
 *
 * THE BIG IDEA (the lax-functor; sound as a RISK signal). A module can be LOCALLY
 * well-proven — high coverage, killed mutants, a property test, an enrolled
 * invariant — yet sit atop an UNDER-PROVEN dependency. Local proof does NOT compose
 * past a weak dependency: if `A` calls into `B` and `B`'s behaviour is unproven,
 * then `A`'s proof is only as strong as `B`'s, because `A`'s correctness is
 * conditioned on `B`'s. So the EFFECTIVE (global) proof of a module is the MINIMUM
 * of its own local proof and the effective proof of every module it depends on — a
 * fixpoint over the dep DAG. A trust-spine (L4/L3) module whose effective proof
 * drops below a floor BECAUSE of a weak dependency is the finding: the weak link
 * must be strengthened OR the criticality reassessed. This is HONEST as a risk
 * signal — it never CLAIMS the global system is correct (full semantic global
 * correctness is undecidable, Rice); it reports that the proof of a critical module
 * does not compose past a measured weak link. The floor + the blend weights are
 * redlinable DATA.
 *
 * @module
 */

/**
 * The proof evidence the host supplies — one {@link ModuleProof} per IR file the
 * host could measure. The host blends the proof signals (mutation score, coverage,
 * has-property-test, enrolled-invariant) into the normalized `localProof` scalar;
 * the gate propagates it. A file ABSENT from `modules` has no measured local proof
 * — the gate treats it as the documented {@link UNMEASURED_PROOF} floor (an
 * unmeasured dependency is the WEAKEST possible link, the sound direction: it can
 * only LOWER an effective proof, never inflate it). An empty/absent `modules` is
 * reported by the gate as an advisory "not-evidenced" finding (honest
 * under-coverage, never a silent green) — see {@link proofPropagationGate}.
 */
export interface ProofFacts {
  /** Every module the host measured a local proof scalar for. */
  readonly modules?: readonly ModuleProof[];
}

/**
 * One module's blended LOCAL proof scalar + the signal breakdown the finding
 * shows. `localProof` is in `[0, 1]` (0 = unproven, 1 = fully proven); the
 * breakdown is the evidence the host blended, surfaced so the reader sees WHY a
 * module's local proof is what it is (never a bare opaque number).
 */
export interface ModuleProof {
  /** The repo-relative file id — MUST be an IR file (the gate aims its level + reads its deps). */
  readonly file: string;
  /**
   * The blended local proof scalar in `[0, 1]` — the host's normalized combination
   * of {@link ProofSignals}. The gate does NOT recompute it (ADR-0012: the host
   * computes, the engine folds); it propagates it along the dep DAG.
   */
  readonly localProof: number;
  /** The individual proof signals the host blended — the self-explaining breakdown. */
  readonly signals: ProofSignals;
}

/**
 * The proof signals behind one module's blended {@link ModuleProof.localProof} —
 * the evidence breakdown a weak-link finding shows so a reader can act (strengthen
 * the dependency's tests / enroll its invariant). Each is the raw signal the host
 * read; the host owns the blend, the gate owns the propagation.
 */
export interface ProofSignals {
  /** The module's mutation score in `[0, 1]` (killed / non-equivalent), or null if unmeasured. */
  readonly mutationScore: number | null;
  /** The module's line/statement coverage fraction in `[0, 1]`, or null if unmeasured. */
  readonly coverage: number | null;
  /** Whether the module has at least one PROPERTY (fast-check) test exercising it. */
  readonly hasPropertyTest: boolean;
  /** Whether at least one enrolled system invariant (traceability ledger) traces to this module. */
  readonly hasEnrolledInvariant: boolean;
}

/**
 * The proof scalar the gate assigns a module the host did NOT measure — the WEAKEST
 * link (`0`, fully unproven). This is the SOUND direction for a risk signal: an
 * unmeasured dependency must drag an effective proof DOWN, never silently leave it
 * untouched (which would let a critical module inherit a clean global proof through
 * a hole the host never looked at). A host that measures every IR module never hits
 * this floor; it is the defence-in-depth value for a dependency outside the measured
 * set.
 */
export const UNMEASURED_PROOF = 0 as const;
