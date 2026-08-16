/**
 * Compile-time laws for `02_wires/http`.
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
import type { IdempotencyKey, OperationId } from '../../00_core/07_operation/types.js';
import type { MigrationFailure, MigrationReport } from '../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, IsExactlyTrue, TagOf } from '../../types.js';
import type { WireExchange, WireRefusal } from '../types.js';
import type { HttpMigrationProjection, HttpProjection, HttpRetryEligibility, HttpStatusClass } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type HttpLawA = OperationId<'liteship.wire.http.law.op-a'>;

type HttpLawB = OperationId<'liteship.wire.http.law.op-b'>;

export type HttpMigrationProjectsTheCoreContract = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<HttpMigrationProjection<HttpLawA>, 'answered'>['crossing'],
          CaseOf<WireExchange<MigrationReport, MigrationFailure, HttpLawA>, 'completed'>
        >,
        HttpMigrationProjection<HttpLawA> extends HttpMigrationProjection<HttpLawB> ? true : false,
      ],
      [true, false]
    >
  >
>;


/**
 * Compile-time law: HTTP narrows nothing.
 *
 * `direct` reaches two exchange arms because in-process invocation genuinely
 * cannot lose an answer or fail to decode. HTTP reaches all three and both
 * refusals, and pinning that is what stops a later edit deciding the awkward arm
 * is not needed here either.
 *
 * The negative lines are the ones that bite: an `Extract` down to two arms would
 * satisfy a law that only checked the arms present.
 */
export type TheHttpWireNarrowsNothing = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<WireExchange>, 'completed' | 'refused' | 'undelivered'>,
        Equal<TagOf<WireRefusal>, 'malformed' | 'unrecognized'>,
        Equal<TagOf<HttpProjection>, 'answered' | 'rejected' | 'lost'>,
        Exclude<TagOf<WireExchange>, 'completed' | 'refused' | 'undelivered'> extends never
          ? true
          : false,
      ],
      [true, true, true, true]
    >
  >
>;


/**
 * Compile-time law: the status class is pinned where only one is honest, and
 * free where the transport does not know.
 *
 * Lines one and two are the refusals. A lost answer reported as a client error
 * is the single most expensive mistranslation available at this boundary, and a
 * rejected request reported as success is how a 200 comes to mean nothing.
 *
 * Line three is the freedom, and it is as load-bearing as the constraints. A
 * completed crossing whose operation refused must be able to say `client-error`
 * while carrying its receipt; a grammar that forced `success` here would make an
 * operation's own refusal unrepresentable at the boundary.
 */
export type AStatusClassIsPinnedWhereOnlyOneIsHonest = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<HttpProjection, 'lost'>['status'], 'server-error'>,
        Equal<CaseOf<HttpProjection, 'rejected'>['status'], 'client-error'>,
        Equal<CaseOf<HttpProjection, 'answered'>['status'], HttpStatusClass>,
        HttpStatusClass extends CaseOf<HttpProjection, 'lost'>['status'] ? true : false,
        'client-error' extends CaseOf<HttpProjection, 'lost'>['status'] ? true : false,
      ],
      [true, true, true, false, false]
    >
  >
>;


/**
 * Compile-time law: retry eligibility exists only where the operation ran.
 *
 * A rejected crossing never reached an operation, so retrying it is free and
 * needs no member to say so; an answered crossing has its answer. Putting
 * `retry` on either would invite a client to consult it, and a member that is
 * always the same answer is a member that gets read wrong eventually.
 *
 * Line four is the one that has to exist: an unsafe method with no idempotency
 * key, whose answer was lost, must be nameable. The default across the industry
 * is that it has no name and the client retries.
 */
export type RetryEligibilityExistsOnlyWhereTheOperationRan = Assert<
  IsExactlyTrue<
    Equal<
      [
        'retry' extends keyof CaseOf<HttpProjection, 'lost'> ? true : false,
        'retry' extends keyof CaseOf<HttpProjection, 'rejected'> ? true : false,
        'retry' extends keyof CaseOf<HttpProjection, 'answered'> ? true : false,
        Equal<TagOf<HttpRetryEligibility>, 'free' | 'keyed' | 'forbidden'>,
        Equal<CaseOf<HttpRetryEligibility, 'keyed'>['idempotencyKey'], IdempotencyKey>,
      ],
      [true, false, false, true, true]
    >
  >
>;


/**
 * Compile-time law: a projection is exact over the operation it projects.
 *
 * The third line is the anti-vacuity partner. Without it the law passes when the
 * projection stops threading its parameter, because everything is assignable to
 * the default instantiation — the defect this repository has now committed five
 * separate times.
 */
export type AnHttpProjectionIsExactOverItsOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        HttpProjection<unknown, readonly Diagnostic[], HttpLawA> extends HttpProjection<
          unknown,
          readonly Diagnostic[],
          HttpLawB
        >
          ? true
          : false,
        HttpProjection<unknown, readonly Diagnostic[], HttpLawA> extends HttpProjection<
          unknown,
          readonly Diagnostic[],
          HttpLawA
        >
          ? true
          : false,
        HttpProjection extends HttpProjection<unknown, readonly Diagnostic[], HttpLawA>
          ? true
          : false,
      ],
      [false, true, false]
    >
  >
>;
