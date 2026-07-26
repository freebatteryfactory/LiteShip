[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / liteship/src/reactive

# liteship/src/reactive

`liteship/reactive` — the curated facade over `@liteship/core/reactive`: the
reactive substrate. Signals, cells (Cell/Derived/Zap/Store/LiveCell), the
disposal Lifetime + CellKernel, the scheduler, dirty tracking, speculative
evaluation, state cells, stream recovery, and the runtime coordinator. Curated
named re-exports only — no behavior lives here.

## Namespaces

- [CellKernel](namespaces/CellKernel/README.md)
- [Lifetime](namespaces/Lifetime/README.md)
- [ProjectionState](namespaces/ProjectionState/README.md)
- [RuntimeCoordinator](namespaces/RuntimeCoordinator/README.md)
- [Scheduler](namespaces/Scheduler/README.md)
- [Signal](namespaces/Signal/README.md)
- [SpeculativeEvaluator](namespaces/SpeculativeEvaluator/README.md)
- [StateCell](namespaces/StateCell/README.md)

## Interfaces

- [AsyncOwnedResource](interfaces/AsyncOwnedResource.md)
- [CellFanoutShape](interfaces/CellFanoutShape.md)
- [CellReplayShape](interfaces/CellReplayShape.md)
- [CellSink](interfaces/CellSink.md)
- [LifetimeDisposeError](interfaces/LifetimeDisposeError.md)
- [LifetimeShape](interfaces/LifetimeShape.md)
- [LiveQuantizer](interfaces/LiveQuantizer.md)
- [OwnedResource](interfaces/OwnedResource.md)
- [ProjectionState](interfaces/ProjectionState.md)
- [ProjectionStateOptions](interfaces/ProjectionStateOptions.md)
- [QuantizerConfig](interfaces/QuantizerConfig.md)
- [QuantizerRuntime](interfaces/QuantizerRuntime.md)
- [RafDebouncedTrigger](interfaces/RafDebouncedTrigger.md)
- [ResolvedStateSnapshot](interfaces/ResolvedStateSnapshot.md)
- [RuntimeCoordinatorConfig](interfaces/RuntimeCoordinatorConfig.md)
- [StateCell](interfaces/StateCell.md)
- [StateCellRegisterOptions](interfaces/StateCellRegisterOptions.md)
- [StateCellStoreShape](interfaces/StateCellStoreShape.md)
- [StateResolutionReceipt](interfaces/StateResolutionReceipt.md)

## Type Aliases

- [Cell](type-aliases/Cell.md)
- [CellSubscriber](type-aliases/CellSubscriber.md)
- [Computed](type-aliases/Computed.md)
- [Derived](type-aliases/Derived.md)
- [DirtyFlags](type-aliases/DirtyFlags.md)
- [Disposer](type-aliases/Disposer.md)
- [Finalizer](type-aliases/Finalizer.md)
- [Lifetime](type-aliases/Lifetime.md)
- [Lifetime](type-aliases/Lifetime-1.md)
- [LifetimeDisposeError](type-aliases/LifetimeDisposeError.md)
- [LiveCell](type-aliases/LiveCell.md)
- [OwnedQuantizer](type-aliases/OwnedQuantizer.md)
- [Primitive](type-aliases/Primitive.md)
- [ReplayableRecoveryCell](type-aliases/ReplayableRecoveryCell.md)
- [RuntimeCoordinator](type-aliases/RuntimeCoordinator.md)
- [RuntimePhase](type-aliases/RuntimePhase.md)
- [Scheduler](type-aliases/Scheduler.md)
- [Signal](type-aliases/Signal.md)
- [SignalSource](type-aliases/SignalSource.md)
- [SignalSourceType](type-aliases/SignalSourceType.md)
- [SpeculativeEvaluator](type-aliases/SpeculativeEvaluator.md)
- [StateAuthority](type-aliases/StateAuthority.md)
- [StateCellKind](type-aliases/StateCellKind.md)
- [StateCellStore](type-aliases/StateCellStore.md)
- [Store](type-aliases/Store.md)
- [Zap](type-aliases/Zap.md)

## Variables

- [asReplayableRecoveryCell](variables/asReplayableRecoveryCell.md)
- [CellKernel](variables/CellKernel.md)
- [computed](variables/computed.md)
- [createCell](variables/createCell.md)
- [createStore](variables/createStore.md)
- [Derived](variables/Derived.md)
- [isCell](variables/isCell.md)
- [isDerived](variables/isDerived.md)
- [isZap](variables/isZap.md)
- [ProjectionState](variables/ProjectionState.md)
- [replayDroppedSignals](variables/replayDroppedSignals.md)
- [RuntimeCoordinator](variables/RuntimeCoordinator.md)
- [Scheduler](variables/Scheduler.md)
- [Signal](variables/Signal.md)
- [SpeculativeEvaluator](variables/SpeculativeEvaluator.md)
- [StateCell](variables/StateCell.md)
- [StateCellStore](variables/StateCellStore.md)
- [Zap](variables/Zap.md)

## Functions

- [attachLifetime](functions/attachLifetime.md)
- [createDirtyFlags](functions/createDirtyFlags.md)
- [createLifetime](functions/createLifetime.md)
- [createLiveCell](functions/createLiveCell.md)
- [createLiveCellBoundary](functions/createLiveCellBoundary.md)
- [createQuantizer](functions/createQuantizer.md)
- [createSignal](functions/createSignal.md)
- [filterDiscreteSnapshotSignals](functions/filterDiscreteSnapshotSignals.md)
- [inputSourceType](functions/inputSourceType.md)
- [inputToSource](functions/inputToSource.md)
- [isReplayHtmlPatch](functions/isReplayHtmlPatch.md)
- [rafDebounce](functions/rafDebounce.md)
- [signalPayloadKind](functions/signalPayloadKind.md)
- [signalSourceKind](functions/signalSourceKind.md)
- [sourceToInput](functions/sourceToInput.md)
- [startRafLoop](functions/startRafLoop.md)
- [validateSnapshotSignalsField](functions/validateSnapshotSignalsField.md)

## References

### ProjectionStateShape

Renames and re-exports [ProjectionState](variables/ProjectionState.md)

***

### StateCellShape

Renames and re-exports [StateCell](variables/StateCell.md)
