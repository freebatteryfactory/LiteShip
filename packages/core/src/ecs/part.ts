/**
 * ECS entity/Part identity and the admitted-value boundary.
 *
 * Unknown values become world-writable only after {@link admitPart} validates
 * them against the exact minted {@link Part}. Internal systems receive the
 * decoded value after that boundary and retain allocation-free write paths.
 *
 * @module
 */

import { InvariantViolationError, ValidationError } from '@liteship/error';
import { snapshotDefinitionValue } from '../evidence/definition-snapshot.js';
import { decode } from '../schema/decode.js';
import type { DecodeIssue } from '../schema/decode.js';
import { isSchema } from '../schema/ast.js';
import type { Schema } from '../schema/ast.js';

/** Nominal-typed identifier for an ECS entity. */
export type EntityId = string & { readonly _brand: 'EntityId' };

/** Brand an arbitrary string as an `EntityId`. Sanctioned single-site cast. */
export const EntityId = (value: string): EntityId => value as EntityId;

/** How an admitted Part takes ownership of its decoded value. */
export type PartRetentionPolicy = 'snapshot' | 'reference';

const PartWitness: unique symbol = Symbol('liteship.ecs.part');
const AdmissionWitness: unique symbol = Symbol('liteship.ecs.admission');

/** One minted, schema-backed ECS component declaration. */
export interface Part<T = unknown, Name extends string = string, Encoded = unknown> {
  readonly name: Name;
  readonly schema: Schema<T, Encoded>;
  readonly retention: PartRetentionPolicy;
  readonly [PartWitness]: T;
}

/** @internal Shared erased Part constraint for ECS owner modules. */
export type AnyPart = Part<unknown, string, unknown>;

/** Extract the runtime value carried by a Part. */
export type PartValue<P extends AnyPart> = P extends Part<infer T, string, unknown> ? T : never;

/** Construction options for {@link definePart}. */
export interface DefinePartOptions {
  /**
   * `snapshot` (default) recursively copies and freezes definition-shaped
   * data. `reference` is an explicit host-reference escape hatch for values
   * such as DOM/worker handles that cannot be snapshotted.
   */
  readonly retention?: PartRetentionPolicy;
}

const mintedParts = new WeakSet<object>();

/** Define a component identity and bind it to one strict kernel schema. */
export function definePart<const Name extends string, T, Encoded>(
  name: Name,
  schema: Schema<T, Encoded>,
  options: DefinePartOptions = {},
): Part<T, Name, Encoded> {
  if (name.trim() === '' || name !== name.trim()) {
    throw ValidationError('definePart', 'part name must be a non-empty string with no leading or trailing whitespace.');
  }
  if (!isSchema(schema)) {
    throw ValidationError('definePart', `Part "${name}" must be bound to a kernel Schema minted by schema.*.`);
  }
  const part = {
    name,
    schema,
    retention: options.retention ?? 'snapshot',
    [PartWitness]: undefined as T,
  };
  Object.freeze(part);
  mintedParts.add(part);
  return part;
}

/** A value that passed one Part's strict admission boundary. */
export interface AdmittedPartValue<P extends AnyPart = AnyPart> {
  readonly part: P;
  readonly value: PartValue<P>;
  readonly [AdmissionWitness]: true;
}

/** Result returned by {@link admitPart}. */
export type PartAdmissionResult<P extends AnyPart> =
  | { readonly ok: true; readonly value: AdmittedPartValue<P> }
  | { readonly ok: false; readonly error: readonly DecodeIssue[] };

const mintedAdmissions = new WeakSet<object>();

/** @internal Assert that a Part came from the canonical constructor. */
export function assertMintedPart(part: AnyPart): void {
  if (!mintedParts.has(part)) {
    throw InvariantViolationError(
      'ecs.part',
      `Part "${String(part?.name)}" was not minted by definePart; refusing a structurally-forged component identity.`,
    );
  }
}

/** Strictly decode, isolate, and bind one unknown value to its exact Part. */
export function admitPart<P extends AnyPart>(part: P, candidate: unknown): PartAdmissionResult<P> {
  assertMintedPart(part);
  const decoded = decode(part.schema, candidate);
  if (!decoded.ok) return { ok: false, error: Object.freeze([...decoded.error]) };
  const retained =
    part.retention === 'reference' ? decoded.value : (snapshotDefinitionValue(decoded.value) as PartValue<P>);
  const admitted: AdmittedPartValue<P> = {
    part,
    value: retained as PartValue<P>,
    [AdmissionWitness]: true,
  };
  Object.freeze(admitted);
  mintedAdmissions.add(admitted);
  return { ok: true, value: admitted };
}

/** @internal Assert that a value crossed the exact Part admission boundary. */
export function assertAdmission(value: AdmittedPartValue): void {
  if (!mintedAdmissions.has(value)) {
    throw InvariantViolationError(
      'ecs.admission',
      'component value was not minted by admitPart; refusing a forged or cross-Part admission.',
    );
  }
  assertMintedPart(value.part);
}

/** @internal Ordered Part tuple used by typed query/system projections. */
export type PartTuple = readonly AnyPart[];
/** @internal Union of the Parts carried by a tuple. */
export type TuplePart<P extends PartTuple> = P[number];
/** @internal Parts readable from required and optional declarations. */
export type ReadablePart<Q extends PartTuple, R extends PartTuple> = TuplePart<Q> | TuplePart<R>;

/** @internal Validate minted, duplicate-free authority declarations. */
export function assertUniqueParts(label: string, parts: readonly AnyPart[]): void {
  const seen = new Set<AnyPart>();
  for (const part of parts) {
    assertMintedPart(part);
    if (seen.has(part)) {
      throw ValidationError(label, `Part "${part.name}" is declared more than once.`);
    }
    seen.add(part);
  }
}
