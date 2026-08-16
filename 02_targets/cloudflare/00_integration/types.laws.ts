/**
 * Compile-time laws for `02_targets/cloudflare/00_integration`.
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
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { EcosystemTargetId, TargetConfigurationId, TargetParticipation } from '../../types.js';
import type { CloudflareAdapterDefinition, CloudflareAdapterId, CloudflareCompatibility } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawAdapter = CloudflareAdapterId<'liteship'>;

type LawConfig = TargetConfigurationId<'cloudflare.deploy'>;

type LawRevision = RevisionId;


/** Compile-time law: this child names the Cloudflare ecosystem target and no other. */
export type TheAdapterNamesTheCloudflareTargetExactly = Assert<
  Equal<
    CloudflareAdapterDefinition<LawAdapter, LawConfig, LawRevision>['participation'],
    TargetParticipation<EcosystemTargetId<'cloudflare'>, LawConfig, LawRevision>
  >
>;


/** Compile-time law: compatibility keeps its four altitudes distinct. */
export type CloudflareCompatibilityKeepsItsFourAltitudes = Assert<
  Equal<CloudflareCompatibility['_tag'], 'supported' | 'degraded' | 'refused' | 'unavailable'>
>;


/** Compile-time law: absent evidence is not support. */
export type CloudflareAbsentEvidenceIsNotSupport = Assert<
  Equal<
    [
      'evidence' extends keyof CaseOf<CloudflareCompatibility, 'unavailable'> ? true : false,
      'evidence' extends keyof CaseOf<CloudflareCompatibility, 'refused'> ? true : false,
      Equal<CaseOf<CloudflareCompatibility, 'degraded'>['limitations'], NonEmptyTuple<Diagnostic>>,
    ],
    [false, false, true]
  >
>;
