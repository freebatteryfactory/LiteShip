/**
 * Compile-time laws for `00_core/11_scene`.
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

import type { Assert, CaseOf, Equal, NonEmptyTuple, TagOf } from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { EntityFieldReference } from '../03_schema/types.js';
import type { InterpolatorReference } from '../09_quantization/types.js';
import type { AuthoredEnvelope, CoordinateSpaceDefinition, CoordinateSpaceId, GeometryCapabilities, GeometryValue, MaterialCapabilities, MaterialDefinition, Point2, ProjectionFidelity, ProjectionSupport, SceneEntity, SceneMarker, TimelineDefinition, TimelineKey, TimelineTrack, ToleranceProfileReference } from './types.js';

type ScreenSpace = CoordinateSpaceId<'screen'>;

type WorldSpace = CoordinateSpaceId<'world'>;

type LocalSpace = CoordinateSpaceId<'local'>;

type ChildSpaceDefinition = CoordinateSpaceDefinition<LocalSpace, 2, WorldSpace>;

type IsRequired<Value, Key extends keyof Value> = {} extends Pick<Value, Key> ? false : true;


/** Compile-time law: a child space must declare its parent transform. */
export type SceneChildSpaceRequiresParentProjection = Assert<
  Equal<IsRequired<ChildSpaceDefinition, 'toParent'>, true>
>;


/** Compile-time law: values from unrelated spaces are not assignable. */
export type SceneRejectsImplicitSpaceConversion = Assert<
  Equal<Point2<ScreenSpace> extends Point2<WorldSpace> ? true : false, false>
>;


/** Compile-time law: timeline interpolation is a typed shared reference, not a string. */
export type SceneRejectsStringInterpolator = Assert<
  Equal<string extends NonNullable<TimelineKey['interpolatorToNext']> ? true : false, false>
>;


type ValueTrackCase = Extract<TimelineTrack, { readonly _tag: 'value' }>;

type StateTrackCase = Extract<TimelineTrack, { readonly _tag: 'state' }>;

type DriverTrackCase = Extract<TimelineTrack, { readonly _tag: 'driver' }>;

type TimelineFieldTarget =
  | ValueTrackCase['target']
  | StateTrackCase['target']
  | DriverTrackCase['target'];


/** Compile-time law: every field-writing track names both entity and schema field. */
export type SceneTimelineFieldTracksBindEntity = Assert<
  Equal<TimelineFieldTarget extends EntityFieldReference ? true : false, true>
>;


type ScreenGeometry = GeometryValue<ScreenSpace>;

type WorldGeometry = GeometryValue<WorldSpace>;


/** Compile-time law: geometry values retain their declared coordinate space. */
export type SceneGeometryRejectsForeignSpace = Assert<
  Equal<ScreenGeometry extends WorldGeometry ? true : false, false>
>;


// ---------------------------------------------------------------------------
// Projection-fidelity laws
// ---------------------------------------------------------------------------

/**
 * Compile-time law: the four fidelity arms carry four different obligations.
 *
 * Each arm's key set is compared individually. The predecessor shape encoded
 * this as one boolean and two optional members, and every incoherent
 * combination it admitted was reachable without a single type complaining.
 */
export type AProjectionFidelitySeparatesItsFourArms = Assert<
  Equal<
    [
      TagOf<ProjectionFidelity>,
      keyof CaseOf<ProjectionFidelity, 'exact'>,
      keyof CaseOf<ProjectionFidelity, 'approximate'>,
      keyof CaseOf<ProjectionFidelity, 'fallback'>,
      keyof CaseOf<ProjectionFidelity, 'unsupported'>,
    ],
    [
      'exact' | 'approximate' | 'fallback' | 'unsupported',
      '_tag',
      '_tag' | 'tolerance',
      '_tag' | 'egress' | 'reason',
      '_tag' | 'diagnostics' | 'remediation',
    ]
  >
>;


/**
 * Compile-time law: an exact projection carries no error bound, and an
 * approximate one cannot be stated without a tolerance profile.
 *
 * These two were representable together in the predecessor shape, which is the
 * whole reason the algebra exists.
 */
export type AnExactProjectionCarriesNoTolerance = Assert<
  Equal<
    [
      'tolerance' extends keyof CaseOf<ProjectionFidelity, 'exact'> ? true : false,
      CaseOf<ProjectionFidelity, 'approximate'>['tolerance'] extends ToleranceProfileReference
        ? true
        : false,
      number extends CaseOf<ProjectionFidelity, 'approximate'>['tolerance'] ? true : false,
    ],
    [false, true, false]
  >
>;


/**
 * Compile-time law: an unsupported projection carries diagnostics and a
 * remediation, and the diagnostic population cannot be empty.
 *
 * Silence is the failure mode. A subject that cannot reach an egress and says
 * nothing about why is indistinguishable from one nobody asked about, and the
 * export path would have no honest thing to report.
 */
export type AnUnsupportedProjectionCannotBeSilent = Assert<
  Equal<
    [
      CaseOf<ProjectionFidelity, 'unsupported'>['diagnostics'] extends NonEmptyTuple<Diagnostic>
        ? true
        : false,
      readonly Diagnostic[] extends CaseOf<ProjectionFidelity, 'unsupported'>['diagnostics']
        ? true
        : false,
      'remediation' extends keyof CaseOf<ProjectionFidelity, 'unsupported'> ? true : false,
    ],
    [true, false, true]
  >
>;


/**
 * Compile-time law: geometry and material declare support through one shared
 * vocabulary, and material genuinely declares it.
 *
 * Material silence is what made an entity's effective disposition readable off
 * geometry alone. If this member is ever removed, the optimism returns and
 * nothing else in the tree notices.
 */
export type GeometryAndMaterialDeclareSupportThroughOneVocabulary = Assert<
  Equal<
    [
      GeometryCapabilities['projections'],
      MaterialCapabilities['projections'],
      MaterialDefinition['capabilities'] extends MaterialCapabilities ? true : false,
    ],
    [NonEmptyTuple<ProjectionSupport>, NonEmptyTuple<ProjectionSupport>, true]
  >
>;


/**
 * Compile-time law: an entity declares no egress roster of its own.
 *
 * The entity composes a geometry and a material; the compiler derives what that
 * composition reaches. An entity that could declare its own support would let a
 * composition claim an egress neither of its parts can reach — an authored
 * override wearing the costume of a derivation.
 */
export type ASceneEntityDeclaresNoEgressRoster = Assert<
  Equal<
    [
      'projections' extends keyof SceneEntity ? true : false,
      'capabilities' extends keyof SceneEntity ? true : false,
      'egress' extends keyof SceneEntity ? true : false,
    ],
    [false, false, false]
  >
>;


/**
 * Compile-time law: authored temporal meaning stays on the timeline, and the
 * envelope defers interpolation to the quantization authority.
 */
export type AuthoredTemporalMeaningBelongsToTheScene = Assert<
  Equal<
    [
      TimelineDefinition['markers'] extends readonly SceneMarker[] ? true : false,
      AuthoredEnvelope['interpolator'] extends InterpolatorReference ? true : false,
      AuthoredEnvelope['keys'] extends NonEmptyTuple<TimelineKey> ? true : false,
    ],
    [true, true, true]
  >
>;
