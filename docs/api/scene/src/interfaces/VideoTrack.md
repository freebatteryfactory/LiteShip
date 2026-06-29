[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / VideoTrack

# Interface: VideoTrack\<M\>

Defined in: [scene/src/contract.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L42)

Video track — renders a quantizer-driven source for its frame range.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"video"`

Defined in: [scene/src/contract.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L43)

***

### envelope?

> `readonly` `optional` **envelope?**: `TrackEnvelope`

Defined in: [scene/src/contract.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L60)

Optional opacity automation — e.g. `fade.in(Beat(1))`. Compiled to an `Envelope` component VideoSystem reads each tick.

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L45)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>

Defined in: [scene/src/contract.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L44)

***

### layer?

> `readonly` `optional` **layer?**: `number`

Defined in: [scene/src/contract.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L58)

***

### source

> `readonly` **source**: `unknown`

Defined in: [scene/src/contract.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L57)

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

Defined in: [scene/src/contract.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L46)
