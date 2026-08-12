/**
 * Cloudflare target identity, registration, and compatibility evidence.
 *
 * The predecessor's Cloudflare package is the reason the sibling-exclusion rule
 * exists. It imported a framework sibling, and it lost its independent story
 * entirely: no direct worker entry anywhere, a README that required the
 * framework, a health probe literally labelled after the framework's output
 * mode, and one example. The two packages that imported no sibling both kept
 * first-class direct use.
 *
 * So this child names no framework, imports no sibling, and is registrable on
 * its own. Whether a framework participated in producing what it deploys is a
 * question it has no member to ask.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
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

export type CloudflareAdapterId<Name extends string = string> = Brand<
  Name,
  'liteship.target.cloudflare.adapter-id'
>;
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

/**
 * Compile-time law: registration names no framework.
 *
 * The absences are the law, and this is the one the predecessor failed. A
 * member naming a framework — required or optional — would restore exactly the
 * dependency that cost the old package its direct path.
 */
export type RegistrationNamesNoFramework = Assert<
  Equal<
    [
      'astro' extends keyof CloudflareAdapterDefinition ? true : false,
      'framework' extends keyof CloudflareAdapterDefinition ? true : false,
      'integration' extends keyof CloudflareAdapterDefinition ? true : false,
      'middleware' extends keyof CloudflareAdapterDefinition ? true : false,
      'outputMode' extends keyof CloudflareAdapterDefinition ? true : false,
    ],
    [false, false, false, false, false]
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

/** The families this home owns, so none is correct and unreached. */
export interface CloudflareIntegrationTypeSurface {
  readonly adapter: CloudflareAdapterReference;
  readonly target: CloudflareTargetId;
  readonly compatibility: CloudflareCompatibility;
  readonly definition: CloudflareAdapterDefinition;
}
