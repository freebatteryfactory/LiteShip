/**
 * Continuous-to-discrete quantization, hysteresis, and interpolation.
 *
 * One named state may drive CSS, accessibility, shaders, media quality, scene
 * behavior, and explanation without those projections inventing separate state.
 * This home also owns interpolation identity so scenes, motion, media, and
 * reconstruction cannot drift into parallel easing systems.
 *
 * @module
 */

import type { Brand, NonEmptyTuple, Reference, RequirementRow, Signature } from '../../types.js';
import type { ContentAddress } from '../01_encoding/types.js';
import type { SchemaId, SchemaReference } from '../03_schema/types.js';
import type { EvidenceReference } from '../06_evidence/types.js';

export type SignalId<Name extends string = string> = Brand<Name, 'liteship.signal-id'>;
export type BoundaryId<Name extends string = string> = Brand<Name, 'liteship.boundary-id'>;
export type QuantizerId<Name extends string = string> = Brand<Name, 'liteship.quantizer-id'>;
export type InterpolatorId<Name extends string = string> = Brand<Name, 'liteship.interpolator-id'>;
export type QuantizerOutputId<Name extends string = string> = Brand<Name, 'liteship.quantizer-output-id'>;
export type StateName<Name extends string = string> = Brand<Name, 'liteship.state-name'>;
export type BoundaryReference<Id extends BoundaryId = BoundaryId> = Reference<'boundary', Id>;
export type QuantizerReference<Id extends QuantizerId = QuantizerId> = Reference<'quantizer', Id>;
export type InterpolatorReference<Id extends InterpolatorId = InterpolatorId> = Reference<'interpolator', Id>;
export type QuantizerOutputReference<Id extends QuantizerOutputId = QuantizerOutputId> = Reference<'quantizer-output', Id>;

/** One ordered threshold and its resulting named state. */
export interface BoundaryStep<State extends string = string> {
  readonly minimum: number;
  readonly state: StateName<State>;
}

/** Immutable continuous-to-discrete boundary. */
export interface BoundaryDefinition<States extends NonEmptyTuple<string> = NonEmptyTuple<string>> {
  readonly id: BoundaryId;
  readonly input: SignalId | EvidenceReference;
  readonly steps: { readonly [Index in keyof States]: BoundaryStep<States[Index] & string> };
  readonly hysteresis?: number;
  readonly address: ContentAddress<'application/vnd.liteship.boundary+cbor'>;
}

/** Exact evaluation result. */
export interface QuantizationResult<State extends string = string> {
  readonly state: StateName<State>;
  readonly index: number;
  readonly input: number;
  readonly crossed: boolean;
}

/** Target-independent per-state semantic values. */
export interface StateTable<State extends string = string, Value = unknown> {
  readonly states: Readonly<Record<State, Value>>;
}

/** Canonical interpolation definition shared by every semantic consumer. */
export interface InterpolatorDefinition<
  Value = unknown,
  Failure = never,
  Requirements extends RequirementRow = readonly [],
> {
  readonly id: InterpolatorId;
  readonly valueSchema: SchemaReference<SchemaId, Value>;
  readonly signature: Signature<
    { readonly from: Value; readonly to: Value; readonly progress: number },
    Value,
    Failure,
    Requirements
  >;
  readonly requirements: Requirements;
  readonly address: ContentAddress<'application/vnd.liteship.interpolator+cbor'>;
}

/** Reconstruction between two named states over a progress coordinate. */
export interface ReconstructionDefinition<State extends string = string, Value = unknown> {
  readonly from: StateName<State>;
  readonly to: StateName<State>;
  readonly values: readonly [Value, Value];
  readonly interpolator: InterpolatorReference;
}

/** One semantic output channel owned by a quantizer. */
export interface QuantizerOutput<
  States extends NonEmptyTuple<string> = NonEmptyTuple<string>,
  Value = unknown,
> {
  readonly id: QuantizerOutputId;
  readonly schema: SchemaReference<SchemaId, Value>;
  readonly table: StateTable<States[number] & string, Value>;
}

/** Immutable quantizer definition. */
export interface QuantizerDefinition<States extends NonEmptyTuple<string> = NonEmptyTuple<string>> {
  readonly id: QuantizerId;
  readonly boundary: BoundaryReference;
  readonly states: States;
  readonly outputs: readonly QuantizerOutput<States>[];
  readonly reconstruction?: readonly ReconstructionDefinition<States[number] & string>[];
  readonly address: ContentAddress<'application/vnd.liteship.quantizer+cbor'>;
}

/** Quality policy is itself a quantizer over declared evidence. */
export interface QualityPolicy<States extends NonEmptyTuple<string> = NonEmptyTuple<string>> {
  readonly quantizer: QuantizerDefinition<States>;
  readonly preserves: readonly ('truth' | 'security' | 'authority' | 'accessibility' | 'required-interaction')[];
}

/** Type summary consumed by the root core topology. */
export interface QuantizationTypeSurface {
  readonly boundary: BoundaryDefinition;
  readonly quantizer: QuantizerDefinition;
  readonly output: QuantizerOutput;
  readonly result: QuantizationResult;
  readonly interpolator: InterpolatorDefinition;
  readonly reconstruction: ReconstructionDefinition;
  readonly quality: QualityPolicy;
}
