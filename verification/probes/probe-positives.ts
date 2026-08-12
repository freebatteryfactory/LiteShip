/**
 * Lawful same-identity positive fixtures — H-fold edition. Every construction
 * pairs identity A with identity A across the repaired relationships, and
 * the provider-form fixtures (p08, p23, p25–p28) exercise the PUBLIC
 * composition paths, not manually instantiated exact generics. Expected:
 * this file COMPILES.
 *
 * @module
 */

import type { Hole, InputOf, NonEmptyTuple, OutputOf, Result, Signature } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type {
  OperationId,
  OperationInvocation,
  OperationReceipt,
  OperationReference,
} from './00_core/07_operation/types.js';
import type { WorkerInstance, WorkerInstanceId, WorkerInstanceReference } from './01_hosts/worker/01_instance/types.js';
import type {
  ChannelId,
  CorrelationId,
  DeliveryReceipt,
  MessageEnvelope,
  MessagingAuthority,
  WorkerChannel,
} from './01_hosts/worker/02_message/types.js';
import type { CustodyReceipt, TransferAuthority, TransferTicket } from './01_hosts/worker/03_transfer/types.js';
import type {
  MemoryLayoutId,
  SharedBufferId,
  SharedMemoryAuthority,
  SharedMemoryBuffer,
  SharedMemoryRequest,
  SharedMemoryView,
} from './01_hosts/worker/04_memory/types.js';
import type { BoundedQueue, QueueAuthority, QueueId } from './01_hosts/worker/05_queue/types.js';
import type {
  ExecutionResultEnvelope,
  WorkerExecutionHost,
  WorkerExecutionRequest,
  WorkerExecutionSession,
  WorkerTaskId,
} from './01_hosts/worker/06_execution/types.js';
import type { AdmittedRequest, EdgeRequestId, EdgeRequestReference, RequestClone } from './01_hosts/edge/01_request/types.js';
import type { RequestSettlementAuthority, RequestSettlementOutcome } from './01_hosts/edge/04_settlement/types.js';
import type { EdgeOperationHandler } from './01_hosts/edge/08_execution/types.js';
import type {
  CommittedResponse,
  ResponseCommitAuthority,
  ResponseCommitGrant,
  ResponseFailure,
  ResponsePlan,
  ResponseStream,
} from './01_hosts/edge/09_response/types.js';
import type {
  RevealedSecret,
  SecretConsumer,
  SecretId,
  SecretProvider,
  SecretScopedReference,
  SecretUseReceipt,
} from './01_hosts/server/02_secret/types.js';
import type { FilesystemProvider, FilesystemRootId, FileStream } from './01_hosts/server/03_filesystem/types.js';
import type { ServerOperationHandler } from './01_hosts/server/09_operation/types.js';
import type { ToolAuthority, ToolExecution, ToolId } from './01_hosts/server/07_tool/types.js';
import type {
  MediaJobId,
  MediaJobReference,
  MediaPacketStream,
  ServerEncodeJob,
  ServerEncodeRequest,
  ServerMediaAuthority,
  ServerMediaJob,
  ServerRenderRequest,
} from './01_hosts/server/10_media/types.js';
import type { EncodeProfileId } from './00_core/12_media/types.js';
import type { SchemaId } from './00_core/03_schema/types.js';

type OpA = OperationId<'liteship.positive.op-a'>;
type RowA = readonly [Hole<'liteship.positive.capability-a', { readonly use: () => void }>];
type InstA = WorkerInstanceId<'liteship.positive.instance-a'>;
type ChanA = ChannelId<'liteship.positive.channel-a'>;
type CorrA = CorrelationId<'liteship.positive.correlation-a'>;
type ReqA = EdgeRequestId<'liteship.positive.request-a'>;
type SecA = SecretId<'liteship.positive.secret-a'>;
type RootA = FilesystemRootId<'liteship.positive.root-a'>;
type ToolA = ToolId<'liteship.positive.tool-a'>;
type TaskA = WorkerTaskId<'liteship.positive.task-a'>;
type BufA = SharedBufferId<'liteship.positive.buffer-a'>;
type QueueA = QueueId<'liteship.positive.queue-a'>;
type LayoutA = MemoryLayoutId<'liteship.positive.layout-a'>;
type ContractA = SchemaId<'liteship.positive.contract-a'>;
type JobA = MediaJobId<'liteship.positive.job-a'>;
type EncodeA = EncodeProfileId<'liteship.positive.encode-a'>;

// Worker: instance A closes instance A.
declare const instanceA: WorkerInstance<InstA>;
export const p01: Signature<
  WorkerInstanceReference<InstA>,
  OutputOf<WorkerInstance<InstA>['close']>,
  NonEmptyTuple<Diagnostic>
> = instanceA.close;

// Worker: channel A carries envelopes of channel A with correlation A.
declare const channelA: WorkerChannel<string, ChanA>;
declare const envelopeA: MessageEnvelope<string, ChanA, CorrA>;
export const p02: Result<DeliveryReceipt<CorrA>, NonEmptyTuple<Diagnostic>> = channelA.send(envelopeA);

// Worker: a correctly correlated open request compiles.
declare const messaging: MessagingAuthority;
declare const openRequest: {
  readonly channel: import('./01_hosts/worker/02_message/types.js').ChannelReference<ChanA>;
  readonly role: 'worker';
  readonly decoder: import('./01_hosts/worker/02_message/types.js').MessageDecodeContract<string>;
  readonly buffer: { readonly bounded: true };
};
export const p03: Result<WorkerChannel<string, ChanA>, NonEmptyTuple<Diagnostic>> =
  messaging.open<string, ChanA>(openRequest);

// Worker: a moved ticket consummates into a moved receipt with detachment.
declare const transfers: TransferAuthority;
declare const movedTicket: TransferTicket<'moved'>;
export const p04: Result<CustodyReceipt<'moved'>, NonEmptyTuple<Diagnostic>> =
  transfers.consummate(movedTicket);
export const p05: TransferAuthority['detachment'] = transfers.detachment;

// Worker (provider form): constructing layout A under buffer identity A yields
// the exact buffer, whose id feeds the exact view relation.
declare const memory: SharedMemoryAuthority;
declare const memoryRequestA: SharedMemoryRequest<LayoutA, BufA>;
export const p23: Result<SharedMemoryBuffer<LayoutA, BufA>, NonEmptyTuple<Diagnostic>> =
  memory.construct(memoryRequestA);
declare const constructedBufferA: SharedMemoryBuffer<LayoutA, BufA>;
declare const viewRequest: {
  readonly buffer: (typeof constructedBufferA)['id'];
  readonly role: 'writer';
};
export const p06: Result<SharedMemoryView<'writer', BufA>, NonEmptyTuple<Diagnostic>> =
  memory.view(viewRequest);

// Worker: queue A over buffer A holds endpoints of queue A and accepts A-batches.
declare const queues: QueueAuthority;
declare const queueRequest: {
  readonly queue: import('./01_hosts/worker/05_queue/types.js').QueueReference<QueueA>;
  readonly buffer: import('./01_hosts/worker/04_memory/types.js').SharedBufferReference<BufA>;
  readonly admission: import('./00_core/03_schema/types.js').SchemaReference<
    import('./00_core/03_schema/types.js').SchemaId,
    string
  >;
  readonly policy: BoundedQueue<string, QueueA, BufA>['policy'];
};
export const p07: Result<BoundedQueue<string, QueueA, BufA>, NonEmptyTuple<Diagnostic>> =
  queues.construct(queueRequest);

// Worker (provider form): beginning task A on the public path yields the exact
// session, which bears an envelope naming itself.
declare const workerHost: WorkerExecutionHost;
declare const executionRequestA: WorkerExecutionRequest<TaskA>;
export const p08: Result<WorkerExecutionSession<TaskA>, NonEmptyTuple<Diagnostic>> =
  workerHost.begin(executionRequestA);
declare const sessionA: WorkerExecutionSession<TaskA>;
export const p09: Signature<
  import('./01_hosts/worker/06_execution/types.js').WorkerTaskReference<TaskA>,
  ExecutionResultEnvelope<TaskA>,
  NonEmptyTuple<Diagnostic>
> = sessionA.result;

// Edge: request A consumes and clones itself into an A-ancestored clone resource.
declare const requestA: AdmittedRequest<ReqA>;
export const p10: InputOf<AdmittedRequest<ReqA>['consume']> extends EdgeRequestReference<ReqA>
  ? true
  : false = true;
export const p21: Signature<EdgeRequestReference<ReqA>, RequestClone<ReqA>, NonEmptyTuple<Diagnostic>> =
  requestA.clone;

// Edge: settlement of request A yields an outcome naming A.
declare const settlement: RequestSettlementAuthority;
declare const settlementRequestA: import('./01_hosts/edge/04_settlement/types.js').RequestSettlementRequest<ReqA>;
export const p11: Result<RequestSettlementOutcome<ReqA>, NonEmptyTuple<Diagnostic>> =
  settlement.settle(settlementRequestA);

// Edge: a handler for operation A with row A handles A-invocations.
declare const edgeHandlerA: EdgeOperationHandler<OpA, string, string, string, RowA>;
declare const invocationA: OperationInvocation<string, OpA>;
export const p12: InputOf<EdgeOperationHandler<OpA, string, string, string, RowA>['handle']> = invocationA;
export const p13: OperationReference<OpA> = invocationA.operation;

// Edge (provider form): the carried grant, given request A's reference, yields
// the authority for exactly A, which commits and streams A-plans.
declare const commitGrant: ResponseCommitGrant;
declare const requestReferenceA: EdgeRequestReference<ReqA>;
export const p25: Result<ResponseCommitAuthority<ReqA>, ResponseFailure> =
  commitGrant.grant(requestReferenceA);
declare const commits: ResponseCommitAuthority<ReqA>;
declare const planA: ResponsePlan<ReqA>;
export const p14: Result<CommittedResponse<ReqA>, ResponseFailure> = commits.commit(planA);
export const p15: Result<ResponseStream<ReqA>, ResponseFailure> = commits.open(planA);

// Server: revealing secret A yields A's revelation, used through an A-consumer.
declare const secrets: SecretProvider;
declare const secretRefA: SecretScopedReference<SecA>;
export const p16: Result<RevealedSecret<SecA>, NonEmptyTuple<Diagnostic>> = secrets.resolve(secretRefA);
declare const revealedA: RevealedSecret<SecA>;
export const p24: Signature<SecretConsumer<SecA>, SecretUseReceipt<SecA>, NonEmptyTuple<Diagnostic>> =
  revealedA.use;

// Server: a stream opened under root A is a stream of root A.
declare const filesystem: FilesystemProvider;
declare const fsRequestA: import('./01_hosts/server/03_filesystem/types.js').FileOpenRequest<RootA>;
export const p17: Result<FileStream<RootA>, NonEmptyTuple<Diagnostic>> = filesystem.stream(fsRequestA);

// Server: a handler for operation A with row A emits A-receipts and exact capabilities.
declare const serverHandlerA: ServerOperationHandler<OpA, string, string, string, RowA>;
export const p18: OutputOf<
  ServerOperationHandler<OpA, string, string, string, RowA>['handle']
> extends OperationReceipt<string, string, OpA>
  ? true
  : false = true;
export const p19: ServerOperationHandler<OpA, string, string, string, RowA>['idempotency'] =
  serverHandlerA.idempotency;
export const p22: ServerOperationHandler<OpA, string, string, string, RowA>['capabilities'] =
  serverHandlerA.capabilities;

// Server: invoking tool A yields an execution of tool A with a real result path.
declare const tools: ToolAuthority;
declare const toolRequestA: import('./01_hosts/server/07_tool/types.js').ToolInvocationRequest<ToolA>;
export const p20: Result<ToolExecution<ToolA>, NonEmptyTuple<Diagnostic>> = tools.invoke(toolRequestA);

// Server (provider form): rendering the exact media request yields the job of
// exactly that ancestry, and encoding its frames opens a packet stream that
// remembers both the job and the profile the packets were produced under.
declare const media: ServerMediaAuthority;
declare const mediaRequestA: ServerRenderRequest<ContractA, ToolA, RootA, JobA>;
export const p26: Result<
  ServerMediaJob<ContractA, ToolA, RootA, JobA>,
  NonEmptyTuple<Diagnostic>
> = media.render(mediaRequestA);
declare const encodeRequestA: ServerEncodeRequest<EncodeA, ToolA, JobA>;
export const p27: Result<
  ServerEncodeJob<EncodeA, ToolA, JobA>,
  NonEmptyTuple<Diagnostic>
> = media.encode(encodeRequestA);
declare const encodeJobA: ServerEncodeJob<EncodeA, ToolA, JobA>;
export const p28: Signature<
  MediaJobReference<JobA>,
  MediaPacketStream<JobA, EncodeA>,
  NonEmptyTuple<Diagnostic>
> = encodeJobA.open;
