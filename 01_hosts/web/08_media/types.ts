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
 * constructs is an offer materializing an owned lifetime. The exact capture
 * source roster is reserved for old-source mining.
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
  InputOf,
  NonEmptyTuple,
  OutputOf,
  Reference,
  Result,
  Signature,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { MonotonicNanoseconds, SampleIndex } from '../../../00_core/04_time/types.js';
import type { ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type {
  ContainerProfileId,
  ContainerProfileReference,
  DecodeProfileId,
  DecodeProfileReference,
  EncodeProfileId,
  EncodeProfileReference,
  MediaArtifact,
  MediaAssetId,
  MediaAssetReference,
  MediaPacket,
  MediaTrackConfiguration,
  PhysicalFrame,
  SampleRate,
} from '../../../00_core/12_media/types.js';
import type {
  GroundingId,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';

export type MediaResourceId<Name extends string = string> = Brand<Name, 'liteship.web.media-resource-id'>;
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
// Codec admission, decode, encode, and mux
// ---------------------------------------------------------------------------

/**
 * Whether this browser admits one exact codec configuration.
 *
 * An unsupported configuration is an explicit refusal carrying diagnostics, not
 * an absent provider. The difference matters at runtime: "this browser will not
 * encode AV1 at this profile" and "no encoder was wired up" have different
 * remediations, and a missing provider cannot tell you which one happened.
 */
export type CodecSupport = Algebra<{
  supported: {
    readonly configuration: ContentAddress<'application/vnd.liteship.web-codec-configuration+cbor'>;
  };
  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The browser's physical media payload — pixels or samples, addressed. */
export interface WebMediaPayload {
  readonly bytes: ContentAddress;
}

/**
 * The browser decoder: a real operation over an exact profile.
 *
 * Constructing a resource whose kind happens to be `codec` is acquisition, not
 * decoding. A provider that only constructs can hold a decoder forever and
 * never be asked to decode anything, which is the state this home shipped in.
 */
export interface WebDecoderAuthority {
  readonly admit: Signature<DecodeProfileReference, CodecSupport, NonEmptyTuple<Diagnostic>>;
  readonly decode: <Profile extends DecodeProfileId>(
    request: WebDecodeRequest<Profile>,
  ) => Result<WebDecodeProduct<Profile>, NonEmptyTuple<Diagnostic>>;
}

export interface WebDecodeRequest<Profile extends DecodeProfileId = DecodeProfileId> {
  readonly profile: DecodeProfileReference<Profile>;
  readonly source: ContentAddress;
}

export interface WebDecodeProduct<Profile extends DecodeProfileId = DecodeProfileId> {
  readonly profile: DecodeProfileReference<Profile>;
  readonly frames: readonly PhysicalFrame<WebMediaPayload>[];
  readonly reproducibility: ReproducibilityClaim<DecodeProfileReference<Profile>>;
}

/**
 * Encoding real frames in the browser.
 *
 * The frame population is generic so the frames a graphics readback produced
 * can enter without erasure. This home sits above `09_graphics` in the
 * waterfall and cannot name its payload type; the composition point imports
 * both and proves the join, exactly as the target layer does.
 */
export interface WebEncodeRequest<
  Profile extends EncodeProfileId = EncodeProfileId,
  Frame extends PhysicalFrame = PhysicalFrame,
> {
  readonly profile: EncodeProfileReference<Profile>;
  readonly tracks: MediaTrackConfiguration;
  readonly frames: NonEmptyTuple<Frame>;
}

export interface WebEncodeProduct<
  Profile extends EncodeProfileId = EncodeProfileId,
  Frame extends PhysicalFrame = PhysicalFrame,
> {
  readonly profile: EncodeProfileReference<Profile>;
  readonly frames: NonEmptyTuple<Frame>;
  readonly packets: NonEmptyTuple<MediaPacket<Profile>>;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

export interface WebEncoderAuthority {
  readonly admit: Signature<EncodeProfileReference, CodecSupport, NonEmptyTuple<Diagnostic>>;
  readonly encode: <Profile extends EncodeProfileId, Frame extends PhysicalFrame>(
    request: WebEncodeRequest<Profile, Frame>,
  ) => Result<WebEncodeProduct<Profile, Frame>, NonEmptyTuple<Diagnostic>>;
}

/** Finalizing packets into an addressed artifact in the browser. */
export interface WebMuxRequest<
  Profile extends EncodeProfileId = EncodeProfileId,
  Container extends ContainerProfileId = ContainerProfileId,
  Asset extends MediaAssetId = MediaAssetId,
> {
  readonly asset: MediaAssetReference<Asset>;
  readonly container: ContainerProfileReference<Container>;
  readonly packets: NonEmptyTuple<MediaPacket<Profile>>;
}

export interface WebMuxProduct<
  Container extends ContainerProfileId = ContainerProfileId,
  Asset extends MediaAssetId = MediaAssetId,
> {
  readonly artifact: MediaArtifact<Asset, Container>;
  readonly reproducibility: ReproducibilityClaim<ContainerProfileReference<Container>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

export interface WebMuxAuthority {
  readonly finalize: <
    Profile extends EncodeProfileId,
    Container extends ContainerProfileId,
    Asset extends MediaAssetId,
  >(
    request: WebMuxRequest<Profile, Container, Asset>,
  ) => Result<WebMuxProduct<Container, Asset>, NonEmptyTuple<Diagnostic>>;
}

export type WebDecoderRequirement = Hole<'liteship.web.decoder', WebDecoderAuthority>;
export type WebEncoderRequirement = Hole<'liteship.web.encoder', WebEncoderAuthority>;
export type WebMuxRequirement = Hole<'liteship.web.mux', WebMuxAuthority>;

export type AudioFacilityRequirement = Hole<'liteship.web.audio-facility', AudioFacility>;
export type AudioRuntimeRequirement = Hole<'liteship.web.audio-runtime', AudioRuntimeAuthority>;
export type MediaAuthorityRequirement = Hole<'liteship.web.media-authority', MediaConstructionAuthority>;

/** Intrinsic grounding: the constructor facility itself, not any constructed resource. */
export interface AudioFacilityGrounding
  extends WebGroundingDefinition<readonly [AudioFacilityRequirement], unknown, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.audio-facility'>;
}

/**
 * An application-supplied existing audio runtime — an already-created
 * `AudioContext` genuinely carrying its clock — enters as an application
 * grounding with recorded custody. The requirement is the clock-bearing
 * provider capability, never a standalone clock hole: the clock arrives
 * inside each instance, not as a separately deduplicable name. Generic
 * injected media values enter as admitted application inputs to a provider
 * operation, not as one global injected-resource hole.
 */
export interface InjectedAudioRuntimeGrounding
  extends WebGroundingDefinition<
    readonly [AudioRuntimeRequirement],
    unknown,
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
type WebMediaLawEncodeA = EncodeProfileId<'liteship.web.media.law.encode-a'>;
type WebMediaLawEncodeB = EncodeProfileId<'liteship.web.media.law.encode-b'>;

/**
 * Compile-time law: decode and encode are operations, not resource kinds.
 *
 * Holding a `codec` resource is not decoding, and the predecessor state of this
 * home was exactly that: a construction authority over a kind string, with no
 * operation anywhere that could be asked to produce a frame or a packet.
 */
export type DecodeAndEncodeAreOperationsNotResourceKinds = Assert<
  Equal<
    [
      'decode' extends keyof WebDecoderAuthority ? true : false,
      'encode' extends keyof WebEncoderAuthority ? true : false,
      'finalize' extends keyof WebMuxAuthority ? true : false,
      'decode' extends keyof MediaConstructionAuthority ? true : false,
      'encode' extends keyof MediaConstructionAuthority ? true : false,
    ],
    [true, true, true, false, false]
  >
>;

/**
 * Compile-time law: an unsupported configuration is a refusal that says why.
 *
 * The unsupported arm cannot be silent, and support cannot be inferred from a
 * provider merely existing.
 */
export type UnsupportedConfigurationIsARefusalNotAnAbsence = Assert<
  Equal<
    [
      TagOf<CodecSupport>,
      CaseOf<CodecSupport, 'unsupported'>['diagnostics'] extends NonEmptyTuple<Diagnostic>
        ? true
        : false,
      readonly Diagnostic[] extends CaseOf<CodecSupport, 'unsupported'>['diagnostics'] ? true : false,
    ],
    ['supported' | 'unsupported', true, false]
  >
>;

/**
 * Compile-time law: an encode consumes a non-empty frame population, and its
 * packets stay exact over the profile that produced them.
 *
 * Zero frames becoming a successful video is the failure this refuses, and it
 * is one type-argument change away at all times.
 */
export type AnEncodeConsumesFramesAndKeepsItsProfile = Assert<
  Equal<
    [
      WebEncodeRequest<WebMediaLawEncodeA>['frames'] extends NonEmptyTuple<PhysicalFrame>
        ? true
        : false,
      readonly PhysicalFrame[] extends WebEncodeRequest<WebMediaLawEncodeA>['frames'] ? true : false,
      WebEncodeProduct<WebMediaLawEncodeA>['packets'] extends NonEmptyTuple<
        MediaPacket<WebMediaLawEncodeA>
      >
        ? true
        : false,
      WebEncodeProduct<WebMediaLawEncodeB> extends WebEncodeProduct<WebMediaLawEncodeA> ? true : false,
    ],
    [true, false, true, false]
  >
>;

/**
 * Compile-time law: the browser's reproducibility claim is the full three-arm
 * grammar, so `unclaimed` remains available as the honest default.
 *
 * WebCodecs may ignore hardware and software hints for any reason, so a generic
 * browser provider has nothing to claim. That is different from having measured
 * variation, and collapsing the two would turn absent evidence into a finding.
 */
export type TheBrowserDefaultIsUnclaimedNotVariable = Assert<
  Equal<
    TagOf<WebEncodeProduct<WebMediaLawEncodeA>['reproducibility']>,
    'unclaimed' | 'reproducible-under-profile' | 'observed-variable'
  >
>;

/** Compile-time law: encoder and muxer products are owned and disposable. */
export type CodecAndMuxerProductsAreOwned = Assert<
  Equal<
    [
      WebEncodeProduct<WebMediaLawEncodeA>['lifecycle'],
      WebMuxProduct['lifecycle'],
    ],
    [CaseOf<RealizationLifecycle, 'owned'>, CaseOf<RealizationLifecycle, 'owned'>]
  >
>;

export interface WebMediaTypeSurface {
  readonly resource: WebMediaResource;
  readonly decoder: WebDecoderAuthority;
  readonly encoder: WebEncoderAuthority;
  readonly mux: WebMuxAuthority;
  readonly codecSupport: CodecSupport;
  readonly clock: SampleClockTransport;
  readonly instance: AudioRuntimeInstance;
  readonly audioRuntime: AudioRuntimeAuthority;
  readonly mediaAuthority: MediaConstructionAuthority;
  readonly facility: AudioFacilityGrounding;
  readonly injected: InjectedAudioRuntimeGrounding;
  readonly audioOffer: AudioRuntimeOffer;
  readonly mediaOffer: MediaAuthorityOffer;
}
