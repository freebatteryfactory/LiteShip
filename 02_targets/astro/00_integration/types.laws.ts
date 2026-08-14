/**
 * Compile-time laws for `02_targets/astro/00_integration`.
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
import type { Address, Assert, CaseOf, Equal, NonEmptyTuple, Reference } from '../../../types.js';
import type { EcosystemTargetId, TargetConfigurationId, TargetParticipation } from '../../types.js';
import type { AstroCompatibility, AstroIntegrationDefinition, AstroIntegrationId, AstroIntegrationReference } from './types.js';

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
