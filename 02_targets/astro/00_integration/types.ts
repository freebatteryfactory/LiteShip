/**
 * Astro target identity, integration registration, and compatibility evidence.
 *
 * This home answers who this child is and what it can honestly claim about the
 * ecosystem it attaches to. It does not freeze hook names or version ranges as
 * semantic constants: those are empirical facts that change on the ecosystem's
 * schedule, so they live inside compatibility evidence where they can be
 * restated without amending the architecture.
 *
 * Support is a claim that must be paid for. Absent evidence is `unavailable`,
 * not support — the predecessor shipped a doctor probe that reported a target
 * healthy because nothing had contradicted it yet.
 *
 * @module
 */

import type {
  Address,
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

export type AstroIntegrationId<Name extends string = string> = Brand<
  Name,
  'liteship.target.astro.integration-id'
>;
export type AstroIntegrationReference<Id extends AstroIntegrationId = AstroIntegrationId> = Reference<
  'astro-integration',
  Id
>;

/**
 * The one ecosystem target this child is.
 *
 * Written as an exact instantiation rather than a fresh brand. A second
 * ecosystem-target identity here would put the umbrella's identity beside a
 * local copy, and the two would agree only while someone kept checking.
 */
export type AstroTargetId = EcosystemTargetId<'astro'>;

/** A declared ecosystem version range. Evidence, never a semantic constant. */
export type EcosystemVersionRange = Brand<string, 'liteship.target.astro.version-range'>;

/**
 * Address of one recorded Astro compatibility observation.
 *
 * Named and typed distinctly from its sibling's. The two are different
 * documents about different ecosystems, and one shared name would make them one
 * type to the compiler -- an evidence record for one ecosystem would satisfy a
 * claim about the other.
 */
export type AstroCompatibilityEvidence =
  ContentAddress<'application/vnd.liteship.astro-compatibility+cbor'>;

/**
 * What this integration can honestly claim about an ecosystem version.
 *
 * Four arms, deliberately not three. `refused` knows the range and says no;
 * `unavailable` could not determine the range at all. Collapsing them turns
 * "we did not look" into "we checked and it is fine", which is the shape a
 * silent degradation takes when it is written down.
 */
export type AstroCompatibility = Algebra<{
  supported: {
    readonly range: EcosystemVersionRange;
    readonly evidence: AstroCompatibilityEvidence;
  };
  degraded: {
    readonly range: EcosystemVersionRange;
    readonly evidence: AstroCompatibilityEvidence;
    readonly limitations: NonEmptyTuple<Diagnostic>;
  };
  refused: {
    readonly range: EcosystemVersionRange;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

/**
 * One integration definition bound to one exact target configuration revision.
 *
 * The participation is the umbrella's, at this child's exact target identity.
 * Nothing here restates the configuration or the target separately.
 */
export interface AstroIntegrationDefinition<
  Integration extends AstroIntegrationId = AstroIntegrationId,
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly integration: AstroIntegrationReference<Integration>;
  readonly participation: TargetParticipation<AstroTargetId, Config, Revision>;
  readonly compatibility: AstroCompatibility;
}

// ---------------------------------------------------------------------------
// Laws

type LawIntegration = AstroIntegrationId<'liteship'>;
type LawConfig = TargetConfigurationId<'astro.build'>;
/** A committed revision written as a literal carrier, per the identity home. */
type LawRevisionA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:1111111111111111111111111111111111111111111111111111111111111111'
>;

/** Compile-time law: an integration reference is exact over the integration it names. */
export type AnIntegrationReferenceIsExactOverItsIntegration = Assert<
  Equal<AstroIntegrationReference<LawIntegration>, Reference<'astro-integration', LawIntegration>>
>;

/**
 * Compile-time law: this child names the Astro ecosystem target and no other.
 *
 * Compared against the literal instantiation rather than against the alias, so
 * the law still fails if `AstroTargetId` stops reading `'astro'`.
 */
export type TheIntegrationNamesTheAstroTargetExactly = Assert<
  Equal<AstroIntegrationDefinition<LawIntegration, LawConfig, LawRevisionA>['participation'],
    TargetParticipation<EcosystemTargetId<'astro'>, LawConfig, LawRevisionA>>
>;

/**
 * Compile-time law: compatibility keeps its four altitudes distinct.
 *
 * Checked by tag, because two arms carrying the same payload would be
 * interchangeable to the compiler no matter what the comments promise.
 */
export type CompatibilityKeepsItsFourAltitudes = Assert<
  Equal<
    AstroCompatibility['_tag'],
    'supported' | 'degraded' | 'refused' | 'unavailable'
  >
>;

/**
 * Compile-time law: absent evidence is not support.
 *
 * `unavailable` carries no range and no evidence address, so a value that never
 * observed the ecosystem cannot be spelled as one that did. `supported` carries
 * no diagnostics tuple, so a refusal cannot be smuggled through it either.
 */
export type AbsentEvidenceIsNotSupport = Assert<
  Equal<
    [
      'evidence' extends keyof CaseOf<AstroCompatibility, 'unavailable'> ? true : false,
      'range' extends keyof CaseOf<AstroCompatibility, 'unavailable'> ? true : false,
      'evidence' extends keyof CaseOf<AstroCompatibility, 'supported'> ? true : false,
      'limitations' extends keyof CaseOf<AstroCompatibility, 'supported'> ? true : false,
    ],
    [false, false, true, false]
  >
>;

/**
 * Compile-time law: a degraded claim states what it cannot do.
 *
 * A degradation with an empty limitation list is indistinguishable from full
 * support, which is the silent-degradation shape this child exists to refuse.
 */
export type ADegradedClaimStatesItsLimits = Assert<
  Equal<CaseOf<AstroCompatibility, 'degraded'>['limitations'], NonEmptyTuple<Diagnostic>>
>;

/** The families this home owns, so none is correct and unreached. */
export interface AstroIntegrationTypeSurface {
  readonly integration: AstroIntegrationReference;
  readonly target: AstroTargetId;
  readonly compatibility: AstroCompatibility;
  readonly definition: AstroIntegrationDefinition;
}
