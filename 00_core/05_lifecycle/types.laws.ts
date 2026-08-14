/**
 * Compile-time laws for `00_core/05_lifecycle`.
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

import type { Assert, Equal, TagOf } from '../../types.js';
import type { CancellationOutcome, CancellationReceipt, DisposalOutcome, DisposalReceipt } from './types.js';

/**
 * A disposal receipt names the exact thing it released.
 *
 * This is the whole reason the subject sits in the receipt rather than being
 * dropped for `void`. `Subject` is carried by a readonly member, so it is
 * covariant: a receipt for A is usable where a broad receipt is expected, and a
 * broad receipt is not usable where A's is required. Reversing that — which is
 * what putting the identity only in the operation's input would do, since
 * `Signature` inputs are contravariant — would let a disposer for any subject
 * satisfy a contract demanding one exact subject.
 *
 * The last line is the anti-vacuity partner. Without it the law would still
 * pass if `subject` were retyped to `unknown`, because everything is assignable
 * to a receipt whose subject says nothing.
 */
export type ADisposalReceiptIsExactOverItsSubject = Assert<
  Equal<
    [
      DisposalReceipt<'a'> extends DisposalReceipt<'b'> ? true : false,
      DisposalReceipt<'a'> extends DisposalReceipt<string> ? true : false,
      DisposalReceipt<string> extends DisposalReceipt<'a'> ? true : false,
      DisposalReceipt<unknown> extends DisposalReceipt<'a'> ? true : false,
    ],
    [false, true, false, false]
  >
>;


/**
 * Cancelling is not disposing, and the types say so.
 *
 * The first two lines are the substitutability check that matters: neither
 * receipt can stand in for the other, at any subject. Without that, splitting
 * the outcomes would be documentation rather than architecture — a consumer
 * expecting to learn whether ownership ended could be handed a cancellation
 * result and never notice.
 *
 * The last two lines are the anti-vacuity partners. The receipts differ only in
 * their outcome member, so if either outcome algebra lost its distinguishing
 * arms — collapsing both to a bare success — the first two lines would start
 * passing for the wrong reason. Pinning the exact tag populations is what makes
 * the separation load-bearing rather than nominal.
 */
export type ACancellationReceiptIsNotADisposalReceipt = Assert<
  Equal<
    [
      CancellationReceipt<'a'> extends DisposalReceipt<'a'> ? true : false,
      DisposalReceipt<'a'> extends CancellationReceipt<'a'> ? true : false,
      Equal<TagOf<CancellationOutcome>, 'requested' | 'already-requested' | 'already-terminal'>,
      Equal<TagOf<DisposalOutcome>, 'released' | 'already-released'>,
    ],
    [false, false, true, true]
  >
>;


/**
 * A cancellation receipt names the exact subject it answers for.
 *
 * The sibling law above proves the two receipts are not interchangeable, and
 * the media law proves `cancel` returns this shape — but neither proves this
 * type still reads its `Subject` parameter. Both would survive `subject` being
 * retyped to `unknown`, because both compare against `CancellationReceipt<X>`
 * and that expected side broadens through the same alias. A law whose source is
 * its subject certifies the defect instead of catching it, which is the trap
 * this repository has now found in three separate places.
 *
 * So this reads the relationship directly. The last line is the anti-vacuity
 * partner: without it, widening `subject` leaves the first three lines intact.
 */
export type ACancellationReceiptIsExactOverItsSubject = Assert<
  Equal<
    [
      CancellationReceipt<'a'> extends CancellationReceipt<'b'> ? true : false,
      CancellationReceipt<'a'> extends CancellationReceipt<string> ? true : false,
      CancellationReceipt<string> extends CancellationReceipt<'a'> ? true : false,
      CancellationReceipt<unknown> extends CancellationReceipt<'a'> ? true : false,
    ],
    [false, true, false, false]
  >
>;
