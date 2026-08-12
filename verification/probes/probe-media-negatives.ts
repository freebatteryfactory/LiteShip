/**
 * The media fold's negatives, each self-verifying.
 *
 * Every negative sits under its own `@ts-expect-error`, on one line. The
 * directive suppresses only the line that follows it, so a wrapped generic puts
 * the error somewhere else and reads as a passing fixture.
 *
 * These are tripwires, not semantic proof. A directive is satisfied by *any*
 * error on its line, including an unrelated one, so each site below is also
 * covered by a named mutation in the banks. The count here is not a count of
 * proved refusals — the banks are.
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
  MediaRepresentationId,
  MediaSource,
  MediaSourceId,
  MediaTimeCut,
  MediaTrackId,
  PhysicalFrame,
} from './00_core/12_media/types.js';
import type { ToolProfileId, ToolProfileReference } from './01_hosts/server/07_tool/types.js';
import type { RasterProfileId, WebPhysicalFrame } from './01_hosts/web/09_graphics/types.js';
import type { CaptureProfileId, WebCapturedFrame } from './01_hosts/web/12_capture/types.js';

type WorldA = WorldId<'probe.neg.world-a'>;
type WorldB = WorldId<'probe.neg.world-b'>;
type EvidenceA = EvidenceCutId<'probe.neg.evidence-a'>;
type EvidenceB = EvidenceCutId<'probe.neg.evidence-b'>;
type EncodeA = EncodeProfileId<'probe.neg.encode-a'>;
type EncodeB = EncodeProfileId<'probe.neg.encode-b'>;
type ContainerA = ContainerProfileId<'probe.neg.container-a'>;
type AssetA = MediaAssetId<'probe.neg.asset-a'>;
type RepA = MediaRepresentationId<'probe.neg.representation-a'>;
type RepB = MediaRepresentationId<'probe.neg.representation-b'>;
type RasterA = RasterProfileId<'probe.neg.raster-a'>;
type RasterB = RasterProfileId<'probe.neg.raster-b'>;
type CaptureA = CaptureProfileId<'probe.neg.capture-a'>;
type ProfileA = ToolProfileId<'probe.neg.tool-profile-a'>;
type ProfileB = ToolProfileId<'probe.neg.tool-profile-b'>;
type SourceA = MediaSourceId<'probe.neg.source-a'>;
type SourceB = MediaSourceId<'probe.neg.source-b'>;
type TrackA = MediaTrackId<'probe.neg.track-a'>;
type TrackB = MediaTrackId<'probe.neg.track-b'>;

type CutA = SemanticCut<WorldA, RevisionId, EvidenceA, MediaTimeCut>;
type FrameA = MediaFrame<'probe.neg.state-a', CutA>;
type FrameB = MediaFrame<'probe.neg.state-b', CutA>;

// N1. A cut of another world cannot substitute.
declare const cutOtherWorld: SemanticCut<WorldB, RevisionId, EvidenceA, MediaTimeCut>;
// @ts-expect-error — a cut of world B is not a cut of world A
export const n1: CutA = cutOtherWorld;

// N2. Nor can a cut over a different evidence population.
declare const cutOtherEvidence: SemanticCut<WorldA, RevisionId, EvidenceB, MediaTimeCut>;
// @ts-expect-error — a cut over evidence B is not a cut over evidence A
export const n2: CutA = cutOtherEvidence;

// N3. A draft cut cannot satisfy a committed one.
declare const draftCut: DraftSemanticCut<WorldA, RevisionId, EvidenceA, MediaTimeCut>;
// @ts-expect-error — a draft cut is not a committed cut
export const n3: CutA = draftCut;

// N4. And not in the other direction either.
declare const committed: CutA;
// @ts-expect-error — a committed cut is not a draft cut
export const n4: DraftSemanticCut<WorldA, RevisionId, EvidenceA, MediaTimeCut> = committed;

// N5. A commit is exact over its cut, so a commit of another world cannot pass.
declare const commitOtherWorld: import('./00_core/08_state/types.js').Commit<
  SemanticCut<WorldB, RevisionId, EvidenceA, MediaTimeCut>
>;
// @ts-expect-error — the cut travels with the commit; it is not erased at the carrier
export const n5: import('./00_core/08_state/types.js').Commit<CutA> = commitOtherWorld;

// N6. And a runtime commit inherits that exactness.
declare const runtimeOtherWorld: import('./00_core/16_runtime/types.js').RuntimeCommit<
  SemanticCut<WorldB, RevisionId, EvidenceA, MediaTimeCut>
>;
// @ts-expect-error — the exact cut survives the runtime carrier too
export const n6: import('./00_core/16_runtime/types.js').RuntimeCommit<CutA> = runtimeOtherWorld;

// N7. A packet encoded under profile B cannot be reported under profile A.
declare const packetB: MediaPacket<EncodeB, SourceA, TrackA>;
// @ts-expect-error — packets do not change the profile that produced them
export const n7: MediaPacket<EncodeA, SourceA, TrackA> = packetB;

// N8. Nor can a packet of track B stand in for track A.
declare const packetTrackB: MediaPacket<EncodeA, SourceA, TrackB>;
// @ts-expect-error — the track is part of a packet's identity
export const n8: MediaPacket<EncodeA, SourceA, TrackA> = packetTrackB;

// N9. A frame rasterized under profile B is not a frame under profile A.
declare const frameRasterB: WebPhysicalFrame<RepA, FrameA, RasterB>;
// @ts-expect-error — the raster profile is part of the frame's identity
export const n9: WebPhysicalFrame<RepA, FrameA, RasterA> = frameRasterB;

// N10. And a frame realizing semantic frame B is not one realizing frame A.
// This is the correlation the old broad-`MediaFrame` form could not express.
declare const frameOtherSemantic: WebPhysicalFrame<RepA, FrameB, RasterA>;
// @ts-expect-error — pixels realizing another semantic frame are another frame
export const n10: WebPhysicalFrame<RepA, FrameA, RasterA> = frameOtherSemantic;

// N11. A payload of another representation cannot substitute.
declare const frameOtherRep: WebPhysicalFrame<RepB, FrameA, RasterA>;
// @ts-expect-error — representation is part of payload identity
export const n11: WebPhysicalFrame<RepA, FrameA, RasterA> = frameOtherRep;

// N12. A captured frame cannot stand in for a rasterized one.
declare const capturedFrame: WebCapturedFrame<RepA, CutA, CaptureA>;
// @ts-expect-error — host capture is not a rasterization of a semantic frame
export const n12: WebPhysicalFrame<RepA, FrameA, RasterA> = capturedFrame;

// N13. An unclaimed reproducibility result cannot carry a witness.
// @ts-expect-error — the unclaimed arm has no witness member
export type N13 = CaseOf<ReproducibilityClaim<ToolProfileReference<ProfileA>>, 'unclaimed'>['witness'];

// N14. A claim made under profile B does not satisfy the same claim under A.
declare const claimB: ReproducibilityClaim<ToolProfileReference<ProfileB>>;
// @ts-expect-error — a claim is exact over the profile it names
export const n14: ReproducibilityClaim<ToolProfileReference<ProfileA>> = claimB;

// N15. A semantic frame carries no sibling frame coordinate.
// @ts-expect-error — 'frame' is not a member of a semantic frame
export const n15: unknown = ({} as MediaFrame).frame;

// N16. A physical frame carries no coordinate of its own; provenance owns it.
// @ts-expect-error — 'time' retired when provenance took the coordinate
export const n16: unknown = ({} as PhysicalFrame).time;

// N17. A commit no longer carries a sibling result revision.
// @ts-expect-error — 'result' retired when the commit took ownership of its cut
export const n17: unknown = ({} as import('./00_core/08_state/types.js').Commit).result;

// N18. An execution request no longer carries a sibling base revision.
// @ts-expect-error — 'baseRevision' retired in favour of the departure cut
export const n18: unknown = ({} as import('./00_core/16_runtime/types.js').ExecutionRequest).baseRevision;

// N19. A source of another identity cannot substitute.
declare const sourceOtherId: MediaSource<FrameA, SourceB>;
// @ts-expect-error — a source is exact over its own identity
export const n19: MediaSource<FrameA, SourceA> = sourceOtherId;

// N20. And a source of another unit cannot either — the unit survives the
// covariant pull output, which is the only place it could have been proved.
declare const sourceOtherUnit: MediaSource<FrameB, SourceA>;
// @ts-expect-error — a source is exact over the unit it yields
export const n20: MediaSource<FrameA, SourceA> = sourceOtherUnit;

// N21. An encode request cannot take a tuple where a source belongs.
declare const frameTuple: NonEmptyTuple<WebPhysicalFrame<RepA, FrameA, RasterA>>;
// @ts-expect-error — the input is a bounded source, never a materialized tuple
export const n21: CaseOf<import('./00_core/12_media/types.js').MediaInput<WebPhysicalFrame<RepA, FrameA, RasterA>, never>, 'video-only'>['video'] = frameTuple;

// N22. An artifact of container B is not an artifact of container A.
declare const otherContainer: import('./00_core/12_media/types.js').MediaArtifact<
  'video-only',
  AssetA,
  ContainerProfileId<'probe.neg.container-b'>,
  TrackA
>;
// @ts-expect-error — the container is part of the artifact's identity
export const n22: import('./00_core/12_media/types.js').MediaArtifact<'video-only', AssetA, ContainerA, TrackA> = otherContainer;

// N23. A bare profile reference cannot enter a codec operation; admission is required.
declare const bareProfile: import('./00_core/12_media/types.js').EncodeProfileReference<EncodeA>;
// @ts-expect-error — only an admitted profile may enter a core codec operation
export const n23: import('./00_core/12_media/types.js').AdmittedProfile<import('./00_core/12_media/types.js').EncodeProfileReference<EncodeA>> = bareProfile;

// N24. An export request holds no disposition — the decision is a separate product.
// @ts-expect-error — 'disposition' belongs to the decision, not the request
export const n24: unknown = ({} as import('./00_core/12_media/types.js').MediaExportRequest).disposition;

// Referenced so the unused-symbol lane stays quiet about the specimens above.
export type NegativeSpecimens = [Diagnostic, typeof committed];
