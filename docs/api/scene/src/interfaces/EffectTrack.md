[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / EffectTrack

# Interface: EffectTrack\<M\>

Defined in: [scene/src/contract.ts:99](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L99)

Effect track — applies an intensity curve to a target video track, optionally synced to audio.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"effect"`

Defined in: [scene/src/contract.ts:100](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L100)

***

### effectKind

> `readonly` **effectKind**: `"pulse"` \| `"glow"` \| `"shake"` \| `"zoom"` \| `"desaturate"`

Defined in: [scene/src/contract.ts:104](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L104)

***

### envelope?

> `readonly` `optional` **envelope?**: `TrackEnvelope`

Defined in: [scene/src/contract.ts:108](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L108)

Optional intensity automation — e.g. `pulse.every(Beat(0.5), { amplitude: 0.3 })`. Compiled to an `Envelope` component EffectSystem reads each tick.

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:102](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L102)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"effect"`\>

Defined in: [scene/src/contract.ts:101](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L101)

***

### syncTo?

> `readonly` `optional` **syncTo?**: `object`

Defined in: [scene/src/contract.ts:106](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L106)

#### anchor

> `readonly` **anchor**: [`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

#### mode

> `readonly` **mode**: `"beat"` \| `"onset"` \| `"peak"`

***

### target

> `readonly` **target**: [`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>

Defined in: [scene/src/contract.ts:105](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L105)

***

### to

> `readonly` **to**: `M`

Defined in: [scene/src/contract.ts:103](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L103)
