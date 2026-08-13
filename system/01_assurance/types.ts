/**
 * Assurance: the shared vocabulary for claims about the repository itself.
 *
 * This home exists for exactly the facts TypeScript's assignability cannot
 * decide. The compiler cannot tell you which directory declared a structurally
 * identical type, whether an authority was imported from its canonical owner or
 * copied inline, whether a target imported a sibling, or whether a gate would
 * have noticed the defect it claims to guard. Those are real questions and they
 * needed a home. They did not need a second reality: for a while they had one,
 * fifty-one entries at the repository root, outside every census.
 *
 * The governing constraint on this file is therefore subtraction. Assurance
 * declares only what has no owner upstream:
 *
 * - `Proposition<Atom>` is already generic in `00_core/06_evidence`, so
 *   assurance contributes an atom and reuses the algebra rather than writing a
 *   second logic.
 * - `Decision<Subject, Failure>` is already generic there too, so assurance
 *   supplies a subject and reuses the resolution shape.
 * - `Evidence<Value>` already distinguishes unavailable, pending, ready, and
 *   failed, which is exactly what "missing evidence stays visible" requires.
 * - `AuthorityRecord`, `AuthorityGraph`, and `CanonicalImport` are already
 *   owned by `00_core/18_inspection`, whose own module comment says system
 *   assurance *produces* repository facts while core defines the contracts.
 * - `TypeAbiSurface`, `TypeAbiAttestation`, and the toolchain matrix are owned
 *   by root `types.d.ts`.
 *
 * What is genuinely new here is the notion of a gate that must earn its
 * authority, and that is what this file declares.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  NonEmptyTuple,
  Reference,
  TagOf,
} from '../../types.js';
import type { Diagnostic, RemediationAction } from '../../00_core/00_error/types.js';
import type { ContentAddress } from '../../00_core/01_encoding/types.js';
import type {
  Decision,
  DecisionBlocker,
  Evidence,
  Proposition,
  Truth,
} from '../../00_core/06_evidence/types.js';
import type { AuthorityReference } from '../../00_core/18_inspection/types.js';
import type {
  RootName,
  SourceHomeReference,
  WorkspacePath,
  WorkspaceSnapshotId,
  WorkspaceSnapshotReference,
} from '../00_workspace/types.js';

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

/**
 * What an assurance claim can be about.
 *
 * Closed, because an open subject type is how a gate ends up claiming
 * something no one can locate. Every arm names a thing the workspace snapshot
 * can actually point at, so a finding is always resolvable back to a
 * coordinate rather than to a description of one.
 */
export type AssuranceSubject = Algebra<{
  root: { readonly root: RootName };
  home: { readonly home: SourceHomeReference };
  file: { readonly path: WorkspacePath };
  authority: { readonly authority: AuthorityReference };
  artifact: { readonly address: ContentAddress };
  /**
   * A directed relation between two subjects.
   *
   * Import direction, sole ownership, and sibling exclusion are all claims
   * about a pair rather than about a thing, and giving the pair its own arm is
   * what stops a gate from encoding one half and asserting the other.
   */
  relation: {
    readonly from: AssuranceSubject;
    readonly to: AssuranceSubject;
    readonly relation: string;
  };
}>;

/** The stable name of one acquired fact, resolvable in an audit product. */
export type AssuranceFactName = Brand<string, 'liteship.assurance-fact-name'>;

// ---------------------------------------------------------------------------
// Propositions: an atom contributed to core's logic, never a second logic
// ---------------------------------------------------------------------------

/**
 * Atomic assurance predicates.
 *
 * These are shapes, not domains. `sole-owner` is one shape that serves every
 * one-owner question the repository asks; it is not a gate, and adding a new
 * gate must not require adding a predicate.
 */
export type AssurancePredicate = Algebra<{
  /** A named acquired fact about a subject holds the stated truth. */
  fact: {
    readonly fact: AssuranceFactName;
    readonly subject: AssuranceSubject;
    readonly expected: Truth;
  };
  /** The subject was present in the observed population at all. */
  present: { readonly subject: AssuranceSubject };
  /** Exactly one subject in the population owns the named declaration. */
  soleOwner: { readonly declaration: string; readonly owner: AssuranceSubject };
  /** The stated relation exists between two subjects. */
  relates: { readonly subject: AssuranceSubject };
  /** The evidence backing a subject was acquired rather than assumed. */
  acquired: { readonly fact: AssuranceFactName; readonly subject: AssuranceSubject };
}>;

/**
 * The standard assurance proposition.
 *
 * This is `Proposition` from `00_core/06_evidence` instantiated at the atom
 * above — literally the same algebra, with the same Strong Kleene semantics
 * the application language already uses. A law below pins the identity, so a
 * future edit that starts writing a private `and`/`or`/`not` here fails to
 * compile rather than quietly forking the repository's logic in two.
 */
export type AssuranceProposition = Proposition<AssurancePredicate>;

/**
 * The standard assurance decision, likewise core's shape at an assurance
 * subject. Blockers and failures are retained rather than collapsed, because a
 * gate that could not reach its evidence and a gate that reached it and found
 * a defect are different facts with different remedies.
 */
export type AssuranceDecision = Decision<AssuranceSubject, readonly Diagnostic[]>;

// ---------------------------------------------------------------------------
// Gates and the authority they must earn
// ---------------------------------------------------------------------------

export type GateId<Name extends string = string> = Brand<Name, 'liteship.assurance-gate-id'>;
export type GateReference<Id extends GateId = GateId> = Reference<'assurance-gate', Id>;

/**
 * A named class of defect a gate claims it would catch.
 *
 * Named rather than described, because the claim has to be checkable against
 * a witness. "Catches import-direction violations" is a sentence; a failure
 * class with a witness that turned the gate red is evidence.
 */
export type FailureClassId<Name extends string = string> = Brand<
  Name,
  'liteship.assurance-failure-class-id'
>;
export type FailureClassReference<Id extends FailureClassId = FailureClassId> = Reference<
  'assurance-failure-class',
  Id
>;

/**
 * What a gate covers, and what it deliberately does not.
 *
 * The complement is required rather than optional. A gate that reports on a
 * sample, a top-N, or a subset without saying so reads downstream as complete
 * coverage, and a bound that only exists in the implementation is a bound
 * nobody can audit. Stating the exclusion makes narrowing an explicit edit.
 */
export interface GateScope {
  readonly population: NonEmptyTuple<AssuranceSubject>;
  readonly excluded: readonly AssuranceSubject[];
}

/**
 * One demonstration that a gate detected an injected defect.
 *
 * This is the durable idea underneath the mutation banks that were deleted.
 * The banks were an implementation — five hundred and seventy-one scripts and
 * a bespoke runner — and implementations are quarry. What survives is the
 * relation they were groping at: a guard that has never been observed failing
 * is indistinguishable from a guard that cannot fail, and this repository has
 * written laws in both categories.
 */
export interface DetectionWitness {
  readonly failureClass: FailureClassReference;
  readonly mutation: ContentAddress;
  readonly observed: 'refuted';
}

/**
 * A gate that has earned the right to block.
 *
 * `detects` and `witnesses` are both non-empty, so a qualified gate with no
 * demonstrated detection is unrepresentable rather than merely discouraged.
 * That is the whole point: the previous arrangement could and did produce
 * gates whose self-tests passed with the gate removed.
 */
export interface QualifiedGate<Id extends GateId = GateId> {
  readonly gate: GateReference<Id>;
  readonly detects: NonEmptyTuple<FailureClassReference>;
  readonly witnesses: NonEmptyTuple<DetectionWitness>;
}

/**
 * Whether a gate has been shown to detect what it claims.
 *
 * The `refuted` arm matters as much as the other two. A gate that was tested
 * and failed to notice its own failure class is a different and more dangerous
 * state than one nobody has tested, and collapsing them into a boolean loses
 * exactly the distinction worth acting on.
 */
export type GateQualification = Algebra<{
  untested: Record<never, never>;
  qualified: { readonly qualification: QualifiedGate };
  refuted: {
    readonly undetected: NonEmptyTuple<FailureClassReference>;
    readonly diagnostics: readonly Diagnostic[];
  };
}>;

/**
 * The result of evaluating one gate, with unknown kept out of the pass arm.
 *
 * Each arm pins the decision truth it is allowed to carry. A gate whose
 * evidence was unavailable resolves to `unknown` under Strong Kleene, and that
 * cannot be reported as `satisfied` because the intersection makes the shape
 * impossible. Fail-closed is a type here, not a promise in a comment.
 */
export type GateOutcome = Algebra<{
  satisfied: { readonly decision: AssuranceDecision & { readonly truth: 'true' } };
  refuted: { readonly decision: AssuranceDecision & { readonly truth: 'false' } };
  indeterminate: {
    readonly decision: AssuranceDecision & { readonly truth: 'unknown' };
    readonly blockers: NonEmptyTuple<DecisionBlocker<AssuranceSubject>>;
  };
}>;

/**
 * Authority earned by qualified gates over an exact snapshot.
 *
 * The `earned` arm carries `QualifiedGate` values rather than gate references,
 * so authority cannot be claimed on behalf of a gate that never demonstrated
 * anything. It also carries the snapshot it was earned over: authority is a
 * fact about one revision of one workspace, and authority that outlives its
 * coordinate is the mechanism by which a release qualifies itself.
 */
export type AssuranceAuthority<Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId> = Algebra<{
  unearned: { readonly reason: string };
  earned: {
    readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
    readonly gates: NonEmptyTuple<QualifiedGate>;
  };
}>;

// ---------------------------------------------------------------------------
// Findings and receipts
// ---------------------------------------------------------------------------

/**
 * One reported conclusion about one subject, traceable to the gate that made it.
 *
 * It carries no disposition. A finding reports what happened; whether that
 * mattered enough to stop an operation is a property of the invocation, and the
 * run spec in `01_gauntlet` owns it. Keeping a copy here would restate a
 * lookup — the same triangle this home is removing elsewhere — and would let two
 * runs of one check produce findings that disagree about their own consequence.
 */
export interface Finding {
  readonly gate: GateReference;
  readonly subject: AssuranceSubject;
  readonly outcome: GateOutcome;
  readonly diagnostics: readonly Diagnostic[];
  readonly remediation: readonly RemediationAction[];
}

/**
 * What an assurance run could not establish.
 *
 * Required on the receipt rather than optional, because a degradation that is
 * absent when nothing degraded and absent when nobody looked is not a signal.
 */
export type AssuranceDegradation = Algebra<{
  none: Record<never, never>;
  degraded: {
    readonly gates: NonEmptyTuple<GateReference>;
    readonly evidence: Evidence<never>;
    readonly diagnostics: readonly Diagnostic[];
  };
}>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * Assurance contributes an atom to core's logic and does not fork it.
 *
 * The first line is the identity. The rest are the ones that make it bite: a
 * private algebra with the same four arm names would satisfy a looser check,
 * so the law pins that the proposition is core's operator applied to this
 * atom, and that the atom itself did not quietly become open.
 */
export type AssuranceReusesTheCoreProposition = Assert<
  Equal<
    [
      Equal<AssuranceProposition, Proposition<AssurancePredicate>>,
      Equal<AssuranceDecision, Decision<AssuranceSubject, readonly Diagnostic[]>>,
      Equal<TagOf<AssuranceProposition>, 'literal' | 'atom' | 'not' | 'and' | 'or'>,
      Proposition<AssurancePredicate> extends AssuranceProposition ? true : false,
      Equal<CaseOf<AssuranceProposition, 'atom'>['value'], AssurancePredicate>,
    ],
    [true, true, true, true, true]
  >
>;

/**
 * A satisfied gate cannot be carrying an unresolved decision.
 *
 * Lines one and two pin that the pass arm admits only `'true'` and that
 * `'unknown'` is not assignable into it. Line three is the anti-vacuity
 * partner: without it, the law would still pass if `satisfied` were widened to
 * the full `Truth` union, because `'true'` remains assignable to `Truth`.
 */
export type UnknownNeverPassesAGate = Assert<
  Equal<
    [
      Equal<CaseOf<GateOutcome, 'satisfied'>['decision']['truth'], 'true'>,
      'unknown' extends CaseOf<GateOutcome, 'satisfied'>['decision']['truth'] ? true : false,
      Truth extends CaseOf<GateOutcome, 'satisfied'>['decision']['truth'] ? true : false,
      Equal<CaseOf<GateOutcome, 'indeterminate'>['decision']['truth'], 'unknown'>,
      Equal<TagOf<GateOutcome>, 'satisfied' | 'refuted' | 'indeterminate'>,
    ],
    [true, false, false, true, true]
  >
>;

/**
 * Authority cannot be earned without demonstrated detection.
 *
 * The last two lines are the ones a mutation would otherwise slip past:
 * widening `gates` to bare references, or letting `witnesses` become a
 * possibly-empty array, both leave a gate able to claim authority it never
 * demonstrated, and both are ordinary-looking edits.
 */
export type EarnedAuthorityRequiresQualifiedGates = Assert<
  Equal<
    [
      Equal<CaseOf<AssuranceAuthority, 'earned'>['gates'], NonEmptyTuple<QualifiedGate>>,
      readonly GateReference[] extends CaseOf<AssuranceAuthority, 'earned'>['gates'] ? true : false,
      Equal<QualifiedGate['witnesses'], NonEmptyTuple<DetectionWitness>>,
      readonly DetectionWitness[] extends QualifiedGate['witnesses'] ? true : false,
      'snapshot' extends keyof CaseOf<AssuranceAuthority, 'earned'> ? true : false,
    ],
    [true, false, true, false, true]
  >
>;

/**
 * Qualification keeps untested and refuted apart.
 *
 * A boolean would merge them, and the merge loses the only distinction worth
 * acting on: nobody has checked this gate, versus this gate was checked and
 * did not notice.
 */
export type QualificationSeparatesUntestedFromRefuted = Assert<
  Equal<
    [
      Equal<TagOf<GateQualification>, 'untested' | 'qualified' | 'refuted'>,
      'qualified' extends keyof GateQualification ? true : false,
      Equal<CaseOf<GateQualification, 'refuted'>['undetected'], NonEmptyTuple<FailureClassReference>>,
      Equal<CaseOf<GateQualification, 'qualified'>['qualification'], QualifiedGate>,
    ],
    [true, false, true, true]
  >
>;

/**
 * A gate states its complement.
 *
 * `excluded` is a required member holding a possibly-empty array, which is the
 * deliberate shape: covering everything is `[]`, an honest statement, while an
 * absent member would be indistinguishable from never having considered scope.
 */
export type AGateStatesWhatItDoesNotCover = Assert<
  Equal<
    [
      'excluded' extends keyof GateScope ? true : false,
      Equal<GateScope['excluded'], readonly AssuranceSubject[]>,
      Equal<GateScope['population'], NonEmptyTuple<AssuranceSubject>>,
      undefined extends GateScope['excluded'] ? true : false,
    ],
    [true, true, true, false]
  >
>;

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

/**
 * The children this home has: two, and these two.
 *
 * Audit acquires; gauntlet evaluates. They are separate because their
 * dependencies and costs are, not because separation is tidy — acquisition
 * needs a compiler lane and a filesystem, evaluation needs neither and can run
 * wherever the facts are shipped. A third child would be an edit somebody makes
 * on purpose rather than a folder that appears because a need did.
 */
export type AssuranceChildRoster = readonly ['00_audit', '01_gauntlet'];

/** The child names, derived from the roster so the population is written once. */
export type AssuranceChildName = AssuranceChildRoster[number];

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the root system topology. */
export interface AssuranceTypeSurface {
  readonly children: AssuranceChildRoster;
  readonly subject: AssuranceSubject;
  readonly predicate: AssurancePredicate;
  readonly proposition: AssuranceProposition;
  readonly decision: AssuranceDecision;
  readonly gate: GateReference;
  readonly scope: GateScope;
  readonly qualification: GateQualification;
  readonly witness: DetectionWitness;
  readonly outcome: GateOutcome;
  readonly authority: AssuranceAuthority;
  readonly finding: Finding;
  readonly degradation: AssuranceDegradation;
}
