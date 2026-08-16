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
 * not support; absence of contradiction cannot establish compatibility.
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

/** Stable identity for one astro integration. */
export type AstroIntegrationId<Name extends string = string> = Brand<
  Name,
  'liteship.target.astro.integration-id'
>;
/** Typed reference to one astro integration. */
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

/** The families this home owns, so none is correct and unreached. */
export interface AstroIntegrationTypeSurface {
  readonly integration: AstroIntegrationReference;
  readonly target: AstroTargetId;
  readonly compatibility: AstroCompatibility;
  readonly definition: AstroIntegrationDefinition;
}
