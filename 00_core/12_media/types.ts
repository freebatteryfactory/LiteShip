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
  Address,
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  OkOf,
  Signature,
  SignatureResult,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress, ContentDigest, MediaType } from '../01_encoding/types.js';
import type { RevisionId, RevisionReference, WorldId } from '../02_identity/types.js';
import type { SchemaReference } from '../03_schema/types.js';
import type { FrameIndex, SampleIndex, StreamSequence, Timebase, TimeCut, Timecode } from '../04_time/types.js';
import type { CancellationReceipt, DisposalReceipt } from '../05_lifecycle/types.js';
import type { EvidenceCutId, ReproducibilityClaim } from '../06_evidence/types.js';
import type { AnySemanticCut } from '../08_state/types.js';
import type { ProjectionFidelity, SceneEgress, SceneReference } from '../11_scene/types.js';

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

// ---------------------------------------------------------------------------
// Physical payload: representation, not realm
// ---------------------------------------------------------------------------

export type MediaRepresentationId<Name extends string = string> = Brand<
  Name,
  'liteship.media-representation-id'
>;
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
 * Identity follows representation, not origin. An earlier draft gave each realm
 * its own payload type — browser bytes, capture bytes, server bytes — and all
 * of them reduced to the same structure, so TypeScript treated four
 * nominal-sounding names as one anonymous paper bag. Worse, had they been
 * branded by realm, two hosts producing identical RGBA8 would have needed a
 * conversion bridge between identical bytes because one was born near a
 * browser.
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

export type MediaSourceId<Name extends string = string> = Brand<Name, 'liteship.media-source-id'>;
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
 * This is what makes long-form work possible. The predecessor shape required a
 * non-empty tuple of every frame, which meant a five-minute render had to exist
 * in memory before encoding could start — fine for a ten-second demo and a wall
 * for anything the product actually exists to make.
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
  // Its output used to be the source's own reference, which kept `Id` covariant
  // and said nothing. `CancellationReceipt` keeps the covariance and spends it
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
 * one union with arms a given frame can never inhabit. An earlier draft used
 * `never` for a capture's semantic-frame parameter, which locked the trapdoor
 * correctly but left consumers staring at branches that could not exist.
 */
export interface PhysicalFrame<
  Representation extends MediaRepresentationId = MediaRepresentationId,
  Provenance = unknown,
> {
  readonly payload: PhysicalPayload<Representation>;
  readonly provenance: Provenance;
  readonly address: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;
}

export type RasterizedFrame<
  Representation extends MediaRepresentationId,
  Frame extends MediaFrame,
  Profile,
> = PhysicalFrame<Representation, RasterizedProvenance<Frame, Profile>>;

export type DecodedFrame<
  Representation extends MediaRepresentationId,
  Asset extends MediaAssetId,
  Profile extends DecodeProfileId,
> = PhysicalFrame<Representation, DecodedProvenance<Asset, Profile>>;

export type CapturedFrame<
  Representation extends MediaRepresentationId,
  Composition,
  Profile,
> = PhysicalFrame<Representation, CapturedProvenance<Composition, Profile>>;

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
 * Audio is a first-class input, not a track that video happens to carry. The
 * predecessor encode path required video frames even for an audio-only output,
 * which meant the track algebra could describe a product the operation surface
 * had no legal way to produce.
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

export type MediaCodecId<Name extends string = string> = Brand<Name, 'liteship.media-codec-id'>;
export type MediaCodecReference<Id extends MediaCodecId = MediaCodecId> = Reference<'media-codec', Id>;

export type MediaTrackId<Name extends string = string> = Brand<Name, 'liteship.media-track-id'>;
export type MediaTrackReference<Id extends MediaTrackId = MediaTrackId> = Reference<'media-track', Id>;

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

export type MediaDecoderRequirement = Hole<'liteship.media.decoder', MediaDecoderAuthority>;
export type MediaEncoderRequirement = Hole<'liteship.media.encoder', MediaEncoderAuthority>;
export type MediaMuxRequirement = Hole<'liteship.media.mux', MediaMuxAuthority>;

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

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type MediaLawAssetA = MediaAssetId<'liteship.media.law.asset-a'>;
type MediaLawRevisionA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:5555555555555555555555555555555555555555555555555555555555555555'
>;
type MediaLawRepA = MediaRepresentationId<'liteship.media.law.representation-a'>;
type MediaLawDecodeA = DecodeProfileId<'liteship.media.law.decode-a'>;
type MediaLawEncodeA = EncodeProfileId<'liteship.media.law.encode-a'>;
type MediaLawContainerA = ContainerProfileId<'liteship.media.law.container-a'>;
type MediaLawTrackA = MediaTrackId<'liteship.media.law.track-a'>;
type MediaLawTrackB = MediaTrackId<'liteship.media.law.track-b'>;
type MediaLawSourceA = MediaSourceId<'liteship.media.law.source-a'>;
type MediaLawAlgorithmA = AnalysisAlgorithmId<'liteship.media.law.algorithm-a'>;

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
 * Compile-time law: a physical frame carries no coordinate of its own.
 *
 * The coordinate belongs to provenance — to the semantic frame a rasterization
 * realizes, to the source coordinate a decode came from, to the capture
 * coordinate a composite was taken at. A sibling `time` here is the parity
 * triangle reincarnating one layer below where it was removed.
 */
export type APhysicalFrameCarriesNoCoordinateOfItsOwn = Assert<
  Equal<
    [
      'time' extends keyof PhysicalFrame ? true : false,
      'at' extends keyof PhysicalFrame ? true : false,
      'cut' extends keyof PhysicalFrame ? true : false,
      'provenance' extends keyof PhysicalFrame ? true : false,
      'time' extends keyof PhysicalSampleBlock ? true : false,
      'range' extends keyof PhysicalSampleBlock ? true : false,
    ],
    [false, false, false, true, false, false]
  >
>;

/**
 * Compile-time law: the three physical provenances are distinct populations,
 * and none can inhabit another's arms.
 *
 * Specialized rather than one union with impossible branches. A rasterized
 * frame cannot claim host capture; a captured frame cannot claim it realized a
 * semantic frame; a decoded frame is neither, which is why it needed an arm of
 * its own rather than borrowing a nametag that was never true.
 */
export type PhysicalProvenancesStayDistinct = Assert<
  Equal<
    [
      TagOf<RasterizedProvenance<MediaFrame, unknown>>,
      TagOf<DecodedProvenance<MediaLawAssetA, MediaLawDecodeA>>,
      TagOf<CapturedProvenance<unknown, unknown>>,
      TagOf<SampleProvenance<MediaLawAssetA, MediaLawDecodeA>>,
      // Semantic reuse must carry evidence that every relevant dependency is
      // unchanged. Without it, `reused` degrades into "we did not recompute
      // this", which is a scheduling note rather than a correctness claim.
      CaseOf<SemanticFrameDerivation, 'reused'>['unchanged'] extends ContentAddress<
        'application/vnd.liteship.media-reuse-evidence+cbor'
      >
        ? true
        : false,
    ],
    [
      'rasterized' | 'reused',
      'decoded' | 'reused',
      'host-captured' | 'reused',
      'decoded' | 'synthesized' | 'reused',
      true,
    ]
  >
>;

/**
 * Compile-time law: rasterized provenance names the exact semantic frame it
 * realizes, and captured provenance names a composition instead.
 *
 * This is the law that makes live presentation and export the same evaluation.
 */
export type RasterizedProvenanceNamesItsSemanticFrame = Assert<
  Equal<
    [
      'frame' extends keyof CaseOf<RasterizedProvenance<MediaFrame, unknown>, 'rasterized'>
        ? true
        : false,
      'frame' extends keyof CaseOf<CapturedProvenance<unknown, unknown>, 'host-captured'>
        ? true
        : false,
      'composition' extends keyof CaseOf<CapturedProvenance<unknown, unknown>, 'host-captured'>
        ? true
        : false,
      'asset' extends keyof CaseOf<DecodedProvenance<MediaLawAssetA, MediaLawDecodeA>, 'decoded'>
        ? true
        : false,
    ],
    [true, false, true, true]
  >
>;

/**
 * Compile-time law: a physical payload is exact over its representation, and
 * realm is not part of its identity.
 *
 * Two hosts producing the same canonical representation interoperate, which is
 * a feature. Four realm-named wrappers around one structure were four different
 * comments on the same type.
 */
export type APayloadIsExactOverItsRepresentation = Assert<
  Equal<
    [
      PhysicalPayload<MediaLawRepA>['representation'],
      PhysicalPayload<MediaLawRepA> extends PhysicalPayload<
        MediaRepresentationId<'liteship.media.law.representation-b'>
      >
        ? true
        : false,
      TagOf<PayloadLocation>,
    ],
    [
      MediaRepresentationReference<MediaLawRepA>,
      false,
      'addressed' | 'host-resource',
    ]
  >
>;

/**
 * Compile-time law: a media source is bounded, ordered, and lossless.
 *
 * The absence of a dropped arm is the guarantee. `13_stream` may lawfully drop
 * oldest, drop newest, or coalesce, because losing a stale UI event is
 * recoverable; losing frame 317 changes the movie.
 */
export type AMediaSourceCannotSilentlyDropUnits = Assert<
  Equal<
    [
      // Credit is a boolean bound, not a capacity with an overflow rule. A
      // numeric policy here would let an encoder queue discard frame 317 and
      // call it backpressure.
      MediaSourceCredit['bounded'],
      'overflow' extends keyof MediaSourceCredit ? true : false,
      'capacity' extends keyof MediaSourceCredit ? true : false,
      TagOf<MediaBatch<unknown>>,
      CaseOf<MediaBatch<MediaLawRepA>, 'produced'>['units'] extends NonEmptyTuple<MediaLawRepA>
        ? true
        : false,
      readonly MediaLawRepA[] extends CaseOf<MediaBatch<MediaLawRepA>, 'produced'>['units']
        ? true
        : false,
      MediaSource<unknown, MediaLawSourceA>['credit'] extends MediaSourceCredit ? true : false,
    ],
    [true, false, false, 'produced' | 'completed' | 'cancelled' | 'failed', true, false, true]
  >
>;

/**
 * Compile-time law: a source is exact over its unit through the covariant
 * output of its pull, and exact over its own identity.
 *
 * The unit carried only in an input position would be contravariant and would
 * survive every broadening.
 */
/**
 * Cancelling a source yields a cancellation receipt in the success arm.
 *
 * Read through the operation rather than off the declaration: `SignatureResult`
 * places the output in `Ok` and the failure algebra in `Err`, and `OkOf`
 * recovers the success payload. So this asserts that *executing* `cancel`
 * produces a receipt naming this exact source — not merely that a member was
 * typed a certain way.
 *
 * The second line is the one that would catch the mistake this member already
 * made once. `cancel` briefly returned a `DisposalReceipt`, which is a truthful
 * shape describing an untrue event: cancelling a source does not release it.
 * The two receipts carry disjoint outcome tags, so the substitution fails here
 * rather than surviving into a host that believes ownership ended.
 */
export type CancellingASourceYieldsACancellationReceipt = Assert<
  Equal<
    [
      Equal<
        OkOf<SignatureResult<MediaSource<PhysicalFrame, MediaSourceId<'law.src'>>['cancel']>>,
        CancellationReceipt<MediaSourceReference<MediaSourceId<'law.src'>>>
      >,
      OkOf<
        SignatureResult<MediaSource<PhysicalFrame, MediaSourceId<'law.src'>>['cancel']>
      > extends DisposalReceipt<MediaSourceReference<MediaSourceId<'law.src'>>>
        ? true
        : false,
    ],
    [true, false]
  >
>;

export type AMediaSourceIsExactOverItsUnit = Assert<
  Equal<
    [
      // Read the pull relationship itself. Substitutability alone survives the
      // input and output being swapped — the unit is still "somewhere in the
      // signature", and every downstream exactness claim quietly becomes
      // contravariant.
      Equal<
        MediaSource<MediaLawRepA, MediaLawSourceA>['pull'],
        Signature<MediaSourceCredit, MediaBatch<MediaLawRepA>, NonEmptyTuple<Diagnostic>>
      >,
      MediaSource<MediaLawRepA, MediaLawSourceA> extends MediaSource<
        MediaRepresentationId<'liteship.media.law.representation-b'>,
        MediaLawSourceA
      >
        ? true
        : false,
      MediaSource<MediaLawRepA, MediaLawSourceA> extends MediaSource<
        MediaLawRepA,
        MediaSourceId<'liteship.media.law.source-b'>
      >
        ? true
        : false,
      MediaSource<MediaLawRepA, MediaLawSourceA>['id'],
    ],
    [true, false, false, MediaSourceReference<MediaLawSourceA>]
  >
>;

/**
 * Compile-time law: the encode input and the track configuration are selected
 * by one tag, so neither can describe a product the other cannot produce.
 *
 * Members are compared one at a time because a deferred indexed access over an
 * `Extract` union resolves alone but not inside a tuple.
 */
export type EncodeInputIsCorrelatedToItsTracks = Assert<
  Equal<
    [
      Equal<
        MediaEncodeRequest<'audio-only', unknown, unknown, MediaLawEncodeA>['input'],
        CaseOf<MediaTrackSources<unknown, unknown>, 'audio-only'>
      >,
      Equal<
        MediaEncodeRequest<'audio-only', unknown, unknown, MediaLawEncodeA>['tracks'],
        CaseOf<MediaTrackConfiguration, 'audio-only'>
      >,
      'video' extends keyof CaseOf<MediaTrackSources<unknown, unknown>, 'audio-only'> ? true : false,
      'audio' extends keyof CaseOf<MediaTrackSources<unknown, unknown>, 'video-only'> ? true : false,
      TagOf<MediaTrackSources<unknown, unknown>>,
    ],
    [true, true, false, false, MediaTrackTag]
  >
>;

/**
 * Compile-time law: encoding consumes a source and produces a source.
 *
 * Neither side is a tuple. A tuple at either end reintroduces the memory wall
 * that made long-form rendering impossible, one stage apart.
 */
export type EncodingIsSourceToSourceNotTupleToTuple = Assert<
  Equal<
    [
      // Decode too, and on the audio arm. Read as members rather than by
      // varying a type argument: collapsing a source to a tuple leaves the
      // source parameter unused, and an unused parameter is a hygiene death no
      // named law can attribute.
      Equal<
        CaseOf<
          MediaDecodeProduct<
            'video-only',
            MediaLawRepA,
            MediaLawAssetA,
            MediaLawRevisionA,
            MediaLawDecodeA,
            MediaLawSourceA
          >['output'],
          'video-only'
        >['video'],
        MediaSource<DecodedFrame<MediaLawRepA, MediaLawAssetA, MediaLawDecodeA>, MediaLawSourceA>
      >,
      // The audio arm yields sample blocks, not frames. Without this the track
      // algebra could describe an audio-only product no decode could produce.
      Equal<
        CaseOf<
          MediaDecodeProduct<
            'audio-only',
            MediaLawRepA,
            MediaLawAssetA,
            MediaLawRevisionA,
            MediaLawDecodeA,
            MediaLawSourceA,
            MediaLawSourceA
          >['output'],
          'audio-only'
        >['audio'],
        MediaSource<
          DecodedSampleBlock<MediaLawRepA, MediaLawAssetA, MediaLawDecodeA>,
          MediaLawSourceA
        >
      >,
      Equal<
        MediaEncodeProduct<'video-only', MediaLawEncodeA, MediaLawSourceA>['packets'],
        MediaSource<MediaPacket<MediaLawEncodeA, MediaLawSourceA>, MediaLawSourceA>
      >,
      MediaEncodeProduct<'video-only', MediaLawEncodeA, MediaLawSourceA>['packets'] extends readonly unknown[]
        ? true
        : false,
      CaseOf<MediaTrackSources<unknown, unknown>, 'video-only'>['video'] extends readonly unknown[]
        ? true
        : false,
    ],
    [true, true, true, false, false]
  >
>;

/**
 * Compile-time law: a packet names the source, track, and profile that produced
 * it, and carries its own sequence.
 *
 * Without the track relation, a mux can assemble a container whose roster its
 * packets never had — an artifact naming its bytes truthfully while lying about
 * what media they contain.
 */
export type APacketNamesItsSourceTrackAndProfile = Assert<
  Equal<
    [
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackA>['source'],
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackA>['track'],
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackA>['profile'],
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackA>['sequence'] extends StreamSequence
        ? true
        : false,
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackB> extends MediaPacket<
        MediaLawEncodeA,
        MediaLawSourceA,
        MediaLawTrackA
      >
        ? true
        : false,
    ],
    [
      MediaSourceReference<MediaLawSourceA>,
      MediaTrackReference<MediaLawTrackA>,
      EncodeProfileReference<MediaLawEncodeA>,
      true,
      false,
    ]
  >
>;

/**
 * Compile-time law: the artifact's track configuration is the exact one the mux
 * consumed, its bytes are producer-derived, and its identity is caller-carried.
 */
export type AnArtifactCannotManufactureItsRoster = Assert<
  Equal<
    [
      Equal<
        MediaArtifact<'audio-video', MediaLawAssetA, MediaLawContainerA, MediaLawTrackA, MediaLawTrackB>['tracks'],
        CaseOf<MediaTrackConfiguration<MediaLawTrackA, MediaLawTrackB>, 'audio-video'>
      >,
      MediaArtifact['asset'] extends MediaAssetReference ? true : false,
      MediaArtifact['address'] extends ContentAddress ? true : false,
      MediaArtifact['digest'] extends ContentDigest ? true : false,
      MediaArtifact<
        'video-only',
        MediaLawAssetA,
        ContainerProfileId<'liteship.media.law.container-b'>
      > extends MediaArtifact<'video-only', MediaLawAssetA, MediaLawContainerA>
        ? true
        : false,
    ],
    [true, true, true, true, false]
  >
>;

/**
 * Compile-time law: every codec operation consumes an admitted profile.
 *
 * This is what makes a total contract honest. A bare profile reference is a
 * branded identity anyone can mint, so a total operation over it would promise
 * output for codecs this host has never heard of. Admission is the host's
 * answer; the core contract is total only over what was already admitted.
 */
export type CodecOperationsConsumeAdmittedProfiles = Assert<
  Equal<
    [
      Equal<
        MediaDecodeRequest<MediaLawAssetA, MediaLawRevisionA, MediaLawDecodeA>['profile'],
        AdmittedProfile<DecodeProfileReference<MediaLawDecodeA>>
      >,
      Equal<
        MediaEncodeRequest<'video-only', unknown, unknown, MediaLawEncodeA>['profile'],
        AdmittedProfile<EncodeProfileReference<MediaLawEncodeA>>
      >,
      Equal<
        MediaMuxRequest<
          'video-only',
          MediaLawEncodeA,
          MediaLawSourceA,
          MediaLawContainerA,
          MediaLawAssetA
        >['container'],
        AdmittedProfile<ContainerProfileReference<MediaLawContainerA>>
      >,
      'admission' extends keyof AdmittedProfile<unknown> ? true : false,
    ],
    [true, true, true, true]
  >
>;

/**
 * Compile-time law: physical failure stays representable after admission.
 *
 * Totality means no compatibility-refusal arm, never that the work cannot fail.
 * A device can be lost, input can be malformed, capacity can run out.
 */
export type AdmissionDoesNotMakePhysicalWorkInfallible = Assert<
  Equal<
    [
      ReturnType<MediaDecoderAuthority['decode']> extends Result<unknown, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      ReturnType<MediaEncoderAuthority['encode']> extends Result<unknown, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      ReturnType<MediaMuxAuthority['finalize']> extends Result<unknown, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
    ],
    [true, true, true]
  >
>;

/**
 * Compile-time law: an analysis result is exact over the revision, algorithm,
 * parameters, and coordinate system that determined it, and events carry the
 * result rather than a bare payload.
 *
 * The event arm mattered: carrying raw `MediaAnalysis` bypassed the whole
 * identity the result exists to hold, so a strengthened result travelled the
 * stream as an anonymous number array.
 */
export type AnAnalysisResultNamesEverythingThatDeterminedIt = Assert<
  Equal<
    [
      MediaAnalysisResult<MediaLawAssetA, MediaLawRevisionA, MediaLawAlgorithmA>['revision'],
      MediaAnalysisResult<MediaLawAssetA, MediaLawRevisionA, MediaLawAlgorithmA>['profile']['algorithm'],
      MediaAnalysisResult['profile']['parameters'] extends CanonicalValue ? true : false,
      MediaAnalysisResult['profile']['coordinateSystem'] extends AnalysisCoordinateSystem ? true : false,
      'cache' extends keyof MediaAnalysisResult ? true : false,
      CaseOf<MediaEvent, 'analysis'>['result'] extends MediaAnalysisResult ? true : false,
    ],
    [
      RevisionReference<MediaLawRevisionA>,
      AnalysisAlgorithmReference<MediaLawAlgorithmA>,
      true,
      true,
      true,
      true,
    ]
  >
>;

/**
 * Compile-time law: an export request names its subject, cut, and egress, and
 * carries no disposition.
 *
 * A request holding its own answer is a decided plan wearing a request nametag,
 * and it let a semantic-projection disposition exist while naming nothing at
 * all.
 */
export type AnExportRequestNamesItsSubjectAndCarriesNoAnswer = Assert<
  Equal<
    [
      'subject' extends keyof MediaExportRequest ? true : false,
      'cut' extends keyof MediaExportRequest ? true : false,
      'egress' extends keyof MediaExportRequest ? true : false,
      'disposition' extends keyof MediaExportRequest ? true : false,
      MediaExportDecision['request'] extends MediaExportRequest ? true : false,
      MediaExportDecision['disposition'] extends MediaExportDisposition ? true : false,
    ],
    [true, true, true, false, true, true]
  >
>;

/**
 * Compile-time law: the three export dispositions answer three different
 * questions, and an unavailable one cannot be silent.
 */
export type AnExportDecisionCarriesOneDisposition = Assert<
  Equal<
    [
      TagOf<MediaExportDisposition>,
      keyof CaseOf<MediaExportDisposition, 'semantic-projection'>,
      keyof CaseOf<MediaExportDisposition, 'host-capture'>,
      keyof CaseOf<MediaExportDisposition, 'unavailable'>,
      readonly Diagnostic[] extends CaseOf<MediaExportDisposition, 'unavailable'>['diagnostics']
        ? true
        : false,
    ],
    [
      'semantic-projection' | 'host-capture' | 'unavailable',
      '_tag' | 'fidelity',
      '_tag' | 'profile',
      '_tag' | 'diagnostics' | 'remediation',
      false,
    ]
  >
>;

/**
 * Compile-time law: decode, encode, and mux are three typed holes whose
 * contracts core fixes.
 */
export type CodecRequirementsAreTypedHoles = Assert<
  Equal<
    [
      MediaDecoderRequirement extends Hole<'liteship.media.decoder', MediaDecoderAuthority> ? true : false,
      MediaEncoderRequirement extends Hole<'liteship.media.encoder', MediaEncoderAuthority> ? true : false,
      MediaMuxRequirement extends Hole<'liteship.media.mux', MediaMuxAuthority> ? true : false,
    ],
    [true, true, true]
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
