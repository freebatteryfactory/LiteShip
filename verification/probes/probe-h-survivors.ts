/**
 * H1–H3 exactness-survivor reproduction probe (GPT FAIL_FINAL_HOST_CLOSURE).
 *
 * Every assertion here exercises the PUBLIC provider or requirement path,
 * never a manually instantiated exact generic. Pre-repair each survivor
 * COMPILES — the escape is real. Post-repair S1–S6 must be red for named
 * semantic reasons. S7 (deadline value identity) is recorded, not blocking.
 */

import type { InputOf, OutputOf, HoleContract, Result } from './types.js';
import type { Deadline } from './00_core/05_lifecycle/types.js';
import type { SchemaId, SchemaReference } from './00_core/03_schema/types.js';
import type { MediaFrame } from './00_core/12_media/types.js';
import type {
  WorkerExecutionHost,
  WorkerTaskId,
  WorkerTaskReference,
  ExecutionResultEnvelope,
} from './01_hosts/worker/06_execution/types.js';
import type {
  MemoryLayoutId,
  SharedBufferId,
  SharedBufferReference,
  SharedMemoryBuffer,
} from './01_hosts/worker/04_memory/types.js';
import type { EdgeRequestId } from './01_hosts/edge/01_request/types.js';
import type {
  ResponseCommitRequirement,
  ResponsePlan,
  CommittedResponse,
  ResponseFailure,
} from './01_hosts/edge/09_response/types.js';
import type { ToolId, ToolProfile, ToolProfileId } from './01_hosts/server/07_tool/types.js';
import type { MediaSourceId } from './00_core/12_media/types.js';
import type {
  ServerMediaAuthority,
  ServerRenderJob,
} from './01_hosts/server/10_media/types.js';
import type { StatementRequest, StatementResource } from './01_hosts/server/05_database/types.js';

// ---------------------------------------------------------------------------
// S1 + S2: the public worker begin path erases session identity and ancestry.
// ---------------------------------------------------------------------------

type PublicWorkerSession = OutputOf<WorkerExecutionHost['begin']>;

/** S1: the session the real provider returns accepts a cancel naming some other task. */
export const s1ForeignCancel: InputOf<PublicWorkerSession['cancel']> =
  {} as WorkerTaskReference<WorkerTaskId<'probe.survivor.foreign-task'>>;

/** S2: the session the real provider returns admits a result envelope of some other session. */
export const s2ForeignEnvelope: OutputOf<PublicWorkerSession['result']> =
  {} as ExecutionResultEnvelope<WorkerTaskId<'probe.survivor.foreign-session'>>;

// ---------------------------------------------------------------------------
// S3: a constructed shared buffer exposes only broad buffer identity.
// ---------------------------------------------------------------------------

type LayoutA = MemoryLayoutId<'probe.survivor.layout-a'>;

/** S3: a buffer of layout A can carry an id claiming to be buffer B. */
export const s3BufferIdentityErased: SharedMemoryBuffer<LayoutA>['id'] =
  {} as SharedBufferReference<SharedBufferId<'probe.survivor.buffer-b'>>;

// ---------------------------------------------------------------------------
// S4: the requirement contract downstream consumers hold is commit-broad.
// ---------------------------------------------------------------------------

type CarriedCommitAuthority = HoleContract<ResponseCommitRequirement>;
declare const carriedAuthority: CarriedCommitAuthority;
declare const foreignPlan: ResponsePlan<EdgeRequestId<'probe.survivor.request-b'>>;

/** S4: the capability the host calculus exposes commits a plan for ANY edge request. */
export const s4CrossRequestCommit: Result<CommittedResponse<EdgeRequestId>, ResponseFailure> =
  carriedAuthority.commit(foreignPlan);

// ---------------------------------------------------------------------------
// S5 + S6: the media provider path does not thread contract, tool, or job.
// ---------------------------------------------------------------------------

type PublicMediaJob = OutputOf<ServerMediaAuthority['renderFrames']>;

/** S5a: a rendered job may claim a frame contract the request never named. */
export const s5ForeignContract: PublicMediaJob['contract'] =
  {} as SchemaReference<SchemaId<'probe.survivor.contract-b'>, MediaFrame>;

/**
 * S5b: a rendered job may claim a tool profile the request never named.
 *
 * The subject sharpened when the tool reference became a tool profile: the
 * survivor is now two *admitted profiles of the same binary* — one pinned, one
 * from the PATH — being interchangeable, which is the form that actually
 * matters for a reproducibility claim.
 */
export const s5ForeignTool: PublicMediaJob['tool'] =
  {} as ToolProfile<ToolId<'probe.survivor.tool-b'>, ToolProfileId<'probe.survivor.profile-b'>>;

/**
 * S6: the frame source a render job returns admits a source of another
 * identity.
 *
 * S6a and S6b previously named `open` and the stream it returned. That pair
 * moved when packet streaming became core's bounded source and the render job
 * started returning a frame source directly — so one witness now covers what
 * two did, over the member that actually carries the identity.
 */
export const s6ForeignFrameSource: ServerRenderJob<
  never,
  never,
  never,
  never,
  never,
  never,
  never,
  never,
  MediaSourceId<'probe.survivor.source-a'>
>['frames'] = {} as ServerRenderJob<
  never,
  never,
  never,
  never,
  never,
  never,
  never,
  never,
  MediaSourceId<'probe.survivor.source-b'>
>['frames'];

// ---------------------------------------------------------------------------
// S7 (recorded, NOT blocking): exact runtime deadline values share one type.
// Runtime honoring of the supplied deadline is implementation assurance.
// ---------------------------------------------------------------------------

export const s7DeadlineValueUncorrelated: [StatementRequest['deadline'], StatementResource['deadline']] =
  [{} as Deadline, {} as Deadline];
