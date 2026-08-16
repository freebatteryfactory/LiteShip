/**
 * Physical browser audio and media resources.
 *
 * Core owns media assets, sample and frame coordinates, analysis products,
 * A/V semantics, encoder and decoder requirement contracts, and the shared
 * realtime/offline program. This home owns the physical browser side.
 * WebCodecs and `AudioContext` never define the semantic media model.
 *
 * The sample clock speaks the core sample coordinate — sample index at a
 * sample rate — because that is the semantic media axis realtime and offline
 * execution share. Monotonic time is a separate scheduling coordinate and
 * never replaces sample position.
 *
 * Custody is representable both ways: an injected existing resource may be
 * grounded with retained or transferred custody, while a resource LiteShip
 * constructs is an offer materializing an owned lifetime.
 *
 * Codecs are not redeclared here. Decode, encode, and mux are core's sockets;
 * this home admits profiles and provides those requirements.
 *
 * @module
 */

import type {
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Signature,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { MonotonicNanoseconds, SampleIndex } from '../../../00_core/04_time/types.js';
import type {
  CodecAdmission,
  ContainerProfileReference,
  DecodeProfileReference,
  EncodeProfileReference,
  MediaDecoderAuthority,
  MediaDecoderRequirement,
  MediaEncoderAuthority,
  MediaEncoderRequirement,
  MediaMuxAuthority,
  MediaMuxRequirement,
  SampleRate,
} from '../../../00_core/12_media/types.js';
import type {
  GroundingId,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';

/** Stable identity for one media resource. */
export type MediaResourceId<Name extends string = string> = Brand<Name, 'liteship.web.media-resource-id'>;
/** Typed reference to one media resource. */
export type MediaResourceReference<Id extends MediaResourceId = MediaResourceId> = Reference<
  'web-media-resource',
  Id
>;

/**
 * The physical resource kinds this home may hold. `capture-stream` is the
 * reserved capture authority; its concrete source roster arrives with
 * old-source evidence, not architecture speculation.
 */
export type WebMediaResourceKind =
  | 'audio-context'
  | 'audio-worklet'
  | 'media-device'
  | 'capture-stream'
  | 'codec'
  | 'playback-element';

/**
 * One live physical media resource. The lifecycle arm is a parameter so both
 * custody stories are representable: a grounded injected resource may be
 * `unowned` (the supplier keeps the lifetime) or `owned` (custody
 * transferred), while a constructed resource is always `owned`. The identity
 * and kind parameters let clock-bearing containment name the exact resource
 * it holds; the defaults leave generic resources as broad as before.
 */
export interface WebMediaResource<
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
  Id extends MediaResourceId = MediaResourceId,
  Kind extends WebMediaResourceKind = WebMediaResourceKind,
> {
  readonly id: MediaResourceReference<Id>;
  readonly kind: Kind;
  readonly lifecycle: CaseOf<RealizationLifecycle, Life>;
}

/** The semantic sample position: index at a rate. Never monotonic time. */
export interface SamplePosition {
  readonly sample: SampleIndex;
  readonly rate: SampleRate;
}

/** Browser-side sample-clock reading: sample position, plus a separate scheduling coordinate. */
export interface SampleClockTransport {
  readonly position: SamplePosition;
  readonly scheduled: MonotonicNanoseconds;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Narrow intrinsic authority over browser media constructor facilities. */
export interface AudioFacility {
  readonly construct: Signature<
    WebMediaResourceKind,
    WebMediaResource<'owned'>,
    NonEmptyTuple<Diagnostic>
  >;
}

/** The audio-runtime resource kinds — the only clock-bearing family. */
export type AudioResourceKind = Extract<WebMediaResourceKind, 'audio-context' | 'audio-worklet'>;

/**
 * The clock of the audio runtime that contains it. The clock carries no
 * runtime reference of its own and its `read` accepts none: containment is
 * the only identity owner, so there is no second place to write a runtime
 * claim — a clock inside runtime A structurally cannot name, read, or claim
 * runtime B. A clock floating free of its runtime would be a coordinate with
 * no origin.
 */
export interface SampleClock {
  readonly read: Signature<void, SampleClockTransport, NonEmptyTuple<Diagnostic>>;
}

/**
 * One live clock-bearing audio runtime: the exact owned audio resource and
 * the sample clock it contains. The resource's own `id` is the one runtime
 * identity; the clock adds none — assembling an instance whose clock claims
 * a different runtime is unrepresentable, because the claim has nowhere to
 * live.
 */
export interface AudioRuntimeInstance {
  readonly runtime: WebMediaResource<'owned', MediaResourceId, AudioResourceKind>;
  readonly clock: SampleClock;
}

/**
 * The clock-bearing audio runtime provider: it constructs audio runtimes as
 * repeatable per-use values, each arriving as a clock-bearing instance,
 * because the clock is inseparable from the exact runtime it belongs to.
 */
export interface AudioRuntimeAuthority {
  readonly construct: Signature<
    AudioResourceKind,
    AudioRuntimeInstance,
    NonEmptyTuple<Diagnostic>
  >;
}

/**
 * The generic media provider: devices, capture streams, codecs, and playback
 * elements as repeatable per-use resources. It deliberately carries no sample
 * clock — a codec or a capture stream does not automatically own the semantic
 * media axis.
 */
export interface MediaConstructionAuthority {
  readonly construct: Signature<
    Exclude<WebMediaResourceKind, AudioResourceKind>,
    WebMediaResource<'owned'>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly adopt: Signature<WebMediaResource, WebMediaResource, NonEmptyTuple<Diagnostic>>;
}

// ---------------------------------------------------------------------------
// Codec admission, and the core sockets this host fills
// ---------------------------------------------------------------------------

/**
 * Whether this browser admits one exact codec configuration.
 *
 * Admission is the host's job, and it is the reason core's decode, encode, and
 * mux contracts can be total. The supported arm mints an `AdmittedProfile`, and
 * only an admitted profile may enter a core operation — so "unsupported codec"
 * is answered here, once, instead of becoming a refusal arm every downstream
 * consumer has to destructure forever.
 *
 * Unsupported is an explicit refusal carrying diagnostics, never an absent
 * provider. "This browser will not encode AV1 at this profile" and "no encoder
 * was wired up" have different remediations, and a missing provider cannot say
 * which one happened.
 */
/**
 * The browser's codec admission authority.
 *
 * Separate from the codec operations themselves because support is a runtime
 * fact about this browser on this machine today, and it changes with available
 * hardware. A provider that answered it by throwing would make refusal
 * indistinguishable from failure.
 */
export interface WebCodecAdmission {
  readonly admitDecode: Signature<
    DecodeProfileReference,
    CodecAdmission<DecodeProfileReference>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly admitEncode: Signature<
    EncodeProfileReference,
    CodecAdmission<EncodeProfileReference>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly admitContainer: Signature<
    ContainerProfileReference,
    CodecAdmission<ContainerProfileReference>,
    NonEmptyTuple<Diagnostic>
  >;
}

/** Capability requirement for web codec admission. */
export type WebCodecAdmissionRequirement = Hole<'liteship.web.codec-admission', WebCodecAdmission>;

/**
 * The browser's realization of core's decoder socket.
 *
 * This is an alias, not a parallel contract. An earlier form declared a
 * `WebDecoderAuthority` shaped like core's but unrelated to it, which left two
 * vocabularies standing near each other while the README claimed they had met.
 * A host that satisfies the core hole is the only thing that makes the claim
 * true, and naming the core type is what makes the compiler agree.
 */
export type WebDecoderAuthority = MediaDecoderAuthority;
/** Authority governing web encoder. */
export type WebEncoderAuthority = MediaEncoderAuthority;
/** Authority governing web mux. */
export type WebMuxAuthority = MediaMuxAuthority;

/**
 * The browser codec provider: admission plus the three core authorities.
 *
 * The offer below provides core's requirements directly, so "host decoders and
 * encoders satisfy typed core requirements" is a compiled relationship rather
 * than a sentence in two READMEs.
 */
export interface WebCodecFacility {
  readonly admission: WebCodecAdmission;
  readonly decoder: MediaDecoderAuthority;
  readonly encoder: MediaEncoderAuthority;
  readonly mux: MediaMuxAuthority;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** Grounding the narrow browser codec entrypoint — an intrinsic, unowned fact. */
export interface CodecAdmissionGrounding
  extends WebGroundingDefinition<
    readonly [WebCodecAdmissionRequirement],
    WebCodecAdmission,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.web.grounding.codec-admission'>;
}

/**
 * Constructing the codec provider over the admission facility.
 *
 * It provides core's three requirements. That is the convergence: core owns the
 * socket shape, the browser owns the physics, and neither restates the other.
 */
export interface WebCodecOffer
  extends WebRealizationOffer<
    readonly [MediaDecoderRequirement, MediaEncoderRequirement, MediaMuxRequirement],
    readonly [WebCodecAdmissionRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.codec-facility'>;
}

/** Capability requirement for audio facility. */
export type AudioFacilityRequirement = Hole<'liteship.web.audio-facility', AudioFacility>;
/** Capability requirement for audio runtime. */
export type AudioRuntimeRequirement = Hole<'liteship.web.audio-runtime', AudioRuntimeAuthority>;
/** Capability requirement for media authority. */
export type MediaAuthorityRequirement = Hole<'liteship.web.media-authority', MediaConstructionAuthority>;

/** Intrinsic grounding: the constructor facility itself, not any constructed resource. */
export interface AudioFacilityGrounding
  extends WebGroundingDefinition<readonly [AudioFacilityRequirement], AudioFacility, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.audio-facility'>;
}

/**
 * An application supplies the exact clock-bearing audio-runtime authority and
 * retains its custody. Admission borrows that provider; it does not imply that
 * a particular source resource already exists or that LiteShip may dispose the
 * application-owned runtime. Source resources enter through the authority's
 * admitted per-use operations, never through one global injected-resource hole.
 */
export interface InjectedAudioRuntimeGrounding
  extends WebGroundingDefinition<
    readonly [AudioRuntimeRequirement],
    AudioRuntimeAuthority,
    'application',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.web.grounding.injected-audio-runtime'>;
}

/** Constructing the clock-bearing audio runtime provider: every constructed instance carries its clock. */
export interface AudioRuntimeOffer
  extends WebRealizationOffer<
    readonly [AudioRuntimeRequirement],
    readonly [AudioFacilityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.audio-runtime'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Constructing the generic media provider: no clock, by design. */
export interface MediaAuthorityOffer
  extends WebRealizationOffer<
    readonly [MediaAuthorityRequirement],
    readonly [AudioFacilityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.media-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Public declaration surface owned by web media. */
export interface WebMediaTypeSurface {
  readonly resource: WebMediaResource;
  readonly admission: WebCodecAdmission;
  readonly codecFacility: WebCodecFacility;
  readonly codecSupport: CodecAdmission<EncodeProfileReference>;
  readonly codecGrounding: CodecAdmissionGrounding;
  readonly codecOffer: WebCodecOffer;
  readonly clock: SampleClockTransport;
  readonly instance: AudioRuntimeInstance;
  readonly audioRuntime: AudioRuntimeAuthority;
  readonly mediaAuthority: MediaConstructionAuthority;
  readonly facility: AudioFacilityGrounding;
  readonly injected: InjectedAudioRuntimeGrounding;
  readonly audioOffer: AudioRuntimeOffer;
  readonly mediaOffer: MediaAuthorityOffer;
}
