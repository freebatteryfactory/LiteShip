[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / VideoFrameOutput

# Interface: VideoFrameOutput

Defined in: [core/src/media/video.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L35)

Single frame yielded by `VideoRenderer.frames()`: frame index, timestamp,
normalized progress, and the [CompositeState](CompositeState.md) snapshot captured at that tick.

## Properties

### frame

> `readonly` **frame**: `number`

Defined in: [core/src/media/video.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L36)

***

### progress

> `readonly` **progress**: `number`

Defined in: [core/src/media/video.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L38)

***

### state

> `readonly` **state**: [`CompositeState`](CompositeState.md)

Defined in: [core/src/media/video.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L39)

***

### timestamp

> `readonly` **timestamp**: `number`

Defined in: [core/src/media/video.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L37)
