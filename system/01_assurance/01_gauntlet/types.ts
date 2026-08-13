/**
 * Gauntlet: evidence evaluation and earned authority.
 *
 * Gauntlet reads facts and produces findings, verdicts, and the authority a
 * release is allowed to consume. It acquires nothing: no compiler lane, no
 * filesystem, no source control appears in this file, which is why it can run
 * anywhere the audit product can be shipped.
 *
 * One idea from the deleted harness survives here, and only one. Five hundred
 * and seventy-one mutation scripts and a bespoke runner were an
 * implementation, and implementations are quarry. The durable relation they
 * were reaching for is that **a gate cannot earn authority until evidence
 * shows it detects the failure class it claims**, because this repository has
 * repeatedly written guards that pass with the guard removed. The umbrella
 * carries that as `GateQualification` and `DetectionWitness`; this home is
 * where a definition binds its claim to its evaluation.
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
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Evidence } from '../../../00_core/06_evidence/types.js';
import type { WorkspaceSnapshotId, WorkspaceSnapshotReference } from '../../00_workspace/types.js';
import type {
  AssuranceAuthority,
  AssuranceDegradation,
  AssuranceFactName,
  AssuranceProposition,
  Finding,
  FailureClassReference,
  GateId,
  GateOutcome,
  GateQualification,
  GateReference,
  GateScope,
} from '../types.js';

// ---------------------------------------------------------------------------
// Evidence profiles
// ---------------------------------------------------------------------------

/**
 * How much evidence a run had available.
 *
 * `lean` is a pre-commit or editor context where the compiler lane is not
 * worth paying for; `rich` is a full audit. The distinction is declared rather
 * than inferred so that a gate needing rich evidence under a lean run resolves
 * to indeterminate — visible, and blocking if its disposition says so —
 * instead of silently not running. Silently not running is how a checked
 * repository becomes an unchecked one without anybody deciding to.
 */
export type EvidenceProfile = 'lean' | 'rich';

// ---------------------------------------------------------------------------
// Gate definitions
// ---------------------------------------------------------------------------

/**
 * One gate: what it covers, what it reads, what it concludes, and what it
 * claims to catch.
 *
 * `reads` is non-empty because a gate with no inputs decides nothing and
 * cannot fail — the pure form of the vacuity this repository keeps rediscovering
 * in its own laws.
 *
 * `claims` is non-empty because qualification compares a claim to a witness. A
 * gate that claims nothing can never be refuted, which makes it permanently
 * unqualifiable rather than trivially trustworthy.
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
export interface GateDefinition<Id extends GateId = GateId> {
  readonly gate: GateReference<Id>;
  readonly scope: GateScope;
  readonly reads: NonEmptyTuple<AssuranceFactName>;
  readonly proposition: AssuranceProposition;
  readonly claims: NonEmptyTuple<FailureClassReference>;
  readonly requires: EvidenceProfile;
}

/**
 * One gate evaluated against one snapshot.
 *
 * The facts actually read are recorded beside the outcome, so a conclusion can
 * be traced to its inputs rather than believed. `Evidence` is retained rather
 * than unwrapped: a gate that concluded from an unavailable fact is a
 * different event than one that concluded from a present one.
 */
export interface GateEvaluation<Id extends GateId = GateId> {
  readonly definition: GateDefinition<Id>;
  readonly outcome: GateOutcome;
  readonly read: readonly { readonly fact: AssuranceFactName; readonly value: Evidence<ContentAddress> }[];
  readonly qualification: GateQualification;
}

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

/** One entry in a run spec: which check, and what this run does with it. */
export interface PlannedCheck<Id extends GateId = GateId> {
  readonly gate: GateReference<Id>;
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

/**
 * An evaluation whose outcome is pinned to the satisfied arm.
 *
 * `Refine` rejects a change that narrows nothing, so this cannot decay into an
 * alias for the evaluation it constrains; a law below also pins that it did not
 * resolve to `never`.
 */
export type SatisfiedEvaluation<Id extends GateId = GateId> = Refine<
  GateEvaluation<Id>,
  { readonly outcome: CaseOf<GateOutcome, 'satisfied'> }
>;

/** An evaluation that did not satisfy: refuted, or unable to resolve. */
export type UnsatisfiedEvaluation<Id extends GateId = GateId> = Refine<
  GateEvaluation<Id>,
  { readonly outcome: Exclude<GateOutcome, CaseOf<GateOutcome, 'satisfied'>> }
>;

/**
 * One evaluation per planned check, positionally, each about that check's gate.
 *
 * A homomorphic mapping over a tuple preserves arity, so a spec naming three
 * checks admits exactly three evaluations — not two, not four, and not five
 * evaluations of the same gate, which a bare `readonly GateEvaluation[]` and
 * even a `NonEmptyTuple` both admit. The per-position `infer` is what makes it
 * the *right* three: position two carries an evaluation of the gate named at
 * position two.
 */
export type PlannedEvaluations<Checks extends NonEmptyTuple<PlannedCheck>> = {
  readonly [Position in keyof Checks]: Checks[Position] extends PlannedCheck<infer Id>
    ? GateEvaluation<Id>
    : never;
};

/**
 * The same correspondence, with every *required* position pinned to satisfied.
 *
 * This is what makes `passed` mean something. A run that requested three checks,
 * required two of them, and reports a passing result must carry satisfied
 * evaluations in exactly those two positions; the informational position may
 * carry any honest outcome, including one that could not resolve.
 *
 * When the consequence is not a literal — the broad `AssuranceRunSpec`, where
 * `consequence` is the whole union — no position is pinned. That is the correct
 * permissiveness and not a hole: the broad spec is the case where nobody has
 * said yet what this run requires, and a type should not invent the answer.
 */
export type SatisfiedPlannedEvaluations<Checks extends NonEmptyTuple<PlannedCheck>> = {
  readonly [Position in keyof Checks]: Checks[Position] extends PlannedCheck<infer Id>
    ? Checks[Position]['consequence'] extends 'required'
      ? SatisfiedEvaluation<Id>
      : GateEvaluation<Id>
    : never;
};

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

/**
 * The conclusion of one gauntlet run.
 *
 * `blocked` carries the evaluations that blocked, so a refusal names its
 * causes and cannot be a bare exit code. There is no arm meaning "passed with
 * known problems": a blocking gate that refuted or could not resolve produces
 * `blocked`, and advisory findings ride along inside `passed` where they
 * belong.
 */
export type GauntletVerdict = Algebra<{
  passed: { readonly advisories: readonly Finding[] };
  blocked: { readonly blocking: NonEmptyTuple<GateEvaluation>; readonly diagnostics: readonly Diagnostic[] };
}>;

/**
 * The one addressed product of one evaluation over one exact snapshot.
 *
 * This replaces two. `GauntletRun` and `AssuranceReceipt` both carried the
 * snapshot, the evaluation population, verdict-shaped information, and the
 * authority — two products of one act, obliged to agree, with nothing making
 * them. That obligation was written in prose and enforced by nobody, which is
 * the shape this repository keeps deleting.
 *
 * Authority lives in the `passed` arm and only there. It is not a member that
 * happens to be `unearned` when things went badly; a blocked run has no
 * authority to carry, and saying so structurally is what stops a consumer
 * reading the member and asking politely whether it is earned.
 *
 * Both arms carry the exact snapshot, so a result cannot be quoted about a
 * revision it never saw.
 *
 * Both arms also carry the exact spec, for the same reason and against a
 * different failure. Without it, a result is a claim that *some* checks passed
 * over this revision, and an editor run with one informational check produces a
 * technically passing result indistinguishable from a release run. The spec is
 * carried whole rather than as a reference because the evaluation population is
 * derived from its check population: `evaluations` is one entry per planned
 * check, positionally, so "nothing ran" cannot arrive downstream as "nothing
 * failed" — which was previously representable, because `evaluations` was an
 * array that could be empty.
 *
 * `unsatisfied` on the blocked arm replaces `blocking`. Nothing blocks any more;
 * a required check was not satisfied and the run says which, and the consequence
 * of that belongs to whoever asked.
 */
export type AssuranceResult<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = Algebra<{
  passed: {
    readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
    readonly spec: Spec;
    readonly evaluations: SatisfiedPlannedEvaluations<Spec['checks']>;
    readonly advisories: readonly Finding[];
    readonly degradation: AssuranceDegradation;
    readonly authority: CaseOf<AssuranceAuthority<Snapshot>, 'earned'>;
    readonly address: ContentAddress<'application/vnd.liteship.assurance-result+cbor'>;
  };
  blocked: {
    readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
    readonly spec: Spec;
    readonly evaluations: PlannedEvaluations<Spec['checks']>;
    readonly unsatisfied: NonEmptyTuple<UnsatisfiedEvaluation>;
    readonly degradation: AssuranceDegradation;
    readonly diagnostics: readonly Diagnostic[];
    readonly address: ContentAddress<'application/vnd.liteship.assurance-result+cbor'>;
  };
}>;

/** Identity of a consumer-supplied gate, so extension uses the same path. */
export type ConsumerGateId<Name extends string = string> = Brand<Name, 'liteship.consumer-gate-id'>;

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

/**
 * A verdict is passed or blocked, with nothing in between.
 *
 * The absent third arm is the law. `passed-with-warnings` is the shape that
 * turns a blocking gate into a suggestion over time, and its absence is
 * checked rather than described.
 */
export type AVerdictHasNoMiddleArm = Assert<
  Equal<
    [
      Equal<TagOf<GauntletVerdict>, 'passed' | 'blocked'>,
      'passed-with-warnings' extends TagOf<GauntletVerdict> ? true : false,
      'degraded' extends TagOf<GauntletVerdict> ? true : false,
      Equal<CaseOf<GauntletVerdict, 'blocked'>['blocking'], NonEmptyTuple<GateEvaluation>>,
    ],
    [true, false, false, true]
  >
>;

/**
 * A gate definition is exact over its identity.
 *
 * The third line is the anti-vacuity partner: without it the law passes when
 * the evaluation stops threading the parameter through, which is the erasure
 * defect the host layer paid four folds to close.
 */
export type AGateDefinitionIsExactOverItsIdentity = Assert<
  Equal<
    [
      GateDefinition<GateId<'a'>> extends GateDefinition<GateId<'b'>> ? true : false,
      GateDefinition<GateId<'a'>> extends GateDefinition<GateId<'a'>> ? true : false,
      GateEvaluation<GateId<'a'>> extends GateEvaluation<GateId<'b'>> ? true : false,
      GateEvaluation extends GateEvaluation<GateId<'a'>> ? true : false,
    ],
    [false, true, false, false]
  >
>;

type GateLawA = GateId<'law.gate.a'>;
type GateLawB = GateId<'law.gate.b'>;
type SnapshotLawA = WorkspaceSnapshotId<'law.snapshot.a'>;
type RequiredCheckA = Refine<PlannedCheck<GateLawA>, { readonly consequence: 'required' }>;
type InformationalCheckB = Refine<PlannedCheck<GateLawB>, { readonly consequence: 'informational' }>;
type SpecLawA = AssuranceRunSpec<AssuranceRunSpecId<'law.spec.a'>, readonly [RequiredCheckA]>;
type SpecLawB = AssuranceRunSpec<AssuranceRunSpecId<'law.spec.b'>, readonly [RequiredCheckA]>;

/**
 * A result carries one evaluation per planned check, positionally.
 *
 * Line one is the correspondence and doubles as the anti-vacuity guard, since a
 * mapping that degenerated to `never` would not equal a written tuple. Lines two
 * through four are what the previous `readonly GateEvaluation[]` admitted and
 * this does not: a result with fewer evaluations than the spec requested, a
 * result that ran the same gate twice instead of the two that were asked for,
 * and an unbounded population that says only that something happened.
 */
export type AResultCarriesOneEvaluationPerPlannedCheck = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          PlannedEvaluations<readonly [PlannedCheck<GateLawA>, PlannedCheck<GateLawB>]>,
          readonly [GateEvaluation<GateLawA>, GateEvaluation<GateLawB>]
        >,
        readonly [GateEvaluation<GateLawA>] extends PlannedEvaluations<
          readonly [PlannedCheck<GateLawA>, PlannedCheck<GateLawB>]
        >
          ? true
          : false,
        readonly [GateEvaluation<GateLawA>, GateEvaluation<GateLawA>] extends PlannedEvaluations<
          readonly [PlannedCheck<GateLawA>, PlannedCheck<GateLawB>]
        >
          ? true
          : false,
        readonly GateEvaluation[] extends PlannedEvaluations<
          readonly [PlannedCheck<GateLawA>, PlannedCheck<GateLawB>]
        >
          ? true
          : false,
      ],
      [true, false, false, false]
    >
  >
>;

/**
 * A passing result satisfied every check the run required.
 *
 * Line one pins the mapping: the required position narrows to a satisfied
 * evaluation, the informational position does not. Line two is the refusal that
 * makes `passed` mean anything — an evaluation that merely exists cannot occupy
 * a required slot. Line three is the lawful control, without which the law would
 * be satisfied by a shape nobody can build.
 *
 * Lines four and five are not decoration. `Refine` resolves to `never` for a
 * change that narrows nothing, `never` is assignable everywhere, and a
 * `SatisfiedEvaluation` that had quietly become `never` would make line two
 * false for the wrong reason while every other assertion here still passed.
 */
export type APassingResultSatisfiesEveryRequiredCheck = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          SatisfiedPlannedEvaluations<readonly [RequiredCheckA, InformationalCheckB]>,
          readonly [SatisfiedEvaluation<GateLawA>, GateEvaluation<GateLawB>]
        >,
        readonly [GateEvaluation<GateLawA>, GateEvaluation<GateLawB>] extends
          SatisfiedPlannedEvaluations<readonly [RequiredCheckA, InformationalCheckB]>
          ? true
          : false,
        readonly [SatisfiedEvaluation<GateLawA>, GateEvaluation<GateLawB>] extends
          SatisfiedPlannedEvaluations<readonly [RequiredCheckA, InformationalCheckB]>
          ? true
          : false,
        [SatisfiedEvaluation] extends [never] ? true : false,
        [UnsatisfiedEvaluation] extends [never] ? true : false,
      ],
      [true, false, true, false, false]
    >
  >
>;

/**
 * A result is exact over the specification it ran, not only over the snapshot.
 *
 * Without this axis a result says that *some* checks passed over this revision,
 * and an editor invocation with one informational check produces a technically
 * passing result that is assignable everywhere a release-grade one is. Line
 * three is the anti-vacuity partner for the carrier dropping the parameter.
 */
export type AnAssuranceResultIsExactOverItsSpecification = Assert<
  IsExactlyTrue<
    Equal<
      [
        AssuranceResult<SnapshotLawA, SpecLawA> extends AssuranceResult<SnapshotLawA, SpecLawB>
          ? true
          : false,
        AssuranceResult<SnapshotLawA, SpecLawA> extends AssuranceResult<SnapshotLawA, SpecLawA>
          ? true
          : false,
        AssuranceResult<SnapshotLawA> extends AssuranceResult<SnapshotLawA, SpecLawA> ? true : false,
        Equal<CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'passed'>['spec'], SpecLawA>,
      ],
      [false, true, false, true]
    >
  >
>;

/**
 * The result actually carries the planned population, in both arms.
 *
 * This law exists because the previous three did not do the job they appeared to
 * do. They proved `PlannedEvaluations` and `SatisfiedPlannedEvaluations` behave
 * correctly *as operators*, in isolation — and measured, widening
 * `AssuranceResult.passed.evaluations` back to `readonly GateEvaluation[]`
 * compiled clean with all three still green. An operator proved away from its
 * consumer is the same defect as a value proved away from its carrier, and this
 * repository has now committed that twice in two days.
 *
 * So the expected tuples are written out concretely and pinned against the arms
 * themselves. Lines two and four are the widenings that were possible: an
 * unbounded array of evaluations in either arm, which is "something ran" wearing
 * the shape of "what was requested ran".
 */
export type TheResultCarriesThePlannedPopulation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'passed'>['evaluations'],
          readonly [SatisfiedEvaluation<GateLawA>]
        >,
        readonly GateEvaluation[] extends CaseOf<
          AssuranceResult<SnapshotLawA, SpecLawA>,
          'passed'
        >['evaluations']
          ? true
          : false,
        Equal<
          CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'blocked'>['evaluations'],
          readonly [GateEvaluation<GateLawA>]
        >,
        readonly GateEvaluation[] extends CaseOf<
          AssuranceResult<SnapshotLawA, SpecLawA>,
          'blocked'
        >['evaluations']
          ? true
          : false,
        Equal<
          CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'blocked'>['unsatisfied'],
          NonEmptyTuple<UnsatisfiedEvaluation>
        >,
      ],
      [true, false, true, false, true]
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
 * Gauntlet acquires nothing.
 *
 * A run carries no surface, no graph, no probe, and no interpreter. If any of
 * these appears the split has collapsed and the heaviest dependency in the
 * repository has followed evaluation everywhere it goes.
 */
export type AnAssuranceResultAcquiresNothing = Assert<
  Equal<
    [
      'surfaces' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'graph' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'probes' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'interpreter' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'files' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
    ],
    [false, false, false, false, false]
  >
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the assurance topology. */
export interface GauntletTypeSurface {
  readonly definition: GateDefinition;
  readonly evaluation: GateEvaluation;
  readonly profile: EvidenceProfile;
  readonly consequence: CheckConsequence;
  readonly plannedCheck: PlannedCheck;
  readonly spec: AssuranceRunSpec;
  readonly verdict: GauntletVerdict;
  readonly result: AssuranceResult;
  readonly consumerGate: ConsumerGateId;
}
