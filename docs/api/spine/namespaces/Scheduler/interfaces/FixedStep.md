[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [\_spine](../../../README.md) / [Scheduler](../README.md) / FixedStep

# Interface: FixedStep

Defined in: [\_spine/core.d.ts:1542](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1542)

Host-neutral frame scheduler used by animation and quantization runtimes.

## Extends

- [`Scheduler`](../../../interfaces/Scheduler.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"FrameScheduler"`

Defined in: [\_spine/core.d.ts:1536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1536)

#### Inherited from

[`Scheduler`](../../../interfaces/Scheduler.md).[`_tag`](../../../interfaces/Scheduler.md#_tag)

***

### frame

> `readonly` **frame**: `number`

Defined in: [\_spine/core.d.ts:1544](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1544)

## Methods

### cancel()

> **cancel**(`id`): `void`

Defined in: [\_spine/core.d.ts:1538](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1538)

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

Defined in: [\_spine/core.d.ts:1537](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1537)

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

Defined in: [\_spine/core.d.ts:1543](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1543)

#### Returns

`void`
