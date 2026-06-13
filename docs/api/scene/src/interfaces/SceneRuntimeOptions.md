[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneRuntimeOptions

# Interface: SceneRuntimeOptions

Defined in: [scene/src/runtime.ts:101](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L101)

Options accepted by [SceneRuntime.build](../variables/SceneRuntime.md#build).

## Properties

### mixSink?

> `readonly` `optional` **mixSink?**: (`receipt`) => `void`

Defined in: [scene/src/runtime.ts:109](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L109)

Mix-receipt sink for PassThroughMixer. Defaults to a bounded ring
(last [DEFAULT\_MIX\_RECEIPT\_CAP](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts) receipts) accessible via
`handle.receipts`. Pass an explicit sink to receive every receipt.

#### Parameters

##### receipt

[`MixReceipt`](MixReceipt.md)

#### Returns

`void`

***

### sampleRate?

> `readonly` `optional` **sampleRate?**: `number`

Defined in: [scene/src/runtime.ts:103](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/runtime.ts#L103)

Audio sample rate fed to AudioSystem. Defaults to 48_000.
