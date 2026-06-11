[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / TransitionTrack

# Interface: TransitionTrack\<M\>

Defined in: [scene/src/contract.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L70)

Transition track — blends two video tracks across a frame window.

## Type Parameters

### M

`M` *extends* [`FrameMark`](../type-aliases/FrameMark.md) = [`FrameMark`](../type-aliases/FrameMark.md)

## Properties

### between

> `readonly` **between**: readonly \[[`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>, [`TrackId`](../type-aliases/TrackId.md)\<`"video"`\>\]

Defined in: [scene/src/contract.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L76)

***

### ease?

> `readonly` `optional` **ease?**: `EaseTag`

Defined in: [scene/src/contract.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L78)

Optional named easing applied to the blend curve — e.g. `ease: 'cubic'` or `ease: { stepped: 8 }`. Closed catalog (Spec 1 §5.4).

***

### from

> `readonly` **from**: `M`

Defined in: [scene/src/contract.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L73)

***

### id

> `readonly` **id**: [`TrackId`](../type-aliases/TrackId.md)\<`"transition"`\>

Defined in: [scene/src/contract.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L72)

***

### kind

> `readonly` **kind**: `"transition"`

Defined in: [scene/src/contract.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L71)

***

### to

> `readonly` **to**: `M`

Defined in: [scene/src/contract.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L74)

***

### transitionKind

> `readonly` **transitionKind**: `"crossfade"` \| `"swipe.left"` \| `"swipe.right"` \| `"zoom.in"` \| `"zoom.out"` \| `"cut"`

Defined in: [scene/src/contract.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/contract.ts#L75)
