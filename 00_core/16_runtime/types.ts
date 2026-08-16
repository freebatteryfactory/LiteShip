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
  Brand,
  Hole,
  MaybePromise,
  RequirementRow,
  Result,
  Signature,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type { CommitId, TraceId } from '../02_identity/types.js';
import type { SchemaId, SchemaReference } from '../03_schema/types.js';
import type { TransactionGeneration } from '../04_time/types.js';
import type { OwnedResource } from '../05_lifecycle/types.js';
import type {
  Commit,
  SemanticCut,
} from '../08_state/types.js';
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
export interface RuntimeTransaction<Cut extends SemanticCut = SemanticCut> {
  readonly base: Cut;
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
export interface RuntimeCommit<Cut extends SemanticCut = SemanticCut> {
  readonly id: CommitId;
  readonly semantic: Commit<Cut>;
  readonly writePlan: RuntimeWritePlan;
  readonly trace: TraceId;
}

/**
 * One execution request: everything a faithful transaction execution
 * consumes. The inspectable program and its packed image are both named, the
 * selected backend and driver are explicit, and the coordinate this execution
 * departs from is one exact `SemanticCut` — world, base revision, time, and the
 * evidence population it evaluated against.
 *
 * That coordinate arrives as one object rather than as a base revision beside a
 * time cut. The two were siblings here while the commit carried two more of its
 * own, and adding world and evidence to both would have produced four
 * coordinates and a parity law to keep them agreeing.
 *
 * Hosts supply the physical driver; core owns what a lawful execution consumes
 * and produces.
 */
export interface ExecutionRequest {
  readonly program: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly image: ExecutionImage;
  readonly backend: ExecutionBackend;
  readonly driver: BackendId;
  readonly base: SemanticCut;
  readonly generation: TransactionGeneration;
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
