[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / FrameSchedule

# Interface: FrameSchedule

Defined in: [core/src/media/video.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L53)

Host-neutral frame timing. Rendering and encoding remain host-owned; this
kernel owns only the frame-count/index/time/progress law they must share.

## Extends

- `Iterable`\<[`ScheduledFrame`](ScheduledFrame.md)\>

## Properties

### durationMs

> `readonly` **durationMs**: [`Millis`](../../../spine/type-aliases/Millis.md)

Defined in: [core/src/media/video.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L55)

***

### fps

> `readonly` **fps**: `number`

Defined in: [core/src/media/video.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L54)

***

### totalFrames

> `readonly` **totalFrames**: `number`

Defined in: [core/src/media/video.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L56)

## Methods

### at()

> **at**(`frame`): [`ScheduledFrame`](ScheduledFrame.md)

Defined in: [core/src/media/video.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/video.ts#L57)

#### Parameters

##### frame

`number`

#### Returns

[`ScheduledFrame`](ScheduledFrame.md)
