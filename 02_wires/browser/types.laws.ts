/**
 * Compile-time laws for `02_wires/browser`.
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
import type { Assert, CaseOf, Equal, IsExactlyTrue, NonEmptyTuple, TagOf } from '../../types.js';
import type { WireExchange } from '../types.js';
import type { BrowserExchange, BrowserLoss, TransferDisposition, TransferableName } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type BrowserLawA = OperationId<'liteship.wire.browser.law.op-a'>;

type BrowserLawB = OperationId<'liteship.wire.browser.law.op-b'>;


/**
 * Compile-time law: loss arms carry their exact recovery dispositions.
 *
 * The recoverable arm carries its key. Both arms pin the dispositions they
 * report. Without those relations the two
 * arms are distinguishable only by name, and a later edit that lets
 * `unrecoverable` carry a `copied` disposition would restore exactly the
 * confusion the split exists to remove.
 */
export type ATransferredInputHasExactRecoveryDispositions = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<BrowserLoss, 'recoverable'>['idempotencyKey'], IdempotencyKey>,
        Equal<
          CaseOf<BrowserLoss, 'unrecoverable'>['disposition'],
          CaseOf<TransferDisposition, 'transferred'>
        >,
        Equal<
          CaseOf<BrowserLoss, 'recoverable'>['disposition'],
          CaseOf<TransferDisposition, 'copied'>
        >,
      ],
      [true, true, true]
    >
  >
>;


/**
 * Compile-time law: a transfer moved something.
 *
 * A transfer of nothing is a copy, and a possibly-empty population would let the
 * unrecoverable arm be constructed for a crossing that moved no buffers — which
 * is to say, would let a recoverable loss be reported as permanent. The negative
 * line is what catches a widening to a plain array.
 */
export type ATransferMovedSomething = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<TransferDisposition, 'transferred'>['moved'], NonEmptyTuple<TransferableName>>,
        readonly TransferableName[] extends CaseOf<TransferDisposition, 'transferred'>['moved']
          ? true
          : false,
        Equal<TagOf<TransferDisposition>, 'copied' | 'transferred'>,
        'moved' extends keyof CaseOf<TransferDisposition, 'copied'> ? true : false,
      ],
      [true, false, true, false]
    >
  >
>;


/**
 * Compile-time law: the browser exchange still answers the umbrella's question.
 *
 * The lost arm is renamed and enriched, and the other two are the umbrella's
 * arms taken whole rather than restated. That matters: a child that redeclared
 * `completed` with the same members would look identical here and be a second
 * vocabulary, which is the failure `direct` avoided by `Extract`ing.
 *
 * Line three is the anti-vacuity partner for the carrier dropping its operation
 * parameter.
 */
export type TheBrowserExchangeReusesTheUmbrellaArms = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<BrowserExchange, 'completed'>, CaseOf<WireExchange, 'completed'>>,
        Equal<CaseOf<BrowserExchange, 'refused'>, CaseOf<WireExchange, 'refused'>>,
        BrowserExchange extends BrowserExchange<unknown, readonly Diagnostic[], BrowserLawA>
          ? true
          : false,
        BrowserExchange<unknown, readonly Diagnostic[], BrowserLawA> extends BrowserExchange<
          unknown,
          readonly Diagnostic[],
          BrowserLawB
        >
          ? true
          : false,
      ],
      [true, true, false, false]
    >
  >
>;
