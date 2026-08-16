/**
 * Compile-time laws for `02_targets/vite/01_projection`.
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
import type { CompilerId } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { ArtifactProducer, ArtifactSlotReference, TargetConfigurationId, TargetParticipation } from '../../types.js';
import type { BuildEnvironmentName, ViteTargetId } from '../00_integration/types.js';
import type { ArmProjection, FleetProjection, ViteBuildFacility, ViteProjectionDisposition } from './types.js';

// ---------------------------------------------------------------------------
// Laws

/**
 * An EXACT participation specimen.
 *
 * Written out rather than aliased to `TargetParticipation`, which is the broad
 * form: a covariance law stated against the broad form is satisfied by every
 * widening, so it proves nothing and reports that it proved something.
 */
type LawParticipation = TargetParticipation<
  ViteTargetId,
  TargetConfigurationId<'vite.build'>,
  RevisionId
>;

type LawDemands = readonly [ArtifactSlotReference];

type LawProducer = CaseOf<ArtifactProducer, 'direct-composition'>;


/**
 * Compile-time law: the projection is derived from the fleet, not listed beside
 * it.
 *
 * A two-arm fleet projects to exactly two decisions. If `FleetProjection` ever
 * stops reading its parameter, this collapses and the law fails.
 */
export type TheProjectionIsDerivedFromTheFleet = Assert<
  Equal<
    FleetProjection<readonly [CompilerId, CompilerId]>,
    readonly [ArmProjection, ArmProjection]
  >
>;


/**
 * Compile-time law: an unsupported arm carries evidence.
 *
 * The predecessor's silent no-op is unrepresentable: there is no arm of
 * `ArmProjection` that means "nothing happened and nobody was told".
 */
export type AnUnsupportedArmCarriesEvidence = Assert<
  Equal<
    [
      Equal<ArmProjection['_tag'], 'projected' | 'unsupported'>,
      Equal<CaseOf<ArmProjection, 'unsupported'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, true]
  >
>;


/**
 * Compile-time law: a projected arm declares where it applies.
 *
 * Non-empty, for the same reason applicability is non-empty in this child's
 * integration home: the empty case is universality wearing an omission.
 */
export type AProjectedArmDeclaresItsEnvironments = Assert<
  Equal<
    [
      Equal<CaseOf<ArmProjection, 'projected'>['environments'], NonEmptyTuple<BuildEnvironmentName>>,
      readonly [] extends CaseOf<ArmProjection, 'projected'>['environments'] ? true : false,
    ],
    [true, false]
  >
>;


/** Compile-time law: the facility carries its exact axes on covariant members. */
export type TheViteFacilityCarriesItsAxesCovariantly = Assert<
  Equal<
    [
      ViteBuildFacility<LawParticipation, LawDemands, LawProducer>['participation'],
      ViteBuildFacility<LawParticipation, LawDemands, LawProducer>['slots'],
    ],
    [LawParticipation, LawDemands]
  >
>;


/**
 * Compile-time law: the facility names no requester and no foreign ecosystem.
 *
 * The absences are the law. A `framework`, `astro`, `integration`, or `hooks`
 * member would make this facility fillable only by the requester it was shaped
 * around — a sibling import re-entering through the type system.
 */
export type TheViteFacilityNamesNoRequester = Assert<
  Equal<
    [
      'astro' extends keyof ViteBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
      'framework' extends keyof ViteBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
      'integration' extends keyof ViteBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
      'hooks' extends keyof ViteBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
      'plugin' extends keyof ViteBuildFacility<LawParticipation, LawDemands, LawProducer> ? true : false,
    ],
    [false, false, false, false, false]
  >
>;


/** Compile-time law: only production carries artifacts. */
export type OnlyViteProductionCarriesArtifacts = Assert<
  Equal<
    [
      Equal<ViteProjectionDisposition<LawProducer>['_tag'], 'empty' | 'produced' | 'unsupported' | 'unresolved' | 'failed'>,
      'produced' extends keyof CaseOf<ViteProjectionDisposition<LawProducer>, 'empty'> ? true : false,
      'produced' extends keyof CaseOf<ViteProjectionDisposition<LawProducer>, 'unresolved'> ? true : false,
    ],
    [true, false, false]
  >
>;
