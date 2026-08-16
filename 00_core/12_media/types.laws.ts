/**
 * Compile-time laws for `00_core/12_media`.
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

import type { Address, Assert, CaseOf, Equal, Hole, NonEmptyTuple, OkOf, Result, Signature, SignatureResult, TagOf } from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress, ContentDigest } from '../01_encoding/types.js';
import type { RevisionReference } from '../02_identity/types.js';
import type { StreamSequence } from '../04_time/types.js';
import type { CancellationReceipt, DisposalReceipt } from '../05_lifecycle/types.js';
import type { AdmittedProfile, AnalysisAlgorithmId, AnalysisAlgorithmReference, AnalysisCoordinateSystem, CapturedProvenance, ContainerProfileId, ContainerProfileReference, DecodeProfileId, DecodeProfileReference, DecodedFrame, DecodedProvenance, DecodedSampleBlock, EncodeProfileId, EncodeProfileReference, MediaAnalysisResult, MediaArtifact, MediaAssetId, MediaAssetReference, MediaBatch, MediaCut, MediaDecodeProduct, MediaDecodeRequest, MediaDecoderAuthority, MediaDecoderRequirement, MediaEncodeProduct, MediaEncodeRequest, MediaEncoderAuthority, MediaEncoderRequirement, MediaEvent, MediaExportDecision, MediaExportDisposition, MediaExportRequest, MediaFrame, MediaMuxAuthority, MediaMuxRequest, MediaMuxRequirement, MediaPacket, MediaRepresentationId, MediaRepresentationReference, MediaSource, MediaSourceCredit, MediaSourceId, MediaSourceReference, MediaTrackConfiguration, MediaTrackId, MediaTrackReference, MediaTrackSources, MediaTrackTag, PayloadLocation, PhysicalFrame, PhysicalPayload, RasterizedProvenance, SampleProvenance, SemanticFrameDerivation } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type MediaLawAssetA = MediaAssetId<'liteship.media.law.asset-a'>;

type MediaLawRevisionA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:5555555555555555555555555555555555555555555555555555555555555555'
>;

type MediaLawRepA = MediaRepresentationId<'liteship.media.law.representation-a'>;

type MediaLawDecodeA = DecodeProfileId<'liteship.media.law.decode-a'>;

type MediaLawEncodeA = EncodeProfileId<'liteship.media.law.encode-a'>;

type MediaLawContainerA = ContainerProfileId<'liteship.media.law.container-a'>;

type MediaLawTrackA = MediaTrackId<'liteship.media.law.track-a'>;

type MediaLawTrackB = MediaTrackId<'liteship.media.law.track-b'>;

type MediaLawSourceA = MediaSourceId<'liteship.media.law.source-a'>;

type MediaLawAlgorithmA = AnalysisAlgorithmId<'liteship.media.law.algorithm-a'>;


/** Compile-time law: a semantic media frame binds the shared cut authority. */
export type AMediaFrameCarriesItsCut = Assert<Equal<MediaFrame['cut'], MediaCut>>;


/**
 * Compile-time law: the three physical provenances are distinct populations,
 * and none can inhabit another's arms.
 *
 * Specialized rather than one union with impossible branches. A rasterized
 * frame cannot claim host capture; a captured frame cannot claim it realized a
 * semantic frame; a decoded frame is neither, which is why it needed an arm of
 * its own rather than borrowing a nametag that was never true.
 */
export type PhysicalProvenancesStayDistinct = Assert<
  Equal<
    [
      TagOf<RasterizedProvenance<MediaFrame, unknown>>,
      TagOf<DecodedProvenance<MediaLawAssetA, MediaLawDecodeA>>,
      TagOf<CapturedProvenance<unknown, unknown>>,
      TagOf<SampleProvenance<MediaLawAssetA, MediaLawDecodeA>>,
      // Semantic reuse must carry evidence that every relevant dependency is
      // unchanged. Without it, `reused` degrades into "we did not recompute
      // this", which is a scheduling note rather than a correctness claim.
      CaseOf<SemanticFrameDerivation, 'reused'>['unchanged'] extends ContentAddress<
        'application/vnd.liteship.media-reuse-evidence+cbor'
      >
        ? true
        : false,
    ],
    [
      'rasterized' | 'reused',
      'decoded' | 'reused',
      'host-captured' | 'reused',
      'decoded' | 'synthesized' | 'reused',
      true,
    ]
  >
>;


/**
 * Compile-time law: rasterized provenance names the exact semantic frame it
 * realizes, and captured provenance names a composition instead.
 *
 * This is the law that makes live presentation and export the same evaluation.
 */
export type RasterizedProvenanceNamesItsSemanticFrame = Assert<
  Equal<
    [
      'frame' extends keyof CaseOf<RasterizedProvenance<MediaFrame, unknown>, 'rasterized'>
        ? true
        : false,
      'frame' extends keyof CaseOf<CapturedProvenance<unknown, unknown>, 'host-captured'>
        ? true
        : false,
      'composition' extends keyof CaseOf<CapturedProvenance<unknown, unknown>, 'host-captured'>
        ? true
        : false,
      'asset' extends keyof CaseOf<DecodedProvenance<MediaLawAssetA, MediaLawDecodeA>, 'decoded'>
        ? true
        : false,
    ],
    [true, false, true, true]
  >
>;


/**
 * Compile-time law: a physical payload is exact over its representation, and
 * realm is not part of its identity.
 *
 * Two hosts producing the same canonical representation interoperate, which is
 * a feature. Four realm-named wrappers around one structure were four different
 * comments on the same type.
 */
export type APayloadIsExactOverItsRepresentation = Assert<
  Equal<
    [
      PhysicalPayload<MediaLawRepA>['representation'],
      PhysicalPayload<MediaLawRepA> extends PhysicalPayload<
        MediaRepresentationId<'liteship.media.law.representation-b'>
      >
        ? true
        : false,
      TagOf<PayloadLocation>,
    ],
    [
      MediaRepresentationReference<MediaLawRepA>,
      false,
      'addressed' | 'host-resource',
    ]
  >
>;


/**
 * Compile-time law: a media source is bounded, ordered, and lossless.
 *
 * The absence of a dropped arm is the guarantee. `13_stream` may lawfully drop
 * oldest, drop newest, or coalesce, because losing a stale UI event is
 * recoverable; losing frame 317 changes the movie.
 */
export type AMediaSourceCannotSilentlyDropUnits = Assert<
  Equal<
    [
      // Credit is a boolean bound, not a capacity with an overflow rule. A
      // numeric policy here would let an encoder queue discard frame 317 and
      // call it backpressure.
      MediaSourceCredit['bounded'],
      'overflow' extends keyof MediaSourceCredit ? true : false,
      'capacity' extends keyof MediaSourceCredit ? true : false,
      TagOf<MediaBatch<unknown>>,
      CaseOf<MediaBatch<MediaLawRepA>, 'produced'>['units'] extends NonEmptyTuple<MediaLawRepA>
        ? true
        : false,
      readonly MediaLawRepA[] extends CaseOf<MediaBatch<MediaLawRepA>, 'produced'>['units']
        ? true
        : false,
      MediaSource<unknown, MediaLawSourceA>['credit'] extends MediaSourceCredit ? true : false,
    ],
    [true, false, false, 'produced' | 'completed' | 'cancelled' | 'failed', true, false, true]
  >
>;


/**
 * Compile-time law: a source is exact over its unit through the covariant
 * output of its pull, and exact over its own identity.
 *
 * The unit carried only in an input position would be contravariant and would
 * survive every broadening.
 */
/**
 * Cancelling a source yields a cancellation receipt in the success arm.
 *
 * Read through the operation rather than off the declaration: `SignatureResult`
 * places the output in `Ok` and the failure algebra in `Err`, and `OkOf`
 * recovers the success payload. So this asserts that *executing* `cancel`
 * produces a receipt naming this exact source — not merely that a member was
 * typed a certain way.
 *
 * The second line is the one that would catch the mistake this member already
 * made once. `cancel` briefly returned a `DisposalReceipt`, which is a truthful
 * shape describing an untrue event: cancelling a source does not release it.
 * The two receipts carry disjoint outcome tags, so the substitution fails here
 * rather than surviving into a host that believes ownership ended.
 */
export type CancellingASourceYieldsACancellationReceipt = Assert<
  Equal<
    [
      Equal<
        OkOf<SignatureResult<MediaSource<PhysicalFrame, MediaSourceId<'law.src'>>['cancel']>>,
        CancellationReceipt<MediaSourceReference<MediaSourceId<'law.src'>>>
      >,
      OkOf<
        SignatureResult<MediaSource<PhysicalFrame, MediaSourceId<'law.src'>>['cancel']>
      > extends DisposalReceipt<MediaSourceReference<MediaSourceId<'law.src'>>>
        ? true
        : false,
    ],
    [true, false]
  >
>;


export type AMediaSourceIsExactOverItsUnit = Assert<
  Equal<
    [
      // Read the pull relationship itself. Substitutability alone survives the
      // input and output being swapped — the unit is still "somewhere in the
      // signature", and every downstream exactness claim quietly becomes
      // contravariant.
      Equal<
        MediaSource<MediaLawRepA, MediaLawSourceA>['pull'],
        Signature<MediaSourceCredit, MediaBatch<MediaLawRepA>, NonEmptyTuple<Diagnostic>>
      >,
      MediaSource<MediaLawRepA, MediaLawSourceA> extends MediaSource<
        MediaRepresentationId<'liteship.media.law.representation-b'>,
        MediaLawSourceA
      >
        ? true
        : false,
      MediaSource<MediaLawRepA, MediaLawSourceA> extends MediaSource<
        MediaLawRepA,
        MediaSourceId<'liteship.media.law.source-b'>
      >
        ? true
        : false,
      MediaSource<MediaLawRepA, MediaLawSourceA>['id'],
    ],
    [true, false, false, MediaSourceReference<MediaLawSourceA>]
  >
>;


/**
 * Compile-time law: the encode input and the track configuration are selected
 * by one tag, so neither can describe a product the other cannot produce.
 *
 * Members are compared one at a time because a deferred indexed access over an
 * `Extract` union resolves alone but not inside a tuple.
 */
export type EncodeInputIsCorrelatedToItsTracks = Assert<
  Equal<
    [
      Equal<
        MediaEncodeRequest<'audio-only', unknown, unknown, MediaLawEncodeA>['input'],
        CaseOf<MediaTrackSources<unknown, unknown>, 'audio-only'>
      >,
      Equal<
        MediaEncodeRequest<'audio-only', unknown, unknown, MediaLawEncodeA>['tracks'],
        CaseOf<MediaTrackConfiguration, 'audio-only'>
      >,
      'video' extends keyof CaseOf<MediaTrackSources<unknown, unknown>, 'audio-only'> ? true : false,
      'audio' extends keyof CaseOf<MediaTrackSources<unknown, unknown>, 'video-only'> ? true : false,
      TagOf<MediaTrackSources<unknown, unknown>>,
    ],
    [true, true, false, false, MediaTrackTag]
  >
>;


/**
 * Compile-time law: encoding consumes a source and produces a source.
 *
 * Neither side is a tuple. A tuple at either end reintroduces the memory wall
 * that made long-form rendering impossible, one stage apart.
 */
export type EncodingIsSourceToSourceNotTupleToTuple = Assert<
  Equal<
    [
      // Decode too, and on the audio arm. Read as members rather than by
      // varying a type argument: collapsing a source to a tuple leaves the
      // source parameter unused, and an unused parameter is a hygiene death no
      // named law can attribute.
      Equal<
        CaseOf<
          MediaDecodeProduct<
            'video-only',
            MediaLawRepA,
            MediaLawAssetA,
            MediaLawRevisionA,
            MediaLawDecodeA,
            MediaLawSourceA
          >['output'],
          'video-only'
        >['video'],
        MediaSource<DecodedFrame<MediaLawRepA, MediaLawAssetA, MediaLawDecodeA>, MediaLawSourceA>
      >,
      // The audio arm yields sample blocks, not frames. Without this the track
      // algebra could describe an audio-only product no decode could produce.
      Equal<
        CaseOf<
          MediaDecodeProduct<
            'audio-only',
            MediaLawRepA,
            MediaLawAssetA,
            MediaLawRevisionA,
            MediaLawDecodeA,
            MediaLawSourceA,
            MediaLawSourceA
          >['output'],
          'audio-only'
        >['audio'],
        MediaSource<
          DecodedSampleBlock<MediaLawRepA, MediaLawAssetA, MediaLawDecodeA>,
          MediaLawSourceA
        >
      >,
      Equal<
        MediaEncodeProduct<'video-only', MediaLawEncodeA, MediaLawSourceA>['packets'],
        MediaSource<MediaPacket<MediaLawEncodeA, MediaLawSourceA>, MediaLawSourceA>
      >,
      MediaEncodeProduct<'video-only', MediaLawEncodeA, MediaLawSourceA>['packets'] extends readonly unknown[]
        ? true
        : false,
      CaseOf<MediaTrackSources<unknown, unknown>, 'video-only'>['video'] extends readonly unknown[]
        ? true
        : false,
    ],
    [true, true, true, false, false]
  >
>;


/**
 * Compile-time law: a packet names the source, track, and profile that produced
 * it, and carries its own sequence.
 *
 * Without the track relation, a mux can assemble a container whose roster its
 * packets never had — an artifact naming its bytes truthfully while lying about
 * what media they contain.
 */
export type APacketNamesItsSourceTrackAndProfile = Assert<
  Equal<
    [
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackA>['source'],
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackA>['track'],
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackA>['profile'],
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackA>['sequence'] extends StreamSequence
        ? true
        : false,
      MediaPacket<MediaLawEncodeA, MediaLawSourceA, MediaLawTrackB> extends MediaPacket<
        MediaLawEncodeA,
        MediaLawSourceA,
        MediaLawTrackA
      >
        ? true
        : false,
    ],
    [
      MediaSourceReference<MediaLawSourceA>,
      MediaTrackReference<MediaLawTrackA>,
      EncodeProfileReference<MediaLawEncodeA>,
      true,
      false,
    ]
  >
>;


/**
 * Compile-time law: the artifact's track configuration is the exact one the mux
 * consumed, its bytes are producer-derived, and its identity is caller-carried.
 */
export type AnArtifactCannotManufactureItsRoster = Assert<
  Equal<
    [
      Equal<
        MediaArtifact<'audio-video', MediaLawAssetA, MediaLawContainerA, MediaLawTrackA, MediaLawTrackB>['tracks'],
        CaseOf<MediaTrackConfiguration<MediaLawTrackA, MediaLawTrackB>, 'audio-video'>
      >,
      MediaArtifact['asset'] extends MediaAssetReference ? true : false,
      MediaArtifact['address'] extends ContentAddress ? true : false,
      MediaArtifact['digest'] extends ContentDigest ? true : false,
      MediaArtifact<
        'video-only',
        MediaLawAssetA,
        ContainerProfileId<'liteship.media.law.container-b'>
      > extends MediaArtifact<'video-only', MediaLawAssetA, MediaLawContainerA>
        ? true
        : false,
    ],
    [true, true, true, true, false]
  >
>;


/**
 * Compile-time law: every codec operation consumes an admitted profile.
 *
 * This is what makes a total contract honest. A bare profile reference is a
 * branded identity anyone can mint, so a total operation over it would promise
 * output for codecs this host has never heard of. Admission is the host's
 * answer; the core contract is total only over what was already admitted.
 */
export type CodecOperationsConsumeAdmittedProfiles = Assert<
  Equal<
    [
      Equal<
        MediaDecodeRequest<MediaLawAssetA, MediaLawRevisionA, MediaLawDecodeA>['profile'],
        AdmittedProfile<DecodeProfileReference<MediaLawDecodeA>>
      >,
      Equal<
        MediaEncodeRequest<'video-only', unknown, unknown, MediaLawEncodeA>['profile'],
        AdmittedProfile<EncodeProfileReference<MediaLawEncodeA>>
      >,
      Equal<
        MediaMuxRequest<
          'video-only',
          MediaLawEncodeA,
          MediaLawSourceA,
          MediaLawContainerA,
          MediaLawAssetA
        >['container'],
        AdmittedProfile<ContainerProfileReference<MediaLawContainerA>>
      >,
      'admission' extends keyof AdmittedProfile<unknown> ? true : false,
    ],
    [true, true, true, true]
  >
>;


/**
 * Compile-time law: physical failure stays representable after admission.
 *
 * Totality means no compatibility-refusal arm, never that the work cannot fail.
 * A device can be lost, input can be malformed, capacity can run out.
 */
export type AdmissionDoesNotMakePhysicalWorkInfallible = Assert<
  Equal<
    [
      ReturnType<MediaDecoderAuthority['decode']> extends Result<unknown, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      ReturnType<MediaEncoderAuthority['encode']> extends Result<unknown, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      ReturnType<MediaMuxAuthority['finalize']> extends Result<unknown, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
    ],
    [true, true, true]
  >
>;


/**
 * Compile-time law: an analysis result is exact over the revision, algorithm,
 * parameters, and coordinate system that determined it, and events carry the
 * result rather than a bare payload.
 *
 * The event arm mattered: carrying raw `MediaAnalysis` bypassed the whole
 * identity the result exists to hold, so a strengthened result travelled the
 * stream as an anonymous number array.
 */
export type AnAnalysisResultNamesEverythingThatDeterminedIt = Assert<
  Equal<
    [
      MediaAnalysisResult<MediaLawAssetA, MediaLawRevisionA, MediaLawAlgorithmA>['revision'],
      MediaAnalysisResult<MediaLawAssetA, MediaLawRevisionA, MediaLawAlgorithmA>['profile']['algorithm'],
      MediaAnalysisResult['profile']['parameters'] extends CanonicalValue ? true : false,
      MediaAnalysisResult['profile']['coordinateSystem'] extends AnalysisCoordinateSystem ? true : false,
      'cache' extends keyof MediaAnalysisResult ? true : false,
      CaseOf<MediaEvent, 'analysis'>['result'] extends MediaAnalysisResult ? true : false,
    ],
    [
      RevisionReference<MediaLawRevisionA>,
      AnalysisAlgorithmReference<MediaLawAlgorithmA>,
      true,
      true,
      true,
      true,
    ]
  >
>;


/** Compile-time law: one export decision answers for the request it carries. */
export type AnExportDecisionBindsItsRequestAndDisposition = Assert<
  Equal<
    [MediaExportDecision['request'], MediaExportDecision['disposition']],
    [MediaExportRequest, MediaExportDisposition]
  >
>;


/**
 * Compile-time law: the three export dispositions answer three different
 * questions, and an unavailable one cannot be silent.
 */
export type AnExportDecisionCarriesOneDisposition = Assert<
  Equal<
    [
      TagOf<MediaExportDisposition>,
      keyof CaseOf<MediaExportDisposition, 'semantic-projection'>,
      keyof CaseOf<MediaExportDisposition, 'host-capture'>,
      keyof CaseOf<MediaExportDisposition, 'unavailable'>,
      readonly Diagnostic[] extends CaseOf<MediaExportDisposition, 'unavailable'>['diagnostics']
        ? true
        : false,
    ],
    [
      'semantic-projection' | 'host-capture' | 'unavailable',
      '_tag' | 'fidelity',
      '_tag' | 'profile',
      '_tag' | 'diagnostics' | 'remediation',
      false,
    ]
  >
>;


/**
 * Compile-time law: decode, encode, and mux are three typed holes whose
 * contracts core fixes.
 */
export type CodecRequirementsAreTypedHoles = Assert<
  Equal<
    [
      MediaDecoderRequirement extends Hole<'liteship.media.decoder', MediaDecoderAuthority> ? true : false,
      MediaEncoderRequirement extends Hole<'liteship.media.encoder', MediaEncoderAuthority> ? true : false,
      MediaMuxRequirement extends Hole<'liteship.media.mux', MediaMuxAuthority> ? true : false,
    ],
    [true, true, true]
  >
>;
