[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / CompositorWorkerShape

# Interface: CompositorWorkerShape

Defined in: [worker/src/compositor-types.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L67)

Host-facing surface of a compositor worker. Returned by
[CompositorWorker](../namespaces/CompositorWorker/README.md) as the public control/observation API. Owns
the underlying `Worker` -- call [CompositorWorkerShape.dispose](#dispose)
to terminate and release resources.

## Properties

### runtime

> `readonly` **runtime**: `RuntimeCoordinatorShape`

Defined in: [worker/src/compositor-types.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L71)

Shared runtime coordination surface reflecting host-side worker state.

***

### worker

> `readonly` **worker**: `Worker`

Defined in: [worker/src/compositor-types.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L69)

The underlying Worker instance.

## Methods

### addQuantizer()

#### Call Signature

> **addQuantizer**(`boundary`): `void`

Defined in: [worker/src/compositor-types.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L77)

Register a quantizer from a `Boundary.make` result — id, states, and
thresholds are derived; the quantizer name defaults to `boundary.input`.

##### Parameters

###### boundary

[`QuantizerBoundarySource`](QuantizerBoundarySource.md)

##### Returns

`void`

#### Call Signature

> **addQuantizer**(`name`, `boundary`): `void`

Defined in: [worker/src/compositor-types.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L79)

Register a quantizer in the worker under an explicit name.

##### Parameters

###### name

`string`

###### boundary

###### id

`ContentAddress`

###### states

readonly `StateName`[]

###### thresholds

readonly `number`[]

##### Returns

`void`

***

### applyResolvedState()

> **applyResolvedState**(`states`): `void`

Defined in: [worker/src/compositor-types.ts:101](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L101)

Mirror resolved quantizer state updates into the worker without raw threshold evaluation.

#### Parameters

##### states

readonly `ResolvedStateEntry`[]

#### Returns

`void`

***

### bootstrapResolvedState()

> **bootstrapResolvedState**(`states`): `void`

Defined in: [worker/src/compositor-types.ts:98](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L98)

Seed resolved quantizer state into the worker without raw threshold evaluation.

#### Parameters

##### states

readonly `ResolvedStateEntry`[]

#### Returns

`void`

***

### dispose()

> **dispose**(): `void`

Defined in: [worker/src/compositor-types.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L116)

Terminate the worker and clean up resources.

#### Returns

`void`

***

### evaluate()

> **evaluate**(`name`, `value`): `void`

Defined in: [worker/src/compositor-types.ts:92](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L92)

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

Defined in: [worker/src/compositor-types.ts:113](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L113)

Subscribe to metrics updates. Returns an unsubscribe function.

#### Parameters

##### callback

(`fps`, `budgetUsed`) => `void`

#### Returns

() => `void`

***

### onResolvedStateAck()

> **onResolvedStateAck**(`callback`): () => `void`

Defined in: [worker/src/compositor-types.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L110)

Subscribe to resolved-state acknowledgement updates. Returns an unsubscribe function.

#### Parameters

##### callback

(`ack`) => `void`

#### Returns

() => `void`

***

### onState()

> **onState**(`callback`): () => `void`

Defined in: [worker/src/compositor-types.ts:107](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L107)

Subscribe to state updates from the worker. Returns an unsubscribe function.

#### Parameters

##### callback

(`state`) => `void`

#### Returns

() => `void`

***

### removeQuantizer()

> **removeQuantizer**(`name`): `void`

Defined in: [worker/src/compositor-types.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L89)

Remove a quantizer from the worker.

#### Parameters

##### name

`string`

#### Returns

`void`

***

### requestCompute()

> **requestCompute**(): `void`

Defined in: [worker/src/compositor-types.ts:104](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L104)

Request the worker to compute and return a CompositeState.

#### Returns

`void`

***

### setBlendWeights()

> **setBlendWeights**(`name`, `weights`): `void`

Defined in: [worker/src/compositor-types.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L95)

Override blend weights for a quantizer.

#### Parameters

##### name

`string`

##### weights

`Record`\<`string`, `number`\>

#### Returns

`void`
