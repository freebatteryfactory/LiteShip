/**
 * Compile-time laws for `system/00_workspace`.
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

import type { ContentDigest } from '../../00_core/01_encoding/types.js';
import type { Evidence } from '../../00_core/06_evidence/types.js';
import type { Assert, CaseOf, ContextOf, Equal, HoleContract, InputOf, IsExactlyTrue, NonEmptyTuple, OutputOf, RequirementRow, TagOf } from '../../types.js';
import type { RootCensusEntry, SourceHomeObservation, SourceRevisionId, WorkingTreeState, WorkspaceFileSystem, WorkspaceId, WorkspaceObservation, WorkspaceObservationRequest, WorkspaceObservationRequirements, WorkspacePath, WorkspaceReference, WorkspaceSnapshot, WorkspaceSnapshotId, WorkspaceSnapshotReference, WorkspaceSourceControl } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type SnapshotLawA = WorkspaceSnapshotId<'a'>;

type SnapshotLawB = WorkspaceSnapshotId<'b'>;

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
      WorkspaceSnapshot<SnapshotLawA> extends WorkspaceSnapshot<SnapshotLawB> ? true : false,
      WorkspaceSnapshot<SnapshotLawA> extends WorkspaceSnapshot<SnapshotLawA> ? true : false,
      WorkspaceSnapshot extends WorkspaceSnapshot<SnapshotLawA> ? true : false,
      WorkspaceSnapshot<WorkspaceSnapshotId, WorkspaceLawA> extends WorkspaceSnapshot<
        WorkspaceSnapshotId,
        WorkspaceLawB
      >
        ? true
        : false,
      WorkspaceSnapshot<WorkspaceSnapshotId, WorkspaceId, RevisionLawA> extends WorkspaceSnapshot<
        WorkspaceSnapshotId,
        WorkspaceId,
        RevisionLawB
      >
        ? true
        : false,
    ],
    [false, true, false, false, false]
  >
>;


/**
 * The reference is exact too, which is the half that was missing.
 *
 * The snapshot was already exact over its axes and proved so. The reference
 * every downstream product actually holds was `Reference<'workspace-snapshot',
 * ContentAddress<'…+cbor'>>` — one type for every snapshot in existence, so two
 * references to different revisions were mutually assignable and the whole
 * "assurance earned this authority over the candidate's snapshot" chain rested
 * on a coordinate the compiler could not tell apart.
 *
 * This is the *local law versus public path* defect in its purest form: the
 * value proved exact by hand, the carrier every consumer holds handing over the
 * broad form. The third line is the anti-vacuity partner.
 */
export type AWorkspaceSnapshotReferenceIsExactOverItsSnapshot = Assert<
  Equal<
    [
      WorkspaceSnapshotReference<SnapshotLawA> extends WorkspaceSnapshotReference<SnapshotLawB>
        ? true
        : false,
      WorkspaceSnapshotReference<SnapshotLawA> extends WorkspaceSnapshotReference<SnapshotLawA>
        ? true
        : false,
      WorkspaceSnapshotReference extends WorkspaceSnapshotReference<SnapshotLawA> ? true : false,
    ],
    [false, true, false]
  >
>;


/**
 * The public producer emits the exact identity it was asked for.
 *
 * This is the half that was still missing after the carrier was repaired. The
 * snapshot was exact and proved so; the reference was made exact and proved so;
 * and the operation that creates both still returned `WorkspaceSnapshot` at its
 * default instantiation. Exactness therefore began *after* the public path, so
 * every consumer received the broad form from the one place a snapshot actually
 * comes from — the local law holding while the public path leaked, one layer
 * further up than last time.
 *
 * Line one reads the output slot, so a producer that drops the parameter fails
 * here. Line two pins the member downstream carriers actually hold. Line three
 * is the anti-vacuity partner: without it the law passes when the signature
 * stops threading, because everything is assignable to the default.
 *
 * Line four pins the input's *shape*, which catches an operation that stops
 * taking a request at all. It does not catch a request that stops threading its
 * identity, and the first draft of this law claimed it did:
 * `Equal<InputOf<Observation<A>>, Request<A>>` compares an expression against
 * the type it resolves to, so when `Request` drops the parameter both sides
 * degrade together and the line stays true. Measured — the only thing that went
 * red was `noUnusedLocals`, which is a real net and an accidental one.
 *
 * Line five is therefore the request's own exactness, stated as
 * non-substitutability. Line six is the whole-signature witness, and it is
 * carried by the output: a `Signature`'s input is a parameter position, so an
 * axis riding only there is not provable in the direction anyone needs.
 */
export type ObservationProducesTheIdentityItWasAskedFor = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<OutputOf<WorkspaceObservation<SnapshotLawA>>, WorkspaceSnapshot<SnapshotLawA>>,
        Equal<
          OutputOf<WorkspaceObservation<SnapshotLawA>>['id'],
          WorkspaceSnapshotReference<SnapshotLawA>
        >,
        OutputOf<WorkspaceObservation> extends OutputOf<WorkspaceObservation<SnapshotLawA>>
          ? true
          : false,
        Equal<InputOf<WorkspaceObservation<SnapshotLawA>>, WorkspaceObservationRequest<SnapshotLawA>>,
        WorkspaceObservationRequest<SnapshotLawA> extends WorkspaceObservationRequest<SnapshotLawB>
          ? true
          : false,
        WorkspaceObservation<SnapshotLawA> extends WorkspaceObservation<SnapshotLawB> ? true : false,
      ],
      [true, true, false, true, false, false]
    >
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
      CaseOf<WorkingTreeState, 'modified'>['paths'] extends NonEmptyTuple<WorkspacePath> ? true : false,
      readonly WorkspacePath[] extends CaseOf<WorkingTreeState, 'modified'>['paths'] ? true : false,
    ],
    [true, true, false]
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
    ],
    [true, true]
  >
>;
