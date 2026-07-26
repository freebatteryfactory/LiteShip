[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / WatchAndPrepareHandle

# Interface: WatchAndPrepareHandle

Defined in: web/dist/dpu/watch-and-prepare.d.ts:91

Handle returned by [watchAndPrepare](../functions/watchAndPrepare.md) — stamps and applies verifiable patches.

## Properties

### capability

> `readonly` **capability**: [`DpuCapability`](../type-aliases/DpuCapability.md)

Defined in: web/dist/dpu/watch-and-prepare.d.ts:94

***

### marker

> `readonly` **marker**: `string`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:92

***

### target

> `readonly` **target**: `Element`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:93

## Methods

### apply()

> **apply**(`envelope`, `currentBaseGraphId`): [`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

Defined in: web/dist/dpu/watch-and-prepare.d.ts:100

#### Parameters

##### envelope

[`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

##### currentBaseGraphId

`ContentAddress`

#### Returns

[`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

***

### dispose()

> **dispose**(): `void`

Defined in: web/dist/dpu/watch-and-prepare.d.ts:102

Release the marker registration so the name can be re-watched.

#### Returns

`void`

***

### stamp()

> **stamp**(`input`): [`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

Defined in: web/dist/dpu/watch-and-prepare.d.ts:95

#### Parameters

##### input

###### baseGraphId

`ContentAddress`

###### html

`string`

###### resultGraphId

`ContentAddress`

#### Returns

[`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)
