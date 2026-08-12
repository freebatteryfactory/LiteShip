/**
 * H1–H3 adapted survivor witnesses, post-fold form. Each escape is
 * re-expressed against the CURRENT public provider and requirement paths —
 * no manually instantiated exact generics standing in for what a consumer
 * receives — and each must fail SEMANTICALLY: identity A provably refusing
 * identity B on the path the composition surface actually hands out.
 * Expected: every assertion in this file is red for its named relationship.
 */

import type { NonEmptyTuple, Result } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { SchemaId } from './00_core/03_schema/types.js';
import type {
  WorkerExecutionHost,
  WorkerExecutionRequest,
  WorkerExecutionSession,
  WorkerTaskId,
} from './01_hosts/worker/06_execution/types.js';
import type {
  MemoryLayoutId,
  SharedBufferId,
  SharedMemoryAuthority,
  SharedMemoryBuffer,
  SharedMemoryRequest,
} from './01_hosts/worker/04_memory/types.js';
import type { EdgeRequestId, EdgeRequestReference } from './01_hosts/edge/01_request/types.js';
import type {
  ResponseCommitAuthority,
  ResponseCommitGrant,
  ResponseFailure,
} from './01_hosts/edge/09_response/types.js';
import type { FilesystemRootId } from './01_hosts/server/03_filesystem/types.js';
import type { ToolId, ToolProfileId } from './01_hosts/server/07_tool/types.js';
import type { MediaSourceId } from './00_core/12_media/types.js';
import type {
  MediaJobId,
  RenderProfileId,
  ServerMediaAuthority,
  ServerRenderJob,
  ServerRenderRequest,
} from './01_hosts/server/10_media/types.js';

type TaskA = WorkerTaskId<'probe.adapted.task-a'>;
type TaskB = WorkerTaskId<'probe.adapted.task-b'>;
type LayoutA = MemoryLayoutId<'probe.adapted.layout-a'>;
type BufA = SharedBufferId<'probe.adapted.buffer-a'>;
type BufB = SharedBufferId<'probe.adapted.buffer-b'>;
type ReqA = EdgeRequestId<'probe.adapted.request-a'>;
type ReqB = EdgeRequestId<'probe.adapted.request-b'>;
type ContractA = SchemaId<'probe.adapted.contract-a'>;
type ContractB = SchemaId<'probe.adapted.contract-b'>;
type ToolA = ToolId<'probe.adapted.tool-a'>;
type RootA = FilesystemRootId<'probe.adapted.root-a'>;
type JobA = MediaJobId<'probe.adapted.job-a'>;
type JobB = MediaJobId<'probe.adapted.job-b'>;

// ---------------------------------------------------------------------------
// A1/A2 (was S1/S2): the public begin path preserves session identity.
// ---------------------------------------------------------------------------

declare const workerHost: WorkerExecutionHost;
declare const executionRequestA: WorkerExecutionRequest<TaskA>;

/** A1: the session the real provider returns for task A cannot claim to be task B's. */
export const a1: Result<WorkerExecutionSession<TaskB>, NonEmptyTuple<Diagnostic>> =
  workerHost.begin(executionRequestA);

/** A2: the provider path refuses a request whose task and session identities disagree. */
export const a2: Result<WorkerExecutionSession<TaskB>, NonEmptyTuple<Diagnostic>> =
  workerHost.begin<TaskA>(executionRequestA);

// ---------------------------------------------------------------------------
// A3 (was S3): the constructed buffer carries its exact identity.
// ---------------------------------------------------------------------------

declare const memory: SharedMemoryAuthority;
declare const memoryRequestA: SharedMemoryRequest<LayoutA, BufA>;

/** A3a: construction for buffer A cannot return a buffer claiming identity B. */
export const a3a: Result<SharedMemoryBuffer<LayoutA, BufB>, NonEmptyTuple<Diagnostic>> =
  memory.construct(memoryRequestA);

/** A3b: the exact buffer's id member refuses a foreign reference. */
export const a3b: SharedMemoryBuffer<LayoutA, BufA>['id'] =
  {} as SharedMemoryBuffer<LayoutA, BufB>['id'];

// ---------------------------------------------------------------------------
// A4 (was S4): the carried grant is request-correlated.
// ---------------------------------------------------------------------------

declare const commitGrant: ResponseCommitGrant;
declare const requestReferenceA: EdgeRequestReference<ReqA>;

/** A4: granting request A cannot yield the commit authority for request B. */
export const a4: Result<ResponseCommitAuthority<ReqB>, ResponseFailure> =
  commitGrant.grant(requestReferenceA);

// ---------------------------------------------------------------------------
// A5/A6 (was S5/S6): the render path threads ancestry; streams keep their job.
// ---------------------------------------------------------------------------

declare const media: ServerMediaAuthority;
type RenderA = RenderProfileId<'probe.adapted.render-a'>;
type ProfileA = ToolProfileId<'probe.adapted.profile-a'>;
type SourceA = MediaSourceId<'probe.adapted.source-a'>;
type SourceB = MediaSourceId<'probe.adapted.source-b'>;

declare const renderRequestA: ServerRenderRequest<ContractA, never, RenderA, ToolA, ProfileA, RootA, JobA>;

/** A5a: a request naming contract A cannot return a job claiming contract B. */
export const a5a: Result<
  ServerRenderJob<never, ContractB, never, RenderA, ToolA, ProfileA, RootA, JobA, SourceA>,
  NonEmptyTuple<Diagnostic>
> = media.renderFrames(renderRequestA);

/** A5b: a request naming job A cannot return a job claiming identity B. */
export const a5b: Result<
  ServerRenderJob<never, ContractA, never, RenderA, ToolA, ProfileA, RootA, JobB, SourceA>,
  NonEmptyTuple<Diagnostic>
> = media.renderFrames(renderRequestA);

declare const mediaJobA: ServerRenderJob<
  never,
  ContractA,
  never,
  RenderA,
  ToolA,
  ProfileA,
  RootA,
  JobA,
  SourceA
>;

/**
 * A6: the frame source of job A cannot be a source of another identity.
 *
 * A6a and A6b previously named `open` and its returned stream. They collapse to
 * one witness over `frames` now that the render job returns a bounded source
 * directly — same relationship, one member closer to where the identity lives.
 */
export const a6a: (typeof mediaJobA)['frames'] = {} as ServerRenderJob<
  never,
  ContractA,
  never,
  RenderA,
  ToolA,
  ProfileA,
  RootA,
  JobA,
  SourceB
>['frames'];
