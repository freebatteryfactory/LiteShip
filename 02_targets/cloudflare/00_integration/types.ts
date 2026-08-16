/**
 * Cloudflare target identity, registration, and compatibility evidence.
 *
 * A framework sibling import would make direct worker registration,
 * compatibility, and deployment unrepresentable. This child therefore names no
 * framework, imports no sibling, and is registrable on
 * its own. Whether a framework participated in producing what it deploys is a
 * question it has no member to ask.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  NonEmptyTuple,
  Reference,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  EcosystemTargetId,
  TargetConfigurationId,
  TargetParticipation,
} from '../../types.js';

/** Stable identity for one cloudflare adapter. */
export type CloudflareAdapterId<Name extends string = string> = Brand<
  Name,
  'liteship.target.cloudflare.adapter-id'
>;
/** Typed reference to one cloudflare adapter. */
export type CloudflareAdapterReference<Id extends CloudflareAdapterId = CloudflareAdapterId> =
  Reference<'cloudflare-adapter', Id>;

/** The one ecosystem target this child is. */
export type CloudflareTargetId = EcosystemTargetId<'cloudflare'>;

/** Address of one recorded Cloudflare compatibility observation. */
export type CloudflareCompatibilityEvidence =
  ContentAddress<'application/vnd.liteship.cloudflare-compatibility+cbor'>;

/** What this child can honestly claim about a platform generation. */
export type CloudflareCompatibility = Algebra<{
  supported: { readonly evidence: CloudflareCompatibilityEvidence };
  degraded: {
    readonly evidence: CloudflareCompatibilityEvidence;
    readonly limitations: NonEmptyTuple<Diagnostic>;
  };
  refused: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** One adapter registration bound to one exact target configuration revision. */
export interface CloudflareAdapterDefinition<
  Adapter extends CloudflareAdapterId = CloudflareAdapterId,
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly adapter: CloudflareAdapterReference<Adapter>;
  readonly participation: TargetParticipation<CloudflareTargetId, Config, Revision>;
  readonly compatibility: CloudflareCompatibility;
}

/** The families this home owns, so none is correct and unreached. */
export interface CloudflareIntegrationTypeSurface {
  readonly adapter: CloudflareAdapterReference;
  readonly target: CloudflareTargetId;
  readonly compatibility: CloudflareCompatibility;
  readonly definition: CloudflareAdapterDefinition;
}
