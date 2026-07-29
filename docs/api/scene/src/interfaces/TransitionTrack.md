[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [scene/src](../README.md) / TransitionTrack

# Interface: TransitionTrack\<M\>

Defined in: [scene/src/contract.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L90)

Transition track — blends two video tracks across a frame window.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"transition"`

Defined in: [scene/src/contract.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L91)

***

### between

> `readonly` **between**: readonly \[[`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>, [`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>\]

Defined in: [scene/src/contract.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L96)

***

### ease?

> `readonly` `optional` **ease?**: [`EaseTag`](../../../spine/type-aliases/EaseTag.md)

Defined in: [scene/src/contract.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L98)

Optional named easing applied to the blend curve — e.g. `ease: 'cubic'` or `ease: { stepped: 8 }`. Closed catalog (Spec 1 §5.4).

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L93)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"transition"`\>

Defined in: [scene/src/contract.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L92)

***

### to

> `readonly` **to**: `M`

Defined in: [scene/src/contract.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L94)

***

### transitionKind

> `readonly` **transitionKind**: `"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`

Defined in: [scene/src/contract.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/contract.ts#L95)
