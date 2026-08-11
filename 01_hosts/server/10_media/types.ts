/**
 * Server media: native decode, analysis, render, and encode resources.
 *
 * This home owns server-physical media providers and job resources: native
 * media jobs bound to their exact source revision, core frame/sample
 * contract consumption, tool-profile composition, deterministic-output
 * evidence, backpressure shape, cancellation, receipts, and lifecycle. The
 * ancestry is threaded, not merely present: the provider's render operation
 * carries the exact frame contract, tool, input root, destination root, and
 * job identity from request to job to output stream, and the exact
 * `FileStream` the filesystem provider returns enters the request without
 * erasure — the upstream waterfall arrow composes. It consumes core scene,
 * media, and casting meaning and composes with the tool and filesystem homes
 * — it never copies their semantics, and it never defines the semantic media
 * model.
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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { SchemaId, SchemaReference } from '../../../00_core/03_schema/types.js';
import type { MediaFrame, SampleRate } from '../../../00_core/12_media/types.js';
import type { SampleIndex } from '../../../00_core/04_time/types.js';
import type { RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerRealizationOffer } from '../00_bootstrap/types.js';
import type { FilesystemRequirement } from '../03_filesystem/types.js';
import type { AdmittedPath, FilesystemRootId, FileStream } from '../03_filesystem/types.js';
import type { ServerEncodedChunk } from '../04_network/types.js';
import type { ToolAuthorityRequirement, ToolId, ToolReference } from '../07_tool/types.js';

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
 * One media output stream: bound to the exact job that opened it — the
 * stream cannot forget which job produced it, and its close names that same
 * job. The identity parameter has no default.
 */
export interface MediaOutputStream<Id extends MediaJobId> {
  readonly job: MediaJobReference<Id>;
  readonly buffer: MediaBufferBound;
  readonly receive: Signature<MediaBufferBound, readonly ServerEncodedChunk[], NonEmptyTuple<Diagnostic>>;
  readonly close: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** Deterministic-output evidence: a witness address, or an explicit refusal to claim it. */
export type MediaDeterminism = Algebra<{
  deterministic: {
    readonly witness: ContentAddress<'application/vnd.liteship.server-media-witness+cbor'>;
  };
  nondeterministic: {};
}>;

/**
 * One media job: bound to the exact source revision it renders, speaking the
 * core sample coordinate through the exact frame/sample contract, through
 * the exact tool, over the exact physical input stream and destination the
 * request named, streaming its output under a declared bound, with
 * determinism evidence, a receipt, and an owned lifecycle. The identity
 * parameters have no defaults — the job cannot forget which authored
 * content it rendered, which tool rendered it, which contract its frames
 * obey, which physical file fed it, where its output lands, or which job it
 * is: a job claiming contract, tool, roots, or identity the request never
 * named is unrepresentable on the provider path.
 */
export interface ServerMediaJob<
  Contract extends SchemaId,
  Tool extends ToolId,
  In extends FilesystemRootId,
  Out extends FilesystemRootId,
  Id extends MediaJobId,
> {
  readonly id: MediaJobReference<Id>;
  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly position: ServerSamplePosition;
  readonly contract: SchemaReference<Contract, MediaFrame>;
  readonly tool: ToolReference<Tool>;
  readonly input: FileStream<In>;
  readonly destination: AdmittedPath<Out>;
  readonly determinism: MediaDeterminism;
  readonly open: Signature<MediaJobReference<Id>, MediaOutputStream<Id>, NonEmptyTuple<Diagnostic>>;
  readonly output: ContentAddress<'application/vnd.liteship.server-media-output+cbor'>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * The complete job request: the caller-carried job identity, source
 * revision, position, the exact core frame contract being rendered, the
 * exact named tool, the exact physical input stream — the very
 * `FileStream<Root>` the filesystem provider returned, no erasure and no
 * cast — and the exact physical output destination. No naked render, and no
 * output whose physical inputs were never named.
 */
export interface MediaJobRequest<
  Contract extends SchemaId,
  Tool extends ToolId,
  In extends FilesystemRootId,
  Out extends FilesystemRootId,
  Id extends MediaJobId,
> {
  readonly job: MediaJobReference<Id>;
  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly position: ServerSamplePosition;
  readonly contract: SchemaReference<Contract, MediaFrame>;
  readonly tool: ToolReference<Tool>;
  readonly input: FileStream<In>;
  readonly destination: AdmittedPath<Out>;
}

/**
 * The server media provider: jobs are repeatable per-use resources, and
 * rendering is ancestry-correlated through the provider's generic operation
 * — the job the public path returns speaks exactly the contract, tool,
 * roots, and identity the request named.
 */
export interface ServerMediaAuthority {
  readonly render: <
    Contract extends SchemaId,
    Tool extends ToolId,
    In extends FilesystemRootId,
    Out extends FilesystemRootId,
    Id extends MediaJobId,
  >(
    request: MediaJobRequest<Contract, Tool, In, Out, Id>,
  ) => Result<ServerMediaJob<Contract, Tool, In, Out, Id>, NonEmptyTuple<Diagnostic>>;
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
// source-revision field the type refuses to lose.
// ---------------------------------------------------------------------------

type MediaLawContractA = SchemaId<'liteship.server.media.law.contract-a'>;
type MediaLawContractB = SchemaId<'liteship.server.media.law.contract-b'>;
type MediaLawToolA = ToolId<'liteship.server.media.law.tool-a'>;
type MediaLawRootA = FilesystemRootId<'liteship.server.media.law.root-a'>;
type MediaLawJobA = MediaJobId<'liteship.server.media.law.job-a'>;
type MediaLawJobB = MediaJobId<'liteship.server.media.law.job-b'>;

/**
 * Compile-time law: a job binds its exact source revision, its exact
 * frame/sample contract, its exact tool, the exact physical input and
 * destination, its determinism evidence, and a job-exact streaming path —
 * the physical relationships, not merely a field census. A job of another
 * contract or another identity is not this job, and the determinism witness
 * lives only on the deterministic arm.
 */
export type AJobBindsItsSourceRevision = Assert<
  Equal<
    [
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['source'],
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['contract'],
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['tool'],
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['input'],
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['destination'],
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['open'],
      ServerMediaJob<MediaLawContractB, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA> extends ServerMediaJob<
        MediaLawContractA,
        MediaLawToolA,
        MediaLawRootA,
        MediaLawRootA,
        MediaLawJobA
      >
        ? true
        : false,
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobB> extends ServerMediaJob<
        MediaLawContractA,
        MediaLawToolA,
        MediaLawRootA,
        MediaLawRootA,
        MediaLawJobA
      >
        ? true
        : false,
      TagOf<MediaDeterminism>,
      'witness' extends keyof CaseOf<MediaDeterminism, 'nondeterministic'> ? true : false,
    ],
    [
      ContentAddress<'application/vnd.liteship.program+cbor'>,
      SchemaReference<MediaLawContractA, MediaFrame>,
      ToolReference<MediaLawToolA>,
      FileStream<MediaLawRootA>,
      AdmittedPath<MediaLawRootA>,
      Signature<
        MediaJobReference<MediaLawJobA>,
        MediaOutputStream<MediaLawJobA>,
        NonEmptyTuple<Diagnostic>
      >,
      false,
      false,
      'deterministic' | 'nondeterministic',
      false,
    ]
  >
>;

/**
 * Compile-time law: rendering is ancestry-correlated through the provider's
 * generic operation — a request naming contract A, tool A, roots A, and job
 * A yields a job of exactly those identities, and the exact filesystem
 * stream is the request's input as-is. The output stream is job-exact: a
 * stream of job B is not a stream of job A.
 */
export type RenderThreadsTheRequestAncestry = Assert<
  Equal<
    [
      ServerMediaAuthority['render'] extends (
        request: MediaJobRequest<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>,
      ) => Result<
        ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      MediaJobRequest<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['job'],
      MediaJobRequest<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['input'],
      MediaOutputStream<MediaLawJobA>['job'],
      MediaOutputStream<MediaLawJobB> extends MediaOutputStream<MediaLawJobA> ? true : false,
    ],
    [true, MediaJobReference<MediaLawJobA>, FileStream<MediaLawRootA>, MediaJobReference<MediaLawJobA>, false]
  >
>;

/** Compile-time law: the sample position is core's coordinate — index at a rate. */
export type ThePositionIsTheCoreCoordinate = Assert<
  Equal<[ServerSamplePosition['sample'], ServerSamplePosition['rate']], [SampleIndex, SampleRate]>
>;

/** Compile-time law: a job is receipted, cancellable job-exactly, and owned. */
export type AJobIsReceiptedCancellableAndOwned = Assert<
  Equal<
    [
      ServerMediaJob<SchemaId, ToolId, FilesystemRootId, FilesystemRootId, MediaJobId>['output'],
      ServerMediaJob<SchemaId, ToolId, FilesystemRootId, FilesystemRootId, MediaJobId>['lifecycle'],
      ServerMediaJob<MediaLawContractA, MediaLawToolA, MediaLawRootA, MediaLawRootA, MediaLawJobA>['cancel'],
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
  readonly job: ServerMediaJob<SchemaId, ToolId, FilesystemRootId, FilesystemRootId, MediaJobId>;
  readonly stream: MediaOutputStream<MediaJobId>;
  readonly determinism: MediaDeterminism;
  readonly position: ServerSamplePosition;
  readonly authority: ServerMediaAuthority;
  readonly mediaOffer: ServerMediaOffer;
}
