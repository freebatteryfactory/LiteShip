/**
 * Compile-time laws for `01_hosts/web/08_media`.
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
import type { MonotonicNanoseconds } from '../../../00_core/04_time/types.js';
import type { AdmittedProfile, CodecAdmission, EncodeProfileReference, MediaDecoderAuthority, MediaDecoderRequirement, MediaEncoderAuthority, MediaEncoderRequirement, MediaMuxAuthority, MediaMuxRequirement } from '../../../00_core/12_media/types.js';
import type { RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, InputOf, NonEmptyTuple, OutputOf, TagOf } from '../../../types.js';
import type { AudioResourceKind, AudioRuntimeAuthority, AudioRuntimeInstance, AudioRuntimeOffer, AudioRuntimeRequirement, CodecAdmissionGrounding, MediaAuthorityOffer, MediaAuthorityRequirement, MediaConstructionAuthority, SampleClock, SampleClockTransport, SamplePosition, WebCodecAdmission, WebCodecAdmissionRequirement, WebCodecFacility, WebCodecOffer, WebDecoderAuthority, WebEncoderAuthority, WebMediaResource, WebMediaResourceKind, WebMuxAuthority } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// Physical codec support, worklet scheduling, and capture availability are
// empirical and settle through evidence and profiles, not declarations.
// ---------------------------------------------------------------------------

/** Compile-time law: the sample clock speaks the sample coordinate, never monotonic time. */
export type TheSampleClockSpeaksTheSampleCoordinate = Assert<
  Equal<
    [SampleClockTransport['position'], SampleClockTransport['scheduled']],
    [SamplePosition, MonotonicNanoseconds]
  >
>;


/** Compile-time law: retained custody is representable — an unowned grounded resource is lawful. */
export type RetainedCustodyIsRepresentable = Assert<
  Equal<WebMediaResource<'unowned'>['lifecycle'], CaseOf<RealizationLifecycle, 'unowned'>>
>;


/** Compile-time law: a constructed instance holds an owned runtime, disposed exactly once. */
export type AConstructedResourceIsOwned = Assert<
  Equal<
    [
      OutputOf<AudioRuntimeAuthority['construct']>,
      AudioRuntimeInstance['runtime']['lifecycle'],
      AudioRuntimeOffer['materializes']['lifecycle'],
    ],
    [AudioRuntimeInstance, CaseOf<RealizationLifecycle, 'owned'>, 'owned']
  >
>;


/**
 * Compile-time law: only the audio family is clock-bearing — the runtime
 * provider constructs only audio kinds as clock-bearing instances, the
 * generic provider constructs everything else and adopts injected values,
 * and the instance's contained clock is exactly the clock type.
 */
export type TheClockIsBoundToItsRuntime = Assert<
  Equal<
    [
      InputOf<AudioRuntimeAuthority['construct']>,
      InputOf<MediaConstructionAuthority['construct']>,
      OutputOf<MediaConstructionAuthority['adopt']>,
      AudioRuntimeInstance['runtime']['kind'],
      AudioRuntimeInstance['clock'],
    ],
    [
      AudioResourceKind,
      Exclude<WebMediaResourceKind, AudioResourceKind>,
      WebMediaResource,
      AudioResourceKind,
      SampleClock,
    ]
  >
>;


/**
 * Compile-time law: a clock cannot claim another runtime, because the claim
 * has nowhere to live — the clock's only member is `read`, `read` accepts no
 * runtime reference, and the instance's clock is exactly the contained clock
 * type. Containment is the sole identity owner.
 */
export type AClockCannotClaimAnotherRuntime = Assert<
  Equal<
    [
      'runtime' extends keyof SampleClock ? true : false,
      keyof SampleClock,
      InputOf<SampleClock['read']>,
      AudioRuntimeInstance['clock'],
    ],
    [false, 'read', void, SampleClock]
  >
>;


/**
 * Compile-time law: only the clock-bearing audio runtime supplies the sample
 * clock. The generic media provider's row carries none, its constructed
 * resources stay clockless, and both providers construct repeatable
 * resources rather than filling a resource-shaped hole.
 */
export type OnlyTheAudioRuntimeSuppliesTheClock = Assert<
  Equal<
    [
      AudioRuntimeOffer['provides'],
      MediaAuthorityOffer['provides'],
      OutputOf<MediaConstructionAuthority['construct']>,
      AudioRuntimeOffer['id'],
      MediaAuthorityOffer['id'],
      readonly [WebMediaResource, WebMediaResource] extends readonly WebMediaResource[] ? true : false,
    ],
    [
      readonly [AudioRuntimeRequirement],
      readonly [MediaAuthorityRequirement],
      WebMediaResource<'owned'>,
      RealizationOfferId<'liteship.web.offer.audio-runtime'>,
      RealizationOfferId<'liteship.web.offer.media-authority'>,
      true,
    ]
  >
>;


/** Type summary consumed by the web topology. */
/**
 * Compile-time law: this host fills core's sockets rather than declaring
 * neighbours of them.
 *
 * The predecessor state of this home was three browser-local authorities shaped
 * like core's and related to them only by comment, while the README claimed
 * they had met. Identity — not similarity — is what makes the claim compile.
 */
export type TheBrowserFillsTheCoreCodecSockets = Assert<
  Equal<
    [
      Equal<WebDecoderAuthority, MediaDecoderAuthority>,
      Equal<WebEncoderAuthority, MediaEncoderAuthority>,
      Equal<WebMuxAuthority, MediaMuxAuthority>,
      WebCodecFacility['decoder'] extends MediaDecoderAuthority ? true : false,
      WebCodecFacility['encoder'] extends MediaEncoderAuthority ? true : false,
      WebCodecFacility['mux'] extends MediaMuxAuthority ? true : false,
    ],
    [true, true, true, true, true, true]
  >
>;


/**
 * Compile-time law: the codec offer provides core's requirements.
 *
 * A provider that provided only browser-local requirements would leave the core
 * holes unfilled forever while every lane stayed green.
 */
export type TheCodecOfferProvidesTheCoreRequirements = Assert<
  Equal<
    WebCodecOffer['provides'],
    readonly [MediaDecoderRequirement, MediaEncoderRequirement, MediaMuxRequirement]
  >
>;


/**
 * Compile-time law: admission mints the witness a core operation requires, and
 * refusal says why.
 *
 * The supported arm carries an `AdmittedProfile`; without it, admission would
 * answer a question nobody downstream could act on, and core's operations would
 * have to reopen a compatibility arm they were designed to close.
 */
export type AdmissionMintsTheWitnessCoreRequires = Assert<
  Equal<
    [
      TagOf<CodecAdmission<EncodeProfileReference>>,
      CaseOf<CodecAdmission<EncodeProfileReference>, 'supported'>['admitted'] extends AdmittedProfile<
        EncodeProfileReference
      >
        ? true
        : false,
      CaseOf<CodecAdmission<EncodeProfileReference>, 'unsupported'>['diagnostics'] extends NonEmptyTuple<
        Diagnostic
      >
        ? true
        : false,
      readonly Diagnostic[] extends CaseOf<
        CodecAdmission<EncodeProfileReference>,
        'unsupported'
      >['diagnostics']
        ? true
        : false,
    ],
    ['supported' | 'unsupported', true, true, false]
  >
>;


/**
 * Compile-time law: admission covers all three profile families.
 *
 * A container profile nobody admitted is the same hole as an unadmitted codec,
 * one stage later — and the mux socket is total over admitted containers for
 * exactly the same reason the encoder is.
 */
export type AdmissionCoversDecodeEncodeAndContainer = Assert<
  Equal<
    [
      'admitDecode' extends keyof WebCodecAdmission ? true : false,
      'admitEncode' extends keyof WebCodecAdmission ? true : false,
      'admitContainer' extends keyof WebCodecAdmission ? true : false,
    ],
    [true, true, true]
  >
>;


/**
 * Compile-time law: admission is an intrinsic browser fact; the codec provider
 * is constructed.
 *
 * Grounding admits what already exists. An owned, permission- and
 * hardware-sensitive provider is not something the page simply has, so it
 * arrives through an offer that requires the intrinsic entrypoint.
 */
export type AdmissionIsGroundedAndTheProviderIsOffered = Assert<
  Equal<
    [
      CodecAdmissionGrounding['provides'],
      WebCodecOffer['requires'],
      WebCodecFacility['lifecycle'],
    ],
    [
      readonly [WebCodecAdmissionRequirement],
      readonly [WebCodecAdmissionRequirement],
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;
