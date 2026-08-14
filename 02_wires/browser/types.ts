/**
 * The browser wire: a crossing inside one page.
 *
 * Between a document and a worker, or a document and a frame. No network, no
 * address-space boundary in the operating-system sense, and yet a real
 * boundary: the structured-clone algorithm sits in the middle and it does
 * something no other wire does.
 *
 * It can **move** the input instead of copying it.
 *
 * That is the whole reason this home exists as architecture rather than as a
 * variant of `direct`. Every other wire's undelivered arm means *the operation
 * ran and you did not hear back*, and the remedy is a retry with the
 * idempotency key core already owns. Here the remedy can be structurally
 * unavailable: if the request transferred its buffers, the caller no longer
 * owns them. The bytes are in the other realm, the operation ran, the answer is
 * gone, and there is nothing left to send again.
 *
 * A vocabulary that models this as "undelivered, retry with a key" is describing
 * a recovery the caller cannot perform. So the lost arm splits by disposition,
 * and the unrecoverable side carries no retry member at all — not a member
 * saying retry is impossible, which invites a consumer to check it and hope, but
 * no member, so the recovery is unrepresentable rather than discouraged.
 *
 * This home owns the disposition and nothing else. It declares no message, no
 * port, no channel, and no event: `01_hosts/worker` owns the physical transport
 * and this wire owns what the transfer costs.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  IsExactlyTrue,
  NonEmptyTuple,
  Tagged,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { IdempotencyKey, OperationId } from '../../00_core/07_operation/types.js';
import type { WireExchange } from '../types.js';

// ---------------------------------------------------------------------------
// Transfer
// ---------------------------------------------------------------------------

/**
 * The name of one transferable the request handed across.
 *
 * A name rather than the object, because this is a type layer and the object is
 * a runtime buffer. What matters structurally is that the population is
 * non-empty when a transfer happened: a transfer of nothing is a copy.
 */
export type TransferableName = Brand<string, 'liteship.wire.browser.transferable'>;

/**
 * What the crossing did with the caller's input.
 *
 * `copied` is the structured clone's default and the ordinary case: the caller
 * still holds everything it sent.
 *
 * `transferred` names what left. After it, those buffers are detached in the
 * calling realm — reading them is not slow, it is impossible — and any recovery
 * that involves sending them again is fiction.
 */
export type TransferDisposition = Algebra<{
  copied: Record<never, never>;
  transferred: { readonly moved: NonEmptyTuple<TransferableName> };
}>;

// ---------------------------------------------------------------------------
// Loss
// ---------------------------------------------------------------------------

/**
 * A lost answer, split by whether the caller can do anything about it.
 *
 * `recoverable` carries the idempotency key, because the input was copied and
 * still exists: this is the ordinary lost-answer case that every wire has.
 *
 * `unrecoverable` carries the names of what moved and **no key and no retry**.
 * The operation ran, the answer did not arrive, and the request cannot be
 * reconstructed. The only honest actions are to report it and to re-acquire the
 * data from wherever it originally came from, which is a different operation
 * with a different receipt.
 *
 * The absent member is the law. A `retry?: never` or a `retryable: false` would
 * both be members a consumer can read and misread; absence cannot be misread.
 */
export type BrowserLoss = Algebra<{
  recoverable: {
    readonly disposition: CaseOf<TransferDisposition, 'copied'>;
    readonly idempotencyKey: IdempotencyKey;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  unrecoverable: {
    readonly disposition: CaseOf<TransferDisposition, 'transferred'>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

/**
 * One crossing inside a page, with the lost arm carrying its disposition.
 *
 * `completed` and `refused` are the umbrella's arms unchanged — a copied answer
 * that arrived is not interesting, and a request the catalog did not recognize
 * never touched a buffer.
 */
export type BrowserExchange<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> =
  | Exclude<
      WireExchange<Output, Failure, Op>,
      CaseOf<WireExchange<Output, Failure, Op>, 'undelivered'>
    >
  | Tagged<
      'lost',
      {
        readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'undelivered'>;
        readonly loss: BrowserLoss;
      }
    >;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type BrowserLawA = OperationId<'liteship.wire.browser.law.op-a'>;
type BrowserLawB = OperationId<'liteship.wire.browser.law.op-b'>;

/**
 * Compile-time law: a transferred input has no recovery, and the absence is
 * structural.
 *
 * Lines one and two are the point of the home. Neither an idempotency key nor a
 * retry member exists on the unrecoverable arm, so a consumer cannot consult one
 * and decide to try anyway. Line three keeps the recoverable arm honest — it
 * *does* carry the key, because there the recovery is real.
 *
 * Lines four and five pin the dispositions to their arms. Without them the two
 * arms are distinguishable only by name, and a later edit that lets
 * `unrecoverable` carry a `copied` disposition would restore exactly the
 * confusion the split exists to remove.
 */
export type ATransferredInputHasNoRecovery = Assert<
  IsExactlyTrue<
    Equal<
      [
        'idempotencyKey' extends keyof CaseOf<BrowserLoss, 'unrecoverable'> ? true : false,
        'retry' extends keyof CaseOf<BrowserLoss, 'unrecoverable'> ? true : false,
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
      [false, false, true, true, true]
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

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the wire topology. */
export interface BrowserWireTypeSurface {
  readonly transferable: TransferableName;
  readonly disposition: TransferDisposition;
  readonly loss: BrowserLoss;
  readonly exchange: BrowserExchange;
}
