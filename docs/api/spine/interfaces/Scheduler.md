[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Scheduler

# Interface: Scheduler

Defined in: [\_spine/core.d.ts:1535](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1535)

Host-neutral frame scheduler used by animation and quantization runtimes.

## Extended by

- [`FixedStep`](../namespaces/Scheduler/interfaces/FixedStep.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameScheduler"`

Defined in: [\_spine/core.d.ts:1536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1536)

## Methods

### cancel()

> **cancel**(`id`): `void`

Defined in: [\_spine/core.d.ts:1538](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1538)

#### Parameters

##### id

`number`

#### Returns

`void`

***

### schedule()

> **schedule**(`callback`): `number`

Defined in: [\_spine/core.d.ts:1537](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1537)

#### Parameters

##### callback

(`now`) => `void`

#### Returns

`number`
