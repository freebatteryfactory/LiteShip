[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / AudioTrack

# Interface: AudioTrack\<M\>

Defined in: [scene/src/contract.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L54)

Audio track — plays an asset with optional mix metadata.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### envelope?

> `readonly` `optional` **envelope?**: `TrackEnvelope`

Defined in: [scene/src/contract.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L66)

Optional gain automation — e.g. `fade.out(Beat(2))`. Compiled to an `Envelope` component AudioSystem reads each tick (written as `_gain`).

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:57](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L57)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

Defined in: [scene/src/contract.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L56)

***

### kind

> `readonly` **kind**: `"audio"`

Defined in: [scene/src/contract.ts:55](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L55)

***

### mix?

> `readonly` `optional` **mix?**: `object`

Defined in: [scene/src/contract.ts:60](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L60)

#### pan?

> `readonly` `optional` **pan?**: `number`

#### sync?

> `readonly` `optional` **sync?**: `object`

##### sync.bpm?

> `readonly` `optional` **bpm?**: `number`

#### volume?

> `readonly` `optional` **volume?**: `number`

***

### source

> `readonly` **source**: `string`

Defined in: [scene/src/contract.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L59)

***

### to

> `readonly` **to**: `M`

Defined in: [scene/src/contract.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L58)
