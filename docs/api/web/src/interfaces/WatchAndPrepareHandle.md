[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / WatchAndPrepareHandle

# Interface: WatchAndPrepareHandle

Defined in: [web/src/dpu/watch-and-prepare.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L86)

Handle returned by [watchAndPrepare](../functions/watchAndPrepare.md) — stamps and applies verifiable patches.

## Properties

### capability

> `readonly` **capability**: [`DpuCapability`](../type-aliases/DpuCapability.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L89)

***

### marker

> `readonly` **marker**: `string`

Defined in: [web/src/dpu/watch-and-prepare.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L87)

***

### target

> `readonly` **target**: `Element`

Defined in: [web/src/dpu/watch-and-prepare.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L88)

## Methods

### apply()

> **apply**(`envelope`, `currentBaseGraphId`): [`ApplyVerifiablePatchResult`](../type-aliases/ApplyVerifiablePatchResult.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L95)

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

Defined in: [web/src/dpu/watch-and-prepare.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L97)

Release the marker registration so the name can be re-watched.

#### Returns

`void`

***

### stamp()

> **stamp**(`input`): [`VerifiablePatchEnvelope`](VerifiablePatchEnvelope.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L90)

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
