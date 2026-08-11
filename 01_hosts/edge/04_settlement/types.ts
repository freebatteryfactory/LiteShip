/**
 * Request-time settlement: the physical realization of core's decisions.
 *
 * Core's compiler owns settlement semantics — what a settlement decision is,
 * which plan it belongs to, why it settled. This home binds exact request
 * evidence and deployment capabilities to the already-decided plan and
 * produces request-settled values or exact refusals with explanation. It
 * creates no edge-specific settlement language and never recomputes an
 * earlier faithful build or platform settlement.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Equal,
  Hole,
  NonEmptyTuple,
  Result,
  TagOf,
} from '../../../types.js';
import type { CanonicalValue, ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { EvidenceSourceId } from '../../../00_core/06_evidence/types.js';
import type {
  RealizationOfferId,
  RealizationPlanReference,
  SettlementDecision,
} from '../../../00_core/14_compiler/types.js';
import type { EdgeRealizationOffer } from '../00_bootstrap/types.js';
import type { EdgeRequestId, EdgeRequestReference } from '../01_request/types.js';
import type { EdgeSourcedEvidenceUpdate, RequestEvidenceRequirement } from '../02_evidence/types.js';
import type { EdgePolicyRequirement } from '../03_policy/types.js';

/** The physical settlement receipt address. */
export type RequestSettlementAddress = ContentAddress<'application/vnd.liteship.edge-settlement+cbor'>;

/**
 * The complete settlement request: the exact plan ancestry, the core
 * decision being realized, and the request evidence bound to it. Nothing is
 * recomputed — the decision arrived decided; this realm supplies the
 * request-time facts it was waiting for.
 */
export interface RequestSettlementRequest<Id extends EdgeRequestId> {
  readonly request: EdgeRequestReference<Id>;
  readonly plan: RealizationPlanReference;
  readonly decision: SettlementDecision;
  readonly evidence: readonly EdgeSourcedEvidenceUpdate<EvidenceSourceId>[];
}

/**
 * The outcome: settled values with a receipt, or an exact refusal that names
 * its diagnostics. A refusal is not a missing binding and not a runtime
 * failure disguise — the arms stay phase-correct.
 */
export type RequestSettlementOutcome<Id extends EdgeRequestId> = Algebra<{
  settled: {
    readonly request: EdgeRequestReference<Id>;
    readonly values: CanonicalValue;
    readonly receipt: RequestSettlementAddress;
  };
  refused: {
    readonly request: EdgeRequestReference<Id>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly receipt: RequestSettlementAddress;
  };
}>;

/** The request-settlement provider. */
export interface RequestSettlementAuthority {
  readonly settle: <Id extends EdgeRequestId>(
    request: RequestSettlementRequest<Id>,
  ) => Result<RequestSettlementOutcome<Id>, NonEmptyTuple<Diagnostic>>;
}

export type RequestSettlementRequirement = Hole<
  'liteship.edge.request-settlement',
  RequestSettlementAuthority
>;

/** Constructing the settlement provider over evidence and policy. */
export interface RequestSettlementOffer
  extends EdgeRealizationOffer<
    readonly [RequestSettlementRequirement],
    readonly [RequestEvidenceRequirement, EdgePolicyRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.edge.offer.request-settlement'>;
  readonly locations: NonEmptyTuple<'request'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

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

/** Type summary consumed by the edge topology. */
export interface EdgeSettlementTypeSurface {
  readonly request: RequestSettlementRequest<EdgeRequestId>;
  readonly outcome: RequestSettlementOutcome<EdgeRequestId>;
  readonly authority: RequestSettlementAuthority;
  readonly settlementOffer: RequestSettlementOffer;
}
