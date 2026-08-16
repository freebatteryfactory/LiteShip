/**
 * The one build facility this child needs, stated as a requirement no supplier
 * gets to define.
 *
 * Astro genuinely uses Vite. This home expresses that without importing Vite,
 * naming Vite, or borrowing Vite's vocabulary: it declares a hole whose
 * contract is written entirely in already-closed upstream language — the
 * umbrella's participation and slots, core's planned compilation product, core
 * artifacts. A supplier converges with it or does not.
 *
 * Two shapes were rejected on the way here, both of which compile and neither
 * of which proves anything.
 *
 * A free contract parameter — `Hole<name, Facility>` with `Facility`
 * unconstrained — lets every supplier satisfy the requirement by nominating
 * itself. The binding compiles and demonstrates that a shoe fits itself.
 *
 * A parameter constrained by the *broad* instantiation is the same failure
 * wearing a constraint. `Facility extends AstroBuildFacility<TargetParticipation,
 * NonEmptyTuple<ArtifactSlotReference>>` is satisfied by every broadening,
 * because broadening is precisely what the broad form permits.
 *
 * So the requirement is generic over the exact axes and the supplier is
 * constrained by *those*. The parameter names who filled the socket; it does
 * not define what the socket means.
 *
 * One further consequence, found by measurement rather than reasoning: an
 * exactness axis carried only inside `project`'s input is unprovable.
 * `Signature<Input, Output>` stores its input as `(input: Input) => void`,
 * which is contravariant, so a supplier that accepts a broader request stays
 * assignable and a broadening mutation survives. Every axis that must be exact
 * is therefore also a covariant member of the facility itself.
 *
 * @module
 */

import type {
  Algebra,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Signature,
} from '../../../types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type {
  ArtifactId,
  CompileOutcome,
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

/** A closed, ordered tuple of exact artifact-slot demands. */
export type ArtifactSlotDemands = NonEmptyTuple<ArtifactSlotReference>;

/**
 * What a facility is asked to project.
 *
 * The planned compilation product enters whole, as core's own arm. A hand
 * assembled bag of satisfiers, groundings, offers, and requirement rows would
 * be a second copy of facts the compile outcome already owns, and the two would
 * agree only while someone kept checking.
 */
export interface AstroProjectionRequest<
  Participation extends TargetParticipation,
  Demands extends ArtifactSlotDemands,
> {
  readonly participation: Participation;
  readonly planned: CaseOf<CompileOutcome, 'planned'>;
  readonly demands: Demands;
}

/**
 * How a projection turned out.
 *
 * Five arms, and the distinctions are the point. `empty` means there were
 * genuinely no effective demands. `unsupported` means the facility does not do
 * this and says so with evidence. `unresolved` means source, configuration, or
 * ancestry could not be determined. `failed` means a lawfully selected facility
 * broke while projecting. Collapsing any of these into `empty` lets a virtual
 * module return an empty object when its data is missing, indistinguishable from
 * a genuinely empty project.
 */
export type AstroProjectionDisposition<Producer extends ArtifactProducer = ArtifactProducer> = Algebra<{
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
 * The socket. Astro fixes this shape; suppliers fill it.
 *
 * `participation` and `slots` are covariant members carrying the same exact
 * axes the request carries. That repetition is deliberate and load-bearing:
 * without it, broadening either axis survives contravariance and the join
 * proves nothing. `claims` is exact over the same demands, so a facility cannot
 * claim slots it was not asked about.
 */
export interface AstroBuildFacility<
  Participation extends TargetParticipation,
  Demands extends ArtifactSlotDemands,
  Producer extends ArtifactProducer,
> {
  readonly participation: Participation;
  readonly slots: Demands;
  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly project: Signature<
    AstroProjectionRequest<Participation, Demands>,
    AstroProjectionDisposition<Producer>
  >;
}

/**
 * The requirement. The parameter identifies who filled the socket.
 *
 * `Facility` is constrained by the *exact* instantiation, so a supplier that
 * broadens any governed axis is not a legal type argument at all.
 */
export type AstroBuildFacilityRequirement<
  Participation extends TargetParticipation,
  Demands extends ArtifactSlotDemands,
  Producer extends ArtifactProducer,
  Facility extends AstroBuildFacility<Participation, Demands, Producer>,
> = Hole<'liteship.target.astro.build-facility', Facility>;

/** The families this home owns, so none is correct and unreached. */
export interface AstroBuildTypeSurface {
  readonly demands: ArtifactSlotDemands;
  readonly request: AstroProjectionRequest<TargetParticipation, ArtifactSlotDemands>;
  readonly disposition: AstroProjectionDisposition;
  readonly facility: AstroBuildFacility<TargetParticipation, ArtifactSlotDemands, ArtifactProducer>;
}
