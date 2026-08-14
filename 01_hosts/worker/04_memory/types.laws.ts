/**
 * Compile-time laws for `01_hosts/worker/04_memory`.
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

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Result, TagOf } from '../../../types.js';
import type { AtomicDiscipline, MemoryLayoutId, SharedBufferId, SharedBufferReference, SharedMemoryAuthority, SharedMemoryBuffer, SharedMemoryLayout, SharedMemoryRequest, SharedMemoryView, SharedMemoryViewRequest } from './types.js';

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
