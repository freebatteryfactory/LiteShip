/**
 * Assurance: the shared vocabulary for claims about the repository itself.
 *
 * This home exists for exactly the facts TypeScript's assignability cannot
 * decide. The compiler cannot tell you which directory declared a structurally
 * identical type, whether an authority was imported from its canonical owner or
 * copied inline, whether a target imported a sibling, or whether a gate would
 * have noticed the defect it claims to guard. Those are real questions and they
 * needed a home. They did not need a second reality: for a while they had one,
 * its own executable control plane at the repository root, outside every census.
 *
 * The governing constraint on this file is therefore subtraction. Assurance
 * declares only what has no owner upstream:
 *
 * - `Proposition<Atom>` is already generic in `00_core/06_evidence`, so
 *   assurance contributes an atom and reuses the algebra rather than writing a
 *   second logic.
 * - `Decision<Subject, Failure>` is already generic there too, so assurance
 *   supplies a subject and reuses the resolution shape.
 * - `Evidence<Value>` already distinguishes unavailable, outstanding, ready, and
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
  Brand,
  CaseOf,
  NonEmptyTuple,
  Reference,
  Refine,
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
 * expresses: `unavailable` when nobody produced a demonstration, `outstanding`
 * while one runs, `ready` when it came out either way, `failed` when the demonstration
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
 * The result of evaluating one gate, with pending kept out of the pass arm.
 *
 * Each arm pins the decision truth it is allowed to carry. A gate whose
 * evidence was unavailable resolves to `pending` under Strong Kleene, and that
 * cannot be reported as `satisfied` because the intersection makes the shape
 * impossible. Fail-closed is a type here, not a promise in a comment.
 */
export type GateOutcome = Algebra<{
  satisfied: { readonly decision: AssuranceDecision & { readonly truth: 'true' } };
  refuted: { readonly decision: AssuranceDecision & { readonly truth: 'false' } };
  indeterminate: {
    readonly decision: AssuranceDecision & { readonly truth: 'pending' };
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
 * There is no `reads` member. It was a `NonEmptyTuple<AssuranceFactName>`
 * declaring which facts the check consumes, and it had exactly zero consumers:
 * nothing read it but the law asserting it was non-empty. Beside it,
 * `AcquiredFact.consumers` declared the same relationship from the other
 * direction, and `GateEvaluation.read` records what was actually observed —
 * three statements of one relationship, two of them aspirational.
 *
 * The remaining one is the proposition. It already names the facts and subjects
 * the check reasons about; a data-defined check cannot secretly read undeclared
 * evidence, because there is no arbitrary body in which to hide the read. That
 * is the durable idea, and it does not require a type-level extractor to be
 * true — walking the proposition is something an implementation does, and
 * building a recursive `FactNamesOf<Proposition>` before a static consumer needs
 * one would be apparatus arriving ahead of its reason.
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
 *
 * The claim population is named for the same reason one step further out. A
 * revision determines its claims, but nothing at the type level can compute
 * them from a `GateRevisionId` — there is no registry to look them up in. So a
 * plan that names only gate and revision hands every downstream carrier the
 * broad `NonEmptyTuple<FailureClassReference>`, and the correlation between
 * what a check claims and what it proved survives only inside `ClaimProofs`,
 * where no result ever reads it.
 *
 * That is not a second owner of the claim population. The definition owns it;
 * this states what the run requires the named revision to declare, and the
 * evaluation has to satisfy both at once or it does not typecheck. A stated
 * expectation the compiler reconciles is the opposite of a fact written twice
 * and traversed from neither side.
 */
export interface PlannedCheck<
  Id extends GateId = GateId,
  Revision extends GateRevisionId = GateRevisionId,
  Claims extends NonEmptyTuple<FailureClassReference> = NonEmptyTuple<FailureClassReference>,
> {
  readonly gate: GateReference<Id>;
  readonly revision: GateRevisionReference<Revision>;
  readonly claims: Claims;
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
 * One reported conclusion about one subject.
 *
 * It carries no gate, no outcome, and no disposition, and all three absences are
 * the same absence: a finding lives inside the evaluation that produced it, so
 * the gate is the evaluation's gate and the outcome is the evaluation's outcome.
 * Restating them here would let a finding disagree with the evaluation carrying
 * it, which is a parallel roster wearing a smaller hat.
 *
 * What varies within one evaluation is the subject. A check over ninety-seven
 * files produces one outcome and possibly several findings, one per file it has
 * something to say about — so subject, diagnostics, and remediation are what a
 * finding actually owns.
 *
 * Consequence is likewise not here. Whether a conclusion mattered enough to stop
 * an operation is a property of the invocation, and the run specification owns
 * it.
 */
export interface Finding {
  readonly subject: AssuranceSubject;
  readonly diagnostics: readonly Diagnostic[];
  readonly remediation: readonly RemediationAction[];
}

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the root system topology. */
export interface AssuranceTypeSurface {
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
}
