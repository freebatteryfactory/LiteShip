[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [Scheduler](../README.md) / FixedStep

# Interface: FixedStep

Defined in: [\_spine/core.d.ts:1540](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1540)

Host-neutral frame scheduler used by animation and quantization runtimes.

## Extends

- [`Scheduler`](../../../interfaces/Scheduler.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameScheduler"`

Defined in: [\_spine/core.d.ts:1534](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1534)

#### Inherited from

[`Scheduler`](../../../interfaces/Scheduler.md).[`_tag`](../../../interfaces/Scheduler.md#_tag)

***

### frame

> `readonly` **frame**: `number`

Defined in: [\_spine/core.d.ts:1542](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1542)

## Methods

### cancel()

> **cancel**(`id`): `void`

Defined in: [\_spine/core.d.ts:1536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1536)

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

Defined in: [\_spine/core.d.ts:1535](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1535)

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

Defined in: [\_spine/core.d.ts:1541](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1541)

#### Returns

`void`
