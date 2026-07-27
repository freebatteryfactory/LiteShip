[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / FrameSchedule

# Interface: FrameSchedule

Defined in: [\_spine/core.d.ts:1578](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1578)

Host-neutral frame timing shared by every renderer adapter.

## Extends

- `Iterable`\<[`ScheduledFrame`](ScheduledFrame.md)\>

## Properties

### durationMs

> `readonly` **durationMs**: [`Millis`](../type-aliases/Millis.md)

Defined in: [\_spine/core.d.ts:1580](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1580)

***

### fps

> `readonly` **fps**: `number`

Defined in: [\_spine/core.d.ts:1579](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1579)

***

### totalFrames

> `readonly` **totalFrames**: `number`

Defined in: [\_spine/core.d.ts:1581](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1581)

## Methods

### at()

> **at**(`frame`): [`ScheduledFrame`](ScheduledFrame.md)

Defined in: [\_spine/core.d.ts:1582](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1582)

#### Parameters

##### frame

`number`

#### Returns

[`ScheduledFrame`](ScheduledFrame.md)
