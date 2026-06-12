[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / AudioTrack

# Interface: AudioTrack\<M\>

Defined in: [scene/src/contract.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L64)

Audio track — plays an asset with optional mix metadata.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### envelope?

> `readonly` `optional` **envelope?**: `TrackEnvelope`

Defined in: [scene/src/contract.ts:83](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L83)

Optional gain automation — e.g. `fade.out(Beat(2))`. Compiled to an `Envelope` component AudioSystem reads each tick (written as `_gain`).

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L67)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

Defined in: [scene/src/contract.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L66)

***

### kind

> `readonly` **kind**: `"audio"`

Defined in: [scene/src/contract.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L65)

***

### mix?

> `readonly` `optional` **mix?**: `object`

Defined in: [scene/src/contract.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L70)

#### pan?

> `readonly` `optional` **pan?**: `number`

Stereo position, -1 (left) .. 1 (right).

##### Default

```ts
0
```

#### sync?

> `readonly` `optional` **sync?**: `object`

##### sync.bpm?

> `readonly` `optional` **bpm?**: `number`

#### volume?

> `readonly` `optional` **volume?**: `number`

Linear gain multiplier — 1 is unity (asset plays at its authored
level), 0 is silence. Mixers multiply this by the envelope-driven
`_gain` factor each tick (see `systems/audio.ts`).

##### Default

```ts
1
```

***

### source

> `readonly` **source**: `string`

Defined in: [scene/src/contract.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L69)

***

### to

> `readonly` **to**: `M`

Defined in: [scene/src/contract.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L68)
