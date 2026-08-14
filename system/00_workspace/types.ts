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
 * shadow control plane grew its own model of what the repository was,
 * and because that model was never compared to the real one, the two disagreed
 * for as long as it existed.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  Hole,
  NonEmptyTuple,
  Reference,
  Signature,
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
 * architecture is authored — `system/03_programs/` is coming, `02_wires/direct/`
 * just arrived —
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
   * `system/03_programs/` is in that state today. Naming a home before authoring it is
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
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Id extends WorkspaceId = WorkspaceId,
  Revision extends SourceRevisionId = SourceRevisionId,
> {
  readonly id: WorkspaceSnapshotReference<Snapshot>;
  readonly workspace: WorkspaceReference<Id>;
  readonly revision: SourceRevisionReference<Revision>;
  readonly tree: WorkingTreeState;
  readonly root: RootMetadataObservation;
  readonly roots: RootCensus;
  readonly homes: readonly SourceHomeObservation[];
  readonly coverage: HomeCensusCoverage;
  readonly address: ContentAddress<'application/vnd.liteship.workspace-snapshot+cbor'>;
}

/**
 * Identity of one immutable repository observation.
 *
 * Separate from the snapshot's content address, and that separation is the
 * whole repair. The address is `ContentAddress<'…workspace-snapshot+cbor'>`,
 * which resolves to one template literal identical for every snapshot that will
 * ever exist — so a reference carrying only the address is monomorphic, and two
 * references to different revisions are mutually assignable. Every downstream
 * product held that erased form while its README claimed the coordinate was
 * exact.
 *
 * The workspace and the revision stay on the snapshot value, where they are
 * observations rather than identity. Threading them through the reference would
 * put the same two facts in two places and need a law to keep them agreeing.
 * One identity threads; the observation stays with the observer.
 */
export type WorkspaceSnapshotId<Name extends string = string> = Brand<
  Name,
  'liteship.workspace-snapshot-id'
>;

/** Reference to a taken snapshot, exact over which one. */
export type WorkspaceSnapshotReference<Id extends WorkspaceSnapshotId = WorkspaceSnapshotId> =
  Reference<'workspace-snapshot', Id>;

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

/**
 * What one observation is asked to do: observe this workspace, under this
 * identity.
 *
 * The caller supplies the identity the resulting snapshot will carry. That is
 * the only way an exact result can leave a producer at all — TypeScript has no
 * existential types, so no signature can say "returns a snapshot bearing *some*
 * fresh identity". The parameter is skolemized at the call site or it does not
 * exist.
 *
 * Read the token narrowly. `WorkspaceSnapshotId<'a'>` means exactly one thing:
 *
 * > every product parameterized by this token concerns the same observation
 * > event.
 *
 * It is not the revision, not the workspace, not a digest, not a uniqueness or
 * freshness guarantee, and above all not the Git SHA. Deriving it from the
 * revision would make the identity a second model of a field the snapshot
 * already observes — the disease this home exists to prevent — and would
 * collapse two observations of one revision into one coordinate, which they are
 * not: a clean tree and a dirty tree at the same revision are different events.
 *
 * What the type proves is threading. It does not prove the caller minted a
 * fresh token, and it does not prove the tree matched the revision reported.
 * Those are runtime claims and the README lists them as such.
 */
export interface WorkspaceObservationRequest<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Id extends WorkspaceId = WorkspaceId,
> {
  readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
  readonly workspace: WorkspaceReference<Id>;
}

/**
 * Taking one snapshot, with its prerequisites named rather than assumed.
 *
 * The identity appears in both positions deliberately. A `Signature`'s input
 * slot is `(input: Input) => void` — a parameter position, therefore
 * contravariant — so an exactness axis carried *only* by the input is not
 * provable in the direction that matters, and a broadened producer survives the
 * check. The output slot is an ordinary covariant property, and that is where
 * the law below reads.
 */
export type WorkspaceObservation<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Id extends WorkspaceId = WorkspaceId,
> = Signature<
  WorkspaceObservationRequest<Snapshot, Id>,
  WorkspaceSnapshot<Snapshot, Id>,
  readonly Diagnostic[],
  WorkspaceObservationRequirements
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
  readonly request: WorkspaceObservationRequest;
  readonly observation: WorkspaceObservation;
}
