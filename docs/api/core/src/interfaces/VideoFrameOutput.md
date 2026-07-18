[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / VideoFrameOutput

# Interface: VideoFrameOutput

Defined in: [core/src/video.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/video.ts#L33)

Single frame yielded by `VideoRenderer.frames()`: frame index, timestamp,
normalized progress, and the [CompositeState](CompositeState.md) snapshot captured at that tick.

## Properties

### frame

> `readonly` **frame**: `number`

Defined in: [core/src/video.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/video.ts#L34)

***

### progress

> `readonly` **progress**: `number`

Defined in: [core/src/video.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/video.ts#L36)

***

### state

> `readonly` **state**: [`CompositeState`](CompositeState.md)

Defined in: [core/src/video.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/video.ts#L37)

***

### timestamp

> `readonly` **timestamp**: `number`

Defined in: [core/src/video.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/video.ts#L35)
