/** Shared type vocabulary for reactive state transitions. @module */

import type { StateName, HLC } from '../schema/brands.js';

/** A witnessed transition between two named boundary states. */
export type BoundaryCrossing<S extends string = string> = {
  readonly from: StateName<S>;
  readonly to: StateName<S>;
  readonly timestamp: HLC;
  readonly value: number;
};
