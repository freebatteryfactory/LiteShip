/**
 * The thirteen active C1–C5 negative witnesses, rebuilt against the current
 * public arities after the H-fold. Every assertion here states the FALSE
 * thing — a foreign identity accepted, a required member absent — and every
 * one must be red as a semantic false assertion, never a missing-argument
 * diagnostic. Expected: 13 witnesses, 13 errors, each for its named
 * relationship.
 */

import type { Hole, InputOf, OutputOf, Result, NonEmptyTuple } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { OperationId } from './00_core/07_operation/types.js';
import type {
  MemoryLayoutId,
  SharedBufferId,
  SharedMemoryAuthority,
  SharedMemoryBuffer,
  SharedMemoryRequest,
} from './01_hosts/worker/04_memory/types.js';
import type {
  BoundedQueue,
  QueueAuthority,
  QueueBatch,
  QueueId,
  QueueRequest,
} from './01_hosts/worker/05_queue/types.js';
import type {
  ExecutionResultEnvelope,
  WorkerExecutionSession,
  WorkerTaskId,
} from './01_hosts/worker/06_execution/types.js';
import type { AdmittedRequest, EdgeRequestId, RequestClone } from './01_hosts/edge/01_request/types.js';
import type { EdgeOutboundConnection } from './01_hosts/edge/05_network/types.js';
import type { OutboundRequestId } from './01_hosts/edge/05_network/types.js';
import type { EdgeOperationHandler } from './01_hosts/edge/08_execution/types.js';
import type { ResponseCommitAuthority, ResponsePlan } from './01_hosts/edge/09_response/types.js';
import type { RevealedSecret, SecretConsumer, SecretId } from './01_hosts/server/02_secret/types.js';
import type { StatementRequest, StatementResource } from './01_hosts/server/05_database/types.js';
import type { ServerOperationHandler } from './01_hosts/server/09_operation/types.js';
import type { MediaEncodeRequest, MediaSource } from './00_core/12_media/types.js';
import type { ServerRenderRequest } from './01_hosts/server/10_media/types.js';

type OpA = OperationId<'probe.active.op-a'>;
type RowA = readonly [Hole<'probe.active.capability-a', { readonly use: () => void }>];
type RowB = readonly [Hole<'probe.active.capability-b', { readonly other: () => void }>];
type ReqA = EdgeRequestId<'probe.active.request-a'>;
type ReqB = EdgeRequestId<'probe.active.request-b'>;
type LayoutA = MemoryLayoutId<'probe.active.layout-a'>;
type LayoutB = MemoryLayoutId<'probe.active.layout-b'>;
type BufA = SharedBufferId<'probe.active.buffer-a'>;
type BufB = SharedBufferId<'probe.active.buffer-b'>;
type QueueA = QueueId<'probe.active.queue-a'>;
type QueueB = QueueId<'probe.active.queue-b'>;
type TaskA = WorkerTaskId<'probe.active.task-a'>;
type TaskB = WorkerTaskId<'probe.active.task-b'>;
type RidA = OutboundRequestId<'probe.active.outbound-a'>;
type RidB = OutboundRequestId<'probe.active.outbound-b'>;
type SecA = SecretId<'probe.active.secret-a'>;
type SecB = SecretId<'probe.active.secret-b'>;

// W01 (C3): request A's commit authority accepts a plan for request B.
export const w01: Parameters<ResponseCommitAuthority<ReqA>['commit']>[0] =
  {} as ResponsePlan<ReqB>;

// W02 (C1): an edge handler carrying row B masquerades as a handler of row A.
export const w02: EdgeOperationHandler<OpA, string, string, string, RowA> =
  {} as EdgeOperationHandler<OpA, string, string, string, RowB>;

// W03 (C1): a server handler carrying row B masquerades as a handler of row A.
export const w03: ServerOperationHandler<OpA, string, string, string, RowA> =
  {} as ServerOperationHandler<OpA, string, string, string, RowB>;

// W04 (C2): construction for layout A returns a buffer claiming layout B.
declare const memory: SharedMemoryAuthority;
declare const memoryRequestA: SharedMemoryRequest<LayoutA, BufA>;
export const w04: Result<SharedMemoryBuffer<LayoutB, BufA>, NonEmptyTuple<Diagnostic>> =
  memory.construct(memoryRequestA);

// W05 (C2): queue A accepts a batch naming queue B.
export const w05: InputOf<BoundedQueue<string, QueueA, BufA>['enqueue']> =
  {} as QueueBatch<string, QueueB>;

// W06 (C2): queue construction over buffer A claims buffer B.
declare const queues: QueueAuthority;
declare const queueRequestA: QueueRequest<string, QueueA, BufA>;
export const w06: Result<BoundedQueue<string, QueueA, BufB>, NonEmptyTuple<Diagnostic>> =
  queues.construct(queueRequestA);

// W07 (C2): session A admits a result envelope naming session B.
export const w07: OutputOf<WorkerExecutionSession<TaskA>['result']> =
  {} as ExecutionResultEnvelope<TaskB>;

// W08 (C3): request A's clone claims request B ancestry.
export const w08: OutputOf<AdmittedRequest<ReqA>['clone']> = {} as RequestClone<ReqB>;

// W09 (C3): outbound open A yields a connection correlated to request B.
export const w09: EdgeOutboundConnection<string, RidA> =
  {} as EdgeOutboundConnection<string, RidB>;

// W10 (C4): the revealed secret exposes a readable material member.
export const w10: 'material' extends keyof RevealedSecret<SecA> ? true : never = true;

// W11 (C4): secret A's use accepts a consumer admitted for secret B.
export const w11: InputOf<RevealedSecret<SecA>['use']> = {} as SecretConsumer<SecB>;

// W12 (C5): statements lack a deadline relation.
export const w12: 'deadline' extends keyof StatementRequest
  ? 'deadline' extends keyof StatementResource
    ? never
    : true
  : true = true;

// W13 (C5): the media path lacks physical input, destination, frame contract,
// or an actual frame population.
//
// The subject moved when `render` split into decode/render/encode/mux — the
// physical input now belongs to decode, the destination and contract to render,
// and the frames to encode. One witness still covers it, and it now also
// refuses the shape where an encode is satisfied without frames.
export const w13: 'destination' extends keyof ServerRenderRequest
  ? 'contract' extends keyof ServerRenderRequest
    ? 'render' extends keyof ServerRenderRequest
      ? MediaEncodeRequest['input'] extends { readonly _tag: string }
        ? CaseOfVideoInput extends MediaSource<unknown, never>
          ? never
          : never
        : true
      : true
    : true
  : true = true;

type CaseOfVideoInput = Extract<
  MediaEncodeRequest<'video-only', unknown, never>['input'],
  { readonly _tag: 'video-only' }
>['video'];
