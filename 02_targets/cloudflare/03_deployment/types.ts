/**
 * The deployment relation: what this child consumes, and what it refuses.
 *
 * This is where direct mode stops being a promise. The umbrella's
 * `DeployableApplication` binds produced artifacts whose producers may be an
 * ecosystem target or a host-only composition, and this home consumes that type
 * — the *only* type — so there is nowhere for a framework branch to attach.
 *
 * A deployment therefore has no member naming a framework, no arm for
 * "framework-produced", and no way to ask. If a consumer ever needs to know
 * which producer was involved, the contract is in the wrong place.
 *
 * @module
 */

import type {
  Algebra,
  NonEmptyTuple,
} from '../../../types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  DeployableApplication,
  TargetConfigurationId,
  TargetParticipation,
} from '../../types.js';
import type { CloudflareTargetId } from '../00_integration/types.js';
import type { AdmittedCloudflareConfiguration } from '../01_configuration/types.js';
import type { BindingResolution, PlatformBinding } from '../02_binding/types.js';

/**
 * One deployment request.
 *
 * The application enters whole, as the umbrella's type. Its artifacts already
 * carry their producers, addresses, digests, and slots, so nothing is restated
 * here — and nothing is added that would let this child inspect provenance.
 */
export interface DeploymentRequest<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly participation: TargetParticipation<CloudflareTargetId, Config, Revision>;
  readonly application: DeployableApplication;
  readonly configuration: AdmittedCloudflareConfiguration<Config, Revision>;
  readonly bindings: readonly PlatformBinding[];
}

/**
 * How a deployment turned out.
 *
 * `refused` is pre-attempt: the request was not deployable, and nothing was
 * sent. `failed` is post-attempt: a lawful request broke while deploying. The
 * altitude distinction is the umbrella's rejection-versus-failure rule applied
 * one tier down, and collapsing it would make a rejected deployment
 * indistinguishable from a half-completed one.
 */
export type DeploymentOutcome<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  deployed: {
    readonly request: DeploymentRequest<Config, Revision>;
    readonly bindings: readonly BindingResolution[];
  };
  refused: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The families this home owns, so none is correct and unreached. */
export interface CloudflareDeploymentTypeSurface {
  readonly request: DeploymentRequest;
  readonly outcome: DeploymentOutcome;
}
