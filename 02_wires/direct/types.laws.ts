/**
 * Compile-time laws for `02_wires/direct`.
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

import type { OperationId } from '../../00_core/07_operation/types.js';
import type { Assert, Equal, TagOf } from '../../types.js';
import type { WireExchange, WireRefusal } from '../types.js';
import type { DirectExchange, DirectRefusal } from './types.js';

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
