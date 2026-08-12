/**
 * Scene meaning: coordinate spaces, transforms, hierarchy, geometry, materials,
 * timelines, systems, family patches, and subscene composition.
 *
 * Authoring remains declarative. Compilation may lower a scene into persistent
 * state, dense world planes, residual programs, shaders, DOM, SVG, video, or
 * other egresses without making those physical forms the scene ontology.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  NonEmptyTuple,
  Reference,
  RequirementRow,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type { EntityReference, RevisionReference, WorldReference } from '../02_identity/types.js';
import type { EntityFieldReference, FieldReference, SchemaReference } from '../03_schema/types.js';
import type { Timebase, Timecode } from '../04_time/types.js';
import type { EvidenceReference } from '../06_evidence/types.js';
import type { OperationInvocation, OperationReference } from '../07_operation/types.js';
import type { RevisionPatch, SystemDefinition } from '../08_state/types.js';
import type {
  InterpolatorReference,
  QuantizerReference,
  StateName,
} from '../09_quantization/types.js';

export type SceneId<Name extends string = string> = Brand<Name, 'liteship.scene-id'>;
export type CoordinateSpaceId<Name extends string = string> = Brand<Name, 'liteship.coordinate-space-id'>;
export type GeometryId<Name extends string = string> = Brand<Name, 'liteship.geometry-id'>;
export type MaterialId<Name extends string = string> = Brand<Name, 'liteship.material-id'>;
export type TimelineId<Name extends string = string> = Brand<Name, 'liteship.timeline-id'>;
export type TimelineKeyId<Name extends string = string> = Brand<Name, 'liteship.timeline-key-id'>;
export type GeometryPointId<Name extends string = string> = Brand<Name, 'liteship.geometry-point-id'>;
export type SceneReference<Id extends SceneId = SceneId> = Reference<'scene', Id>;
export type GeometryReference<Id extends GeometryId = GeometryId> = Reference<'geometry', Id>;
export type MaterialReference<Id extends MaterialId = MaterialId> = Reference<'material', Id>;
export type TimelineReference<Id extends TimelineId = TimelineId> = Reference<'timeline', Id>;
export type TimelineKeyReference<Id extends TimelineKeyId = TimelineKeyId> = Reference<'timeline-key', Id>;

export type SpatialDimension = 2 | 3;
export type SpatialHandedness = 'left-handed' | 'right-handed';
export type SpatialAxisDirection = 'right' | 'left' | 'up' | 'down' | 'forward' | 'backward';
export type SpatialUnit = 'unitless' | 'pixel' | 'point' | 'meter' | 'centimeter' | 'millimeter' | 'percent' | 'normalized';

/** One named axis in a declared coordinate space. */
export interface SpatialAxis {
  readonly name: 'x' | 'y' | 'z';
  readonly positive: SpatialAxisDirection;
}

/** Shared coordinate-space declaration independent from parent attachment. */
interface CoordinateSpaceBase<
  Id extends CoordinateSpaceId,
  Dimension extends SpatialDimension,
> {
  readonly id: Id;
  readonly dimension: Dimension;
  readonly axes: Dimension extends 2
    ? readonly [SpatialAxis, SpatialAxis]
    : readonly [SpatialAxis, SpatialAxis, SpatialAxis];
  readonly handedness?: Dimension extends 3 ? SpatialHandedness : never;
  readonly unit: SpatialUnit;
  readonly address: ContentAddress<'application/vnd.liteship.coordinate-space+cbor'>;
}

/** Explicit root or child coordinate system. No target may silently change axes or units. */
export type CoordinateSpaceDefinition<
  Id extends CoordinateSpaceId = CoordinateSpaceId,
  Dimension extends SpatialDimension = SpatialDimension,
  Parent extends CoordinateSpaceId | undefined = CoordinateSpaceId | undefined,
> = CoordinateSpaceBase<Id, Dimension> &
  (Parent extends CoordinateSpaceId
    ? {
        readonly parent: Parent;
        /** Defines this space's origin and basis in its parent. */
        readonly toParent: SpatialTransform<Id, Parent>;
      }
    : {
        readonly parent?: undefined;
        readonly toParent?: undefined;
      });

/** Typed points and vectors cannot cross coordinate spaces by assignment. */
export type Point2<Space extends CoordinateSpaceId = CoordinateSpaceId> = Brand<
  readonly [x: number, y: number],
  readonly ['liteship.point2', Space]
>;
export type Vector2<Space extends CoordinateSpaceId = CoordinateSpaceId> = Brand<
  readonly [x: number, y: number],
  readonly ['liteship.vector2', Space]
>;
export type Point3<Space extends CoordinateSpaceId = CoordinateSpaceId> = Brand<
  readonly [x: number, y: number, z: number],
  readonly ['liteship.point3', Space]
>;
export type Vector3<Space extends CoordinateSpaceId = CoordinateSpaceId> = Brand<
  readonly [x: number, y: number, z: number],
  readonly ['liteship.vector3', Space]
>;
export type Quaternion<Space extends CoordinateSpaceId = CoordinateSpaceId> = Brand<
  readonly [x: number, y: number, z: number, w: number],
  readonly ['liteship.quaternion', Space]
>;

/** Fixed-size matrices used only as explicit authored escape hatches. */
export type Matrix3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];
export type Matrix4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

/** Target-neutral color with an explicit color space and normalized channels. */
export interface ColorValue {
  readonly space: 'srgb' | 'linear-srgb' | 'display-p3';
  readonly channels: readonly [red: number, green: number, blue: number];
  readonly alpha: number;
}

/** Established compositing modes shared by compatible visual egresses. */
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
  | 'plus-lighter';

/** Ordered authored transform operations. Order is semantic. */
export type SpatialTransformOperation = Algebra<{
  translate2: { readonly value: readonly [number, number] };
  translate3: { readonly value: readonly [number, number, number] };
  rotate2: { readonly radians: number };
  rotate3: { readonly quaternion: readonly [number, number, number, number] };
  scale2: { readonly value: readonly [number, number] };
  scale3: { readonly value: readonly [number, number, number] };
  skew2: { readonly radians: readonly [number, number] };
  origin2: { readonly value: readonly [number, number] };
  origin3: { readonly value: readonly [number, number, number] };
  perspective: { readonly distance: number };
  matrix3: { readonly values: Matrix3 };
  matrix4: { readonly values: Matrix4 };
}>;

/**
 * One declared spatial conversion. Parent/child transforms and egress-space
 * projections use the same composition law, while dimensional loss and
 * invertibility remain explicit.
 */
export interface SpatialTransform<
  From extends CoordinateSpaceId = CoordinateSpaceId,
  To extends CoordinateSpaceId = CoordinateSpaceId,
> {
  readonly from: From;
  readonly to: To;
  readonly operations: readonly SpatialTransformOperation[];
  readonly exact: boolean;
  readonly invertible: boolean;
  readonly tolerance?: number;
  readonly address: ContentAddress<'application/vnd.liteship.spatial-transform+cbor'>;
}

/** Standard path commands in a geometry's declared local space. */
export type PathCommand<Space extends CoordinateSpaceId = CoordinateSpaceId> = Algebra<{
  move: { readonly to: Point2<Space> };
  line: { readonly to: Point2<Space> };
  quadratic: { readonly control: Point2<Space>; readonly to: Point2<Space> };
  cubic: {
    readonly control1: Point2<Space>;
    readonly control2: Point2<Space>;
    readonly to: Point2<Space>;
  };
  arc: {
    readonly radius: Vector2<Space>;
    readonly rotation: number;
    readonly largeArc: boolean;
    readonly sweep: boolean;
    readonly to: Point2<Space>;
  };
  close: Record<never, never>;
}>;

/** Standard target-neutral geometry algebra. */
export type GeometryValue<Space extends CoordinateSpaceId = CoordinateSpaceId> = Algebra<{
  point: { readonly at: Point2<Space> | Point3<Space> };
  line: { readonly from: Point2<Space> | Point3<Space>; readonly to: Point2<Space> | Point3<Space> };
  rectangle: { readonly width: number; readonly height: number };
  'rounded-rectangle': { readonly width: number; readonly height: number; readonly radius: number };
  ellipse: { readonly radius: Vector2<Space> };
  polyline: { readonly points: NonEmptyTuple<Point2<Space>> };
  polygon: { readonly points: NonEmptyTuple<Point2<Space>> };
  path: { readonly commands: NonEmptyTuple<PathCommand<Space>>; readonly closed: boolean };
  mesh: {
    readonly vertices: readonly (Point2<Space> | Point3<Space>)[];
    readonly indices: readonly number[];
    readonly dimension: 2 | 3;
  };
  text: {
    readonly content: string;
    readonly font?: ContentAddress<'application/vnd.liteship.font+cbor'>;
  };
  image: { readonly source: ContentAddress; readonly width: number; readonly height: number };
}>;

/** Spatial bounds required for culling, hit testing, and layout. */
export type GeometryBounds<Space extends CoordinateSpaceId = CoordinateSpaceId> = Algebra<{
  bounds2: { readonly minimum: Point2<Space>; readonly maximum: Point2<Space> };
  bounds3: { readonly minimum: Point3<Space>; readonly maximum: Point3<Space> };
}>;

export type SceneEgress = 'html-css' | 'dom' | 'svg' | 'canvas' | 'glsl' | 'wgsl' | 'video' | 'accessibility';

/** Interpolation support is explicit rather than inferred from geometry name. */
export type GeometryInterpolation = Algebra<{
  supported: { readonly interpolator: InterpolatorReference };
  unsupported: { readonly reason: string };
}>;

/** Transform behavior for a geometry family. */
export type GeometryTransformSupport = Algebra<{
  standard: { readonly dimensions: NonEmptyTuple<SpatialDimension> };
  adapter: { readonly adapter: Brand<string, 'liteship.geometry-transform-adapter'> };
  unsupported: { readonly reason: string };
}>;

export type ToleranceProfileId<Name extends string = string> = Brand<Name, 'liteship.tolerance-profile-id'>;
export type ToleranceProfileReference<Id extends ToleranceProfileId = ToleranceProfileId> = Reference<
  'tolerance-profile',
  Id
>;

/**
 * How faithfully one subject reaches one egress.
 *
 * Four arms, because the predecessor shape — a boolean beside two optionals —
 * admitted eight combinations and at least two of them meant nothing: an exact
 * projection carrying an error bound, and an inexact projection carrying
 * neither a bound nor an alternative. The second is indistinguishable from
 * nobody having thought about it, which is precisely the state a fidelity
 * declaration exists to rule out.
 *
 * The tolerance is an addressed profile rather than a bare number. `0.01`
 * cannot say whether it means pixels, normalized geometry distance, channel
 * error, or timing drift, and a bound whose units are folklore is not a bound.
 */
export type ProjectionFidelity = Algebra<{
  exact: Record<never, never>;
  approximate: { readonly tolerance: ToleranceProfileReference };
  fallback: { readonly egress: SceneEgress; readonly reason: string };
  unsupported: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };
}>;

/**
 * One declared egress and the fidelity reaching it.
 *
 * Shared by geometry and material rather than duplicated per subject: a second
 * declaration of the same concept is a second vocabulary, and the compiler
 * deriving an entity's effective disposition must compare like with like.
 */
export interface ProjectionSupport {
  readonly egress: SceneEgress;
  readonly fidelity: ProjectionFidelity;
}

/** Capabilities every geometry definition must declare. */
export interface GeometryCapabilities<Space extends CoordinateSpaceId = CoordinateSpaceId> {
  readonly bounds: GeometryBounds<Space>;
  readonly transform: GeometryTransformSupport;
  readonly projections: NonEmptyTuple<ProjectionSupport>;
  readonly interpolation: GeometryInterpolation;
}

/** Addressed standard geometry definition. */
export interface StandardGeometryDefinition<Space extends CoordinateSpaceId = CoordinateSpaceId> {
  readonly kind: 'standard';
  readonly id: GeometryId;
  readonly space: Space;
  readonly value: GeometryValue<Space>;
  readonly capabilities: GeometryCapabilities<Space>;
  readonly address: ContentAddress<'application/vnd.liteship.geometry+cbor'>;
}

/** Schema-backed extension with explicit support and refusal information. */
export interface OpaqueGeometryDefinition<Space extends CoordinateSpaceId = CoordinateSpaceId> {
  readonly kind: 'opaque';
  readonly id: GeometryId;
  readonly space: Space;
  readonly schema: SchemaReference;
  readonly value: CanonicalValue;
  readonly capabilities: GeometryCapabilities<Space>;
  readonly address: ContentAddress<'application/vnd.liteship.geometry+cbor'>;
}

export type GeometryDefinition<Space extends CoordinateSpaceId = CoordinateSpaceId> =
  | StandardGeometryDefinition<Space>
  | OpaqueGeometryDefinition<Space>;

/** Standard target-neutral material vocabulary plus an explicit extension arm. */
export type MaterialValue = Algebra<{
  fill: { readonly color: ColorValue; readonly opacity?: number };
  stroke: { readonly color: ColorValue; readonly width: number; readonly opacity?: number };
  image: { readonly source: ContentAddress; readonly opacity?: number };
  shader: { readonly source: ContentAddress; readonly parameters: CanonicalValue };
  composite: { readonly layers: NonEmptyTuple<MaterialReference>; readonly blend: BlendMode };
  opaque: { readonly schema: SchemaReference; readonly value: CanonicalValue };
}>;

/**
 * Capabilities every material definition must declare.
 *
 * Material declares its own egress support because it genuinely decides it. A
 * rectangle projects to SVG; the same rectangle wearing an opaque shader does
 * not, and the geometry has no way to know. Leaving material silent meant an
 * entity's effective projection was read off geometry alone and was optimistic
 * exactly where it mattered — the composition, not the shape, is what reaches
 * an egress.
 */
export interface MaterialCapabilities {
  readonly projections: NonEmptyTuple<ProjectionSupport>;
}

/** Material remains target-neutral until projection. */
export interface MaterialDefinition {
  readonly id: MaterialId;
  readonly value: MaterialValue;
  readonly capabilities: MaterialCapabilities;
  readonly address: ContentAddress<'application/vnd.liteship.material+cbor'>;
}

/** One entity's scene-specific meaning. */
export interface SceneEntity<
  Local extends CoordinateSpaceId = CoordinateSpaceId,
  Parent extends CoordinateSpaceId = CoordinateSpaceId,
> {
  readonly entity: EntityReference;
  readonly parent?: EntityReference;
  readonly transform: SpatialTransform<Local, Parent>;
  readonly geometry?: GeometryReference;
  readonly material?: MaterialReference;
  readonly visible: boolean;
  readonly stateDrivers?: readonly QuantizerReference[];
}

/** A key's interpolation applies from this key to the next key on its track. */
export interface TimelineKey<Value = unknown, Base extends Timebase = Timebase> {
  readonly id: TimelineKeyId;
  readonly at: Timecode<Base>;
  readonly value: Value;
  readonly interpolatorToNext?: InterpolatorReference;
}

/** Scene timeline track families. */
export type TimelineTrack<Base extends Timebase = Timebase> = Algebra<{
  value: {
    readonly target: EntityFieldReference;
    readonly valueSchema: SchemaReference;
    readonly keys: NonEmptyTuple<TimelineKey<unknown, Base>>;
  };
  state: {
    readonly target: EntityFieldReference;
    readonly quantizer: QuantizerReference;
    readonly states: NonEmptyTuple<{ readonly at: Timecode<Base>; readonly state: StateName }>;
  };
  event: {
    readonly operation: OperationReference;
    readonly events: NonEmptyTuple<{ readonly at: Timecode<Base>; readonly invocation: OperationInvocation }>;
  };
  driver: {
    readonly target: EntityFieldReference;
    readonly source: EvidenceReference;
    readonly quantizer?: QuantizerReference;
  };
}>;

/** Semantic timeline independent from output frame rate. */
export interface TimelineDefinition<Base extends Timebase = Timebase> {
  readonly id: TimelineId;
  readonly timebase: Base;
  readonly tracks: readonly TimelineTrack<Base>[];
  readonly markers: readonly SceneMarker<Base>[];
  readonly address: ContentAddress<'application/vnd.liteship.timeline+cbor'>;
}

export type SceneMarkerId<Name extends string = string> = Brand<Name, 'liteship.scene-marker-id'>;
export type SceneMarkerReference<Id extends SceneMarkerId = SceneMarkerId> = Reference<
  'scene-marker',
  Id
>;

/**
 * One authored point of interest on a timeline.
 *
 * Authored, not observed. A beat detected in an audio asset is a media-analysis
 * product and belongs to `12_media` with the asset coordinate that produced it;
 * a marker someone placed is scene meaning and survives the asset being
 * replaced. Collapsing the two would make an authored cue vanish when its
 * source file changed.
 */
export interface SceneMarker<Base extends Timebase = Timebase> {
  readonly id: SceneMarkerId;
  readonly at: Timecode<Base>;
  readonly label?: string;
}

export type SceneEnvelopeId<Name extends string = string> = Brand<Name, 'liteship.scene-envelope-id'>;
export type SceneEnvelopeReference<Id extends SceneEnvelopeId = SceneEnvelopeId> = Reference<
  'scene-envelope',
  Id
>;

/**
 * One authored control curve over a timebase.
 *
 * The curve is scene meaning; the interpolation is not. `09_quantization`
 * remains the interpolation authority and this envelope names one of its
 * interpolators rather than describing a curve shape of its own — otherwise
 * every home that wanted a curve would grow a private easing vocabulary and the
 * quantization authority would become advisory.
 */
export interface AuthoredEnvelope<Value = number, Base extends Timebase = Timebase> {
  readonly id: SceneEnvelopeId;
  readonly keys: NonEmptyTuple<TimelineKey<Value, Base>>;
  readonly interpolator: InterpolatorReference;
  readonly address: ContentAddress<'application/vnd.liteship.scene-envelope+cbor'>;
}

/** Addressed subscene instance with explicit typed local ports. */
export interface SubsceneInstance<
  Local extends CoordinateSpaceId = CoordinateSpaceId,
  Parent extends CoordinateSpaceId = CoordinateSpaceId,
> {
  readonly scene: SceneReference;
  readonly revision: RevisionReference;
  readonly entity: EntityReference;
  readonly transform: SpatialTransform<Local, Parent>;
  readonly inputBindings: readonly {
    readonly input: FieldReference;
    readonly source: FieldReference | EvidenceReference;
  }[];
  readonly outputBindings: readonly {
    readonly output: FieldReference;
    readonly target: FieldReference;
  }[];
}

/** Family-specific scene changes. */
export type SceneChange = Algebra<{
  'create-entity': { readonly entity: SceneEntity };
  'delete-entity': { readonly entity: EntityReference };
  reparent: {
    readonly entity: EntityReference;
    readonly parent?: EntityReference;
    readonly transform: SpatialTransform;
  };
  'set-transform': { readonly entity: EntityReference; readonly transform: SpatialTransform };
  'attach-geometry': { readonly entity: EntityReference; readonly geometry?: GeometryReference };
  'attach-material': { readonly entity: EntityReference; readonly material?: MaterialReference };
  'set-field': EntityFieldReference & { readonly value: CanonicalValue };
  'insert-timeline-key': { readonly timeline: TimelineReference; readonly track: number; readonly key: TimelineKey };
  'update-timeline-key': { readonly timeline: TimelineReference; readonly key: TimelineKey };
  'remove-timeline-key': { readonly timeline: TimelineReference; readonly key: TimelineKeyReference };
  'move-timeline-key': { readonly timeline: TimelineReference; readonly key: TimelineKeyReference; readonly at: Timecode };
  'add-subscene': { readonly instance: SubsceneInstance };
  'remove-subscene': { readonly entity: EntityReference };
}>;

/** Family-specific patch lowered into normalized state changes before commit. */
export type ScenePatch = RevisionPatch<'scene', SceneChange>;

/** Complete target-neutral scene definition. */
export interface SceneDefinition<Requirements extends RequirementRow = readonly []> {
  readonly id: SceneId;
  readonly world: WorldReference;
  readonly entities: readonly SceneEntity[];
  readonly coordinateSpaces: NonEmptyTuple<CoordinateSpaceDefinition>;
  readonly geometries: readonly GeometryDefinition[];
  readonly materials: readonly MaterialDefinition[];
  readonly timelines: readonly TimelineDefinition[];
  readonly envelopes: readonly AuthoredEnvelope[];
  readonly systems: readonly SystemDefinition<Requirements>[];
  readonly subscenes: readonly SubsceneInstance[];
  readonly address: ContentAddress<'application/vnd.liteship.scene+cbor'>;
}

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

/** Type summary consumed by the root core topology. */
export interface SceneTypeSurface {
  readonly scene: SceneDefinition;
  readonly entity: SceneEntity;
  readonly space: CoordinateSpaceDefinition;
  readonly transform: SpatialTransform;
  readonly geometry: GeometryDefinition;
  readonly projection: ProjectionSupport;
  readonly materialCapabilities: MaterialCapabilities;
  readonly marker: SceneMarker;
  readonly envelope: AuthoredEnvelope;
  readonly material: MaterialDefinition;
  readonly timeline: TimelineDefinition;
  readonly fieldTarget: EntityFieldReference;
  readonly patch: ScenePatch;
  readonly subscene: SubsceneInstance;
}
