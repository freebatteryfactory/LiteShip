[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [Scheduler](../README.md) / FixedStep

# Interface: FixedStep

Defined in: [\_spine/core.d.ts:1325](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1325)

Host-neutral frame scheduler used by animation and quantization runtimes.

## Extends

- [`Scheduler`](../../../interfaces/Scheduler.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameScheduler"`

Defined in: [\_spine/core.d.ts:1319](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1319)

#### Inherited from

[`Scheduler`](../../../interfaces/Scheduler.md).[`_tag`](../../../interfaces/Scheduler.md#_tag)

***

### frame

> `readonly` **frame**: `number`

Defined in: [\_spine/core.d.ts:1327](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1327)

## Methods

### cancel()

> **cancel**(`id`): `void`

Defined in: [\_spine/core.d.ts:1321](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1321)

#### Parameters

##### id

`number`

#### Returns

`void`

#### Inherited from

[`Scheduler`](../../../interfaces/Scheduler.md).[`cancel`](../../../interfaces/Scheduler.md#cancel)

***

### schedule()

> **schedule**(`callback`): `number`

Defined in: [\_spine/core.d.ts:1320](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1320)

#### Parameters

##### callback

(`now`) => `void`

#### Returns

`number`

#### Inherited from

[`Scheduler`](../../../interfaces/Scheduler.md).[`schedule`](../../../interfaces/Scheduler.md#schedule)

***

### step()

> **step**(): `void`

Defined in: [\_spine/core.d.ts:1326](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1326)

#### Returns

`void`
