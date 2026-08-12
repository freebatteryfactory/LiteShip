/**
 * The live/export join: one cut, sibling egresses, exact provenance.
 *
 * Everything here is a relationship the architecture must keep legal, and each
 * one crosses a home boundary that no single home could have proved. Before
 * this file compiled, the media fold was approved and unproven — the same
 * position the Astro/Vite seam was in before its binding probe existed.
 *
 * Expected: COMPILES.
 */

import type { NonEmptyTuple, Result } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { EvidenceCutId } from './00_core/06_evidence/types.js';
import type { DraftSemanticCut, SemanticCut } from './00_core/08_state/types.js';
import type { RevisionId, WorldId } from './00_core/02_identity/types.js';
import type { ProjectionFidelity } from './00_core/11_scene/types.js';
import type {
  ContainerProfileId,
  EncodeProfileId,
  MediaAssetId,
  MediaCut,
  MediaExportDisposition,
  MediaExportRequest,
  MediaFrame,
  MediaTimeCut,
  PhysicalFrame,
} from './00_core/12_media/types.js';
import type { RuntimeCommit } from './00_core/16_runtime/types.js';
import type { PreviewBranch } from './00_core/17_editor/types.js';
import type {
  WebEncodeProduct,
  WebEncodeRequest,
  WebEncoderAuthority,
  WebMuxAuthority,
  WebMuxProduct,
  WebMuxRequest,
} from './01_hosts/web/08_media/types.js';
import type {
  GraphicsReadback,
  RasterizationRequest,
  RasterProfileId,
  WebPhysicalFrame,
} from './01_hosts/web/09_graphics/types.js';
import type {
  CaptureAuthority,
  CapturedFrame,
  CaptureProfileId,
  CaptureRequest,
} from './01_hosts/web/12_capture/types.js';

type WorldA = WorldId<'probe.media.world-a'>;
type EvidenceA = EvidenceCutId<'probe.media.evidence-a'>;
type RasterA = RasterProfileId<'probe.media.raster-a'>;
type EncodeA = EncodeProfileId<'probe.media.encode-a'>;
type ContainerA = ContainerProfileId<'probe.media.container-a'>;
type AssetA = MediaAssetId<'probe.media.asset-a'>;
type CaptureA = CaptureProfileId<'probe.media.capture-a'>;

declare const readback: GraphicsReadback;
declare const encoder: WebEncoderAuthority;
declare const mux: WebMuxAuthority;
declare const capture: CaptureAuthority;

// ---------------------------------------------------------------------------
// P1. One committed cut reaches two sibling egresses.
//
// The web presentation path and the semantic media path both name the same
// object. Neither derives from the other, and neither assembles a coordinate of
// its own — which is the whole content of "live and export share meaning and
// time, not one physical renderer".
// ---------------------------------------------------------------------------

declare const committedCut: SemanticCut<WorldA, RevisionId, EvidenceA>;
declare const runtimeCommit: RuntimeCommit;

/** The residual web path reaches the cut through the commit it already owned. */
export const theWebPathReachesTheCut: SemanticCut = runtimeCommit.semantic.cut;

/** The media path names the same cut, refined to a media time coordinate. */
declare const mediaCut: MediaCut<WorldA, RevisionId, EvidenceA>;
export const theMediaPathReachesTheCut: MediaCut<WorldA, RevisionId, EvidenceA> = mediaCut;

/** Both are cuts of the same world and evidence population. */
export const bothSpeakOneWorld: WorldA = committedCut.world.id;

// ---------------------------------------------------------------------------
// P2. Rasterize → encode → mux, across three homes, with no cast.
//
// `08_media` sits above `09_graphics` and cannot name its payload type. The
// frames still travel without erasure because the encode request is generic
// over the frame, and this file is the composition point that imports both.
// ---------------------------------------------------------------------------

declare const semanticFrame: MediaFrame;
declare const rasterRequest: RasterizationRequest<RasterA>;

/** Rasterization yields a frame that names the exact profile it was drawn under. */
export const rasterized: Result<WebPhysicalFrame<RasterA>, NonEmptyTuple<Diagnostic>> =
  readback.rasterize(rasterRequest);

/** A graphics frame is a lawful physical frame for the media home. */
declare const graphicsFrames: NonEmptyTuple<WebPhysicalFrame<RasterA>>;
export const encodeRequest: WebEncodeRequest<EncodeA, WebPhysicalFrame<RasterA>> = {
  profile: {} as WebEncodeRequest<EncodeA, WebPhysicalFrame<RasterA>>['profile'],
  tracks: {} as WebEncodeRequest<EncodeA, WebPhysicalFrame<RasterA>>['tracks'],
  frames: graphicsFrames,
};

/** Encoding preserves both the profile and the exact frame type it consumed. */
export const encoded: Result<
  WebEncodeProduct<EncodeA, WebPhysicalFrame<RasterA>>,
  NonEmptyTuple<Diagnostic>
> = encoder.encode(encodeRequest);

/** Muxing those packets yields the artifact, exact over asset and container. */
declare const muxRequest: WebMuxRequest<EncodeA, ContainerA, AssetA>;
export const finalized: Result<WebMuxProduct<ContainerA, AssetA>, NonEmptyTuple<Diagnostic>> =
  mux.finalize(muxRequest);

// ---------------------------------------------------------------------------
// P3. A draft cut reaches editor preview and rasterization, and never becomes
// a production commit.
//
// This is the case my first draft of the capture law would have made illegal.
// Preview must be able to draw a counterfactual; what it must not do is produce
// a runtime commit.
// ---------------------------------------------------------------------------

declare const preview: PreviewBranch;

/** The preview's result is a draft cut, carrying a full coordinate. */
export const previewCut: DraftSemanticCut = preview.result;

/**
 * A frame over a draft cut is a lawful media frame — the editor is not a second
 * program. The draft cut is specialized to the media time coordinate for the
 * same reason the committed one is: a media frame is exact over a frame/sample
 * position, and a draft that spoke only the generic time cut would be a preview
 * of a moment no encoder could locate.
 */
declare const draftMediaCut: DraftSemanticCut<WorldA, RevisionId, EvidenceA, MediaTimeCut>;
declare const draftFrame: MediaFrame<unknown, typeof draftMediaCut>;
export const aDraftFrameIsAFrame: MediaFrame<unknown, typeof draftMediaCut> = draftFrame;

/** And it rasterizes, because refusing draft output is publication authority. */
export const draftRasterization: RasterizationRequest<RasterA> = {
  resource: rasterRequest.resource,
  frame: draftFrame,
  profile: rasterRequest.profile,
};

// ---------------------------------------------------------------------------
// P4. Browser-composite capture reaches the same encoder.
//
// Capture and rasterization produce the same envelope and make different
// claims. Both are lawful encoder input; only one is a projection claim.
// ---------------------------------------------------------------------------

declare const captureRequest: CaptureRequest<CaptureA>;
export const captured: Result<CapturedFrame<CaptureA>, NonEmptyTuple<Diagnostic>> =
  capture.capture(captureRequest);

declare const capturedFrames: NonEmptyTuple<CapturedFrame<CaptureA>>;
export const captureEncodes: WebEncodeRequest<EncodeA, CapturedFrame<CaptureA>> = {
  profile: encodeRequest.profile,
  tracks: encodeRequest.tracks,
  frames: capturedFrames,
};

/** Both provenances inhabit the one physical-frame contract. */
export const bothArePhysicalFrames: readonly PhysicalFrame[] = [
  ...graphicsFrames,
  ...capturedFrames,
];

// ---------------------------------------------------------------------------
// P5. All three export dispositions are inhabited, including the honest
// refusal for opaque DOM.
//
// The unavailable arm is the one that matters. A page region with no declared
// media projection must be describable as exactly that — not omitted, not
// represented by an empty frame, and not quietly answered with a screenshot.
// ---------------------------------------------------------------------------

declare const fidelity: ProjectionFidelity;
declare const diagnostics: NonEmptyTuple<Diagnostic>;

export const semanticCast: MediaExportDisposition = {
  _tag: 'semantic-projection',
  fidelity,
} as MediaExportDisposition;

export const hostCapture: MediaExportDisposition<CaptureA> = {
  _tag: 'host-capture',
  profile: {} as CaptureA,
} as MediaExportDisposition<CaptureA>;

export const opaqueDomIsUnavailable: MediaExportDisposition = {
  _tag: 'unavailable',
  diagnostics,
  remediation: 'declare a media egress on the subject, or capture the composition',
} as MediaExportDisposition;

/** Every export request carries exactly one of them. */
declare const exportRequest: MediaExportRequest<AssetA, CaptureA>;
export const oneDisposition: MediaExportDisposition<CaptureA> = exportRequest.disposition;
