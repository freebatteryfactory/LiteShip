[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / FrameSchedule

# Interface: FrameSchedule

Defined in: core/dist/media/video.d.ts:41

Host-neutral frame timing. Rendering and encoding remain host-owned; this
kernel owns only the frame-count/index/time/progress law they must share.

## Extends

- `Iterable`\<[`ScheduledFrame`](ScheduledFrame.md)\>

## Properties

### durationMs

> `readonly` **durationMs**: [`Millis`](../../../../spine/type-aliases/Millis.md)

Defined in: core/dist/media/video.d.ts:43

***

### fps

> `readonly` **fps**: `number`

Defined in: core/dist/media/video.d.ts:42

***

### totalFrames

> `readonly` **totalFrames**: `number`

Defined in: core/dist/media/video.d.ts:44

## Methods

### at()

> **at**(`frame`): [`ScheduledFrame`](ScheduledFrame.md)

Defined in: core/dist/media/video.d.ts:45

#### Parameters

##### frame

`number`

#### Returns

[`ScheduledFrame`](ScheduledFrame.md)
