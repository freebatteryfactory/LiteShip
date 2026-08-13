/**
 * The direct wire: in-process invocation.
 *
 * No serialization, no transport, no boundary between address spaces. A caller
 * holds a typed invocation and gets a typed receipt back.
 *
 * This child exists as architecture for a reason beyond convenience. It is
 * where the umbrella's exchange algebra gets tested for honesty. A boundary
 * vocabulary designed around HTTP forces every other protocol to fabricate arms
 * it cannot produce, and the fabrication is invisible — the type compiles, the
 * arm is simply never constructed, and a consumer branches on a state that
 * cannot occur. The direct wire has the narrowest possible surface of any wire,
 * so if the umbrella were HTTP-shaped this home is where it would show.
 *
 * It shows by *narrowing*, not by declaring less. `DirectRefusal` and
 * `DirectExchange` are `Extract`ed from the umbrella's algebras, so they remain
 * assignable to them and a consumer written against a general wire accepts a
 * direct one unchanged. A child that declared its own two-arm exchange would
 * look identical here and be a second vocabulary.
 *
 * @module
 */

import type { Assert, Equal, TagOf } from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { OperationId } from '../../00_core/07_operation/types.js';
import type { WireExchange, WireRefusal } from '../types.js';

/**
 * What can refuse an in-process call.
 *
 * Only `unrecognized`. The input is already typed when the caller holds it, so
 * `malformed` is unreachable — there is no decoding step in which to fail, and
 * a malformed direct invocation would have failed to compile.
 *
 * Catalog lookup still refuses: a caller may name an operation this wire does
 * not expose, and that is a genuine runtime possibility rather than a decoding
 * one.
 */
export type DirectRefusal = Extract<WireRefusal, { readonly _tag: 'unrecognized' }>;

/**
 * One in-process crossing.
 *
 * Two arms. `undelivered` is unreachable: an in-process call that returns has
 * delivered by construction, and one that does not return took the whole
 * process with it, leaving nobody to hold the exchange.
 *
 * That absence is the payoff. In-process is exactly the case where the
 * expensive distinction the umbrella exists to protect — the operation ran but
 * the answer was lost — genuinely cannot arise, and a child that had to carry
 * the arm anyway would be evidence the algebra was transport-shaped rather than
 * boundary-shaped.
 */
export type DirectExchange<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> = Extract<
  WireExchange<Output, Failure, Op>,
  { readonly _tag: 'completed' } | { readonly _tag: 'refused' }
>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type DirectLawA = OperationId<'liteship.wire.direct.law.op-a'>;
type DirectLawB = OperationId<'liteship.wire.direct.law.op-b'>;

/**
 * The direct wire narrows the umbrella rather than forking it.
 *
 * Lines one and two are the substitutability claim: a consumer written against
 * a general wire accepts a direct one. Lines three and four are the narrowing:
 * the general form does not substitute for the direct one, which is what makes
 * this a subset rather than an alias.
 *
 * Without lines three and four the law would still pass if `DirectExchange`
 * were simply `WireExchange`, which is the exact edit somebody makes when the
 * `Extract` looks like ceremony.
 */
export type TheDirectWireNarrowsTheUmbrella = Assert<
  Equal<
    [
      DirectExchange extends WireExchange ? true : false,
      DirectRefusal extends WireRefusal ? true : false,
      WireExchange extends DirectExchange ? true : false,
      WireRefusal extends DirectRefusal ? true : false,
    ],
    [true, true, false, false]
  >
>;

/**
 * In-process has no undelivered arm and no malformed arm.
 *
 * The counts are pinned so neither population can be widened back by an edit
 * that merely looks like restoring symmetry with the other children.
 */
export type InProcessCannotLoseAnAnswerOrFailToDecode = Assert<
  Equal<
    [
      'undelivered' extends TagOf<DirectExchange> ? true : false,
      'malformed' extends TagOf<DirectRefusal> ? true : false,
      Equal<TagOf<DirectExchange>, 'completed' | 'refused'>,
      Equal<TagOf<DirectRefusal>, 'unrecognized'>,
    ],
    [false, false, true, true]
  >
>;

/**
 * Narrowing did not cost exactness.
 *
 * `Extract` over a generic algebra is a place where a type parameter can
 * quietly stop threading, so the exactness pair is checked here as well as at
 * the umbrella. The third line is the anti-vacuity partner.
 */
export type ADirectExchangeIsExactOverItsOperation = Assert<
  Equal<
    [
      DirectExchange<unknown, never, DirectLawA> extends DirectExchange<unknown, never, DirectLawB>
        ? true
        : false,
      DirectExchange<unknown, never, DirectLawA> extends DirectExchange<unknown, never, DirectLawA>
        ? true
        : false,
      DirectExchange extends DirectExchange<unknown, never, DirectLawA> ? true : false,
    ],
    [false, true, false]
  >
>;

/** Type summary consumed by the wires topology. */
export interface DirectWireTypeSurface {
  readonly refusal: DirectRefusal;
  readonly exchange: DirectExchange;
}
