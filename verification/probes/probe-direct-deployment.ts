// Direct mode, finally exercised. This file MUST compile.
//
// The umbrella has carried an empty `direct-composition` arm since it was
// sealed, on the claim that a composition of hosts alone can produce what a
// framework-produced artifact would, and that the consuming path does not
// branch. Nothing had ever tested it: the arm was compiled in, but no consumer
// existed to consume both.
//
// Cloudflare is that consumer. Below, one application is assembled from
// artifacts produced by an ecosystem target and another from artifacts produced
// by a host-only composition, and both enter the same deployment request
// through the same member. There is no second path, no flag, and no arm to
// branch on -- which is what the claim actually meant.
//
// The predecessor failed exactly this. Its Cloudflare package imported a
// framework sibling, shipped no direct worker entry anywhere, and its health
// probe was labelled after the framework's output mode.

import type { Address, CaseOf, NonEmptyTuple } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { ArtifactId, ProjectionTargetId } from './00_core/14_compiler/types.js';
import type {
  ArtifactProducer,
  ArtifactSlotId,
  DeployableApplication,
  ProducedArtifact,
  TargetConfigurationId,
  TargetParticipation,
} from './02_targets/types.js';
import type { CloudflareTargetId } from './02_targets/cloudflare/00_integration/types.js';
import type { AdmittedCloudflareConfiguration } from './02_targets/cloudflare/01_configuration/types.js';
import type { PlatformBinding } from './02_targets/cloudflare/02_binding/types.js';
import type {
  DeploymentOutcome,
  DeploymentRequest,
} from './02_targets/cloudflare/03_deployment/types.js';

type Revision = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
>;
type Config = TargetConfigurationId<'cloudflare.deploy'>;

/** Artifacts produced with a framework in the composition. */
type FrameworkProduced = ProducedArtifact<
  ArtifactId,
  ProjectionTargetId,
  Revision,
  CaseOf<ArtifactProducer, 'ecosystem-target'>,
  ArtifactSlotId
>;

/** Artifacts produced by hosts alone. No target, no participation, no configuration. */
type DirectProduced = ProducedArtifact<
  ArtifactId,
  ProjectionTargetId,
  Revision,
  CaseOf<ArtifactProducer, 'direct-composition'>,
  ArtifactSlotId
>;

declare const frameworkEntry: FrameworkProduced;
declare const frameworkAsset: FrameworkProduced;
declare const directEntry: DirectProduced;

// --- both assemble the same application type -------------------------------

export const frameworkApplication: DeployableApplication = {
  entry: frameworkEntry,
  assets: [frameworkAsset],
};

// A worker with no static files is an ordinary deployment, not a degenerate one.
export const directApplication: DeployableApplication = {
  entry: directEntry,
  assets: [],
};

// --- and both enter one deployment path ------------------------------------

declare const participation: TargetParticipation<CloudflareTargetId, Config, Revision>;
declare const configuration: AdmittedCloudflareConfiguration<Config, Revision>;
declare const bindings: readonly PlatformBinding[];

const deploy = (application: DeployableApplication): DeploymentRequest<Config, Revision> => ({
  participation,
  application,
  configuration,
  bindings,
});

// One function, called twice. If a branch were ever needed, it would have to
// appear here -- and there is no member it could read to decide.
export const fromFramework: DeploymentRequest<Config, Revision> = deploy(frameworkApplication);
export const fromHostsAlone: DeploymentRequest<Config, Revision> = deploy(directApplication);

// --- the outcome altitudes stay inhabited ----------------------------------

declare const refusal: NonEmptyTuple<Diagnostic>;
export const refused: DeploymentOutcome<Config, Revision> = {
  _tag: 'refused',
  diagnostics: refusal,
};
export const failed: DeploymentOutcome<Config, Revision> = {
  _tag: 'failed',
  diagnostics: refusal,
};
