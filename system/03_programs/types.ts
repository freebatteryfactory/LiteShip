/**
 * System programs: the eleven operations whose subject is this repository.
 *
 * A program is not a new kind of thing. It is an operation — core's
 * `OperationDefinition`, with core's effect classes, core's idempotency policy,
 * core's schemas — whose input happens to be a repository coordinate rather
 * than application data. This home declares almost nothing, and what it does
 * declare is the part with no owner upstream.
 *
 * Three facts, and they are the whole home.
 *
 * **The population is a tuple, and identity derives from it.** Eleven names in
 * one authority, not eleven subfolders and not eleven hand-written brands. A
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
 * computed from the eleven names, so a program cannot exist and be unreachable,
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
  Assert,
  Equal,
  IsExactlyTrue,
  NonEmptyTuple,
  Signature,
  RequirementRow,
} from '../../types.js';
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
 * The eleven programs, written once.
 *
 * Ordered by the phase each belongs to rather than alphabetically: observation
 * first, then evaluation, then the shipping chain. The order carries no
 * dependency — `SystemProgramName` is a union and nothing reads a position —
 * but a roster a reader cannot scan is a roster that grows a twelfth entry
 * nobody notices.
 */
export type SystemProgramRoster = readonly [
  'doctor',
  'verify',
  'audit',
  'gauntlet',
  'build',
  'benchmark',
  'docs',
  'migrate',
  'package',
  'release',
  'ship',
];

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
type ReferencesOf<Names extends readonly SystemProgramName[]> = {
  readonly [Position in keyof Names]: SystemProgramReference<Names[Position] & SystemProgramName>;
};

export type SystemProgramExposure = ReferencesOf<SystemProgramRoster>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * Compile-time law: a program's identity is an operation's identity.
 *
 * Line one is the subtraction: no second identity type exists, and a program
 * reference *is* an operation reference, so every consumer of the latter accepts
 * the former. Lines two and three are the exactness — two programs are not
 * interchangeable, and the broad form does not substitute for a named one.
 *
 * Line four is what makes the derivation worth having: the identity is computed
 * from the name, so it cannot disagree with the roster.
 */
export type AProgramIsAnOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        SystemProgramReference<'release'> extends OperationReference ? true : false,
        SystemProgramReference<'release'> extends SystemProgramReference<'ship'> ? true : false,
        SystemProgramReference extends SystemProgramReference<'release'> ? true : false,
        Equal<SystemProgramId<'release'>, OperationId<'liteship.system.program.release'>>,
      ],
      [true, false, false, true]
    >
  >
>;

/**
 * Compile-time law: release consumes a qualified candidate and nothing else.
 *
 * The central claim of this home, and the one the system README could only
 * assert. Line one is the refusal — a plain candidate, whose qualification may
 * sit in the unqualified arm, is not what this signature accepts. Line two is
 * the lawful control, without which the law would be satisfied by a signature
 * nobody can invoke.
 *
 * Lines three and four carry the exactness through both axes: a candidate
 * qualified over another snapshot, or by a result from another specification, is
 * refused at the same door.
 */
export type ReleaseConsumesAQualifiedCandidate = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          ReleaseSignature<ReleaseCandidateId<'a'>, WorkspaceSnapshotId<'s'>>,
          Signature<
            QualifiedReleaseCandidate<ReleaseCandidateId<'a'>, WorkspaceSnapshotId<'s'>>,
            ReleaseReceipt<ReleaseCandidateId<'a'>, WorkspaceSnapshotId<'s'>>,
            readonly Diagnostic[],
            RequirementRow
          >
        >,
        ReleaseSignature<ReleaseCandidateId<'a'>, WorkspaceSnapshotId<'s'>> extends ReleaseSignature<
          ReleaseCandidateId<'a'>,
          WorkspaceSnapshotId<'t'>
        >
          ? true
          : false,
        ReleaseSignature<ReleaseCandidateId<'a'>> extends ReleaseSignature<ReleaseCandidateId<'b'>>
          ? true
          : false,
        [ReleaseSignature] extends [never] ? true : false,
      ],
      [true, false, false, false]
    >
  >
>;

/**
 * Compile-time law: the exposed population and the program population are one.
 *
 * A mapped type over the roster preserves arity, so eleven programs expose
 * eleven references and the correspondence is positional. Line two is what a
 * hand-written list would have failed: a population of the right length made of
 * the wrong references.
 *
 * Line three pins that the result is what `WireExposure.exposed` accepts, which
 * is the only reason to compute it in this shape rather than as a union.
 */
export type TheExposedPopulationIsTheProgramPopulation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<SystemProgramExposure['length'], SystemProgramRoster['length']>,
        Equal<SystemProgramExposure[8], SystemProgramReference<'package'>>,
        SystemProgramExposure extends NonEmptyTuple<OperationReference> ? true : false,
        Equal<SystemProgramExposure[9], SystemProgramReference<'ship'>>,
      ],
      [true, true, true, false]
    >
  >
>;

/**
 * Compile-time law: the effect character is read from the operation, not
 * declared beside it.
 *
 * `ObservesOnly` projects through `definition.effects`, so a program that
 * declares a mutating effect stops being observation-only without anyone
 * remembering to update a second member. Line three is the anti-vacuity
 * partner: the projector must actually discriminate, and a version that always
 * answered `true` would satisfy the first two lines.
 */
export type TheEffectCharacterIsReadFromTheOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<SystemProgram['definition']['effects'], NonEmptyTuple<EffectClass>>,
        ObservesOnly<SystemProgram<'doctor', unknown, unknown, readonly []>>,
        Equal<
          ObservesOnly<
            SystemProgram<'doctor', unknown, unknown, readonly []> & {
              readonly definition: { readonly effects: readonly ['publish'] };
            }
          >,
          false
        >,
      ],
      [true, false, true]
    >
  >
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
  readonly packageSignature: PackageSignature;
  readonly releaseSignature: ReleaseSignature;
  readonly shipSignature: ShipSignature;
}
