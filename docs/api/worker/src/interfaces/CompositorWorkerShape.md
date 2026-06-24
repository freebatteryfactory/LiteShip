[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / CompositorWorkerShape

# Interface: CompositorWorkerShape

Defined in: [worker/src/compositor-types.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L76)

Host-facing surface of a compositor worker. Returned by
[CompositorWorker](../namespaces/CompositorWorker/README.md) as the public control/observation API. Owns
the underlying `Worker` -- call [CompositorWorkerShape.dispose](#dispose)
to terminate and release resources.

## Properties

### runtime

> `readonly` **runtime**: `RuntimeCoordinatorShape`

Defined in: [worker/src/compositor-types.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L80)

Shared runtime coordination surface reflecting host-side worker state.

***

### worker

> `readonly` **worker**: `Worker`

Defined in: [worker/src/compositor-types.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L78)

The underlying Worker instance.

## Methods

### addQuantizer()

#### Call Signature

> **addQuantizer**(`boundary`): `void`

Defined in: [worker/src/compositor-types.ts:86](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L86)

Register a quantizer from a `Boundary.make` result — id, states, and
thresholds are derived; the quantizer name defaults to `boundary.input`.

##### Parameters

###### boundary

[`QuantizerBoundarySource`](QuantizerBoundarySource.md)

##### Returns

`void`

#### Call Signature

> **addQuantizer**(`name`, `boundary`): `void`

Defined in: [worker/src/compositor-types.ts:96](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L96)

Register a quantizer in the worker under an explicit name.

`states` is `readonly string[]` to match the single-arg
[QuantizerBoundarySource](QuantizerBoundarySource.md) form — the labels are branded to
`StateName` internally, so callers may pass plain strings or already
branded `StateName`s interchangeably (both overloads now speak the
same unbranded surface; F2).

##### Parameters

###### name

`string`

###### boundary

###### id

`ContentAddress`

###### states

readonly `string`[]

###### thresholds

readonly `number`[]

##### Returns

`void`

***

### applyResolvedState()

> **applyResolvedState**(`states`): `void`

Defined in: [worker/src/compositor-types.ts:118](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L118)

Mirror resolved quantizer state updates into the worker without raw threshold evaluation.

#### Parameters

##### states

readonly `ResolvedStateEntry`[]

#### Returns

`void`

***

### bootstrapResolvedState()

> **bootstrapResolvedState**(`states`): `void`

Defined in: [worker/src/compositor-types.ts:115](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L115)

Seed resolved quantizer state into the worker without raw threshold evaluation.

#### Parameters

##### states

readonly `ResolvedStateEntry`[]

#### Returns

`void`

***

### dispose()

> **dispose**(): `void`

Defined in: [worker/src/compositor-types.ts:139](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L139)

Terminate the worker and clean up resources.

#### Returns

`void`

***

### evaluate()

> **evaluate**(`name`, `value`): `void`

Defined in: [worker/src/compositor-types.ts:109](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L109)

Evaluate a quantizer with a numeric value (threshold-based).

#### Parameters

##### name

`string`

##### value

`number`

#### Returns

`void`

***

### onMetrics()

> **onMetrics**(`callback`): () => `void`

Defined in: [worker/src/compositor-types.ts:136](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L136)

Subscribe to metrics updates. Returns an unsubscribe function.

The callback receives a single [WorkerMetrics](../type-aliases/WorkerMetrics.md) record (not
positional `fps`/`budgetUsed` arguments), so a future metric can be
added without breaking existing callbacks (F1).

#### Parameters

##### callback

(`metrics`) => `void`

#### Returns

() => `void`

***

### onResolvedStateAck()

> **onResolvedStateAck**(`callback`): () => `void`

Defined in: [worker/src/compositor-types.ts:127](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L127)

Subscribe to resolved-state acknowledgement updates. Returns an unsubscribe function.

#### Parameters

##### callback

(`ack`) => `void`

#### Returns

() => `void`

***

### onState()

> **onState**(`callback`): () => `void`

Defined in: [worker/src/compositor-types.ts:124](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L124)

Subscribe to state updates from the worker. Returns an unsubscribe function.

#### Parameters

##### callback

(`state`) => `void`

#### Returns

() => `void`

***

### removeQuantizer()

> **removeQuantizer**(`name`): `void`

Defined in: [worker/src/compositor-types.ts:106](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L106)

Remove a quantizer from the worker.

#### Parameters

##### name

`string`

#### Returns

`void`

***

### requestCompute()

> **requestCompute**(): `void`

Defined in: [worker/src/compositor-types.ts:121](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L121)

Request the worker to compute and return a CompositeState.

#### Returns

`void`

***

### setBlendWeights()

> **setBlendWeights**(`name`, `weights`): `void`

Defined in: [worker/src/compositor-types.ts:112](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L112)

Override blend weights for a quantizer.

#### Parameters

##### name

`string`

##### weights

`Record`\<`string`, `number`\>

#### Returns

`void`
