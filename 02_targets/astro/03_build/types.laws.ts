/**
 * Compile-time laws for `02_targets/astro/03_build`.
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
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { ArtifactId, CompileOutcome, ProjectionTargetId } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, HoleContract, NonEmptyTuple, Signature } from '../../../types.js';
import type { ArtifactProducer, ArtifactSlotId, ArtifactSlotReference, ProducedArtifact, SlotClaim, TargetConfigurationId, TargetParticipation } from '../../types.js';
import type { AstroTargetId } from '../00_integration/types.js';
import type { ArtifactSlotDemands, AstroBuildFacility, AstroBuildFacilityRequirement, AstroProjectionDisposition, AstroProjectionRequest } from './types.js';

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
