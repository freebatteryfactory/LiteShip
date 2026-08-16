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
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress, ContentDigest, MediaType } from '../01_encoding/types.js';
import type { RevisionId, RevisionReference, WorldId } from '../02_identity/types.js';
import type { SchemaReference } from '../03_schema/types.js';
import type { FrameIndex, SampleIndex, StreamSequence, Timebase, TimeCut, Timecode } from '../04_time/types.js';
import type {
  CancellationReceipt,
} from '../05_lifecycle/types.js';
import type { EvidenceCutId, ReproducibilityClaim } from '../06_evidence/types.js';
import type { AnySemanticCut } from '../08_state/types.js';
import type { ProjectionFidelity, SceneEgress, SceneReference } from '../11_scene/types.js';

/** Stable identity for one media asset. */
export type MediaAssetId<Name extends string = string> = Brand<Name, 'liteship.media-asset-id'>;
/** Typed reference to one media asset. */
export type MediaAssetReference<Id extends MediaAssetId = MediaAssetId> = Reference<'media-asset', Id>;
/** Type-level representation of sample rate. */
export type SampleRate = Brand<number, 'liteship.sample-rate'>;
/** Type-level representation of frame rate. */
export type FrameRate = Brand<number, 'liteship.frame-rate'>;

/** Closed kind vocabulary for media. */
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

/** Contract for sample range. */
export interface SampleRange {
  readonly start: SampleIndex;
  readonly end: SampleIndex;
  readonly rate: SampleRate;
}

/** Contract for frame range. */
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

// ---------------------------------------------------------------------------
// Physical payload: representation, not realm
// ---------------------------------------------------------------------------

/** Stable identity for one media representation. */
export type MediaRepresentationId<Name extends string = string> = Brand<
  Name,
  'liteship.media-representation-id'
>;
/** Typed reference to one media representation. */
export type MediaRepresentationReference<
  Id extends MediaRepresentationId = MediaRepresentationId,
> = Reference<'media-representation', Id>;

/**
 * Where physical bytes live.
 *
 * Addressed bytes are comparable and portable. A host resource is a live object
 * that cannot be addressed without reading it out, and saying so is honest
 * rather than pretending every payload is inspectable.
 */
export type PayloadLocation = Algebra<{
  addressed: { readonly bytes: ContentAddress };
  'host-resource': { readonly resource: ContentAddress };
}>;

/**
 * One physical payload, exact over what its bytes *are*.
 *
 * Identity follows representation, not origin. Realm-specific payload aliases
 * would either collapse structurally or force conversion between identical
 * bytes solely because different hosts produced them.
 *
 * Origin lives in provenance, where it belongs.
 */
export interface PhysicalPayload<Representation extends MediaRepresentationId = MediaRepresentationId> {
  readonly representation: MediaRepresentationReference<Representation>;
  readonly location: PayloadLocation;
}

// ---------------------------------------------------------------------------
// Bounded media sources
// ---------------------------------------------------------------------------

/** Stable identity for one media source. */
export type MediaSourceId<Name extends string = string> = Brand<Name, 'liteship.media-source-id'>;
/** Typed reference to one media source. */
export type MediaSourceReference<Id extends MediaSourceId = MediaSourceId> = Reference<
  'media-source',
  Id
>;

/**
 * How much a consumer is willing to hold in flight.
 *
 * Credit, not a drop policy. `13_stream` owns overload behaviour for event
 * delivery, and `drop-oldest`, `drop-newest`, and `coalesce` are all correct
 * there. They are catastrophic here: an encoder queue that quietly discards
 * frame 317 has not applied backpressure, it has changed the movie.
 *
 * Deliberate frame skipping, decimation, or resampling is a media
 * transformation with timeline semantics and a receipt. It is never an
 * incidental consequence of a full buffer.
 */
export interface MediaSourceCredit {
  readonly bounded: true;
}

/**
 * What one pull yields.
 *
 * There is no dropped arm, and that absence is the whole guarantee. A source
 * either produced units, completed, was cancelled, or failed — losing units
 * silently is unrepresentable.
 */
export type MediaBatch<Unit> = Algebra<{
  produced: { readonly units: NonEmptyTuple<Unit> };
  completed: Record<never, never>;
  cancelled: Record<never, never>;
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * One bounded, ordered, lossless media source.
 *
 * This is what makes long-form work possible. A non-empty tuple of every frame
 * would require a whole render to exist in memory before encoding could start.
 *
 * The unit is exact on the pull's *output*, which is covariant. An exact unit
 * carried only in an input position would be contravariant and prove nothing.
 */
export interface MediaSource<Unit, Id extends MediaSourceId = MediaSourceId> {
  readonly id: MediaSourceReference<Id>;
  readonly credit: MediaSourceCredit;
  readonly pull: Signature<MediaSourceCredit, MediaBatch<Unit>, NonEmptyTuple<Diagnostic>>;
  // `cancel` takes no reference. Elsewhere a job's cancel is handed its own
  // identity so a foreign job cannot cancel it, but a source *is* the receiver
  // — and an identity in input position is contravariant, which would make an
  // exact source unassignable to a broad one and quietly block every downstream
  // composition this model exists to allow.
  //
  // Returning only the source's own reference would keep `Id` covariant but
  // say nothing. `CancellationReceipt` keeps the covariance and spends it
  // on the distinction `MediaBatch` already makes four lines up: a cancel that
  // stopped a live source, a cancel that repeated one already in effect, and a
  // cancel that arrived after `completed` or `failed`. The third is the
  // expensive one — for a long render it is the difference between "your export
  // was stopped" and "your export finished, go collect it," and no caller can
  // recover that from a success flag.
  //
  // Not `DisposalReceipt`. Cancelling a source does not release it; ownership
  // and cancellation are different lifecycle facts, and `released` is simply
  // false here.
  readonly cancel: Signature<void, CancellationReceipt<MediaSourceReference<Id>>, NonEmptyTuple<Diagnostic>>;
}

// ---------------------------------------------------------------------------
// Physical frames and sample blocks, with provenance-owned coordinates
// ---------------------------------------------------------------------------

/**
 * How a rasterized frame's pixels came to exist.
 *
 * The coordinate is not a member here — it lives on the semantic frame this
 * provenance names. An earlier shape carried a free `time` beside the
 * derivation, which reintroduced one layer down exactly the parity triangle the
 * semantic frame had just shed: provenance says coordinate A, the sibling says
 * B, and no law can say which is true.
 */
export type RasterizedProvenance<Frame extends MediaFrame, Profile> = Algebra<{
  rasterized: { readonly frame: Frame; readonly profile: Profile };
  reused: {
    readonly frame: Frame;
    readonly profile: Profile;
    readonly from: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;
  };
}>;

/** How a decoded frame came to exist. Its coordinate is the source's. */
export type DecodedProvenance<
  Asset extends MediaAssetId,
  Profile extends DecodeProfileId,
> = Algebra<{
  decoded: {
    readonly asset: MediaAssetReference<Asset>;
    readonly profile: DecodeProfileReference<Profile>;
    readonly at: MediaTimeCut;
  };
  reused: {
    readonly asset: MediaAssetReference<Asset>;
    readonly profile: DecodeProfileReference<Profile>;
    readonly at: MediaTimeCut;
    readonly from: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;
  };
}>;

/** How a host-captured frame came to exist. Its coordinate is the capture's. */
export type CapturedProvenance<Composition, Profile> = Algebra<{
  'host-captured': {
    readonly composition: Composition;
    readonly profile: Profile;
    readonly at: MediaTimeCut;
  };
  reused: {
    readonly composition: Composition;
    readonly profile: Profile;
    readonly at: MediaTimeCut;
    readonly from: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;
  };
}>;

/**
 * One physical frame: bytes and where they came from.
 *
 * The provenance parameter is specialized per frame kind rather than left as
 * one union with arms a given frame can never inhabit.
 */
export interface PhysicalFrame<
  Representation extends MediaRepresentationId = MediaRepresentationId,
  Provenance = unknown,
> {
  readonly payload: PhysicalPayload<Representation>;
  readonly provenance: Provenance;
  readonly address: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;
}

/** Type-level representation of rasterized frame. */
export type RasterizedFrame<
  Representation extends MediaRepresentationId,
  Frame extends MediaFrame,
  Profile,
> = PhysicalFrame<Representation, RasterizedProvenance<Frame, Profile>>;

/** Type-level representation of decoded frame. */
export type DecodedFrame<
  Representation extends MediaRepresentationId,
  Asset extends MediaAssetId,
  Profile extends DecodeProfileId,
> = PhysicalFrame<Representation, DecodedProvenance<Asset, Profile>>;

/** Type-level representation of captured frame. */
export type CapturedFrame<
  Representation extends MediaRepresentationId,
  Composition,
  Profile,
> = PhysicalFrame<Representation, CapturedProvenance<Composition, Profile>>;

/** Type-level representation of decoded sample block. */
export type DecodedSampleBlock<
  Representation extends MediaRepresentationId,
  Asset extends MediaAssetId,
  Profile extends DecodeProfileId,
> = PhysicalSampleBlock<Representation, SampleProvenance<Asset, Profile>>;

/** How a block of audio samples came to exist. Its range is its coordinate. */
export type SampleProvenance<
  Asset extends MediaAssetId,
  Profile extends DecodeProfileId,
> = Algebra<{
  decoded: {
    readonly asset: MediaAssetReference<Asset>;
    readonly profile: DecodeProfileReference<Profile>;
    readonly range: SampleRange;
  };
  synthesized: { readonly cut: MediaCut; readonly range: SampleRange };
  reused: {
    readonly range: SampleRange;
    readonly from: ContentAddress<'application/vnd.liteship.physical-sample-block+cbor'>;
  };
}>;

/**
 * One physical block of audio samples.
 *
 * Audio is a first-class input, not a track that video happens to carry. An
 * encode path requiring video frames for audio-only output would leave lawful
 * track products unreachable from the operation surface.
 */
export interface PhysicalSampleBlock<
  Representation extends MediaRepresentationId = MediaRepresentationId,
  Provenance = unknown,
> {
  readonly payload: PhysicalPayload<Representation>;
  readonly provenance: Provenance;
  readonly address: ContentAddress<'application/vnd.liteship.physical-sample-block+cbor'>;
}

// ---------------------------------------------------------------------------
// Codecs, tracks, packets, containers
// ---------------------------------------------------------------------------

/** Stable identity for one media codec. */
export type MediaCodecId<Name extends string = string> = Brand<Name, 'liteship.media-codec-id'>;
/** Typed reference to one media codec. */
export type MediaCodecReference<Id extends MediaCodecId = MediaCodecId> = Reference<'media-codec', Id>;

/** Stable identity for one media track. */
export type MediaTrackId<Name extends string = string> = Brand<Name, 'liteship.media-track-id'>;
/** Typed reference to one media track. */
export type MediaTrackReference<Id extends MediaTrackId = MediaTrackId> = Reference<'media-track', Id>;

/** Stable identity for one decode profile. */
export type DecodeProfileId<Name extends string = string> = Brand<Name, 'liteship.media-decode-profile-id'>;
/** Typed reference to one decode profile. */
export type DecodeProfileReference<Id extends DecodeProfileId = DecodeProfileId> = Reference<
  'media-decode-profile',
  Id
>;

/** Stable identity for one encode profile. */
export type EncodeProfileId<Name extends string = string> = Brand<Name, 'liteship.media-encode-profile-id'>;
/** Typed reference to one encode profile. */
export type EncodeProfileReference<Id extends EncodeProfileId = EncodeProfileId> = Reference<
  'media-encode-profile',
  Id
>;

/** Stable identity for one container profile. */
export type ContainerProfileId<Name extends string = string> = Brand<
  Name,
  'liteship.media-container-profile-id'
>;
/** Typed reference to one container profile. */
export type ContainerProfileReference<Id extends ContainerProfileId = ContainerProfileId> = Reference<
  'media-container-profile',
  Id
>;

/**
 * A profile a host has already admitted.
 *
 * This is what makes a total core operation honest. A contract accepting an
 * arbitrary profile reference promises an output for every branded identity
 * anyone can mint, including ones this browser has never heard of. A contract
 * accepting an admitted profile is total over a domain the host has already
 * agreed to, so there is no compatibility-refusal arm left to write.
 *
 * Physical failure remains entirely possible, and every operation still returns
 * a `Result` — a device can be lost, input can be malformed, capacity can run
 * out. "Total" here means no *compatibility* refusal after admission, never
 * that the work cannot fail.
 */
export interface AdmittedProfile<Profile> {
  readonly profile: Profile;
  readonly admission: ContentAddress<'application/vnd.liteship.media-admission+cbor'>;
}

/**
 * The outcome of asking a host whether it admits one exact profile.
 *
 * Core owns this because the supported arm mints the `AdmittedProfile` core's
 * own operations require. Left to the hosts, each would declare a structurally
 * identical outcome under a different name, and the admission witness would
 * have two vocabularies before it had one consumer.
 */
export type CodecAdmission<Profile> = Algebra<{
  supported: { readonly admitted: AdmittedProfile<Profile> };
  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** One elementary stream's contract. */
export interface MediaTrackContract<Track extends MediaTrackId = MediaTrackId> {
  readonly id: MediaTrackReference<Track>;
  readonly codec: MediaCodecReference;
  readonly mediaType: MediaType;
  readonly parameters: CanonicalValue;
}

/**
 * Which streams a media product actually carries.
 *
 * An algebra rather than two arrays, because arrays make "no video" and "video
 * we forgot to attach" the same value.
 */
export type MediaTrackConfiguration<
  Video extends MediaTrackId = MediaTrackId,
  Audio extends MediaTrackId = MediaTrackId,
> = Algebra<{
  'video-only': { readonly video: MediaTrackContract<Video> };
  'audio-only': { readonly audio: MediaTrackContract<Audio> };
  'audio-video': {
    readonly video: MediaTrackContract<Video>;
    readonly audio: MediaTrackContract<Audio>;
  };
}>;

/** The three lawful track shapes, as a tag anything correlated can name. */
export type MediaTrackTag = TagOf<MediaTrackConfiguration>;

/**
 * A track-correlated set of bounded sources.
 *
 * Named for what it is rather than for one direction it travels. It is the
 * encoder's input and the decoder's output, and giving each a private algebra
 * of the same shape would have been two vocabularies for one fact — with the
 * decode side the one that quietly stayed video-only.
 *
 * The same `Tag` parameter selects the arm here and the arm of the track
 * configuration, so an audio-only product cannot be described with a video
 * frame source, and an audio-video product cannot be described with half its
 * population. Two independent algebras standing near each other would have left
 * the configuration describing something no operation could legally produce.
 */
export type MediaTrackSources<
  VideoUnit,
  AudioUnit,
  VideoSource extends MediaSourceId = MediaSourceId,
  AudioSource extends MediaSourceId = MediaSourceId,
> = Algebra<{
  'video-only': { readonly video: MediaSource<VideoUnit, VideoSource> };
  'audio-only': { readonly audio: MediaSource<AudioUnit, AudioSource> };
  'audio-video': {
    readonly video: MediaSource<VideoUnit, VideoSource>;
    readonly audio: MediaSource<AudioUnit, AudioSource>;
    readonly timebase: Timebase;
  };
}>;

/**
 * One encoded elementary-stream packet.
 *
 * Deliberately not a transport frame. It names the packet source that produced
 * it, the track it belongs to, and the profile it was encoded under, so an
 * artifact cannot truthfully name its bytes while lying about what media those
 * bytes contain. It does not name every source frame — that would be ancestry
 * confetti; the encode job binds the input source once, and the packet points
 * back at it.
 */
export interface MediaPacket<
  Profile extends EncodeProfileId = EncodeProfileId,
  Source extends MediaSourceId = MediaSourceId,
  Track extends MediaTrackId = MediaTrackId,
> {
  readonly source: MediaSourceReference<Source>;
  readonly track: MediaTrackReference<Track>;
  readonly profile: EncodeProfileReference<Profile>;
  readonly sequence: StreamSequence;
  readonly at: MediaTimeCut;
  readonly payload: ContentAddress;
  readonly sync: boolean;
}

/**
 * The finished media product.
 *
 * Asset identity is caller-carried — the caller decides what this artifact *is*
 * before it exists. Address and digest are producer-derived, because a caller
 * that could choose them could assert bytes it never produced. The track
 * configuration is the exact one the mux consumed, so a container cannot
 * manufacture a roster its packets never had.
 */
export interface MediaArtifact<
  Tag extends MediaTrackTag = MediaTrackTag,
  Asset extends MediaAssetId = MediaAssetId,
  Container extends ContainerProfileId = ContainerProfileId,
  Video extends MediaTrackId = MediaTrackId,
  Audio extends MediaTrackId = MediaTrackId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly container: ContainerProfileReference<Container>;
  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly receipt: ContentAddress<'application/vnd.liteship.media-mux-receipt+cbor'>;
  readonly address: ContentAddress;
  readonly digest: ContentDigest;
}

// ---------------------------------------------------------------------------
// The three sockets: decode, encode, mux
// ---------------------------------------------------------------------------

/**
 * Decoding an admitted source into a bounded frame or sample population.
 *
 * The shape is fixed here rather than left to a free supplier parameter. A
 * requirement generic over its own contract is satisfied by any host that
 * nominates itself — the lesson the target layer paid for at the Astro socket.
 */
export interface MediaDecodeRequest<
  Asset extends MediaAssetId = MediaAssetId,
  Revision extends RevisionId = RevisionId,
  Profile extends DecodeProfileId = DecodeProfileId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly revision: RevisionReference<Revision>;
  readonly profile: AdmittedProfile<DecodeProfileReference<Profile>>;
  readonly range: FrameRange | SampleRange;
}

/**
 * What a decode yielded, correlated to the tracks it decoded.
 *
 * The output is the same track-correlated shape the encoder consumes, so
 * decoding an audio asset produces sample blocks rather than a frame source
 * that nothing could fill. An earlier form returned frames unconditionally,
 * which meant the track algebra could describe an audio-only product while no
 * decode path could legally produce one — the same gap on the input side that
 * the encode correlation had just closed on the output side.
 */
export interface MediaDecodeProduct<
  Tag extends MediaTrackTag = MediaTrackTag,
  Representation extends MediaRepresentationId = MediaRepresentationId,
  Asset extends MediaAssetId = MediaAssetId,
  Revision extends RevisionId = RevisionId,
  Profile extends DecodeProfileId = DecodeProfileId,
  Video extends MediaSourceId = MediaSourceId,
  Audio extends MediaSourceId = MediaSourceId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly revision: RevisionReference<Revision>;
  readonly profile: DecodeProfileReference<Profile>;
  readonly output: CaseOf<
    MediaTrackSources<
      DecodedFrame<Representation, Asset, Profile>,
      DecodedSampleBlock<Representation, Asset, Profile>,
      Video,
      Audio
    >,
    Tag
  >;
  readonly reproducibility: ReproducibilityClaim<DecodeProfileReference<Profile>>;
}

/** Authority governing media decoder. */
export interface MediaDecoderAuthority {
  readonly decode: <
    Tag extends MediaTrackTag,
    Representation extends MediaRepresentationId,
    Asset extends MediaAssetId,
    Revision extends RevisionId,
    Profile extends DecodeProfileId,
    Video extends MediaSourceId,
    Audio extends MediaSourceId,
  >(
    request: MediaDecodeRequest<Asset, Revision, Profile>,
  ) => Result<
    MediaDecodeProduct<Tag, Representation, Asset, Revision, Profile, Video, Audio>,
    NonEmptyTuple<Diagnostic>
  >;
}

/**
 * Encoding a track-correlated bounded source into a bounded packet source.
 *
 * The output is a source, not a tuple. An encoder that had to return every
 * packet at once would have the same memory wall the frame tuple had, one stage
 * later.
 */
export interface MediaEncodeRequest<
  Tag extends MediaTrackTag = MediaTrackTag,
  VideoUnit = unknown,
  AudioUnit = unknown,
  Profile extends EncodeProfileId = EncodeProfileId,
  Video extends MediaTrackId = MediaTrackId,
  Audio extends MediaTrackId = MediaTrackId,
> {
  readonly profile: AdmittedProfile<EncodeProfileReference<Profile>>;
  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly input: CaseOf<MediaTrackSources<VideoUnit, AudioUnit>, Tag>;
}

/** Contract for media encode product. */
export interface MediaEncodeProduct<
  Tag extends MediaTrackTag = MediaTrackTag,
  Profile extends EncodeProfileId = EncodeProfileId,
  Packets extends MediaSourceId = MediaSourceId,
  Video extends MediaTrackId = MediaTrackId,
  Audio extends MediaTrackId = MediaTrackId,
> {
  readonly profile: EncodeProfileReference<Profile>;
  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly packets: MediaSource<MediaPacket<Profile, Packets>, Packets>;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;
}

/** Authority governing media encoder. */
export interface MediaEncoderAuthority {
  readonly encode: <
    Tag extends MediaTrackTag,
    VideoUnit,
    AudioUnit,
    Profile extends EncodeProfileId,
    Packets extends MediaSourceId,
    Video extends MediaTrackId,
    Audio extends MediaTrackId,
  >(
    request: MediaEncodeRequest<Tag, VideoUnit, AudioUnit, Profile, Video, Audio>,
  ) => Result<
    MediaEncodeProduct<Tag, Profile, Packets, Video, Audio>,
    NonEmptyTuple<Diagnostic>
  >;
}

/**
 * Muxing a bounded packet source into an addressed artifact.
 *
 * A separate socket because the reproducibility subject is different. Two runs
 * may emit identical packets and different container bytes — muxer metadata,
 * ordering, and timestamps are the container's business — so the claim that
 * survives here is over the whole artifact, not the elementary stream.
 */
export interface MediaMuxRequest<
  Tag extends MediaTrackTag = MediaTrackTag,
  Profile extends EncodeProfileId = EncodeProfileId,
  Packets extends MediaSourceId = MediaSourceId,
  Container extends ContainerProfileId = ContainerProfileId,
  Asset extends MediaAssetId = MediaAssetId,
  Video extends MediaTrackId = MediaTrackId,
  Audio extends MediaTrackId = MediaTrackId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly container: AdmittedProfile<ContainerProfileReference<Container>>;
  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly packets: MediaSource<MediaPacket<Profile, Packets>, Packets>;
}

/** Contract for media mux product. */
export interface MediaMuxProduct<
  Tag extends MediaTrackTag = MediaTrackTag,
  Asset extends MediaAssetId = MediaAssetId,
  Container extends ContainerProfileId = ContainerProfileId,
  Video extends MediaTrackId = MediaTrackId,
  Audio extends MediaTrackId = MediaTrackId,
> {
  readonly artifact: MediaArtifact<Tag, Asset, Container, Video, Audio>;
  readonly reproducibility: ReproducibilityClaim<ContainerProfileReference<Container>>;
}

/** Authority governing media mux. */
export interface MediaMuxAuthority {
  readonly finalize: <
    Tag extends MediaTrackTag,
    Profile extends EncodeProfileId,
    Packets extends MediaSourceId,
    Container extends ContainerProfileId,
    Asset extends MediaAssetId,
    Video extends MediaTrackId,
    Audio extends MediaTrackId,
  >(
    request: MediaMuxRequest<Tag, Profile, Packets, Container, Asset, Video, Audio>,
  ) => Result<MediaMuxProduct<Tag, Asset, Container, Video, Audio>, NonEmptyTuple<Diagnostic>>;
}

/** Capability requirement for media decoder. */
export type MediaDecoderRequirement = Hole<'liteship.media.decoder', MediaDecoderAuthority>;
/** Capability requirement for media encoder. */
export type MediaEncoderRequirement = Hole<'liteship.media.encoder', MediaEncoderAuthority>;
/** Capability requirement for media mux. */
export type MediaMuxRequirement = Hole<'liteship.media.mux', MediaMuxAuthority>;

// ---------------------------------------------------------------------------
// Analysis identity
// ---------------------------------------------------------------------------

/** Stable identity for one analysis algorithm. */
export type AnalysisAlgorithmId<Name extends string = string> = Brand<
  Name,
  'liteship.media-analysis-algorithm-id'
>;
/** Typed reference to one analysis algorithm. */
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
 * One analysis result, exact over everything that determined it.
 *
 * The asset revision is exact, not merely present: an analysis of yesterday's
 * audio is not an analysis of today's, and a broad reference would let a
 * re-import silently reuse the old answer.
 */
export interface MediaAnalysisResult<
  Asset extends MediaAssetId = MediaAssetId,
  Revision extends RevisionId = RevisionId,
  Algorithm extends AnalysisAlgorithmId = AnalysisAlgorithmId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly revision: RevisionReference<Revision>;
  readonly profile: AnalysisProfile<Algorithm>;
  readonly value: MediaAnalysis;
  readonly cache: ContentAddress<'application/vnd.liteship.media-analysis-cache+cbor'>;
}

// ---------------------------------------------------------------------------
// Export: the request, and the decision about it
// ---------------------------------------------------------------------------

/**
 * How one export request will be served.
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

/**
 * What is being exported, at which coordinate, to which egress.
 *
 * A request carries no disposition. An earlier shape put the decision inside
 * the request, which made it a decided plan wearing a request nametag — and
 * left a semantic-projection disposition able to exist while naming no subject,
 * no cut, and no egress at all. An adjective looking for a noun.
 */
export interface MediaExportRequest<
  Subject = SceneReference,
  Cut extends MediaCut = MediaCut,
  Asset extends MediaAssetId = MediaAssetId,
> {
  readonly subject: Subject;
  readonly cut: Cut;
  readonly asset: MediaAssetReference<Asset>;
  readonly egress: SceneEgress;
}

/** One request, and the single disposition it received. */
export interface MediaExportDecision<
  Subject = SceneReference,
  Cut extends MediaCut = MediaCut,
  Asset extends MediaAssetId = MediaAssetId,
  CaptureProfile = unknown,
> {
  readonly request: MediaExportRequest<Subject, Cut, Asset>;
  readonly disposition: MediaExportDisposition<CaptureProfile>;
}

/** Semantic media event suitable for timelines and streams. */
export type MediaEvent = Algebra<{
  analysis: { readonly result: MediaAnalysisResult; readonly at: Timecode };
  frame: { readonly asset: MediaAssetReference; readonly value: MediaFrame };
  ended: { readonly asset: MediaAssetReference; readonly at: Timecode };
}>;

/** Type summary consumed by the root core topology. */
export interface MediaTypeSurface {
  readonly asset: MediaAsset;
  readonly sampleRange: SampleRange;
  readonly frameRange: FrameRange;
  readonly analysis: MediaAnalysis;
  readonly analysisResult: MediaAnalysisResult;
  readonly time: MediaTimeCut;
  readonly frame: MediaFrame;
  readonly payload: PhysicalPayload;
  readonly physicalFrame: PhysicalFrame;
  readonly sampleBlock: PhysicalSampleBlock;
  readonly source: MediaSource<unknown>;
  readonly batch: MediaBatch<unknown>;
  readonly admitted: AdmittedProfile<unknown>;
  readonly admission: CodecAdmission<unknown>;
  readonly track: MediaTrackConfiguration;
  readonly trackSources: MediaTrackSources<unknown, unknown>;
  readonly packet: MediaPacket;
  readonly artifact: MediaArtifact;
  readonly decodeProduct: MediaDecodeProduct;
  readonly sampleBlockOf: DecodedSampleBlock<MediaRepresentationId, MediaAssetId, DecodeProfileId>;
  readonly decoder: MediaDecoderAuthority;
  readonly encoder: MediaEncoderAuthority;
  readonly mux: MediaMuxAuthority;
  readonly exportRequest: MediaExportRequest;
  readonly exportDecision: MediaExportDecision;
  readonly event: MediaEvent;
}
