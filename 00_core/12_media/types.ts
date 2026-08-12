/**
 * Realm-neutral audio, video, sample, frame, analysis, and synchronization meaning.
 *
 * Browser AudioContext/WebCodecs and server ffmpeg/filesystem behavior remain host
 * capabilities. Realtime and offline execution share the same semantic sample
 * coordinates and analysis products.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  NonEmptyTuple,
  Reference,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress, ContentDigest, MediaType } from '../01_encoding/types.js';
import type { RevisionId, RevisionReference, WorldId } from '../02_identity/types.js';
import type { SchemaReference } from '../03_schema/types.js';
import type { FrameIndex, SampleIndex, TimeCut, Timecode } from '../04_time/types.js';
import type { EvidenceCutId, ReproducibilityClaim } from '../06_evidence/types.js';
import type { AnySemanticCut } from '../08_state/types.js';
import type { ProjectionFidelity } from '../11_scene/types.js';

export type MediaAssetId<Name extends string = string> = Brand<Name, 'liteship.media-asset-id'>;
export type MediaAssetReference<Id extends MediaAssetId = MediaAssetId> = Reference<'media-asset', Id>;
export type SampleRate = Brand<number, 'liteship.sample-rate'>;
export type FrameRate = Brand<number, 'liteship.frame-rate'>;

export type MediaKind = 'audio' | 'video' | 'image' | 'font' | 'binary';

/** Addressed media source descriptor. */
export interface MediaAsset {
  readonly id: MediaAssetId;
  readonly kind: MediaKind;
  readonly mediaType: MediaType;
  readonly source: ContentAddress;
  readonly metadataSchema?: SchemaReference;
  readonly metadata?: CanonicalValue;
}

export interface SampleRange {
  readonly start: SampleIndex;
  readonly end: SampleIndex;
  readonly rate: SampleRate;
}

export interface FrameRange {
  readonly start: FrameIndex;
  readonly end: FrameIndex;
  readonly rate: FrameRate;
}

/** Standard media-analysis products. */
export type MediaAnalysis = Algebra<{
  waveform: { readonly samples: readonly number[]; readonly range: SampleRange };
  onset: { readonly samples: readonly SampleIndex[]; readonly strength?: readonly number[] };
  beat: { readonly samples: readonly SampleIndex[]; readonly tempo?: number };
  peak: { readonly samples: readonly SampleIndex[]; readonly value: readonly number[] };
  metadata: { readonly value: CanonicalValue; readonly schema: SchemaReference };
}>;

/** Exact A/V coordinate at one semantic cut. */
export interface MediaTimeCut extends TimeCut {
  readonly sample: SampleIndex;
  readonly frame?: FrameIndex;
  readonly sampleRate: SampleRate;
  readonly frameRate?: FrameRate;
}

/**
 * The evaluation coordinate a media frame realizes.
 *
 * Either cut form is admissible here. The editor evaluates counterfactuals
 * continuously, and a frame model that could only speak for committed state
 * would make preview require a production commit — which would quietly end the
 * claim that the editor and the runtime are one program.
 */
export type MediaCut<
  World extends WorldId = WorldId,
  Revision extends RevisionId = RevisionId,
  Evidence extends EvidenceCutId = EvidenceCutId,
> = AnySemanticCut<World, Revision, Evidence, MediaTimeCut>;

/**
 * How one semantic frame's state came to exist.
 *
 * Reuse must carry evidence that every relevant dependency is unchanged. A
 * scene patch says what changed; it does not prove a given output was
 * unaffected, because a camera shift, a parent transform, a font change, a
 * blend mode, or an evidence source can invalidate a frame without touching the
 * subject being reused.
 */
export type SemanticFrameDerivation = Algebra<{
  evaluated: Record<never, never>;
  reused: {
    readonly from: MediaTimeCut;
    readonly unchanged: ContentAddress<'application/vnd.liteship.media-reuse-evidence+cbor'>;
  };
}>;

/**
 * Target-neutral media frame state. Physical pixels or samples are host
 * projections.
 *
 * The frame owns its cut and nothing beside it. An earlier shape carried a
 * frame index and a sample range next to a time cut that already held both,
 * which meant a frame could claim coordinate N in one member and M in another
 * and no law could say which was true. The coordinate now has one owner, and
 * `cut.time` is where it lives.
 */
export interface MediaFrame<
  State = unknown,
  Cut extends MediaCut = MediaCut,
> {
  readonly cut: Cut;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;
  readonly address: ContentAddress<'application/vnd.liteship.media-frame+cbor'>;
}

/**
 * How one physical frame's pixels came to exist.
 *
 * Rasterization and host capture are not interchangeable provenance even when
 * both yield the same envelope. One says "these pixels realize this exact
 * semantic frame under this raster profile"; the other says "these pixels came
 * off this committed physical composition under this capture profile". Only the
 * first is evidence that a subject had a faithful projection.
 */
export type PhysicalFrameDerivation<Semantic, Profile, Composition> = Algebra<{
  rasterized: { readonly frame: Semantic; readonly profile: Profile };
  reused: {
    readonly frame: Semantic;
    readonly profile: Profile;
    readonly from: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;
  };
  'host-captured': { readonly composition: Composition; readonly profile: Profile };
}>;

/**
 * One physical frame: an opaque host payload, its coordinate, and where it came
 * from.
 *
 * The envelope is addressed separately from the payload because two frames may
 * hold byte-identical pixels and remain different frames. Reuse at coordinate N
 * from coordinate M does not make N into M, and an envelope keyed by its
 * payload would silently merge them.
 */
export interface PhysicalFrame<
  Payload = unknown,
  Semantic = MediaFrame,
  Profile = unknown,
  Composition = unknown,
> {
  readonly payload: Payload;
  readonly payloadAddress: ContentAddress;
  readonly time: MediaTimeCut;
  readonly derivation: PhysicalFrameDerivation<Semantic, Profile, Composition>;
  readonly address: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;
}

// ---------------------------------------------------------------------------
// Formats, tracks, packets, and containers
// ---------------------------------------------------------------------------

export type MediaCodecId<Name extends string = string> = Brand<Name, 'liteship.media-codec-id'>;
export type MediaCodecReference<Id extends MediaCodecId = MediaCodecId> = Reference<'media-codec', Id>;

export type DecodeProfileId<Name extends string = string> = Brand<Name, 'liteship.media-decode-profile-id'>;
export type DecodeProfileReference<Id extends DecodeProfileId = DecodeProfileId> = Reference<
  'media-decode-profile',
  Id
>;

export type EncodeProfileId<Name extends string = string> = Brand<Name, 'liteship.media-encode-profile-id'>;
export type EncodeProfileReference<Id extends EncodeProfileId = EncodeProfileId> = Reference<
  'media-encode-profile',
  Id
>;

export type ContainerProfileId<Name extends string = string> = Brand<
  Name,
  'liteship.media-container-profile-id'
>;
export type ContainerProfileReference<Id extends ContainerProfileId = ContainerProfileId> = Reference<
  'media-container-profile',
  Id
>;

/** One elementary stream's contract. */
export interface MediaTrackContract {
  readonly codec: MediaCodecReference;
  readonly mediaType: MediaType;
  readonly parameters: CanonicalValue;
}

/**
 * Which streams a media product actually carries.
 *
 * An algebra rather than two arrays, because arrays make "no video" and "video
 * we forgot to attach" the same value. A silent audio-only export and a broken
 * video export are different outcomes and must be different types.
 */
export type MediaTrackConfiguration = Algebra<{
  'video-only': { readonly video: MediaTrackContract };
  'audio-only': { readonly audio: MediaTrackContract };
  'audio-video': { readonly video: MediaTrackContract; readonly audio: MediaTrackContract };
}>;

/**
 * One encoded elementary-stream packet.
 *
 * This is deliberately not a transport frame. A socket's encoded chunk and a
 * video access unit have coincidentally similar payloads and entirely different
 * meanings, and a media path that borrows network framing for its output cannot
 * tell an H.264 access unit from arbitrary bytes that arrived over a wire.
 */
export interface MediaPacket<Profile extends EncodeProfileId = EncodeProfileId> {
  readonly profile: EncodeProfileReference<Profile>;
  readonly time: MediaTimeCut;
  readonly payload: ContentAddress;
  readonly sync: boolean;
}

/**
 * The finished media product.
 *
 * Asset identity is caller-carried — the caller decides what this artifact *is*
 * before it exists. Address and digest are producer-derived, because a caller
 * that could choose them could assert bytes it never produced.
 */
export interface MediaArtifact<
  Asset extends MediaAssetId = MediaAssetId,
  Container extends ContainerProfileId = ContainerProfileId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly container: ContainerProfileReference<Container>;
  readonly tracks: MediaTrackConfiguration;
  readonly address: ContentAddress;
  readonly digest: ContentDigest;
}

// ---------------------------------------------------------------------------
// Decode, encode, and mux requirements
// ---------------------------------------------------------------------------

/**
 * What a decoder is asked for, and what it must answer with.
 *
 * The shape is fixed here rather than left to a free supplier parameter. A
 * requirement generic over its own contract is satisfied by any host that
 * nominates itself, which compiles beautifully and proves nothing — the lesson
 * the target layer paid for at the Astro socket.
 */
export interface MediaDecodeRequest<
  Asset extends MediaAssetId = MediaAssetId,
  Profile extends DecodeProfileId = DecodeProfileId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly profile: DecodeProfileReference<Profile>;
  readonly range: FrameRange | SampleRange;
}

/** The decoded product: frames or samples, still bound to what produced them. */
export interface MediaDecodeProduct<
  Asset extends MediaAssetId = MediaAssetId,
  Profile extends DecodeProfileId = DecodeProfileId,
  Payload = unknown,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly profile: DecodeProfileReference<Profile>;
  readonly frames: readonly PhysicalFrame<Payload>[];
  readonly reproducibility: ReproducibilityClaim<DecodeProfileReference<Profile>>;
}

export interface MediaDecoderAuthority {
  readonly decode: <Asset extends MediaAssetId, Profile extends DecodeProfileId>(
    request: MediaDecodeRequest<Asset, Profile>,
  ) => MediaDecodeProduct<Asset, Profile>;
}

/**
 * What an encoder is asked for.
 *
 * The frame source is the frames themselves, not a schema describing them. A
 * contract saying what a frame looks like is satisfied by an encoder that never
 * received one, which is how a renderer emits a technically valid file
 * containing none of the authored work.
 */
export interface MediaEncodeRequest<
  Asset extends MediaAssetId = MediaAssetId,
  Profile extends EncodeProfileId = EncodeProfileId,
  Container extends ContainerProfileId = ContainerProfileId,
  Payload = unknown,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly profile: EncodeProfileReference<Profile>;
  readonly container: ContainerProfileReference<Container>;
  readonly tracks: MediaTrackConfiguration;
  readonly frames: NonEmptyTuple<PhysicalFrame<Payload>>;
}

/** Encoded packets, still naming the profile and frames that produced them. */
export interface MediaEncodeProduct<
  Asset extends MediaAssetId = MediaAssetId,
  Profile extends EncodeProfileId = EncodeProfileId,
  Container extends ContainerProfileId = ContainerProfileId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly packets: NonEmptyTuple<MediaPacket<Profile>>;
  readonly artifact: MediaArtifact<Asset, Container>;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;
}

export interface MediaEncoderAuthority {
  readonly encode: <
    Asset extends MediaAssetId,
    Profile extends EncodeProfileId,
    Container extends ContainerProfileId,
  >(
    request: MediaEncodeRequest<Asset, Profile, Container>,
  ) => MediaEncodeProduct<Asset, Profile, Container>;
}

export type MediaDecoderRequirement = Hole<'liteship.media.decoder', MediaDecoderAuthority>;
export type MediaEncoderRequirement = Hole<'liteship.media.encoder', MediaEncoderAuthority>;

// ---------------------------------------------------------------------------
// Analysis identity
// ---------------------------------------------------------------------------

export type AnalysisAlgorithmId<Name extends string = string> = Brand<
  Name,
  'liteship.media-analysis-algorithm-id'
>;
export type AnalysisAlgorithmReference<Id extends AnalysisAlgorithmId = AnalysisAlgorithmId> = Reference<
  'media-analysis-algorithm',
  Id
>;

/** Which coordinate an analysis result is expressed in. */
export type AnalysisCoordinateSystem = 'sample' | 'frame' | 'timecode';

/** Everything that makes one analysis result the result it is. */
export interface AnalysisProfile<Algorithm extends AnalysisAlgorithmId = AnalysisAlgorithmId> {
  readonly algorithm: AnalysisAlgorithmReference<Algorithm>;
  readonly parameters: CanonicalValue;
  readonly coordinateSystem: AnalysisCoordinateSystem;
}

/**
 * One analysis result, bound to everything that determined it.
 *
 * The asset revision is named, not just the asset: an analysis of yesterday's
 * audio is not an analysis of today's, and a result that names only the asset
 * would be silently reused across a re-import.
 */
export interface MediaAnalysisResult<
  Asset extends MediaAssetId = MediaAssetId,
  Algorithm extends AnalysisAlgorithmId = AnalysisAlgorithmId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly revision: RevisionReference;
  readonly profile: AnalysisProfile<Algorithm>;
  readonly value: MediaAnalysis;
  readonly cache: ContentAddress<'application/vnd.liteship.media-analysis-cache+cbor'>;
}

// ---------------------------------------------------------------------------
// Export disposition
// ---------------------------------------------------------------------------

/**
 * How one export request will be served.
 *
 * The disposition attaches to the request, not to a subject declaration. Only a
 * request has a population a law can quantify over — whether every semantic
 * subject in a scene is exportable is a claim about the whole scene and host
 * capability set, and no local declaration can honestly prove it.
 *
 * Host capture is a sibling arm rather than a fidelity value, because capture
 * reaches opaque DOM, third-party widgets, and foreign regions that declare no
 * geometry at all. It is a way to obtain pixels, not evidence that a subject
 * had a faithful projection.
 */
export type MediaExportDisposition<CaptureProfile = unknown> = Algebra<{
  'semantic-projection': { readonly fidelity: ProjectionFidelity };
  'host-capture': { readonly profile: CaptureProfile };
  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };
}>;

/** One export request and the single disposition it received. */
export interface MediaExportRequest<
  Asset extends MediaAssetId = MediaAssetId,
  CaptureProfile = unknown,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly disposition: MediaExportDisposition<CaptureProfile>;
}

/** Semantic media event suitable for timelines and streams. */
export type MediaEvent = Algebra<{
  analysis: { readonly asset: MediaAssetReference; readonly value: MediaAnalysis; readonly at: Timecode };
  frame: { readonly asset: MediaAssetReference; readonly value: MediaFrame };
  ended: { readonly asset: MediaAssetReference; readonly at: Timecode };
}>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * Compile-time law: a media frame owns its coordinate once.
 *
 * `frame`, `samples`, and `time` are checked by name for absence. Their return
 * would not break anything the day it happened — it would reintroduce members
 * that agree with the cut right up until they do not.
 */
export type AMediaFrameCarriesTheCutAndNoSiblingCoordinate = Assert<
  Equal<
    [
      MediaFrame['cut'] extends MediaCut ? true : false,
      'frame' extends keyof MediaFrame ? true : false,
      'samples' extends keyof MediaFrame ? true : false,
      'time' extends keyof MediaFrame ? true : false,
    ],
    [true, false, false, false]
  >
>;

/**
 * Compile-time law: semantic and physical derivation are different algebras
 * with different arms.
 *
 * One shared `reused` notion would let pixel reuse be justified by evidence
 * about semantic dependencies, or the reverse. The two have different
 * predicates and different owners.
 */
export type SemanticAndPhysicalReuseStayDistinct = Assert<
  Equal<
    [
      TagOf<SemanticFrameDerivation>,
      TagOf<PhysicalFrameDerivation<MediaFrame, unknown, unknown>>,
      keyof CaseOf<SemanticFrameDerivation, 'reused'>,
    ],
    [
      'evaluated' | 'reused',
      'rasterized' | 'reused' | 'host-captured',
      '_tag' | 'from' | 'unchanged',
    ]
  >
>;

/**
 * Compile-time law: rasterized provenance names the semantic frame it realizes,
 * and captured provenance cannot.
 *
 * This is the law that makes live presentation and export the same evaluation.
 * If a rasterized frame could exist without naming its semantic frame, the two
 * paths would agree only by whatever the renderer happened to do.
 */
export type RasterizedProvenanceNamesItsSemanticFrame = Assert<
  Equal<
    [
      'frame' extends keyof CaseOf<PhysicalFrameDerivation<MediaFrame, unknown, unknown>, 'rasterized'>
        ? true
        : false,
      'frame' extends keyof CaseOf<PhysicalFrameDerivation<MediaFrame, unknown, unknown>, 'host-captured'>
        ? true
        : false,
      'composition' extends keyof CaseOf<
        PhysicalFrameDerivation<MediaFrame, unknown, unknown>,
        'host-captured'
      >
        ? true
        : false,
    ],
    [true, false, true]
  >
>;

/**
 * Compile-time law: a physical frame is addressed apart from its payload.
 *
 * Two frames holding byte-identical pixels stay two frames. An envelope keyed
 * by payload alone would merge a reused frame with the frame it reused from,
 * and the reuse invariant would become unstateable.
 */
export type APhysicalFrameIsAddressedApartFromItsPayload = Assert<
  Equal<
    [
      Equal<PhysicalFrame['address'], PhysicalFrame['payloadAddress']>,
      PhysicalFrame['time'] extends MediaTimeCut ? true : false,
    ],
    [false, true]
  >
>;

/**
 * Compile-time law: track configuration is an explicit choice of three, and no
 * arm can carry the stream it excludes.
 */
export type TrackConfigurationIsExplicitNotAnEmptyArray = Assert<
  Equal<
    [
      TagOf<MediaTrackConfiguration>,
      'audio' extends keyof CaseOf<MediaTrackConfiguration, 'video-only'> ? true : false,
      'video' extends keyof CaseOf<MediaTrackConfiguration, 'audio-only'> ? true : false,
      keyof CaseOf<MediaTrackConfiguration, 'audio-video'>,
    ],
    ['video-only' | 'audio-only' | 'audio-video', false, false, '_tag' | 'video' | 'audio']
  >
>;

/**
 * Compile-time law: an encode request carries frames, not a description of
 * frames, and the population cannot be empty.
 *
 * Zero frames becoming a successful video is the exact failure the predecessor
 * shipped: a valid container holding none of the authored work.
 */
export type AnEncodeRequestCarriesFramesNotASchema = Assert<
  Equal<
    [
      MediaEncodeRequest['frames'] extends NonEmptyTuple<PhysicalFrame> ? true : false,
      readonly PhysicalFrame[] extends MediaEncodeRequest['frames'] ? true : false,
      MediaEncodeRequest extends { readonly frames: SchemaReference } ? true : false,
    ],
    [true, false, false]
  >
>;

/**
 * Compile-time law: artifact identity is caller-carried while its bytes are
 * producer-derived.
 */
export type ArtifactBytesAreProducerDerived = Assert<
  Equal<
    [
      MediaArtifact['asset'] extends MediaAssetReference ? true : false,
      MediaArtifact['address'] extends ContentAddress ? true : false,
      MediaArtifact['digest'] extends ContentDigest ? true : false,
      MediaArtifact<
        MediaAssetId<'liteship.media.law.asset-a'>,
        ContainerProfileId<'liteship.media.law.container-a'>
      >['container'],
    ],
    [
      true,
      true,
      true,
      ContainerProfileReference<ContainerProfileId<'liteship.media.law.container-a'>>,
    ]
  >
>;

/**
 * Compile-time law: an analysis result names the revision, algorithm,
 * parameters, and coordinate system that determined it.
 *
 * The README claimed all four for as long as the type carried none of them.
 */
export type AnAnalysisResultNamesEverythingThatDeterminedIt = Assert<
  Equal<
    [
      MediaAnalysisResult['revision'] extends RevisionReference ? true : false,
      MediaAnalysisResult['profile']['algorithm'] extends AnalysisAlgorithmReference ? true : false,
      MediaAnalysisResult['profile']['parameters'] extends CanonicalValue ? true : false,
      MediaAnalysisResult['profile']['coordinateSystem'] extends AnalysisCoordinateSystem ? true : false,
      'cache' extends keyof MediaAnalysisResult ? true : false,
    ],
    [true, true, true, true, true]
  >
>;

/**
 * Compile-time law: an export request carries exactly one disposition, and the
 * three arms answer three different questions.
 *
 * `unavailable` cannot be silent, and host capture cannot present itself as a
 * fidelity claim — it holds a capture profile and no fidelity at all.
 */
export type AnExportRequestReceivesOneDisposition = Assert<
  Equal<
    [
      TagOf<MediaExportDisposition>,
      keyof CaseOf<MediaExportDisposition, 'semantic-projection'>,
      keyof CaseOf<MediaExportDisposition, 'host-capture'>,
      keyof CaseOf<MediaExportDisposition, 'unavailable'>,
      MediaExportRequest['disposition'] extends MediaExportDisposition ? true : false,
      // The population must be non-empty, not merely present. A diagnostics
      // member that accepts `[]` is silence wearing the name of an explanation,
      // and `keyof` alone cannot tell the two apart.
      readonly Diagnostic[] extends CaseOf<MediaExportDisposition, 'unavailable'>['diagnostics']
        ? true
        : false,
    ],
    [
      'semantic-projection' | 'host-capture' | 'unavailable',
      '_tag' | 'fidelity',
      '_tag' | 'profile',
      '_tag' | 'diagnostics' | 'remediation',
      true,
      false,
    ]
  >
>;

/**
 * Compile-time law: decoder and encoder requirements are typed holes whose
 * contracts core fixes.
 *
 * The README claimed these for the entire life of the home while the type
 * surface imported no `Hole` at all.
 */
export type CodecRequirementsAreTypedHoles = Assert<
  Equal<
    [
      MediaDecoderRequirement extends Hole<'liteship.media.decoder', MediaDecoderAuthority> ? true : false,
      MediaEncoderRequirement extends Hole<'liteship.media.encoder', MediaEncoderAuthority> ? true : false,
    ],
    [true, true]
  >
>;

/** Type summary consumed by the root core topology. */
export interface MediaTypeSurface {
  readonly asset: MediaAsset;
  readonly sampleRange: SampleRange;
  readonly frameRange: FrameRange;
  readonly analysis: MediaAnalysis;
  readonly analysisResult: MediaAnalysisResult;
  readonly time: MediaTimeCut;
  readonly frame: MediaFrame;
  readonly physicalFrame: PhysicalFrame;
  readonly track: MediaTrackConfiguration;
  readonly packet: MediaPacket;
  readonly artifact: MediaArtifact;
  readonly decoder: MediaDecoderAuthority;
  readonly encoder: MediaEncoderAuthority;
  readonly export: MediaExportRequest;
  readonly event: MediaEvent;
}
