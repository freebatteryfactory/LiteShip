/**
 * Semantic snapshots, family patches, holds, predictions, replay, checkpoints,
 * backpressure, and the trusted/generated content boundary.
 *
 * Stream transport is downstream. Every payload family keeps its own legal patch
 * algebra while sharing sequence, base revision, acknowledgement, and resumption.
 * Trusted fragments and generated structures remain separate type families so
 * model output can never enter the trusted-fragment path by structural accident.
 *
 * @module
 */

import type { Algebra, Assert, Brand, Equal, IsNever, Reference } from '../../types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type {
  AttestationId,
  ContentReference,
  RevisionReference,
  SemanticLocation,
} from '../02_identity/types.js';
import type { FieldReference, SchemaReference } from '../03_schema/types.js';
import type { MonotonicNanoseconds, StreamSequence, TimeCut } from '../04_time/types.js';
import type { EvidenceUpdate } from '../06_evidence/types.js';
import type { OperationReference } from '../07_operation/types.js';
import type { ChangeSet, RevisionPatch, WorldRevision } from '../08_state/types.js';
import type { CollectionPatch, CollectionView } from '../10_collection/types.js';
import type { SceneDefinition, ScenePatch } from '../11_scene/types.js';
import type { MediaEvent } from '../12_media/types.js';

export type StreamId<Name extends string = string> = Brand<Name, 'liteship.stream-id'>;
export type GeneratedStructureId<Name extends string = string> = Brand<Name, 'liteship.generated-structure-id'>;
export type StructureNodeId<Name extends string = string> = Brand<Name, 'liteship.structure-node-id'>;
export type CoalescingKeyId<Name extends string = string> = Brand<Name, 'liteship.coalescing-key-id'>;
export type StreamEventId = ContentAddress<'application/vnd.liteship.stream-event+cbor'>;
export type StreamReference<Id extends StreamId = StreamId> = Reference<'stream', Id>;
export type GeneratedStructureReference<Id extends GeneratedStructureId = GeneratedStructureId> = Reference<
  'generated-structure',
  Id
>;
export type StructureNodeReference<Id extends StructureNodeId = StructureNodeId> = Reference<'structure-node', Id>;
export type TrustedFragmentAttestation = Reference<'trusted-fragment-attestation', AttestationId>;
export type GeneratedStructureAdmission = Reference<'generated-structure-admission', AttestationId>;

export type StreamFrameKind = 'snapshot' | 'patch' | 'hold' | 'prediction';
export type StreamCompleteness = 'partial' | 'complete';

/** Common semantic stream envelope. */
export interface StreamEvent<Payload = StreamPayload> {
  readonly id: StreamEventId;
  readonly stream: StreamReference;
  readonly sequence: StreamSequence;
  readonly kind: StreamFrameKind;
  readonly completeness: StreamCompleteness;
  readonly schema: SchemaReference;
  readonly baseRevision?: RevisionReference;
  readonly resultRevision?: RevisionReference;
  readonly previous?: StreamEventId;
  readonly time: TimeCut;
  readonly payload: Payload;
}

/** Trusted host-produced fragment. The attestation is required and explicit. */
export interface TrustedFragment {
  readonly artifact: ContentReference;
  readonly attestation: TrustedFragmentAttestation;
  readonly mediaType: 'text/html' | 'application/vnd.liteship.element+cbor';
}

/** One unambiguous position among semantic siblings. */
export type TrustedFragmentPosition = Algebra<{
  first: Record<never, never>;
  last: Record<never, never>;
  before: { readonly target: SemanticLocation };
  after: { readonly target: SemanticLocation };
}>;

/** Constrained semantic placement changes for trusted server fragments. */
export type TrustedFragmentChange = Algebra<{
  replace: { readonly target: SemanticLocation; readonly fragment: TrustedFragment };
  insert: {
    readonly parent: SemanticLocation;
    readonly fragment: TrustedFragment;
    readonly position?: TrustedFragmentPosition;
  };
  remove: { readonly target: SemanticLocation };
  move: {
    readonly target: SemanticLocation;
    readonly parent: SemanticLocation;
    readonly position: TrustedFragmentPosition;
  };
}>;

/** Trusted server-originated element/fragment patch against an exact base. */
export type TrustedFragmentPatch = RevisionPatch<'trusted-fragment', TrustedFragmentChange>;

/**
 * The one canonical component-catalog identity. Admission and every physical
 * renderer speak this exact address family; a neighboring catalog species
 * would let content be admitted against one catalog and rendered against
 * another with nothing connecting them.
 */
export type ComponentCatalogAddress = ContentAddress<'application/vnd.liteship.component-catalog+cbor'>;

export type ComponentId<Name extends string = string> = Brand<Name, 'liteship.component-id'>;

/** What a catalog component may contain. */
export type ComponentChildGrammar = 'none' | 'structure' | 'text';

/**
 * The semantic contract of one admitted catalog component: identity, props
 * schema, child grammar, and the exact operations it may bind. This is the
 * meaning admission validates against; a physical renderer roster downstream
 * consumes the same catalog address and never authors a second meaning.
 */
export interface ComponentDefinition {
  readonly id: ComponentId;
  readonly props: SchemaReference;
  readonly children: ComponentChildGrammar;
  readonly operations: readonly OperationReference[];
}

/** The closed semantic component catalog one address commits to. */
export interface ComponentCatalog {
  readonly components: readonly ComponentDefinition[];
  readonly address: ComponentCatalogAddress;
}

/** Compile-time law: a component pins its props schema and admitted operations. */
export type AComponentPinsItsPropsAndOperations = Assert<
  Equal<
    [ComponentDefinition['props'], ComponentDefinition['operations'], ComponentCatalog['address']],
    [SchemaReference, readonly OperationReference[], ComponentCatalogAddress]
  >
>;

/** Compile-time law: the owner surface exposes the component catalog contract. */
export type TheSurfaceReachesTheComponentCatalog = Assert<
  Equal<
    [StreamTypeSurface['component'], StreamTypeSurface['componentCatalog']],
    [ComponentDefinition, ComponentCatalog]
  >
>;

/** Complete admitted generated structure. */
export interface GeneratedStructureSnapshot {
  readonly structure: GeneratedStructureReference;
  readonly world: RevisionReference;
  readonly catalog: ComponentCatalogAddress;
  readonly schema: SchemaReference;
  readonly value: CanonicalValue;
  readonly address: ContentAddress<'application/vnd.liteship.generated-structure+cbor'>;
  readonly admission: GeneratedStructureAdmission;
}

/** Minimal semantic mutation vocabulary for generated structures. */
export type GeneratedStructureChange = Algebra<{
  insert: {
    readonly parent: StructureNodeReference;
    readonly node: StructureNodeReference;
    readonly value: CanonicalValue;
    readonly before?: StructureNodeReference;
    readonly after?: StructureNodeReference;
  };
  remove: { readonly node: StructureNodeReference };
  move: {
    readonly node: StructureNodeReference;
    readonly parent: StructureNodeReference;
    readonly before?: StructureNodeReference;
    readonly after?: StructureNodeReference;
  };
  'set-field': {
    readonly node: StructureNodeReference;
    readonly field: FieldReference;
    readonly value: CanonicalValue;
  };
  'set-content': { readonly node: StructureNodeReference; readonly value: CanonicalValue };
  'replace-subtree': {
    readonly node: StructureNodeReference;
    readonly value: CanonicalValue;
    readonly schema: SchemaReference;
  };
  'bind-operation': { readonly node: StructureNodeReference; readonly operation: OperationReference };
}>;

/** Generated-structure patch admitted against an exact base revision. */
export type GeneratedStructurePatch = RevisionPatch<'generated-structure', GeneratedStructureChange> & {
  readonly catalog: ComponentCatalogAddress;
  readonly admission: GeneratedStructureAdmission;
};

/**
 * Family-specific stream payload roster. Control records such as acknowledgement,
 * checkpoint, and resume remain separate envelope concepts rather than a fake
 * content family.
 */
export type StreamPayload = Algebra<{
  'trusted-fragment': { readonly value: TrustedFragment | TrustedFragmentPatch };
  'generated-structure': { readonly value: GeneratedStructureSnapshot | GeneratedStructurePatch };
  evidence: { readonly value: EvidenceUpdate };
  collection: { readonly value: CollectionView | CollectionPatch };
  state: { readonly value: WorldRevision | ChangeSet };
  scene: { readonly value: SceneDefinition | ScenePatch };
  media: { readonly value: MediaEvent };
}>;

/** Acknowledges a safely observed or committed stream position. */
export interface StreamAcknowledgement {
  readonly stream: StreamReference;
  readonly event: StreamEventId;
  readonly sequence: StreamSequence;
}

/** Checkpoint sufficient to resume without replaying the entire prefix. */
export interface StreamCheckpoint {
  readonly stream: StreamReference;
  readonly event: StreamEventId;
  readonly sequence: StreamSequence;
  readonly state: ContentAddress;
}

/** Resume request after reconnect or process restart. */
export interface StreamResumeRequest {
  readonly stream: StreamReference;
  readonly acknowledged?: StreamAcknowledgement;
  readonly checkpoint?: StreamCheckpoint;
}

/** Bounded buffering and overload behavior. */
export type BackpressurePolicy = Algebra<{
  block: { readonly timeout?: MonotonicNanoseconds };
  reject: Record<never, never>;
  'drop-oldest': { readonly capacity: number };
  'drop-newest': { readonly capacity: number };
  coalesce: { readonly capacity: number; readonly key: CoalescingKeyId };
}>;

type TrustedFragmentCase = Extract<StreamPayload, { readonly _tag: 'trusted-fragment' }>;
type GeneratedStructureCase = Extract<StreamPayload, { readonly _tag: 'generated-structure' }>;
type TrustedFragmentPayload = TrustedFragmentCase['value'];
type GeneratedStructurePayload = GeneratedStructureCase['value'];
type TrustedGeneratedPayloadOverlap =
  | Extract<TrustedFragmentPayload, GeneratedStructurePayload>
  | Extract<GeneratedStructurePayload, TrustedFragmentPayload>;

/** Compile-time law: the trusted arm contains only trusted fragment payloads. */
export type TrustedFragmentArmIsExact = Assert<
  Equal<TrustedFragmentPayload, TrustedFragment | TrustedFragmentPatch>
>;

/** Compile-time law: the generated arm contains only admitted generated payloads. */
export type GeneratedStructureArmIsExact = Assert<
  Equal<GeneratedStructurePayload, GeneratedStructureSnapshot | GeneratedStructurePatch>
>;

/** Compile-time law: neither payload family is structurally assignable to the other. */
export type GeneratedStructureDoesNotOverlapTrustedFragment = Assert<
  IsNever<TrustedGeneratedPayloadOverlap>
>;

/** Compile-time law: generated admission cannot satisfy trusted-fragment attestation. */
export type GeneratedAdmissionIsNotTrustedAttestation = Assert<
  IsNever<
    | Extract<GeneratedStructureAdmission, TrustedFragmentAttestation>
    | Extract<TrustedFragmentAttestation, GeneratedStructureAdmission>
  >
>;

/** Type summary consumed by the root core topology. */
export interface StreamTypeSurface {
  readonly event: StreamEvent;
  readonly payload: StreamPayload;
  readonly component: ComponentDefinition;
  readonly componentCatalog: ComponentCatalog;
  readonly trustedFragment: TrustedFragment;
  readonly trustedAttestation: TrustedFragmentAttestation;
  readonly trustedPatch: TrustedFragmentPatch;
  readonly generatedStructure: GeneratedStructureSnapshot;
  readonly generatedAdmission: GeneratedStructureAdmission;
  readonly generatedPatch: GeneratedStructurePatch;
  readonly acknowledgement: StreamAcknowledgement;
  readonly checkpoint: StreamCheckpoint;
  readonly resume: StreamResumeRequest;
  readonly backpressure: BackpressurePolicy;
}
