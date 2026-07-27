[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Scheduler

# Interface: Scheduler

Defined in: [\_spine/core.d.ts:1318](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1318)

Host-neutral frame scheduler used by animation and quantization runtimes.

## Extended by

- [`FixedStep`](../namespaces/Scheduler/interfaces/FixedStep.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameScheduler"`

Defined in: [\_spine/core.d.ts:1319](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1319)

## Methods

### cancel()

> **cancel**(`id`): `void`

Defined in: [\_spine/core.d.ts:1321](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1321)

#### Parameters

##### id

`number`

#### Returns

`void`

***

### schedule()

> **schedule**(`callback`): `number`

Defined in: [\_spine/core.d.ts:1320](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1320)

#### Parameters

##### callback

(`now`) => `void`

#### Returns

`number`
