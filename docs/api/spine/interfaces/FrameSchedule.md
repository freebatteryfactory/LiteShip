[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / FrameSchedule

# Interface: FrameSchedule

Defined in: [\_spine/core.d.ts:1580](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1580)

Host-neutral frame timing shared by every renderer adapter.

## Extends

- `Iterable`\<[`ScheduledFrame`](ScheduledFrame.md)\>

## Properties

### durationMs

> `readonly` **durationMs**: [`Millis`](../type-aliases/Millis.md)

Defined in: [\_spine/core.d.ts:1582](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1582)

***

### fps

> `readonly` **fps**: `number`

Defined in: [\_spine/core.d.ts:1581](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1581)

***

### totalFrames

> `readonly` **totalFrames**: `number`

Defined in: [\_spine/core.d.ts:1583](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1583)

## Methods

### at()

> **at**(`frame`): [`ScheduledFrame`](ScheduledFrame.md)

Defined in: [\_spine/core.d.ts:1584](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1584)

#### Parameters

##### frame

`number`

#### Returns

[`ScheduledFrame`](ScheduledFrame.md)
