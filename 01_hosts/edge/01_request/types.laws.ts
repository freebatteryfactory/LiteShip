/**
 * Compile-time laws for `01_hosts/edge/01_request`.
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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Signature, TagOf } from '../../../types.js';
import type { AdmittedRequest, AdmittedUrl, BodyConsumption, EdgeRequestId, EdgeRequestReference, RequestClone, RequestMethod } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That raw request fields are admitted through canonical decoders, and that
// one-shot consumption behavior is honored at runtime, are `system/assurance`
// obligations. Body buffering thresholds are empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: the method vocabulary is closed and exact. */
export type TheMethodVocabularyIsClosed = Assert<
  Equal<RequestMethod, 'get' | 'head' | 'post' | 'put' | 'patch' | 'delete' | 'options'>
>;


/** Compile-time law: the body arms are exactly the declared one-shot relationship. */
export type TheBodyIsOneShot = Assert<
  Equal<
    [TagOf<BodyConsumption>, CaseOf<BodyConsumption, 'consumed'>['through']],
    ['unconsumed' | 'consumed' | 'cloned', ContentAddress<'application/vnd.liteship.edge-body+cbor'>]
  >
>;


/** Compile-time law: the request is platform-held — unowned custody, admitted fields, provenance. */
export type TheRequestIsPlatformHeld = Assert<
  Equal<
    [
      AdmittedRequest<EdgeRequestId>['lifecycle'],
      AdmittedRequest<EdgeRequestId>['url'],
      AdmittedRequest<EdgeRequestId>['invocation'],
    ],
    [
      CaseOf<RealizationLifecycle, 'unowned'>,
      AdmittedUrl,
      ContentAddress<'application/vnd.liteship.edge-invocation+cbor'>,
    ]
  >
>;


/**
 * Compile-time law: every request operation speaks exactly its own request —
 * request A's consume, clone, and cancellation accept only request A, a
 * clone is an addressed owned resource with ancestry to exactly its request,
 * the trace relation exists, and a request of B is not a request of A.
 * Cancellation is observation of the platform-held invocation: the request's
 * custody is unowned, so the authority to cancel belongs to the platform,
 * and this realm observes the fact rather than owning the act.
 */
export type ARequestOperatesOnExactlyItself = Assert<
  Equal<
    [
      AdmittedRequest<EdgeRequestId<'liteship.edge.law.request-a'>>['consume'],
      AdmittedRequest<EdgeRequestId<'liteship.edge.law.request-a'>>['clone'],
      RequestClone<EdgeRequestId<'liteship.edge.law.request-a'>>['request'],
      RequestClone<EdgeRequestId<'liteship.edge.law.request-b'>> extends RequestClone<
        EdgeRequestId<'liteship.edge.law.request-a'>
      >
        ? true
        : false,
      AdmittedRequest<EdgeRequestId>['trace'],
      AdmittedRequest<EdgeRequestId<'liteship.edge.law.request-b'>> extends AdmittedRequest<
        EdgeRequestId<'liteship.edge.law.request-a'>
      >
        ? true
        : false,
    ],
    [
      Signature<
        EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
        CaseOf<BodyConsumption, 'consumed'>,
        NonEmptyTuple<Diagnostic>
      >,
      Signature<
        EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
        RequestClone<EdgeRequestId<'liteship.edge.law.request-a'>>,
        NonEmptyTuple<Diagnostic>
      >,
      EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
      false,
      ContentAddress<'application/vnd.liteship.edge-request-trace+cbor'>,
      false,
    ]
  >
>;
