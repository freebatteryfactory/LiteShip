/** Shared type vocabulary for authored adaptive definitions. @module */

import type { Boundary } from './boundary.js';

/** Extract the literal union of state names from a boundary. */
export type StateUnion<B extends Boundary> = B['states'][number];

/** Generate a complete output table keyed by the states in a boundary. */
export type OutputsFor<B extends Boundary, T> = {
  readonly [S in StateUnion<B>]: T;
};

/** Rich result of evaluating one numeric value against a boundary. */
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
