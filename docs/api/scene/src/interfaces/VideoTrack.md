[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [scene/src](../README.md) / VideoTrack

# Interface: VideoTrack\<M\>

Defined in: [scene/src/contract.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L43)

Video track — renders a quantizer-driven source for its frame range.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"video"`

Defined in: [scene/src/contract.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L44)

***

### envelope?

> `readonly` `optional` **envelope?**: [`TrackEnvelope`](../../../spine/type-aliases/TrackEnvelope.md)

Defined in: [scene/src/contract.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L63)

Optional opacity automation — e.g. `fade.in(Beat(1))`. Compiled to an `Envelope` component VideoSystem reads each tick.

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L46)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>

Defined in: [scene/src/contract.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L45)

***

### layer?

> `readonly` `optional` **layer?**: `number`

Defined in: [scene/src/contract.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L61)

***

### motion?

> `readonly` `optional` **motion?**: [`RuntimeWritePlan`](../../../liteship/src/motion/interfaces/RuntimeWritePlan.md)

Defined in: [scene/src/contract.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L60)

Optional executable motion floor sampled per entity over this track's frame range.

***

### source

> `readonly` **source**: `unknown`

Defined in: [scene/src/contract.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L58)

Opaque source reference, carried verbatim onto the `VideoSource`
ECS component — the scene engine never interprets it (VideoSystem
only checks presence). Hand it whatever YOUR renderer reads:
typically a quantizer-driven source descriptor, an asset id, or a
canvas/element reference.

#### Example

```ts
Track.video('hero', { from: 0, to: 120, source: { _t: 'quantizer', id: 'hero-boundary' } })
```

***

### to

> `readonly` **to**: `M`

Defined in: [scene/src/contract.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L47)
