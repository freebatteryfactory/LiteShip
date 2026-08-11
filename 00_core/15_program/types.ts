/**
 * Readable residual programs, logical memory plans, backend-specific memory
 * layouts, packed execution images, and kernel command descriptions.
 *
 * ResidualProgram is the inspectable semantic execution contract. ExecutionImage
 * is its mechanically derived packed form for one selected backend. The packed
 * image never becomes the authoring authority.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  Envelope,
  Equal,
  IsNever,
  NonEmptyTuple,
  Reference,
} from '../../types.js';
import type { ContentAddress } from '../01_encoding/types.js';
import type { ExecutionImageAddress } from '../02_identity/types.js';
import type { SchemaReference } from '../03_schema/types.js';
import type {
  ExecutionBackend,
  ProjectionTargetReference,
  RequirementClosure,
  RuntimeFeatureReference,
  SettlementDecision,
  SourceRelation,
} from '../14_compiler/types.js';

export type ProgramId<Name extends string = string> = Brand<Name, 'liteship.program-id'>;
export type ProgramSourceId<Name extends string = string> = Brand<Name, 'liteship.program-source-id'>;
export type ProgramNodeId<Name extends string = string> = Brand<Name, 'liteship.program-node-id'>;
export type ProgramOutputId<Name extends string = string> = Brand<Name, 'liteship.program-output-id'>;
export type ProgramOperationId<Name extends string = string> = Brand<Name, 'liteship.program-operation-id'>;
export type MemoryPlaneId<Name extends string = string> = Brand<Name, 'liteship.memory-plane-id'>;
export type KernelId<Name extends string = string> = Brand<Name, 'liteship.kernel-id'>;
export type ProgramSourceReference<Id extends ProgramSourceId = ProgramSourceId> = Reference<'program-source', Id>;
export type ProgramNodeReference<Id extends ProgramNodeId = ProgramNodeId> = Reference<'program-node', Id>;
export type ProgramOutputReference<Id extends ProgramOutputId = ProgramOutputId> = Reference<'program-output', Id>;
export type ProgramOperationReference<Id extends ProgramOperationId = ProgramOperationId> = Reference<
  'program-operation',
  Id
>;
export type MemoryPlaneReference<Id extends MemoryPlaneId = MemoryPlaneId> = Reference<'memory-plane', Id>;
export type ProgramFormatVersion = 1;
export type MemoryLayoutFormatVersion = 1;
export type ExecutionImageFormatVersion = 1;
export type SourceSlot = Brand<number, 'liteship.program.source-slot'>;
export type NodeSlot = Brand<number, 'liteship.program.node-slot'>;
export type OutputSlot = Brand<number, 'liteship.program.output-slot'>;

/** Readable source entry. */
export interface ProgramSource {
  readonly slot: SourceSlot;
  readonly id: ProgramSourceId;
  readonly schema: SchemaReference;
  readonly settlement: SettlementDecision;
}

/** Typed input edge into one program node. */
export type ProgramInput = Algebra<{
  source: { readonly source: ProgramSourceReference };
  node: { readonly node: ProgramNodeReference };
}>;

/** Readable executable node entry. */
export interface ProgramNode {
  readonly slot: NodeSlot;
  readonly id: ProgramNodeId;
  readonly operation: ProgramOperationReference;
  readonly inputs: readonly ProgramInput[];
  readonly outputSchema: SchemaReference;
  readonly kernel?: KernelId;
}

/** Readable program output entry. */
export interface ProgramOutput {
  readonly slot: OutputSlot;
  readonly id: ProgramOutputId;
  readonly source: ProgramInput;
  readonly target: ProjectionTargetReference;
}

/** Canonical inspectable residual program. */
export type ResidualProgram = Envelope<
  'ResidualProgram',
  ProgramFormatVersion,
  {
    readonly id: ProgramId;
    readonly address: ContentAddress<'application/vnd.liteship.program+cbor'>;
    readonly sources: readonly ProgramSource[];
    readonly nodes: readonly ProgramNode[];
    readonly outputs: readonly ProgramOutput[];
    readonly requirements: RequirementClosure;
    readonly eligibleBackends: NonEmptyTuple<ExecutionBackend>;
    readonly features: readonly RuntimeFeatureReference[];
    /**
     * The same source-relation authority the compiler artifact carries, not a
     * structurally similar local twin. A readable residual program that cannot
     * say how it relates to the revision it came from cannot honour the
     * debugging contract it promises, and previously had no authored revision
     * at all -- only an optional map with nothing to correlate it against.
     */
    readonly relation: SourceRelation;
  }
>;

export type IndexWidth = 'u16' | 'u32';
export type GenerationWidth = 'u32' | 'u64';
export type NumericWidth = 'i8' | 'u8' | 'i16' | 'u16' | 'i32' | 'u32' | 'i64' | 'u64' | 'f32' | 'f64';
export type PlaneEncoding = 'numeric' | 'bitset' | 'two-bit' | 'offsets' | 'references' | 'bytes';

/** Numeric semantics are declared per plane or kernel, not by one global float doctrine. */
export type NumericContract = Algebra<{
  integer: { readonly signed: boolean; readonly bits: 8 | 16 | 32 | 64 };
  float: { readonly bits: 32 | 64; readonly tolerance?: number };
  fixed: { readonly signed: boolean; readonly bits: 16 | 32 | 64; readonly scale: number };
  decimal: { readonly precision: number; readonly scale: number };
}>;

/** Production growth is always bounded. */
export type CapacityPolicy = Algebra<{
  exact: { readonly capacity: number };
  paged: { readonly initial: number; readonly page: number; readonly maximum: number };
  ring: {
    readonly capacity: number;
    readonly overflow: 'reject' | 'drop-oldest' | 'drop-newest' | 'coalesce';
  };
  segmented: { readonly segment: number; readonly maximumSegments: number };
}>;

/** Backend-neutral logical memory plane. */
export interface MemoryPlanePlan {
  readonly id: MemoryPlaneId;
  readonly encoding: PlaneEncoding;
  readonly schema?: SchemaReference;
  readonly numeric?: NumericContract;
  readonly elementCount: number;
  readonly capacity: CapacityPolicy;
  readonly lifetime: 'program' | 'transaction' | 'frame' | 'sample' | 'stream';
  readonly doubleBuffered: boolean;
}

/** Compiler-generated logical memory contract. */
export interface MemoryPlan {
  readonly address: ContentAddress<'application/vnd.liteship.memory-plan+cbor'>;
  readonly planes: readonly MemoryPlanePlan[];
  readonly transactionArenaBytes: number;
  readonly scratchBytes: number;
  readonly commitSwap: readonly [MemoryPlaneReference, MemoryPlaneReference][];
}

/** One physical plane inside a backend-specific layout. */
export interface MemoryPlaneLayout {
  readonly plane: MemoryPlaneReference;
  readonly byteOffset: number;
  readonly byteLength: number;
  readonly alignment: number;
  readonly numericWidth?: NumericWidth;
  readonly indexWidth?: IndexWidth;
  readonly generationWidth?: GenerationWidth;
}

/** Backend-specific physical layout derived from one logical MemoryPlan. */
export type MemoryLayout = Envelope<
  'MemoryLayout',
  MemoryLayoutFormatVersion,
  {
    readonly backend: ExecutionBackend;
    readonly plan: ContentAddress<'application/vnd.liteship.memory-plan+cbor'>;
    readonly byteLength: number;
    readonly planes: readonly MemoryPlaneLayout[];
    readonly address: ContentAddress<'application/vnd.liteship.memory-layout+cbor'>;
  }
>;

/** One packed kernel invocation. */
export interface KernelCommand {
  readonly kernel: KernelId;
  readonly inputs: readonly MemoryPlaneReference[];
  readonly outputs: readonly MemoryPlaneReference[];
  readonly parameters: readonly number[];
}

/** Packed execution form derived from ResidualProgram for one backend. */
export type ExecutionImage = Envelope<
  'ExecutionImage',
  ExecutionImageFormatVersion,
  {
    readonly address: ExecutionImageAddress;
    readonly program: ContentAddress<'application/vnd.liteship.program+cbor'>;
    readonly backend: ExecutionBackend;
    readonly memoryPlan: ContentAddress<'application/vnd.liteship.memory-plan+cbor'>;
    readonly layout: MemoryLayout;
    readonly commands: readonly KernelCommand[];
    readonly features: readonly RuntimeFeatureReference[];
  }
>;

/** Compile-time law: a compatible `_tag` property is still rejected as reserved. */
export type ProgramEnvelopeRejectsTagShadow = Assert<
  IsNever<Envelope<'InvalidProgram', 1, { readonly _tag: string }>>
>;

/** Compile-time law: a compatible `_version` property is still rejected as reserved. */
export type ProgramEnvelopeRejectsVersionShadow = Assert<
  IsNever<Envelope<'InvalidProgram', 1, { readonly _version: number }>>
>;

/**
 * Compile-time law: a residual program carries the compiler's source-relation
 * authority, required, with no surviving optional map.
 *
 * The equality is against the imported `SourceRelation` rather than a locally
 * described shape. TypeScript cannot tell an import from a structurally
 * identical local twin, so this law is a floor: a source-level check that the
 * relation is declared once and imported here belongs in the verification
 * harness, and later in the repository authority index.
 */
export type AResidualProgramCarriesTheCompilerSourceRelation = Assert<
  Equal<
    [
      ResidualProgram['relation'],
      'sourceMap' extends keyof ResidualProgram ? true : false,
      undefined extends ResidualProgram['relation'] ? true : false,
    ],
    [SourceRelation, false, false]
  >
>;

/** Type summary consumed by the root core topology. */
export interface ProgramTypeSurface {
  readonly residual: ResidualProgram;
  readonly image: ExecutionImage;
  readonly memoryPlan: MemoryPlan;
  readonly memoryLayout: MemoryLayout;
  readonly plane: MemoryPlanePlan;
  readonly numeric: NumericContract;
  readonly command: KernelCommand;
}
