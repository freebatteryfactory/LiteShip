/**
 * Transition facts — the pre-computed, host-built BISIMULATION evidence the
 * {@link transitionConformanceGate} folds into {@link Finding}s (Wave 5.5, the
 * transition cage — the DYNAMIC-SUBJECT half of the convergence constitution's
 * conformance backbone).
 *
 * This module defines the {@link TransitionFacts} INTERFACE and nothing else. Like
 * {@link MutationFacts} and {@link RepoIR}, it carries no heavy dependency:
 * `@czap/gauntlet` stays the lean engine, so it never constructs a reactive
 * primitive, forks a fiber, or runs a `fast-check` command walk. A HOST
 * (`@czap/audit`'s `buildTransitionFacts` + the Foundation capture/model harnesses
 * the CLI wires) does the heavy lifting — unfold each seeded operation history over
 * BOTH the single-oracle MODEL and the IMPLEMENTATION, content-address each observed
 * trace, decide the per-case bisimulation verdict — and hands the engine these flat,
 * already-decided facts. The gate's only job is to FOLD them into Findings at the
 * family's assurance level (ADR-0012: the lean engine folds facts; the host computes
 * them — the same boundary {@link MutationFacts} rides).
 *
 * THE BIG IDEA (the constitution's §3 bisimulation half). A reactive primitive is a
 * COALGEBRA: it unfolds a state machine into an observable trace over an operation
 * history. Its fidelity relation against the single-oracle model is a BISIMULATION —
 * two transports (the MODEL derived from the CellKernel/Lifetime law tables, and the
 * live IMPLEMENTATION) driven over ONE op history must produce observationally-
 * equivalent traces. A {@link TransitionCase} records one such run: the seed, the
 * content-addressed op history, and the two content-addressed observations. Where the
 * two observation digests AGREE the case is `equivalent` (the bisimulation held);
 * where they DIFFER the case is `divergent` (a behavior the transport swap changed —
 * the exact thing the cage exists to catch before Wave 6 moves the primitives onto
 * CellKernel). REPORT-not-DECIDE: the gate reports the divergence at the family's
 * level carrying the replayable seed; the human/agent (or Wave 6's deliberate
 * EmissionPolicy choice) decides whether the divergence is a bug to fix or a contract
 * to re-pin.
 *
 * `unevidenced` IS SEPARATE FROM DIVERGENCE (Axiom 4). A case whose evidence is
 * ABSENT — the implementation threw at construction, an op the transport does not
 * support, or an oracle side that produced no trace — is NOT a fidelity arm; it is the
 * state of an observation whose witness is missing. It is recorded distinctly so a
 * coverage gap is never laundered into a false "equivalent" green, and it rides its
 * own monotone ratchet ({@link TransitionFacts.unevidencedBaseline}): the count of
 * unevidenced cases may only ever fall.
 *
 * @module
 */

/**
 * The verdict a bisimulation case earned — a bare string-union field (the same flat
 * discriminant shape as {@link MutantVerdictTag}, NOT a nested `_tag` object), so the
 * facts stay flat, JSON-stable, and byte-identical across runs over unchanged inputs.
 *  - `equivalent` — the model and implementation observation digests AGREE: the
 *    bisimulation held over this op history (the conformant green — no finding). The
 *    named equivalence relation is bisimulation (constitution §3 / Axiom 4).
 *  - `divergent` — the two observation digests DIFFER: the transport produced a
 *    different observable trace for the same history — a behavior change (a finding,
 *    the cage's whole purpose).
 *  - `unevidenced` — at least one oracle side produced NO observation (a construction
 *    fault, an unsupported op, a missing trace). SEPARATE from divergence (Axiom 4):
 *    a witness-missing case, never a fidelity claim. Excluded from divergence, ridden
 *    by the {@link TransitionFacts.unevidencedBaseline} ratchet.
 */
export type TransitionStatus = 'equivalent' | 'divergent' | 'unevidenced';

/**
 * One evaluated bisimulation case — the flat, decided outcome of unfolding ONE seeded
 * operation history over both oracle transports, plus the data the gate needs to write
 * a self-explaining, REPLAYABLE Finding. An `equivalent` case is a conformant green
 * (no finding); a `divergent` case is the behavior change the gate reports; an
 * `unevidenced` case is a coverage gap the gate surfaces (and the ratchet floors).
 */
export interface TransitionCase {
  /** The pinned seed that generated the op history — the replay key half (`{ family, seed, traceDigest }`). */
  readonly seed: string;
  /** The content address of the op history (canonical-CBOR → fnv1a) — the replay key half. */
  readonly traceDigest: string;
  /** The number of operations in the history (report context — how deep the walk was). */
  readonly operationCount: number;
  /** The content address of the MODEL's observation over this history (the single-oracle side). */
  readonly modelObservationDigest: string;
  /** The content address of the IMPLEMENTATION's observation over this history (the transport under test). */
  readonly implementationObservationDigest: string;
  /** The decided bisimulation verdict — `equivalent` (green) / `divergent` (finding) / `unevidenced` (gap). */
  readonly status: TransitionStatus;
}

/**
 * The host-supplied bisimulation evidence over one conformance FAMILY's run. The
 * capture is HEAVY (an `Effect.runPromise` fiber walk per case, drained to
 * quiescence), so production runs it OPT-IN (`czap check --ir --transition`), scoped
 * + cached; when the host did not run it this whole capability is simply ABSENT from
 * the {@link GateContext} and the gate is not in the set (no cost, no noise). When
 * present it carries every per-case verdict plus the two transport fingerprints and
 * the committed unevidenced BASELINE the ratchet compares against.
 *
 * ONE family per facts object (the gate aims a single assurance level at it, resolved
 * from the family). A run that spans multiple conformance families builds one
 * {@link TransitionFacts} per family; the host injects them one at a time, the same
 * single-context-field shape {@link MutationFacts} rides.
 */
export interface TransitionFacts {
  /**
   * The conformance family this evidence covers (e.g. `'cell'`, `'store'`,
   * `'reactive-replay1'`). Names WHAT bisimulation relation was checked and aims the
   * gate's level (the reactive kernels resolve L4 — the trust spine). Woven into every
   * finding for traceability.
   */
  readonly family: string;
  /**
   * The content address of the MODEL transport — the single-oracle `fc.commands` model
   * DERIVED from the CellKernel/Lifetime law tables (LS-001). Fingerprints WHICH model
   * produced the reference observations, so a finding can name the exact oracle version
   * two transports disagreed under.
   */
  readonly modelDigest: string;
  /**
   * The content address of the IMPLEMENTATION transport under test (the Effect-backed
   * primitive this wave; the CellKernel-backed primitive in Wave 6). Fingerprints the
   * exact implementation the bisimulation was checked against.
   */
  readonly implementationDigest: string;
  /** Every evaluated bisimulation case's outcome — the substrate the gate folds. */
  readonly cases: readonly TransitionCase[];
  /**
   * How many cases exercised each operation tag (`subscribe`/`set`/`update`/… → count)
   * — the coverage read of the corpus. A tag mapped to 0 (or absent) is an op the
   * corpus never drove: a gap the gate can surface (an unexercised transition is
   * unproven, not proven-equivalent).
   */
  readonly operationCoverage: Readonly<Record<string, number>>;
  /**
   * The committed maximum tolerated `unevidenced` case count for this family (the
   * ratchet artifact). A fresh run whose unevidenced count RISES above this baseline is
   * a regression finding (the count may only ever fall — more evidence over time, never
   * less). OMITTED → no committed floor: the family's first measurement is reported
   * informationally (each unevidenced case an advisory), never a regression, exactly as
   * {@link MutationFacts.scoreBaseline}'s absent-file semantics.
   */
  readonly unevidencedBaseline?: number;
}
