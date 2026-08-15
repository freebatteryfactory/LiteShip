/**
 * Compile-time laws for `02_wires/mcp`.
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
import type { OperationId } from '../../00_core/07_operation/types.js';
import type { MigrationFailure, MigrationReport } from '../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, IsExactlyTrue, NonEmptyTuple, TagOf } from '../../types.js';
import type { WireExchange, WireExposure } from '../types.js';
import type { McpAnswer, McpCatalog, McpMigrationProjection, McpOffer, McpSurfaceKind } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type McpLawA = OperationId<'liteship.wire.mcp.law.op-a'>;

type McpLawB = OperationId<'liteship.wire.mcp.law.op-b'>;

export type McpMigrationIsAnExactToolProjection = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<McpMigrationProjection<McpLawA>['offer'], McpOffer<McpLawA, 'tool'>>,
        Equal<McpMigrationProjection<McpLawA>['answer'], McpAnswer<MigrationReport, MigrationFailure, McpLawA>>,
        McpMigrationProjection<McpLawA> extends McpMigrationProjection<McpLawB> ? true : false,
      ],
      [true, true, false]
    >
  >
>;


/**
 * Compile-time law: a completed crossing is a result, never a protocol error.
 *
 * This is the central claim of the home, and it is stated as
 * non-substitutability between the arms rather than as a rule somebody follows.
 * The `protocolError` arm can only be built from a crossing that was `refused`
 * at the boundary, so a tool that ran and declined has nowhere to put itself
 * except `result`.
 *
 * Line three is the one an implementation would otherwise get wrong every time:
 * a protocol error carries no receipt, because nothing ran to have one. Line
 * four is its partner — a result does carry one, so the model gets the outcome
 * rather than a bare failure flag.
 */
export type ACompletedCrossingIsAResultNotAProtocolError = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<McpAnswer, 'result'>['crossing'],
          CaseOf<WireExchange, 'completed'>
        >,
        Equal<
          CaseOf<McpAnswer, 'protocolError'>['crossing'],
          CaseOf<WireExchange, 'refused'>
        >,
        'receipt' extends keyof CaseOf<McpAnswer, 'protocolError'>['crossing'] ? true : false,
        'receipt' extends keyof CaseOf<McpAnswer, 'result'>['crossing'] ? true : false,
        CaseOf<WireExchange, 'completed'> extends CaseOf<
          McpAnswer,
          'protocolError'
        >['crossing']
          ? true
          : false,
      ],
      [true, true, false, true, false]
    >
  >
>;


/**
 * Compile-time law: a lost answer is its own arm.
 *
 * Three arms and no fewer. Collapsing `transportLoss` into `protocolError` is
 * the shape that makes a model retry a call whose effects already happened, and
 * collapsing it into `result` claims an answer that was never received.
 *
 * The negative lines check for the two names the merge would arrive under.
 */
export type ALostAnswerIsItsOwnArm = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<McpAnswer>, 'protocolError' | 'result' | 'transportLoss'>,
        'error' extends TagOf<McpAnswer> ? true : false,
        'failed' extends TagOf<McpAnswer> ? true : false,
        Equal<CaseOf<McpAnswer, 'transportLoss'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      ],
      [true, false, false, true]
    >
  >
>;


/**
 * Compile-time law: an offer names its kind, and the catalog is exact about it.
 *
 * Line one is the axis the umbrella's flat exposure cannot carry. Lines two and
 * three are the exactness that makes it worth having: the same operation offered
 * as a tool and as a resource are different offers, and if they were mutually
 * assignable the kind would be documentation.
 *
 * Line four keeps the umbrella's shape visible — this catalog refines
 * `WireExposure` and does not fork it, so `withheld` stays a bare population
 * because a withheld operation is not being offered as anything.
 */
export type AnOfferNamesItsKind = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<McpOffer['kind'], McpSurfaceKind>,
        McpOffer<McpLawA, 'tool'> extends McpOffer<McpLawA, 'resource'> ? true : false,
        McpOffer<McpLawA, 'tool'> extends McpOffer<McpLawB, 'tool'> ? true : false,
        Equal<McpCatalog['withheld'], WireExposure['withheld']>,
        Equal<McpCatalog['offered'], NonEmptyTuple<McpOffer>>,
      ],
      [true, false, false, true, true]
    >
  >
>;


/**
 * Compile-time law: an answer is exact over the operation it answers for.
 *
 * The third line is the anti-vacuity partner for the carrier dropping its
 * parameter.
 */
export type AnMcpAnswerIsExactOverItsOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        McpAnswer<unknown, readonly Diagnostic[], McpLawA> extends McpAnswer<
          unknown,
          readonly Diagnostic[],
          McpLawB
        >
          ? true
          : false,
        McpAnswer<unknown, readonly Diagnostic[], McpLawA> extends McpAnswer<
          unknown,
          readonly Diagnostic[],
          McpLawA
        >
          ? true
          : false,
        McpAnswer extends McpAnswer<unknown, readonly Diagnostic[], McpLawA> ? true : false,
      ],
      [false, true, false]
    >
  >
>;
