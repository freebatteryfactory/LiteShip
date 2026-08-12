/**
 * Server media: native render, and the core codec sockets this host fills.
 *
 * Two relationships live here. The first is server-physical frame production:
 * turning one exact semantic cut into a bounded source of physical frames,
 * under an exact render profile and an exact admitted tool profile. That
 * operation belongs to the server and to no one else — web graphics cannot own
 * it without making the offline path depend on a browser realm, and core cannot
 * own it without choosing between ffmpeg, a rasterizer, and a headless browser.
 *
 * The second is the codec side, which this host does not redeclare: decode,
 * encode, and mux are core's sockets, and the offer below provides them.
 * `render` used to span all four, accepting a schema *describing* a frame and
 * emitting bytes framed as network chunks — a job satisfiable without a frame
 * ever existing, whose output could not be told from traffic.
 *
 * Sources are bounded and lossless. A five-minute render cannot exist in memory
 * before encoding starts, and an operation returning every frame at once makes
 * that the only shape available.
 *
 * @module
 */

import type {
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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { SchemaId, SchemaReference } from '../../../00_core/03_schema/types.js';
import type { ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type {
  CodecAdmission,
  ContainerProfileReference,
  DecodeProfileReference,
  EncodeProfileReference,
  MediaCut,
  MediaDecoderRequirement,
  MediaEncoderRequirement,
  MediaFrame,
  MediaMuxRequirement,
  MediaRepresentationId,
  MediaSource,
  MediaSourceId,
  RasterizedFrame,
  SampleRate,
} from '../../../00_core/12_media/types.js';
import type { SampleIndex } from '../../../00_core/04_time/types.js';
import type {
  GroundingId,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';
import type { FilesystemRequirement } from '../03_filesystem/types.js';
import type { AdmittedPath, FilesystemRootId } from '../03_filesystem/types.js';
import type { ToolAuthorityRequirement, ToolId, ToolProfile, ToolProfileId } from '../07_tool/types.js';

export type MediaJobId<Name extends string = string> = Brand<Name, 'liteship.server.media-job-id'>;
export type MediaJobReference<Id extends MediaJobId = MediaJobId> = Reference<
  'server-media-job',
  Id
>;

/** The semantic sample position consumed from core — never restated. */
export interface ServerSamplePosition {
  readonly sample: SampleIndex;
  readonly rate: SampleRate;
}

export type RenderProfileId<Name extends string = string> = Brand<
  Name,
  'liteship.server.render-profile-id'
>;
export type RenderProfileReference<Id extends RenderProfileId = RenderProfileId> = Reference<
  'server-render-profile',
  Id
>;

/**
 * Everything physical that decided how semantic state became pixels here.
 *
 * A render profile, not an encode profile. An earlier form used the encode
 * profile as the physical-frame profile, which said nothing about the
 * rasterizer, the font stack, or the colour pipeline that actually produced the
 * bytes — and attached the reproducibility claim for rasterization to a
 * description of the codec that would run afterwards.
 *
 * One stage, one profile, one claim.
 */
export interface ServerRenderProfile<Id extends RenderProfileId = RenderProfileId> {
  readonly id: RenderProfileReference<Id>;
  readonly configuration: ContentAddress<'application/vnd.liteship.server-render-profile+cbor'>;
  readonly reproducibility: ReproducibilityClaim<RenderProfileReference<Id>>;
}

/** One rasterized frame as this host produces it. */
export type ServerPhysicalFrame<
  Representation extends MediaRepresentationId = MediaRepresentationId,
  Frame extends MediaFrame = MediaFrame,
  Profile extends RenderProfileId = RenderProfileId,
> = RasterizedFrame<Representation, Frame, RenderProfileReference<Profile>>;

/**
 * Rendering one exact semantic cut into a bounded source of physical frames.
 *
 * The contract is the schema admitted frames obey; it may stay, because saying
 * what shape a frame has is useful. What it may no longer do is stand in for
 * the frames themselves, which is what let a flat-fill renderer satisfy this
 * path with the authored scene missing from the pixels.
 *
 * There is no sample position beside the cut. The media cut already owns the
 * frame and sample coordinate, and a sibling position is the same duplicate
 * coordinate this fold removed everywhere else.
 */
export interface ServerRenderRequest<
  Contract extends SchemaId = SchemaId,
  Frame extends MediaFrame = MediaFrame,
  Render extends RenderProfileId = RenderProfileId,
  Tool extends ToolId = ToolId,
  Profile extends ToolProfileId = ToolProfileId,
  Out extends FilesystemRootId = FilesystemRootId,
  Id extends MediaJobId = MediaJobId,
> {
  readonly job: MediaJobReference<Id>;
  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly cut: MediaCut;
  readonly contract: SchemaReference<Contract, Frame>;
  readonly render: ServerRenderProfile<Render>;
  readonly tool: ToolProfile<Tool, Profile>;
  readonly destination: AdmittedPath<Out>;
}

/**
 * One render job: the exact cut it rendered, the exact profiles it ran under,
 * and a bounded source of the frames it produced.
 */
export interface ServerRenderJob<
  Representation extends MediaRepresentationId = MediaRepresentationId,
  Contract extends SchemaId = SchemaId,
  Frame extends MediaFrame = MediaFrame,
  Render extends RenderProfileId = RenderProfileId,
  Tool extends ToolId = ToolId,
  Profile extends ToolProfileId = ToolProfileId,
  Out extends FilesystemRootId = FilesystemRootId,
  Id extends MediaJobId = MediaJobId,
  Source extends MediaSourceId = MediaSourceId,
> {
  readonly id: MediaJobReference<Id>;
  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly cut: MediaCut;
  readonly contract: SchemaReference<Contract, Frame>;
  readonly render: ServerRenderProfile<Render>;
  readonly tool: ToolProfile<Tool, Profile>;
  readonly destination: AdmittedPath<Out>;
  readonly frames: MediaSource<ServerPhysicalFrame<Representation, Frame, Render>, Source>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * The server media provider.
 *
 * It renders, and it fills core's codec sockets. It declares no decode, encode,
 * or mux contract of its own — those live in `00_core/12_media`, and a server
 * that redeclared them would be the second vocabulary this fold exists to
 * remove.
 */
export interface ServerMediaAuthority {
  readonly renderFrames: <
    Representation extends MediaRepresentationId,
    Contract extends SchemaId,
    Frame extends MediaFrame,
    Render extends RenderProfileId,
    Tool extends ToolId,
    Profile extends ToolProfileId,
    Out extends FilesystemRootId,
    Id extends MediaJobId,
    Source extends MediaSourceId,
  >(
    request: ServerRenderRequest<Contract, Frame, Render, Tool, Profile, Out, Id>,
  ) => Result<
    ServerRenderJob<Representation, Contract, Frame, Render, Tool, Profile, Out, Id, Source>,
    NonEmptyTuple<Diagnostic>
  >;
}

export type ServerMediaRequirement = Hole<'liteship.server.media', ServerMediaAuthority>;

/** Native codec admission: whether this machine's tools accept one profile. */
export interface ServerCodecAdmission {
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

export type ServerCodecAdmissionRequirement = Hole<
  'liteship.server.codec-admission',
  ServerCodecAdmission
>;

/**
 * Deployment grounding: which native codecs this machine admits.
 *
 * A deployment fact rather than an intrinsic one — the answer depends on which
 * ffmpeg build was installed beside the process, which is exactly the kind of
 * thing a deployment decides and a program discovers.
 */
export interface ServerCodecAdmissionGrounding
  extends ServerGroundingDefinition<
    readonly [ServerCodecAdmissionRequirement],
    unknown,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.codec-admission'>;
}

/** Constructing the media provider over tools and scoped filesystem. */
export interface ServerMediaOffer
  extends ServerRealizationOffer<
    readonly [
      ServerMediaRequirement,
      MediaDecoderRequirement,
      MediaEncoderRequirement,
      MediaMuxRequirement,
    ],
    readonly [ToolAuthorityRequirement, FilesystemRequirement, ServerCodecAdmissionRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.media-authority'>;
  readonly locations: NonEmptyTuple<'local'>;
  readonly backends: NonEmptyTuple<'host-native' | 'wasm'>;
}

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

/** Type summary consumed by the server topology. */
export interface ServerMediaTypeSurface {
  readonly renderProfile: ServerRenderProfile;
  readonly job: ServerRenderJob;
  readonly frame: ServerPhysicalFrame;
  readonly frameSource: MediaSource<ServerPhysicalFrame>;
  readonly admission: ServerCodecAdmission;
  readonly admissionGrounding: ServerCodecAdmissionGrounding;
  readonly position: ServerSamplePosition;
  readonly authority: ServerMediaAuthority;
  readonly mediaOffer: ServerMediaOffer;
}
