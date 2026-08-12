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
  Assert,
  CaseOf,
  Equal,
  Hole,
  HoleContract,
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
  TargetConfigurationId,
  TargetParticipation,
} from '../../types.js';
import type { AstroTargetId } from '../00_integration/types.js';

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
 * broke while projecting. Collapsing any of these into `empty` reproduces the
 * predecessor's worst shape: a virtual module that returned an empty object
 * when its data was missing, indistinguishable from a genuinely empty project.
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

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'astro.build'>;
type LawRevision = RevisionId;
type LawParticipation = TargetParticipation<AstroTargetId, LawConfig, LawRevision>;
type LawDemands = readonly [ArtifactSlotReference];
/** An exact producer arm, so producer broadening has something to broaden from. */
type LawProducer = CaseOf<ArtifactProducer, 'direct-composition'>;

interface LawFacility {
  readonly participation: LawParticipation;
  readonly slots: LawDemands;
  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly project: Signature<
    AstroProjectionRequest<LawParticipation, LawDemands>,
    AstroProjectionDisposition<LawProducer>
  >;
}

/**
 * Compile-time law: the hole hands consumers the supplier they named, not a
 * broadened stand-in.
 *
 * Read through `HoleContract`, which is the path a consumer actually takes.
 * A law that inspected the alias directly would pass while the public path
 * handed out the broad form — the defect class that cost this project four
 * host folds.
 */
export type TheHoleCarriesTheExactFacility = Assert<
  Equal<
    HoleContract<AstroBuildFacilityRequirement<LawParticipation, LawDemands, LawProducer, LawFacility>>,
    LawFacility
  >
>;

/**
 * Compile-time law: the exactness axes survive on covariant members.
 *
 * Checked on the facility itself rather than through the request, because the
 * request holds them contravariantly and a broadening there is assignable.
 */
export type TheFacilityCarriesItsAxesCovariantly = Assert<
  Equal<
    [AstroBuildFacility<LawParticipation, LawDemands, LawProducer>['participation'], AstroBuildFacility<LawParticipation, LawDemands, LawProducer>['slots']],
    [LawParticipation, LawDemands]
  >
>;

/**
 * Compile-time law: a broadened supplier is not a legal filler of an exact
 * socket.
 *
 * The negative is stated structurally rather than left to the fixture, so the
 * contract itself refuses the broadening even before verification runs.
 */
export type ABroadenedSupplierDoesNotFitTheSocket = Assert<
  Equal<
    [
      LawFacility extends AstroBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
      AstroBuildFacility<TargetParticipation, ArtifactSlotDemands, ArtifactProducer> extends AstroBuildFacility<
        LawParticipation,
        LawDemands,
        LawProducer
      >
        ? true
        : false,
    ],
    [true, false]
  >
>;

/**
 * Compile-time law: the produced disposition pins the exact producer.
 *
 * Without this the producer axis can widen and the only thing that dies is an
 * unused-type-parameter warning — a hygiene death, which is no evidence at all
 * about what the architecture permits.
 */
export type TheProducedDispositionPinsItsProducer = Assert<
  Equal<
    CaseOf<AstroProjectionDisposition<LawProducer>, 'produced'>['produced'],
    NonEmptyTuple<ProducedArtifact<ArtifactId, ProjectionTargetId, RevisionId, LawProducer, ArtifactSlotId>>
  >
>;

/**
 * Compile-time law: the disposition keeps empty, unsupported, unresolved, and
 * failed distinct, and only production carries artifacts.
 */
export type TheDispositionKeepsItsFiveAltitudes = Assert<
  Equal<
    [
      Equal<AstroProjectionDisposition<LawProducer>['_tag'], 'empty' | 'produced' | 'unsupported' | 'unresolved' | 'failed'>,
      'produced' extends keyof CaseOf<AstroProjectionDisposition<LawProducer>, 'empty'> ? true : false,
      'produced' extends keyof CaseOf<AstroProjectionDisposition<LawProducer>, 'unsupported'> ? true : false,
      'produced' extends keyof CaseOf<AstroProjectionDisposition<LawProducer>, 'unresolved'> ? true : false,
      'produced' extends keyof CaseOf<AstroProjectionDisposition<LawProducer>, 'failed'> ? true : false,
    ],
    [true, false, false, false, false]
  >
>;

/**
 * Compile-time law: an unsupported, unresolved, or failed projection says why.
 *
 * Each carries a non-empty diagnostic tuple, so none of them can be spelled as
 * a quiet nothing.
 *
 * Written as per-element `Equal` results rather than the arm types themselves.
 * `CaseOf<…>['x']` is a deferred indexed access over an `Extract` union: TypeScript
 * resolves it when compared alone but not when it sits inside a tuple, so the
 * direct form reports a mismatch between two identical types. Booleans in the
 * tuple keep identity semantics and resolve eagerly.
 */
export type EveryNonProductiveDispositionExplainsItself = Assert<
  Equal<
    [
      Equal<CaseOf<AstroProjectionDisposition<LawProducer>, 'unsupported'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      Equal<CaseOf<AstroProjectionDisposition<LawProducer>, 'unresolved'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      Equal<CaseOf<AstroProjectionDisposition<LawProducer>, 'failed'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, true, true]
  >
>;

/**
 * Compile-time law: the request carries the planned outcome whole and restates
 * none of its parts.
 *
 * The absences are the law. A request that named satisfiers, groundings,
 * offers, or a free requirement row would own a second copy of the plan.
 */
export type TheRequestRestatesNoPlanningFacts = Assert<
  Equal<
    [
      AstroProjectionRequest<LawParticipation, LawDemands>['planned'],
      'satisfaction' extends keyof AstroProjectionRequest<LawParticipation, LawDemands> ? true : false,
      'grounding' extends keyof AstroProjectionRequest<LawParticipation, LawDemands> ? true : false,
      'offers' extends keyof AstroProjectionRequest<LawParticipation, LawDemands> ? true : false,
      'requirements' extends keyof AstroProjectionRequest<LawParticipation, LawDemands> ? true : false,
    ],
    [CaseOf<CompileOutcome, 'planned'>, false, false, false, false]
  >
>;

/**
 * Compile-time law: the facility names no ecosystem but its own.
 *
 * No plugin handle, no hook payload, no ambient context. Any of those would
 * make the contract unfillable by anything except the supplier it was shaped
 * around, which is the sibling import re-entering through the type system.
 */
export type TheFacilityNamesNoForeignEcosystem = Assert<
  Equal<
    [
      'plugin' extends keyof AstroBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
      'vite' extends keyof AstroBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
      'hooks' extends keyof AstroBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
      'context' extends keyof AstroBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
    ],
    [false, false, false, false]
  >
>;

/** The families this home owns, so none is correct and unreached. */
export interface AstroBuildTypeSurface {
  readonly demands: ArtifactSlotDemands;
  readonly request: AstroProjectionRequest<TargetParticipation, ArtifactSlotDemands>;
  readonly disposition: AstroProjectionDisposition;
  readonly facility: AstroBuildFacility<TargetParticipation, ArtifactSlotDemands, ArtifactProducer>;
}
