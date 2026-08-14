/**
 * Revisioned semantic state, typed world/ECS algebra, family patch envelopes,
 * normalized changes, transactions, indexes, and persistence ports.
 *
 * Core owns state meaning and in-memory conformance behavior. Durable storage is
 * supplied by hosts through exact ports so IndexedDB, SQLite, Postgres, D1, KV,
 * filesystems, and other stores do not become core dependencies.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  Envelope,
  Hole,
  MaybePromise,
  NonEmptyTuple,
  Port,
  Reference,
  RequirementRow,
  Result,
  TypeOf,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type {
  ChangeId,
  CommitId,
  DraftRevisionReference,
  EntityId,
  EntityReference,
  PatchId,
  PatchReference,
  RevisionId,
  RevisionReference,
  SurfacePath,
  WorldId,
  WorldReference,
} from '../02_identity/types.js';
import type { EntityFieldReference, FieldReference, SchemaId, SchemaReference } from '../03_schema/types.js';
import type { TimeCut } from '../04_time/types.js';
import type { EvidenceCutId, EvidenceCutReference } from '../06_evidence/types.js';
import type { OperationReference } from '../07_operation/types.js';

export type ComponentId<Name extends string = string> = Brand<Name, 'liteship.component-id'>;
export type RelationId<Name extends string = string> = Brand<Name, 'liteship.relation-id'>;
export type SystemId<Name extends string = string> = Brand<Name, 'liteship.system-id'>;
export type IndexId<Name extends string = string> = Brand<Name, 'liteship.index-id'>;
export type SubworldPortId<Name extends string = string> = Brand<Name, 'liteship.subworld-port-id'>;
export type ComponentReference<
  Id extends ComponentId = ComponentId,
  Value extends CanonicalValue = CanonicalValue,
  Encoded extends CanonicalValue = Value,
> = Reference<'component', Id> & Port<Value, Encoded>;
export type RelationReference<Id extends RelationId = RelationId> = Reference<'relation', Id>;
export type IndexReference<Id extends IndexId = IndexId> = Reference<'index', Id>;

/** Requested physical storage realization for one component family. */
export type StorageProfile<RootSchema extends SchemaId = SchemaId> = Algebra<{
  record: Record<never, never>;
  columnar: { readonly key?: FieldReference<RootSchema> };
  dense: { readonly numeric: boolean; readonly capacity?: number };
  streaming: { readonly capacity: number; readonly overflow: 'reject' | 'drop-oldest' | 'drop-newest' };
  opaque: { readonly adapter: string; readonly reason: string };
}>;

/** One schema-backed component identity. */
export interface ComponentDefinition<
  Value extends CanonicalValue = CanonicalValue,
  Encoded extends CanonicalValue = Value,
  Id extends ComponentId = ComponentId,
  SchemaIdentity extends SchemaId = SchemaId,
> {
  readonly id: Id;
  readonly reference: ComponentReference<Id, Value, Encoded>;
  readonly schema: SchemaReference<SchemaIdentity, Value, Encoded>;
  readonly storage: StorageProfile<SchemaIdentity>;
}

/** Typed relation between persistent entities. */
export interface RelationDefinition {
  readonly id: RelationId;
  readonly from: readonly ComponentReference[];
  readonly to: readonly ComponentReference[];
  readonly cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  readonly directed: boolean;
}

/** Immutable component state inside one revision. */
export interface ComponentState<Component extends ComponentReference = ComponentReference> {
  readonly component: Component;
  readonly value: TypeOf<Component>;
}

/** Immutable entity state. Components are canonically ordered by ComponentId when addressed. */
export interface EntityState {
  readonly id: EntityId;
  readonly components: readonly ComponentState[];
  readonly path?: SurfacePath;
}

/** Typed relationship instance. */
export interface RelationState<Value extends CanonicalValue = CanonicalValue> {
  readonly relation: RelationId;
  readonly from: EntityId;
  readonly to: EntityId;
  readonly value?: Value;
}

/** One immutable semantic state-space revision. */
export interface WorldRevision {
  readonly world: WorldId;
  readonly id: RevisionId;
  readonly previous: readonly RevisionReference[];
  /** Canonically ordered by EntityId for addressing; runtime indexes are derived projections. */
  readonly entities: readonly EntityState[];
  readonly relations: readonly RelationState[];
  readonly time: TimeCut;
}

/** Preconditions evaluated against the exact patch base. */
export type PatchPrecondition = Algebra<{
  'revision-is': { readonly revision: RevisionReference };
  'entity-exists': { readonly entity: EntityReference };
  'entity-absent': { readonly entity: EntityReference };
  'field-address-is': EntityFieldReference & { readonly address: ContentAddress };
  'relation-exists': { readonly relation: RelationState };
  'relation-absent': { readonly relation: RelationState };
}>;

/**
 * Shared revision envelope for one family-specific patch algebra.
 * The payload family owns legal mutations; state owns exact-base, causality,
 * precondition, and operation linkage.
 */
export type RevisionPatch<
  Family extends string,
  Change,
  Version extends number = 1,
> = Envelope<
  'RevisionPatch',
  Version,
  {
    readonly id: PatchId;
    readonly family: Family;
    readonly world: WorldReference;
    readonly base: RevisionReference;
    readonly changes: NonEmptyTuple<Change>;
    readonly preconditions: readonly PatchPrecondition[];
    readonly expectedResult?: RevisionId;
    readonly previous: readonly PatchReference[];
    readonly operation?: OperationReference;
  }
>;

/** Normalized semantic changes understood by the world transaction layer. */
export type StateChange<Value extends CanonicalValue = CanonicalValue> = Algebra<{
  'create-entity': { readonly entity: EntityState };
  'delete-entity': { readonly entity: EntityReference };
  'set-component': { readonly entity: EntityReference; readonly component: ComponentReference; readonly value: Value };
  'remove-component': { readonly entity: EntityReference; readonly component: ComponentReference };
  'add-relation': { readonly relation: RelationState };
  'remove-relation': { readonly relation: RelationState };
  'move-path': { readonly entity: EntityReference; readonly path: SurfacePath };
}>;

/** Proposed atomic normalized change set against an exact immutable base. */
export interface ChangeSet {
  readonly id: ChangeId;
  readonly world: WorldReference;
  readonly base: RevisionReference;
  readonly changes: NonEmptyTuple<StateChange>;
  readonly patch?: PatchReference;
  readonly operation?: OperationReference;
}

// ---------------------------------------------------------------------------
// The semantic cut
// ---------------------------------------------------------------------------

/**
 * One exact evaluation coordinate: which world, which revision, which moment,
 * which evidence population.
 *
 * This is the single object every materialized projection binds to. A web
 * region, a scene rasterization, an accessibility projection, and a media
 * encode are siblings precisely because they name one of these rather than each
 * assembling a coordinate out of loose parts. Three co-carried members is how
 * an axis goes exact in one consumer and broad in the next, which is the defect
 * the host layer paid four folds to close.
 *
 * The time parameter is open above `TimeCut` so a media path can be exact over
 * a frame/sample coordinate without media inventing a second cut vocabulary.
 *
 * The cut is addressed because it is immutable and compared: two projections
 * agreeing that they realized the same moment is a claim about identity, not
 * about field-by-field equality.
 */
export interface SemanticCut<
  World extends WorldId = WorldId,
  Revision extends RevisionId = RevisionId,
  Evidence extends EvidenceCutId = EvidenceCutId,
  Time extends TimeCut = TimeCut,
> {
  readonly world: WorldReference<World>;
  readonly revision: RevisionReference<Revision>;
  readonly time: Time;
  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * The same coordinate over a candidate revision that was never committed.
 *
 * A separate declaration rather than a union member or a flag, because the
 * editor evaluates counterfactuals continuously and a preview that can be
 * mistaken for a committed cut is how draft state reaches a production slot.
 * The two forms are structurally identical apart from the reference kind, and
 * that kind is the whole of the distinction — `ADraftCutCannotSatisfyACommittedCut`
 * is what keeps it from being decorative.
 */
export interface DraftSemanticCut<
  World extends WorldId = WorldId,
  Revision extends RevisionId = RevisionId,
  Evidence extends EvidenceCutId = EvidenceCutId,
  Time extends TimeCut = TimeCut,
> {
  readonly world: WorldReference<World>;
  readonly revision: DraftRevisionReference<Revision>;
  readonly time: Time;
  readonly evidence: EvidenceCutReference<Evidence>;
  readonly address: ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>;
}

/**
 * Either cut form, for the paths that genuinely accept both.
 *
 * Graphics rasterization is the motivating consumer: the editor must be able to
 * rasterize and inspect a counterfactual without committing it to application
 * reality. Refusing draft-derived artifacts at a production slot is publication
 * authority and lives with publication, not with rasterization physics.
 */
export type AnySemanticCut<
  World extends WorldId = WorldId,
  Revision extends RevisionId = RevisionId,
  Evidence extends EvidenceCutId = EvidenceCutId,
  Time extends TimeCut = TimeCut,
> = SemanticCut<World, Revision, Evidence, Time> | DraftSemanticCut<World, Revision, Evidence, Time>;

/**
 * Accepted change set and the coherent cut it produced.
 *
 * The commit owns its cut once. An earlier shape carried `result` and `time`
 * beside each other, which meant adding world and evidence would have produced
 * four sibling coordinates and a parity law to keep them agreeing. The result
 * revision is `commit.cut.revision`, the commit time is `commit.cut.time`, and
 * there is nothing left to drift.
 *
 * `base` remains a sibling because it is a different fact: the revision this
 * commit departed from, not the coordinate it arrived at.
 */
export interface Commit<Cut extends SemanticCut = SemanticCut> {
  readonly id: CommitId;
  readonly change: ChangeId;
  readonly base: RevisionReference;
  readonly cut: Cut;
}

/** State-system authority declaration. */
export interface SystemDefinition<Requirements extends RequirementRow = readonly []> {
  readonly id: SystemId;
  readonly query: readonly ComponentReference[];
  readonly reads: readonly ComponentReference[];
  readonly writes: readonly ComponentReference[];
  readonly requirements: Requirements;
}

/** Typed input or output exposed by an addressed subworld. */
export interface SubworldPort {
  readonly id: SubworldPortId;
  readonly direction: 'input' | 'output';
  readonly schema: SchemaReference;
  readonly required: boolean;
}

/** Addressable nested world with explicit ports and parent relationship. */
export interface SubworldReference {
  readonly world: WorldReference;
  readonly revision: RevisionReference;
  readonly parentEntity: EntityReference;
  readonly ports: readonly SubworldPort[];
  readonly localTime?: TimeCut;
}

/** Standard derived index kinds. */
export type IndexKind =
  | 'component-membership'
  | 'outgoing-relation'
  | 'incoming-relation'
  | 'hash'
  | 'ordered'
  | 'bitmap'
  | 'inverted';

/** One semantic request for a derived state index. */
export interface IndexDefinition {
  readonly id: IndexId;
  readonly kind: IndexKind;
  readonly component?: ComponentReference;
  readonly relation?: RelationReference;
  readonly fields?: readonly FieldReference[];
  readonly unique: boolean;
}

/** Compiler- or workload-selected indexes for one immutable revision. */
export interface IndexPlan {
  readonly revision: RevisionReference;
  readonly indexes: readonly IndexDefinition[];
  readonly address: ContentAddress<'application/vnd.liteship.index-plan+cbor'>;
  readonly reasons: readonly {
    readonly index: IndexReference;
    readonly consumer: string;
    readonly expectedCardinality?: number;
  }[];
}

/**
 * In-memory semantic conformance contract. Implementations may use frozen
 * records, persistent maps, paged tables, or another measured representation.
 */
export interface RevisionModel {
  readonly materialize: (revision: RevisionReference) => Result<WorldRevision, readonly Diagnostic[]>;
  readonly fork: (base: RevisionReference) => Result<WorldRevision, readonly Diagnostic[]>;
  readonly apply: (base: WorldRevision, change: ChangeSet) => Result<WorldRevision, readonly Diagnostic[]>;
  readonly commit: (base: RevisionReference, next: WorldRevision) => Result<Commit, readonly Diagnostic[]>;
}

/** Durable revision persistence port. */
export interface RevisionStore {
  readonly load: (revision: RevisionReference) => MaybePromise<Result<WorldRevision, readonly Diagnostic[]>>;
  readonly head: (world: WorldReference) => MaybePromise<Result<RevisionReference | null, readonly Diagnostic[]>>;
  readonly compareAndSwap: (
    expected: RevisionReference | null,
    next: WorldRevision,
  ) => MaybePromise<Result<boolean, readonly Diagnostic[]>>;
}

/** Optional snapshot acceleration port. */
export interface SnapshotStore {
  readonly put: (revision: WorldRevision) => MaybePromise<Result<void, readonly Diagnostic[]>>;
  readonly nearest: (revision: RevisionReference) => MaybePromise<Result<WorldRevision | null, readonly Diagnostic[]>>;
}

/** Append-only change history port. */
export interface ChangeLog {
  readonly append: (change: ChangeSet, commit: Commit) => MaybePromise<Result<void, readonly Diagnostic[]>>;
  readonly after: (commit: CommitId | null) => MaybePromise<Result<readonly Commit[], readonly Diagnostic[]>>;
}

/** Large immutable payload storage port. */
export interface BlobStore {
  readonly put: (address: ContentAddress, bytes: Uint8Array) => MaybePromise<Result<void, readonly Diagnostic[]>>;
  readonly get: (address: ContentAddress) => MaybePromise<Result<Uint8Array | null, readonly Diagnostic[]>>;
}

export type RevisionStoreRequirement = Hole<'liteship.state.revision-store', RevisionStore>;
export type SnapshotStoreRequirement = Hole<'liteship.state.snapshot-store', SnapshotStore>;
export type ChangeLogRequirement = Hole<'liteship.state.change-log', ChangeLog>;
export type BlobStoreRequirement = Hole<'liteship.state.blob-store', BlobStore>;

/** Type summary consumed by the root core topology. */
export interface StateTypeSurface {
  readonly component: ComponentDefinition;
  readonly componentState: ComponentState;
  readonly relation: RelationDefinition;
  readonly revision: WorldRevision;
  readonly patch: RevisionPatch<'state', StateChange>;
  readonly change: ChangeSet;
  readonly commit: Commit;
  readonly cut: SemanticCut;
  readonly draftCut: DraftSemanticCut;
  readonly system: SystemDefinition;
  readonly subworld: SubworldReference;
  readonly index: IndexPlan;
  readonly model: RevisionModel;
  readonly storage: RevisionStore;
}
