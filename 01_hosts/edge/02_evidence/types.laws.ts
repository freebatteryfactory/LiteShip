/**
 * Compile-time laws for `01_hosts/edge/02_evidence`.
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
import type { EvidenceReference, EvidenceSourceId } from '../../../00_core/06_evidence/types.js';
import type { Assert, Equal, NonEmptyTuple, Result } from '../../../types.js';
import type { AdmittedHeader } from '../01_request/types.js';
import type { EdgeSourcedEvidenceUpdate, HintSourceFacility, RequestEvidenceAuthority } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// The complete request-evidence producer census, and the conservative
// edge/web classifier relation holding in implementation, are
// `system/assurance` obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: reading is source-correlated, and a source-A update is not a source-B update. */
export type RequestEvidenceIsSourceCorrelated = Assert<
  Equal<
    [
      RequestEvidenceAuthority['read'] extends (
        source: EvidenceSourceId<'liteship.evidence.law.source-a'>,
      ) => Result<
        EdgeSourcedEvidenceUpdate<EvidenceSourceId<'liteship.evidence.law.source-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      EdgeSourcedEvidenceUpdate<EvidenceSourceId<'liteship.evidence.law.source-b'>> extends EdgeSourcedEvidenceUpdate<
        EvidenceSourceId<'liteship.evidence.law.source-a'>
      >
        ? true
        : false,
    ],
    [true, false]
  >
>;


/** Compile-time law: an edge update names its exact source reference. */
export type AnEdgeUpdateNamesItsExactSource = Assert<
  Equal<
    EdgeSourcedEvidenceUpdate<EvidenceSourceId<'liteship.evidence.law.source-a'>>['source'],
    EvidenceReference<EvidenceSourceId<'liteship.evidence.law.source-a'>>
  >
>;

/** Compile-time law: request hint admission carries the actual admitted header row. */
export type TheHintSourceCarriesHeadersNotAMarker = Assert<
  Equal<HintSourceFacility['headers'], readonly AdmittedHeader[]>
>;
