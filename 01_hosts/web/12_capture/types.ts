/**
 * Browser-composite capture: pixels from a committed physical composition.
 *
 * This home turns a committed browser surface into a physical frame. It exists
 * because the composition a browser paints is not reachable any other way: a
 * page may contain DOM text, native layout, form controls, images, canvas,
 * WebGL, video, and foreign regions, and no standard operation draws an
 * arbitrary element into a canvas. `CanvasImageSource` admits images, video,
 * canvas, `ImageBitmap`, `OffscreenCanvas`, and `VideoFrame` — never a generic
 * element.
 *
 * It is deliberately late in the waterfall. It composes authorities that are
 * already closed — the projection commit, the region boundary, graphics
 * resources — and becomes the parent of none of them. Gathering physical
 * outputs after they have been lawfully committed is the only shape that
 * reaches across this many homes without acquiring authority over any.
 *
 * Capture is not rasterization. A rasterized frame says "these pixels realize
 * this exact semantic frame under this raster profile" and is evidence that a
 * subject had a faithful projection. A capture says "these pixels came off this
 * committed composition under this capture profile" and is evidence of nothing
 * beyond itself. Both produce a physical frame; only one is a projection claim.
 *
 * It owns no scene evaluation, no rasterization, no codec, no media format, no
 * region custody, no DOM mutation, and no screen-capture protocol detail as
 * semantic truth.
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
  Result,
  Signature,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type { MediaFrame, PhysicalFrame } from '../../../00_core/12_media/types.js';
import type {
  GroundingId,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';
import type { RegionBoundary } from '../01_region/types.js';
import type { ProjectionCommit } from '../04_projection/types.js';
import type { GraphicsResourceReference } from '../09_graphics/types.js';

export type CaptureProfileId<Name extends string = string> = Brand<
  Name,
  'liteship.web.capture-profile-id'
>;
export type CaptureProfileReference<Id extends CaptureProfileId = CaptureProfileId> = Reference<
  'web-capture-profile',
  Id
>;

/**
 * Whether this browser will capture at all, and under what terms.
 *
 * Screen Capture requires the user to choose a surface and grant permission per
 * session. That makes availability an evidence question answered at runtime,
 * not a static capability — and it is why capture can never stand in for a
 * portable headless renderer.
 */
export type CaptureAvailability = Algebra<{
  available: {
    readonly configuration: ContentAddress<'application/vnd.liteship.web-capture-configuration+cbor'>;
  };
  'permission-required': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * Everything physical that decided what a captured composition looks like.
 *
 * The claim carried here is normally `unclaimed`. A browser composite depends
 * on the user's surface selection, compositor, device pixel ratio, and whatever
 * else the window manager was doing, and asserting reproducibility over that
 * would be a promise about someone else's desktop.
 */
export interface CaptureProfile<Id extends CaptureProfileId = CaptureProfileId> {
  readonly id: CaptureProfileReference<Id>;
  readonly configuration: ContentAddress<'application/vnd.liteship.web-capture-profile+cbor'>;
  readonly reproducibility: ReproducibilityClaim<CaptureProfileReference<Id>>;
}

/** The browser's captured payload — composite pixels, addressed. */
export interface CapturePayload {
  readonly bytes: ContentAddress;
}

/**
 * The committed physical composition a capture came from.
 *
 * A projection commit and a region boundary, because "which pixels" is two
 * questions: which committed state, and which part of the page. Neither alone
 * identifies a composition.
 */
export interface CapturedComposition {
  readonly commit: ProjectionCommit;
  readonly boundary: RegionBoundary;
}

/** One captured frame: host-captured provenance, never rasterized. */
export type CapturedFrame<Profile extends CaptureProfileId = CaptureProfileId> = PhysicalFrame<
  CapturePayload,
  never,
  CaptureProfileReference<Profile>,
  CapturedComposition
>;

/**
 * A request to capture one committed composition.
 *
 * The commit is required and cannot be a draft. A preview may be rasterized —
 * that is the editor working — but pixels claimed off an uncommitted page are
 * a claim about a state the application never reached.
 *
 * A graphics resource may be named when the composition includes one, so the
 * capture can say which surfaces participated. Naming it does not make this a
 * readback; the pixels still come off the composite.
 */
export interface CaptureRequest<Profile extends CaptureProfileId = CaptureProfileId> {
  readonly composition: CapturedComposition;
  readonly profile: CaptureProfile<Profile>;
  readonly surfaces: readonly GraphicsResourceReference[];
}

/**
 * The capture authority: availability first, then pixels.
 *
 * Availability is a separate operation because permission is a runtime fact
 * that changes between sessions, and a provider that answered it by throwing
 * would make refusal indistinguishable from failure.
 */
export interface CaptureAuthority {
  readonly availability: Signature<
    CaptureProfileReference,
    CaptureAvailability,
    NonEmptyTuple<Diagnostic>
  >;
  readonly capture: <Profile extends CaptureProfileId>(
    request: CaptureRequest<Profile>,
  ) => Result<CapturedFrame<Profile>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

export type CaptureAuthorityRequirement = Hole<'liteship.web.capture-authority', CaptureAuthority>;

/** Grounding the capture facility over an already-committed projection path. */
export interface CaptureAuthorityGrounding
  extends WebGroundingDefinition<
    readonly [CaptureAuthorityRequirement],
    unknown,
    'intrinsic',
    'owned'
  > {
  readonly id: GroundingId<'liteship.web.grounding.capture-authority'>;
}

/** Constructing the capture provider. */
export interface CaptureAuthorityOffer
  extends WebRealizationOffer<
    readonly [CaptureAuthorityRequirement],
    readonly [],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.capture-authority'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// That a captured composition genuinely contains what the page displayed is a
// runtime claim no type can express. What is bound here is the altitude: a
// capture names a committed composition, carries capture provenance, and cannot
// present itself as evidence of a faithful semantic projection.
// ---------------------------------------------------------------------------

type CaptureLawProfileA = CaptureProfileId<'liteship.web.capture.law.profile-a'>;
type CaptureLawProfileB = CaptureProfileId<'liteship.web.capture.law.profile-b'>;

/**
 * Compile-time law: a capture names a committed composition.
 *
 * The projection commit is what makes the pixels correspond to a state the
 * application actually reached. Its removal would make capture legal against a
 * page mid-write.
 */
export type ACaptureNamesACommittedComposition = Assert<
  Equal<
    [
      CaptureRequest<CaptureLawProfileA>['composition'] extends CapturedComposition ? true : false,
      CapturedComposition['commit'] extends ProjectionCommit ? true : false,
      CapturedComposition['boundary'] extends RegionBoundary ? true : false,
    ],
    [true, true, true]
  >
>;

/**
 * Compile-time law: a captured frame carries host-captured provenance and can
 * never carry rasterized provenance.
 *
 * The semantic-frame parameter is `never` precisely so no capture can claim to
 * realize one. A capture that could name a semantic frame would be admissible
 * everywhere a rasterization is, and the distinction between "this is what the
 * scene means" and "this is what the browser drew" would stop existing.
 */
export type ACapturedFrameCannotClaimASemanticFrame = Assert<
  Equal<
    [
      // Read the rasterized arm's own member rather than testing the whole
      // derivation union against one arm's shape. That test is false for any
      // union and stays false with the semantic parameter fully restored — it
      // passes while proving nothing, which is what the first draft of this law
      // did. `never` here is the whole guarantee: the rasterized arm exists in
      // the algebra but is uninhabitable for a capture.
      CaseOf<CapturedFrame<CaptureLawProfileA>['derivation'], 'rasterized'>['frame'],
      CaseOf<CapturedFrame<CaptureLawProfileA>['derivation'], 'reused'>['frame'],
      MediaFrame extends CaseOf<
        CapturedFrame<CaptureLawProfileA>['derivation'],
        'rasterized'
      >['frame']
        ? true
        : false,
      'composition' extends keyof CaseOf<
        CapturedFrame<CaptureLawProfileA>['derivation'],
        'host-captured'
      >
        ? true
        : false,
      CapturedFrame<CaptureLawProfileB> extends CapturedFrame<CaptureLawProfileA> ? true : false,
    ],
    [never, never, false, true, false]
  >
>;

/**
 * Compile-time law: availability is a three-arm answer, and refusal says why.
 *
 * Permission-required and unavailable are different outcomes with different
 * remediations — one is "ask the user again", the other is not.
 */
export type CaptureAvailabilityIsAnsweredNotAssumed = Assert<
  Equal<
    [
      TagOf<CaptureAvailability>,
      CaseOf<CaptureAvailability, 'permission-required'>['diagnostics'] extends NonEmptyTuple<Diagnostic>
        ? true
        : false,
      CaseOf<CaptureAvailability, 'unavailable'>['diagnostics'] extends NonEmptyTuple<Diagnostic>
        ? true
        : false,
    ],
    ['available' | 'permission-required' | 'unavailable', true, true]
  >
>;

/**
 * Compile-time law: capture decides nothing about encoding, and holds no
 * scene or media model of its own.
 */
export type CaptureCarriesNoCodecOrSceneAuthority = Assert<
  Equal<
    [
      'codec' extends keyof CaptureRequest ? true : false,
      'container' extends keyof CaptureRequest ? true : false,
      'scene' extends keyof CaptureRequest ? true : false,
      'frame' extends keyof CaptureRequest ? true : false,
    ],
    [false, false, false, false]
  >
>;

/**
 * Compile-time law: a capture profile's reproducibility claim is exact over its
 * own reference, and the full grammar remains available so `unclaimed` is
 * sayable.
 */
export type ACaptureProfileClaimsOnlyWhatItCanShow = Assert<
  Equal<
    [
      CaptureProfile<CaptureLawProfileA>['reproducibility'] extends ReproducibilityClaim<
        CaptureProfileReference<CaptureLawProfileA>
      >
        ? true
        : false,
      TagOf<CaptureProfile<CaptureLawProfileA>['reproducibility']>,
    ],
    [true, 'unclaimed' | 'reproducible-under-profile' | 'observed-variable']
  >
>;

/** Type summary consumed by the web topology. */
export interface WebCaptureTypeSurface {
  readonly availability: CaptureAvailability;
  readonly profile: CaptureProfile;
  readonly composition: CapturedComposition;
  readonly frame: CapturedFrame;
  readonly authority: CaptureAuthority;
  readonly grounding: CaptureAuthorityGrounding;
  readonly offer: CaptureAuthorityOffer;
}
