/**
 * `liteship/reactive` — the curated facade over `@liteship/core/reactive`: the
 * reactive substrate. Signals, cells (Cell/Derived/Zap/Store/LiveCell), the
 * disposal Lifetime + CellKernel, the scheduler, dirty tracking, speculative
 * evaluation, state cells, stream recovery, and the runtime coordinator. Curated
 * named re-exports only — no behavior lives here.
 * @module
 */

export { Lifetime, attachLifetime } from '@liteship/core/reactive';
export type {
  LifetimeShape,
  LifetimeDisposeError,
  Finalizer,
  OwnedResource,
  AsyncOwnedResource,
} from '@liteship/core/reactive';

export { CellKernel } from '@liteship/core/reactive';
export type { Disposer, CellSink, CellSubscriber, CellReplayShape, CellFanoutShape } from '@liteship/core/reactive';

export { Signal } from '@liteship/core/reactive';
export type { SignalSourceType, SignalSource } from '@liteship/core/reactive';

export { sourceToInput, inputToSource, inputSourceType } from '@liteship/core/reactive';

export { StateCell, ProjectionState, StateCellStore } from '@liteship/core/reactive';
export type {
  StateAuthority,
  StateCellKind,
  StateCellShape,
  StateResolutionReceipt,
  ProjectionStateShape,
  ResolvedStateSnapshot,
  StateCellRegisterOptions,
  ProjectionStateOptions,
  StateCellStoreShape,
} from '@liteship/core/reactive';

export {
  asReplayableRecoveryCell,
  signalSourceKind,
  signalPayloadKind,
  isReplayHtmlPatch,
  replayDroppedSignals,
  filterDiscreteSnapshotSignals,
  validateSnapshotSignalsField,
} from '@liteship/core/reactive';
export type { ReplayableRecoveryCell } from '@liteship/core/reactive';

export { Scheduler, rafDebounce, startRafLoop } from '@liteship/core/reactive';
export type { RafDebouncedTrigger } from '@liteship/core/reactive';

export { SpeculativeEvaluator } from '@liteship/core/reactive';

export { DirtyFlags } from '@liteship/core/reactive';

export { createCell } from '@liteship/core/reactive';
export type { Cell } from '@liteship/core/reactive';

export { Derived, computed } from '@liteship/core/reactive';

export { Zap } from '@liteship/core/reactive';

export { createStore } from '@liteship/core/reactive';
export type { Store } from '@liteship/core/reactive';

export { RuntimeCoordinator } from '@liteship/core/reactive';
export type { RuntimePhase, RuntimeCoordinatorConfig } from '@liteship/core/reactive';

export { LiveCell } from '@liteship/core/reactive';

export { isCell, isDerived, isZap } from '@liteship/core/reactive';
export type { Primitive } from '@liteship/core/reactive';
