/**
 * Compiler fleet, migration, settlement constraints, requirement realization,
 * cost models, artifacts, and explanations of placement.
 *
 * Hard legality is resolved before cost. The earliest faithful settlement wins;
 * measured backend profiles choose among remaining lawful realizations. Exact
 * typed requirements determine the residual runtime feature closure, so a
 * composition that needs no runtime capability ships no commemorative runtime.
 *
 * @module
 */

import type {
  Address,
  Algebra,
  AnyHole,
  Assert,
  Binding,
  BindingsFor,
  Brand,
  CaseOf,
  Equal,
  FailureOf,
  Hole,
  HoleKey,
  IsNever,
  NonEmptyTuple,
  OutputOf,
  Reference,
  RequirementRow,
  RequirementsOf,
  Result,
  Signature,
  TagOf,
  UniqueRequirements,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { ContentAddress, ContentDigest } from '../01_encoding/types.js';
import type { CommitId, RevisionId, RevisionReference, SemanticLocation } from '../02_identity/types.js';
import type { SchemaId, SchemaReference } from '../03_schema/types.js';
import type { DisposalFailure, OwnedResource } from '../05_lifecycle/types.js';
import type {
  EvidenceAuthority,
  EvidenceLifetime,
  EvidenceRealm,
  EvidenceReference,
} from '../06_evidence/types.js';
import type { PolicyId } from '../07_operation/types.js';

export type CompilerId<Name extends string = string> = Brand<Name, 'liteship.compiler-id'>;
export type MigrationAdapterId<Name extends string = string> = Brand<Name, 'liteship.migration-adapter-id'>;
export type ArtifactId<Name extends string = string> = Brand<Name, 'liteship.artifact-id'>;
export type ProjectionTargetId<Name extends string = string> = Brand<Name, 'liteship.projection-target-id'>;
export type RequirementId<Name extends string = string> = Brand<Name, 'liteship.requirement-id'>;
/** Requirement identity derived from the exact root Hole name. */
export type RequirementIdOf<Value extends AnyHole> = RequirementId<HoleKey<Value>>;
/** Literal-preserving requirement identities derived from a closed row. */
export type RequirementIds<Row extends RequirementRow> = {
  readonly [Index in keyof Row]: Row[Index] extends AnyHole ? RequirementIdOf<Row[Index]> : never;
};
export type RuntimeFeatureId<Name extends string = string> = Brand<Name, 'liteship.runtime-feature-id'>;
export type RealizationOfferId<Name extends string = string> = Brand<Name, 'liteship.realization-offer-id'>;
export type RealizationStepId<Name extends string = string> = Brand<Name, 'liteship.realization-step-id'>;
export type RealizationInstanceId<Name extends string = string> = Brand<Name, 'liteship.realization-instance-id'>;
export type RealizationPlanId<Name extends string = string> = Brand<Name, 'liteship.realization-plan-id'>;
export type SettlementCandidateId<Name extends string = string> = Brand<Name, 'liteship.settlement-candidate-id'>;
export type RealizationCandidateId<Name extends string = string> = Brand<Name, 'liteship.realization-candidate-id'>;
/**
 * Identity of one declared grounding slot: an authority a host boundary can
 * admit rather than construct through an offer. One definition denotes one
 * root slot. The slot identity passes through three states that never share a
 * name: declared in a catalog, selected by a plan, and — only when bootstrap
 * admission succeeds — realized as a live `HostGroundingInstance` with its own
 * provider identity. The planning-facing identity lives here, beside the offer
 * identities, because plans and catalogs must name their roots and imports
 * flow from hosts toward core, never back. The declaration and admission
 * machinery live in `01_hosts`.
 */
export type GroundingId<Name extends string = string> = Brand<Name, 'liteship.grounding-id'>;
export type CompilerReference<Id extends CompilerId = CompilerId> = Reference<'compiler', Id>;
/**
 * Reference to one immutable compiler output.
 *
 * Downstream layers relate artifacts to producers, predecessors, and required
 * slots. Without one canonical alias each of them hand-authors
 * `Reference<'artifact', Id>` and the architecture acquires a family of
 * structurally identical cousins that no law can tell apart.
 */
export type ArtifactReference<Id extends ArtifactId = ArtifactId> = Reference<'artifact', Id>;
export type ProjectionTargetReference<Id extends ProjectionTargetId = ProjectionTargetId> = Reference<'projection-target', Id>;
export type RuntimeFeatureReference<Id extends RuntimeFeatureId = RuntimeFeatureId> = Reference<'runtime-feature', Id>;
export type RealizationOfferReference<Id extends RealizationOfferId = RealizationOfferId> = Reference<
  'realization-offer',
  Id
>;
/** Reference to one planned application of an offer within one plan. */
export type RealizationStepReference<Id extends RealizationStepId = RealizationStepId> = Reference<
  'realization-step',
  Id
>;
/** Reference to one live provider created from a planned step. */
export type RealizationInstanceReference<Id extends RealizationInstanceId = RealizationInstanceId> = Reference<
  'realization-instance',
  Id
>;
/** Reference to one declared grounding slot. */
export type GroundingReference<Id extends GroundingId = GroundingId> = Reference<'grounding', Id>;
export type RealizationPlanReference<Id extends RealizationPlanId = RealizationPlanId> = Reference<
  'realization-plan',
  Id
>;
/** Reference to one location/backend alternative for a single semantic unit. */
export type SettlementCandidateReference<Id extends SettlementCandidateId = SettlementCandidateId> = Reference<
  'settlement-candidate',
  Id
>;
/** Reference to one lawful costed closed plan for the whole compilation. */
export type RealizationCandidateReference<Id extends RealizationCandidateId = RealizationCandidateId> = Reference<
  'realization-candidate',
  Id
>;
export type BackendProfileAddress = ContentAddress<'application/vnd.liteship.backend-profile+cbor'>;
export type RuntimeFeatureSetAddress = ContentAddress<'application/vnd.liteship.runtime-feature-set+cbor'>;
/**
 * Content address of the exact realization catalog — every offer and grounding
 * descriptor — that gave a plan's references their meaning. Persistent offer
 * and grounding IDs name continuing things; this address names the exact
 * revisions planned against, so the same plan bytes cannot be reinterpreted
 * under a silently revised catalog.
 */
export type RealizationCatalogAddress = ContentAddress<'application/vnd.liteship.realization-catalog+cbor'>;

export type SettlementLocation = 'build' | 'platform' | 'request' | 'local' | 'live' | 'remote';
export type ExecutionBackend = 'html-css' | 'javascript' | 'wasm' | 'worker' | 'webgpu' | 'server' | 'host-native';

/**
 * Hard legality constraints.
 *
 * `realm` consumes `06_evidence`'s `EvidenceRealm` rather than restating the
 * union. A constraint says whether a choice is lawful; it does not carry the
 * exact requirements that choosing a backend introduces. Those arrive through
 * the selected offer's prerequisite row and participate in branch closure.
 */
export type PlacementConstraint = Algebra<{
  realm: { readonly allowed: readonly EvidenceRealm[] };
  authority: { readonly minimum: EvidenceAuthority };
  evidence: { readonly sources: readonly EvidenceReference[] };
  lifecycle: { readonly maximum: EvidenceLifetime };
  security: { readonly policy: PolicyId };
  capability: { readonly requirement: RequirementId };
  egress: { readonly target: ProjectionTargetReference };
  fidelity: { readonly exact: boolean; readonly invertible?: boolean; readonly tolerance?: number };
  budget: { readonly metric: CostMetric; readonly maximum: number };
}>;

/** Multi-dimensional measured cost. */
export interface CostVector {
  readonly shippedBytes?: number;
  readonly startupMilliseconds?: number;
  readonly executionNanoseconds?: number;
  readonly transferBytes?: number;
  readonly bridgeNanoseconds?: number;
  readonly memoryBytes?: number;
  readonly synchronizationNanoseconds?: number;
  readonly energyEstimate?: number;
  readonly readbackBytes?: number;
}

export type CostMetric = keyof CostVector;

/** One hard budget applied before optimization. */
export interface CostBudget {
  readonly metric: CostMetric;
  readonly maximum: number;
}

/**
 * Explicit optimization objective. Priorities are lexicographic after illegal
 * and Pareto-dominated candidates are removed; no hidden universal score exists.
 */
export interface OptimizationObjective {
  readonly budgets: readonly CostBudget[];
  readonly priorities: NonEmptyTuple<CostMetric>;
}

/** Content-addressed measurements for one backend and workload class. */
export interface BackendProfile {
  readonly address: BackendProfileAddress;
  readonly backend: ExecutionBackend;
  readonly workload: string;
  readonly environment: string;
  readonly sampleCount: number;
  readonly costs: CostVector;
}

/** A closed requirement row that must name at least one capability. */
export type NonEmptyRequirementRow = readonly [AnyHole, ...AnyHole[]];

/** Closed non-empty requirement row for one materialized runtime feature. */
export type RuntimeFeatureRequirementRow = NonEmptyRequirementRow;

/** One runtime feature and the exact capabilities that cause it to materialize. */
export interface RuntimeFeatureDefinition<
  Requirements extends RuntimeFeatureRequirementRow = RuntimeFeatureRequirementRow,
> {
  readonly id: RuntimeFeatureId;
  readonly requirements: RequirementIds<Requirements>;
  readonly artifacts: readonly ProjectionTargetReference[];
  readonly dependencies: readonly RuntimeFeatureReference[];
  readonly address: ContentAddress<'application/vnd.liteship.runtime-feature+cbor'>;
}

/**
 * What discharged one demanded requirement.
 *
 * A residual requirement is satisfied either by an admitted grounding — an
 * authority the host boundary already held — or by one planned application of
 * an offer. Without the grounded arm, a directly grounded requirement would
 * have no satisfaction edge: the root would exist, the plan would exist, and
 * the relationship between them would be implied rather than represented.
 *
 * `grounded` names a declared grounding slot this plan selected — see
 * `RealizationPlan.selectedGroundings` — whose admission the host bootstrap
 * fulfills at activation. `realized` names one planned step, never a recipe:
 * one plan may apply the same offer twice, and those applications must stay
 * distinguishable, or "count the provider once" and "dispose it once" have no
 * unit to count by.
 */
export type RequirementSatisfier = Algebra<{
  grounded: { readonly grounding: GroundingReference };
  realized: { readonly step: RealizationStepReference };
}>;

/**
 * One demanded requirement and the selected satisfier that discharges it.
 *
 * This is deliberately not a requirement-to-feature mapping. Satisfaction and
 * materialization are separate relations: one satisfier may discharge several
 * demanded requirements atomically, and a selected step materializes a
 * physical closure larger than the requirements that caused it to be chosen.
 * Incidental provision never gains a satisfaction entry: only demanded
 * requirements appear here.
 *
 * That every requirement in the residual demand has exactly one selected
 * satisfier, that every named satisfier is among the plan's selected roots and
 * steps, and that no residual requirement silently disappears between demand
 * and closure are erased-roster claims proved by `system/assurance` and
 * implementation fixtures, not by shape.
 */
export interface RequirementSatisfaction<Requirement extends RequirementId = RequirementId> {
  readonly requirement: Requirement;
  readonly satisfier: RequirementSatisfier;
}

/**
 * The complete physical closure introduced by selecting one offer application.
 *
 * Every inseparable byte, feature, resource, and initialization cost counts,
 * including capabilities the offer provides incidentally. Incidental provision
 * never becomes semantic demand and is never exposed to a consumer that did not
 * declare the corresponding hole, but it is not free and is not erased here.
 *
 * The lifecycle arm is carried as a type parameter so that a declared
 * materialization, its factory output, and the resulting live instance are one
 * agreement rather than three fields that happen to rhyme.
 */
export interface OfferMaterialization<
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> {
  readonly features: readonly RuntimeFeatureReference[];
  readonly artifacts: readonly ProjectionTargetReference[];
  readonly lifecycle: Life;
  readonly cost: CostVector;
}

/**
 * Compilation-level demand summary and its runtime feature closure.
 *
 * `residual` is the immutable exact row entering realization planning. It is not
 * the branch-local worklist a plan drives to empty; that row lives on
 * `RealizationPlan.unresolved`. Keeping them distinct is what lets a successful
 * plan carry real materialization while an empty *demand* still means no runtime.
 */
export interface RequirementClosure<
  Declared extends RequirementRow = RequirementRow,
  Residual extends RequirementRow = RequirementRow,
> {
  readonly declared: RequirementIds<Declared>;
  readonly residual: RequirementIds<Residual>;
  readonly satisfactions: readonly RequirementSatisfaction<RequirementIds<Residual>[number]>[];
  readonly materialization: readonly OfferMaterialization[];
  readonly features: readonly RuntimeFeatureReference[];
  readonly runtimeRequired: Residual extends readonly [] ? false : true;
  readonly address: RuntimeFeatureSetAddress;
}

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
// Realization: offers, instances, plans, and refusal
// ---------------------------------------------------------------------------

/** Lifecycle ownership of one materialized realization. */
export type RealizationLifecycle = Algebra<{
  /** No owned runtime lifetime. Nothing is disposed. */
  unowned: Record<never, never>;
  /** One physical provider owning every binding it produced. */
  owned: { readonly resource: OwnedResource };
}>;

/**
 * Live result of materializing one planned step: the provider itself.
 *
 * The instance carries its own identity — the offer names a recipe and the step
 * names one planned application, but neither names the live provider, and
 * disposal-exactly-once needs the provider to be the thing that is counted.
 *
 * Several authorities backed by one physical provider share this instance and
 * its single lifecycle, so one provider is disposed exactly once rather than
 * once per binding it happens to back. The lifecycle arm is the same `Life`
 * the materialization declares; an owned instance cannot claim an unowned
 * materialization or the reverse.
 */
export interface RealizationInstance<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> {
  readonly id: RealizationInstanceId;
  readonly step: RealizationStepReference;
  readonly bindings: BindingsFor<Provides>;
  readonly lifecycle: CaseOf<RealizationLifecycle, Life>;
  readonly materialization: OfferMaterialization<Life>;
}

/**
 * Why a lawful selected realization failed while being constructed or activated.
 *
 * This is not the reason an offer was never lawful. A rejection says the plan
 * could never legally work; a failure says a lawful plan met a world that
 * changed. Environmental absence reported by a correctly bound authority is
 * neither: that remains typed evidence inside the capability contract, which is
 * why the acquisition arm names a failed act of acquiring, not a state of
 * unavailability that a bound authority is perfectly entitled to report.
 *
 * `Cause` is the host's typed platform payload, nested inside every arm. The
 * algebra itself is not generic-swappable: a host enriches the cause, it never
 * replaces the category. That closes the channel through which a rejection —
 * or any arbitrary type — could impersonate a construction failure.
 *
 * A failure happens after selection, so every arm names the planned step that
 * failed — one recipe may be applied twice in one plan, and two failures from
 * two applications must stay distinguishable. The offer is derived from the
 * step and is deliberately not restated. Arms that can only occur once a live
 * provider exists additionally name that provider, so withdrawal and disposal
 * point at the thing that was actually withdrawn or disposed.
 */
export type RealizationFailure<Cause = unknown> = Algebra<{
  'initialization-failed': {
    readonly step: RealizationStepReference;
    readonly cause: Cause;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'acquisition-failed': {
    readonly step: RealizationStepReference;
    readonly cause: Cause;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'permission-denied': {
    readonly step: RealizationStepReference;
    readonly cause: Cause;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'provider-withdrawn': {
    readonly step: RealizationStepReference;
    readonly instance: RealizationInstanceReference;
    readonly cause: Cause;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'disposal-failed': {
    readonly step: RealizationStepReference;
    readonly instance: RealizationInstanceReference;
    readonly cause: Cause;
    readonly failure: DisposalFailure;
  };
}>;

/**
 * One host realization possibility, before qualification.
 *
 * `Provides` is the exact non-empty row of upstream authorities this offer
 * constructs atomically. `Requires` is the exact row of host-local authorities
 * it needs in order to do so. A duplicate name on either side collapses that
 * field to `never`, making the offer uninhabitable rather than merely wrong.
 *
 * The generic form is the declaration boundary and is where compile-time laws
 * apply. Catalogs and plans store erased addressed descriptors, because literal
 * generic rows do not survive a heterogeneous collection. That `Provides` names
 * canonical owner imports rather than locally authored twins is a
 * `system/assurance` obligation; TypeScript proves shape, never provenance.
 */
export interface RealizationOffer<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Requires extends RequirementRow = RequirementRow,
  Input = unknown,
  Cause = unknown,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> {
  readonly id: RealizationOfferId;
  readonly provides: UniqueRequirements<Provides>;
  readonly requires: UniqueRequirements<Requires>;
  readonly constraints: readonly PlacementConstraint[];
  readonly realms: NonEmptyTuple<EvidenceRealm>;
  readonly locations: NonEmptyTuple<SettlementLocation>;
  readonly backends: NonEmptyTuple<ExecutionBackend>;
  /**
   * Prerequisites in, one live instance out. Never a bare binding row. The
   * failure channel is exactly `RealizationFailure<Cause>`: a host chooses the
   * nested cause, never the failure category, so a pre-candidate rejection
   * cannot be declared as this factory's failure algebra.
   */
  readonly factory: Signature<Input, RealizationInstance<Provides, Life>, RealizationFailure<Cause>, Requires>;
  readonly materializes: OfferMaterialization<Life>;
  readonly address: ContentAddress<'application/vnd.liteship.realization-offer+cbor'>;
}

/**
 * Why an offer or branch never became lawful.
 *
 * Every arm precedes candidacy, so no arm may carry a candidate reference: a
 * rejected offer never became a candidate and cannot be named as one.
 */
export type RealizationRejection = Algebra<{
  'no-provider': { readonly requirement: RequirementId };
  'contract-conflict': {
    readonly requirement: RequirementId;
    readonly offers: NonEmptyTuple<RealizationOfferReference>;
  };
  'realm-unavailable': {
    readonly offer: RealizationOfferReference;
    readonly required: NonEmptyTuple<EvidenceRealm>;
  };
  'authority-insufficient': {
    readonly offer: RealizationOfferReference;
    readonly minimum: EvidenceAuthority;
  };
  'lifecycle-incompatible': {
    readonly offer: RealizationOfferReference;
    readonly maximum: EvidenceLifetime;
  };
  'security-refused': { readonly offer: RealizationOfferReference; readonly policy: PolicyId };
  'fidelity-impossible': {
    readonly offer: RealizationOfferReference;
    readonly target: ProjectionTargetReference;
  };
  'egress-unsupported': {
    readonly offer: RealizationOfferReference;
    readonly target: ProjectionTargetReference;
  };
  'budget-exceeded': {
    readonly offer: RealizationOfferReference;
    readonly metric: CostMetric;
    readonly maximum: number;
  };
  /**
   * A selected construction depends on a cycle that nothing grounds. A cycle in
   * the offer catalog is lawful; alternatives may be unused or externally
   * grounded. Only an ungrounded cycle inside a selected branch is illegal.
   */
  'ungrounded-cycle': {
    readonly offers: NonEmptyTuple<RealizationOfferReference>;
    readonly requirements: NonEmptyTuple<RequirementId>;
  };
  'atomicity-conflict': {
    readonly requirement: RequirementId;
    readonly offers: NonEmptyTuple<RealizationOfferReference>;
  };
  'branch-unresolved': { readonly remaining: NonEmptyTuple<RequirementId> };
}>;

/** Identity of one explicit invocation input slot. */
export type InvocationSlotId<Name extends string = string> = Brand<Name, 'liteship.invocation-slot-id'>;

/**
 * How a step's offer input is bound. Plan-bound configuration is canonical
 * and content-addressed; invocation-bound dynamic input enters through an
 * explicit named slot; `none` says the factory takes no meaningful input.
 * Per-use resource input never appears here at all — it belongs to a typed
 * operation on the provided authority.
 */
export type StepInputBinding = Algebra<{
  configured: {
    readonly input: ContentAddress<'application/vnd.liteship.step-input+cbor'>;
    readonly contract: SchemaReference;
  };
  invocation: { readonly slot: InvocationSlotId; readonly contract: SchemaReference };
  none: Record<never, never>;
}>;

/**
 * One planned application of an offer inside one plan.
 *
 * The offer is the recipe; the step is one decision to apply it — and the
 * step records what it applies the recipe to. A step that named only the
 * recipe could not reconstruct which region a claim concerns, which endpoint
 * a connection opens, or which join an island activates: the application
 * would be implied rather than represented.
 *
 * Cost deduplicates by step, several bindings share one step's provider, and
 * a plan that applies the same offer twice holds two steps rather than one
 * reference counted an ambiguous number of times. The step carries its own
 * applied materialization, so a plan has no parallel offer and
 * materialization arrays left to drift apart.
 */
export interface RealizationStep {
  readonly id: RealizationStepId;
  readonly offer: RealizationOfferReference;
  readonly input: StepInputBinding;
  readonly materialization: OfferMaterialization;
}

/**
 * The erased, addressed form of one offer declaration — the exact catalog
 * facts a plan derives from, parallel to the grounding descriptor. Exact
 * generic rows do not survive a heterogeneous collection, so catalogs hold
 * descriptors; that a descriptor agrees with the typed declaration it came
 * from is a `system/assurance` obligation. `RealizationCatalogAddress` covers
 * these descriptors together with the grounding descriptors.
 */
export interface RealizationOfferDescriptor {
  readonly offer: RealizationOfferReference;
  readonly provides: NonEmptyTuple<RequirementId>;
  readonly requires: readonly RequirementId[];
  readonly realms: NonEmptyTuple<EvidenceRealm>;
  readonly locations: NonEmptyTuple<SettlementLocation>;
  readonly backends: NonEmptyTuple<ExecutionBackend>;
  readonly constraints: readonly PlacementConstraint[];
  readonly lifecycle: TagOf<RealizationLifecycle>;
  readonly inputBinding: TagOf<StepInputBinding>;
  readonly input: SchemaReference;
  readonly materialization: OfferMaterialization;
  readonly address: ContentAddress<'application/vnd.liteship.realization-offer+cbor'>;
}

/**
 * One selected grounding slot together with the binding that says which
 * bootstrap input fulfills it. A catalog definition capable of admitting a
 * mount is not the same thing as the mount having been supplied: intrinsic
 * slots bind `none`, deployment and application slots bind configured
 * artifacts, invocation slots bind an explicit named slot.
 */
export interface SelectedGrounding {
  readonly grounding: GroundingReference;
  readonly input: StepInputBinding;
}

// ---------------------------------------------------------------------------
// Speculative preparation
// ---------------------------------------------------------------------------

export type SpeculativeCandidateId<Name extends string = string> = Brand<Name, 'liteship.speculative-candidate-id'>;
export type SpeculativeCandidateReference<Id extends SpeculativeCandidateId = SpeculativeCandidateId> = Reference<
  'speculative-candidate',
  Id
>;

/** One predicted consequence worth preparing, pinned to its source revision. */
export interface SpeculativeCandidate {
  readonly id: SpeculativeCandidateReference;
  readonly revision: RevisionReference;
  readonly consequence: ProjectionTargetReference;
}

/**
 * Work prepared ahead of need. It is revision-pinned, owned, and cheaply
 * disposable; it never mutates committed state and becomes visible only
 * through the real transaction commit.
 */
export interface PreparedWork {
  readonly candidate: SpeculativeCandidateReference;
  readonly revision: RevisionReference;
  readonly prepared: ContentAddress<'application/vnd.liteship.prepared-work+cbor'>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * What finally happened to one piece of prepared work. The committed arm
 * names the exact runtime commit that consumed it and the physical address it
 * became visible through — prepared work has no other route to visibility.
 */
export type PreparationDisposition = Algebra<{
  committed: { readonly commit: CommitId; readonly through: ContentAddress };
  discarded: Record<never, never>;
  invalidated: { readonly by: RevisionReference };
}>;

/**
 * One complete alternative branch for one addressed compilation input.
 *
 * A plan is canonical addressable data. It holds references and descriptors and
 * never live functions, open connections, or `OwnedResource` values; those
 * belong to `RealizationInstance` once a host materializes the plan.
 *
 * `residualDemand` is the immutable row the branch was asked to close.
 * `unresolved` is the branch-local worklist that shrinks as steps are applied.
 * `selectedGroundings` names the declared grounding slots this branch selected
 * as its roots — never bare requirement names. Selection is not availability
 * and not admission: a host catalog containing a slot capable of admitting a
 * value is not a selected root, and a selected root is not yet an admitted
 * live value. The bootstrap owes fulfilled admission for every selected slot
 * at activation, and an admission refused there blocks materialization in the
 * admission algebra rather than degrading into a missing binding.
 *
 * `settlement` is the exact per-unit location/backend roster this branch
 * closed under. Backend selection introduces real prerequisites and
 * materialization, so the choices that created the closure live inside the
 * addressed plan they created — not beside it, where a sibling roster could
 * select different backends while the plan's closure stayed structurally
 * valid. The plan address commits to these decisions.
 *
 * `source` and `catalog` are the plan's exact ancestry: the compilation
 * revision it closes and the content-addressed realization catalog whose offer
 * and grounding definitions it planned against. Persistent IDs alone are not
 * exact-definition evidence — an offer's requirements or a slot's semantics
 * can change while its ID stays the same.
 */
export interface RealizationPlan<Demand extends RequirementRow = RequirementRow> {
  readonly id: RealizationPlanId;
  readonly source: RevisionReference;
  readonly catalog: RealizationCatalogAddress;
  readonly residualDemand: RequirementIds<Demand>;
  readonly unresolved: readonly RequirementId[];
  readonly selectedGroundings: readonly SelectedGrounding[];
  readonly satisfactions: readonly RequirementSatisfaction[];
  readonly steps: readonly RealizationStep[];
  readonly constructionOrder: readonly RealizationStepReference[];
  readonly settlement: readonly SettlementDecision[];
  readonly rejected: readonly RealizationRejection[];
  readonly address: ContentAddress<'application/vnd.liteship.realization-plan+cbor'>;
}

/**
 * A plan whose branch-local worklist reached empty.
 *
 * Only a closed plan may be costed, so an unresolved branch cannot reach cost
 * comparison by accident.
 */
export interface ClosedRealizationPlan<Demand extends RequirementRow = RequirementRow>
  extends RealizationPlan<Demand> {
  readonly unresolved: readonly [];
}

/** One lawful location/backend alternative for a single semantic unit. */
export interface SettlementCandidate {
  readonly id: SettlementCandidateId;
  readonly location: SettlementLocation;
  readonly backend: ExecutionBackend;
  readonly constraints: readonly PlacementConstraint[];
  readonly profiles: readonly BackendProfileAddress[];
  readonly cost: CostVector;
}

/**
 * One lawful costed closed plan for the whole compilation.
 *
 * Cost is the deduplicated aggregate: a provider shared by several satisfied
 * requirements is counted once per plan, not once per requirement it backs.
 */
export interface RealizationCandidate {
  readonly id: RealizationCandidateId;
  readonly plan: ClosedRealizationPlan;
  readonly profiles: readonly BackendProfileAddress[];
  readonly cost: CostVector;
  readonly budgets: readonly CostBudget[];
}

/**
 * Structured reason for choosing one lawful global candidate.
 *
 * `only-lawful` explains the alternatives through the rejections that refuted
 * them, not through candidate references: a branch rejected as unlawful never
 * became a `RealizationCandidate` and cannot be named as one. The
 * `lowest-cost` arm is the sole owner of the optimization objective.
 *
 * This is compile-time selection meaning only. Runtime materialization failure
 * is `RealizationFailure` and never appears here as a selection reason.
 */
export type RealizationSelectionReason = Algebra<{
  'only-lawful': { readonly rejections: readonly RealizationRejection[] };
  'lowest-cost': {
    readonly objective: OptimizationObjective;
    readonly paretoFront: NonEmptyTuple<RealizationCandidateReference>;
  };
  override: { readonly policy: PolicyId; readonly explanation: string };
}>;

/**
 * Selection among costed closed-plan candidates for the whole compilation.
 *
 * A compilation may close several lawful global plans. Shipping one of them is
 * a decision, and a decision carries its roster, its choice, and its reason —
 * an unexplained single candidate would be a conclusion with the deliberation
 * deleted. This is the global counterpart of `SettlementDecision`, which stays
 * per semantic unit and speaks in settlement candidates.
 */
export interface RealizationDecision {
  readonly candidates: NonEmptyTuple<RealizationCandidate>;
  readonly selected: RealizationCandidateReference;
  readonly reason: RealizationSelectionReason;
}

/**
 * Structured reason for choosing one lawful settlement candidate.
 *
 * `only-legal` names the constraints that eliminated the alternatives, not
 * candidate references: an alternative eliminated as unlawful never became a
 * `SettlementCandidate` and cannot be named as one. The `lowest-cost` arm is
 * the sole owner of the optimization objective, and its Pareto frontier is
 * non-empty — a lowest-cost choice from an empty lawful frontier is not a
 * reason, it is a refusal that belongs in a refusal outcome.
 *
 * There is deliberately no fallback arm. Post-selection construction,
 * activation, withdrawal, and disposal failure are `RealizationFailure`;
 * pre-candidate illegality is rejection or violated constraints; search
 * exhaustion is `incomplete`; compiler-operation failure is the outer
 * `Result`. A runtime fallback that changes the selected plan would be a new
 * decision under a replanning mechanism, never a retroactive edit to why the
 * original candidate was chosen.
 */
export type SettlementReason = Algebra<{
  'earliest-faithful': { readonly eliminatedLaterLocations: readonly SettlementLocation[] };
  'only-legal': { readonly violated: readonly PlacementConstraint[] };
  'lowest-cost': { readonly objective: OptimizationObjective; readonly paretoFront: NonEmptyTuple<SettlementCandidateReference> };
  override: { readonly policy: PolicyId; readonly explanation: string };
}>;

/**
 * Selected settlement and backend for one semantic unit.
 *
 * `subject` is the exact authored semantic location this decision governs.
 * Seventeen decisions in a plan are seventeen answers, and each one names its
 * question — array position is never the hidden subject, because canonical
 * meaning may not depend on ordering.
 *
 * `candidates` stays non-empty. A semantic unit with no lawful candidate does
 * not manufacture an empty decision; the whole compilation lands in a refusal
 * outcome instead, so refusal can never be mistaken for a decided unit.
 */
export interface SettlementDecision {
  readonly subject: SemanticLocation;
  readonly candidates: NonEmptyTuple<SettlementCandidate>;
  readonly selected: SettlementCandidateReference;
  readonly reason: SettlementReason;
}

/** One compiler arm in the canonical fleet. */
export interface CompilerArm<
  Input,
  Output,
  Failure,
  Requirements extends RequirementRow = readonly [],
> {
  readonly id: CompilerId;
  readonly target: ProjectionTargetReference;
  readonly signature: Signature<Input, Output, Failure, Requirements>;
  readonly inputSchema: SchemaReference<SchemaId, Input>;
  readonly outputSchema: SchemaReference<SchemaId, Output>;
  readonly requirements: Requirements;
  readonly deterministic: boolean;
  readonly supportedLocations: readonly SettlementLocation[];
  readonly supportedBackends: readonly ExecutionBackend[];
  readonly proof: ContentAddress<'application/vnd.liteship.proof+cbor'>;
}

/** Address of one emitted source map. */
export type SourceMapAddress = ContentAddress<'application/vnd.liteship.source-map+json'>;

/** Reference to one emitted source map. */
export type SourceMapReference = Reference<'source-map', SourceMapAddress>;

/**
 * How a generated representation relates back to the revision it was authored
 * from.
 *
 * This replaces an optional source-map field, which could not say which of
 * several unrelated situations it meant: coordinates were preserved directly, a
 * map exists, mapping is impossible for a stated reason, mapping failed, the
 * producer does not support it, or someone forgot. Diagnostics that cannot
 * reach source, and an artifact that quietly lost its ancestry, are the same
 * failure this repository exists to make unrepresentable.
 *
 * The relation is self-contained: it owns the exact source revision. A product
 * carrying both this and a sibling `source` field would have two source
 * authorities and need a law forcing them to agree, which is the duplication
 * the reset was for.
 */
export type SourceRelation<Revision extends RevisionId = RevisionId> = Algebra<{
  /**
   * The generated representation preserves the source relationship directly, so
   * no map is needed. Carries no map key -- an identity-preserving relation with
   * a map alongside it is describing something else.
   */
  'identity-preserving': {
    readonly source: RevisionReference<Revision>;
  };
  /** The relationship is recovered through one required addressed source map. */
  mapped: {
    readonly source: RevisionReference<Revision>;
    readonly map: SourceMapReference;
  };
  /**
   * Mapping is impossible, and the producer says why. The limitations are
   * non-empty because "deliberately unmappable, no reason given" is
   * indistinguishable from having lost the relationship.
   */
  'deliberately-unmappable': {
    readonly source: RevisionReference<Revision>;
    readonly limitations: NonEmptyTuple<Diagnostic>;
  };
}>;

/**
 * Immutable compiler output.
 *
 * Exact over artifact identity, projection target, and source revision. The
 * broad defaults keep heterogeneous erased populations inhabited -- one
 * compilation legitimately yields artifacts of many identities. They are not an
 * excuse on a path that promises one specific artifact came from one specific
 * revision; such a path instantiates all three.
 */
export interface Artifact<
  Id extends ArtifactId = ArtifactId,
  Target extends ProjectionTargetId = ProjectionTargetId,
  Revision extends RevisionId = RevisionId,
> {
  readonly id: Id;
  readonly target: ProjectionTargetReference<Target>;
  readonly relation: SourceRelation<Revision>;
  readonly address: ContentAddress;
  readonly digest: ContentDigest;
  readonly mediaType: string;
}

/** Evidence backing a claim that no lawful plan exists. */
export type UnsatisfiabilityProof = Algebra<{
  /** The capability is absent from the monotone reachability fixed point. */
  'unreachable-capability': { readonly requirement: RequirementId };
  /** Every branch was enumerated and refuted. */
  'exhaustive-branch-refutation': { readonly branches: NonEmptyTuple<RealizationPlanReference> };
}>;

/**
 * Arm-specific state of a bounded analysis that stopped before establishing
 * either result.
 *
 * Each arm carries the payload its bound actually produces, and no other.
 * Search exhaustion leaves genuinely unresolved requirements; a Pareto or
 * selection limit may be reached with several fully closed lawful candidates
 * and nothing unresolved at all. One product type forcing every stop to invent
 * an unresolved requirement would make the honest Pareto report unrepresentable.
 */
export type IncompleteState = Algebra<{
  'search-exhausted': {
    readonly explored: number;
    readonly limit: number;
    readonly frontier: readonly RealizationPlanReference[];
    readonly unresolved: NonEmptyTuple<RequirementId>;
  };
  'pareto-exhausted': {
    readonly limit: number;
    readonly frontier: NonEmptyTuple<RealizationCandidateReference>;
  };
  'unsupported-constraint': { readonly constraint: PlacementConstraint };
  'oracle-unavailable': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * Outcome of planning and compiling one semantic input.
 *
 * Only `planned` carries production artifacts and settlement decisions, so a
 * caller cannot receive a refusal and keep shipping because diagnostics looked
 * survivable.
 *
 * `unsatisfiable` and `incomplete` both block production, and only one is a
 * proof. Exhausting a search bound is not evidence that no plan exists, exactly
 * as an uninterpretable declaration is not evidence of a clean ABI surface.
 */
export type CompileOutcome<
  Declared extends RequirementRow = RequirementRow,
  Residual extends RequirementRow = RequirementRow,
> = Algebra<{
  planned: {
    readonly artifacts: readonly Artifact[];
    readonly requirements: RequirementClosure<Declared, Residual>;
    readonly decision: RealizationDecision;
    readonly diagnostics: readonly Diagnostic[];
  };
  unsatisfiable: {
    readonly core: NonEmptyTuple<RequirementId>;
    readonly proof: UnsatisfiabilityProof;
    readonly rejections: NonEmptyTuple<RealizationRejection>;
    readonly catalog: RealizationCatalogAddress;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  incomplete: {
    readonly state: IncompleteState;
    readonly catalog: RealizationCatalogAddress;
    readonly rejections: readonly RealizationRejection[];
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

/**
 * Result of compiling one semantic input.
 *
 * The outer `Result` carries compiler-operation failure: malformed input, a
 * failed host capability, a recoverable fault in the compiler itself. Those are
 * not planning verdicts and do not enter the outcome algebra.
 */
export type CompileResult<
  Declared extends RequirementRow = RequirementRow,
  Residual extends RequirementRow = RequirementRow,
> = Result<CompileOutcome<Declared, Residual>, readonly Diagnostic[]>;

/** Foreign representation to LiteShip meaning. */
export interface MigrationAdapter<Input = unknown, Output = unknown> {
  readonly id: MigrationAdapterId;
  readonly sourceFormat: string;
  readonly inputSchema: SchemaReference<SchemaId, Input>;
  readonly outputSchema: SchemaReference<SchemaId, Output>;
  readonly migrate: Signature<Input, Output, readonly Diagnostic[]>;
}

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
 * whose instance carries the owned lifecycle arm — with its resource — and a
 * materialization stamped with the same arm. The predecessor of this law
 * compared the materialization tag union against itself and never mentioned
 * `RealizationInstance` at all, which made its name a promise the fixture
 * did not keep.
 */
export type AnOwnedOfferYieldsAnOwnedInstance = Assert<
  Equal<OutputOf<OwnedExampleOffer['factory']>['lifecycle'], CaseOf<RealizationLifecycle, 'owned'>>
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

/** Type summary consumed by the root core topology. */
export interface CompilerTypeSurface {
  readonly arm: CompilerArm<unknown, unknown, unknown>;
  readonly artifact: Artifact;
  readonly result: CompileResult;
  readonly outcome: CompileOutcome;
  readonly settlement: SettlementDecision;
  readonly settlementCandidate: SettlementCandidate;
  readonly offer: RealizationOffer;
  readonly offerDescriptor: RealizationOfferDescriptor;
  readonly step: RealizationStep;
  readonly instance: RealizationInstance;
  readonly speculativeCandidate: SpeculativeCandidate;
  readonly preparedWork: PreparedWork;
  readonly preparationDisposition: PreparationDisposition;
  readonly plan: RealizationPlan;
  readonly candidate: RealizationCandidate;
  readonly decision: RealizationDecision;
  readonly rejection: RealizationRejection;
  readonly failure: RealizationFailure;
  readonly objective: OptimizationObjective;
  readonly feature: RuntimeFeatureDefinition;
  readonly requirements: RequirementClosure;
  readonly migration: MigrationAdapter;
}
