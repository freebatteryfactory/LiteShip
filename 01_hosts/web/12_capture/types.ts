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
import type {
  CapturedFrame,
  MediaRepresentationId,
  MediaSource,
  MediaSourceId,
} from '../../../00_core/12_media/types.js';
import type { SemanticCut } from '../../../00_core/08_state/types.js';
import type {
  GroundingId,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';
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

export type CaptureScopeId<Name extends string = string> = Brand<Name, 'liteship.web.capture-scope-id'>;
export type CaptureScopeReference<Id extends CaptureScopeId = CaptureScopeId> = Reference<
  'web-capture-scope',
  Id
>;

/**
 * The committed physical composition a capture came from.
 *
 * The commit is exact over the cut it applied, so a capture cannot claim pixels
 * from a state the application never reached — and the boundary is *not*
 * restated here. `ProjectionCommit` already carries the region lease whose
 * membership owns the boundary, and a second writable boundary beside it is one
 * fact with two owners awaiting disagreement.
 *
 * The scope is a different fact: capture may legitimately target less than the
 * full committed region — one surface, one subarea — and that selection needs
 * an identity of its own rather than a second boundary pretending to be the
 * first.
 */
export interface CapturedComposition<Cut extends SemanticCut = SemanticCut> {
  readonly commit: ProjectionCommit<Cut>;
  readonly scope: CaptureScopeReference;
}

/**
 * One captured frame.
 *
 * Its provenance is captured-only by construction — there is no rasterized arm
 * to inhabit, so a capture cannot present itself as evidence that a subject had
 * a faithful semantic projection. An earlier form achieved this by setting the
 * semantic parameter to `never`, which locked the trapdoor correctly but left
 * consumers destructuring branches that could not exist.
 */
export type WebCapturedFrame<
  Representation extends MediaRepresentationId = MediaRepresentationId,
  Cut extends SemanticCut = SemanticCut,
  Profile extends CaptureProfileId = CaptureProfileId,
> = CapturedFrame<Representation, CapturedComposition<Cut>, CaptureProfileReference<Profile>>;

/**
 * A request to capture one committed composition.
 *
 * The commit is required and cannot be a draft. A preview may be rasterized —
 * that is the editor working — but pixels claimed off an uncommitted page are a
 * claim about a state the application never reached.
 */
export interface CaptureRequest<
  Cut extends SemanticCut = SemanticCut,
  Profile extends CaptureProfileId = CaptureProfileId,
> {
  readonly composition: CapturedComposition<Cut>;
  readonly profile: CaptureProfile<Profile>;
  readonly surfaces: readonly GraphicsResourceReference[];
}

/**
 * The narrow browser capture entrypoint.
 *
 * Intrinsic and unowned: the page simply has it. It acquires nothing,
 * negotiates no permission, and constructs no session — those are an offer's
 * work, which is the already-sealed host rule this home has to obey like every
 * other.
 */
export interface CaptureFacility {
  readonly availability: Signature<
    CaptureProfileReference,
    CaptureAvailability,
    NonEmptyTuple<Diagnostic>
  >;
}

/**
 * The owned capture session authority.
 *
 * Constructed rather than grounded, because it holds a permission-sensitive
 * session with a lifetime. A frame source is offered beside the single capture
 * so long recordings pull rather than accumulate.
 */
export interface CaptureAuthority {
  readonly capture: <
    Representation extends MediaRepresentationId,
    Cut extends SemanticCut,
    Profile extends CaptureProfileId,
  >(
    request: CaptureRequest<Cut, Profile>,
  ) => Result<WebCapturedFrame<Representation, Cut, Profile>, NonEmptyTuple<Diagnostic>>;

  readonly captureSequence: <
    Representation extends MediaRepresentationId,
    Cut extends SemanticCut,
    Profile extends CaptureProfileId,
    Source extends MediaSourceId,
  >(
    request: CaptureRequest<Cut, Profile>,
  ) => Result<
    MediaSource<WebCapturedFrame<Representation, Cut, Profile>, Source>,
    NonEmptyTuple<Diagnostic>
  >;

  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

export type CaptureFacilityRequirement = Hole<'liteship.web.capture-facility', CaptureFacility>;
export type CaptureAuthorityRequirement = Hole<'liteship.web.capture-authority', CaptureAuthority>;

/** Grounding the intrinsic browser capture entrypoint. */
export interface CaptureFacilityGrounding
  extends WebGroundingDefinition<
    readonly [CaptureFacilityRequirement],
    unknown,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.web.grounding.capture-facility'>;
}

/** Constructing the owned capture authority over that facility. */
export interface CaptureAuthorityOffer
  extends WebRealizationOffer<
    readonly [CaptureAuthorityRequirement],
    readonly [CaptureFacilityRequirement],
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
type CaptureLawRepA = MediaRepresentationId<'liteship.web.capture.law.representation-a'>;

/**
 * Compile-time law: a capture names a committed composition, and restates no
 * boundary of its own.
 *
 * The scope is a selection, not a second boundary. Restoring a writable
 * `RegionBoundary` here would give one fact two owners — the lease already
 * carries the committed one — and they would agree until the first capture
 * where they did not.
 */
export type ACaptureNamesACommittedComposition = Assert<
  Equal<
    [
      CaptureRequest<SemanticCut, CaptureLawProfileA>['composition'] extends CapturedComposition
        ? true
        : false,
      CapturedComposition['commit'] extends ProjectionCommit ? true : false,
      CapturedComposition['scope'] extends CaptureScopeReference ? true : false,
      'boundary' extends keyof CapturedComposition ? true : false,
    ],
    [true, true, true, false]
  >
>;

/**
 * Compile-time law: a captured frame's provenance is captured-only, and it is
 * exact over the profile and composition it came from.
 *
 * There is no rasterized arm to inhabit. That is what stops a screenshot being
 * offered as evidence of a faithful semantic projection.
 */
export type ACapturedFrameCannotClaimASemanticFrame = Assert<
  Equal<
    [
      TagOf<WebCapturedFrame<CaptureLawRepA, SemanticCut, CaptureLawProfileA>['provenance']>,
      'frame' extends keyof CaseOf<
        WebCapturedFrame<CaptureLawRepA, SemanticCut, CaptureLawProfileA>['provenance'],
        'host-captured'
      >
        ? true
        : false,
      WebCapturedFrame<CaptureLawRepA, SemanticCut, CaptureLawProfileB> extends WebCapturedFrame<
        CaptureLawRepA,
        SemanticCut,
        CaptureLawProfileA
      >
        ? true
        : false,
    ],
    ['host-captured' | 'reused', false, false]
  >
>;

/**
 * Compile-time law: availability is a three-arm answer, and refusal says which
 * kind it is.
 *
 * Permission-required and unavailable have different remediations — one is "ask
 * the user again", the other is not.
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
      readonly Diagnostic[] extends CaseOf<CaptureAvailability, 'unavailable'>['diagnostics']
        ? true
        : false,
    ],
    ['available' | 'permission-required' | 'unavailable', true, true, false]
  >
>;

/**
 * Compile-time law: capture decides nothing about encoding, and holds no scene
 * or frame model of its own.
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
 * Compile-time law: the intrinsic facility is grounded and the owned authority
 * is offered over it.
 *
 * Grounding admits what already exists; an offer constructs what does not. A
 * permission-sensitive owned session is not something a page simply has, and
 * declaring it intrinsic was the shortcut this law now refuses.
 */
export type TheFacilityIsGroundedAndTheAuthorityIsOffered = Assert<
  Equal<
    [
      CaptureFacilityGrounding['provides'],
      CaptureAuthorityOffer['provides'],
      CaptureAuthorityOffer['requires'],
      CaptureAuthority['lifecycle'],
      'capture' extends keyof CaptureFacility ? true : false,
      'captureSequence' extends keyof CaptureAuthority ? true : false,
    ],
    [
      readonly [CaptureFacilityRequirement],
      readonly [CaptureAuthorityRequirement],
      readonly [CaptureFacilityRequirement],
      CaseOf<RealizationLifecycle, 'owned'>,
      false,
      true,
    ]
  >
>;

/**
 * Compile-time law: a capture profile's reproducibility claim is exact over its
 * own reference, and the full grammar stays available so `unclaimed` is sayable.
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
  readonly frame: WebCapturedFrame;
  readonly facility: CaptureFacility;
  readonly authority: CaptureAuthority;
  readonly grounding: CaptureFacilityGrounding;
  readonly offer: CaptureAuthorityOffer;
}
