[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CompositorWorker

# Interface: CompositorWorker

Defined in: [\_spine/worker.d.ts:388](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L388)

Live worker handle that owns quantization and compositor state.

## Extends

- [`AsyncOwnedResource`](AsyncOwnedResource.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](Lifetime.md)

Defined in: [\_spine/core.d.ts:181](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L181)

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`lifetime`](AsyncOwnedResource.md#lifetime)

***

### runtime

> `readonly` **runtime**: [`RuntimeCoordinator`](RuntimeCoordinator.md)

Defined in: [\_spine/worker.d.ts:391](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L391)

Shared runtime coordination surface reflecting host-side worker state.

***

### worker

> `readonly` **worker**: `Worker`

Defined in: [\_spine/worker.d.ts:389](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L389)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L183)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`[asyncDispose]`](AsyncOwnedResource.md#asyncdispose)

***

### addQuantizer()

#### Call Signature

> **addQuantizer**(`boundary`): `void`

Defined in: [\_spine/worker.d.ts:393](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L393)

Register a quantizer from a defineBoundary result; name defaults to boundary.input.

##### Parameters

###### boundary

[`QuantizerBoundarySource`](QuantizerBoundarySource.md)

##### Returns

`void`

#### Call Signature

> **addQuantizer**(`name`, `boundary`): `void`

Defined in: [\_spine/worker.d.ts:394](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L394)

##### Parameters

###### name

`string`

###### boundary

###### id

[`ContentAddress`](../type-aliases/ContentAddress.md)

###### states

readonly `string`[]

Plain strings — branded to StateName internally; both overloads share the unbranded surface (F2).

###### thresholds

readonly `number`[]

##### Returns

`void`

***

### applyResolvedState()

> **applyResolvedState**(`states`): `void`

Defined in: [\_spine/worker.d.ts:409](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L409)

Mirror resolved quantizer state updates into the worker without raw threshold evaluation.

#### Parameters

##### states

readonly [`ResolvedStateEntry`](ResolvedStateEntry.md)[]

#### Returns

`void`

***

### bootstrapResolvedState()

> **bootstrapResolvedState**(`states`): `void`

Defined in: [\_spine/worker.d.ts:407](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L407)

Seed resolved quantizer state into the worker without raw threshold evaluation.

#### Parameters

##### states

readonly [`ResolvedStateEntry`](ResolvedStateEntry.md)[]

#### Returns

`void`

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [\_spine/core.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L182)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](AsyncOwnedResource.md).[`dispose`](AsyncOwnedResource.md#dispose)

***

### evaluate()

> **evaluate**(`name`, `value`): `void`

Defined in: [\_spine/worker.d.ts:404](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L404)

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

Defined in: [\_spine/worker.d.ts:420](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L420)

Subscribe to metrics updates. The callback receives a single
[WorkerMetrics](../type-aliases/WorkerMetrics.md) record (not positional `fps`/`budgetUsed`
arguments), so a future metric can be added without breaking
existing callbacks (F1).

#### Parameters

##### callback

(`metrics`) => `void`

#### Returns

() => `void`

***

### onResolvedStateAck()

> **onResolvedStateAck**(`callback`): () => `void`

Defined in: [\_spine/worker.d.ts:413](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L413)

Subscribe to resolved-state acknowledgement updates. Returns an unsubscribe function.

#### Parameters

##### callback

(`ack`) => `void`

#### Returns

() => `void`

***

### onState()

> **onState**(`callback`): () => `void`

Defined in: [\_spine/worker.d.ts:411](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L411)

#### Parameters

##### callback

(`state`) => `void`

#### Returns

() => `void`

***

### removeQuantizer()

> **removeQuantizer**(`name`): `void`

Defined in: [\_spine/worker.d.ts:403](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L403)

#### Parameters

##### name

`string`

#### Returns

`void`

***

### requestCompute()

> **requestCompute**(): `void`

Defined in: [\_spine/worker.d.ts:410](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L410)

#### Returns

`void`

***

### setBlendWeights()

> **setBlendWeights**(`name`, `weights`): `void`

Defined in: [\_spine/worker.d.ts:405](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L405)

#### Parameters

##### name

`string`

##### weights

`Record`\<`string`, `number`\>

#### Returns

`void`
