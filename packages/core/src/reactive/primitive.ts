/**
 * The reactive primitive union + its narrowing guards. `Primitive<T>` is the
 * type user code sees when it holds "some reactive value" without knowing which
 * of the three kinds it is; `isCell`/`isDerived`/`isZap` narrow it by `_tag`.
 *
 * These live in a concrete reactive module (not the facade) so the package root
 * barrel can re-export them by name — a facade is a pure re-export surface
 * (ADR-0045), never a definition site.
 *
 * @module
 */
import type { Cell } from './cell.js';
import type { Derived } from './derived.js';
import type { Zap } from './zap.js';

/** Union of the three reactive primitives the LiteShip graph exposes to user code. */
export type Primitive<T> = Cell.Shape<T> | Derived.Shape<T> | Zap.Shape<T>;

/** Narrow a {@link Primitive} to a {@link Cell}. */
export const isCell = <T>(p: Primitive<T>): p is Cell.Shape<T> => p._tag === 'Cell';
/** Narrow a {@link Primitive} to a {@link Derived}. */
export const isDerived = <T>(p: Primitive<T>): p is Derived.Shape<T> => p._tag === 'Derived';
/** Narrow a {@link Primitive} to a {@link Zap}. */
export const isZap = <T>(p: Primitive<T>): p is Zap.Shape<T> => p._tag === 'Zap';
