/**
 * Quantizer interface -- the base contract for quantizer implementations.
 *
 * The canonical implementation lives in `@liteship/quantizer` (the `defineQuantizer` /
 * `createQuantizer` two-step API).
 *
 * The contract is split in two: a purely SYNCHRONOUS base ({@link Quantizer}) and
 * a reactive extension ({@link ReactiveQuantizer}). The base carries only what a
 * synchronous consumer needs — the boundary, `evaluate`, and an optional
 * synchronous state accessor — so a sync-only quantizer (e.g. Stage's pose-parked
 * quantizer) never has to FABRICATE reactive fields it does not own. The reactive
 * state read and crossing subscription live on {@link ReactiveQuantizer}, retyped
 * onto the {@link CellKernel} extracted from the compositor seam (replacing the
 * former `Effect.Effect<StateUnion>` state and `Stream.Stream<BoundaryCrossing>`
 * changes).
 *
 * @module
 */

import type { CellKernel } from '../reactive/cell-kernel.js';
import type { Boundary } from '../authoring/boundary.js';
import type { StateUnion } from '../authoring/types.js';
import type { BoundaryCrossing } from '../reactive/types.js';

/**
 * Quantizer contract — the SYNCHRONOUS base: a {@link Boundary} definition, its
 * `evaluate` transition, and an optional synchronous state accessor for hot
 * paths. The reactive machinery (a current-state read and a crossing
 * subscription) is layered on by {@link ReactiveQuantizer}; a consumer that only
 * evaluates and reads `stateSync` never touches the reactive substrate.
 *
 * The concrete reactive implementation is produced by `@liteship/quantizer`'s
 * `createQuantizer` (a {@link ReactiveQuantizer}); consumers interact only via
 * these structural interfaces.
 */
export interface Quantizer<B extends Boundary = Boundary> {
  readonly _tag: 'Quantizer';
  readonly boundary: B;
  /** Synchronous state accessor for hot paths (avoids reactive read overhead). */
  readonly stateSync?: () => StateUnion<B>;
  evaluate(value: number): StateUnion<B>;
}

/**
 * Live current-state surface — the replay-1 {@link CellKernel} read side.
 * `read()` returns the current discrete state; a subscriber is replayed the
 * current value on attach (the replay-1 contract). Replaces the former
 * `Effect.Effect<StateUnion<B>>` state accessor.
 */
export type QuantizerState<B extends Boundary = Boundary> = Pick<
  CellKernel.Replay<StateUnion<B>>,
  'read' | 'subscribe' | 'closed' | 'size'
>;

/**
 * Crossing subscription surface — the no-replay {@link CellKernel} fan-out side.
 * `subscribe(sink)` registers a crossing listener and returns its disposer; a
 * late subscriber never sees a prior crossing. Replaces the former
 * `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>` changes.
 */
export type QuantizerCrossings<B extends Boundary = Boundary> = Pick<
  CellKernel.Fanout<BoundaryCrossing<StateUnion<B> & string>>,
  'subscribe' | 'closed' | 'size'
>;

/**
 * Reactive quantizer — the {@link Quantizer} base plus its reactive substrate: a
 * replay-1 current-state read and a no-replay crossing subscription, both on the
 * extracted {@link CellKernel}. This is the shape `@liteship/quantizer`'s live
 * evaluator produces; a purely-synchronous quantizer omits this extension.
 */
export interface ReactiveQuantizer<B extends Boundary = Boundary> extends Quantizer<B> {
  /** Replay-1 current-state read (was `Effect.Effect<StateUnion<B>>`). */
  readonly state: QuantizerState<B>;
  /** No-replay crossing subscription (was `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`). */
  readonly changes: QuantizerCrossings<B>;
}

/**
 * A quantizer the {@link Compositor} can drive: it must be able to produce its
 * current discrete state, EITHER synchronously (a REQUIRED {@link Quantizer.stateSync})
 * OR reactively (a full {@link ReactiveQuantizer} with `state.read()`). The bare
 * {@link Quantizer} base — no `stateSync`, no reactive `state` — is deliberately
 * rejected: `Compositor.add` reads the state during its initial `compute-discrete`
 * pass, so a base-only quantizer would crash at runtime. Encoding the requirement
 * in the accepted type turns that into a compile-time error instead (the base
 * `Quantizer` contract is public, so a consumer could otherwise satisfy it and fail).
 */
export type CompositorQuantizer<B extends Boundary = Boundary> =
  (Quantizer<B> & { readonly stateSync: () => StateUnion<B> }) | ReactiveQuantizer<B>;
