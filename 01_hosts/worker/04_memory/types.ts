/**
 * Shared memory: buffers, addressed layouts, typed views, and roles.
 *
 * This home owns the shared-memory provider, buffer identity, the layout
 * address, role-granted views, the atomic discipline vocabulary, generation
 * relationships, closure, and disposal. It composes with core memory plans
 * and execution images; it never defines semantic state or a second memory
 * planner, and no semantic compositor or evaluator logic lives in a ring
 * protocol.
 *
 * A view is correlated to the exact buffer it was granted on and the exact
 * role it was granted with — a writer view on buffer A structurally cannot
 * claim buffer B or reader authority, the same identity discipline the web
 * closure established for clocks and watchers. That identity is
 * caller-carried from construction: the request names the fresh buffer
 * identity, so the value the provider actually returns is exact — the public
 * path and the lawful path are the same path. Which physical allocation
 * answers to that identity at runtime is a `system/assurance` obligation.
 *
 * The physical availability of shared memory in a concrete deployment may
 * require isolation policy from the edge or server response path. That is a
 * prerequisite of the selected realization recorded at a downstream
 * composition point — never an import of a sibling realm.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
  TagOf,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { WorkerGroundingDefinition, WorkerRealizationOffer } from '../00_bootstrap/types.js';

export type SharedBufferId<Name extends string = string> = Brand<
  Name,
  'liteship.worker.shared-buffer-id'
>;
export type SharedBufferReference<Id extends SharedBufferId = SharedBufferId> = Reference<
  'worker-shared-buffer',
  Id
>;

/** The addressed layout contract: sizes, planes, and offsets live behind this address. */
export type SharedMemoryLayoutAddress = ContentAddress<'application/vnd.liteship.worker-memory-layout+cbor'>;

export type MemoryLayoutId<Name extends string = string> = Brand<
  Name,
  'liteship.worker.memory-layout-id'
>;

/** One exact layout: its identity and its addressed contract, named once. */
export interface SharedMemoryLayout<L extends MemoryLayoutId> {
  readonly id: L;
  readonly address: SharedMemoryLayoutAddress;
}

/** Role grants over shared memory. Exactly reader or writer — no erased both. */
export type SharedMemoryRole = 'reader' | 'writer';

/** The declared atomic ordering discipline of one buffer. */
export type AtomicDiscipline = Algebra<{
  acquireRelease: Record<never, never>;
  sequentiallyConsistent: Record<never, never>;
}>;

/**
 * One live shared buffer: its exact identity, the exact layout it was
 * constructed with, its declared atomic discipline, and an owned lifecycle
 * disposed exactly once. Neither parameter has a default — a buffer of
 * layout B is provably not a buffer of layout A, and the identity the
 * construction request named is the identity the buffer carries, so the
 * value the provider returns can flow into the exact view relation without
 * ever passing through a broad reference.
 */
export interface SharedMemoryBuffer<L extends MemoryLayoutId, Id extends SharedBufferId> {
  readonly id: SharedBufferReference<Id>;
  readonly layout: SharedMemoryLayout<L>;
  readonly discipline: AtomicDiscipline;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * One role-granted view: generic over the exact buffer identity and the
 * exact role. The layout deliberately does not appear here — the buffer is
 * the one place that fact is written, and the view reaches it through the
 * buffer it names. The generation names the transaction coordinate the view
 * observes.
 */
export interface SharedMemoryView<
  Role extends SharedMemoryRole,
  Id extends SharedBufferId,
> {
  readonly buffer: SharedBufferReference<Id>;
  readonly role: Role;
  readonly generation: TransactionGeneration;
}

/** The complete view request: exact buffer, exact role. */
export interface SharedMemoryViewRequest<
  Role extends SharedMemoryRole,
  Id extends SharedBufferId,
> {
  readonly buffer: SharedBufferReference<Id>;
  readonly role: Role;
}

/**
 * The complete construction request: the exact buffer identity the caller
 * carries, the exact layout, and the discipline together. The requester
 * names the fresh identity — the same discipline queue construction already
 * follows — so the constructed buffer is exact from its first moment rather
 * than a provider-minted broad value the laws can only imitate.
 */
export interface SharedMemoryRequest<L extends MemoryLayoutId, Id extends SharedBufferId> {
  readonly buffer: SharedBufferReference<Id>;
  readonly layout: SharedMemoryLayout<L>;
  readonly discipline: AtomicDiscipline;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Narrow intrinsic authority over the shared-memory constructor machinery. */
export interface SharedMemoryFacility {
  readonly available: true;
}

/**
 * The shared-memory provider. Construction yields owned buffers; view grants
 * are role-and-buffer correlated, so a grant on buffer A with reader
 * authority cannot answer a writer request or a request naming buffer B.
 */
export interface SharedMemoryAuthority {
  readonly construct: <L extends MemoryLayoutId, Id extends SharedBufferId>(
    request: SharedMemoryRequest<L, Id>,
  ) => Result<SharedMemoryBuffer<L, Id>, NonEmptyTuple<Diagnostic>>;
  readonly view: <Role extends SharedMemoryRole, Id extends SharedBufferId>(
    request: SharedMemoryViewRequest<Role, Id>,
  ) => Result<SharedMemoryView<Role, Id>, NonEmptyTuple<Diagnostic>>;
  readonly release: Signature<SharedBufferReference, SharedMemoryLayoutAddress, NonEmptyTuple<Diagnostic>>;
}

export type SharedMemoryFacilityRequirement = Hole<
  'liteship.worker.shared-memory-facility',
  SharedMemoryFacility
>;
export type SharedMemoryRequirement = Hole<'liteship.worker.shared-memory', SharedMemoryAuthority>;

/** Intrinsic grounding: the shared-memory constructor facility, admitted narrowly. */
export interface SharedMemoryFacilityGrounding
  extends WorkerGroundingDefinition<
    readonly [SharedMemoryFacilityRequirement],
    unknown,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.worker.grounding.shared-memory-facility'>;
}

/** Constructing the shared-memory provider. */
export interface SharedMemoryOffer
  extends WorkerRealizationOffer<
    readonly [SharedMemoryRequirement],
    readonly [SharedMemoryFacilityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.worker.offer.shared-memory-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript' | 'wasm'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// That the physical layout bytes agree with the addressed layout contract,
// and that atomic-order correctness holds at runtime, are `system/assurance`
// obligations. Capacity, padding, and wait policy are empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: a view pins its exact buffer and role — no cross-buffer, no cross-role. */
export type AViewCannotClaimAnotherBufferOrRole = Assert<
  Equal<
    [
      SharedMemoryView<'writer', SharedBufferId<'liteship.worker.memory.law.buffer-a'>>['buffer'],
      SharedMemoryView<'writer', SharedBufferId<'liteship.worker.memory.law.buffer-a'>> extends SharedMemoryView<
        'writer',
        SharedBufferId<'liteship.worker.memory.law.buffer-b'>
      >
        ? true
        : false,
      SharedMemoryView<'reader', SharedBufferId<'liteship.worker.memory.law.buffer-a'>> extends SharedMemoryView<
        'writer',
        SharedBufferId<'liteship.worker.memory.law.buffer-a'>
      >
        ? true
        : false,
    ],
    [SharedBufferReference<SharedBufferId<'liteship.worker.memory.law.buffer-a'>>, false, false]
  >
>;

/** Compile-time law: view grants are correlated through the provider's generic operation. */
export type ViewGrantsAreCorrelated = Assert<
  Equal<
    SharedMemoryAuthority['view'] extends (
      request: SharedMemoryViewRequest<'reader', SharedBufferId<'liteship.worker.memory.law.buffer-a'>>,
    ) => Result<
      SharedMemoryView<'reader', SharedBufferId<'liteship.worker.memory.law.buffer-a'>>,
      NonEmptyTuple<Diagnostic>
    >
      ? true
      : false,
    true
  >
>;

/**
 * Compile-time law: the buffer is the one owner of the layout fact — it
 * carries the addressed layout and discipline, and a view has no layout
 * member of its own to disagree with.
 */
export type ABufferCarriesItsLayoutAndDiscipline = Assert<
  Equal<
    [
      SharedMemoryBuffer<MemoryLayoutId, SharedBufferId>['layout'],
      SharedMemoryBuffer<MemoryLayoutId, SharedBufferId>['discipline'],
      SharedMemoryBuffer<MemoryLayoutId, SharedBufferId>['lifecycle'],
      'layout' extends keyof SharedMemoryView<'reader', SharedBufferId> ? true : false,
    ],
    [SharedMemoryLayout<MemoryLayoutId>, AtomicDiscipline, CaseOf<RealizationLifecycle, 'owned'>, false]
  >
>;

/**
 * Compile-time law: construction is layout- and identity-correlated —
 * requesting layout A under buffer identity A yields a buffer of exactly
 * that layout and identity, a buffer of layout B is not a buffer of layout
 * A, and a buffer of identity B is not a buffer of identity A.
 */
export type ConstructionIsLayoutCorrelated = Assert<
  Equal<
    [
      SharedMemoryAuthority['construct'] extends (
        request: SharedMemoryRequest<
          MemoryLayoutId<'liteship.worker.law.layout-a'>,
          SharedBufferId<'liteship.worker.law.buffer-a'>
        >,
      ) => Result<
        SharedMemoryBuffer<
          MemoryLayoutId<'liteship.worker.law.layout-a'>,
          SharedBufferId<'liteship.worker.law.buffer-a'>
        >,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      SharedMemoryBuffer<MemoryLayoutId<'liteship.worker.law.layout-b'>, SharedBufferId> extends SharedMemoryBuffer<
        MemoryLayoutId<'liteship.worker.law.layout-a'>,
        SharedBufferId
      >
        ? true
        : false,
      SharedMemoryBuffer<MemoryLayoutId, SharedBufferId<'liteship.worker.law.buffer-b'>> extends SharedMemoryBuffer<
        MemoryLayoutId,
        SharedBufferId<'liteship.worker.law.buffer-a'>
      >
        ? true
        : false,
    ],
    [true, false, false]
  >
>;

/**
 * Compile-time law: the constructed buffer carries the exact identity the
 * request named — its `id` member is the exact reference, never the broad
 * family — and that identity is the same one the exact view relation
 * consumes, so the public construction path feeds the view path without a
 * broad hop in between.
 */
export type AConstructedBufferFeedsTheExactViewPath = Assert<
  Equal<
    [
      SharedMemoryRequest<
        MemoryLayoutId<'liteship.worker.law.layout-a'>,
        SharedBufferId<'liteship.worker.law.buffer-a'>
      >['buffer'],
      SharedMemoryBuffer<
        MemoryLayoutId<'liteship.worker.law.layout-a'>,
        SharedBufferId<'liteship.worker.law.buffer-a'>
      >['id'],
      SharedMemoryViewRequest<'writer', SharedBufferId<'liteship.worker.law.buffer-a'>>['buffer'],
    ],
    [
      SharedBufferReference<SharedBufferId<'liteship.worker.law.buffer-a'>>,
      SharedBufferReference<SharedBufferId<'liteship.worker.law.buffer-a'>>,
      SharedBufferReference<SharedBufferId<'liteship.worker.law.buffer-a'>>,
    ]
  >
>;

/** Compile-time law: the atomic arms are exactly the declared disciplines. */
export type TheAtomicArmsAreExact = Assert<
  Equal<TagOf<AtomicDiscipline>, 'acquireRelease' | 'sequentiallyConsistent'>
>;

/** Type summary consumed by the worker topology. */
export interface WorkerMemoryTypeSurface {
  readonly buffer: SharedMemoryBuffer<MemoryLayoutId, SharedBufferId>;
  readonly layout: SharedMemoryLayout<MemoryLayoutId>;
  readonly view: SharedMemoryView<SharedMemoryRole, SharedBufferId>;
  readonly authority: SharedMemoryAuthority;
  readonly facility: SharedMemoryFacilityGrounding;
  readonly memoryOffer: SharedMemoryOffer;
}
