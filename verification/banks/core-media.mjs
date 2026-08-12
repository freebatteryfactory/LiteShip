// Core media: bounded lossless sources, provenance-owned coordinates, three
// admitted sockets, and an export request that names its subject.
//
// Every mutation restores one piece of what the media-lineage fold removed. If
// any survives, the README is once again describing a home that does not exist,
// or a five-minute render is once again required to fit in memory.

import { runBank } from '../harness.mjs';

const MD = '00_core/12_media/types.ts';

const M = [
  // --- the semantic frame owns one coordinate ------------------------------
  ['the frame reacquires a sibling frame index', MD,
    `  readonly cut: Cut;
  readonly state: State;`,
    `  readonly cut: Cut;
  readonly frame: FrameIndex;
  readonly state: State;`],

  ['the frame reacquires a sibling time cut', MD,
    `  readonly cut: Cut;
  readonly state: State;`,
    `  readonly cut: Cut;
  readonly time: MediaTimeCut;
  readonly state: State;`],

  ['the frame loses its cut for a bare coordinate', MD,
    `  readonly cut: Cut;
  readonly state: State;`,
    `  readonly time: MediaTimeCut;
  readonly state: State;`],

  // --- the physical frame carries no coordinate ----------------------------
  ['the physical frame reacquires a free coordinate', MD,
    `  readonly payload: PhysicalPayload<Representation>;
  readonly provenance: Provenance;
  readonly address: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;`,
    `  readonly payload: PhysicalPayload<Representation>;
  readonly provenance: Provenance;
  readonly time: MediaTimeCut;
  readonly address: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;`],

  ['the physical frame loses its provenance', MD,
    `  readonly payload: PhysicalPayload<Representation>;
  readonly provenance: Provenance;
  readonly address: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;`,
    `  readonly payload: PhysicalPayload<Representation>;
  readonly address: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;`],

  ['the sample block reacquires a free range', MD,
    `  readonly payload: PhysicalPayload<Representation>;
  readonly provenance: Provenance;
  readonly address: ContentAddress<'application/vnd.liteship.physical-sample-block+cbor'>;`,
    `  readonly payload: PhysicalPayload<Representation>;
  readonly provenance: Provenance;
  readonly range: SampleRange;
  readonly address: ContentAddress<'application/vnd.liteship.physical-sample-block+cbor'>;`],

  // --- provenance ----------------------------------------------------------
  ['rasterized provenance stops naming its semantic frame', MD,
    `  rasterized: { readonly frame: Frame; readonly profile: Profile };`,
    `  rasterized: { readonly profile: Profile };`],

  ['captured provenance acquires a semantic frame it never realized', MD,
    `  'host-captured': {
    readonly composition: Composition;
    readonly profile: Profile;
    readonly at: MediaTimeCut;
  };`,
    `  'host-captured': {
    readonly composition: Composition;
    readonly profile: Profile;
    readonly at: MediaTimeCut;
    readonly frame: MediaFrame;
  };`],

  ['decoded provenance loses the asset it decoded', MD,
    `  decoded: {
    readonly asset: MediaAssetReference<Asset>;
    readonly profile: DecodeProfileReference<Profile>;
    readonly at: MediaTimeCut;
  };`,
    `  decoded: {
    readonly profile: DecodeProfileReference<Profile>;
    readonly at: MediaTimeCut;
  };`],

  ['decoded provenance collapses into the rasterized arm', MD,
    `export type DecodedProvenance<
  Asset extends MediaAssetId,
  Profile extends DecodeProfileId,
> = Algebra<{
  decoded: {`,
    `export type DecodedProvenance<
  Asset extends MediaAssetId,
  Profile extends DecodeProfileId,
> = Algebra<{
  rasterized: {`],

  ['semantic reuse stops carrying its unchanged-dependency evidence', MD,
    `  reused: {
    readonly from: MediaTimeCut;
    readonly unchanged: ContentAddress<'application/vnd.liteship.media-reuse-evidence+cbor'>;
  };`,
    `  reused: {
    readonly from: MediaTimeCut;
  };`],

  // --- payload -------------------------------------------------------------
  ['the payload stops being exact over its representation', MD,
    `export interface PhysicalPayload<Representation extends MediaRepresentationId = MediaRepresentationId> {
  readonly representation: MediaRepresentationReference<Representation>;`,
    `export interface PhysicalPayload<Representation extends MediaRepresentationId = MediaRepresentationId> {
  readonly representation: MediaRepresentationReference;`],

  ['the payload location collapses to raw bytes', MD,
    `export type PayloadLocation = Algebra<{
  addressed: { readonly bytes: ContentAddress };
  'host-resource': { readonly resource: ContentAddress };
}>;`,
    `export type PayloadLocation = Algebra<{
  addressed: { readonly bytes: ContentAddress };
}>;`],

  // --- bounded lossless sources --------------------------------------------
  ['the source batch acquires a dropped arm', MD,
    `export type MediaBatch<Unit> = Algebra<{
  produced: { readonly units: NonEmptyTuple<Unit> };`,
    `export type MediaBatch<Unit> = Algebra<{
  dropped: { readonly count: number };
  produced: { readonly units: NonEmptyTuple<Unit> };`],

  ['a produced batch accepts an empty population', MD,
    `  produced: { readonly units: NonEmptyTuple<Unit> };`,
    `  produced: { readonly units: readonly Unit[] };`],

  ['the source loses its completion arm', MD,
    `  produced: { readonly units: NonEmptyTuple<Unit> };
  completed: Record<never, never>;
  cancelled: Record<never, never>;`,
    `  produced: { readonly units: NonEmptyTuple<Unit> };
  cancelled: Record<never, never>;`],

  ['the source stops being exact over its identity', MD,
    `export interface MediaSource<Unit, Id extends MediaSourceId = MediaSourceId> {
  readonly id: MediaSourceReference<Id>;`,
    `export interface MediaSource<Unit, Id extends MediaSourceId = MediaSourceId> {
  readonly id: MediaSourceReference;`],

  ['the source carries its unit only contravariantly', MD,
    `  readonly pull: Signature<MediaSourceCredit, MediaBatch<Unit>, NonEmptyTuple<Diagnostic>>;`,
    `  readonly pull: Signature<MediaBatch<Unit>, MediaSourceCredit, NonEmptyTuple<Diagnostic>>;`],

  ['credit becomes a numeric drop policy', MD,
    `export interface MediaSourceCredit {
  readonly bounded: true;
}`,
    `export interface MediaSourceCredit {
  readonly capacity: number;
  readonly overflow: 'drop-oldest' | 'drop-newest';
}`],

  // --- tracks and input correlation ----------------------------------------
  ['track configuration collapses into two optional members', MD,
    `export type MediaTrackConfiguration<
  Video extends MediaTrackId = MediaTrackId,
  Audio extends MediaTrackId = MediaTrackId,
> = Algebra<{
  'video-only': { readonly video: MediaTrackContract<Video> };
  'audio-only': { readonly audio: MediaTrackContract<Audio> };`,
    `export type MediaTrackConfiguration<
  Video extends MediaTrackId = MediaTrackId,
  Audio extends MediaTrackId = MediaTrackId,
> = Algebra<{
  tracks: { readonly video?: MediaTrackContract<Video>; readonly audio?: MediaTrackContract<Audio> };
  'audio-only': { readonly audio: MediaTrackContract<Audio> };`],

  ['the video-only input arm quietly admits an audio source', MD,
    `  'video-only': { readonly video: MediaSource<VideoUnit, VideoSource> };`,
    `  'video-only': {
    readonly video: MediaSource<VideoUnit, VideoSource>;
    readonly audio: MediaSource<AudioUnit, AudioSource>;
  };`],

  ['the audio-only input arm requires video frames anyway', MD,
    `  'audio-only': { readonly audio: MediaSource<AudioUnit, AudioSource> };`,
    `  'audio-only': {
    readonly audio: MediaSource<AudioUnit, AudioSource>;
    readonly video: MediaSource<VideoUnit, VideoSource>;
  };`],

  ['the input tag stops matching the track tag', MD,
    `> = Algebra<{
  'video-only': { readonly video: MediaSource<VideoUnit, VideoSource> };`,
    `> = Algebra<{
  'frames-only': { readonly video: MediaSource<VideoUnit, VideoSource> };`],

  ['the encode request decorrelates its input from its tracks', MD,
    `  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly input: CaseOf<MediaInput<VideoUnit, AudioUnit>, Tag>;`,
    `  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly input: MediaInput<VideoUnit, AudioUnit>;`],

  // --- the memory wall -----------------------------------------------------
  ['the encoder returns a tuple of packets instead of a source', MD,
    `  readonly packets: MediaSource<MediaPacket<Profile, Packets>, Packets>;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;`,
    `  readonly packets: NonEmptyTuple<MediaPacket<Profile, Packets>>;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;`],

  ['the decoder returns a tuple of frames instead of a source', MD,
    `  readonly frames: MediaSource<DecodedFrame<Representation, Asset, Profile>, Source>;`,
    `  readonly frames: NonEmptyTuple<DecodedFrame<Representation, Asset, Profile>>;`],

  // --- packets and artifacts -----------------------------------------------
  ['a packet stops naming the source that produced it', MD,
    `  readonly source: MediaSourceReference<Source>;
  readonly track: MediaTrackReference<Track>;`,
    `  readonly track: MediaTrackReference<Track>;`],

  ['a packet stops naming its track', MD,
    `  readonly source: MediaSourceReference<Source>;
  readonly track: MediaTrackReference<Track>;`,
    `  readonly source: MediaSourceReference<Source>;`],

  ['a packet loses its sequence and becomes unordered', MD,
    `  readonly sequence: StreamSequence;
  readonly at: MediaTimeCut;`,
    `  readonly at: MediaTimeCut;`],

  ['the artifact manufactures a track roster its packets never had', MD,
    `  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly receipt: ContentAddress<'application/vnd.liteship.media-mux-receipt+cbor'>;`,
    `  readonly tracks: MediaTrackConfiguration;
  readonly receipt: ContentAddress<'application/vnd.liteship.media-mux-receipt+cbor'>;`],

  ['the artifact lets the caller choose its digest', MD,
    `  readonly address: ContentAddress;
  readonly digest: ContentDigest;
}`,
    `  readonly address: ContentAddress;
}`],

  // --- admitted profiles ---------------------------------------------------
  ['decode accepts a bare profile reference', MD,
    `  readonly profile: AdmittedProfile<DecodeProfileReference<Profile>>;
  readonly range: FrameRange | SampleRange;`,
    `  readonly profile: DecodeProfileReference<Profile>;
  readonly range: FrameRange | SampleRange;`],

  ['encode accepts a bare profile reference', MD,
    `  readonly profile: AdmittedProfile<EncodeProfileReference<Profile>>;
  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly input: CaseOf<MediaInput<VideoUnit, AudioUnit>, Tag>;`,
    `  readonly profile: EncodeProfileReference<Profile>;
  readonly tracks: CaseOf<MediaTrackConfiguration<Video, Audio>, Tag>;
  readonly input: CaseOf<MediaInput<VideoUnit, AudioUnit>, Tag>;`],

  ['mux accepts a bare container reference', MD,
    `  readonly container: AdmittedProfile<ContainerProfileReference<Container>>;`,
    `  readonly container: ContainerProfileReference<Container>;`],

  ['an admitted profile carries no admission evidence', MD,
    `export interface AdmittedProfile<Profile> {
  readonly profile: Profile;
  readonly admission: ContentAddress<'application/vnd.liteship.media-admission+cbor'>;
}`,
    `export interface AdmittedProfile<Profile> {
  readonly profile: Profile;
}`],

  // --- analysis ------------------------------------------------------------
  ['an analysis result broadens off its asset revision', MD,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly revision: RevisionReference<Revision>;
  readonly profile: AnalysisProfile<Algorithm>;`,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly revision: RevisionReference;
  readonly profile: AnalysisProfile<Algorithm>;`],

  ['an analysis profile stops naming its parameters', MD,
    `  readonly algorithm: AnalysisAlgorithmReference<Algorithm>;
  readonly parameters: CanonicalValue;
  readonly coordinateSystem: AnalysisCoordinateSystem;`,
    `  readonly algorithm: AnalysisAlgorithmReference<Algorithm>;
  readonly coordinateSystem: AnalysisCoordinateSystem;`],

  ['an analysis result loses its cache identity', MD,
    `  readonly value: MediaAnalysis;
  readonly cache: ContentAddress<'application/vnd.liteship.media-analysis-cache+cbor'>;`,
    `  readonly value: MediaAnalysis;`],

  ['a media event carries a bare analysis payload again', MD,
    `  analysis: { readonly result: MediaAnalysisResult; readonly at: Timecode };`,
    `  analysis: { readonly value: MediaAnalysis; readonly at: Timecode };`],

  // --- export --------------------------------------------------------------
  ['the export request holds the answer it was asking for', MD,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly egress: SceneEgress;
}`,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly egress: SceneEgress;
  readonly disposition: MediaExportDisposition;
}`],

  ['the export request stops naming its subject', MD,
    `  readonly subject: Subject;
  readonly cut: Cut;`,
    `  readonly cut: Cut;`],

  ['the export decision floats free of its request', MD,
    `  readonly request: MediaExportRequest<Subject, Cut, Asset>;
  readonly disposition: MediaExportDisposition<CaptureProfile>;`,
    `  readonly disposition: MediaExportDisposition<CaptureProfile>;`],

  ['host capture presents itself as a fidelity claim', MD,
    `  'host-capture': { readonly profile: CaptureProfile };`,
    `  'host-capture': { readonly profile: CaptureProfile; readonly fidelity: ProjectionFidelity };`],

  ['an unavailable export accepts an empty diagnostic population', MD,
    `  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };
}>;`,
    `  unavailable: {
    readonly diagnostics: readonly Diagnostic[];
    readonly remediation: string;
  };
}>;`],

  // --- the sockets ---------------------------------------------------------
  ['the decoder requirement stops being a typed hole', MD,
    `export type MediaDecoderRequirement = Hole<'liteship.media.decoder', MediaDecoderAuthority>;`,
    `export type MediaDecoderRequirement = MediaDecoderAuthority;`],

  ['the encoder requirement names the decoder contract', MD,
    `export type MediaEncoderRequirement = Hole<'liteship.media.encoder', MediaEncoderAuthority>;`,
    `export type MediaEncoderRequirement = Hole<'liteship.media.encoder', MediaDecoderAuthority>;`],

  ['the mux requirement disappears', MD,
    `export type MediaMuxRequirement = Hole<'liteship.media.mux', MediaMuxAuthority>;`,
    `export type MediaMuxRequirement = Hole<'liteship.media.mux', MediaEncoderAuthority>;`],
];

process.exit(runBank('core-media', M).clean ? 0 : 1);
