/**
 * Compile-time laws for `system/03_programs`.
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

import type { Diagnostic } from '../../00_core/00_error/types.js';
import type {
  EffectClass,
  OperationId,
  OperationReference,
} from '../../00_core/07_operation/types.js';
import type {
  MigrationAuthorityRequirement,
  MigrationFailure,
  MigrationReport,
  MigrationRequest,
} from '../../00_core/14_compiler/types.js';
import type {
  Assert,
  CaseOf,
  Equal,
  FailureOf,
  HoleContract,
  InputOf,
  IsExactlyTrue,
  NonEmptyTuple,
  OutputOf,
  Refine,
  RequirementRow,
  RequirementsOf,
  Signature,
  TagOf,
} from '../../types.js';
import type { DirectMigrationExchange } from '../../02_wires/direct/types.js';
import type { ChildProcessRequirement } from '../../01_hosts/server/01_process/types.js';
import type { ServerNetworkRequirement } from '../../01_hosts/server/04_network/types.js';
import type { WorkspaceFileSystem, WorkspaceObservationRequirements } from '../00_workspace/types.js';
import type { BuildProduct as ViteBuildProduct } from '../../02_targets/vite/05_build/types.js';
import type { AstroTargetId } from '../../02_targets/astro/00_integration/types.js';
import type { ViteTargetId } from '../../02_targets/vite/00_integration/types.js';
import type { EcosystemTargetReference } from '../../02_targets/types.js';
import type { WireDefinition, WireExposure } from '../../02_wires/types.js';
import type { WorkspaceSnapshotId } from '../00_workspace/types.js';
import type {
  AssuranceRunSpec,
  AssuranceRunSpecId,
  FailureClassId,
  FailureClassReference,
  GateId,
  GateRevisionId,
  PlannedCheck,
} from '../01_assurance/types.js';
import type { AuditProduct } from '../01_assurance/00_audit/types.js';
import type { QualifiedReleaseCandidate, ReleaseCandidateId, ReleaseReceipt } from '../02_release/types.js';
import type {
  AuditProgram,
  BuildFailure,
  BuildExecutionPlan,
  BuildProgram,
  BuildProgramProjection,
  BuildRequirements,
  BuildTargetCatalog,
  BuildTargetChoice,
  ConsumerApplicationDoctorProvider,
  DeployedApplicationDoctorProvider,
  DoctorAuthority,
  DoctorAuthorityRequirement,
  DoctorFailure,
  DoctorProgram,
  DoctorProgramProjection,
  DoctorProviderCatalog,
  DoctorReadout,
  DoctorRemediationComposition,
  DoctorReport,
  DoctorSubject,
  GauntletProgram,
  GauntletRequest,
  MigrateProgram,
  MigrateProgramProjection,
  ObservesOnly,
  PackageManagerCatalog,
  RepositoryDoctorProvider,
  UnsupportedPackageManager,
  ReleaseProgram,
  ReleaseSignature,
  SystemProgram,
  SystemProgramExposure,
  SystemProgramId,
  SystemProgramReference,
  SystemProgramRoster,
  SystemProgramWire,
  VerifyProgram,
} from './types.js';

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
 * A mapped type over the definition map preserves arity, so the exposure and
 * the population are the same length and the correspondence is positional.
 * Line two is what a hand-written list would have failed: a population of the
 * right length made of the wrong references.
 *
 * Line three pins that the result is what `WireExposure.exposed` accepts, which
 * is the only reason to compute it in this shape rather than as a union.
 *
 * Lines four and five are the tail. The previous version checked index eight
 * positively and index nine negatively and never read the last position at
 * all, so a mapping that mis-produced the final entry passed. Here the same
 * index is refused for the wrong name and required for the right one.
 */
export type TheExposedPopulationIsTheProgramPopulation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<SystemProgramExposure['length'], SystemProgramRoster['length']>,
        Equal<SystemProgramExposure[5], SystemProgramReference<'migrate'>>,
        SystemProgramExposure extends NonEmptyTuple<OperationReference> ? true : false,
        Equal<SystemProgramExposure[5], SystemProgramReference<'ship'>>,
        Equal<SystemProgramExposure[8], SystemProgramReference<'ship'>>,
      ],
      [true, true, true, false, true]
    >
  >
>;

/**
 * Compile-time law: the two newly earned program contracts are rostered.
 *
 * This is intentionally written before their declarations. On the previous
 * seven-program roster both extractions are `never`, so the law is the red
 * proof that adding declarations beside the carrier would not be enough.
 */
export type BuildAndDoctorEnterThroughTheDefinitionMap = Assert<
  IsExactlyTrue<
    Equal<
      [Extract<SystemProgramRoster[number], 'build'>, Extract<SystemProgramRoster[number], 'doctor'>],
      ['build', 'doctor']
    >
  >
>;

/**
 * Compile-time law: build is the target-neutral consumer-application carrier.
 *
 * The first line reads the rostered program's own signature. The second pins
 * the exact requirement row. The third proves Vite's target-owned product is
 * consumed by its catalog row rather than promoted to the universal output.
 * The last two lines make exposure composition-specific: no HTTP or editor key
 * can appear on the initial build projection.
 */
export type BuildConsumesQualifiedTargetAndManagerCatalogs = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<FailureOf<BuildProgram['definition']['signature']>, BuildFailure>,
        Equal<RequirementsOf<BuildProgram['definition']['signature']>, BuildRequirements>,
        Equal<
          InputOf<BuildTargetCatalog[1]['admit']>,
          Extract<ViteBuildProduct, { readonly _tag: 'built' }>
        >,
        Equal<PackageManagerCatalog['length'], 2>,
        Equal<BuildTargetCatalog[0]['binary'], 'astro'>,
        Equal<BuildTargetCatalog[1]['binary'], 'vite'>,
        Refine<
          CaseOf<BuildTargetChoice, 'explicit'>,
          { readonly target: EcosystemTargetReference<ViteTargetId> }
        > extends CaseOf<BuildExecutionPlan, 'astro'>['request']['target']
          ? true
          : false,
        Refine<
          CaseOf<BuildTargetChoice, 'explicit'>,
          { readonly target: EcosystemTargetReference<AstroTargetId> }
        > extends CaseOf<BuildExecutionPlan, 'astro'>['request']['target']
          ? true
          : false,
        Equal<TagOf<UnsupportedPackageManager>, 'yarn' | 'bun' | 'other'>,
        BuildFailure extends { readonly diagnostics: NonEmptyTuple<Diagnostic> } ? true : false,
        Equal<keyof BuildProgramProjection, 'direct' | 'cli' | 'trustedLocalMcp'>,
        'http' extends keyof BuildProgramProjection ? true : false,
        'editor' extends keyof BuildProgramProjection ? true : false,
        Equal<BuildProgram['definition']['effects'], readonly ['execute', 'create']>,
      ],
      [true, true, true, true, true, true, false, true, true, true, true, false, false, true]
    >
  >
>;

/**
 * Compile-time law: doctor diagnoses three subject families and mutates none.
 *
 * Each provider carries the prerequisites of its own subject. The rostered
 * program itself requires the provider authority and pins its effect to
 * observation, while remediation is a separate composition of ordinary
 * operation receipts followed by another report.
 */
export type DoctorDogfoodsOneObservationalAuthority = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<DoctorSubject>, 'repository' | 'consumer-application' | 'deployed-application'>,
        Equal<TagOf<DoctorReadout<unknown>>, 'ok' | 'absent' | 'unreadable'>,
        Equal<DoctorProviderCatalog['length'], 3>,
        Equal<RepositoryDoctorProvider['requirements'], WorkspaceObservationRequirements>,
        Equal<
          ConsumerApplicationDoctorProvider['requirements'],
          readonly [WorkspaceFileSystem, ChildProcessRequirement]
        >,
        Equal<
          DeployedApplicationDoctorProvider['requirements'],
          readonly [ServerNetworkRequirement]
        >,
        Equal<HoleContract<DoctorAuthorityRequirement>, DoctorAuthority>,
        Equal<FailureOf<DoctorProgram['definition']['signature']>, DoctorFailure>,
        Equal<OutputOf<DoctorProgram['definition']['signature']>, DoctorReport>,
        Equal<TagOf<DoctorReport>, 'ready' | 'caution' | 'blocked'>,
        Equal<CaseOf<DoctorReport, 'ready'>['diagnostics'], readonly []>,
        Equal<CaseOf<DoctorReport, 'blocked'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
        DoctorFailure extends { readonly diagnostics: NonEmptyTuple<Diagnostic> } ? true : false,
        Equal<DoctorProgram['definition']['effects'], readonly ['observe']>,
        Equal<keyof DoctorProgramProjection, 'direct' | 'cli' | 'mcp' | 'editor'>,
        'http' extends keyof DoctorProgramProjection ? true : false,
        Equal<DoctorProgramProjection['editor']['report'], DoctorReport>,
        Equal<
          CaseOf<DoctorProgramProjection['cli'], 'threshold'>['output']['answer']['value'],
          DoctorReport
        >,
        Equal<
          CaseOf<DoctorRemediationComposition, 'repository'>['run']['before'],
          DoctorReport<CaseOf<DoctorSubject, 'repository'>>
        >,
        Equal<
          CaseOf<DoctorRemediationComposition, 'repository'>['run']['after'],
          DoctorReport<CaseOf<DoctorSubject, 'repository'>>
        >,
        'receipt' extends keyof CaseOf<DoctorRemediationComposition, 'repository'>['run']['applications'][number]
          ? true
          : false,
      ],
      [
        true, true, true, true, true,
        true, true, true, true, true,
        true, true, true, true, true,
        false,
        true, true, true, true, true,
      ]
    >
  >
>;

export type MigrateIsOneExactProgramProjectedThroughFiveExistingWires = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          MigrateProgram['definition']['signature'],
          Signature<
            MigrationRequest,
            MigrationReport,
            MigrationFailure,
            readonly [MigrationAuthorityRequirement]
          >
        >,
        Equal<FailureOf<MigrateProgram['definition']['signature']>, MigrationFailure>,
        Equal<RequirementsOf<MigrateProgram['definition']['signature']>, readonly [MigrationAuthorityRequirement]>,
        MigrateProgramProjection['direct'] extends DirectMigrationExchange<SystemProgramId<'verify'>>
          ? true
          : false,
        Equal<keyof MigrateProgramProjection, 'direct' | 'cli' | 'http' | 'mcp' | 'editor'>,
      ],
      [true, true, true, false, true]
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
        ObservesOnly<SystemProgram<'audit', unknown, unknown, readonly []>>,
        Equal<
          ObservesOnly<
            SystemProgram<'audit', unknown, unknown, readonly []> & {
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
// The verify chain, at one exact coordinate
// ---------------------------------------------------------------------------

type VerifySnapshot = WorkspaceSnapshotId<'law.verify.snapshot'>;
type ForeignSnapshot = WorkspaceSnapshotId<'law.verify.foreign'>;

type VerifyCheck = Refine<
  PlannedCheck<
    GateId<'law.verify.gate'>,
    GateRevisionId<'law.verify.revision'>,
    readonly [FailureClassReference<FailureClassId<'law.verify.class'>>]
  >,
  { readonly consequence: 'required' }
>;

type VerifySpec = AssuranceRunSpec<AssuranceRunSpecId<'law.verify.spec'>, readonly [VerifyCheck]>;

/** What `audit` produces at this coordinate, read through its own signature. */
type AuditProduces = OutputOf<AuditProgram<VerifySnapshot>['definition']['signature']>;

/** What `gauntlet` consumes at this coordinate. */
type GauntletConsumes = GauntletRequest<VerifySnapshot, VerifySpec>['product'];

/**
 * Compile-time law: audit's product is gauntlet's input, and verify answers
 * what gauntlet answers.
 *
 * This is the first composition of the assurance spine, and it is the reason
 * the definition map was worth building. Until the programs carried contracts,
 * there was nothing to compose: every registry entry consumed `unknown`, so
 * "audit produces what gauntlet consumes" was a sentence in a README with no
 * type that could disagree with it.
 *
 * Line one is the chain. Line two is what makes it a measurement rather than a
 * restatement — the same product read at a *different* snapshot is refused, so
 * the coordinate threads through the composition rather than being carried
 * alongside it. Line three is the second half of the chain: verify is audit and
 * gauntlet in one invocation, so it answers with gauntlet's answer.
 *
 * Line four is the anti-vacuity partner. `OutputOf` over a signature that had
 * quietly become `never` would satisfy line one against a `never` product and
 * prove nothing.
 */
export type TheVerifyChainComposesAtOneCoordinate = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<AuditProduces, GauntletConsumes>,
        Equal<AuditProduces, AuditProduct<ForeignSnapshot>>,
        Equal<
          OutputOf<VerifyProgram<VerifySnapshot, VerifySpec>['definition']['signature']>,
          OutputOf<GauntletProgram<VerifySnapshot, VerifySpec>['definition']['signature']>
        >,
        [AuditProduces] extends [never] ? true : false,
      ],
      [true, false, true, false]
    >
  >
>;

/**
 * Compile-time law: a system-program wire projects the program population.
 *
 * `SystemProgramExposure` had no consumer. It was a mapped type producing
 * exactly the shape `WireExposure.exposed` accepts, and nothing ever assigned
 * one to the other — so this home's own claim, that a wire cannot expose a
 * program the roster does not name, was false wherever it mattered.
 *
 * Line one is the binding. Line two is the refusal that makes it worth having:
 * a plain `WireDefinition` does not satisfy the refined one, because its
 * `exposed` is `NonEmptyTuple<OperationReference>` and admits any operations at
 * all, in any order, including none of these. Line three keeps the direction
 * honest — the refined wire is still a wire. Line four is the anti-vacuity
 * partner, since `Refine` resolves to `never` for a change that narrows
 * nothing.
 */
export type ASystemProgramWireProjectsThePopulation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<SystemProgramWire['exposure']['exposed'], SystemProgramExposure>,
        WireDefinition extends SystemProgramWire ? true : false,
        SystemProgramWire extends WireDefinition ? true : false,
        [SystemProgramWire] extends [never] ? true : false,
        Equal<SystemProgramWire['exposure']['withheld'], WireExposure['withheld']>,
      ],
      [true, false, true, false, true]
    >
  >
>;

/**
 * Compile-time law: the registry entry for `release` is the release contract.
 *
 * Read here rather than only in `04_bootstrap`, because this is the home that
 * declares both the map and the signature that used to float beside it. The
 * input of the rostered program and the input of `ReleaseSignature` are the
 * same type; they were two correct declarations about different things for as
 * long as the registry held a placeholder.
 */
export type TheRosteredReleaseIsTheReleaseContract = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          OutputOf<ReleaseProgram['definition']['signature']>,
          OutputOf<ReleaseSignature>
        >,
        Equal<ReleaseProgram['name'], 'release'>,
        [ReleaseProgram] extends [never] ? true : false,
      ],
      [true, true, false]
    >
  >
>;
