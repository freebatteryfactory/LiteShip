/**
 * `@liteship/core/reactive` — the reactive substrate: signals, cells (Cell/
 * Derived/Zap/Store/LiveCell), the disposal Lifetime + CellKernel, the scheduler,
 * dirty tracking, speculative evaluation, state cells, stream recovery, and the
 * runtime coordinator. Curated named re-exports only — no behavior lives here.
 * @module
 */

export { Lifetime, attachLifetime, createLifetime } from './lifetime.js';

export type { LifetimeShape, LifetimeDisposeError, Finalizer, OwnedResource, AsyncOwnedResource } from './lifetime.js';

export { CellKernel } from './cell-kernel.js';

export type { Disposer, CellSink, CellSubscriber, CellReplayShape, CellFanoutShape } from './cell-kernel.js';

export { Signal, createSignal } from './signal.js';

export type { SignalSourceType, SignalSource } from './signal.js';

export { sourceToInput, inputToSource, inputSourceType } from './signal-input.js';

export { StateCell, ProjectionState, StateCellStore } from './state-cell.js';

export type {
  StateAuthority,
  StateCellKind,
  StateCell as StateCellShape,
  StateResolutionReceipt,
  ProjectionState as ProjectionStateShape,
  ResolvedStateSnapshot,
  StateCellRegisterOptions,
  ProjectionStateOptions,
  StateCellStoreShape,
} from './state-cell.js';

export {
  asReplayableRecoveryCell,
  signalSourceKind,
  signalPayloadKind,
  isReplayHtmlPatch,
  replayDroppedSignals,
  filterDiscreteSnapshotSignals,
  validateSnapshotSignalsField,
} from './stream-recovery.js';

export type { ReplayableRecoveryCell } from './stream-recovery.js';

export { Scheduler, rafDebounce, startRafLoop } from './scheduler.js';

export type { RafDebouncedTrigger } from './scheduler.js';

export { SpeculativeEvaluator } from './speculative.js';

export { createDirtyFlags } from './dirty.js';

export type { DirtyFlags } from './dirty.js';

export { createCell } from './cell.js';

export type { Cell } from './cell.js';

export { Derived, computed } from './derived.js';

export { Zap } from './zap.js';

export { createStore } from './store.js';

export type { Store } from './store.js';

export { RuntimeCoordinator } from './runtime-coordinator.js';

export type { RuntimePhase, RuntimeCoordinatorConfig } from './runtime-coordinator.js';

export { createLiveCell, createLiveCellBoundary } from './live-cell.js';

export type { LiveCell } from './live-cell.js';

export { isCell, isDerived, isZap } from './primitive.js';

export type { Primitive } from './primitive.js';

export type { BoundaryCrossing } from './types.js';
