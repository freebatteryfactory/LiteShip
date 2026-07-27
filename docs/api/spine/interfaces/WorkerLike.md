[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / WorkerLike

# Interface: WorkerLike

Defined in: [\_spine/worker.d.ts:291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L291)

Structural worker boundary used by browser hosts and deterministic test doubles.

## Methods

### addEventListener()

> **addEventListener**(`type`, `listener`): `void`

Defined in: [\_spine/worker.d.ts:294](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L294)

#### Parameters

##### type

`string`

##### listener

(`event`) => `void`

#### Returns

`void`

***

### postMessage()

> **postMessage**(`message`, `transfer?`): `void`

Defined in: [\_spine/worker.d.ts:292](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L292)

#### Parameters

##### message

`unknown`

##### transfer?

`Transferable`[]

#### Returns

`void`

***

### removeEventListener()

> **removeEventListener**(`type`, `listener`): `void`

Defined in: [\_spine/worker.d.ts:295](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L295)

#### Parameters

##### type

`string`

##### listener

(`event`) => `void`

#### Returns

`void`

***

### terminate()

> **terminate**(): `void`

Defined in: [\_spine/worker.d.ts:293](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L293)

#### Returns

`void`
