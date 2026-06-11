[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / VideoTrack

# Interface: VideoTrack\<M\>

Defined in: [scene/src/contract.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L42)

Video track — renders a quantizer-driven source for its frame range.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### envelope?

> `readonly` `optional` **envelope?**: `TrackEnvelope`

Defined in: [scene/src/contract.ts:50](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L50)

Optional opacity automation — e.g. `fade.in(Beat(1))`. Compiled to an `Envelope` component VideoSystem reads each tick.

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L45)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>

Defined in: [scene/src/contract.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L44)

***

### kind

> `readonly` **kind**: `"video"`

Defined in: [scene/src/contract.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L43)

***

### layer?

> `readonly` `optional` **layer?**: `number`

Defined in: [scene/src/contract.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L48)

***

### source

> `readonly` **source**: `unknown`

Defined in: [scene/src/contract.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L47)

***

### to

> `readonly` **to**: `M`

Defined in: [scene/src/contract.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L46)
