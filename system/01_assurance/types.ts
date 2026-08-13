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
  IsExactlyTrue,
  NonEmptyTuple,
  Reference,
  Refine,
  TagOf,
  TypeScriptToolchainFingerprint,
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

// ---------------------------------------------------------------------------
// Self-demonstration: proving a check can discriminate
// ---------------------------------------------------------------------------

/**
 * Identity of one exact revision of a check's rule.
 *
 * Three identities stay distinct and this is the middle one. `GateId` is which
 * conceptual check this is, and survives edits. This is one particular
 * observation of the rule, and does not. The third is the observed source
 * location — a fact about one repository snapshot — which lives on the
 * definition beside its content address.
 *
 * An opaque threading token, read exactly as `WorkspaceSnapshotId` is. What it
 * proves is this and only this:
 *
 * > this proof, this run specification, and this evaluation concern the same
 * > exact definition observation.
 *
 * It does not prove that the token changes when the rule's bytes change. Nothing
 * in a type system mints a token, so "editing the rule invalidates its old
 * proof" is a property of whatever mints them — and an earlier draft of this
 * comment asserted it as a property of the declaration, which is the same
 * overclaim the snapshot token was carefully written to avoid, made one file
 * over and four days later.
 *
 * The definition carries a `ContentAddress` of the rule text as a runtime
 * observation. That address cannot carry the exactness either:
 * `ContentAddress<Type>` resolves to one template literal identical for every
 * value of that media type, which is the erasure this repository has now
 * repaired twice. Binding token to address to bytes is an audit obligation and
 * the README lists it as one.
 */
export type GateRevisionId<Name extends string = string> = Brand<
  Name,
  'liteship.assurance-gate-revision-id'
>;
export type GateRevisionReference<Id extends GateRevisionId = GateRevisionId> = Reference<
  'assurance-gate-revision',
  Id
>;

/**
 * A synthetic artifact a demonstration runs the check against.
 *
 * Deliberately not a `WorkspaceSnapshotReference`. A specimen is a fabricated
 * world built to test whether the instrument can discriminate; the repository
 * snapshot is the subject the instrument is later pointed at. Forcing one
 * coordinate to mean both would make "this check was demonstrated" and "this
 * check was run on your code" the same claim, and they are not remotely the
 * same claim.
 */
export type SpecimenId<Name extends string = string> = Brand<
  Name,
  'liteship.assurance-specimen-id'
>;
export type SpecimenReference<Id extends SpecimenId = SpecimenId> = Reference<
  'assurance-specimen',
  Id
>;

/**
 * What one witness is doing in a demonstration.
 *
 * Four roles, and a demonstration requires all four in named slots rather than
 * in an array. An array of four witness values can hold four baselines and
 * congratulate itself; the whole point of the roles is that each answers a
 * different way the demonstration could be worthless.
 *
 * - `baseline`: the unmodified control was green, so the check is not red for
 *   unrelated reasons.
 * - `lawful`: a known-lawful neighbouring specimen was accepted, so the check is
 *   not simply refusing everything near the defect.
 * - `detection`: the injected failure class was refused.
 * - `attribution`: the refusal came from the intended semantic relationship.
 */
export type WitnessRole = 'baseline' | 'lawful' | 'detection' | 'attribution';

/** The outcome a role is allowed to have observed. */
type RoleObservation<Role extends WitnessRole> = Role extends 'baseline' | 'lawful'
  ? CaseOf<GateOutcome, 'satisfied'>
  : CaseOf<GateOutcome, 'refuted'>;

/**
 * Why a refusal is the refusal that was claimed.
 *
 * `relationship` is the load-bearing member. Attribution's whole job is to
 * separate "the check went red" from "the check went red *because of the
 * relationship it claims to police*", and a nonzero exit code, a syntax error,
 * an unresolved import, or an unrelated rule firing all produce the first
 * without the second. A witness that cannot name the predicate it attributes the
 * refusal to has not attributed anything.
 *
 * The finding travels with it so the attribution is auditable rather than
 * asserted.
 */
export interface AttributedRefusal {
  readonly finding: Finding;
  readonly relationship: AssurancePredicate;
}

/** What a role beyond `attribution` carries: nothing extra. */
type RoleAttribution<Role extends WitnessRole> = Role extends 'attribution'
  ? AttributedRefusal
  : Record<never, never>;

/**
 * One observation of one exact rule against one specimen, in one role.
 *
 * This replaces `DetectionWitness`, which carried a failure class, a mutation
 * address, and the literal `'refuted'` — three facts with nothing binding them
 * to the rule that did the refusing, the toolchain that ran it, or the claim it
 * was supposed to be about.
 *
 * The interpreter fingerprint is root's, not a local twin. A demonstration under
 * a different compiler is a different demonstration, and the repository already
 * owns a type that says which one.
 */
export interface DemonstrationWitness<
  Role extends WitnessRole = WitnessRole,
  Class extends FailureClassId = FailureClassId,
  Revision extends GateRevisionId = GateRevisionId,
> {
  readonly role: Role;
  readonly revision: GateRevisionReference<Revision>;
  readonly failureClass: FailureClassReference<Class>;
  readonly specimen: SpecimenReference;
  readonly interpreter: TypeScriptToolchainFingerprint;
  readonly observed: RoleObservation<Role>;
  readonly attribution: RoleAttribution<Role>;
}

/**
 * One demonstration that one check detects one failure class.
 *
 * Four named slots, each pinned to its own role literal, so the product cannot
 * hold four baselines. This is what replaces the previous arrangement, in which
 * `detects: NonEmptyTuple<FailureClassReference>` and
 * `witnesses: NonEmptyTuple<DetectionWitness>` were two independent populations
 * — probe-confirmed that a gate declaring it detects X while carrying a witness
 * for Y was assignable. The claim and its evidence are now the same object.
 */
export interface ClaimDemonstration<
  Class extends FailureClassId = FailureClassId,
  Revision extends GateRevisionId = GateRevisionId,
> {
  readonly failureClass: FailureClassReference<Class>;
  readonly revision: GateRevisionReference<Revision>;
  readonly baseline: DemonstrationWitness<'baseline', Class, Revision>;
  readonly lawful: DemonstrationWitness<'lawful', Class, Revision>;
  readonly detection: DemonstrationWitness<'detection', Class, Revision>;
  readonly attribution: DemonstrationWitness<'attribution', Class, Revision>;
}

/**
 * How a completed self-demonstration came out.
 *
 * `disproven` rather than `refuted`, deliberately. `GateOutcome.refuted` already
 * means "this check evaluated the repository and found its proposition false",
 * and reusing the word for "this check failed to notice the defect it claims to
 * catch" would put two subjects under one term in a file whose entire job is
 * keeping claims and evidence apart.
 *
 * There is no `untested` arm, and its absence is the point. Whether anyone has
 * tried is not a property of the outcome — it is the difference between having
 * this value and not having it, which is exactly what core's `Evidence` already
 * expresses: `unavailable` when nobody produced a demonstration, `pending` while
 * one runs, `ready` when it came out either way, `failed` when the demonstration
 * machinery itself broke. The retired `GateQualification` had `untested` as an
 * arm of the same algebra as `qualified`, which is a status badge riding on
 * every evaluation. Reuse the absence language that exists; do not invent a
 * second one.
 */
export type DemonstrationOutcome<
  Class extends FailureClassId = FailureClassId,
  Revision extends GateRevisionId = GateRevisionId,
> = Algebra<{
  demonstrated: { readonly demonstration: ClaimDemonstration<Class, Revision> };
  disproven: {
    readonly failureClass: FailureClassReference<Class>;
    readonly revision: GateRevisionReference<Revision>;
    readonly observed: NonEmptyTuple<DemonstrationWitness>;
    readonly diagnostics: readonly Diagnostic[];
  };
}>;

/** A demonstration that was actually acquired and actually came out demonstrated. */
export type DemonstratedProof<
  Class extends FailureClassId = FailureClassId,
  Revision extends GateRevisionId = GateRevisionId,
> = Refine<
  CaseOf<Evidence<DemonstrationOutcome<Class, Revision>>, 'ready'>,
  { readonly value: CaseOf<DemonstrationOutcome<Class, Revision>, 'demonstrated'> }
>;

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

// ---------------------------------------------------------------------------
// Evidence profiles
// ---------------------------------------------------------------------------

/**
 * How much evidence a run had available.
 *
 * `lean` is a pre-commit or editor context where the compiler lane is not
 * worth paying for; `rich` is a full audit. The distinction is declared rather
 * than inferred so that a gate needing rich evidence under a lean run resolves
 * to indeterminate — visible, and refused if the invocation required that
 * check — instead of silently not running. Silently not running is how a checked
 * repository becomes an unchecked one without anybody deciding to.
 */
export type EvidenceProfile = 'lean' | 'rich';

// ---------------------------------------------------------------------------
// Gate definitions
// ---------------------------------------------------------------------------

/**
 * Where a check came from.
 *
 * A member on the one definition, replacing `ConsumerGateId` — a second brand
 * over the same carrier, which `GateDefinition<Id extends GateId>` could not be
 * instantiated with. The promise that consumer gates travel the same path as
 * repository gates was not weakly enforced; it was impossible, and the type that
 * existed to make extension first-class prevented it.
 */
export type GateOrigin = 'repository' | 'consumer';

/**
 * One gate: what it covers, what it reads, what it concludes, and what it
 * claims to catch.
 *
 * `reads` is non-empty because a gate with no inputs decides nothing and
 * cannot fail — the pure form of the vacuity this repository keeps rediscovering
 * in its own laws.
 *
 * `claims` is non-empty because each claim carries its own proof, positionally.
 * A check that claims nothing can never be disproven, which makes it
 * permanently undemonstrable rather than trivially trustworthy.
 *
 * There is no `disposition` member. A definition used to declare itself
 * `blocking`, `warning`, or `advisory` for all time, which made a factual check
 * permanently managerial — and it is wrong on its face, because the same check
 * is required by release, shown in an editor, and merely informative in a
 * diagnostic view. What a check *is* does not change; what an invocation
 * *requires* does. Consequence therefore lives on {@link AssuranceRunSpec}, as
 * ordinary operation input.
 *
 * `requires` stays, and is not the same kind of thing. An evidence profile is a
 * factual prerequisite of the check — it says what the check needs in order to
 * decide at all — rather than a standing claim about what should happen when it
 * decides against you.
 */
export interface GateDefinition<
  Id extends GateId = GateId,
  Revision extends GateRevisionId = GateRevisionId,
  Claims extends NonEmptyTuple<FailureClassReference> = NonEmptyTuple<FailureClassReference>,
> {
  readonly gate: GateReference<Id>;
  readonly revision: GateRevisionReference<Revision>;
  readonly origin: GateOrigin;
  readonly scope: GateScope;
  readonly reads: NonEmptyTuple<AssuranceFactName>;
  readonly proposition: AssuranceProposition;
  readonly claims: Claims;
  readonly requires: EvidenceProfile;
  readonly address: ContentAddress<'application/vnd.liteship.gate-definition+cbor'>;
  readonly source: WorkspacePath;
}

/**
 * One proof entry per declared claim, positionally.
 *
 * The claim population is a type parameter for exactly this reason. Previously
 * `detects` and `witnesses` were two independent non-empty tuples with nothing
 * relating a position in one to a position in the other — probe-confirmed that a
 * gate declaring it detects X while carrying a witness for Y was assignable. A
 * homomorphic mapping over the claim tuple makes the two the same population by
 * construction, and the per-position `infer` makes entry two the proof of claim
 * two.
 *
 * Each entry is `Evidence`-wrapped so that *nobody has demonstrated this yet*,
 * *a demonstration is running*, *a demonstration came out*, and *the
 * demonstration machinery broke* stay four distinct states rather than
 * collapsing into a status word.
 */
export type ClaimProofs<
  Claims extends NonEmptyTuple<FailureClassReference>,
  Revision extends GateRevisionId = GateRevisionId,
> = {
  readonly [Position in keyof Claims]: Claims[Position] extends FailureClassReference<infer Class>
    ? Evidence<DemonstrationOutcome<Class, Revision>>
    : never;
};

/** The same population, with every claim actually demonstrated. */
export type DemonstratedClaimProofs<
  Claims extends NonEmptyTuple<FailureClassReference>,
  Revision extends GateRevisionId = GateRevisionId,
> = {
  readonly [Position in keyof Claims]: Claims[Position] extends FailureClassReference<infer Class>
    ? DemonstratedProof<Class, Revision>
    : never;
};

/**
 * A check as an evaluation used it: the exact rule, and where its proof stands.
 *
 * The proofs are bound to the definition's revision, not to its `GateId`. That
 * is the whole reason the revision exists: a check demonstrated last month does
 * not carry that demonstration into a rule nobody has tested — *provided
 * whatever mints revisions mints a fresh one when the rule changes*. The type
 * holds the two together and performs no minting, and that qualifier is not
 * decoration.
 */
export interface EvaluatedGate<
  Id extends GateId = GateId,
  Revision extends GateRevisionId = GateRevisionId,
  Claims extends NonEmptyTuple<FailureClassReference> = NonEmptyTuple<FailureClassReference>,
> {
  readonly definition: GateDefinition<Id, Revision, Claims>;
  readonly proofs: ClaimProofs<Claims, Revision>;
}

/** A check whose every declared claim has a demonstration behind it. */
export type DemonstratedGate<
  Id extends GateId = GateId,
  Revision extends GateRevisionId = GateRevisionId,
  Claims extends NonEmptyTuple<FailureClassReference> = NonEmptyTuple<FailureClassReference>,
> = Refine<
  EvaluatedGate<Id, Revision, Claims>,
  { readonly proofs: DemonstratedClaimProofs<Claims, Revision> }
>;

// ---------------------------------------------------------------------------
// The run specification
// ---------------------------------------------------------------------------

/**
 * What this invocation does with a check's answer.
 *
 * Two arms, not three, and deliberately not `blocking | warning | advisory`
 * under new spelling. The retired triple was a standing property of a check;
 * this is a property of one invocation, and an invocation either needs an answer
 * to proceed or wants to hear it. Severity of a *finding* is a diagnostic
 * concern and stays on `Diagnostic`, where a whole vocabulary for it already
 * exists.
 */
export type CheckConsequence = 'required' | 'informational';

/**
 * One entry in a run spec: which exact check, and what this run does with it.
 *
 * The revision is named alongside the gate, and carrying only the gate was not
 * enough. `GateId` survives edits — that is what makes it the same check across
 * time — so a plan naming only the gate lets a proof concern revision A while
 * the run executes revision B, with the type seeing agreement precisely where
 * the instrument changed. Persistent identity is for discovery and continuity;
 * it is not proof identity.
 */
export interface PlannedCheck<
  Id extends GateId = GateId,
  Revision extends GateRevisionId = GateRevisionId,
> {
  readonly gate: GateReference<Id>;
  readonly revision: GateRevisionReference<Revision>;
  readonly consequence: CheckConsequence;
}

export type AssuranceRunSpecId<Name extends string = string> = Brand<
  Name,
  'liteship.assurance-run-spec-id'
>;
export type AssuranceRunSpecReference<Id extends AssuranceRunSpecId = AssuranceRunSpecId> =
  Reference<'assurance-run-spec', Id>;

/**
 * What one assurance invocation asks for.
 *
 * Ordinary operation input, not a policy document and not a governance plan.
 * Publishing has stricter prerequisites than showing repository diagnostics, so
 * the two invocations name different check populations and different
 * consequences. That is a function argument, not an approval department.
 *
 * The check population is a type parameter rather than a plain member because a
 * result is required to carry one evaluation *per planned check*, and that
 * correspondence is only expressible if the population's arity is in the type.
 * A result whose evaluation count is merely non-empty says "something ran" where
 * the question was "did what was requested run" — and the difference between
 * those two is the whole reason the deleted control plane's reports read clean.
 */
export interface AssuranceRunSpec<
  Id extends AssuranceRunSpecId = AssuranceRunSpecId,
  Checks extends NonEmptyTuple<PlannedCheck> = NonEmptyTuple<PlannedCheck>,
> {
  readonly spec: AssuranceRunSpecReference<Id>;
  readonly checks: Checks;
  readonly profile: EvidenceProfile;
}

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
 * A gate reads something and claims something.
 *
 * Both negative lines matter. Widening either population to a plain array
 * admits the empty case, and the empty case is a gate that cannot fail — which
 * is indistinguishable from a gate that never fires, and is exactly the state
 * every vacuous law in this repository has been in.
 */
export type AGateReadsEvidenceAndClaimsDetection = Assert<
  Equal<
    [
      Equal<GateDefinition['reads'], NonEmptyTuple<AssuranceFactName>>,
      readonly AssuranceFactName[] extends GateDefinition['reads'] ? true : false,
      Equal<GateDefinition['claims'], NonEmptyTuple<FailureClassReference>>,
      readonly FailureClassReference[] extends GateDefinition['claims'] ? true : false,
    ],
    [true, false, true, false]
  >
>;

type GateLawA = GateId<'law.gate.a'>;
type ClassLawA = FailureClassId<'law.class.a'>;
type ClassLawB = FailureClassId<'law.class.b'>;
type ClaimsLawAB = readonly [FailureClassReference<ClassLawA>, FailureClassReference<ClassLawB>];

/**
 * A claim and its proof are one population.
 *
 * Line one is the correspondence: two claims, two proofs, the second about the
 * second claim. Lines two and three are what the retired arrangement admitted
 * and this does not — a proof population shorter than the claim population, and
 * a proof of claim A standing in for a proof of claim B. That second one was not
 * hypothetical: `detects: [X]` carrying `witnesses: [WitnessForY]` was
 * assignable, probe-confirmed, which made the qualification claim decorative.
 *
 * Line four pins that a demonstrated population is strictly narrower than a
 * merely acquired one, and line five that it did not collapse to `never` on the
 * way — `Refine` returns `never` for a change that narrows nothing, and a
 * `never` inside a tuple position would make lines two and three false for
 * entirely the wrong reason.
 */
export type AClaimAndItsProofAreOnePopulation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          ClaimProofs<ClaimsLawAB>,
          readonly [Evidence<DemonstrationOutcome<ClassLawA>>, Evidence<DemonstrationOutcome<ClassLawB>>]
        >,
        readonly [Evidence<DemonstrationOutcome<ClassLawA>>] extends ClaimProofs<ClaimsLawAB>
          ? true
          : false,
        readonly [
          Evidence<DemonstrationOutcome<ClassLawA>>,
          Evidence<DemonstrationOutcome<ClassLawA>>,
        ] extends ClaimProofs<ClaimsLawAB>
          ? true
          : false,
        DemonstratedClaimProofs<ClaimsLawAB> extends ClaimProofs<ClaimsLawAB> ? true : false,
        ClaimProofs<ClaimsLawAB> extends DemonstratedClaimProofs<ClaimsLawAB> ? true : false,
      ],
      [true, false, false, true, false]
    >
  >
>;

type RevisionLawOne = GateRevisionId<'law.revision.1'>;
type RevisionLawTwo = GateRevisionId<'law.revision.2'>;

/**
 * The evaluated gate actually carries that correlated population.
 *
 * Written out concretely and pinned against the member, because the law above
 * proves `ClaimProofs` behaves correctly as an *operator* and — measured — that
 * was not enough twice over.
 *
 * Widening `proofs` to `NonEmptyTuple<Evidence<DemonstrationOutcome>>` compiled
 * clean with every operator law still green: the proof population and the claim
 * population were two independent tuples again, which is the exact arrangement
 * this commit exists to delete, restored in the carrier while the operator that
 * forbids it sat unused beside it.
 *
 * Dropping the revision from `proofs` also compiled clean, and that one is
 * subtler. `ProofIsBoundToTheExactRule` still passed, because the *definition*
 * threads the revision and the law was reading it there — a law that fires, over
 * an operator that is correct, which cannot distinguish the case it is named
 * after from a different one. Lines one and two read the revision through the
 * proof entries, where the claim actually lives.
 */
export type TheEvaluatedGateCarriesTheCorrelatedProofs = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          EvaluatedGate<GateLawA, RevisionLawOne, ClaimsLawAB>['proofs'],
          readonly [
            Evidence<DemonstrationOutcome<ClassLawA, RevisionLawOne>>,
            Evidence<DemonstrationOutcome<ClassLawB, RevisionLawOne>>,
          ]
        >,
        Equal<
          DemonstratedGate<GateLawA, RevisionLawOne, ClaimsLawAB>['proofs'],
          readonly [
            DemonstratedProof<ClassLawA, RevisionLawOne>,
            DemonstratedProof<ClassLawB, RevisionLawOne>,
          ]
        >,
        NonEmptyTuple<Evidence<DemonstrationOutcome>> extends EvaluatedGate<
          GateLawA,
          RevisionLawOne,
          ClaimsLawAB
        >['proofs']
          ? true
          : false,
        EvaluatedGate<GateLawA, RevisionLawTwo, ClaimsLawAB>['proofs'] extends EvaluatedGate<
          GateLawA,
          RevisionLawOne,
          ClaimsLawAB
        >['proofs']
          ? true
          : false,
      ],
      [true, true, false, false]
    >
  >
>;

/**
 * Proof is bound to the exact rule, not to the check's name.
 *
 * A gate keeps its `GateId` across edits — that is what makes it the same check.
 * The revision does not, and the proofs are threaded from it, so an edited rule
 * cannot inherit the demonstration of the rule it replaced. Line three is the
 * anti-vacuity partner for the definition dropping the parameter.
 */
export type ProofIsBoundToTheExactRule = Assert<
  IsExactlyTrue<
    Equal<
      [
        EvaluatedGate<GateLawA, GateRevisionId<'r1'>> extends EvaluatedGate<
          GateLawA,
          GateRevisionId<'r2'>
        >
          ? true
          : false,
        EvaluatedGate<GateLawA, GateRevisionId<'r1'>> extends EvaluatedGate<
          GateLawA,
          GateRevisionId<'r1'>
        >
          ? true
          : false,
        EvaluatedGate<GateLawA> extends EvaluatedGate<GateLawA, GateRevisionId<'r1'>> ? true : false,
        Equal<
          GateDefinition<GateLawA, GateRevisionId<'r1'>>['revision'],
          GateRevisionReference<GateRevisionId<'r1'>>
        >,
        Equal<CaseOf<DemonstrationOutcome<ClassLawA>, 'demonstrated'>['demonstration'], ClaimDemonstration<ClassLawA>>,
      ],
      [false, true, false, true, true]
    >
  >
>;

/**
 * No standing consequence lives on a check or on what it reports.
 *
 * A definition used to declare itself blocking for all time, and a finding
 * carried a copy of that declaration. Both are gone: consequence belongs to the
 * invocation. The names are checked explicitly because this is exactly how the
 * boundary re-erodes — one convenience member at a time, each individually
 * reasonable — and because `severity` is the obvious next spelling.
 */
export type NoStandingConsequenceLivesOnACheckOrItsFindings = Assert<
  Equal<
    [
      'disposition' extends keyof GateDefinition ? true : false,
      'severity' extends keyof GateDefinition ? true : false,
      'blocking' extends keyof GateDefinition ? true : false,
      'disposition' extends keyof Finding ? true : false,
      'severity' extends keyof Finding ? true : false,
      Equal<CheckConsequence, 'required' | 'informational'>,
      Equal<PlannedCheck['consequence'], CheckConsequence>,
    ],
    [false, false, false, false, false, true, true]
  >
>;

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
 * One gate identity, with where the check came from as a member.
 *
 * `ConsumerGateId` was a second brand over the same carrier, so
 * `GateDefinition<Id extends GateId>` could not be instantiated with one. The
 * promise that consumer gates travel the same path as repository gates was not
 * weakly enforced — it was impossible, and the type that existed to make
 * extension first-class was the thing preventing it.
 *
 * This law is deliberately modest about what it proves. Lines one through three
 * pin that origin is a required member of the one definition with exactly two
 * arms; line four is the anti-vacuity partner, since a member typed `string`
 * would satisfy a looser check. Nothing here can assert the *absence* of a
 * second identity brand — a type system has no way to say "no such declaration
 * exists elsewhere". That is a sole-ownership question, it belongs to the
 * repository audit, and the README carries it as an obligation rather than this
 * file pretending otherwise.
 *
 * Origin is a member and not a type parameter on purpose. Two definitions from
 * different origins are the same type travelling the same path, which is the
 * entire point; if it were a parameter, "the same path" would be two paths
 * again with better manners.
 */
export type OneGateIdentityWithOriginOnTheDefinition = Assert<
  IsExactlyTrue<
    Equal<
      [
        'origin' extends keyof GateDefinition ? true : false,
        Equal<GateDefinition['origin'], GateOrigin>,
        Equal<GateOrigin, 'repository' | 'consumer'>,
        string extends GateDefinition['origin'] ? true : false,
        undefined extends GateDefinition['origin'] ? true : false,
      ],
      [true, true, true, false, false]
    >
  >
>;

/**
 * A demonstration requires all four roles, in named slots.
 *
 * Lines one through four are the roles. Line five is the one that makes the
 * arrangement worth anything: each slot is pinned to its own role literal, so a
 * product carrying four baselines is not assignable — which a
 * `NonEmptyTuple<DemonstrationWitness>` would happily be, and which the retired
 * `witnesses` array was.
 *
 * Lines six and seven pin the outcomes the roles are allowed to have observed.
 * A `detection` witness reporting that the check was *satisfied* is the exact
 * shape of a self-test that passes with the guard removed, which is the defect
 * this whole apparatus exists for.
 */
export type ADemonstrationRequiresAllFourRoles = Assert<
  IsExactlyTrue<
    Equal<
      [
        'baseline' extends keyof ClaimDemonstration ? true : false,
        'lawful' extends keyof ClaimDemonstration ? true : false,
        'detection' extends keyof ClaimDemonstration ? true : false,
        'attribution' extends keyof ClaimDemonstration ? true : false,
        DemonstrationWitness<'baseline'> extends ClaimDemonstration['detection'] ? true : false,
        Equal<ClaimDemonstration['detection']['observed'], CaseOf<GateOutcome, 'refuted'>>,
        Equal<ClaimDemonstration['baseline']['observed'], CaseOf<GateOutcome, 'satisfied'>>,
      ],
      [true, true, true, true, false, true, true]
    >
  >
>;

/**
 * Attribution names the relationship it attributes a refusal to.
 *
 * Without `relationship`, an attribution witness is a witness that the check
 * went red, which every syntax error and unresolved import also produces. Line
 * three is the anti-vacuity partner: the `attribution` slot must actually carry
 * the payload, and lines four and five confirm the other roles do not — a shape
 * where every role carried an `AttributedRefusal` would satisfy the first two
 * lines while meaning nothing.
 */
export type AttributionNamesTheRelationshipItClaims = Assert<
  IsExactlyTrue<
    Equal<
      [
        'relationship' extends keyof AttributedRefusal ? true : false,
        Equal<AttributedRefusal['relationship'], AssurancePredicate>,
        Equal<ClaimDemonstration['attribution']['attribution'], AttributedRefusal>,
        Equal<ClaimDemonstration['baseline']['attribution'], Record<never, never>>,
        Equal<ClaimDemonstration['detection']['attribution'], Record<never, never>>,
      ],
      [true, true, true, true, true]
    >
  >
>;

/**
 * Untested is an absence, not an arm.
 *
 * The retired `GateQualification` was `untested | qualified | refuted` — one
 * algebra mixing "has anybody looked" with "what did they find", which made a
 * maturity badge that rode on every evaluation. Core's `Evidence` already
 * separates those: not acquired, acquired and came out one way or the other,
 * acquisition itself broke.
 *
 * Line three is the correction to the correction. Deleting the qualification
 * algebra outright would have lost the distinction between *nobody tested this*
 * and *this was tested and did not notice*, which is the more dangerous state
 * and the one worth acting on. It survives as `disproven`, in the outcome, where
 * it is evidence rather than status.
 *
 * Line five keeps the two subjects apart by name. `GateOutcome.refuted` means
 * the check found the repository wanting; `disproven` means the check was found
 * wanting. One word for both would be the vocabulary collapsing at exactly the
 * point it matters.
 */
export type UntestedIsAnAbsenceRatherThanAnArm = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<DemonstrationOutcome>, 'demonstrated' | 'disproven'>,
        'untested' extends TagOf<DemonstrationOutcome> ? true : false,
        'disproven' extends TagOf<DemonstrationOutcome> ? true : false,
        Equal<TagOf<Evidence<DemonstrationOutcome>>, 'unavailable' | 'pending' | 'ready' | 'failed'>,
        'refuted' extends TagOf<DemonstrationOutcome> ? true : false,
        [DemonstratedProof] extends [never] ? true : false,
        Equal<DemonstratedProof['value'], CaseOf<DemonstrationOutcome, 'demonstrated'>>,
      ],
      [true, false, true, true, false, false, true]
    >
  >
>;

/**
 * A specimen is not a repository snapshot.
 *
 * Two brands, mutually unassignable, checked in both directions. The single
 * coordinate that meant both would make "this check was demonstrated" and "this
 * check was run on your code" the same claim, and a demonstration would have
 * been able to present itself as an evaluation.
 */
export type ASpecimenIsNotARepositorySnapshot = Assert<
  IsExactlyTrue<
    Equal<
      [
        SpecimenReference extends WorkspaceSnapshotReference ? true : false,
        WorkspaceSnapshotReference extends SpecimenReference ? true : false,
        Equal<DemonstrationWitness['specimen'], SpecimenReference>,
        'snapshot' extends keyof DemonstrationWitness ? true : false,
      ],
      [false, false, true, false]
    >
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
  readonly origin: GateOrigin;
  readonly definition: GateDefinition;
  readonly plannedCheck: PlannedCheck;
  readonly spec: AssuranceRunSpec;
  readonly evaluated: EvaluatedGate;
  readonly demonstrated: DemonstratedGate;
  readonly profile: EvidenceProfile;
  readonly consequence: CheckConsequence;
  readonly scope: GateScope;
  readonly revision: GateRevisionReference;
  readonly specimen: SpecimenReference;
  readonly witness: DemonstrationWitness;
  readonly demonstration: ClaimDemonstration;
  readonly proof: DemonstrationOutcome;
  readonly outcome: GateOutcome;
  readonly finding: Finding;
  readonly degradation: AssuranceDegradation;
}
