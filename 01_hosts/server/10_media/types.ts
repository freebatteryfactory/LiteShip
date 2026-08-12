/**
 * Server media: native decode, render, encode, and mux resources.
 *
 * This home owns server-physical media providers and job resources. Four
 * relationships live here and stay apart: decoding an admitted file into
 * physical frames, rendering an exact semantic cut into physical frames,
 * encoding actual frames into media packets under an exact profile, and
 * muxing those packets into an addressed media artifact.
 *
 * They are four operations because they make four different claims. Collapsing
 * them produced a single `render` that accepted a schema *describing* a frame
 * and emitted bytes framed as network chunks — a job that could be satisfied
 * without a frame ever existing, whose output could not be told from traffic.
 *
 * The ancestry is threaded, not merely present: each job carries the exact
 * profile, tool, roots, asset, and identity its request named, and the exact
 * `FileStream` the filesystem provider returns enters without erasure. It
 * consumes core scene, media, and casting meaning and composes with the tool
 * and filesystem homes — it never copies their semantics, and it never defines
 * the semantic media model.
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
import type { SemanticCut } from '../../../00_core/08_state/types.js';
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
  MediaFrame,
  MediaPacket,
  MediaTrackConfiguration,
  PhysicalFrame,
  SampleRate,
} from '../../../00_core/12_media/types.js';
import type { SampleIndex } from '../../../00_core/04_time/types.js';
import type { RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerRealizationOffer } from '../00_bootstrap/types.js';
import type { FilesystemRequirement } from '../03_filesystem/types.js';
import type { AdmittedPath, FilesystemRootId, FileStream } from '../03_filesystem/types.js';
import type { ToolAuthorityRequirement, ToolId, ToolProfile } from '../07_tool/types.js';

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

/** Bounded media streaming shape — backpressure, never a numeric constant. */
export interface MediaBufferBound {
  readonly bounded: true;
}

/**
 * The server's physical frame payload: addressed pixel or sample bytes on the
 * filesystem side of the boundary.
 *
 * Named here rather than in core because it is a server-physical fact. Core
 * owns the frame envelope and leaves the payload open precisely so a browser
 * `VideoFrame` and a native buffer can both inhabit it without either becoming
 * the semantic model.
 */
export interface ServerFramePayload {
  readonly bytes: ContentAddress;
}

/** One physical frame as this host produces and consumes it. */
export type ServerPhysicalFrame = PhysicalFrame<ServerFramePayload, MediaFrame, EncodeProfileReference>;

/**
 * One media packet stream: bound to the exact job that opened it and to the
 * exact encode profile its packets were produced under.
 *
 * The received values are media packets. They were previously the network
 * home's `ServerEncodedChunk`, which meant this stream could not distinguish an
 * access unit from a container segment from bytes off a socket — the media path
 * borrowing transport framing for its own output vocabulary.
 */
export interface MediaPacketStream<Id extends MediaJobId, Profile extends EncodeProfileId> {
  readonly job: MediaJobReference<Id>;
  readonly buffer: MediaBufferBound;
  readonly receive: Signature<
    MediaBufferBound,
    readonly MediaPacket<Profile>[],
    NonEmptyTuple<Diagnostic>
  >;
  readonly close: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

/** Decoding an admitted physical file into physical frames under an exact profile. */
export interface ServerDecodeRequest<
  Profile extends DecodeProfileId,
  Tool extends ToolId,
  In extends FilesystemRootId,
  Id extends MediaJobId,
> {
  readonly job: MediaJobReference<Id>;
  readonly profile: DecodeProfileReference<Profile>;
  readonly tool: ToolProfile<Tool>;
  readonly input: FileStream<In>;
}

export interface ServerDecodeJob<
  Profile extends DecodeProfileId,
  Tool extends ToolId,
  In extends FilesystemRootId,
  Id extends MediaJobId,
> {
  readonly id: MediaJobReference<Id>;
  readonly profile: DecodeProfileReference<Profile>;
  readonly tool: ToolProfile<Tool>;
  readonly input: FileStream<In>;
  readonly frames: readonly ServerPhysicalFrame[];
  readonly reproducibility: ReproducibilityClaim<DecodeProfileReference<Profile>>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Rendering one exact semantic cut into physical frames.
 *
 * The cut is the coordinate; the contract is the schema the admitted frames
 * obey. The contract may stay — it says what shape a frame has — but it can no
 * longer stand in for the frames themselves, which is what let a flat-fill
 * renderer satisfy this path with the authored scene missing from the pixels.
 */
export interface ServerRenderRequest<
  Contract extends SchemaId,
  Tool extends ToolId,
  Out extends FilesystemRootId,
  Id extends MediaJobId,
> {
  readonly job: MediaJobReference<Id>;
  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly cut: SemanticCut;
  readonly position: ServerSamplePosition;
  readonly contract: SchemaReference<Contract, MediaFrame>;
  readonly tool: ToolProfile<Tool>;
  readonly destination: AdmittedPath<Out>;
}

export interface ServerMediaJob<
  Contract extends SchemaId,
  Tool extends ToolId,
  Out extends FilesystemRootId,
  Id extends MediaJobId,
> {
  readonly id: MediaJobReference<Id>;
  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly cut: SemanticCut;
  readonly position: ServerSamplePosition;
  readonly contract: SchemaReference<Contract, MediaFrame>;
  readonly tool: ToolProfile<Tool>;
  readonly destination: AdmittedPath<Out>;
  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------

/**
 * Encoding actual frames into packets under an exact profile.
 *
 * `frames` is a non-empty tuple of real frames. Zero frames cannot become a
 * successful encode, and no schema reference appears anywhere on this path.
 */
export interface ServerEncodeRequest<
  Profile extends EncodeProfileId,
  Tool extends ToolId,
  Id extends MediaJobId,
> {
  readonly job: MediaJobReference<Id>;
  readonly profile: EncodeProfileReference<Profile>;
  readonly tool: ToolProfile<Tool>;
  readonly tracks: MediaTrackConfiguration;
  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;
}

export interface ServerEncodeJob<
  Profile extends EncodeProfileId,
  Tool extends ToolId,
  Id extends MediaJobId,
> {
  readonly id: MediaJobReference<Id>;
  readonly profile: EncodeProfileReference<Profile>;
  readonly tool: ToolProfile<Tool>;
  readonly tracks: MediaTrackConfiguration;
  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;
  readonly open: Signature<
    MediaJobReference<Id>,
    MediaPacketStream<Id, Profile>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Mux
// ---------------------------------------------------------------------------

/**
 * Muxing packets into an addressed artifact at an admitted destination.
 *
 * Separate from encode because the reproducibility subject is different. Two
 * runs may emit identical packets and different container bytes — muxer
 * metadata, ordering, and timestamps are the container's business — so the
 * claim that survives here is over the whole artifact, not the elementary
 * stream.
 */
export interface ServerMuxRequest<
  Profile extends EncodeProfileId,
  Container extends ContainerProfileId,
  Asset extends MediaAssetId,
  Out extends FilesystemRootId,
  Id extends MediaJobId,
> {
  readonly job: MediaJobReference<Id>;
  readonly asset: MediaAssetReference<Asset>;
  readonly container: ContainerProfileReference<Container>;
  readonly packets: NonEmptyTuple<MediaPacket<Profile>>;
  readonly destination: AdmittedPath<Out>;
}

export interface ServerMuxJob<
  Profile extends EncodeProfileId,
  Container extends ContainerProfileId,
  Asset extends MediaAssetId,
  Out extends FilesystemRootId,
  Id extends MediaJobId,
> {
  readonly id: MediaJobReference<Id>;
  readonly container: ContainerProfileReference<Container>;
  readonly packets: NonEmptyTuple<MediaPacket<Profile>>;
  readonly destination: AdmittedPath<Out>;
  readonly artifact: MediaArtifact<Asset, Container>;
  readonly reproducibility: ReproducibilityClaim<ContainerProfileReference<Container>>;
  readonly receipt: ContentAddress<'application/vnd.liteship.server-media-output+cbor'>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// The provider
// ---------------------------------------------------------------------------

/**
 * The server media provider: four ancestry-correlated operations, each
 * returning a job that speaks exactly the profile, tool, roots, asset, and
 * identity its request named.
 */
export interface ServerMediaAuthority {
  readonly decode: <
    Profile extends DecodeProfileId,
    Tool extends ToolId,
    In extends FilesystemRootId,
    Id extends MediaJobId,
  >(
    request: ServerDecodeRequest<Profile, Tool, In, Id>,
  ) => Result<ServerDecodeJob<Profile, Tool, In, Id>, NonEmptyTuple<Diagnostic>>;

  readonly render: <
    Contract extends SchemaId,
    Tool extends ToolId,
    Out extends FilesystemRootId,
    Id extends MediaJobId,
  >(
    request: ServerRenderRequest<Contract, Tool, Out, Id>,
  ) => Result<ServerMediaJob<Contract, Tool, Out, Id>, NonEmptyTuple<Diagnostic>>;

  readonly encode: <Profile extends EncodeProfileId, Tool extends ToolId, Id extends MediaJobId>(
    request: ServerEncodeRequest<Profile, Tool, Id>,
  ) => Result<ServerEncodeJob<Profile, Tool, Id>, NonEmptyTuple<Diagnostic>>;

  readonly finalize: <
    Profile extends EncodeProfileId,
    Container extends ContainerProfileId,
    Asset extends MediaAssetId,
    Out extends FilesystemRootId,
    Id extends MediaJobId,
  >(
    request: ServerMuxRequest<Profile, Container, Asset, Out, Id>,
  ) => Result<ServerMuxJob<Profile, Container, Asset, Out, Id>, NonEmptyTuple<Diagnostic>>;
}

export type ServerMediaRequirement = Hole<'liteship.server.media', ServerMediaAuthority>;

/** Constructing the media provider over tools and scoped filesystem. */
export interface ServerMediaOffer
  extends ServerRealizationOffer<
    readonly [ServerMediaRequirement],
    readonly [ToolAuthorityRequirement, FilesystemRequirement],
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
// That authored scene differences produce different semantic frames and
// meaningful output — never a flat fill — is the fidelity obligation this
// home exists to serve; it is proved at implementation, bound here by the
// frame population and source-revision the types refuse to lose.
// ---------------------------------------------------------------------------

type MediaLawContractA = SchemaId<'liteship.server.media.law.contract-a'>;
type MediaLawContractB = SchemaId<'liteship.server.media.law.contract-b'>;
type MediaLawToolA = ToolId<'liteship.server.media.law.tool-a'>;
type MediaLawRootA = FilesystemRootId<'liteship.server.media.law.root-a'>;
type MediaLawJobA = MediaJobId<'liteship.server.media.law.job-a'>;
type MediaLawJobB = MediaJobId<'liteship.server.media.law.job-b'>;
type MediaLawEncodeA = EncodeProfileId<'liteship.server.media.law.encode-a'>;
type MediaLawEncodeB = EncodeProfileId<'liteship.server.media.law.encode-b'>;
type MediaLawContainerA = ContainerProfileId<'liteship.server.media.law.container-a'>;
type MediaLawAssetA = MediaAssetId<'liteship.server.media.law.asset-a'>;

type RenderLawJobA = ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawJobA>;

/**
 * Compile-time law: a render job binds its exact source revision, its exact
 * cut, its exact frame contract, its exact tool profile, its exact
 * destination, and an actual non-empty frame population — the physical
 * relationships, not merely a field census.
 *
 * The frame member is the one that matters most. Its removal is a one-line
 * change that leaves every other member intact and returns this path to a
 * schema describing frames nobody produced.
 */
export type AJobBindsItsSourceRevision = Assert<
  Equal<
    [
      RenderLawJobA['source'],
      RenderLawJobA['contract'],
      RenderLawJobA['tool'],
      RenderLawJobA['destination'],
      RenderLawJobA['frames'] extends NonEmptyTuple<ServerPhysicalFrame> ? true : false,
      readonly ServerPhysicalFrame[] extends RenderLawJobA['frames'] ? true : false,
      RenderLawJobA['cut'] extends SemanticCut ? true : false,
      ServerMediaJob<MediaLawContractB, MediaLawToolA, MediaLawRootA, MediaLawJobA> extends RenderLawJobA
        ? true
        : false,
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawJobB> extends RenderLawJobA
        ? true
        : false,
    ],
    [
      ContentAddress<'application/vnd.liteship.program+cbor'>,
      SchemaReference<MediaLawContractA, MediaFrame>,
      ToolProfile<MediaLawToolA>,
      AdmittedPath<MediaLawRootA>,
      true,
      false,
      true,
      false,
      false,
    ]
  >
>;

/**
 * Compile-time law: rendering is ancestry-correlated through the provider's
 * generic operation — a request naming contract A, tool A, root A, and job A
 * yields a job of exactly those identities.
 */
export type RenderThreadsTheRequestAncestry = Assert<
  Equal<
    [
      ServerMediaAuthority['render'] extends (
        request: ServerRenderRequest<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawJobA>,
      ) => Result<RenderLawJobA, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      ServerRenderRequest<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawJobA>['job'],
      ServerRenderRequest<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawJobA>['tool'],
    ],
    [true, MediaJobReference<MediaLawJobA>, ToolProfile<MediaLawToolA>]
  >
>;

type DecodeLawProfileA = DecodeProfileId<'liteship.server.media.law.decode-a'>;

/**
 * Compile-time law: decode binds the exact physical stream it was handed, on
 * both the request and the job it returns.
 *
 * Read as members rather than by varying the type argument: broadening
 * `FileStream<In>` to `FileStream` leaves `In` with no remaining use, and an
 * unused type parameter is a hygiene death the harness reports as
 * `CAUGHT-UNNAMED` and refuses to score. A law that can only be reached that
 * way is not a law.
 */
export type ADecodeBindsItsPhysicalInput = Assert<
  Equal<
    [
      ServerDecodeRequest<DecodeLawProfileA, MediaLawToolA, MediaLawRootA, MediaLawJobA>['input'],
      ServerDecodeJob<DecodeLawProfileA, MediaLawToolA, MediaLawRootA, MediaLawJobA>['input'],
      ServerDecodeJob<DecodeLawProfileA, MediaLawToolA, MediaLawRootA, MediaLawJobA>['tool'],
      ServerDecodeJob<
        DecodeLawProfileA,
        MediaLawToolA,
        MediaLawRootA,
        MediaLawJobA
      >['reproducibility'] extends ReproducibilityClaim<DecodeProfileReference<DecodeLawProfileA>>
        ? true
        : false,
    ],
    [
      FileStream<MediaLawRootA>,
      FileStream<MediaLawRootA>,
      ToolProfile<MediaLawToolA>,
      true,
    ]
  >
>;

/**
 * Compile-time law: an encode consumes real frames and opens a packet stream
 * exact over both its job and its profile.
 *
 * A stream of job B is not a stream of job A, and a stream of profile B is not
 * a stream of profile A. The second half is what stops packets encoded under
 * one profile from being reported under another.
 */
export type AnEncodeConsumesFramesAndStreamsPackets = Assert<
  Equal<
    [
      ServerEncodeRequest<MediaLawEncodeA, MediaLawToolA, MediaLawJobA>['frames'] extends NonEmptyTuple<
        ServerPhysicalFrame
      >
        ? true
        : false,
      ServerEncodeJob<MediaLawEncodeA, MediaLawToolA, MediaLawJobA>['open'],
      MediaPacketStream<MediaLawJobB, MediaLawEncodeA> extends MediaPacketStream<
        MediaLawJobA,
        MediaLawEncodeA
      >
        ? true
        : false,
      MediaPacketStream<MediaLawJobA, MediaLawEncodeB> extends MediaPacketStream<
        MediaLawJobA,
        MediaLawEncodeA
      >
        ? true
        : false,
      // The `job` member is read directly. Substitutability alone stays exact
      // while this member broadens, because `close` also carries the identity —
      // so the stream keeps refusing a foreign job while its own report of
      // which job it belongs to has quietly gone generic.
      MediaPacketStream<MediaLawJobA, MediaLawEncodeA>['job'],
    ],
    [
      true,
      Signature<
        MediaJobReference<MediaLawJobA>,
        MediaPacketStream<MediaLawJobA, MediaLawEncodeA>,
        NonEmptyTuple<Diagnostic>
      >,
      false,
      false,
      MediaJobReference<MediaLawJobA>,
    ]
  >
>;

/**
 * Compile-time law: a packet stream yields media packets, and network framing
 * cannot satisfy it.
 *
 * The comparison is structural rather than a comment, because the two types are
 * both "bytes with some metadata" and only their members keep them apart.
 */
export type APacketStreamYieldsMediaPacketsNotTransportFraming = Assert<
  Equal<
    [
      MediaPacket<MediaLawEncodeA>['profile'],
      MediaPacket<MediaLawEncodeA>['time'] extends { readonly sample: SampleIndex } ? true : false,
      MediaPacket<MediaLawEncodeB> extends MediaPacket<MediaLawEncodeA> ? true : false,
    ],
    [EncodeProfileReference<MediaLawEncodeA>, true, false]
  >
>;

/**
 * Compile-time law: the mux stage owns the artifact, and its reproducibility
 * claim is over the container rather than the encoder.
 *
 * One stage, one profile, one claim. An encode claim satisfying a container
 * obligation is how identical packets become a promise about a file nobody
 * compared.
 */
export type TheMuxStageOwnsTheArtifactClaim = Assert<
  Equal<
    [
      ServerMuxJob<
        MediaLawEncodeA,
        MediaLawContainerA,
        MediaLawAssetA,
        MediaLawRootA,
        MediaLawJobA
      >['artifact'],
      ServerMuxJob<
        MediaLawEncodeA,
        MediaLawContainerA,
        MediaLawAssetA,
        MediaLawRootA,
        MediaLawJobA
      >['reproducibility'],
      TagOf<ReproducibilityClaim<ContainerProfileReference<MediaLawContainerA>>>,
    ],
    [
      MediaArtifact<MediaLawAssetA, MediaLawContainerA>,
      ReproducibilityClaim<ContainerProfileReference<MediaLawContainerA>>,
      'unclaimed' | 'reproducible-under-profile' | 'observed-variable',
    ]
  >
>;

/**
 * Compile-time law: the four stages are four operations.
 *
 * Their collapse into one uninspectable call is the predecessor shape, and it
 * is a deletion away at all times.
 */
export type DecodeRenderEncodeAndMuxDoNotCollapse = Assert<
  Equal<
    [
      'decode' extends keyof ServerMediaAuthority ? true : false,
      'render' extends keyof ServerMediaAuthority ? true : false,
      'encode' extends keyof ServerMediaAuthority ? true : false,
      'finalize' extends keyof ServerMediaAuthority ? true : false,
    ],
    [true, true, true, true]
  >
>;

/** Compile-time law: the sample position is core's coordinate — index at a rate. */
export type ThePositionIsTheCoreCoordinate = Assert<
  Equal<[ServerSamplePosition['sample'], ServerSamplePosition['rate']], [SampleIndex, SampleRate]>
>;

/** Compile-time law: a mux job is receipted, cancellable job-exactly, and owned. */
export type AJobIsReceiptedCancellableAndOwned = Assert<
  Equal<
    [
      ServerMuxJob<
        MediaLawEncodeA,
        MediaLawContainerA,
        MediaLawAssetA,
        MediaLawRootA,
        MediaLawJobA
      >['receipt'],
      ServerMuxJob<
        MediaLawEncodeA,
        MediaLawContainerA,
        MediaLawAssetA,
        MediaLawRootA,
        MediaLawJobA
      >['lifecycle'],
      RenderLawJobA['cancel'],
    ],
    [
      ContentAddress<'application/vnd.liteship.server-media-output+cbor'>,
      CaseOf<RealizationLifecycle, 'owned'>,
      Signature<MediaJobReference<MediaLawJobA>, MediaJobReference<MediaLawJobA>, NonEmptyTuple<Diagnostic>>,
    ]
  >
>;

/** Type summary consumed by the server topology. */
export interface ServerMediaTypeSurface {
  readonly decodeJob: ServerDecodeJob<DecodeProfileId, ToolId, FilesystemRootId, MediaJobId>;
  readonly job: ServerMediaJob<SchemaId, ToolId, FilesystemRootId, MediaJobId>;
  readonly encodeJob: ServerEncodeJob<EncodeProfileId, ToolId, MediaJobId>;
  readonly muxJob: ServerMuxJob<
    EncodeProfileId,
    ContainerProfileId,
    MediaAssetId,
    FilesystemRootId,
    MediaJobId
  >;
  readonly stream: MediaPacketStream<MediaJobId, EncodeProfileId>;
  readonly frame: ServerPhysicalFrame;
  readonly position: ServerSamplePosition;
  readonly authority: ServerMediaAuthority;
  readonly mediaOffer: ServerMediaOffer;
}
