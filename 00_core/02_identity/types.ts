/**
 * Persistent identity, immutable revision identity, paths, and references.
 *
 * Entity identity, exact content, current location, draft authority, and local
 * execution slots are deliberately separate facts. Sharing a content address
 * never grants committed authority, and dense slots never become public identity.
 *
 * @module
 */

import type { Address, Algebra, Assert, Brand, Equal, Reference } from '../../types.js';
import type { ContentAddress, MediaTypeSyntax } from '../01_encoding/types.js';

/** Persistent identity of a semantic entity across revisions and moves. */
export type EntityId<Name extends string = string> = Brand<Name, 'liteship.entity-id'>;

/** Persistent identity of one independently revisioned state space. */
export type WorldId<Name extends string = string> = Brand<Name, 'liteship.world-id'>;

/** Immutable identity of one exact world or entity revision. */
export type RevisionId = ContentAddress<'application/vnd.liteship.revision+cbor'>;

/** Identity of one family-specific patch against an exact revision. */
export type PatchId = ContentAddress<'application/vnd.liteship.patch+cbor'>;

/** Identity of one normalized semantic change set. */
export type ChangeId = ContentAddress<'application/vnd.liteship.change+cbor'>;

/** Identity of one committed transition. */
export type CommitId = ContentAddress<'application/vnd.liteship.commit+cbor'>;

/** Identity of an authority assertion over content or execution. */
export type AttestationId = ContentAddress<'application/vnd.liteship.attestation+cbor'>;

/** Identity of an observed execution trace. */
export type TraceId = Brand<string, 'liteship.trace-id'>;

/** Identity of an acknowledged operation or transaction outcome. */
export type ReceiptId = ContentAddress<'application/vnd.liteship.receipt+cbor'>;

/** Stable path segment through semantic structure. */
export type SurfacePathSegment = Algebra<{
  field: { readonly name: string };
  index: { readonly value: number };
  key: { readonly value: string };
  entity: { readonly id: EntityId };
  relation: { readonly name: string; readonly id?: EntityId };
  projection: { readonly name: string };
}>;

/** Current structural or human-facing location of a semantic value. */
export type SurfacePath = Brand<readonly SurfacePathSegment[], 'liteship.surface-path'>;

/** Reference to a persistent entity. */
export type EntityReference<Id extends EntityId = EntityId> = Reference<'entity', Id>;

/** Reference to a state space. */
export type WorldReference<Id extends WorldId = WorldId> = Reference<'world', Id>;

/**
 * Reference to one committed immutable revision.
 *
 * Exact over its revision identity, matching `EntityReference` and
 * `WorldReference`. The broad default keeps heterogeneous populations
 * inhabited; a relationship that must prove it commits to one specific
 * revision instantiates the parameter and carries that identity through its
 * public path.
 */
export type RevisionReference<Id extends RevisionId = RevisionId> = Reference<'revision', Id>;

/**
 * Reference to an inspectable candidate revision that has not been committed.
 * It intentionally carries the same RevisionId bytes as a committed revision,
 * while the reference kind prevents authority confusion.
 *
 * Exact over its revision identity for the same reason the committed reference
 * is: a draft cut must prove it names one specific candidate revision, and a
 * preview that may silently answer for a different draft is a preview of
 * nothing in particular. Genericity here does not soften the kind distinction —
 * `DraftRevisionIsNotCommitted` holds at every instantiation, and a draft
 * reference remains unable to satisfy a committed one.
 */
export type DraftRevisionReference<Id extends RevisionId = RevisionId> = Reference<'draft-revision', Id>;

/** Reference to one family-specific patch. */
export type PatchReference = Reference<'patch', PatchId>;

/** Reference to one normalized change set. */
export type ChangeReference = Reference<'change', ChangeId>;

/** Reference to one accepted commit. */
export type CommitReference = Reference<'commit', CommitId>;

/** Reference to immutable content. */
export type ContentReference<Type extends MediaTypeSyntax = MediaTypeSyntax> = Reference<
  'content',
  ContentAddress<Type>
>;

/** Exact semantic position used by editor, agent, patch, and explanation surfaces. */
export interface SemanticLocation {
  readonly world: WorldReference;
  readonly entity?: EntityReference;
  readonly revision: RevisionReference | DraftRevisionReference;
  readonly path?: SurfacePath;
}

/** Runtime-local dense slot. It is intentionally scoped to one execution image. */
export type DenseSlot = Brand<number, 'liteship.dense-slot'>;

/** Address of a packed execution image whose dense slots are meaningful. */
export type ExecutionImageAddress = Address<'liteship.execution-image', `sha256:${string}`>;

/** Mapping from semantic identity to a local execution slot. */
export interface SlotBinding {
  readonly image: ExecutionImageAddress;
  readonly entity: EntityId;
  readonly slot: DenseSlot;
}

/** Two distinct committed revisions, written as literal carriers. */
type CommittedRevisionLawA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:1111111111111111111111111111111111111111111111111111111111111111'
>;
type CommittedRevisionLawB = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:2222222222222222222222222222222222222222222222222222222222222222'
>;

/**
 * Compile-time law: a revision reference is exact over the revision it names,
 * and two exact revisions are not interchangeable.
 *
 * The specimens are literal carriers rather than the alias compared against its
 * own declaration. That version passes with the type parameter deleted, which
 * is the only thing this law exists to catch.
 */
export type ARevisionReferenceIsExactOverItsRevision = Assert<
  Equal<
    [
      RevisionReference<CommittedRevisionLawA> extends RevisionReference<CommittedRevisionLawB> ? true : false,
      RevisionReference<CommittedRevisionLawA> extends RevisionReference<CommittedRevisionLawA> ? true : false,
      RevisionReference<CommittedRevisionLawA> extends RevisionReference ? true : false,
    ],
    [false, true, true]
  >
>;

/**
 * Compile-time law: a draft reference is exact over the candidate revision it
 * names, exactly as the committed reference is over its own.
 *
 * Written against literal carriers rather than the alias compared with itself,
 * because the self-comparison passes with the type parameter deleted — which is
 * the whole of what this law exists to catch.
 */
export type ADraftRevisionReferenceIsExactOverItsRevision = Assert<
  Equal<
    [
      DraftRevisionReference<CommittedRevisionLawA> extends DraftRevisionReference<CommittedRevisionLawB>
        ? true
        : false,
      DraftRevisionReference<CommittedRevisionLawA> extends DraftRevisionReference<CommittedRevisionLawA>
        ? true
        : false,
      DraftRevisionReference<CommittedRevisionLawA> extends DraftRevisionReference ? true : false,
    ],
    [false, true, true]
  >
>;

/**
 * Compile-time law: a draft reference cannot satisfy a committed revision
 * reference, and genericity does not open a door in either direction.
 *
 * The exact instantiations are checked beside the broad forms. Making the draft
 * reference generic is precisely the kind of change that could have made one
 * assignable to the other at some instantiation while the broad comparison went
 * on reporting a clean separation.
 */
export type DraftRevisionIsNotCommitted = Assert<
  Equal<
    [
      DraftRevisionReference extends RevisionReference ? true : false,
      RevisionReference extends DraftRevisionReference ? true : false,
      DraftRevisionReference<CommittedRevisionLawA> extends RevisionReference<CommittedRevisionLawA>
        ? true
        : false,
      RevisionReference<CommittedRevisionLawA> extends DraftRevisionReference<CommittedRevisionLawA>
        ? true
        : false,
    ],
    [false, false, false, false]
  >
>;

/** Type summary consumed by the root core topology. */
export interface IdentityTypeSurface {
  readonly entity: EntityId;
  readonly world: WorldId;
  readonly revision: RevisionId;
  readonly draftRevision: DraftRevisionReference;
  readonly patch: PatchId;
  readonly change: ChangeId;
  readonly commit: CommitId;
  readonly path: SurfacePath;
  readonly location: SemanticLocation;
  readonly denseSlot: DenseSlot;
}
