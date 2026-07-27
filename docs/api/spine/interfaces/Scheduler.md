[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Scheduler

# Interface: Scheduler

Defined in: [\_spine/core.d.ts:1533](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1533)

Host-neutral frame scheduler used by animation and quantization runtimes.

## Extended by

- [`FixedStep`](../namespaces/Scheduler/interfaces/FixedStep.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameScheduler"`

Defined in: [\_spine/core.d.ts:1534](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1534)

## Methods

### cancel()

> **cancel**(`id`): `void`

Defined in: [\_spine/core.d.ts:1536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1536)

#### Parameters

##### id

`number`

#### Returns

`void`

***

### schedule()

> **schedule**(`callback`): `number`

Defined in: [\_spine/core.d.ts:1535](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1535)

#### Parameters

##### callback

(`now`) => `void`

#### Returns

`number`
