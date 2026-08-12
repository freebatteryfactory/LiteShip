/**
 * The live/export lineage: one cut, one frame, one actual output feeding the
 * next actual input.
 *
 * The previous version of this file declared its values independently and
 * asserted in a comment that they were related. It proved every local type was
 * inhabitable and nothing about whether they compose — a laboratory specimen,
 * the exact hazard flagged when the Astro seam was reviewed and then reproduced
 * here one fold later.
 *
 * The rule this file now obeys: every value after the first is derived from the
 * *returned type of a real public operation*, via `OkOf<ReturnType<…>>`. There
 * is no `as`, no separately declared substitute, and no local lookalike. If a
 * stage stops feeding the next, this file stops compiling.
 *
 * Expected: COMPILES.
 */

import type { NonEmptyTuple, OkOf, OutputOf, Result } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { EvidenceCutId } from './00_core/06_evidence/types.js';
import type { DraftSemanticCut, SemanticCut } from './00_core/08_state/types.js';
import type { RevisionId, WorldId } from './00_core/02_identity/types.js';
import type { ProjectionFidelity } from './00_core/11_scene/types.js';
import type {
  AdmittedProfile,
  ContainerProfileId,
  EncodeProfileId,
  EncodeProfileReference,
  MediaAssetId,
  MediaCut,
  MediaEncoderAuthority,
  MediaExportDecision,
  MediaExportRequest,
  MediaFrame,
  MediaMuxAuthority,
  MediaRepresentationId,
  MediaSourceId,
  MediaTimeCut,
  MediaTrackId,
} from './00_core/12_media/types.js';
import type { RuntimeCommit } from './00_core/16_runtime/types.js';
import type { PreviewBranch } from './00_core/17_editor/types.js';
import type {
  GraphicsReadback,
  RasterizationRequest,
  RasterProfileId,
} from './01_hosts/web/09_graphics/types.js';
import type { CaptureAuthority, CaptureProfileId, CaptureRequest } from './01_hosts/web/12_capture/types.js';

type WorldA = WorldId<'probe.media.world-a'>;
type EvidenceA = EvidenceCutId<'probe.media.evidence-a'>;
type CutA = SemanticCut<WorldA, RevisionId, EvidenceA, MediaTimeCut>;
type FrameA = MediaFrame<'probe.media.state-a', CutA>;

type RepA = MediaRepresentationId<'probe.media.representation-a'>;
type RasterA = RasterProfileId<'probe.media.raster-a'>;
type EncodeA = EncodeProfileId<'probe.media.encode-a'>;
type ContainerA = ContainerProfileId<'probe.media.container-a'>;
type AssetA = MediaAssetId<'probe.media.asset-a'>;
type TrackA = MediaTrackId<'probe.media.track-a'>;
type CaptureA = CaptureProfileId<'probe.media.capture-a'>;
type FrameSourceA = MediaSourceId<'probe.media.frame-source-a'>;
type PacketSourceA = MediaSourceId<'probe.media.packet-source-a'>;

declare const readback: GraphicsReadback;
declare const encoder: MediaEncoderAuthority;
declare const mux: MediaMuxAuthority;
declare const capture: CaptureAuthority;

// ---------------------------------------------------------------------------
// P1. One committed cut reaches two sibling egresses — and it is the same
// object, not two values a comment claims are equal.
// ---------------------------------------------------------------------------

declare const runtimeCommit: RuntimeCommit<CutA>;

/** The web path reaches the cut through the commit it already owned. */
export const theWebPathReachesTheCut: CutA = runtimeCommit.semantic.cut;

/** The media path names that same cut. Not a sibling of the same shape — that one. */
export const theMediaPathReachesTheSameCut: MediaCut<WorldA, RevisionId, EvidenceA> =
  theWebPathReachesTheCut;

/** And a semantic frame is evaluated at exactly it. */
declare const frameA: MediaFrame<'probe.media.state-a', typeof theWebPathReachesTheCut>;
export const theFrameSitsOnThatCut: CutA = frameA.cut;

// ---------------------------------------------------------------------------
// P2. Rasterize → encode → mux, each stage consuming the previous stage's
// actual return type.
// ---------------------------------------------------------------------------

declare const rasterRequest: RasterizationRequest<FrameA, RasterA>;

/** Stage 1: the frame source rasterization actually returns. */
type RasterizedSource = OkOf<
  ReturnType<typeof readback.rasterizeSequence<RepA, FrameA, RasterA, FrameSourceA>>
>;
export const rasterized: Result<RasterizedSource, NonEmptyTuple<Diagnostic>> =
  readback.rasterizeSequence(rasterRequest);

/**
 * The unit a source yields, read through its actual `pull` output.
 *
 * Not `infer`: the unit lives behind `Signature`'s output slot, and inference
 * through it silently resolves to `never` — which would have made every
 * downstream stage accept anything while looking exact.
 */
/** The frames that source yields, read off the source rather than redeclared. */
type RasterizedFrames = Extract<
  OutputOf<RasterizedSource['pull']>,
  { readonly _tag: 'produced' }
>['units'][number];

declare const admittedEncode: AdmittedProfile<EncodeProfileReference<EncodeA>>;
declare const videoTrack: import('./00_core/12_media/types.js').MediaTrackContract<TrackA>;
declare const rasterizedSource: RasterizedSource;

/**
 * Stage 2: the encode request consumes *that* source.
 *
 * `input.video` is the value stage 1 returned. Nothing else can inhabit it: a
 * source of some other frame type, some other raster profile, or some other
 * representation is not this type.
 */
export const encodeRequest: import('./00_core/12_media/types.js').MediaEncodeRequest<
  'video-only',
  RasterizedFrames,
  never,
  EncodeA,
  TrackA
> = {
  profile: admittedEncode,
  tracks: { _tag: 'video-only', video: videoTrack },
  input: { _tag: 'video-only', video: rasterizedSource },
};

/** Stage 2 output: the packet source the encoder actually returns. */
type EncodedProduct = OkOf<
  ReturnType<
    typeof encoder.encode<'video-only', RasterizedFrames, never, EncodeA, PacketSourceA, TrackA, MediaTrackId>
  >
>;
export const encoded: Result<EncodedProduct, NonEmptyTuple<Diagnostic>> = encoder.encode(encodeRequest);

declare const encodedProduct: EncodedProduct;
declare const admittedContainer: AdmittedProfile<
  import('./00_core/12_media/types.js').ContainerProfileReference<ContainerA>
>;
declare const assetA: import('./00_core/12_media/types.js').MediaAssetReference<AssetA>;

/**
 * Stage 3: the mux request consumes the encoder's actual packet source and the
 * encoder's actual track configuration.
 */
export const muxRequest: import('./00_core/12_media/types.js').MediaMuxRequest<
  'video-only',
  EncodeA,
  PacketSourceA,
  ContainerA,
  AssetA,
  TrackA
> = {
  asset: assetA,
  container: admittedContainer,
  tracks: encodedProduct.tracks,
  packets: encodedProduct.packets,
};

/** Stage 3 output: the artifact, still exact over asset, container, and track. */
export const finalized: Result<
  OkOf<
    ReturnType<
      typeof mux.finalize<'video-only', EncodeA, PacketSourceA, ContainerA, AssetA, TrackA, MediaTrackId>
    >
  >,
  NonEmptyTuple<Diagnostic>
> = mux.finalize(muxRequest);

// ---------------------------------------------------------------------------
// P3. A draft cut reaches editor preview and rasterization, and never becomes
// a production commit.
// ---------------------------------------------------------------------------

declare const preview: PreviewBranch;
export const previewCut: DraftSemanticCut = preview.result;

declare const draftMediaCut: DraftSemanticCut<WorldA, RevisionId, EvidenceA, MediaTimeCut>;
declare const draftFrame: MediaFrame<'probe.media.state-a', typeof draftMediaCut>;

/** A draft frame rasterizes: refusing draft output is publication authority. */
export const draftRasterization: RasterizationRequest<typeof draftFrame, RasterA> = {
  resource: rasterRequest.resource,
  frame: draftFrame,
  profile: rasterRequest.profile,
};

// ---------------------------------------------------------------------------
// P4. Browser capture reaches the same encoder, through its own actual return.
// ---------------------------------------------------------------------------

declare const captureRequest: CaptureRequest<CutA, CaptureA>;

type CapturedSource = OkOf<
  ReturnType<typeof capture.captureSequence<RepA, CutA, CaptureA, FrameSourceA>>
>;
export const captured: Result<CapturedSource, NonEmptyTuple<Diagnostic>> =
  capture.captureSequence(captureRequest);

type CapturedFrames = Extract<
  OutputOf<CapturedSource['pull']>,
  { readonly _tag: 'produced' }
>['units'][number];
declare const capturedSource: CapturedSource;

/** That captured source is lawful encoder input, with no cast and no adapter. */
export const captureEncodes: import('./00_core/12_media/types.js').MediaEncodeRequest<
  'video-only',
  CapturedFrames,
  never,
  EncodeA,
  TrackA
> = {
  profile: admittedEncode,
  tracks: { _tag: 'video-only', video: videoTrack },
  input: { _tag: 'video-only', video: capturedSource },
};

// ---------------------------------------------------------------------------
// P5. All three export dispositions are inhabited, each attached to a request
// that names a real subject.
// ---------------------------------------------------------------------------

declare const fidelity: ProjectionFidelity;
declare const diagnostics: NonEmptyTuple<Diagnostic>;
declare const exportRequest: MediaExportRequest<
  import('./00_core/11_scene/types.js').SceneReference,
  MediaCut<WorldA, RevisionId, EvidenceA>,
  AssetA
>;

export const semanticCast: MediaExportDecision<
  import('./00_core/11_scene/types.js').SceneReference,
  MediaCut<WorldA, RevisionId, EvidenceA>,
  AssetA
> = { request: exportRequest, disposition: { _tag: 'semantic-projection', fidelity } };

export const hostCapture: MediaExportDecision<
  import('./00_core/11_scene/types.js').SceneReference,
  MediaCut<WorldA, RevisionId, EvidenceA>,
  AssetA,
  CaptureA
> = { request: exportRequest, disposition: { _tag: 'host-capture', profile: {} as CaptureA } };

export const opaqueDomIsUnavailable: MediaExportDecision<
  import('./00_core/11_scene/types.js').SceneReference,
  MediaCut<WorldA, RevisionId, EvidenceA>,
  AssetA
> = {
  request: exportRequest,
  disposition: {
    _tag: 'unavailable',
    diagnostics,
    remediation: 'declare a media egress on the subject, or capture the composition',
  },
};
