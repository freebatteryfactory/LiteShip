/**
 * Compile-time laws for `00_core/14_compiler`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type {
  Address,
  Assert,
  Binding,
  CaseOf,
  Equal,
  FailureOf,
  Hole,
  HoleContract,
  IsExactlyTrue,
  IsNever,
  NonEmptyTuple,
  OutputOf,
  RequirementsOf,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { ContentAddress } from '../01_encoding/types.js';
import type { CommitId, RevisionReference, SemanticLocation } from '../02_identity/types.js';
import type { SchemaReference } from '../03_schema/types.js';
import type { OwnedResource } from '../05_lifecycle/types.js';
import type { EvidenceRealm } from '../06_evidence/types.js';
import type {
  Artifact,
  ArtifactId,
  ArtifactReference,
  ClosedRealizationPlan,
  CompileOutcome,
  CompilerTypeSurface,
  ExecutionBackend,
  GroundingReference,
  IncompleteState,
  InvocationSlotId,
  MigrationAdapter,
  MigrationAdapterCatalog,
  MigrationAdapterOutcome,
  MigrationAuthority,
  MigrationAuthorityRequirement,
  MigrationFailure,
  MigrationMeaningPopulation,
  MigrationProduct,
  MigrationReport,
  MigrationRequest,
  MigrationSource,
  MigrationSourceCoordinate,
  MigrationSourceFormatId,
  NonEmptyRequirementRow,
  OptimizationObjective,
  PlacementConstraint,
  PreparationDisposition,
  PreparedWork,
  ProjectionTargetId,
  ProjectionTargetReference,
  RealizationCandidate,
  RealizationCandidateReference,
  RealizationCatalogAddress,
  RealizationDecision,
  RealizationFailure,
  RealizationInstance,
  RealizationInstanceId,
  RealizationInstanceReference,
  RealizationLifecycle,
  RealizationOffer,
  RealizationOfferDescriptor,
  RealizationPlan,
  RealizationRejection,
  RealizationSelectionReason,
  RealizationStep,
  RealizationStepReference,
  RequirementClosure,
  RequirementId,
  RequirementSatisfaction,
  RequirementSatisfier,
  RuntimeFeatureDefinition,
  SelectedGrounding,
  SettlementCandidate,
  SettlementCandidateReference,
  SettlementDecision,
  SettlementReason,
  SourceMapReference,
  SourceRelation,
  SpeculativeCandidate,
  StepInputBinding,
  UnsatisfiabilityProof,
} from './types.js';

/** Compile-time law: an empty residual row cannot claim that runtime is required. */
export type EmptyRequirementClosureHasNoRuntime = Assert<
  Equal<RequirementClosure<readonly [], readonly []>['runtimeRequired'], false>
>;


/**
 * Compile-time law: the other half of the bundle invariant. An inhabited
 * non-empty residual row cannot claim that no runtime is needed. Without this
 * witness, a closure whose `runtimeRequired` collapsed to a constant `false`
 * would pass the empty-row law and every other law while shipping nothing for
 * requirements that exist — "empty means static" defended, "non-empty means
 * runtime" running on architectural vibes.
 */
export type ANonEmptyResidualDemandRequiresARuntime = Assert<
  Equal<
    RequirementClosure<
      readonly [ExampleDomRequirement],
      readonly [ExampleDomRequirement]
    >['runtimeRequired'],
    true
  >
>;



type ExampleDomRequirement = Hole<'liteship.example.dom', { readonly apply: (value: unknown) => void }>;

type ExampleDomFeature = RuntimeFeatureDefinition<readonly [ExampleDomRequirement]>;


/** Compile-time law: feature requirements are derived from exact Hole names. */
export type RuntimeFeaturePreservesRequirementIdentity = Assert<
  Equal<ExampleDomFeature['requirements'], readonly [RequirementId<'liteship.example.dom'>]>
>;


// ---------------------------------------------------------------------------
// Realization laws
//
// These test the declaration boundary, where exact rows still exist. Claims
// about the erased catalog, canonical import provenance, monotone fixed-point
// completeness, grounded-cycle detection, and cost accounting are proof
// obligations for assurance and implementation, not type laws. A law that
// cannot fail is not a law.
// ---------------------------------------------------------------------------

type ExampleStoreRequirement = Hole<'liteship.example.store', { readonly read: () => void }>;

type ExampleDeviceRequirement = Hole<'liteship.example.device', { readonly open: () => void }>;


/**
 * Distributes over a union: `true` for any member carrying the key — at any
 * type — otherwise `false`. Key-absence laws use this instead of matching an
 * expected field type, because a forbidden key smuggled in at type `unknown`
 * is exactly as forbidden as one at the expected type.
 */
type AnyArmCarriesKey<Value, Key extends PropertyKey> = Value extends unknown
  ? Key extends keyof Value
    ? true
    : false
  : never;


type ExampleProvides = readonly [ExampleStoreRequirement, ExampleDeviceRequirement];

type ExampleRequires = readonly [ExampleDomRequirement];

type ExampleOffer = RealizationOffer<ExampleProvides, ExampleRequires>;


/** Compile-time law: a provided row must name at least one capability. */
export type ProvidedRowsExcludeTheEmptyRow = Assert<
  Equal<readonly [] extends NonEmptyRequirementRow ? true : false, false>
>;


/** Compile-time law: an offer cannot provide the same authority twice. */
export type OfferWithADuplicateProvidedRowIsUninhabitable = Assert<
  IsNever<RealizationOffer<readonly [ExampleStoreRequirement, ExampleStoreRequirement]>['provides']>
>;


/** Compile-time law: an offer cannot declare the same prerequisite twice. */
export type OfferWithADuplicatePrerequisiteIsUninhabitable = Assert<
  IsNever<
    RealizationOffer<ExampleProvides, readonly [ExampleDomRequirement, ExampleDomRequirement]>['requires']
  >
>;


/** Compile-time law: the factory yields an instance of exactly what it provides. */
export type OfferFactoryProducesItsProvidedAuthorities = Assert<
  Equal<OutputOf<ExampleOffer['factory']>, RealizationInstance<ExampleProvides>>
>;


/** Compile-time law: the factory consumes exactly the declared prerequisites. */
export type OfferFactoryConsumesItsExactPrerequisites = Assert<
  Equal<RequirementsOf<ExampleOffer['factory']>, ExampleRequires>
>;


/**
 * Compile-time law: the construction channel carries materialization failure,
 * never a pre-candidate rejection. Rejection explains why nothing lawful
 * existed; failure explains why something lawful did not survive contact.
 */
export type OfferFactoryFailsWithMaterializationFailure = Assert<
  Equal<FailureOf<ExampleOffer['factory']>, RealizationFailure>
>;


type SmuggledCauseOffer = RealizationOffer<ExampleProvides, ExampleRequires, unknown, RealizationRejection>;


/**
 * Compile-time law: even when a declaration names `RealizationRejection` as its
 * cause, the failure channel remains `RealizationFailure` — rejection can ride
 * inside an arm as a payload, but it can never replace the algebra itself. The
 * earlier shape of this offer had a freely substitutable `Failure` parameter,
 * under which this law's left side collapsed to bare `RealizationRejection`.
 */
export type RejectionCannotReplaceTheFailureChannel = Assert<
  Equal<FailureOf<SmuggledCauseOffer['factory']>, RealizationFailure<RealizationRejection>>
>;


/** Compile-time law: an instance carries one exact binding per provided hole. */
export type InstanceBindingsAreOneBindingPerProvidedHole = Assert<
  Equal<
    RealizationInstance<ExampleProvides>['bindings'],
    readonly [Binding<ExampleStoreRequirement>, Binding<ExampleDeviceRequirement>]
  >
>;


/** Compile-time law: a duplicated provided row cannot produce bindings. */
export type InstanceRejectsADuplicateProvidedRow = Assert<
  IsNever<RealizationInstance<readonly [ExampleStoreRequirement, ExampleStoreRequirement]>['bindings']>
>;


type OwnedExampleOffer = RealizationOffer<ExampleProvides, ExampleRequires, unknown, unknown, 'owned'>;


/**
 * Compile-time law: an offer declaring an owned materialization has a factory
 * whose instance carries the owned lifecycle arm — directly disposable — and a
 * materialization stamped with the same arm. The predecessor of this law
 * compared the materialization tag union against itself and never mentioned
 * `RealizationInstance` at all, which made its name a promise the fixture
 * did not keep.
 */
export type AnOwnedOfferYieldsAnOwnedInstance = Assert<
  Equal<OutputOf<OwnedExampleOffer['factory']>['lifecycle'], CaseOf<RealizationLifecycle, 'owned'>>
>;


/**
 * Compile-time law: ownership is not hidden behind a detached `resource`
 * wrapper. The lifecycle arm itself is the `OwnedResource` every consumer can
 * dispose, while the lawful unowned neighbour exposes no disposal operation.
 */
export type AnOwnedLifecycleIsDirectlyDisposable = Assert<
  Equal<
    [
      CaseOf<RealizationLifecycle, 'owned'> extends OwnedResource ? true : false,
      'dispose' extends keyof CaseOf<RealizationLifecycle, 'owned'> ? true : false,
      'resource' extends keyof CaseOf<RealizationLifecycle, 'owned'> ? true : false,
      'dispose' extends keyof CaseOf<RealizationLifecycle, 'unowned'> ? true : false,
    ],
    [true, true, false, false]
  >
>;


/** Compile-time law: the instance's materialization shares its lifecycle arm. */
export type AnInstanceMaterializationSharesItsLifecycleArm = Assert<
  Equal<RealizationInstance<ExampleProvides, 'owned'>['materialization']['lifecycle'], 'owned'>
>;


/** Compile-time law: an unowned instance carries no ceremonial owned resource. */
export type AnUnownedInstanceCarriesNoOwnedResource = Assert<
  Equal<
    'resource' extends keyof RealizationInstance<ExampleProvides, 'unowned'>['lifecycle'] ? true : false,
    false
  >
>;


/**
 * Compile-time law: the provider is the counted thing. An instance names its
 * own identity and the planned step that created it, so dispose-exactly-once
 * and count-cost-once have a unit that survives applying one offer twice.
 */
export type AnInstanceCarriesProviderAndStepIdentity = Assert<
  Equal<
    [RealizationInstance['id'], RealizationInstance['step']],
    [RealizationInstanceId, RealizationStepReference]
  >
>;


/**
 * Compile-time law: a satisfaction carries the satisfier algebra, so a
 * requirement discharged by an admitted root has a real satisfaction edge and
 * one discharged by construction names its step. The predecessor of this law
 * spoke only in steps, under which a directly grounded requirement could not
 * be satisfied at all.
 */
export type ASatisfactionCarriesItsSelectedSatisfier = Assert<
  Equal<RequirementSatisfaction['satisfier'], RequirementSatisfier>
>;


/** Compile-time law: a grounded satisfier names a selected slot, not a bare name. */
export type AGroundedSatisfierNamesASelectedSlot = Assert<
  Equal<CaseOf<RequirementSatisfier, 'grounded'>['grounding'], GroundingReference>
>;


/** Compile-time law: a realized satisfier names a planned step, never a recipe. */
export type ARealizedSatisfierNamesAPlannedStep = Assert<
  Equal<CaseOf<RequirementSatisfier, 'realized'>['step'], RealizationStepReference>
>;


/** Compile-time law: construction order is an order over planned steps. */
export type ConstructionOrderIsAnOrderOfSteps = Assert<
  Equal<RealizationPlan['constructionOrder'], readonly RealizationStepReference[]>
>;


/** Compile-time law: a step records how its offer input is bound. */
export type AStepRecordsHowItsInputIsBound = Assert<
  Equal<RealizationStep['input'], StepInputBinding>
>;


/** Compile-time law: plan-bound configuration is content-addressed; a slot is named. */
export type StepInputsAreAddressedOrExplicitlySlotted = Assert<
  Equal<
    [CaseOf<StepInputBinding, 'configured'>['input'], CaseOf<StepInputBinding, 'invocation'>['slot']],
    [ContentAddress<'application/vnd.liteship.step-input+cbor'>, InvocationSlotId]
  >
>;


/** Compile-time law: an offer descriptor pins the exact catalog facts. */
export type AnOfferDescriptorPinsItsCatalogFacts = Assert<
  Equal<
    [
      RealizationOfferDescriptor['provides'],
      RealizationOfferDescriptor['realms'],
      RealizationOfferDescriptor['backends'],
      RealizationOfferDescriptor['inputBinding'],
    ],
    [
      NonEmptyTuple<RequirementId>,
      NonEmptyTuple<EvidenceRealm>,
      NonEmptyTuple<ExecutionBackend>,
      TagOf<StepInputBinding>,
    ]
  >
>;


/**
 * Compile-time law: a plan's selected roots bind their admitted inputs — a
 * slot reference plus which bootstrap input fulfills it, never a bag of bare
 * names and never a selection with no supplied value to admit.
 */
export type SelectedGroundingsBindTheirAdmittedInputs = Assert<
  Equal<
    [RealizationPlan['selectedGroundings'], SelectedGrounding['input']],
    [readonly SelectedGrounding[], StepInputBinding]
  >
>;


/** Compile-time law: step and grounding inputs carry their decode contracts. */
export type BoundInputsCarryTheirContracts = Assert<
  Equal<
    [
      CaseOf<StepInputBinding, 'configured'>['contract'],
      CaseOf<StepInputBinding, 'invocation'>['contract'],
    ],
    [SchemaReference, SchemaReference]
  >
>;


/** Compile-time law: prepared work is revision-pinned, owned, and disposable. */
export type PreparedWorkIsPinnedAndDisposable = Assert<
  Equal<
    [PreparedWork['revision'], PreparedWork['lifecycle'], TagOf<PreparationDisposition>],
    [RevisionReference, CaseOf<RealizationLifecycle, 'owned'>, 'committed' | 'discarded' | 'invalidated']
  >
>;


/** Compile-time law: committed preparation names the exact commit that consumed it. */
export type CommittedPreparationNamesItsCommit = Assert<
  Equal<CaseOf<PreparationDisposition, 'committed'>['commit'], CommitId>
>;


/** Compile-time law: the owner surface exposes the speculation vocabulary. */
export type TheSurfaceReachesSpeculation = Assert<
  Equal<
    [
      CompilerTypeSurface['speculativeCandidate'],
      CompilerTypeSurface['preparedWork'],
      CompilerTypeSurface['preparationDisposition'],
    ],
    [SpeculativeCandidate, PreparedWork, PreparationDisposition]
  >
>;


/**
 * Compile-time law: a failure names the planned application that failed, and
 * no arm carries an `offer` key at any type — two failures from two
 * applications of one offer must stay distinguishable, and the recipe may not
 * sneak back in under a widened type the old extract-based fixture would have
 * ignored.
 */
export type AFailureNamesTheApplicationNotTheRecipe = Assert<
  Equal<
    [
      RealizationFailure extends { readonly step: RealizationStepReference } ? true : false,
      AnyArmCarriesKey<RealizationFailure, 'offer'>,
    ],
    [true, false]
  >
>;


/**
 * Compile-time law: withdrawal and disposal can only happen to a live
 * provider, so those arms name the instance that was actually withdrawn or
 * disposed.
 */
export type PostInstanceFailuresNameTheLiveProvider = Assert<
  Equal<
    [
      CaseOf<RealizationFailure, 'provider-withdrawn'>['instance'],
      CaseOf<RealizationFailure, 'disposal-failed'>['instance'],
    ],
    [RealizationInstanceReference, RealizationInstanceReference]
  >
>;


/**
 * Compile-time law: construction-phase failures carry no `instance` key at
 * any type — no instance existed yet to be named, and a ghost at type
 * `unknown` is exactly as ghostly as one at the reference type.
 */
export type PreInstanceFailuresCarryNoProviderGhost = Assert<
  Equal<
    AnyArmCarriesKey<
      | CaseOf<RealizationFailure, 'initialization-failed'>
      | CaseOf<RealizationFailure, 'acquisition-failed'>
      | CaseOf<RealizationFailure, 'permission-denied'>,
      'instance'
    >,
    false
  >
>;


/**
 * Compile-time law: the per-unit settlement roster lives inside the addressed
 * plan whose closure those choices created. Backend selection introduces real
 * prerequisites, so the cause is committed by the same address as the result.
 */
export type APlanOwnsItsSettlementDecisions = Assert<
  Equal<RealizationPlan['settlement'], readonly SettlementDecision[]>
>;


/** Compile-time law: a closed plan has driven its branch worklist to empty. */
export type AClosedPlanHasNoUnresolvedRequirements = Assert<
  Equal<ClosedRealizationPlan['unresolved'], readonly []>
>;


/** Compile-time law: only a closed plan reaches cost comparison. */
export type OnlyAClosedPlanIsCosted = Assert<
  Equal<RealizationCandidate['plan'], ClosedRealizationPlan>
>;


/**
 * Compile-time law: neither refusal arm carries any production authority —
 * no artifacts, no realization decision, no candidate, and no settlement
 * roster, under the current names or the retired one, at any type. The
 * predecessor of this law checked only the retired `settlement` spelling,
 * which proved an old field stayed gone while the live authority could leak
 * through `decision` or `candidate` unchallenged.
 */
export type RefusalOutcomesCarryNoProductionAuthority = Assert<
  Equal<
    AnyArmCarriesKey<
      CaseOf<CompileOutcome, 'unsatisfiable'> | CaseOf<CompileOutcome, 'incomplete'>,
      'artifacts' | 'decision' | 'candidate' | 'settlement'
    >,
    false
  >
>;


/**
 * Compile-time law: a planned outcome carries no settlement roster beside the
 * plan. The choices live inside the addressed plan they created, so a sibling
 * roster cannot select different backends while the plan's closure stays
 * structurally valid.
 */
export type SettlementLivesInsideThePlanNotBesideIt = Assert<
  Equal<'settlement' extends keyof CaseOf<CompileOutcome, 'planned'> ? true : false, false>
>;


/**
 * Compile-time law: shipping a plan is an explained decision, not one
 * unexplained candidate. The roster is non-empty, the choice is a candidate
 * reference, and the reason is structured.
 */
export type APlannedOutcomeExplainsItsSelection = Assert<
  Equal<
    [
      CaseOf<CompileOutcome, 'planned'>['decision'],
      RealizationDecision['candidates'],
      RealizationDecision['selected'],
      RealizationDecision['reason'],
    ],
    [
      RealizationDecision,
      NonEmptyTuple<RealizationCandidate>,
      RealizationCandidateReference,
      RealizationSelectionReason,
    ]
  >
>;


/**
 * Compile-time law: the retired single-candidate shortcut stays retired. A
 * planned outcome may not regrow a `candidate` field beside its decision.
 */
export type ThePlannedArmCarriesNoUnexplainedCandidate = Assert<
  Equal<AnyArmCarriesKey<CaseOf<CompileOutcome, 'planned'>, 'candidate'>, false>
>;


/**
 * Compile-time law: the deprecated `grounded` name stays retired from plans.
 * It conflated declared, selected, and admitted; its successor is
 * `selectedGroundings`, and the old key may not return beside it.
 */
export type TheDeprecatedGroundedNameStaysRetiredFromPlans = Assert<
  Equal<AnyArmCarriesKey<RealizationPlan, 'grounded'>, false>
>;


/**
 * Compile-time law: `only-lawful` explains through rejections and cannot name
 * refuted alternatives as lawful candidate references — a rejected branch
 * never became a candidate.
 */
export type OnlyLawfulExplainsThroughRejectionsNotPhantomCandidates = Assert<
  Equal<
    [
      CaseOf<RealizationSelectionReason, 'only-lawful'>['rejections'],
      AnyArmCarriesKey<CaseOf<RealizationSelectionReason, 'only-lawful'>, 'eliminated'>,
    ],
    [readonly RealizationRejection[], false]
  >
>;


/**
 * Compile-time law: the optimization objective has exactly one owner per
 * altitude — the `lowest-cost` reason arm. Neither decision product carries a
 * second copy, and no other reason arm at either altitude may grow one.
 */
export type TheObjectiveLivesOnlyInTheLowestCostReason = Assert<
  Equal<
    [
      AnyArmCarriesKey<RealizationDecision, 'objective'>,
      AnyArmCarriesKey<SettlementDecision, 'objective'>,
      AnyArmCarriesKey<
        Exclude<RealizationSelectionReason, CaseOf<RealizationSelectionReason, 'lowest-cost'>>,
        'objective'
      >,
      AnyArmCarriesKey<Exclude<SettlementReason, CaseOf<SettlementReason, 'lowest-cost'>>, 'objective'>,
      CaseOf<RealizationSelectionReason, 'lowest-cost'>['objective'],
      CaseOf<SettlementReason, 'lowest-cost'>['objective'],
    ],
    [false, false, false, false, OptimizationObjective, OptimizationObjective]
  >
>;


/**
 * Compile-time law: a per-unit decision is fully typed — its subject is a
 * semantic location, its roster is non-empty, its choice is a candidate
 * reference, and its reason is the settlement algebra. The global decision
 * has its comprehensive law; its per-unit sibling gets the same defense
 * rather than polite expectation.
 */
export type AUnitDecisionNamesSubjectRosterChoiceAndReason = Assert<
  Equal<
    [
      SettlementDecision['subject'],
      SettlementDecision['candidates'],
      SettlementDecision['selected'],
      SettlementDecision['reason'],
    ],
    [SemanticLocation, NonEmptyTuple<SettlementCandidate>, SettlementCandidateReference, SettlementReason]
  >
>;


/**
 * Compile-time law: a lowest-cost settlement selects from a non-empty lawful
 * frontier. A unit with no lawful candidate produces no decision at all — the
 * compilation lands in a refusal outcome instead.
 */
export type AUnitParetoFrontierIsNeverEmpty = Assert<
  Equal<
    CaseOf<SettlementReason, 'lowest-cost'>['paretoFront'],
    NonEmptyTuple<SettlementCandidateReference>
  >
>;


/**
 * Compile-time law: `only-legal` explains through violated constraints and
 * cannot regrow an `eliminated` candidate key at any type — a refuted
 * alternative never became a lawful candidate.
 */
export type OnlyLegalExplainsThroughViolatedConstraints = Assert<
  Equal<
    [
      CaseOf<SettlementReason, 'only-legal'>['violated'],
      AnyArmCarriesKey<CaseOf<SettlementReason, 'only-legal'>, 'eliminated'>,
    ],
    [readonly PlacementConstraint[], false]
  >
>;


/**
 * Compile-time law: no selection reason at either altitude carries a fallback
 * arm. Every failure phase already has its own home — rejection, incomplete,
 * the outer `Result`, or `RealizationFailure` — and a runtime fallback would
 * be a new decision under replanning, never a retroactive selection reason.
 * The predecessor of this law guarded only the per-unit algebra while its
 * global sibling stood unlocked.
 */
export type NoSelectionReasonHasAFallbackArm = Assert<
  Equal<
    'fallback' extends TagOf<RealizationSelectionReason> | TagOf<SettlementReason> ? true : false,
    false
  >
>;


/**
 * Compile-time law: the global lowest-cost frontier is non-empty, exactly as
 * the per-unit frontier is. A lowest-cost decision cannot select from an
 * empty lawful frontier; a compilation with no lawful candidate is a refusal.
 */
export type AGlobalParetoFrontierIsNeverEmpty = Assert<
  Equal<
    CaseOf<RealizationSelectionReason, 'lowest-cost'>['paretoFront'],
    NonEmptyTuple<RealizationCandidateReference>
  >
>;


/**
 * Compile-time law: a plan commits to its exact ancestry — the compilation
 * revision it closes and the content-addressed catalog whose definitions it
 * planned against. Persistent IDs are not exact-definition evidence.
 */
export type APlanCommitsToItsExactAncestry = Assert<
  Equal<
    [RealizationPlan['source'], RealizationPlan['catalog']],
    [RevisionReference, RealizationCatalogAddress]
  >
>;


/** Compile-time law: both refusal arms commit to the exact catalog they judged. */
export type RefusalOutcomesCommitToTheirCatalog = Assert<
  Equal<
    [
      CaseOf<CompileOutcome, 'unsatisfiable'>['catalog'],
      CaseOf<CompileOutcome, 'incomplete'>['catalog'],
    ],
    [RealizationCatalogAddress, RealizationCatalogAddress]
  >
>;


/** Compile-time law: claiming no plan exists requires a proof. */
export type AnUnsatisfiableOutcomeCarriesItsProof = Assert<
  Equal<CaseOf<CompileOutcome, 'unsatisfiable'>['proof'], UnsatisfiabilityProof>
>;


/**
 * Compile-time law: a bounded analysis may not claim unsatisfiability. It
 * reports the bound it reached instead.
 */
export type AnIncompleteOutcomeCarriesNoUnsatisfiabilityProof = Assert<
  Equal<'proof' extends keyof CaseOf<CompileOutcome, 'incomplete'> ? true : false, false>
>;


/** Compile-time law: a bounded analysis names arm-specific stopping state. */
export type AnIncompleteOutcomeCarriesArmSpecificState = Assert<
  Equal<CaseOf<CompileOutcome, 'incomplete'>['state'], IncompleteState>
>;


/** Compile-time law: search exhaustion leaves genuinely unresolved work. */
export type SearchExhaustionCarriesItsUnresolvedWork = Assert<
  Equal<CaseOf<IncompleteState, 'search-exhausted'>['unresolved'], NonEmptyTuple<RequirementId>>
>;


/**
 * Compile-time law: a Pareto stop reports closed lawful candidates and cannot
 * be forced to invent an unresolved requirement that does not exist.
 */
export type ParetoExhaustionReportsClosedCandidatesNotInventedWork = Assert<
  Equal<
    [
      CaseOf<IncompleteState, 'pareto-exhausted'>['frontier'],
      'unresolved' extends keyof CaseOf<IncompleteState, 'pareto-exhausted'> ? true : false,
    ],
    [NonEmptyTuple<RealizationCandidateReference>, false]
  >
>;


/** Compile-time law: an unavailable oracle carries no unrelated Pareto frontier. */
export type AnUnavailableOracleCarriesNoFrontier = Assert<
  Equal<'frontier' extends keyof CaseOf<IncompleteState, 'oracle-unavailable'> ? true : false, false>
>;


// ---------------------------------------------------------------------------
// Artifact exactness and source truth
// ---------------------------------------------------------------------------

type ArtifactLawA = ArtifactId<'law.artifact.a'>;

type ArtifactLawB = ArtifactId<'law.artifact.b'>;

type ProjectionLawA = ProjectionTargetId<'law.projection.a'>;

type ProjectionLawB = ProjectionTargetId<'law.projection.b'>;

type ArtifactRevisionLawA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
>;

type ArtifactRevisionLawB = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
>;

type ExactArtifactA = Artifact<ArtifactLawA, ProjectionLawA, ArtifactRevisionLawA>;


/** Compile-time law: an artifact reference is exact over the artifact it names. */
export type AnArtifactReferenceIsExactOverItsArtifact = Assert<
  Equal<
    [
      ArtifactReference<ArtifactLawA> extends ArtifactReference<ArtifactLawB> ? true : false,
      ArtifactReference<ArtifactLawA> extends ArtifactReference<ArtifactLawA> ? true : false,
    ],
    [false, true]
  >
>;


/** Compile-time law: an artifact is exact over identity, projection target, and source revision. */
export type AnArtifactIsExactOverItsThreeAxes = Assert<
  Equal<
    [ExactArtifactA['id'], ExactArtifactA['target'], ExactArtifactA['relation']],
    [ArtifactLawA, ProjectionTargetReference<ProjectionLawA>, SourceRelation<ArtifactRevisionLawA>]
  >
>;


/**
 * Compile-time law: differing on any one axis produces an artifact that cannot
 * stand in for the original. Field presence with the right broad brand is not
 * correlation.
 */
export type ExactArtifactsAreNotInterchangeable = Assert<
  Equal<
    [
      ExactArtifactA extends Artifact<ArtifactLawB, ProjectionLawA, ArtifactRevisionLawA> ? true : false,
      ExactArtifactA extends Artifact<ArtifactLawA, ProjectionLawB, ArtifactRevisionLawA> ? true : false,
      ExactArtifactA extends Artifact<ArtifactLawA, ProjectionLawA, ArtifactRevisionLawB> ? true : false,
    ],
    [false, false, false]
  >
>;


/**
 * Compile-time law: the broad form stays inhabited by exact families.
 *
 * One compilation legitimately yields artifacts of many identities, and
 * `CompileOutcome` carries them as an erased catalog. Removing the defaults to
 * force exactness everywhere would make that population unrepresentable, so
 * this law guards the repair from its own overcorrection.
 */
export type ABroadArtifactCatalogAdmitsExactFamilies = Assert<
  Equal<
    [
      ExactArtifactA extends Artifact ? true : false,
      Artifact<ArtifactLawB, ProjectionLawB, ArtifactRevisionLawB> extends Artifact ? true : false,
    ],
    [true, true]
  >
>;


/**
 * Compile-time law: an artifact carries exactly one source authority.
 *
 * The relation is required, and neither the retired optional map nor a sibling
 * source field may return. Two source facts would need a law forcing them to
 * agree, which is the duplication this correction removes.
 */
export type AnArtifactCarriesOneSourceAuthority = Assert<
  Equal<
    [
      'relation' extends keyof Artifact ? true : false,
      'sourceMap' extends keyof Artifact ? true : false,
      'source' extends keyof Artifact ? true : false,
      undefined extends Artifact['relation'] ? true : false,
    ],
    [true, false, false, false]
  >
>;


/** Compile-time law: every arm commits to the exact revision it was authored from. */
export type EverySourceRelationArmCommitsToItsRevision = Assert<
  Equal<
    [
      CaseOf<SourceRelation<ArtifactRevisionLawA>, 'identity-preserving'>['source'],
      CaseOf<SourceRelation<ArtifactRevisionLawA>, 'mapped'>['source'],
      CaseOf<SourceRelation<ArtifactRevisionLawA>, 'deliberately-unmappable'>['source'],
    ],
    [
      RevisionReference<ArtifactRevisionLawA>,
      RevisionReference<ArtifactRevisionLawA>,
      RevisionReference<ArtifactRevisionLawA>,
    ]
  >
>;


/** Compile-time law: an identity-preserving relation carries no map. */
export type AnIdentityPreservingRelationCarriesNoMap = Assert<
  Equal<'map' extends keyof CaseOf<SourceRelation, 'identity-preserving'> ? true : false, false>
>;


/**
 * Compile-time law: a mapped relation requires a source-map reference.
 *
 * The slot is a semantic reference kind, not a bare content address. Any
 * addressed bytes would satisfy a broad address structurally -- a proof
 * artifact, an image, a manifest -- and the relation would typecheck while
 * pointing at something that cannot map anything.
 */
export type AMappedRelationRequiresAnAddressedSourceMap = Assert<
  Equal<CaseOf<SourceRelation, 'mapped'>['map'], SourceMapReference>
>;


/** Compile-time law: a deliberately-unmappable relation carries no map. */
export type AnUnmappableRelationCarriesNoMap = Assert<
  Equal<'map' extends keyof CaseOf<SourceRelation, 'deliberately-unmappable'> ? true : false, false>
>;


/**
 * Compile-time law: refusing to map requires saying what cannot be recovered.
 *
 * A possibly-empty list would let "deliberately unmappable, no reason" mean the
 * same thing as having lost the relationship, which is the ambiguity the
 * optional field had.
 */
export type AnUnmappableRelationRequiresItsLimitations = Assert<
  Equal<CaseOf<SourceRelation, 'deliberately-unmappable'>['limitations'], NonEmptyTuple<Diagnostic>>
>;

type MigrationLawFormatA = MigrationSourceFormatId<'law.migration.format.a'>;
type MigrationLawFormatB = MigrationSourceFormatId<'law.migration.format.b'>;

export type AnAdapterCarriesLossBesideItsProductAndCannotFailSilently = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          OutputOf<MigrationAdapter<MigrationLawFormatA, string, number>['migrate']>,
          MigrationAdapterOutcome<number>
        >,
        Equal<FailureOf<MigrationAdapter['migrate']>, NonEmptyTuple<Diagnostic>>,
        MigrationAdapter<MigrationLawFormatA> extends MigrationAdapter<MigrationLawFormatB>
          ? true
          : false,
        MigrationAdapter extends MigrationAdapter<MigrationLawFormatA> ? true : false,
        Equal<MigrationProduct['diagnostics'], readonly Diagnostic[]>,
        Equal<TagOf<MigrationAdapterOutcome>, 'admitted' | 'rejected'>,
      ],
      [true, true, false, false, true, true]
    >
  >
>;

export type InlineSourceBecomesAddressedBeforeExecutionEvidence = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<MigrationSource>, 'artifact' | 'inline'>,
        'address' extends keyof CaseOf<MigrationSource, 'inline'> ? true : false,
        'address' extends keyof CaseOf<MigrationSourceCoordinate, 'inline'> ? true : false,
        'profile' extends keyof CaseOf<MigrationSourceCoordinate, 'artifact'> ? true : false,
        'definition' extends keyof MigrationRequest['adapter'] ? true : false,
      ],
      [true, false, true, true, true]
    >
  >
>;

export type TheCatalogAndFailurePopulationCannotBeEmpty = Assert<
  IsExactlyTrue<
    Equal<
      [
        MigrationAdapterCatalog['adapters'] extends NonEmptyTuple<MigrationAdapter> ? true : false,
        MigrationFailure extends { readonly diagnostics: NonEmptyTuple<Diagnostic> } ? true : false,
        Equal<
          TagOf<MigrationFailure>,
          | 'unknown-adapter'
          | 'ambiguous-discovery'
          | 'unsupported-source-profile'
          | 'source-admission-refused'
          | 'source-canonicalization-failed'
          | 'adapter-execution-failed'
          | 'output-admission-failed'
          | 'provenance-failed'
        >,
        Equal<HoleContract<MigrationAuthorityRequirement>, MigrationAuthority>,
      ],
      [true, true, true, true]
    >
  >
>;

export type AReportDistinguishesLawfulEmptyMeaningFromNoProduct = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<MigrationReport>, 'admitted' | 'rejected'>,
        Equal<TagOf<MigrationMeaningPopulation>, 'empty' | 'populated'>,
        CaseOf<MigrationMeaningPopulation, 'populated'>['members'] extends NonEmptyTuple<ContentAddress>
          ? true
          : false,
        'bundle' extends keyof CaseOf<MigrationReport, 'rejected'> ? true : false,
        'proposedApplication' extends keyof CaseOf<MigrationReport, 'admitted'> ? true : false,
        'receipt' extends keyof CaseOf<MigrationReport, 'admitted'> ? true : false,
      ],
      [true, true, true, false, true, false]
    >
  >
>;
