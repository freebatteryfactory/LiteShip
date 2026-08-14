/**
 * Compile-time laws for `01_hosts/web/12_capture`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type { SemanticCut } from '../../../00_core/08_state/types.js';
import type { MediaRepresentationId } from '../../../00_core/12_media/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, TagOf } from '../../../types.js';
import type { ProjectionCommit } from '../04_projection/types.js';
import type { CaptureAuthority, CaptureAuthorityOffer, CaptureAuthorityRequirement, CaptureAvailability, CaptureFacility, CaptureFacilityGrounding, CaptureFacilityRequirement, CaptureProfile, CaptureProfileId, CaptureProfileReference, CaptureRequest, CaptureScopeReference, CapturedComposition, WebCapturedFrame } from './types.js';

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
