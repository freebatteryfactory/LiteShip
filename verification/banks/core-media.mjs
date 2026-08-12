// The core media correction: six README claims that had no types, plus the
// parity triangle the frame model was carrying.
//
// Every mutation restores one piece of what the fold removed. If any survives,
// the README is once again describing a home that does not exist.

import { runBank } from '../harness.mjs';

const MD = '00_core/12_media/types.ts';

const M = [
  // --- the frame owns one coordinate ---------------------------------------
  ['the frame reacquires a sibling frame index', MD,
    `  readonly cut: Cut;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;`,
    `  readonly cut: Cut;
  readonly frame: FrameIndex;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;`],

  ['the frame reacquires a sibling sample range', MD,
    `  readonly cut: Cut;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;`,
    `  readonly cut: Cut;
  readonly samples: SampleRange;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;`],

  ['the frame reacquires a sibling time cut', MD,
    `  readonly cut: Cut;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;`,
    `  readonly cut: Cut;
  readonly time: MediaTimeCut;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;`],

  ['the frame loses its cut for a bare coordinate', MD,
    `  readonly cut: Cut;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;`,
    `  readonly time: MediaTimeCut;
  readonly state: State;
  readonly derivation: SemanticFrameDerivation;`],

  // --- reuse provenance ----------------------------------------------------
  ['semantic reuse stops carrying its unchanged-dependency evidence', MD,
    `  reused: {
    readonly from: MediaTimeCut;
    readonly unchanged: ContentAddress<'application/vnd.liteship.media-reuse-evidence+cbor'>;
  };`,
    `  reused: {
    readonly from: MediaTimeCut;
  };`],

  ['physical rasterization stops naming its semantic frame', MD,
    `  rasterized: { readonly frame: Semantic; readonly profile: Profile };`,
    `  rasterized: { readonly profile: Profile };`],

  ['host capture acquires the semantic frame it never realized', MD,
    `  'host-captured': { readonly composition: Composition; readonly profile: Profile };`,
    `  'host-captured': { readonly composition: Composition; readonly profile: Profile; readonly frame: Semantic };`],

  ['the semantic and physical reuse arms merge into one name', MD,
    `export type SemanticFrameDerivation = Algebra<{
  evaluated: Record<never, never>;`,
    `export type SemanticFrameDerivation = Algebra<{
  rasterized: Record<never, never>;`],

  ['the physical frame keys itself by its payload alone', MD,
    `  readonly payload: Payload;
  readonly payloadAddress: ContentAddress;
  readonly time: MediaTimeCut;`,
    `  readonly payload: Payload;
  readonly payloadAddress: ContentAddress<'application/vnd.liteship.physical-frame+cbor'>;
  readonly time: MediaTimeCut;`],

  ['the physical frame loses its own coordinate', MD,
    `  readonly payloadAddress: ContentAddress;
  readonly time: MediaTimeCut;`,
    `  readonly payloadAddress: ContentAddress;`],

  // --- tracks --------------------------------------------------------------
  ['track configuration collapses into two optional arrays', MD,
    `export type MediaTrackConfiguration = Algebra<{
  'video-only': { readonly video: MediaTrackContract };
  'audio-only': { readonly audio: MediaTrackContract };
  'audio-video': { readonly video: MediaTrackContract; readonly audio: MediaTrackContract };
}>;`,
    `export type MediaTrackConfiguration = Algebra<{
  tracks: { readonly video?: MediaTrackContract; readonly audio?: MediaTrackContract };
}>;`],

  ['the video-only arm quietly admits audio', MD,
    `  'video-only': { readonly video: MediaTrackContract };`,
    `  'video-only': { readonly video: MediaTrackContract; readonly audio: MediaTrackContract };`],

  ['the audio-only arm quietly admits video', MD,
    `  'audio-only': { readonly audio: MediaTrackContract };`,
    `  'audio-only': { readonly audio: MediaTrackContract; readonly video: MediaTrackContract };`],

  // --- packets and artifacts -----------------------------------------------
  ['a packet stops naming the profile that produced it', MD,
    `export interface MediaPacket<Profile extends EncodeProfileId = EncodeProfileId> {
  readonly profile: EncodeProfileReference<Profile>;`,
    `export interface MediaPacket<Profile extends EncodeProfileId = EncodeProfileId> {
  readonly profile: EncodeProfileReference;`],

  ['a packet loses its media coordinate and becomes transport framing', MD,
    `  readonly profile: EncodeProfileReference<Profile>;
  readonly time: MediaTimeCut;
  readonly payload: ContentAddress;
  readonly sync: boolean;`,
    `  readonly profile: EncodeProfileReference<Profile>;
  readonly payload: ContentAddress;
  readonly sync: boolean;`],

  ['the artifact lets the caller choose its digest instead of deriving it', MD,
    `  readonly address: ContentAddress;
  readonly digest: ContentDigest;
}`,
    `  readonly address: ContentAddress;
}`],

  ['the artifact forgets which container produced it', MD,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly container: ContainerProfileReference<Container>;
  readonly tracks: MediaTrackConfiguration;`,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly container: ContainerProfileReference;
  readonly tracks: MediaTrackConfiguration;`],

  // --- encode consumes frames ----------------------------------------------
  ['the encode request goes back to a schema describing frames', MD,
    `  readonly frames: NonEmptyTuple<PhysicalFrame<Payload>>;
}`,
    `  readonly frames: SchemaReference;
}`],

  ['the encode request accepts an empty frame population', MD,
    `  readonly frames: NonEmptyTuple<PhysicalFrame<Payload>>;
}`,
    `  readonly frames: readonly PhysicalFrame<Payload>[];
}`],

  // --- analysis identity ---------------------------------------------------
  ['an analysis result stops naming the asset revision', MD,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly revision: RevisionReference;
  readonly profile: AnalysisProfile<Algorithm>;`,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly profile: AnalysisProfile<Algorithm>;`],

  ['an analysis profile stops naming its parameters', MD,
    `  readonly algorithm: AnalysisAlgorithmReference<Algorithm>;
  readonly parameters: CanonicalValue;
  readonly coordinateSystem: AnalysisCoordinateSystem;`,
    `  readonly algorithm: AnalysisAlgorithmReference<Algorithm>;
  readonly coordinateSystem: AnalysisCoordinateSystem;`],

  ['an analysis profile stops naming its coordinate system', MD,
    `  readonly parameters: CanonicalValue;
  readonly coordinateSystem: AnalysisCoordinateSystem;`,
    `  readonly parameters: CanonicalValue;`],

  ['an analysis result loses its cache identity', MD,
    `  readonly value: MediaAnalysis;
  readonly cache: ContentAddress<'application/vnd.liteship.media-analysis-cache+cbor'>;`,
    `  readonly value: MediaAnalysis;`],

  // --- export disposition --------------------------------------------------
  ['host capture presents itself as a fidelity claim', MD,
    `  'host-capture': { readonly profile: CaptureProfile };`,
    `  'host-capture': { readonly profile: CaptureProfile; readonly fidelity: ProjectionFidelity };`],

  ['an unavailable export goes silent', MD,
    `  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };
}>;

/** One export request and the single disposition it received. */`,
    `  unavailable: Record<never, never>;
}>;

/** One export request and the single disposition it received. */`],

  ['an unavailable export accepts an empty diagnostic population', MD,
    `  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly remediation: string;
  };
}>;

/** One export request and the single disposition it received. */`,
    `  unavailable: {
    readonly diagnostics: readonly Diagnostic[];
    readonly remediation: string;
  };
}>;

/** One export request and the single disposition it received. */`],

  ['an export request loses its disposition', MD,
    `  readonly asset: MediaAssetReference<Asset>;
  readonly disposition: MediaExportDisposition<CaptureProfile>;
}`,
    `  readonly asset: MediaAssetReference<Asset>;
}`],

  // --- the codec requirements ----------------------------------------------
  ['the decoder requirement stops being a typed hole', MD,
    `export type MediaDecoderRequirement = Hole<'liteship.media.decoder', MediaDecoderAuthority>;`,
    `export type MediaDecoderRequirement = MediaDecoderAuthority;`],

  ['the encoder requirement names a different contract than it claims', MD,
    `export type MediaEncoderRequirement = Hole<'liteship.media.encoder', MediaEncoderAuthority>;`,
    `export type MediaEncoderRequirement = Hole<'liteship.media.encoder', MediaDecoderAuthority>;`],
];

process.exit(runBank('core-media', M).clean ? 0 : 1);
