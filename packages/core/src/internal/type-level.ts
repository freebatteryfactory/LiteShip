/**
 * Type-level utilities for `@liteship/core`.
 *
 * Mapped types, conditional helpers, and structural utilities
 * used across boundary definitions and compositor outputs.
 *
 * @module
 */

import type { Boundary } from '../authoring/boundary.js';
import type { StateName, HLC } from '../schema/brands.js';

/** Flatten branded intersections for clean IDE hints */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Extract literal union of state names from a Boundary.Shape */
export type StateUnion<B extends Boundary.Shape> = B['states'][number];

/** Generate valid output shapes per state */
export type OutputsFor<B extends Boundary.Shape, T> = {
  readonly [S in StateUnion<B>]: T;
};

/**
 * Result of evaluating a single numeric value against a boundary (the rich face
 * of `Boundary.evaluateResult`).
 *
 * `crossed` is true only when `previousState` was supplied and differs from the
 * resolved state; consumers use it to emit transition events and route side
 * effects. `index` is the position of `state` within the boundary's states tuple.
 */
export interface EvaluateResult<S extends string = string> {
  /** The resolved state literal. */
  readonly state: S;
  /** Index of `state` within the boundary's states tuple. */
  readonly index: number;
  /** The input value that was evaluated. */
  readonly value: number;
  /** Whether evaluation produced a change from `previousState`. */
  readonly crossed: boolean;
}

/** Discriminated union of boundary crossings */
export type BoundaryCrossing<S extends string = string> = {
  readonly from: StateName<S>;
  readonly to: StateName<S>;
  readonly timestamp: HLC;
  readonly value: number;
};

/** Require at least one key of T */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

/** Deep readonly */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Record<string, unknown>
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
