[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / EffectTrack

# Interface: EffectTrack\<M\>

Defined in: [scene/src/contract.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L82)

Effect track — applies an intensity curve to a target video track, optionally synced to audio.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### effectKind

> `readonly` **effectKind**: `"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`

Defined in: [scene/src/contract.ts:87](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L87)

***

### envelope?

> `readonly` `optional` **envelope?**: `TrackEnvelope`

Defined in: [scene/src/contract.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L91)

Optional intensity automation — e.g. `pulse.every(Beat(0.5), { amplitude: 0.3 })`. Compiled to an `Envelope` component EffectSystem reads each tick.

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:85](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L85)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"effect"`\>

Defined in: [scene/src/contract.ts:84](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L84)

***

### kind

> `readonly` **kind**: `"effect"`

Defined in: [scene/src/contract.ts:83](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L83)

***

### syncTo?

> `readonly` `optional` **syncTo?**: `object`

Defined in: [scene/src/contract.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L89)

#### anchor

> `readonly` **anchor**: [`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

#### mode

> `readonly` **mode**: `"beat"` \| `"onset"` \| `"peak"`

***

### target

> `readonly` **target**: [`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>

Defined in: [scene/src/contract.ts:88](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L88)

***

### to

> `readonly` **to**: `M`

Defined in: [scene/src/contract.ts:86](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L86)
