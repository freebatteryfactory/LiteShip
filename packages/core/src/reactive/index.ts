/**
 * `@liteship/core/reactive` — the reactive substrate: signals, cells (Cell/
 * Derived/Zap/Store/LiveCell), the disposal Lifetime + CellKernel, the scheduler,
 * dirty tracking, speculative evaluation, state cells, stream recovery, and the
 * runtime coordinator. Curated named re-exports only — no behavior lives here.
 * @module
 */

export { Lifetime } from './lifetime.js';

export type { LifetimeShape, LifetimeDisposeError, Finalizer } from './lifetime.js';

export { CellKernel } from './cell-kernel.js';

export type { Disposer, CellSink, CellSubscriber, CellReplayShape, CellFanoutShape } from './cell-kernel.js';

export { Signal } from './signal.js';

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

export { DirtyFlags } from './dirty.js';

export { Cell } from './cell.js';

export { Derived } from './derived.js';

export { Zap } from './zap.js';

export { Store } from './store.js';

export { RuntimeCoordinator } from './runtime-coordinator.js';

export type { RuntimePhase, RuntimeCoordinatorConfig } from './runtime-coordinator.js';

export { LiveCell } from './live-cell.js';

export { isCell, isDerived, isZap } from './primitive.js';

export type { Primitive } from './primitive.js';
