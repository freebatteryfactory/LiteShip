/**
 * Workspace: the repository and project context authority.
 *
 * Every system program needs to know what repository it is operating on, which
 * revision, which source homes physically exist, and which toolchain is
 * pinned. This home owns that observation and nothing else.
 *
 * The word that governs this file is **observes**. A workspace snapshot points
 * at the root package metadata, the pinned toolchain matrix, the physical
 * directories, and the Git revision. It never restates their contents in a
 * vocabulary of its own. The repository already paid for the alternative: a
 * fifty-one-entry control plane grew its own model of what the repository was,
 * and because that model was never compared to the real one, the two disagreed
 * for as long as it existed.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  ContextOf,
  Equal,
  Hole,
  HoleContract,
  InputOf,
  IsExactlyTrue,
  NonEmptyTuple,
  OutputOf,
  Reference,
  RequirementRow,
  Signature,
  TagOf,
  TypeScriptToolchainMatrix,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { ContentAddress, ContentDigest } from '../../00_core/01_encoding/types.js';
import type { Evidence } from '../../00_core/06_evidence/types.js';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type WorkspaceId<Name extends string = string> = Brand<Name, 'liteship.workspace-id'>;
export type WorkspaceReference<Id extends WorkspaceId = WorkspaceId> = Reference<'workspace', Id>;

/**
 * A repository-relative path.
 *
 * Relative because an absolute path is a fact about one machine, and a
 * workspace snapshot that embeds one cannot be compared across two checkouts
 * of the same revision. The absolute prefix belongs to the filesystem
 * capability that resolves it, never to the observation.
 */
export type WorkspacePath = Brand<string, 'liteship.workspace-path'>;

/**
 * The name of one top-level directory in the repository.
 *
 * Deliberately not a union of the current roots. The population changes when
 * architecture is authored — `02_wires/` is coming, `system/` just arrived —
 * and a union edited on every such change is a second roster competing with
 * the physical tree. Governance is expressed by {@link RootCensusEntry}, which
 * compares declaration against observation instead of asserting either.
 */
export type RootName = Brand<string, 'liteship.repository-root-name'>;

/** The name of one numbered source home, such as `00_core/12_media`. */
export type SourceHomeName = Brand<string, 'liteship.source-home-name'>;
export type SourceHomeReference<Name extends SourceHomeName = SourceHomeName> = Reference<
  'source-home',
  Name
>;

// ---------------------------------------------------------------------------
// The root census
// ---------------------------------------------------------------------------

/**
 * How one top-level directory stands between what the architecture declares
 * and what the filesystem contains.
 *
 * This algebra exists because of a specific defect, and it is shaped to make
 * that defect impossible to repeat quietly. `verification/` and `scripts/`
 * were physically present, were never declared, and sat outside every census
 * the repository ran on itself — so no report was ever wrong, because no
 * report ever mentioned them. The failure was not a missing rule. `AGENTS.md`
 * already forbade a `scripts/` directory in prose, and prose does not run.
 *
 * The failure was that *undeclared* had no representation. There was nowhere
 * for the observation to land, so it landed nowhere.
 *
 * There is deliberately no arm meaning "known and ignored". An exemption would
 * reintroduce exactly the state this algebra exists to expose, and an
 * exemption list is how the previous one justified itself.
 */
export type RootCensusEntry = Algebra<{
  /** Declared by the architecture and physically present. The ordinary case. */
  governed: { readonly root: RootName };
  /**
   * Declared by the architecture and not yet physically present.
   *
   * Lawful: `system/` was named in the layout long before it existed, and
   * `02_wires/` is in that state today. Naming a home before authoring it is
   * how the waterfall stays legible. Building its responsibilities elsewhere
   * in the meantime is what went wrong.
   */
  reserved: { readonly root: RootName };
  /**
   * Physically present and declared nowhere.
   *
   * The `verification/` state. A finding, never a silent skip.
   */
  ungoverned: { readonly root: RootName; readonly entries: number };
}>;

/**
 * The complete top-level census.
 *
 * Non-empty because a repository with no roots is not a repository, and a law
 * over an empty population is the vacuity trap this codebase keeps paying for.
 */
export interface RootCensus {
  readonly entries: NonEmptyTuple<RootCensusEntry>;
}

// ---------------------------------------------------------------------------
// Source homes
// ---------------------------------------------------------------------------

/**
 * What a source home is required to contain, as observed.
 *
 * Every numbered home in this repository owns exactly two files: a `README.md`
 * that states local meaning and proof obligations, and a `types.ts` that
 * declares the local semantic surface. The observation records their digests
 * rather than their contents: a snapshot is a coordinate, and a coordinate
 * that embeds what it saw cannot be compared without comparing everything.
 */
export interface SourceHomeObservation<Name extends SourceHomeName = SourceHomeName> {
  readonly home: SourceHomeReference<Name>;
  readonly path: WorkspacePath;
  readonly readme: Evidence<ContentDigest>;
  readonly declarations: Evidence<ContentDigest>;
  readonly children: readonly SourceHomeReference[];
}

/**
 * Whether the observed home population was completely acquired.
 *
 * A home the filesystem capability could not read is `unavailable` inside its
 * own `Evidence`, and a run that could not enumerate a directory at all is
 * `partial` here. Neither ever becomes an omission: a census that silently
 * drops what it could not read reports a smaller repository than exists, which
 * is the precise failure mode that let a control plane hide in plain sight.
 */
export type HomeCensusCoverage = Algebra<{
  complete: Record<never, never>;
  partial: { readonly unreadable: NonEmptyTuple<WorkspacePath>; readonly diagnostics: readonly Diagnostic[] };
}>;

// ---------------------------------------------------------------------------
// Revision
// ---------------------------------------------------------------------------

/** Identity of one source-control revision of the workspace. */
export type SourceRevisionId = Brand<string, 'liteship.source-revision-id'>;
export type SourceRevisionReference<Id extends SourceRevisionId = SourceRevisionId> = Reference<
  'source-revision',
  Id
>;

/**
 * Whether the working tree matches the revision it claims.
 *
 * Split into an algebra rather than a `dirty: boolean` beside an optional list,
 * for the reason `00_core/11_scene` already recorded when it retired the same
 * shape: a boolean beside optionals admits combinations that mean nothing. A
 * clean tree carrying a modified-path list, and a dirty tree carrying none,
 * are both representable in the boolean form and neither is a state.
 *
 * The distinction is load-bearing rather than tidy. Assurance evidence
 * acquired from a modified tree does not describe the revision it names, and a
 * release qualified against it is qualified against nothing durable.
 */
export type WorkingTreeState = Algebra<{
  clean: Record<never, never>;
  modified: { readonly paths: NonEmptyTuple<WorkspacePath> };
}>;

// ---------------------------------------------------------------------------
// Declared root metadata
// ---------------------------------------------------------------------------

/**
 * The root package identity as declared, not as re-modelled.
 *
 * The repository root is the canonical toolchain authority. This observation
 * says what the root declared and where; it does not become a second place
 * where a compiler version can be stated, because two places that may disagree
 * is the same defect as one place that lies.
 */
export interface RootMetadataObservation {
  readonly manifest: WorkspacePath;
  readonly packageName: string;
  readonly toolchain: Evidence<TypeScriptToolchainMatrix>;
  readonly compilerConfiguration: Evidence<ContentDigest>;
  readonly lock: Evidence<ContentDigest>;
}

// ---------------------------------------------------------------------------
// The snapshot
// ---------------------------------------------------------------------------

/**
 * One immutable observation coordinate for the whole repository.
 *
 * This is to the repository what `SemanticCut` is to an addressed world, and
 * the parallel is deliberate rather than decorative. Both name an exact
 * subject, an exact revision, and the evidence population observed there; both
 * are exact over their identity so that two snapshots of different revisions
 * cannot substitute for one another; and both exist because a result reported
 * without its coordinate cannot be reproduced or contradicted.
 *
 * Every axis is a type parameter and every parameter is read by a member.
 * A generic no member consumes is decoration that survives its own deletion.
 */
export interface WorkspaceSnapshot<
  Id extends WorkspaceId = WorkspaceId,
  Revision extends SourceRevisionId = SourceRevisionId,
> {
  readonly workspace: WorkspaceReference<Id>;
  readonly revision: SourceRevisionReference<Revision>;
  readonly tree: WorkingTreeState;
  readonly root: RootMetadataObservation;
  readonly roots: RootCensus;
  readonly homes: readonly SourceHomeObservation[];
  readonly coverage: HomeCensusCoverage;
  readonly address: ContentAddress<'application/vnd.liteship.workspace-snapshot+cbor'>;
}

/** Reference to a taken snapshot, for products that report on one. */
export type WorkspaceSnapshotReference = Reference<
  'workspace-snapshot',
  ContentAddress<'application/vnd.liteship.workspace-snapshot+cbor'>
>;

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * Reading the repository is a host capability, not an ambient power.
 *
 * Workspace declares the holes and no filling. Concrete filesystem and
 * source-control access is physical behaviour, which `01_hosts/server` owns
 * and a bootstrap injects. A system home that reached for the filesystem
 * directly would be a host wearing a different number.
 */
export type WorkspaceFileSystem = Hole<
  'liteship.system.workspace.file-system',
  {
    readonly readDigest: Signature<WorkspacePath, ContentDigest, readonly Diagnostic[]>;
    readonly listDirectory: Signature<WorkspacePath, readonly WorkspacePath[], readonly Diagnostic[]>;
  }
>;

export type WorkspaceSourceControl = Hole<
  'liteship.system.workspace.source-control',
  {
    readonly revision: Signature<WorkspaceReference, SourceRevisionId, readonly Diagnostic[]>;
    readonly workingTree: Signature<WorkspaceReference, WorkingTreeState, readonly Diagnostic[]>;
  }
>;

/**
 * The exact prerequisite row for taking a snapshot.
 *
 * Closed and ordered rather than a free `RequirementRow`: a free row would let
 * any caller supply an unrelated collection and assert the capabilities line
 * up, which is the boundary defect `01_hosts` states as a law.
 */
export type WorkspaceObservationRequirements = readonly [WorkspaceFileSystem, WorkspaceSourceControl];

/** Taking one snapshot, with its prerequisites named rather than assumed. */
export type WorkspaceObservation = Signature<
  WorkspaceReference,
  WorkspaceSnapshot,
  readonly Diagnostic[],
  WorkspaceObservationRequirements
>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type WorkspaceLawA = WorkspaceId<'a'>;
type WorkspaceLawB = WorkspaceId<'b'>;
type RevisionLawA = SourceRevisionId & { readonly __law?: 'a' };
type RevisionLawB = SourceRevisionId & { readonly __law?: 'b' };

/**
 * A snapshot is exact over both of its axes.
 *
 * Two arms per axis, and the third line of each group is the one that matters:
 * without it the law passes when the parameter is dropped entirely, because
 * everything is assignable to the default instantiation. That is the exact
 * shape of the defect that cost this repository four folds in the host layer —
 * a generic proved exact by hand while the carrier hands consumers the broad
 * form.
 */
export type AWorkspaceSnapshotIsExactOverItsCoordinate = Assert<
  Equal<
    [
      WorkspaceSnapshot<WorkspaceLawA> extends WorkspaceSnapshot<WorkspaceLawB> ? true : false,
      WorkspaceSnapshot<WorkspaceLawA> extends WorkspaceSnapshot<WorkspaceLawA> ? true : false,
      WorkspaceSnapshot extends WorkspaceSnapshot<WorkspaceLawA> ? true : false,
      WorkspaceSnapshot<WorkspaceId, RevisionLawA> extends WorkspaceSnapshot<WorkspaceId, RevisionLawB>
        ? true
        : false,
      WorkspaceSnapshot<WorkspaceId, RevisionLawA> extends WorkspaceSnapshot<WorkspaceId, RevisionLawA>
        ? true
        : false,
    ],
    [false, true, false, false, true]
  >
>;

/**
 * The census can say "present and ungoverned", and cannot say "exempt".
 *
 * The first three lines pin the population. The last two are the anti-vacuity
 * pair: `keyof` over an algebra sees the tag union, so a law that only asserted
 * the three known arms would still pass if a fourth were added beside them.
 * Checking the total count is what makes the addition of an exemption arm a
 * compile error rather than an unnoticed widening.
 */
export type TheRootCensusRepresentsUngovernedRoots = Assert<
  Equal<
    [
      'governed' extends TagOf<RootCensusEntry> ? true : false,
      'reserved' extends TagOf<RootCensusEntry> ? true : false,
      'ungoverned' extends TagOf<RootCensusEntry> ? true : false,
      'exempt' extends TagOf<RootCensusEntry> ? true : false,
      'ignored' extends TagOf<RootCensusEntry> ? true : false,
      Equal<TagOf<RootCensusEntry>, 'governed' | 'reserved' | 'ungoverned'>,
    ],
    [true, true, true, false, false, true]
  >
>;

/**
 * Working-tree state is an algebra, not a boolean beside optionals.
 *
 * The retired shape is checked by name as well as by structure, because a
 * `dirty` member is one edit away at all times and a comment does not
 * constrain the compiler.
 */
export type WorkingTreeStateIsNotABooleanWithOptionals = Assert<
  Equal<
    [
      Equal<TagOf<WorkingTreeState>, 'clean' | 'modified'>,
      'dirty' extends keyof WorkingTreeState ? true : false,
      'paths' extends keyof CaseOf<WorkingTreeState, 'clean'> ? true : false,
      CaseOf<WorkingTreeState, 'modified'>['paths'] extends NonEmptyTuple<WorkspacePath> ? true : false,
      readonly WorkspacePath[] extends CaseOf<WorkingTreeState, 'modified'>['paths'] ? true : false,
    ],
    [true, false, false, true, false]
  >
>;

/**
 * Observation is not ambient.
 *
 * Both capability holes are required, and the row is checked as an exact tuple
 * rather than merely as some `RequirementRow`: a signature whose requirements
 * are satisfiable by the empty row is a signature that can read the filesystem
 * out of thin air.
 */
export type ObservingTheWorkspaceRequiresInjectedCapabilities = Assert<
  Equal<
    [
      Equal<WorkspaceObservationRequirements, readonly [WorkspaceFileSystem, WorkspaceSourceControl]>,
      WorkspaceObservationRequirements extends RequirementRow ? true : false,
      readonly [] extends WorkspaceObservationRequirements ? true : false,
      keyof ContextOf<WorkspaceObservationRequirements> extends never ? true : false,
    ],
    [true, true, false, false]
  >
>;

/**
 * Every capability consumes its subject and produces its observation.
 *
 * All four of these were declared backwards — `readDigest` said "give me a
 * digest and I will return a path." Both orders are legal `Signature`
 * instantiations, so the compiler accepted it and the only thing asserting the
 * intended reading was the member name.
 *
 * The law pins each end as an **ordered pair**, which is the shape a reversal
 * breaks: swapping input and output turns `[WorkspacePath, ContentDigest]` into
 * `[ContentDigest, WorkspacePath]` and the tuple stops matching. Pinning the
 * input alone would not catch it, because a reversed operation still has *an*
 * input.
 */
export type WorkspaceCapabilitiesConsumeSubjectsAndProduceObservations = Assert<
  IsExactlyTrue<
    Equal<
      [
        [InputOf<HoleContract<WorkspaceFileSystem>['readDigest']>, OutputOf<HoleContract<WorkspaceFileSystem>['readDigest']>],
        [
          InputOf<HoleContract<WorkspaceFileSystem>['listDirectory']>,
          OutputOf<HoleContract<WorkspaceFileSystem>['listDirectory']>,
        ],
        [InputOf<HoleContract<WorkspaceSourceControl>['revision']>, OutputOf<HoleContract<WorkspaceSourceControl>['revision']>],
        [
          InputOf<HoleContract<WorkspaceSourceControl>['workingTree']>,
          OutputOf<HoleContract<WorkspaceSourceControl>['workingTree']>,
        ],
      ],
      [
        [WorkspacePath, ContentDigest],
        [WorkspacePath, readonly WorkspacePath[]],
        [WorkspaceReference, SourceRevisionId],
        [WorkspaceReference, WorkingTreeState],
      ]
    >
  >
>;

/**
 * A source home records digests, never contents.
 *
 * `readme` and `declarations` are `Evidence<ContentDigest>` so that an
 * unreadable file stays visible as `unavailable` instead of vanishing, and so
 * that a snapshot stays a coordinate rather than becoming a copy of the tree
 * it describes.
 */
export type ASourceHomeObservationCarriesDigestsNotContents = Assert<
  Equal<
    [
      Equal<SourceHomeObservation['readme'], Evidence<ContentDigest>>,
      Equal<SourceHomeObservation['declarations'], Evidence<ContentDigest>>,
      'contents' extends keyof SourceHomeObservation ? true : false,
      'source' extends keyof SourceHomeObservation ? true : false,
      'text' extends keyof SourceHomeObservation ? true : false,
    ],
    [true, true, false, false, false]
  >
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the root system topology. */
export interface WorkspaceTypeSurface {
  readonly workspace: WorkspaceReference;
  readonly snapshot: WorkspaceSnapshot;
  readonly rootCensus: RootCensus;
  readonly censusEntry: RootCensusEntry;
  readonly home: SourceHomeObservation;
  readonly coverage: HomeCensusCoverage;
  readonly tree: WorkingTreeState;
  readonly rootMetadata: RootMetadataObservation;
  readonly observation: WorkspaceObservation;
}
