/**
 * Compile-time laws for `01_hosts/edge/04_settlement`.
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
import type { RealizationPlanReference, SettlementDecision } from '../../../00_core/14_compiler/types.js';
import type { Assert, Equal, NonEmptyTuple, Result, TagOf } from '../../../types.js';
import type { EdgeRequestId, EdgeRequestReference } from '../01_request/types.js';
import type { RequestSettlementAddress, RequestSettlementAuthority, RequestSettlementOutcome, RequestSettlementRequest } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// The request identity and receipt relationships are local type law. The
// plan, decision, and evidence values are heterogeneous erased core
// populations: that the supplied decision belongs to the named plan, that
// the evidence rows are the ones the decision was waiting for, and that
// earlier faithful settlements are never recomputed, are the named
// `system/assurance` obligation `settlement-input-population-agreement` —
// its nonconforming witness is a settlement request pairing plan A's
// reference with a decision derived from plan B, which no local generic law
// can distinguish and the assurance census must refuse.
// ---------------------------------------------------------------------------

/**
 * Compile-time law: settlement binds the exact request, the plan ancestry,
 * and the core decision — settling request A yields an outcome naming
 * exactly request A, never request B.
 */
export type SettlementBindsItsExactInputs = Assert<
  Equal<
    [
      RequestSettlementRequest<EdgeRequestId<'liteship.edge.law.request-a'>>['request'],
      RequestSettlementRequest<EdgeRequestId>['plan'],
      RequestSettlementRequest<EdgeRequestId>['decision'],
      RequestSettlementAuthority['settle'] extends (
        request: RequestSettlementRequest<EdgeRequestId<'liteship.edge.law.request-a'>>,
      ) => Result<
        RequestSettlementOutcome<EdgeRequestId<'liteship.edge.law.request-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      RequestSettlementOutcome<EdgeRequestId<'liteship.edge.law.request-b'>> extends RequestSettlementOutcome<
        EdgeRequestId<'liteship.edge.law.request-a'>
      >
        ? true
        : false,
    ],
    [
      EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
      RealizationPlanReference,
      SettlementDecision,
      true,
      false,
    ]
  >
>;


/** Compile-time law: both outcome arms carry a physical receipt — no silent settlement. */
export type BothOutcomesCarryReceipts = Assert<
  Equal<
    [
      TagOf<RequestSettlementOutcome<EdgeRequestId>>,
      RequestSettlementOutcome<EdgeRequestId> extends {
        readonly receipt: RequestSettlementAddress;
      }
        ? true
        : false,
    ],
    ['settled' | 'refused', true]
  >
>;
