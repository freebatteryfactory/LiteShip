[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / VideoRenderer

# Interface: VideoRenderer

Defined in: [\_spine/core.d.ts:1356](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1356)

Canonical frame scheduler over a compositor and video configuration.

## Properties

### config

> `readonly` **config**: [`VideoConfig`](VideoConfig.md)

Defined in: [\_spine/core.d.ts:1357](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1357)

***

### scheduler

> `readonly` **scheduler**: [`FixedStep`](../namespaces/Scheduler/interfaces/FixedStep.md)

Defined in: [\_spine/core.d.ts:1359](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1359)

***

### totalFrames

> `readonly` **totalFrames**: `number`

Defined in: [\_spine/core.d.ts:1358](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1358)

## Methods

### frames()

> **frames**(): `AsyncGenerator`\<[`VideoFrameOutput`](VideoFrameOutput.md)\>

Defined in: [\_spine/core.d.ts:1360](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1360)

#### Returns

`AsyncGenerator`\<[`VideoFrameOutput`](VideoFrameOutput.md)\>
