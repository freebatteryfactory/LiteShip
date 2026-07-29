[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / VideoRenderer

# Interface: VideoRenderer

Defined in: [\_spine/core.d.ts:1588](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1588)

Canonical frame scheduler over a compositor and video configuration.

## Properties

### config

> `readonly` **config**: [`VideoConfig`](VideoConfig.md)

Defined in: [\_spine/core.d.ts:1589](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1589)

***

### schedule

> `readonly` **schedule**: [`FrameSchedule`](FrameSchedule.md)

Defined in: [\_spine/core.d.ts:1590](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1590)

***

### scheduler

> `readonly` **scheduler**: [`FixedStep`](../namespaces/Scheduler/interfaces/FixedStep.md)

Defined in: [\_spine/core.d.ts:1592](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1592)

***

### totalFrames

> `readonly` **totalFrames**: `number`

Defined in: [\_spine/core.d.ts:1591](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1591)

## Methods

### frames()

> **frames**(): `AsyncGenerator`\<[`VideoFrameOutput`](VideoFrameOutput.md)\>

Defined in: [\_spine/core.d.ts:1593](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1593)

#### Returns

`AsyncGenerator`\<[`VideoFrameOutput`](VideoFrameOutput.md)\>
