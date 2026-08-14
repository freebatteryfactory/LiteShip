/**
 * The complete derived projection of the core compiler fleet, and the build
 * facility this child exposes.
 *
 * Nothing here imports Astro, names Astro, or mentions a framework. The
 * facility is written in upstream vocabulary — the umbrella's participation,
 * slots, claims, and produced artifacts, core's planned compilation product.
 * Whether it converges with any requester is a question verification asks; it
 * is not a question this file may answer about itself.
 *
 * The fleet projection is derived, never listed. The predecessor kept a
 * hand-maintained set of transforms, so adding a compiler capability produced
 * silence rather than a build error. Here the projection is a mapped type over
 * the fleet: a new arm creates an obligation to project it or to refuse it with
 * evidence, and there is no third option.
 *
 * @module
 */

import type {
  Algebra,
  CaseOf,
  NonEmptyTuple,
  Signature,
} from '../../../types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type {
  ArtifactId,
  CompileOutcome,
  CompilerId,
  ProjectionTargetId,
} from '../../../00_core/14_compiler/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  ArtifactProducer,
  ArtifactSlotId,
  ArtifactSlotReference,
  ProducedArtifact,
  SlotClaim,
  TargetParticipation,
} from '../../types.js';
import type {
  BuildEnvironmentName,
} from '../00_integration/types.js';

/** A closed, ordered tuple of exact artifact-slot demands. */
export type ViteSlotDemands = NonEmptyTuple<ArtifactSlotReference>;

/**
 * What one compiler arm becomes on the Vite side.
 *
 * `unsupported` is a first-class outcome carrying evidence. An arm that is
 * neither projected nor explicitly refused is not representable, which is the
 * difference between this and a lookup table with holes in it.
 */
export type ArmProjection = Algebra<{
  projected: { readonly environments: NonEmptyTuple<BuildEnvironmentName> };
  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * The fleet projection, derived from the fleet rather than restated beside it.
 *
 * A mapped type over the arm roster. Adding an arm to the roster adds a key
 * here, and a projection that has not decided about it does not type-check.
 */
export type FleetProjection<Fleet extends readonly CompilerId[]> = {
  readonly [Index in keyof Fleet]: ArmProjection;
};

/** What this facility is asked to project. */
export interface ViteProjectionRequest<
  Participation extends TargetParticipation,
  Demands extends ViteSlotDemands,
> {
  readonly participation: Participation;
  readonly planned: CaseOf<CompileOutcome, 'planned'>;
  readonly demands: Demands;
}

/** How a projection turned out. */
export type ViteProjectionDisposition<Producer extends ArtifactProducer = ArtifactProducer> = Algebra<{
  empty: Record<never, never>;
  produced: {
    readonly produced: NonEmptyTuple<
      ProducedArtifact<ArtifactId, ProjectionTargetId, RevisionId, Producer, ArtifactSlotId>
    >;
  };
  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * The facility this child exposes.
 *
 * Generic over the shared upstream axes, so a composition point may instantiate
 * it at whatever exact participation, demands, and producer a requester
 * governs. The *shape* — which members exist, what `project` accepts and
 * returns, which dispositions are possible — is this child's own decision,
 * taken without reference to any requester.
 */
export interface ViteBuildFacility<
  Participation extends TargetParticipation,
  Demands extends ViteSlotDemands,
  Producer extends ArtifactProducer,
> {
  readonly participation: Participation;
  readonly slots: Demands;
  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly project: Signature<
    ViteProjectionRequest<Participation, Demands>,
    ViteProjectionDisposition<Producer>
  >;
}

/** The families this home owns, so none is correct and unreached. */
export interface ViteProjectionTypeSurface {
  readonly arm: ArmProjection;
  readonly fleet: FleetProjection<readonly [CompilerId]>;
  readonly request: ViteProjectionRequest<TargetParticipation, ViteSlotDemands>;
  readonly disposition: ViteProjectionDisposition;
  readonly facility: ViteBuildFacility<TargetParticipation, ViteSlotDemands, ArtifactProducer>;
}
