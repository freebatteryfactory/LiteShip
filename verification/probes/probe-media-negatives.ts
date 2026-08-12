/**
 * The media fold's negatives, each self-verifying.
 *
 * Every negative sits under its own `@ts-expect-error`, on one line. The
 * directive suppresses only the line that follows it, so a wrapped generic puts
 * the error somewhere else and reads as a passing fixture — which is how six
 * holes once looked like six proofs. This file is green only while every
 * negative below is still refused, and a directive that stops being needed
 * names its own site instead of silently moving a total.
 *
 * Expected: COMPILES.
 */

import type { CaseOf, NonEmptyTuple } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { EvidenceCutId, ReproducibilityClaim } from './00_core/06_evidence/types.js';
import type { DraftSemanticCut, SemanticCut } from './00_core/08_state/types.js';
import type { RevisionId, WorldId } from './00_core/02_identity/types.js';
import type {
  ContainerProfileId,
  EncodeProfileId,
  MediaAssetId,
  MediaFrame,
  MediaPacket,
} from './00_core/12_media/types.js';
import type { ServerEncodedChunk } from './01_hosts/server/04_network/types.js';
import type { ToolProfileId, ToolProfileReference } from './01_hosts/server/07_tool/types.js';
import type { WebEncodeRequest } from './01_hosts/web/08_media/types.js';
import type { RasterProfileId, WebPhysicalFrame } from './01_hosts/web/09_graphics/types.js';
import type { CapturedFrame, CaptureProfileId } from './01_hosts/web/12_capture/types.js';

type WorldA = WorldId<'probe.neg.world-a'>;
type WorldB = WorldId<'probe.neg.world-b'>;
type EvidenceA = EvidenceCutId<'probe.neg.evidence-a'>;
type EvidenceB = EvidenceCutId<'probe.neg.evidence-b'>;
type EncodeA = EncodeProfileId<'probe.neg.encode-a'>;
type EncodeB = EncodeProfileId<'probe.neg.encode-b'>;
type ContainerA = ContainerProfileId<'probe.neg.container-a'>;
type AssetA = MediaAssetId<'probe.neg.asset-a'>;
type RasterA = RasterProfileId<'probe.neg.raster-a'>;
type RasterB = RasterProfileId<'probe.neg.raster-b'>;
type CaptureA = CaptureProfileId<'probe.neg.capture-a'>;
type ProfileA = ToolProfileId<'probe.neg.tool-profile-a'>;
type ProfileB = ToolProfileId<'probe.neg.tool-profile-b'>;

type CutA = SemanticCut<WorldA, RevisionId, EvidenceA>;
type CutOtherWorld = SemanticCut<WorldB, RevisionId, EvidenceA>;
type CutOtherEvidence = SemanticCut<WorldA, RevisionId, EvidenceB>;

// N1. A cut of another world cannot substitute. The world axis is the one a
// revision reference cannot imply, so it is the one most easily dropped.
declare const cutOtherWorld: CutOtherWorld;
// @ts-expect-error — a cut of world B is not a cut of world A
export const n1: CutA = cutOtherWorld;

// N2. Nor can a cut over a different evidence population. Two evaluations that
// saw different worlds did not happen at the same coordinate.
declare const cutOtherEvidence: CutOtherEvidence;
// @ts-expect-error — a cut over evidence B is not a cut over evidence A
export const n2: CutA = cutOtherEvidence;

// N3. A draft cut cannot satisfy a committed one. This is what keeps preview
// output out of a production slot.
declare const draftCut: DraftSemanticCut<WorldA, RevisionId, EvidenceA>;
// @ts-expect-error — a draft cut is not a committed cut
export const n3: CutA = draftCut;

// N4. And not in the other direction either, so nothing can launder a commit
// into a preview to dodge a publication check.
declare const committed: CutA;
// @ts-expect-error — a committed cut is not a draft cut
export const n4: DraftSemanticCut<WorldA, RevisionId, EvidenceA> = committed;

// N5. A network chunk cannot satisfy a media packet. The two are both bytes
// with metadata; only their members keep them apart.
declare const networkChunk: ServerEncodedChunk;
// @ts-expect-error — transport framing is not an encoded media packet
export const n5: MediaPacket<EncodeA> = networkChunk;

// N6. A packet encoded under profile B cannot be reported under profile A.
declare const packetB: MediaPacket<EncodeB>;
// @ts-expect-error — packets do not change the profile that produced them
export const n6: MediaPacket<EncodeA> = packetB;

// N7. An encode cannot be satisfied with an empty frame population. Zero frames
// becoming a successful video is the predecessor's shipped failure.
declare const noFrames: readonly WebPhysicalFrame<RasterA>[];
// @ts-expect-error — an encode requires at least one real frame
export const n7: WebEncodeRequest<EncodeA, WebPhysicalFrame<RasterA>>['frames'] = noFrames;

// N8. A frame rasterized under profile B is not a frame under profile A, so a
// reused raster cannot silently change the profile it claims.
declare const frameRasterB: WebPhysicalFrame<RasterB>;
// @ts-expect-error — the raster profile is part of the frame's identity
export const n8: WebPhysicalFrame<RasterA> = frameRasterB;

// N9. A captured frame cannot stand in for a rasterized one. This is the law
// that stops a screenshot from being offered as evidence of a faithful
// semantic projection.
declare const capturedFrame: CapturedFrame<CaptureA>;
// @ts-expect-error — host capture is not a rasterization of a semantic frame
export const n9: WebPhysicalFrame<RasterA> = capturedFrame;

// N10. An unclaimed reproducibility result cannot carry a witness. This is how
// "we did not measure" would have become "we measured, and it holds".
//
// Written as an indexed access rather than an object literal: a literal assigned
// to a union passes excess-property checking whenever the extra member exists on
// some other arm, and `witness` exists on two of them. The first draft of this
// negative used `as never` and silenced itself, which the one-line convention is
// exactly what caught.
// @ts-expect-error — the unclaimed arm has no witness member
export type N10 = CaseOf<ReproducibilityClaim<ToolProfileReference<ProfileA>>, 'unclaimed'>['witness'];

// N11. A claim made under profile B does not satisfy the same claim under A.
declare const claimB: ReproducibilityClaim<ToolProfileReference<ProfileB>>;
// @ts-expect-error — a claim is exact over the profile it names
export const n11: ReproducibilityClaim<ToolProfileReference<ProfileA>> = claimB;

// N12. A semantic frame cannot carry a sibling frame coordinate. Its return is
// the parity triangle this fold removed.
declare const frameWithSibling: MediaFrame & { readonly frame: unknown };
// @ts-expect-error — 'frame' is not a member of a semantic frame
export const n12: unknown = ({} as MediaFrame).frame;

// N13. A commit no longer carries a sibling result revision.
// @ts-expect-error — 'result' retired when the commit took ownership of its cut
export const n13: unknown = ({} as import('./00_core/08_state/types.js').Commit).result;

// N14. An execution request no longer carries a sibling base revision.
// @ts-expect-error — 'baseRevision' retired in favour of the departure cut
export const n14: unknown = ({} as import('./00_core/16_runtime/types.js').ExecutionRequest).baseRevision;

// N15. An artifact of container B is not an artifact of container A, so a mux
// claim cannot travel between containers.
declare const otherContainer: import('./00_core/12_media/types.js').MediaArtifact<
  AssetA,
  ContainerProfileId<'probe.neg.container-b'>
>;
// @ts-expect-error — the container is part of the artifact's identity
export const n15: import('./00_core/12_media/types.js').MediaArtifact<AssetA, ContainerA> = otherContainer;

// Referenced so the unused-symbol lane stays quiet about the specimens above.
export type NegativeSpecimens = [Diagnostic, NonEmptyTuple<Diagnostic>, typeof frameWithSibling, typeof committed];
