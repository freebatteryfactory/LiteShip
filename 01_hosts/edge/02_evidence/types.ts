/**
 * Request evidence: physical producers of request-time facts.
 *
 * Core owns evidence vocabulary, classifiers, codomains, defaults, and
 * precedence. This home owns the physical request-time producers — Client
 * Hints and other admitted request facts — with the same source-identity
 * discipline the web closure established: every producer is parameterized by
 * the exact core source it implements, its emitted update derives its source
 * from that same parameter, and no identity-erasing default exists.
 *
 * Advisory request hints never confer authorization, and the conservative
 * relationship between the request classifier and the browser's live
 * classifier is an explicit declared relation, not a hope.
 *
 * @module
 */

import type {
  Hole,
  NonEmptyTuple,
  Result,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  EvidenceReference,
  EvidenceSourceId,
  EvidenceUpdate,
} from '../../../00_core/06_evidence/types.js';
import type { GroundingId, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { EdgeGroundingDefinition, EdgeRealizationOffer } from '../00_bootstrap/types.js';
import type { AdmittedHeader, AdmittedRequestRequirement } from '../01_request/types.js';

/**
 * One evidence update whose source is the exact core source identity it was
 * produced for. The parameter has no default: an update that does not say
 * which source it updates is not a lawful type.
 */
export interface EdgeSourcedEvidenceUpdate<Source extends EvidenceSourceId>
  extends EvidenceUpdate {
  readonly source: EvidenceReference<Source>;
}

/**
 * The request-evidence provider: reading is source-correlated — asking for
 * source A yields an update of source A, provably not source B. Request
 * evidence has request lifetime; nothing here survives the invocation.
 */
export interface RequestEvidenceAuthority {
  readonly read: <Source extends EvidenceSourceId>(
    source: Source,
  ) => Result<EdgeSourcedEvidenceUpdate<Source>, NonEmptyTuple<Diagnostic>>;
}

/** Narrow intrinsic authority over the physical hint fields of the invocation. */
export interface HintSourceFacility {
  readonly headers: readonly AdmittedHeader[];
}

export type HintSourceRequirement = Hole<'liteship.edge.hint-source', HintSourceFacility>;
export type RequestEvidenceRequirement = Hole<
  'liteship.edge.request-evidence',
  RequestEvidenceAuthority
>;

/** Invocation grounding: hint fields arrive with the request itself. */
export interface HintSourceGrounding
  extends EdgeGroundingDefinition<
    readonly [HintSourceRequirement],
    HintSourceFacility,
    'invocation',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.hint-source'>;
}

/** Constructing the request-evidence provider over the admitted request. */
export interface RequestEvidenceOffer
  extends EdgeRealizationOffer<
    readonly [RequestEvidenceRequirement],
    readonly [HintSourceRequirement, AdmittedRequestRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.edge.offer.request-evidence'>;
  readonly locations: NonEmptyTuple<'request'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the edge topology. */
export interface EdgeEvidenceTypeSurface {
  readonly read: RequestEvidenceAuthority['read'];
  readonly authority: RequestEvidenceAuthority;
  readonly hintGrounding: HintSourceGrounding;
  readonly evidenceOffer: RequestEvidenceOffer;
}
