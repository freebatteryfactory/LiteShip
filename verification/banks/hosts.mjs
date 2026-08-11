// Shared host calculus: groundings, offers, plans, providers, leases.
//
// Mutations carried verbatim from the ratified verification kit; only the
// plumbing changed. Each entry rewrites one exact span of the live tree and
// must die on a named law. An entry whose anchor text is absent reports
// MISSING and fails the bank -- a bank that has drifted off the source must
// never be mistaken for a bank that passed.

import { runBank } from '../harness.mjs';

const TD = 'types.d.ts';
const CM = '00_core/14_compiler/types.ts';
const HO = '01_hosts/types.ts';

const M = [
  // --- carried forward from the fold suite, patterns updated where source moved ---
  ['non-empty provided row admits the empty row', CM,
    `export type NonEmptyRequirementRow = readonly [AnyHole, ...AnyHole[]];`,
    `export type NonEmptyRequirementRow = RequirementRow;`],

  ['offer stops rejecting a duplicate provided row', CM,
    `  readonly provides: UniqueRequirements<Provides>;`,
    `  readonly provides: Provides;`],

  ['offer stops rejecting a duplicate prerequisite row', CM,
    `  readonly requires: UniqueRequirements<Requires>;`,
    `  readonly requires: Requires;`],

  ['factory output forgets which authorities it provides', CM,
    `  readonly factory: Signature<Input, RealizationInstance<Provides, Life>, RealizationFailure<Cause>, Requires>;`,
    `  readonly factory: Signature<Input, RealizationInstance, RealizationFailure<Cause>, Requires>;`],

  ['factory stops carrying its exact prerequisites', CM,
    `  readonly factory: Signature<Input, RealizationInstance<Provides, Life>, RealizationFailure<Cause>, Requires>;`,
    `  readonly factory: Signature<Input, RealizationInstance<Provides, Life>, RealizationFailure<Cause>, readonly []>;`],

  ['instance bindings widen to an arbitrary binding row', CM,
    `  readonly bindings: BindingsFor<Provides>;\n  readonly lifecycle: CaseOf<RealizationLifecycle, Life>;`,
    `  readonly bindings: readonly Binding<AnyHole>[];\n  readonly lifecycle: CaseOf<RealizationLifecycle, Life>;`],

  ['a closed plan admits leftover unresolved requirements', CM,
    `  readonly unresolved: readonly [];\n}`,
    `  readonly unresolved: readonly RequirementId[];\n}`],

  ['an unclosed plan reaches cost comparison', CM,
    `  readonly plan: ClosedRealizationPlan;`,
    `  readonly plan: RealizationPlan;`],

  ['a refused compilation carries production artifacts', CM,
    `  unsatisfiable: {\n    readonly core: NonEmptyTuple<RequirementId>;`,
    `  unsatisfiable: {\n    readonly artifacts: readonly Artifact[];\n    readonly core: NonEmptyTuple<RequirementId>;`],

  ['a refused compilation carries settlement decisions', CM,
    `  incomplete: {\n    readonly state: IncompleteState;`,
    `  incomplete: {\n    readonly settlement: readonly SettlementDecision[];\n    readonly state: IncompleteState;`],

  ['unsatisfiability stops requiring a proof', CM,
    `    readonly proof: UnsatisfiabilityProof;\n    readonly rejections: NonEmptyTuple<RealizationRejection>;`,
    `    readonly rejections: NonEmptyTuple<RealizationRejection>;`],

  ['a bounded analysis claims an unsatisfiability proof', CM,
    `  incomplete: {\n    readonly state: IncompleteState;`,
    `  incomplete: {\n    readonly proof: UnsatisfiabilityProof;\n    readonly state: IncompleteState;`],

  ['REGRESSION: runtimeRequired becomes an opaque boolean', CM,
    `  readonly runtimeRequired: Residual extends readonly [] ? false : true;`,
    `  readonly runtimeRequired: boolean;`],

  // --- gap 1: the failure channel ---
  ['GAP1: failure channel becomes freely substitutable again', CM,
    `  readonly factory: Signature<Input, RealizationInstance<Provides, Life>, RealizationFailure<Cause>, Requires>;`,
    `  readonly factory: Signature<Input, RealizationInstance<Provides, Life>, Cause, Requires>;`],

  // --- gap 2: lifecycle correspondence ---
  ['GAP2: instance lifecycle decouples from the declared arm', CM,
    `  readonly lifecycle: CaseOf<RealizationLifecycle, Life>;`,
    `  readonly lifecycle: RealizationLifecycle;`],

  ['GAP2: instance materialization decouples from the declared arm', CM,
    `  readonly materialization: OfferMaterialization<Life>;`,
    `  readonly materialization: OfferMaterialization;`],

  ['GAP2: materialization lifecycle widens back to the full tag union', CM,
    `  readonly lifecycle: Life;`,
    `  readonly lifecycle: TagOf<RealizationLifecycle>;`],

  // --- gap 3: step and provider identity ---
  ['GAP3: instance loses its provider identity', CM,
    `  readonly id: RealizationInstanceId;\n  readonly step: RealizationStepReference;`,
    `  readonly step: RealizationStepReference;`],

  ['GAP3: instance points at the recipe instead of the planned step', CM,
    `  readonly id: RealizationInstanceId;\n  readonly step: RealizationStepReference;`,
    `  readonly id: RealizationInstanceId;\n  readonly offer: RealizationOfferReference;`],

  ['SATISFIER: satisfaction collapses back to steps only', CM,
    `  readonly requirement: Requirement;\n  readonly satisfier: RequirementSatisfier;`,
    `  readonly requirement: Requirement;\n  readonly step: RealizationStepReference;`],

  ['SATISFIER: grounded arm regresses to a bare requirement name', CM,
    `  grounded: { readonly grounding: GroundingReference };`,
    `  grounded: { readonly grounding: RequirementId };`],

  ['SATISFIER: realized arm points at the recipe instead of the step', CM,
    `  realized: { readonly step: RealizationStepReference };`,
    `  realized: { readonly step: RealizationOfferReference };`],

  ['STEP: a step forgets how its input is bound', CM,
    `  readonly input: StepInputBinding;\n  readonly materialization: OfferMaterialization;`,
    `  readonly materialization: OfferMaterialization;`],

  ['STEP: configured input stops being content-addressed', CM,
    `    readonly input: ContentAddress<'application/vnd.liteship.step-input+cbor'>;
    readonly contract: SchemaReference;`,
    `    readonly input: unknown;
    readonly contract: SchemaReference;`],

  ['CONTRACT: a bound invocation input loses its decode contract', CM,
    `  invocation: { readonly slot: InvocationSlotId; readonly contract: SchemaReference };`,
    `  invocation: { readonly slot: InvocationSlotId };`],

  ['SPEC: prepared work floats free of its revision', CM,
    `  readonly revision: RevisionReference;
  readonly prepared:`,
    `  readonly revision: string;
  readonly prepared:`],

  ['DESCRIPTOR: the offer descriptor stops pinning placement', CM,
    `  readonly realms: NonEmptyTuple<EvidenceRealm>;\n  readonly locations: NonEmptyTuple<SettlementLocation>;\n  readonly backends: NonEmptyTuple<ExecutionBackend>;\n  readonly constraints: readonly PlacementConstraint[];`,
    `  readonly constraints: readonly PlacementConstraint[];`],

  ['GAP3: construction order regresses to offer references', CM,
    `  readonly constructionOrder: readonly RealizationStepReference[];`,
    `  readonly constructionOrder: readonly RealizationOfferReference[];`],

  ['selected plan groundings regress to bare requirement names', CM,
    `  readonly selectedGroundings: readonly SelectedGrounding[];`,
    `  readonly selectedGroundings: readonly RequirementId[];`],

  // --- closure patch: failure identity at the step altitude ---
  ['CLOSURE: a failure names the recipe instead of the application', CM,
    `  'initialization-failed': {\n    readonly step: RealizationStepReference;`,
    `  'initialization-failed': {\n    readonly offer: RealizationOfferReference;`],

  ['CLOSURE: provider withdrawal forgets the live provider', CM,
    `  'provider-withdrawn': {\n    readonly step: RealizationStepReference;\n    readonly instance: RealizationInstanceReference;`,
    `  'provider-withdrawn': {\n    readonly step: RealizationStepReference;`],

  ['CLOSURE: a construction-phase failure grows a provider ghost', CM,
    `  'acquisition-failed': {\n    readonly step: RealizationStepReference;`,
    `  'acquisition-failed': {\n    readonly step: RealizationStepReference;\n    readonly instance: RealizationInstanceReference;`],

  // --- closure patch: the plan owns its choices ---
  ['CLOSURE: the plan loses its settlement roster', CM,
    `  readonly settlement: readonly SettlementDecision[];\n  readonly rejected: readonly RealizationRejection[];`,
    `  readonly rejected: readonly RealizationRejection[];`],

  ['CLOSURE: a settlement roster reappears beside the plan', CM,
    `  planned: {\n    readonly artifacts: readonly Artifact[];`,
    `  planned: {\n    readonly settlement: readonly SettlementDecision[];\n    readonly artifacts: readonly Artifact[];`],

  // --- closure patch: explained global selection ---
  ['CLOSURE: the planned outcome regresses to an unexplained candidate', CM,
    `    readonly decision: RealizationDecision;`,
    `    readonly candidate: RealizationCandidate;`],

  ['CLOSURE: the decision roster admits emptiness', CM,
    `  readonly candidates: NonEmptyTuple<RealizationCandidate>;`,
    `  readonly candidates: readonly RealizationCandidate[];`],

  ['CLOSURE: the decision loses its structured reason', CM,
    `  readonly selected: RealizationCandidateReference;\n  readonly reason: RealizationSelectionReason;\n}`,
    `  readonly selected: RealizationCandidateReference;\n}`],

  // --- GPT's six survivors, now expected caught ---
  ['SURVIVOR1: failure arm gains offer of type unknown', CM,
    `  'initialization-failed': {\n    readonly step: RealizationStepReference;`,
    `  'initialization-failed': {\n    readonly offer: unknown;\n    readonly step: RealizationStepReference;`],

  ['SURVIVOR2: pre-instance arm gains instance of type unknown', CM,
    `  'permission-denied': {\n    readonly step: RealizationStepReference;`,
    `  'permission-denied': {\n    readonly instance: unknown;\n    readonly step: RealizationStepReference;`],

  ['SURVIVOR3: unexplained sibling candidate returns beside the decision', CM,
    `    readonly decision: RealizationDecision;`,
    `    readonly decision: RealizationDecision;\n    readonly candidate: RealizationCandidate;`],

  ['SURVIVOR4: decision selected widens to string', CM,
    `  readonly selected: RealizationCandidateReference;`,
    `  readonly selected: string;`],

  ['SURVIVOR5: deprecated grounded returns beside selectedGroundings', CM,
    `  readonly selectedGroundings: readonly SelectedGrounding[];\n  readonly satisfactions:`,
    `  readonly selectedGroundings: readonly SelectedGrounding[];\n  readonly grounded: readonly RequirementId[];\n  readonly satisfactions:`],

  // --- relationship repairs ---
  ['RELATION: settlement decision loses its subject', CM,
    `  readonly subject: SemanticLocation;\n  readonly candidates: NonEmptyTuple<SettlementCandidate>;`,
    `  readonly candidates: NonEmptyTuple<SettlementCandidate>;`],

  ['RELATION: settlement subject widens to string', CM,
    `  readonly subject: SemanticLocation;`,
    `  readonly subject: string;`],

  ['RELATION: plan loses its source revision', CM,
    `  readonly source: RevisionReference;\n  readonly catalog: RealizationCatalogAddress;`,
    `  readonly catalog: RealizationCatalogAddress;`],

  ['RELATION: plan catalog degrades to persistent ids', CM,
    `  readonly catalog: RealizationCatalogAddress;\n  readonly residualDemand:`,
    `  readonly catalog: readonly RealizationOfferId[];\n  readonly residualDemand:`],

  ['RELATION: global decision regains a sibling objective', CM,
    `  readonly selected: RealizationCandidateReference;\n  readonly reason: RealizationSelectionReason;\n}`,
    `  readonly selected: RealizationCandidateReference;\n  readonly reason: RealizationSelectionReason;\n  readonly objective?: OptimizationObjective;\n}`],

  ['RELATION: settlement decision regains a sibling objective', CM,
    `  readonly selected: SettlementCandidateReference;\n  readonly reason: SettlementReason;\n}`,
    `  readonly selected: SettlementCandidateReference;\n  readonly reason: SettlementReason;\n  readonly objective?: OptimizationObjective;\n}`],

  ['RELATION: only-lawful names phantom candidates again', CM,
    `  'only-lawful': { readonly rejections: readonly RealizationRejection[] };`,
    `  'only-lawful': { readonly eliminated: readonly RealizationCandidateReference[] };`],

  ['RELATION: an incomplete refusal forgets its catalog', CM,
    `    readonly state: IncompleteState;\n    readonly catalog: RealizationCatalogAddress;`,
    `    readonly state: IncompleteState;`],

  // --- settlement-decision complement ---
  ['UNIT: per-unit selected widened to string', CM,
    `  readonly selected: SettlementCandidateReference;`,
    `  readonly selected: string;`],

  ['UNIT: per-unit candidates opened to an ordinary array', CM,
    `  readonly candidates: NonEmptyTuple<SettlementCandidate>;`,
    `  readonly candidates: readonly SettlementCandidate[];`],

  ['UNIT: per-unit reason widened to unknown', CM,
    `  readonly reason: SettlementReason;\n}`,
    `  readonly reason: unknown;\n}`],

  ['UNIT: only-legal regains eliminated beside violated', CM,
    `  'only-legal': { readonly violated: readonly PlacementConstraint[] };`,
    `  'only-legal': { readonly violated: readonly PlacementConstraint[]; readonly eliminated: readonly SettlementCandidateReference[] };`],

  ['UNIT: non-lowest global arm gains an objective', CM,
    `    readonly paretoFront: NonEmptyTuple<RealizationCandidateReference>;\n  };\n  override: { readonly policy: PolicyId; readonly explanation: string };`,
    `    readonly paretoFront: NonEmptyTuple<RealizationCandidateReference>;\n  };\n  override: { readonly policy: PolicyId; readonly explanation: string; readonly objective: OptimizationObjective };`],

  ['UNIT: non-lowest per-unit arm gains an objective', CM,
    `  'earliest-faithful': { readonly eliminatedLaterLocations: readonly SettlementLocation[] };`,
    `  'earliest-faithful': { readonly eliminatedLaterLocations: readonly SettlementLocation[]; readonly objective: OptimizationObjective };`],

  ['UNIT: unsatisfiable gains a RealizationDecision', CM,
    `  unsatisfiable: {\n    readonly core: NonEmptyTuple<RequirementId>;`,
    `  unsatisfiable: {\n    readonly decision: RealizationDecision;\n    readonly core: NonEmptyTuple<RequirementId>;`],

  ['UNIT: a refusal gains a RealizationCandidate', CM,
    `  unsatisfiable: {\n    readonly core: NonEmptyTuple<RequirementId>;`,
    `  unsatisfiable: {\n    readonly candidate: RealizationCandidate;\n    readonly core: NonEmptyTuple<RequirementId>;`],

  ['UNIT: per-unit pareto frontier emptied', CM,
    `readonly paretoFront: NonEmptyTuple<SettlementCandidateReference> };`,
    `readonly paretoFront: readonly [] };`],

  ['UNIT: per-unit pareto frontier opened to an ordinary array', CM,
    `readonly paretoFront: NonEmptyTuple<SettlementCandidateReference> };`,
    `readonly paretoFront: readonly SettlementCandidateReference[] };`],

  ['GLOBAL: pareto frontier opened to an ordinary array', CM,
    `    readonly paretoFront: NonEmptyTuple<RealizationCandidateReference>;\n  };\n  override:`,
    `    readonly paretoFront: readonly RealizationCandidateReference[];\n  };\n  override:`],

  ['GLOBAL: pareto frontier emptied', CM,
    `    readonly paretoFront: NonEmptyTuple<RealizationCandidateReference>;\n  };\n  override:`,
    `    readonly paretoFront: readonly [];\n  };\n  override:`],

  ['GLOBAL: the fallback arm returns to the global selection reason', CM,
    `  override: { readonly policy: PolicyId; readonly explanation: string };\n}>;\n\n/**\n * Selection among costed closed-plan candidates`,
    `  override: { readonly policy: PolicyId; readonly explanation: string };\n  fallback: { readonly failed: RealizationCandidateReference; readonly diagnostics: readonly Diagnostic[] };\n}>;\n\n/**\n * Selection among costed closed-plan candidates`],

  ['CONSTITUTION: runtimeRequired becomes permanently false', CM,
    `  readonly runtimeRequired: Residual extends readonly [] ? false : true;`,
    `  readonly runtimeRequired: false;`],

  ['UNIT: the fallback arm returns to settlement reasons', CM,
    `  override: { readonly policy: PolicyId; readonly explanation: string };\n}>;\n\n/**\n * Selected settlement and backend for one semantic unit.`,
    `  override: { readonly policy: PolicyId; readonly explanation: string };\n  fallback: { readonly failed: SettlementCandidateReference; readonly diagnostics: readonly Diagnostic[] };\n}>;\n\n/**\n * Selected settlement and backend for one semantic unit.`],

  // --- gap 4: arm-specific incomplete state ---
  ['GAP4: incomplete state flattens back to one product', CM,
    `    readonly state: IncompleteState;`,
    `    readonly state: { readonly unresolved: NonEmptyTuple<RequirementId> };`],

  ['GAP4: search exhaustion loses its unresolved row', CM,
    `    readonly unresolved: NonEmptyTuple<RequirementId>;`,
    `    readonly unresolved: readonly RequirementId[];`],

  ['GAP4: a pareto stop is forced to invent unresolved work', CM,
    `  'pareto-exhausted': {\n    readonly limit: number;`,
    `  'pareto-exhausted': {\n    readonly unresolved: NonEmptyTuple<RequirementId>;\n    readonly limit: number;`],

  ['GAP4: pareto frontier stops being non-empty closed candidates', CM,
    `    readonly frontier: NonEmptyTuple<RealizationCandidateReference>;`,
    `    readonly frontier: readonly RealizationCandidateReference[];`],

  ['GAP4: an unavailable oracle grows an unrelated frontier', CM,
    `  'oracle-unavailable': { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  'oracle-unavailable': { readonly frontier: NonEmptyTuple<RealizationCandidateReference>; readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  // --- hosts: boundary and grounding ---
  ['host authority boundary accepts a free binding row', HO,
    `export type HostAuthorityBoundary<Row extends RequirementRow> = BindingsFor<Row>;`,
    `export type HostAuthorityBoundary<Row extends RequirementRow> = BindingRow;`],

  ['host realm readmits the build realm', HO,
    `export type HostRealm = Exclude<EvidenceRealm, 'build'>;`,
    `export type HostRealm = EvidenceRealm;`],

  ['grounding admits a duplicate provided row', HO,
    `  readonly provides: UniqueRequirements<Provides>;`,
    `  readonly provides: Provides;`],

  ['GROUNDING: admission hides a LiteShip prerequisite', HO,
    `  readonly admit: Signature<Input, HostGroundingInstance<Provides>, HostAdmissionFailure, readonly []>;`,
    `  readonly admit: Signature<Input, HostGroundingInstance<Provides>, HostAdmissionFailure, readonly [ExampleHostRequirement]>;`],

  ['GROUNDING: admission failure channel widens to anything', HO,
    `  readonly admit: Signature<Input, HostGroundingInstance<Provides>, HostAdmissionFailure, readonly []>;`,
    `  readonly admit: Signature<Input, HostGroundingInstance<Provides>, unknown, readonly []>;`],

  ['GROUNDING: admitted instance hands back a free binding row', HO,
    `  readonly bindings: HostAuthorityBoundary<Provides>;`,
    `  readonly bindings: BindingRow;`],

  ['GROUNDING: descriptor row stops being non-empty', HO,
    `  readonly provides: NonEmptyTuple<RequirementId>;`,
    `  readonly provides: readonly RequirementId[];`],

  ['CATALOG: grounding descriptors regress to references', HO,
    `  readonly groundings: readonly HostGroundingDescriptor[];\n  readonly offers: readonly RealizationOfferDescriptor[];\n  readonly contributes:`,
    `  readonly groundings: readonly GroundingReference[];\n  readonly offers: readonly RealizationOfferDescriptor[];\n  readonly contributes:`],

  ['CATALOG: offer descriptors regress to references', HO,
    `  readonly offers: readonly RealizationOfferDescriptor[];\n  readonly contributes:`,
    `  readonly offers: readonly RequirementId[];\n  readonly contributes:`],

  ['SURVIVOR6: deprecated grounded returns on the catalog', HO,
    `  readonly groundings: readonly HostGroundingDescriptor[];\n  readonly offers: readonly RealizationOfferDescriptor[];\n  readonly contributes:`,
    `  readonly groundings: readonly HostGroundingDescriptor[];\n  readonly grounded: readonly RequirementId[];\n  readonly offers: readonly RealizationOfferDescriptor[];\n  readonly contributes:`],

  ['RELATION: host definition decouples from its catalog', HO,
    `  readonly catalog: HostCapabilityCatalog<Id, Realm>;`,
    `  readonly catalog: HostCapabilityCatalog;`],

  ['RELATION: catalog host identity decouples from its parameter', HO,
    `  readonly host: HostReference<Id>;`,
    `  readonly host: HostReference;`],
];

process.exit(runBank('hosts', M).clean ? 0 : 1);
