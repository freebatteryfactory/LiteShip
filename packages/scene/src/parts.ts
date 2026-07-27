/**
 * Canonical Scene ECS Part catalog.
 *
 * Authoring/compile stages emit serializable {@link ScenePartSeed} values. The
 * runtime resolves each seed through this catalog and `admitPart` before a value
 * can enter the world. Systems therefore query and write minted identities,
 * never free strings.
 *
 * @module
 */

import { RuntimeWritePlanSchema, TypedValueSchema, type TypedValue } from '@liteship/core/motion';
import { admitPart, definePart, type AdmittedPartValue, type Part, type PartValue } from '@liteship/core/ecs';
import { schema } from '@liteship/core/schema';
import { ValidationError } from '@liteship/error';

/** Numeric frame interval with a half-open `[from,to)` execution range. */
export interface FrameRange {
  readonly from: number;
  readonly to: number;
}

/** Aggregate output of Scene's motion sampler for one entity and frame. */
export type MotionSample = Readonly<Record<string, TypedValue>>;

/** Composed SVG attribute projection written by the final Scene system. */
export interface SvgAttrs {
  readonly _tag: 'SvgAttrs';
  readonly transform?: string;
  readonly opacity?: number;
  readonly mixBlendMode?: string;
  readonly clipPath?: string;
}

function finite(value: number): number {
  if (!Number.isFinite(value)) throw ValidationError('ScenePart', `expected a finite number, got ${String(value)}`);
  return value;
}

function positive(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw ValidationError('ScenePart', `expected a positive finite number, got ${String(value)}`);
  }
  return value;
}

const finiteNumber = schema.brand(schema.number, finite, 'SceneFiniteNumber');
const positiveNumber = schema.brand(schema.number, positive, 'ScenePositiveNumber');
const frameRangeSchema = schema.brand(
  schema.struct({ from: finiteNumber, to: finiteNumber }),
  (range): FrameRange => {
    if (range.from > range.to) {
      throw ValidationError('FrameRange', `from must be <= to, got ${range.from} > ${range.to}`);
    }
    return range;
  },
  'FrameRange',
);
const resolvedEnvelopeSchema = schema.union(
  schema.struct({ curve: schema.literal('linear-in'), spanFrames: positiveNumber }),
  schema.struct({ curve: schema.literal('linear-out'), spanFrames: positiveNumber }),
  schema.struct({ curve: schema.literal('pulse'), periodFrames: positiveNumber, amplitude: finiteNumber }),
);
const easeTagSchema = schema.union(
  schema.literal('cubic'),
  schema.literal('spring'),
  schema.literal('bounce'),
  schema.struct({ stepped: positiveNumber }),
);
const beatSchema = schema.struct({
  _tag: schema.literal('beat'),
  timeMs: finiteNumber,
  strength: finiteNumber,
  anchorTrackId: schema.optional(schema.string),
});
const svgAttrsSchema = schema.struct({
  _tag: schema.literal('SvgAttrs'),
  transform: schema.optional(schema.string),
  opacity: schema.optional(finiteNumber),
  mixBlendMode: schema.optional(schema.string),
  clipPath: schema.optional(schema.string),
});

/** Stable authored track identity. */
export const TrackIdPart = definePart('trackId', schema.string);
/** Host-owned video source retained by reference. */
export const VideoSourcePart = definePart('VideoSource', schema.unknown, { retention: 'reference' });
/** Authored audio source identifier. */
export const AudioSourcePart = definePart('AudioSource', schema.string);
/** Half-open frame interval in which an entity participates. */
export const FrameRangePart = definePart('FrameRange', frameRangeSchema);
/** Finite authored compositing layer. */
export const TrackLayerPart = definePart('TrackLayer', finiteNumber);
/** Resolved per-frame envelope sampled by Scene systems. */
export const EnvelopePart = definePart('Envelope', resolvedEnvelopeSchema);
/** Finite authored audio volume. */
export const VolumePart = definePart('Volume', finiteNumber);
/** Finite authored stereo pan. */
export const PanPart = definePart('Pan', finiteNumber);
/** Positive beat-rate marker used by audio synchronization. */
export const SyncBeatMarkerPart = definePart('SyncBeatMarker', schema.struct({ bpm: positiveNumber }));
/** Supported authored visual transition identity. */
export const TransitionKindPart = definePart(
  'TransitionKind',
  schema.union(
    schema.literal('crossfade'),
    schema.literal('swipe.left'),
    schema.literal('swipe.right'),
    schema.literal('zoom.in'),
    schema.literal('zoom.out'),
    schema.literal('cut'),
  ),
);
/** Ordered pair of entity identities participating in a transition. */
export const BetweenPart = definePart('Between', schema.tuple(schema.string, schema.string));
/** Optional authored easing tag for a transition. */
export const EasePart = definePart('Ease', easeTagSchema);
/** Supported authored effect identity. */
export const EffectKindPart = definePart(
  'EffectKind',
  schema.union(
    schema.literal('pulse'),
    schema.literal('glow'),
    schema.literal('shake'),
    schema.literal('zoom'),
    schema.literal('desaturate'),
  ),
);
/** Entity identity targeted by an authored effect. */
export const TargetEntityPart = definePart('TargetEntity', schema.string);
/** Cross-track synchronization anchor and observation mode. */
export const SyncAnchorPart = definePart(
  'SyncAnchor',
  schema.struct({
    anchor: schema.string,
    mode: schema.union(schema.literal('beat'), schema.literal('onset'), schema.literal('peak')),
  }),
);
/** Runtime beat observation admitted into the Scene world. */
export const BeatPart = definePart('Beat', beatSchema);

/** System-owned opacity sample for the current frame. */
export const OpacityPart = definePart('_opacity', finiteNumber);
/** System-owned normalized phase for the current frame. */
export const PhasePart = definePart('_phase', finiteNumber);
/** System-owned audio gain for the current frame. */
export const GainPart = definePart('_gain', finiteNumber);
/** System-owned transition blend for the current frame. */
export const BlendPart = definePart('_blend', finiteNumber);
/** System-owned effect intensity for the current frame. */
export const IntensityPart = definePart('_intensity', finiteNumber);
/** System-owned SVG attribute projection for the current frame. */
export const SvgAttrsPart = definePart('_svgAttrs', svgAttrsSchema);
/** Executable per-property motion plan owned by one Scene entity. */
export const RuntimeWritePlanPart = definePart('RuntimeWritePlan', RuntimeWritePlanSchema);
/** Sampled motion property values produced for the current frame. */
export const MotionSamplePart = definePart('MotionSample', schema.record(TypedValueSchema));

/** Every Scene-owned Part, indexed by its stable wire/seed identity. */
export const SceneParts = {
  trackId: TrackIdPart,
  VideoSource: VideoSourcePart,
  AudioSource: AudioSourcePart,
  FrameRange: FrameRangePart,
  TrackLayer: TrackLayerPart,
  Envelope: EnvelopePart,
  Volume: VolumePart,
  Pan: PanPart,
  SyncBeatMarker: SyncBeatMarkerPart,
  TransitionKind: TransitionKindPart,
  Between: BetweenPart,
  Ease: EasePart,
  EffectKind: EffectKindPart,
  TargetEntity: TargetEntityPart,
  SyncAnchor: SyncAnchorPart,
  Beat: BeatPart,
  _opacity: OpacityPart,
  _phase: PhasePart,
  _gain: GainPart,
  _blend: BlendPart,
  _intensity: IntensityPart,
  _svgAttrs: SvgAttrsPart,
  RuntimeWritePlan: RuntimeWritePlanPart,
  MotionSample: MotionSamplePart,
} as const;

/** Every stable Scene component identity. */
export type ScenePartName = keyof typeof SceneParts;
export type ScenePart = (typeof SceneParts)[ScenePartName];

/**
 * Parts that may cross the pure compile/runtime admission seam. System-owned
 * outputs are deliberately absent: they can only be produced by a declared
 * system write, never planted in a compiled scene seed.
 */
export const SceneSeedParts = Object.freeze([
  TrackIdPart,
  VideoSourcePart,
  AudioSourcePart,
  FrameRangePart,
  TrackLayerPart,
  EnvelopePart,
  VolumePart,
  PanPart,
  SyncBeatMarkerPart,
  TransitionKindPart,
  BetweenPart,
  EasePart,
  EffectKindPart,
  TargetEntityPart,
  SyncAnchorPart,
  BeatPart,
  RuntimeWritePlanPart,
] as const);

/** A Scene Part that authored compilation may seed before runtime admission. */
export type SceneSeedPart = (typeof SceneSeedParts)[number];
/** Stable identity of a Scene Part admitted across the compile/runtime seam. */
export type SceneSeedPartName = SceneSeedPart['name'];

/** Pure compile-time component seed; admission belongs to SceneRuntime. */
export type ScenePartSeed = {
  readonly [K in SceneSeedPartName]: {
    readonly part: K;
    readonly value: PartValue<(typeof SceneParts)[K]>;
  };
}[SceneSeedPartName];

/** Build a typed seed from a canonical Scene Part. Host-reference Parts remain references. */
export function scenePartSeed<P extends SceneSeedPart>(part: P, value: PartValue<P>): ScenePartSeed {
  return { part: part.name, value } as ScenePartSeed;
}

function admissionFailure(
  seed: ScenePartSeed,
  issues: readonly { readonly path: readonly (string | number)[]; readonly message: string }[],
): never {
  const detail = issues
    .map((issue) => `${issue.path.length === 0 ? '$' : `$.${issue.path.join('.')}`}: ${issue.message}`)
    .join('; ');
  throw ValidationError('SceneRuntime.build', `Part "${seed.part}" failed admission: ${detail}`);
}

/** Admit a pure Scene seed against its canonical minted Part. */
export function admitScenePartSeed(seed: ScenePartSeed): AdmittedPartValue {
  const part = SceneParts[seed.part] as Part<unknown>;
  const result = admitPart(part, seed.value);
  return result.ok ? result.value : admissionFailure(seed, result.error);
}
