/**
 * Transactional residual execution and general compute-kernel ABI.
 *
 * TypeScript is the semantic reference executor. Rust/native, Wasm, worker, and
 * WebGPU implementations execute the same packed image and must pass differential
 * parity. Domain APIs lower to general kernels; Rust never becomes a second
 * semantic authority.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  Equal,
  Hole,
  MaybePromise,
  OutputOf,
  RequirementRow,
  Result,
  Signature,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type { CommitId, RevisionReference, TraceId } from '../02_identity/types.js';
import type { SchemaId, SchemaReference } from '../03_schema/types.js';
import type { TimeCut, TransactionGeneration } from '../04_time/types.js';
import type { OwnedResource } from '../05_lifecycle/types.js';
import type { Commit, WorldRevision } from '../08_state/types.js';
import type { ExecutionBackend } from '../14_compiler/types.js';
import type {
  ExecutionImage,
  KernelCommand,
  KernelId,
  MemoryPlaneReference,
  NodeSlot,
  NumericContract,
  ProgramOutputReference,
  SourceSlot,
} from '../15_program/types.js';

export type BackendId<Name extends string = string> = Brand<Name, 'liteship.backend-id'>;
export type KernelAbiVersion = 1;

/** General compute primitive families. Domain semantics remain with their owners. */
export type KernelOperation =
  | 'map'
  | 'reduce'
  | 'scan'
  | 'gather'
  | 'scatter'
  | 'compact'
  | 'compare'
  | 'quantize'
  | 'interpolate'
  | 'normalize'
  | 'transform'
  | 'parse'
  | 'hash'
  | 'dsp'
  | 'geometry';

/** Buffer region supplied to a kernel. */
export interface BufferRegion {
  readonly plane: MemoryPlaneReference;
  readonly byteOffset: number;
  readonly byteLength: number;
  readonly elementOffset?: number;
  readonly elementCount?: number;
}

/** General kernel definition shared by TypeScript, Rust, Wasm, worker, and GPU realizations. */
export interface KernelDefinition<
  Input = unknown,
  Output = unknown,
  Failure = readonly Diagnostic[],
  Requirements extends RequirementRow = readonly [],
> {
  readonly id: KernelId;
  readonly abiVersion: KernelAbiVersion;
  readonly operation: KernelOperation;
  readonly signature: Signature<Input, Output, Failure, Requirements>;
  readonly inputSchema: SchemaReference<SchemaId, Input>;
  readonly outputSchema: SchemaReference<SchemaId, Output>;
  readonly requirements: Requirements;
  readonly deterministic: boolean;
  readonly pure: boolean;
  readonly supportedBackends: readonly ExecutionBackend[];
  readonly numerics?: NumericContract;
  readonly parityFixture: ContentAddress;
}

/** Result of one physical kernel execution. */
export type KernelStatus = Algebra<{
  succeeded: Record<never, never>;
  'invalid-input': { readonly diagnostics: readonly Diagnostic[] };
  'insufficient-capacity': { readonly plane: MemoryPlaneReference; readonly required: number; readonly available: number };
  unsupported: { readonly backend: ExecutionBackend; readonly reason: string };
  failed: { readonly diagnostics: readonly Diagnostic[] };
}>;

/** Physical backend capable of executing one packed image. */
export interface ExecutionBackendDriver extends OwnedResource {
  readonly id: BackendId;
  readonly kind: ExecutionBackend;
  readonly supports: (image: ExecutionImage) => boolean;
  readonly execute: (
    image: ExecutionImage,
    commands?: readonly KernelCommand[],
  ) => MaybePromise<Result<KernelStatus, readonly Diagnostic[]>>;
}

export type BackendRegistryRequirement = Hole<
  'liteship.runtime.backends',
  ReadonlyMap<BackendId, ExecutionBackendDriver>
>;

/** One coherent runtime transaction. */
export interface RuntimeTransaction {
  readonly time: TimeCut;
  readonly base: WorldRevision;
  readonly dirtySources: readonly SourceSlot[];
  readonly dirtyNodes: readonly NodeSlot[];
  readonly trace: TraceId;
}

/** One typed buffered output. */
export interface RuntimeOutput<Value = unknown> {
  readonly output: ProgramOutputReference;
  readonly schema: SchemaReference<SchemaId, Value>;
  readonly value: Value;
  readonly generation: TransactionGeneration;
}

/** Buffered outputs that become visible together at the commit barrier. */
export interface RuntimeWritePlan {
  readonly transaction: TraceId;
  readonly outputs: readonly RuntimeOutput[];
}

/** Completed transaction and resulting semantic commit. */
export interface RuntimeCommit {
  readonly id: CommitId;
  readonly semantic: Commit;
  readonly writePlan: RuntimeWritePlan;
  readonly trace: TraceId;
}

/**
 * One execution request: everything a faithful transaction execution
 * consumes. The inspectable program and its packed image are both named, the
 * selected backend and driver are explicit, and the transactional coordinates
 * — base revision, generation, time cut, and input values — are the facts the
 * produced semantic commit must be manufactured from. Hosts supply the
 * physical driver; core owns what a lawful execution consumes and produces.
 */
export interface ExecutionRequest {
  readonly program: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly image: ExecutionImage;
  readonly backend: ExecutionBackend;
  readonly driver: BackendId;
  readonly baseRevision: RevisionReference;
  readonly generation: TransactionGeneration;
  readonly time: TimeCut;
  readonly inputs: CanonicalValue;
  readonly commands: readonly KernelCommand[];
}

/**
 * The core-owned executor relationship: consume one exact execution request,
 * produce one `RuntimeCommit` or a typed failure. A host execution provider
 * realizes this contract; it never invents a second commit semantics, and it
 * never fabricates evidence of physical application — egresses do that after
 * the commit barrier.
 */
export interface RuntimeExecutor {
  readonly execute: Signature<ExecutionRequest, RuntimeCommit, readonly Diagnostic[]>;
}

/** Compile-time law: an executor produces the runtime commit, nothing looser. */
export type AnExecutorProducesTheRuntimeCommit = Assert<
  Equal<OutputOf<RuntimeExecutor['execute']>, RuntimeCommit>
>;

/** Compile-time law: an execution request carries its transactional coordinates. */
export type AnExecutionRequestCarriesItsTransaction = Assert<
  Equal<
    [ExecutionRequest['baseRevision'], ExecutionRequest['generation'], ExecutionRequest['driver']],
    [RevisionReference, TransactionGeneration, BackendId]
  >
>;

/** Compile-time law: the owner surface exposes the executor relationship. */
export type TheSurfaceReachesTheExecutor = Assert<
  Equal<
    [RuntimeTypeSurface['executor'], RuntimeTypeSurface['executionRequest']],
    [RuntimeExecutor, ExecutionRequest]
  >
>;

/** Type summary consumed by the root core topology. */
export interface RuntimeTypeSurface {
  readonly kernel: KernelDefinition;
  readonly kernelStatus: KernelStatus;
  readonly backend: ExecutionBackendDriver;
  readonly transaction: RuntimeTransaction;
  readonly output: RuntimeOutput;
  readonly writePlan: RuntimeWritePlan;
  readonly executionRequest: ExecutionRequest;
  readonly executor: RuntimeExecutor;
  readonly commit: RuntimeCommit;
}
