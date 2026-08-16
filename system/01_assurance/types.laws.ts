/**
 * The assurance child topology.
 *
 * `types.ts` is the shared assurance vocabulary and it is upstream of both
 * children: `00_audit` and `01_gauntlet` import `GateDefinition`,
 * `PlannedCheck`, `EvaluatedGate`, and the rest from it. An umbrella that
 * imports them back to name their surfaces closes a source-authority cycle,
 * which is the regression `02_targets` and `02_wires` each recorded fixing.
 * A file nobody imports may hold what neither of them can.
 *
 * What lived in `types.ts` instead was `AssuranceChildRoster`, a tuple of two
 * strings. It asserted that two children exist and could not tell whether they
 * did — delete either child's `types.ts` and the umbrella compiled clean.
 * `02_wires/README.md` describes rejecting exactly that shape, and the layer
 * whose entire subject is detecting whether the repository is what it claims
 * to be was the last one still carrying it.
 *
 * This file declares no assurance semantics. Both surfaces below are the real
 * ones, imported from the homes that own them. It emits no JavaScript and
 * exports no value.
 *
 * @module
 */

import type {
  Assert,
  CaseOf,
  Equal,
  IsExactlyTrue,
  Named,
  NonEmptyTuple,
  TagOf,
  Tuple,
} from '../../types.js';
import type { Diagnostic, RemediationAction } from '../../00_core/00_error/types.js';
import type { Decision, Evidence, Proposition, Truth } from '../../00_core/06_evidence/types.js';
import type { WorkspaceSnapshotReference } from '../00_workspace/types.js';
import type {
  AssuranceDecision,
  AssurancePredicate,
  AssuranceProposition,
  AssuranceSubject,
  AttributedRefusal,
  CheckConsequence,
  ClaimDemonstration,
  ClaimProofs,
  DemonstratedClaimProofs,
  DemonstratedGate,
  DemonstratedProof,
  DemonstrationOutcome,
  DemonstrationWitness,
  EvaluatedGate,
  FailureClassId,
  FailureClassReference,
  Finding,
  GateDefinition,
  GateId,
  GateOrigin,
  GateOutcome,
  GateRevisionId,
  GateRevisionReference,
  GateScope,
  PlannedCheck,
  SpecimenReference,
} from './types.js';
import type { AuditTypeSurface } from './00_audit/types.js';
import type { GauntletTypeSurface } from './01_gauntlet/types.js';

/** One assurance child, named beside the surface it exports. */
export interface AssuranceTypeChild<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/**
 * The assurance children, each named beside the real surface it exports.
 *
 * Audit acquires; gauntlet evaluates. They are separate because their
 * dependencies and costs are, not because separation is tidy — acquisition
 * needs a compiler lane and a filesystem, evaluation needs neither and can run
 * wherever the facts are shipped. A third child would be an edit somebody makes
 * on purpose rather than a folder that appears because a need did, and now the
 * compiler is the thing that says so.
 */
export type AssuranceTypeTopology = Tuple<
  [
    AssuranceTypeChild<'00_audit', AuditTypeSurface>,
    AssuranceTypeChild<'01_gauntlet', GauntletTypeSurface>,
  ]
>;

/** The child names, derived from the topology. */
export type AssuranceChildName = AssuranceTypeTopology[number]['name'];

/** Select one child surface by its name. */
export type AssuranceTypeAt<Name extends AssuranceChildName> = Extract<
  AssuranceTypeTopology[number],
  { readonly name: Name }
>['Type'];

/**
 * Compile-time law: every entry names its own child's surface.
 *
 * Naming the surface is what gives the population teeth — deleting a child
 * breaks the import, so the topology cannot outlive what it names. The
 * mis-wired entry is the likelier defect of the two: a child is deleted
 * deliberately and loudly, while an entry is copy-pasted and edited in one of
 * its two positions while the next one is being added.
 *
 * The right-hand side is written independently of the topology, so this
 * compares rather than restates, and the last line pins the population so a
 * child added here and nowhere else fails rather than passing unexamined.
 */
export type EachAssuranceEntryNamesItsOwnChildsSurface = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<AssuranceTypeAt<'00_audit'>, AuditTypeSurface>,
        Equal<AssuranceTypeAt<'01_gauntlet'>, GauntletTypeSurface>,
        Equal<AssuranceChildName, '00_audit' | '01_gauntlet'>,
      ],
      [true, true, true]
    >
  >
>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * A gate claims something, and does not declare what it reads.
 *
 * The first two lines are what survives of a law that also pinned `reads`.
 * Widening the claim population to a plain array admits the empty case, and a
 * gate that claims nothing can never be disproven — indistinguishable from a
 * gate that cannot fail, which is the state every vacuous law in this repository
 * has been in.
 *
 * Lines three and four are the subtraction, checked by name because that is how
 * it would come back: `reads` had zero consumers and sat opposite
 * `AcquiredFact.consumers`, the same relationship written twice and read never.
 * The proposition is the one declaration of what a check reasons about.
 */
export type AGateClaimsDetectionAndDeclaresNoReads = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<GateDefinition['claims'], NonEmptyTuple<FailureClassReference>>,
        readonly FailureClassReference[] extends GateDefinition['claims'] ? true : false,
        'reads' extends keyof GateDefinition ? true : false,
        'facts' extends keyof GateDefinition ? true : false,
        Equal<GateDefinition['proposition'], AssuranceProposition>,
      ],
      [true, false, false, false, true]
    >
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
 * `'pending'` is not assignable into it. Line three is the anti-vacuity
 * partner: without it, the law would still pass if `satisfied` were widened to
 * the full `Truth` union, because `'true'` remains assignable to `Truth`.
 */
export type PendingNeverPassesAGate = Assert<
  Equal<
    [
      Equal<CaseOf<GateOutcome, 'satisfied'>['decision']['truth'], 'true'>,
      'pending' extends CaseOf<GateOutcome, 'satisfied'>['decision']['truth'] ? true : false,
      Truth extends CaseOf<GateOutcome, 'satisfied'>['decision']['truth'] ? true : false,
      Equal<CaseOf<GateOutcome, 'indeterminate'>['decision']['truth'], 'pending'>,
      Equal<TagOf<GateOutcome>, 'satisfied' | 'refuted' | 'indeterminate'>,
    ],
    [true, false, false, true, true]
  >
>;


/**
 * A finding restates nothing the evaluation carrying it already owns.
 *
 * A finding lives inside one evaluation, so the gate is that evaluation's gate
 * and the outcome is that evaluation's outcome. Carrying copies would let a
 * finding disagree with the evaluation containing it — a parallel roster in
 * miniature, and the third one this commit removes.
 *
 * All four absences are checked by name, because each is one plausible-looking
 * edit away: `gate` and `outcome` read as helpful denormalization, `disposition`
 * and `severity` read as reporting convenience. Lines five through seven pin
 * what a finding does own, so this is a subtraction rather than a shape nobody
 * has looked at.
 */
export type AFindingRestatesNothingItsEvaluationOwns = Assert<
  IsExactlyTrue<
    Equal<
      [
        'gate' extends keyof Finding ? true : false,
        'outcome' extends keyof Finding ? true : false,
        'disposition' extends keyof Finding ? true : false,
        'severity' extends keyof Finding ? true : false,
        Equal<Finding['subject'], AssuranceSubject>,
        Equal<Finding['diagnostics'], readonly Diagnostic[]>,
        Equal<Finding['remediation'], readonly RemediationAction[]>,
      ],
      [false, false, false, false, true, true, true]
    >
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
        Equal<TagOf<Evidence<DemonstrationOutcome>>, 'unavailable' | 'outstanding' | 'ready' | 'failed'>,
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
