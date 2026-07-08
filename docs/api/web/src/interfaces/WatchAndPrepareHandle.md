[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / WatchAndPrepareHandle

# Interface: WatchAndPrepareHandle

Defined in: [web/src/dpu/watch-and-prepare.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L65)

Handle returned by [watchAndPrepare](../functions/watchAndPrepare.md) — stamps and applies verifiable patches.

## Properties

### capability

> `readonly` **capability**: [`DpuCapability`](../type-aliases/DpuCapability.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L68)

***

### marker

> `readonly` **marker**: `string`

Defined in: [web/src/dpu/watch-and-prepare.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L66)

***

### target

> `readonly` **target**: `Element`

Defined in: [web/src/dpu/watch-and-prepare.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L67)

## Methods

### apply()

> **apply**(`envelope`, `currentBaseGraphId`): [`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L74)

#### Parameters

##### envelope

[`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

##### currentBaseGraphId

`ContentAddress`

#### Returns

[`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

***

### stamp()

> **stamp**(`input`): [`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L69)

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
