/**
 * Temporal coordinates, timebases, timecodes, and clock composition.
 *
 * Different notions of time retain their real ordering laws. A transaction may
 * carry a product of coordinates, but wall time, monotonic time, vector time,
 * sample position, frame position, and editor position never collapse into one
 * ambient number.
 *
 * @module
 */

import type { Algebra, Brand, Result } from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';

export type UnixTimeMilliseconds = Brand<number, 'liteship.time.unix-ms'>;
export type MonotonicNanoseconds = Brand<bigint, 'liteship.time.monotonic-ns'>;
export type LogicalCounter = Brand<bigint, 'liteship.time.logical-counter'>;
export type TransactionGeneration = Brand<bigint, 'liteship.time.transaction-generation'>;
export type FrameIndex = Brand<bigint, 'liteship.time.frame-index'>;
export type SampleIndex = Brand<bigint, 'liteship.time.sample-index'>;
export type SimulationStep = Brand<bigint, 'liteship.time.simulation-step'>;
export type StreamSequence = Brand<bigint, 'liteship.time.stream-sequence'>;
export type EditorPosition = Brand<bigint, 'liteship.time.editor-position'>;
export type BeatPosition = Brand<number, 'liteship.time.beat-position'>;

/** Standard hybrid logical clock: wall time plus a logical counter and node. */
export interface HybridLogicalClock {
  readonly wallTime: UnixTimeMilliseconds;
  readonly counter: LogicalCounter;
  readonly node: string;
}

/** Vector clock with partial causal ordering. */
export type VectorClock<Node extends string = string> = Readonly<Record<Node, LogicalCounter>>;

/** One explicitly typed temporal axis. */
export type TimeCoordinate = Algebra<{
  wall: { readonly value: UnixTimeMilliseconds };
  monotonic: { readonly value: MonotonicNanoseconds };
  logical: { readonly value: LogicalCounter };
  hybrid: { readonly value: HybridLogicalClock };
  vector: { readonly value: VectorClock };
  generation: { readonly value: TransactionGeneration };
  frame: { readonly value: FrameIndex; readonly framesPerSecond: number };
  sample: { readonly value: SampleIndex; readonly samplesPerSecond: number };
  simulation: { readonly value: SimulationStep };
  stream: { readonly value: StreamSequence };
  editor: { readonly value: EditorPosition };
}>;

/** Standard timeline measurement systems. */
export type Timebase = Algebra<{
  seconds: { readonly ticksPerSecond: number };
  frames: { readonly framesPerSecond: number };
  samples: { readonly samplesPerSecond: number };
  beats: { readonly tempoMap: TempoMap };
  simulation: { readonly stepsPerSecond?: number };
}>;

/** One tempo change in seconds and beats per minute. */
export interface TempoPoint {
  readonly atSeconds: number;
  readonly beatsPerMinute: number;
}

/** Ordered tempo map for beat-based timecodes. */
export interface TempoMap {
  readonly points: readonly TempoPoint[];
}

/** Position measured in one declared timebase. */
export interface Timecode<Base extends Timebase = Timebase> {
  readonly timebase: Base;
  readonly value: number | bigint;
}

/** Product of all temporal coordinates captured for one coherent transaction. */
export interface TimeCut<Axes extends readonly TimeCoordinate[] = readonly TimeCoordinate[]> {
  readonly coordinates: Axes;
}

/** Ordering result, including partial-order outcomes. */
export type TemporalOrder = 'before' | 'equal' | 'after' | 'concurrent' | 'incomparable';

/** Pure tick contract. Physical clocks are supplied outside the semantic fold. */
export type Tick<State, Input, Coordinate extends TimeCut, Failure = never> = (
  state: Readonly<State>,
  input: Readonly<Input>,
  time: Coordinate,
) => Result<State, Failure>;

/** Conversion between two declared timebases. Rates and tempo maps remain explicit. */
export interface TimeProjection<From extends Timebase = Timebase, To extends Timebase = Timebase> {
  readonly from: From;
  readonly to: To;
  readonly exact: boolean;
  readonly invertible: boolean;
  readonly tolerance?: number;
}

/** Invalid or unsupported temporal relationship. */
export type TimeFailure = Result<never, readonly Diagnostic[]>;

/** Type summary consumed by the root core topology. */
export interface TimeTypeSurface {
  readonly coordinate: TimeCoordinate;
  readonly timebase: Timebase;
  readonly timecode: Timecode;
  readonly projection: TimeProjection;
  readonly cut: TimeCut;
  readonly order: TemporalOrder;
  readonly hybrid: HybridLogicalClock;
  readonly vector: VectorClock;
  readonly tick: Tick<unknown, unknown, TimeCut, unknown>;
}
