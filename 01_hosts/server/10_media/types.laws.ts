/**
 * Compile-time laws for `01_hosts/server/10_media`.
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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { SchemaId, SchemaReference } from '../../../00_core/03_schema/types.js';
import type { SampleIndex } from '../../../00_core/04_time/types.js';
import type { ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type { EncodeProfileReference, MediaCut, MediaDecoderRequirement, MediaEncoderRequirement, MediaFrame, MediaMuxRequirement, MediaRepresentationId, MediaSource, MediaSourceId, SampleRate } from '../../../00_core/12_media/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Result, Signature, TagOf } from '../../../types.js';
import type { AdmittedPath, FilesystemRootId } from '../03_filesystem/types.js';
import type { ToolId, ToolProfile, ToolProfileId } from '../07_tool/types.js';
import type { MediaJobId, MediaJobReference, RenderProfileId, RenderProfileReference, ServerMediaAuthority, ServerMediaOffer, ServerMediaRequirement, ServerPhysicalFrame, ServerRenderJob, ServerRenderProfile, ServerRenderRequest, ServerSamplePosition } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That authored scene differences produce different pixels — never a flat fill
// — is the fidelity obligation this home exists to serve; it is proved at
// implementation, bound here by the frame source and cut the types refuse to
// lose.
// ---------------------------------------------------------------------------

type MediaLawContractA = SchemaId<'liteship.server.media.law.contract-a'>;

type MediaLawFrameA = MediaFrame<'liteship.server.media.law.state-a'>;

type MediaLawFrameB = MediaFrame<'liteship.server.media.law.state-b'>;

type MediaLawRepA = MediaRepresentationId<'liteship.server.media.law.representation-a'>;

type MediaLawRenderA = RenderProfileId<'liteship.server.media.law.render-a'>;

type MediaLawRenderB = RenderProfileId<'liteship.server.media.law.render-b'>;

type MediaLawToolA = ToolId<'liteship.server.media.law.tool-a'>;

type MediaLawProfileA = ToolProfileId<'liteship.server.media.law.profile-a'>;

type MediaLawProfileB = ToolProfileId<'liteship.server.media.law.profile-b'>;

type MediaLawRootA = FilesystemRootId<'liteship.server.media.law.root-a'>;

type MediaLawJobA = MediaJobId<'liteship.server.media.law.job-a'>;

type MediaLawSourceA = MediaSourceId<'liteship.server.media.law.source-a'>;


type RenderLawJobA = ServerRenderJob<
  MediaLawRepA,
  MediaLawContractA,
  MediaLawFrameA,
  MediaLawRenderA,
  MediaLawToolA,
  MediaLawProfileA,
  MediaLawRootA,
  MediaLawJobA,
  MediaLawSourceA
>;


/**
 * Compile-time law: a render job produces a bounded frame source, not a tuple
 * and not a schema.
 *
 * The source is what makes long-form work possible. A tuple here is the memory
 * wall; a schema here is the flat-fill renderer that emitted a valid file
 * containing none of the authored work.
 */
export type ARenderJobProducesABoundedFrameSource = Assert<
  Equal<
    [
      Equal<
        RenderLawJobA['frames'],
        MediaSource<ServerPhysicalFrame<MediaLawRepA, MediaLawFrameA, MediaLawRenderA>, MediaLawSourceA>
      >,
      RenderLawJobA['frames'] extends readonly unknown[] ? true : false,
      RenderLawJobA['frames'] extends SchemaReference ? true : false,
    ],
    [true, false, false]
  >
>;


/**
 * Compile-time law: a render job binds its exact cut, contract, render profile,
 * tool profile, and destination, and carries no sample position beside the cut.
 */
export type ARenderJobBindsItsCutAndProfiles = Assert<
  Equal<
    [
      // The job's own identity, the program revision it rendered, and the
      // request's destination. All read as members: broadening any of them
      // leaves its parameter either still used elsewhere or unused entirely, so
      // substitutability and hygiene both fail to notice.
      RenderLawJobA['id'],
      RenderLawJobA['source'],
      ServerRenderRequest<
        MediaLawContractA,
        MediaLawFrameA,
        MediaLawRenderA,
        MediaLawToolA,
        MediaLawProfileA,
        MediaLawRootA,
        MediaLawJobA
      >['destination'],
      RenderLawJobA['cut'] extends MediaCut ? true : false,
      RenderLawJobA['contract'],
      RenderLawJobA['render'],
      RenderLawJobA['tool'],
      RenderLawJobA['destination'],
      'position' extends keyof RenderLawJobA ? true : false,
    ],
    [
      MediaJobReference<MediaLawJobA>,
      ContentAddress<'application/vnd.liteship.program+cbor'>,
      AdmittedPath<MediaLawRootA>,
      true,
      SchemaReference<MediaLawContractA, MediaLawFrameA>,
      ServerRenderProfile<MediaLawRenderA>,
      ToolProfile<MediaLawToolA, MediaLawProfileA>,
      AdmittedPath<MediaLawRootA>,
      false,
    ]
  >
>;


/**
 * Compile-time law: the render profile is its own stage's profile, with its own
 * reproducibility claim.
 *
 * Borrowing the encode profile here attached a claim about rasterization to a
 * description of the codec that runs afterwards.
 */
export type TheRenderStageOwnsItsOwnProfile = Assert<
  Equal<
    [
      // Read the profile off the frame's own provenance. Swapping the alias to
      // an encode profile leaves the render parameter unused, and an unused
      // parameter is a hygiene death no named law can attribute — the mutation
      // would die on TS6196 and be refused rather than caught.
      CaseOf<
        ServerPhysicalFrame<MediaLawRepA, MediaLawFrameA, MediaLawRenderA>['provenance'],
        'rasterized'
      >['profile'],
      ServerRenderProfile<MediaLawRenderA>['reproducibility'] extends ReproducibilityClaim<
        RenderProfileReference<MediaLawRenderA>
      >
        ? true
        : false,
      TagOf<ServerRenderProfile<MediaLawRenderA>['reproducibility']>,
      EncodeProfileReference extends RenderProfileReference ? true : false,
    ],
    [
      RenderProfileReference<MediaLawRenderA>,
      true,
      'unclaimed' | 'reproducible-under-profile' | 'observed-variable',
      false,
    ]
  >
>;


/**
 * Compile-time law: rendering is ancestry-correlated, and every exactness axis
 * survives the provider path.
 *
 * The frame, render profile, and tool profile are varied one at a time. A law
 * that varies them together stays green when exactly one parameter stops being
 * load-bearing — and the tool profile is the one that was erased before, so two
 * admitted builds of the same binary were freely interchangeable.
 */
export type RenderThreadsTheRequestAncestry = Assert<
  Equal<
    [
      ServerMediaAuthority['renderFrames'] extends (
        request: ServerRenderRequest<
          MediaLawContractA,
          MediaLawFrameA,
          MediaLawRenderA,
          MediaLawToolA,
          MediaLawProfileA,
          MediaLawRootA,
          MediaLawJobA
        >,
      ) => Result<RenderLawJobA, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      ServerRenderJob<
        MediaLawRepA,
        MediaLawContractA,
        MediaLawFrameB,
        MediaLawRenderA,
        MediaLawToolA,
        MediaLawProfileA,
        MediaLawRootA,
        MediaLawJobA,
        MediaLawSourceA
      > extends RenderLawJobA
        ? true
        : false,
      ServerRenderJob<
        MediaLawRepA,
        MediaLawContractA,
        MediaLawFrameA,
        MediaLawRenderB,
        MediaLawToolA,
        MediaLawProfileA,
        MediaLawRootA,
        MediaLawJobA,
        MediaLawSourceA
      > extends RenderLawJobA
        ? true
        : false,
      ServerRenderJob<
        MediaLawRepA,
        MediaLawContractA,
        MediaLawFrameA,
        MediaLawRenderA,
        MediaLawToolA,
        MediaLawProfileB,
        MediaLawRootA,
        MediaLawJobA,
        MediaLawSourceA
      > extends RenderLawJobA
        ? true
        : false,
    ],
    [true, false, false, false]
  >
>;


/**
 * Compile-time law: this host fills core's codec sockets and declares none of
 * its own.
 *
 * A server-local decode, encode, or mux contract would be a second vocabulary
 * beside core's, which is the state this fold found and removed.
 */
export type TheServerFillsTheCoreCodecSockets = Assert<
  Equal<
    [
      ServerMediaOffer['provides'],
      'decode' extends keyof ServerMediaAuthority ? true : false,
      'encode' extends keyof ServerMediaAuthority ? true : false,
      'finalize' extends keyof ServerMediaAuthority ? true : false,
      'renderFrames' extends keyof ServerMediaAuthority ? true : false,
    ],
    [
      readonly [
        ServerMediaRequirement,
        MediaDecoderRequirement,
        MediaEncoderRequirement,
        MediaMuxRequirement,
      ],
      false,
      false,
      false,
      true,
    ]
  >
>;


/** Compile-time law: the sample position is core's coordinate — index at a rate. */
export type ThePositionIsTheCoreCoordinate = Assert<
  Equal<[ServerSamplePosition['sample'], ServerSamplePosition['rate']], [SampleIndex, SampleRate]>
>;


/** Compile-time law: a render job is cancellable job-exactly, and owned. */
export type AJobIsReceiptedCancellableAndOwned = Assert<
  Equal<
    [RenderLawJobA['lifecycle'], RenderLawJobA['cancel']],
    [
      CaseOf<RealizationLifecycle, 'owned'>,
      Signature<MediaJobReference<MediaLawJobA>, MediaJobReference<MediaLawJobA>, NonEmptyTuple<Diagnostic>>,
    ]
  >
>;
