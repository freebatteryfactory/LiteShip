/**
 * System programs: the operations whose subject is this repository.
 *
 * A program is not a new kind of thing. It is an operation — core's
 * `OperationDefinition`, with core's effect classes, core's idempotency policy,
 * core's schemas — whose input happens to be a repository coordinate rather
 * than application data. This home declares almost nothing, and what it does
 * declare is the part with no owner upstream.
 *
 * Three facts, and they are the whole home.
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
  Named,
  RequirementRow,
  Signature,
} from '../../types.js';
import type { WorkspaceSnapshotReference } from '../00_workspace/types.js';
import type { AuditProduct, AuditRequirements } from '../01_assurance/00_audit/types.js';
import type { AssuranceResult } from '../01_assurance/01_gauntlet/types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type {
  EffectClass,
  OperationDefinition,
  OperationId,
  OperationReference,
} from '../../00_core/07_operation/types.js';
import type { WorkspaceSnapshotId } from '../00_workspace/types.js';
import type { AssuranceRunSpec } from '../01_assurance/types.js';
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
 * Six, because six are the ones whose input, output, and prerequisites are
 * presently readable off types that exist: `AuditProduct`, `AssuranceResult`,
 * and the package, release, and publication chain. `doctor`, `build`,
 * `benchmark`, `docs`, and `migrate` are intended system capabilities and their
 * contracts are not yet reasoned. Naming them here would restore exactly the
 * placeholder this map exists to remove — a roster is a promise the compiler
 * checks, and a promise about a contract nobody has written is the shape this
 * repository keeps paying for.
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
  SystemProgramEntry<'audit', AuditProgram>,
  SystemProgramEntry<'gauntlet', GauntletProgram>,
  SystemProgramEntry<'verify', VerifyProgram>,
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
> {
  readonly name: Name;
  readonly definition: OperationDefinition<
    Input,
    Output,
    readonly Diagnostic[],
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
// The six programs
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
  readonly packageSignature: PackageSignature;
  readonly releaseSignature: ReleaseSignature;
  readonly shipSignature: ShipSignature;
}
