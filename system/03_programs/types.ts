/**
 * System programs: the operations whose subject is this repository.
 *
 * A program is not a new kind of thing. It is an operation — core's
 * `OperationDefinition`, with core's effect classes, core's idempotency policy,
 * core's schemas — whose input happens to be a repository coordinate rather
 * than application data. This home declares only the cross-domain carriers
 * that have no legal owner upstream and otherwise consumes existing products.
 *
 * Four facts, and they are the whole home.
 *
 * **The population is a definition map, and everything derives from it.** One
 * authority, not one subfolder per program and not a hand-written brand each. A
 * program's `OperationId` is `liteship.system.program.${Name}`, computed, so a
 * name added to the roster gets an identity and a name removed loses one.
 *
 * **The release path is a chain of exact products.** `package` consumes a plan
 * and produces a receipt; `release` consumes a *qualified* candidate and
 * produces a release receipt; `ship` consumes a publication plan and produces a
 * publication receipt. Every one threads the snapshot and the assurance
 * specification, so a program cannot be handed a product from another
 * observation or another run.
 *
 * **Cross-domain programs are composed here, once.** Build binds a workspace
 * snapshot, target-owned products, package-manager definitions, and host
 * process receipts at the first home allowed to import them together. Doctor
 * binds repository, consumer, and deployed providers while remaining exactly
 * observational; remediation is a later composition of ordinary operations.
 *
 * That chain is the reason this home waited for `02_wires/cli`. A program
 * projects through a wire, and a contract written before the wire existed would
 * have been a guess about its own consumer.
 *
 * **Exposure derives from the roster.** The CLI wire's exposed population is
 * computed from the definition map, so a program cannot exist and be unreachable,
 * and a wire cannot claim to expose a program that is not in the roster.
 *
 * What this home does *not* own: any privilege. `WireCaller` has an arm naming a
 * system program and confers nothing, and nothing here is parameterized by it.
 * A program crossing the CLI wire takes the path an application operation takes,
 * which is checkable precisely because there is no second path to compare it to.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  CaseOf,
  Hole,
  Named,
  NonEmptyTuple,
  Reference,
  Refine,
  RequirementRow,
  Signature,
} from '../../types.js';
import type { WireDefinition, WireExposure, WireId } from '../../02_wires/types.js';
import type { DirectExchange, DirectMigrationExchange } from '../../02_wires/direct/types.js';
import type { CliDisposition, CliMigrationDisposition } from '../../02_wires/cli/types.js';
import type { HttpMigrationProjection } from '../../02_wires/http/types.js';
import type {
  McpAnswer,
  McpMigrationProjection,
  McpOffer,
  TrustedLocalMcpToolProjection,
} from '../../02_wires/mcp/types.js';
import type {
  EditorDiagnosticExplanationProjection,
  EditorMigrationProjection,
} from '../../02_wires/editor/types.js';
import type { ContentAddress } from '../../00_core/01_encoding/types.js';
import type { Explanation } from '../../00_core/18_inspection/types.js';
import type {
  WorkspaceFileSystem,
  WorkspaceObservationRequirements,
  WorkspacePath,
  WorkspaceSnapshotId,
  WorkspaceSnapshotReference,
} from '../00_workspace/types.js';
import type { AuditProduct, AuditRequirements } from '../01_assurance/00_audit/types.js';
import type { AssuranceResult } from '../01_assurance/01_gauntlet/types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type {
  MigrationAuthorityRequirement,
  MigrationFailure,
  MigrationReport,
  MigrationRequest,
} from '../../00_core/14_compiler/types.js';
import type {
  EffectClass,
  OperationDefinition,
  OperationId,
  OperationInvocation,
  OperationPolicyDecision,
  OperationReference,
  OperationReceipt,
} from '../../00_core/07_operation/types.js';
import type { AssuranceRunSpec } from '../01_assurance/types.js';
import type {
  ChildProcessRequest,
  ChildProcessRequirement,
  ProcessExit,
  ProcessReference,
} from '../../01_hosts/server/01_process/types.js';
import type {
  AllowedEndpoint,
  ServerNetworkRequirement,
} from '../../01_hosts/server/04_network/types.js';
import type {
  EcosystemTargetId,
  EcosystemTargetReference,
  ProducedArtifact,
  TargetCompositionReference,
  TargetParticipation,
} from '../../02_targets/types.js';
import type {
  AstroCompatibilityEvidence,
  AstroTargetId,
} from '../../02_targets/astro/00_integration/types.js';
import type { AstroProjectionDisposition } from '../../02_targets/astro/03_build/types.js';
import type {
  ViteCompatibilityEvidence,
  ViteTargetId,
} from '../../02_targets/vite/00_integration/types.js';
import type { BuildProduct as ViteBuildProduct } from '../../02_targets/vite/05_build/types.js';
import type { DeploymentOutcome } from '../../02_targets/cloudflare/03_deployment/types.js';
import type {
  PackageReceipt,
  PublicationPlan,
  PublicationReceipt,
  QualifiedReleaseCandidate,
  ReleaseCandidateId,
  ReleasePlan,
  ReleaseReceipt,
} from '../02_release/types.js';

// ---------------------------------------------------------------------------
// The population
// ---------------------------------------------------------------------------

/**
 * One entry in the definition map: a name beside the program it names.
 *
 * The pairing is the whole point. A tuple of eleven strings was the previous
 * shape, and every downstream product of it — identity, reference, registry,
 * exposure — derived correctly from a population that said nothing about what
 * any program consumes or produces.
 */
export interface SystemProgramEntry<Name extends string, Program> extends Named<Name> {
  readonly Program: Program;
}

/**
 * The programs whose contracts are earned, each beside its exact contract.
 *
 * This was a tuple of eleven names — `doctor`, `verify`, `audit`, `gauntlet`,
 * `build`, `benchmark`, `docs`, `migrate`, `package`, `release`, `ship` — with
 * every registry entry resolving to `SystemProgram<Name, unknown, unknown,
 * RequirementRow>`. Eleven names, eleven broad placeholders, and the three
 * exact release signatures declared *beside* that registry rather than
 * defining its entries. A bootstrap holding the `release` entry held something
 * that accepted `unknown`.
 *
 * Nine are now earned. `doctor` is one observational program over repository,
 * consumer-application, and deployed-application subjects. `build` delegates
 * one admitted consumer application through a selected Astro or Vite target
 * using one catalogued npm or pnpm definition. `benchmark` and `docs` remain
 * intended capabilities whose output contracts have not yet been quarried.
 * Naming either here would restore exactly the placeholder this map exists to
 * remove — a roster is a promise the compiler checks.
 *
 * Each returns when its complete operation definition is reasoned and consumed,
 * which is one edit to this tuple and nothing else: the roster, the name union,
 * the identities, the references, the registry, and the wire exposure are all
 * derived from here.
 *
 * Ordered causally — observe, evaluate, then the shipping chain — because a
 * roster a reader cannot scan grows an entry nobody notices.
 */
export type SystemProgramDefinitions = readonly [
  SystemProgramEntry<'doctor', DoctorProgram>,
  SystemProgramEntry<'audit', AuditProgram>,
  SystemProgramEntry<'gauntlet', GauntletProgram>,
  SystemProgramEntry<'verify', VerifyProgram>,
  SystemProgramEntry<'build', BuildProgram>,
  SystemProgramEntry<'migrate', MigrateProgram>,
  SystemProgramEntry<'package', PackageProgram>,
  SystemProgramEntry<'release', ReleaseProgram>,
  SystemProgramEntry<'ship', ShipProgram>,
];

/**
 * The names of a definition map, positionally.
 *
 * Through a generic parameter rather than mapping the concrete tuple alias
 * directly. A homomorphic mapped type preserves tuple arity only when its
 * source is a naked type parameter; mapping the alias produces an object that
 * answers by index and fails on `length`, and this is the third time that has
 * been the answer in this repository.
 */
type NamesOf<Entries extends readonly SystemProgramEntry<string, unknown>[]> = {
  readonly [Position in keyof Entries]: Entries[Position]['name'];
};

/** The population, derived from the definition map. */
export type SystemProgramRoster = NamesOf<SystemProgramDefinitions>;

/** The program names, derived from the roster so the population is written once. */
export type SystemProgramName = SystemProgramRoster[number];

/**
 * A program's identity, computed from its name.
 *
 * An `OperationId` in a reserved namespace, not a second identity type beside
 * it. That is the central subtraction of this home: a program *is* an
 * operation, so it carries an operation's identity, and every consumer that
 * already accepts an `OperationReference` accepts a program without knowing it
 * is one.
 *
 * Deriving it from the name also means the roster is the only place a program
 * is introduced. A hand-written brand per program would be eleven declarations
 * that can disagree with the roster, which is the shape this repository spent a
 * topology fold removing.
 */
export type SystemProgramId<Name extends SystemProgramName = SystemProgramName> =
  OperationId<`liteship.system.program.${Name}`>;

/** Reference to one program, exact over which. */
export type SystemProgramReference<Name extends SystemProgramName = SystemProgramName> =
  OperationReference<SystemProgramId<Name>>;

// ---------------------------------------------------------------------------
// A program is an operation
// ---------------------------------------------------------------------------

/**
 * One system program.
 *
 * The definition is core's, whole. Every member an operation needs — schemas,
 * effect classes, idempotency policy, cancellability, reversibility — is
 * supplied there rather than restated here, so a program that lies about its
 * effects lies in the same field an application operation would, and the same
 * policy machinery reads it.
 *
 * The name is the only member this home adds, and it is what binds the
 * definition back to the roster.
 */
export interface SystemProgram<
  Name extends SystemProgramName = SystemProgramName,
  Input = unknown,
  Output = unknown,
  Requirements extends RequirementRow = RequirementRow,
  Failure = readonly Diagnostic[],
> {
  readonly name: Name;
  readonly definition: OperationDefinition<
    Input,
    Output,
    Failure,
    Requirements,
    SystemProgramId<Name>
  >;
}

/**
 * Whether a program only observes.
 *
 * Read off core's `EffectClass` rather than declared beside it. `doctor` and
 * `verify` observe; `migrate` and `ship` do not, and the difference already has
 * a home in the operation definition. A second `readOnly: boolean` here would be
 * one more fact that can disagree with the effects it summarizes.
 */
export type ObservesOnly<Program extends SystemProgram> =
  Program['definition']['effects'][number] extends Extract<EffectClass, 'observe'> ? true : false;

/** Pin a rostered operation to the effect population its contract actually has. */
type ProgramWithEffects<
  Program extends { readonly definition: { readonly effects: NonEmptyTuple<EffectClass> } },
  Effects extends NonEmptyTuple<EffectClass>,
> =
  Refine<
    Program,
    {
      readonly definition: Refine<
        Program['definition'],
        { readonly effects: Effects }
      >;
    }
  >;

// ---------------------------------------------------------------------------
// Consumer application build
// ---------------------------------------------------------------------------

/** Identity of one LiteShip consumer application as a system-program subject. */
export type ConsumerApplicationId<Name extends string = string> = Brand<
  Name,
  'liteship.system.consumer-application-id'
>;
export type ConsumerApplicationReference<
  Id extends ConsumerApplicationId = ConsumerApplicationId,
> = Reference<'consumer-application', Id>;

/** Address of the admitted LiteShip application marker and configuration. */
export type ConsumerApplicationConfigurationAddress = ContentAddress<
  'application/vnd.liteship.consumer-application-configuration+cbor'
>;

/**
 * One consumer application at one immutable workspace observation.
 *
 * This home is the first allowed to bind application meaning to a system
 * workspace snapshot: targets may not import `system/` back. The marker is an
 * admitted addressed product, never a path string or a boolean claiming that a
 * file existed.
 */
export interface ConsumerApplicationSnapshot<
  Application extends ConsumerApplicationId = ConsumerApplicationId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
> {
  readonly application: ConsumerApplicationReference<Application>;
  readonly workspace: WorkspaceSnapshotReference<Snapshot>;
  readonly configuration: ConsumerApplicationConfigurationAddress;
}

export type BuildRequestId<Name extends string = string> = Brand<
  Name,
  'liteship.system.build-request-id'
>;
export type BuildRequestReference<Id extends BuildRequestId = BuildRequestId> = Reference<
  'system-build-request',
  Id
>;

/** Explicit target selection or evidence-driven discovery. */
export type BuildTargetChoice = Algebra<{
  discover: Record<never, never>;
  explicit: { readonly target: EcosystemTargetReference<AstroTargetId | ViteTargetId> };
}>;

/** Build one exact consumer application snapshot. */
export interface BuildRequest {
  readonly id: BuildRequestReference;
  readonly application: ConsumerApplicationSnapshot;
  readonly target: BuildTargetChoice;
}

export type QualifiedPackageManagerName = 'npm' | 'pnpm';
export type PackageManagerId<
  Name extends QualifiedPackageManagerName = QualifiedPackageManagerName,
> = Brand<Name, 'liteship.system.package-manager-id'>;
export type PackageManagerReference<
  Name extends QualifiedPackageManagerName = QualifiedPackageManagerName,
> = Reference<'package-manager', PackageManagerId<Name>>;
export type PackageManagerDefinitionAddress = ContentAddress<
  'application/vnd.liteship.package-manager-definition+cbor'
>;

/** Stable lineage and exact definition of one qualified package-manager adapter. */
export interface PackageManagerCoordinate<
  Name extends QualifiedPackageManagerName = QualifiedPackageManagerName,
> {
  readonly id: PackageManagerReference<Name>;
  readonly definition: PackageManagerDefinitionAddress;
}

/** Target-local binary request before a manager renders its exact invocation. */
export interface PackageBinaryRequest {
  readonly binary: 'astro' | 'vite';
  readonly arguments: readonly ['build'];
}

/** One manager adapter: exact identity, addressed semantics, one renderer. */
export interface PackageManagerDefinition<
  Name extends QualifiedPackageManagerName = QualifiedPackageManagerName,
> {
  readonly coordinate: PackageManagerCoordinate<Name>;
  readonly render: Signature<
    PackageBinaryRequest,
    ChildProcessRequest,
    NonEmptyTuple<Diagnostic>
  >;
}

/** The initially qualified manager population. Unsupported managers have no row. */
export type PackageManagerCatalog = readonly [
  PackageManagerDefinition<'npm'>,
  PackageManagerDefinition<'pnpm'>,
];

export type PackageManagerCatalogRequirement = Hole<
  'liteship.system.build.package-managers',
  PackageManagerCatalog
>;

export type BuildTargetAdapterId<Name extends string = string> = Brand<
  Name,
  'liteship.system.build-target-adapter-id'
>;
export type BuildTargetAdapterReference<
  Id extends BuildTargetAdapterId = BuildTargetAdapterId,
> = Reference<'build-target-adapter', Id>;
export type BuildTargetAdapterDefinitionAddress = ContentAddress<
  'application/vnd.liteship.build-target-adapter-definition+cbor'
>;

/** Stable lineage and exact addressed semantics of one target adapter. */
export interface BuildTargetAdapterCoordinate<
  Id extends BuildTargetAdapterId = BuildTargetAdapterId,
> {
  readonly id: BuildTargetAdapterReference<Id>;
  readonly definition: BuildTargetAdapterDefinitionAddress;
}

/** Target-neutral admitted output: every produced artifact already owns its slot. */
export interface BuildArtifactAdmission {
  readonly filled: NonEmptyTuple<ProducedArtifact>;
  readonly evidence: ContentAddress<'application/vnd.liteship.target-build-evidence+cbor'>;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * One exact adapter from a target-owned successful product into the neutral
 * build carrier. Vite's `BuildProduct` is consequently an input to its row,
 * never the universal system result.
 */
export interface BuildTargetAdapter<
  Target extends EcosystemTargetId,
  NativeProduct,
  Compatibility,
  Id extends BuildTargetAdapterId,
  Binary extends PackageBinaryRequest['binary'],
> {
  readonly coordinate: BuildTargetAdapterCoordinate<Id>;
  readonly target: EcosystemTargetReference<Target>;
  readonly binary: Binary;
  readonly compatibility: Compatibility;
  readonly admit: Signature<NativeProduct, BuildArtifactAdmission, NonEmptyTuple<Diagnostic>>;
}

export type AstroBuildTargetAdapter = BuildTargetAdapter<
  AstroTargetId,
  CaseOf<AstroProjectionDisposition, 'produced'>,
  AstroCompatibilityEvidence,
  BuildTargetAdapterId<'astro'>,
  'astro'
>;
export type ViteBuildTargetAdapter = BuildTargetAdapter<
  ViteTargetId,
  CaseOf<ViteBuildProduct, 'built'>,
  ViteCompatibilityEvidence,
  BuildTargetAdapterId<'vite'>,
  'vite'
>;

/** The initially supported build-target population, with no ordered fallback. */
export type BuildTargetCatalog = readonly [AstroBuildTargetAdapter, ViteBuildTargetAdapter];
export type BuildTargetCatalogRequirement = Hole<
  'liteship.system.build.targets',
  BuildTargetCatalog
>;

/** Which qualified manager the application selected. */
export type PackageManagerSelection = Algebra<{
  npm: { readonly manager: PackageManagerCoordinate<'npm'> };
  pnpm: { readonly manager: PackageManagerCoordinate<'pnpm'> };
}>;

/** Which target composition was selected before its host build ran. */
export type BuildTargetSelection = Algebra<{
  astro: {
    readonly adapter: BuildTargetAdapterCoordinate<BuildTargetAdapterId<'astro'>>;
    readonly composition: TargetCompositionReference;
    readonly participation: TargetParticipation<AstroTargetId>;
  };
  vite: {
    readonly adapter: BuildTargetAdapterCoordinate<BuildTargetAdapterId<'vite'>>;
    readonly composition: TargetCompositionReference;
    readonly participation: TargetParticipation<ViteTargetId>;
  };
}>;

type BuildRequestFor<Target extends AstroTargetId | ViteTargetId> = Refine<
  BuildRequest,
  {
    readonly target:
      | CaseOf<BuildTargetChoice, 'discover'>
      | Refine<
          CaseOf<BuildTargetChoice, 'explicit'>,
          { readonly target: EcosystemTargetReference<Target> }
        >;
  }
>;

/**
 * The complete selected execution plan, correlated to the request. An explicit
 * Astro request cannot inhabit the Vite arm, while discovery can lawfully
 * produce either after exactly one compatible candidate remains.
 */
export type BuildExecutionPlan = Algebra<{
  astro: {
    readonly request: BuildRequestFor<AstroTargetId>;
    readonly manager: PackageManagerSelection;
    readonly target: CaseOf<BuildTargetSelection, 'astro'>;
  };
  vite: {
    readonly request: BuildRequestFor<ViteTargetId>;
    readonly manager: PackageManagerSelection;
    readonly target: CaseOf<BuildTargetSelection, 'vite'>;
  };
}>;

export type BuildExecutionReceiptAddress = ContentAddress<
  'application/vnd.liteship.system-build-execution-receipt+cbor'
>;
export type NonzeroProcessExitCode = Brand<number, 'liteship.nonzero-process-exit-code'>;

/** Host build completed successfully, distinct from the operation receipt. */
export interface BuildExecutionReceipt {
  readonly process: ProcessReference;
  readonly exit: CaseOf<ProcessExit, 'exited'>;
  readonly exitCode: 0;
  readonly address: BuildExecutionReceiptAddress;
}

/** Target-neutral successful consumer build. */
export interface BuildReport {
  readonly plan: BuildExecutionPlan;
  readonly product: BuildArtifactAdmission;
  readonly receipt: BuildExecutionReceipt;
  readonly explanation: Explanation;
}

type AtLeastTwo<Value> = readonly [Value, Value, ...Value[]];

export type UnsupportedPackageManager = Algebra<{
  yarn: { readonly source: 'manifest' | 'lockfile' | 'invocation' };
  bun: { readonly source: 'manifest' | 'lockfile' | 'invocation' };
  other: {
    readonly name: Brand<string, 'liteship.unqualified-package-manager-name'>;
    readonly source: 'manifest' | 'lockfile' | 'invocation';
  };
}>;

/** Why no successful consumer build report exists. */
export type BuildFailure = Algebra<{
  'not-consumer-application': {
    readonly snapshot: WorkspaceSnapshotReference;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'no-compatible-target': {
    readonly request: BuildRequest;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'ambiguous-target': {
    readonly request: BuildRequest;
    readonly candidates: AtLeastTwo<BuildTargetAdapterCoordinate>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'unsupported-package-manager': {
    readonly observed: UnsupportedPackageManager;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'ambiguous-package-manager': {
    readonly observed: AtLeastTwo<string>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'package-manager-admission-failed': {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'invalid-package-manifest': {
    readonly manifest: WorkspacePath;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'launch-failed': {
    readonly plan: BuildExecutionPlan;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'target-build-nonzero': {
    readonly plan: BuildExecutionPlan;
    readonly process: ProcessReference;
    readonly exit: CaseOf<ProcessExit, 'exited'>;
    readonly exitCode: NonzeroProcessExitCode;
    readonly receipt: BuildExecutionReceiptAddress;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'target-product-admission-failed': {
    readonly plan: BuildExecutionPlan;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

/** Exact capabilities consumed by the build orchestration. */
export type BuildRequirements = readonly [
  WorkspaceFileSystem,
  ChildProcessRequirement,
  PackageManagerCatalogRequirement,
  BuildTargetCatalogRequirement,
];

/** Build a consumer application; never build the LiteShip repository itself. */
export type BuildProgram = ProgramWithEffects<
  SystemProgram<'build', BuildRequest, BuildReport, BuildRequirements, BuildFailure>,
  readonly ['execute', 'create']
>;

/** Exact initial build exposures. HTTP and editor are absent by construction. */
export interface BuildProgramProjection {
  readonly direct: DirectExchange<BuildReport, BuildFailure, SystemProgramId<'build'>>;
  readonly cli: CliDisposition<BuildReport, BuildFailure, SystemProgramId<'build'>>;
  readonly trustedLocalMcp: TrustedLocalMcpToolProjection<
    BuildReport,
    BuildFailure,
    SystemProgramId<'build'>
  >;
}

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------

/** Deployed subjects are admitted deployments or admitted host endpoints. */
export type DeployedApplicationCoordinate = Algebra<{
  deployment: { readonly deployment: CaseOf<DeploymentOutcome, 'deployed'> };
  endpoint: { readonly endpoint: AllowedEndpoint };
}>;

/** One doctor program, three exact subject families. */
export type DoctorSubject = Algebra<{
  repository: { readonly snapshot: WorkspaceSnapshotReference };
  'consumer-application': { readonly application: ConsumerApplicationSnapshot };
  'deployed-application': { readonly deployed: DeployedApplicationCoordinate };
}>;

/** Preserve present, absent, and unreadable as different evidence states. */
export type DoctorReadout<Value> = Algebra<{
  ok: { readonly value: Value };
  absent: Record<never, never>;
  unreadable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

export type DoctorProbeId<Name extends string = string> = Brand<
  Name,
  'liteship.system.doctor-probe-id'
>;
export type DoctorProbeReference<Id extends DoctorProbeId = DoctorProbeId> = Reference<
  'doctor-probe',
  Id
>;

/** One probe's observation, with no boolean collapsing unreadable into absent. */
export interface DoctorObservation {
  readonly probe: DoctorProbeReference;
  readonly readout: DoctorReadout<ContentAddress>;
}

/** Proposed ordinary operation; approval remains core operation policy's. */
export interface DoctorRemediationProposal<Op extends OperationId = OperationId> {
  readonly invocation: OperationInvocation<unknown, Op>;
  readonly explanation: Explanation;
}

interface DoctorReportProduct<
  Subject extends DoctorSubject,
  Diagnostics extends readonly Diagnostic[],
> {
  readonly subject: Subject;
  readonly observations: readonly DoctorObservation[];
  readonly diagnostics: Diagnostics;
  readonly explanation: Explanation;
  readonly proposedRemediations: readonly DoctorRemediationProposal[];
}

/**
 * A complete observational diagnosis. The conclusion and its diagnostic
 * population are one algebra: caution and blocked cannot be emitted empty,
 * while ready cannot carry findings that its conclusion ignored.
 */
export type DoctorReport<Subject extends DoctorSubject = DoctorSubject> = Algebra<{
  ready: DoctorReportProduct<Subject, readonly []>;
  caution: DoctorReportProduct<Subject, NonEmptyTuple<Diagnostic>>;
  blocked: DoctorReportProduct<Subject, NonEmptyTuple<Diagnostic>>;
}>;

/** Failures of diagnosis itself; a blocked environment remains a report. */
export type DoctorFailure = Algebra<{
  'provider-unavailable': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  'subject-admission-refused': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  'probe-execution-failed': {
    readonly probe?: DoctorProbeReference;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'report-admission-failed': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

export type DoctorProviderId<Name extends string = string> = Brand<
  Name,
  'liteship.system.doctor-provider-id'
>;
export type DoctorProviderReference<Id extends DoctorProviderId = DoctorProviderId> = Reference<
  'doctor-provider',
  Id
>;
export type DoctorProviderDefinitionAddress = ContentAddress<
  'application/vnd.liteship.doctor-provider-definition+cbor'
>;

export interface DoctorProviderCoordinate<Id extends DoctorProviderId = DoctorProviderId> {
  readonly id: DoctorProviderReference<Id>;
  readonly definition: DoctorProviderDefinitionAddress;
}

/** One subject-specific diagnostic provider with its own exact prerequisites. */
export interface DoctorProviderDefinition<
  Tag extends DoctorSubject['_tag'],
  Requirements extends RequirementRow,
> {
  readonly coordinate: DoctorProviderCoordinate<DoctorProviderId<Tag>>;
  readonly subject: Tag;
  readonly requirements: Requirements;
  readonly diagnose: Signature<
    CaseOf<DoctorSubject, Tag>,
    DoctorReport<CaseOf<DoctorSubject, Tag>>,
    DoctorFailure,
    Requirements
  >;
}

export type RepositoryDoctorProvider = DoctorProviderDefinition<
  'repository',
  WorkspaceObservationRequirements
>;
export type ConsumerApplicationDoctorProvider = DoctorProviderDefinition<
  'consumer-application',
  readonly [WorkspaceFileSystem, ChildProcessRequirement]
>;
export type DeployedApplicationDoctorProvider = DoctorProviderDefinition<
  'deployed-application',
  readonly [ServerNetworkRequirement]
>;

/** The subject selects one provider; catalog order never selects a winner. */
export type DoctorProviderCatalog = readonly [
  RepositoryDoctorProvider,
  ConsumerApplicationDoctorProvider,
  DeployedApplicationDoctorProvider,
];

export interface DoctorAuthority {
  readonly providers: DoctorProviderCatalog;
  readonly diagnose: Signature<DoctorSubject, DoctorReport, DoctorFailure>;
}

export type DoctorAuthorityRequirement = Hole<
  'liteship.system.doctor',
  DoctorAuthority
>;

/** Doctor only observes; a blocked conclusion is still a successful diagnosis. */
export type DoctorProgram = ProgramWithEffects<
  SystemProgram<
    'doctor',
    DoctorSubject,
    DoctorReport,
    readonly [DoctorAuthorityRequirement],
    DoctorFailure
  >,
  readonly ['observe']
>;

/** One proposed remediation beside the ordinary operation-policy decision. */
export interface DoctorRemediationDecision<Op extends OperationId = OperationId> {
  readonly proposal: DoctorRemediationProposal<Op>;
  readonly policy: OperationPolicyDecision<Op>;
}

/** One policy-decided remediation and the ordinary operation receipt it produced. */
export interface DoctorRemediationApplication<Op extends OperationId = OperationId> {
  readonly decision: DoctorRemediationDecision<Op>;
  readonly receipt: OperationReceipt<unknown, unknown, Op>;
}

/**
 * `doctor --fix` is composition, not a mutating doctor arm: diagnose, consider
 * policy decisions, invoke ordinary operations, and diagnose again.
 */
export interface DoctorRemediationRun<Subject extends DoctorSubject> {
  readonly before: DoctorReport<Subject>;
  readonly decisions: readonly DoctorRemediationDecision[];
  readonly applications: readonly DoctorRemediationApplication[];
  readonly after: DoctorReport<Subject>;
}

export type DoctorRemediationComposition = Algebra<{
  repository: { readonly run: DoctorRemediationRun<CaseOf<DoctorSubject, 'repository'>> };
  'consumer-application': {
    readonly run: DoctorRemediationRun<CaseOf<DoctorSubject, 'consumer-application'>>;
  };
  'deployed-application': {
    readonly run: DoctorRemediationRun<CaseOf<DoctorSubject, 'deployed-application'>>;
  };
}>;

/** Exact initial doctor exposures. HTTP is absent by construction. */
export interface DoctorProgramProjection {
  readonly direct: DirectExchange<DoctorReport, DoctorFailure, SystemProgramId<'doctor'>>;
  readonly cli: CliDisposition<DoctorReport, DoctorFailure, SystemProgramId<'doctor'>>;
  readonly mcp: {
    readonly offer: McpOffer<SystemProgramId<'doctor'>, 'tool'>;
    readonly answer: McpAnswer<DoctorReport, DoctorFailure, SystemProgramId<'doctor'>>;
  };
  readonly editor: EditorDiagnosticExplanationProjection<
    DoctorReport,
    SystemProgramId<'doctor'>
  >;
}

// ---------------------------------------------------------------------------
// The release path
// ---------------------------------------------------------------------------

/**
 * Packaging: a plan in, a receipt out, one snapshot throughout.
 *
 * The plan already names the snapshot and the receipt already carries the plan,
 * so this signature adds no coordinate of its own. It exists to say which
 * program consumes which, and to be the first link a law can walk.
 */
export type PackageSignature<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Requirements extends RequirementRow = RequirementRow,
> = Signature<ReleasePlan<Snapshot>, PackageReceipt<Snapshot>, readonly Diagnostic[], Requirements>;

/**
 * Releasing: a **qualified** candidate in, a release receipt out.
 *
 * This is the obligation the system README carried in prose and could not
 * enforce, and it is now the input type. `release` cannot be invoked with a
 * candidate whose qualification is in the unqualified arm, because such a
 * candidate is not a `QualifiedReleaseCandidate` and there is no other door.
 *
 * The specification is a parameter for the same reason the snapshot is. A
 * passing result means every check the run *required* was satisfied, so a run
 * that required nothing also passes — and a release program declared over an
 * exact specification cannot accept a candidate qualified by a different one.
 *
 * What the type still cannot do is force a concrete release program to be
 * declared at an exact specification rather than at the broad default. The
 * broad form is an erased catalog shape and it is correct for a catalog. That a
 * governed release path must not use it is an obligation on whoever writes the
 * program, and it is in the README as one.
 */
export type ReleaseSignature<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
  Requirements extends RequirementRow = RequirementRow,
> = Signature<
  QualifiedReleaseCandidate<Id, Snapshot, Spec>,
  ReleaseReceipt<Id, Snapshot, Spec>,
  readonly Diagnostic[],
  Requirements
>;

/**
 * Shipping: a publication plan in, a publication receipt out.
 *
 * The plan carries the release receipt, so shipping something that was never
 * released is unrepresentable at this signature without any assertion here —
 * `02_release` already made it so, and this home consumes that rather than
 * re-checking it.
 */
export type ShipSignature<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
  Requirements extends RequirementRow = RequirementRow,
> = Signature<
  PublicationPlan<Id, Snapshot, Spec>,
  PublicationReceipt<Id, Snapshot, Spec>,
  readonly Diagnostic[],
  Requirements
>;

// ---------------------------------------------------------------------------
// The nine programs
//
// The request shapes for `gauntlet` and `verify` are declared here rather than
// in the homes that own their products, and that placement is forced. Gauntlet
// evaluates an audit product, but `01_gauntlet` may not import `00_audit` —
// they are siblings, and sibling exclusion is the rule that kept the
// predecessor's Cloudflare package from losing its independent story. This
// home is downstream of both and is the first place allowed to name them
// together, which is exactly what it is for: it says which program consumes
// and produces which, and declares none of the products themselves.
// ---------------------------------------------------------------------------

/** What `gauntlet` evaluates: one acquired product against one run's checks. */
export interface GauntletRequest<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> {
  readonly product: AuditProduct<Snapshot>;
  readonly spec: Spec;
}

/**
 * What `verify` runs: one snapshot against one run's checks.
 *
 * Verify is audit and gauntlet in one invocation, so it takes the coordinate
 * rather than the product — acquiring the product is its first half. That is
 * why its requirement row is audit's: evaluation needs no capability, and
 * whoever reads the repository does.
 */
export interface VerifyRequest<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> {
  readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
  readonly spec: Spec;
}

/** Acquire every fact about one snapshot. */
export type AuditProgram<Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId> = SystemProgram<
  'audit',
  WorkspaceSnapshotReference<Snapshot>,
  AuditProduct<Snapshot>,
  AuditRequirements<Snapshot>
>;

/**
 * Evaluate an acquired product against one run specification.
 *
 * The requirement row is empty, and that is the claim `01_gauntlet` makes about
 * itself in prose: evaluation needs no compiler lane, no filesystem, and no
 * source control, so it runs wherever the facts can be shipped. Here that
 * sentence is a closed tuple with nothing in it.
 */
export type GauntletProgram<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = SystemProgram<'gauntlet', GauntletRequest<Snapshot, Spec>, AssuranceResult<Snapshot, Spec>, readonly []>;

/** Acquire and evaluate in one invocation. */
export type VerifyProgram<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = SystemProgram<
  'verify',
  VerifyRequest<Snapshot, Spec>,
  AssuranceResult<Snapshot, Spec>,
  AuditRequirements<Snapshot>
>;

/** Interpret one external source without applying the admitted meaning. */
export type MigrateProgram = ProgramWithEffects<
  SystemProgram<
    'migrate',
    MigrationRequest,
    MigrationReport,
    readonly [MigrationAuthorityRequirement],
    MigrationFailure
  >,
  readonly ['create']
>;

/**
 * Real compile-use composition: one migration program identity projected
 * through every owner-ratified wire, with no wire importing system back.
 */
export interface MigrateProgramProjection {
  readonly direct: DirectMigrationExchange<SystemProgramId<'migrate'>>;
  readonly cli: CliMigrationDisposition<SystemProgramId<'migrate'>>;
  readonly http: HttpMigrationProjection<SystemProgramId<'migrate'>>;
  readonly mcp: McpMigrationProjection<SystemProgramId<'migrate'>>;
  readonly editor: EditorMigrationProjection<SystemProgramId<'migrate'>>;
}

/** Pack a plan into distributables. */
export type PackageProgram<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Requirements extends RequirementRow = RequirementRow,
> = SystemProgram<'package', ReleasePlan<Snapshot>, PackageReceipt<Snapshot>, Requirements>;

/**
 * Release a qualified candidate.
 *
 * The input is `QualifiedReleaseCandidate`, so the registry entry for
 * `release` is the thing that cannot be invoked with an unqualified candidate.
 * That property used to live on `ReleaseSignature`, declared beside a registry
 * whose `release` entry accepted `unknown` — the guarantee was real and was
 * about a type nothing dispatched through.
 */
export type ReleaseProgram<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
  Requirements extends RequirementRow = RequirementRow,
> = SystemProgram<
  'release',
  QualifiedReleaseCandidate<Id, Snapshot, Spec>,
  ReleaseReceipt<Id, Snapshot, Spec>,
  Requirements
>;

/** Publish what a release produced. */
export type ShipProgram<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
  Requirements extends RequirementRow = RequirementRow,
> = SystemProgram<
  'ship',
  PublicationPlan<Id, Snapshot, Spec>,
  PublicationReceipt<Id, Snapshot, Spec>,
  Requirements
>;

// ---------------------------------------------------------------------------
// Exposure
// ---------------------------------------------------------------------------

/**
 * The operation references a wire exposes for the program population.
 *
 * A mapped type over the roster, so the exposed population and the program
 * population are one population. A wire cannot expose a program the roster does
 * not name, and a program cannot exist unreachable — which is the failure mode
 * a hand-written exposure list arrives at within two additions.
 *
 * This is the shape `WireExposure.exposed` wants, and a CLI wire that exposes
 * the system programs assigns this to it directly.
 */
type ReferencesOf<Entries extends readonly SystemProgramEntry<SystemProgramName, unknown>[]> = {
  readonly [Position in keyof Entries]: SystemProgramReference<Entries[Position]['name']>;
};

export type SystemProgramExposure = ReferencesOf<SystemProgramDefinitions>;

/**
 * A wire that projects the system programs, and exactly those.
 *
 * This is the consumer `SystemProgramExposure` did not have. The mapped type
 * produced the right shape, `WireExposure.exposed` accepted that shape, and
 * nothing ever put one into the other — so the home's own claim, that a wire
 * cannot expose a program the roster does not name, was false. `exposed` is
 * `NonEmptyTuple<OperationReference>`, which admits any operations at all, in
 * any order, including none of these.
 *
 * A wire definition refined this way cannot. Its exposed population *is* the
 * derived one, positionally, so a wire claiming to project the system programs
 * projects the population the definition map declares or does not typecheck.
 *
 * The withheld population stays open. A wire that projects the programs and
 * also withholds some application operation is ordinary, and constraining what
 * a wire declines would be this home reaching across the boundary into the
 * wire's own catalog.
 */
export type SystemProgramWire<Id extends WireId = WireId> = Refine<
  WireDefinition<Id>,
  { readonly exposure: Refine<WireExposure, { readonly exposed: SystemProgramExposure }> }
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the root system topology. */
export interface ProgramsTypeSurface {
  readonly roster: SystemProgramRoster;
  readonly name: SystemProgramName;
  readonly program: SystemProgram;
  readonly reference: SystemProgramReference;
  readonly exposure: SystemProgramExposure;
  readonly consumerApplication: ConsumerApplicationSnapshot;
  readonly packageManagers: PackageManagerCatalog;
  readonly buildTargets: BuildTargetCatalog;
  readonly build: BuildProgram;
  readonly buildProjection: BuildProgramProjection;
  readonly doctorSubject: DoctorSubject;
  readonly doctorReadout: DoctorReadout<unknown>;
  readonly doctorProviders: DoctorProviderCatalog;
  readonly doctor: DoctorProgram;
  readonly doctorProjection: DoctorProgramProjection;
  readonly doctorRemediation: DoctorRemediationComposition;
  readonly migrate: MigrateProgram;
  readonly migrateProjection: MigrateProgramProjection;
  readonly packageSignature: PackageSignature;
  readonly releaseSignature: ReleaseSignature;
  readonly shipSignature: ShipSignature;
}
