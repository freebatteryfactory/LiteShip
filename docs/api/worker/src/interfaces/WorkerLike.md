[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [worker/src](../README.md) / WorkerLike

# Interface: WorkerLike

Defined in: [worker/src/messages.ts:427](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/messages.ts#L427)

The DOM Worker surface liteship's hosts actually drive (postMessage with
transfer, terminate, message listening). Named so the dependency is
structural rather than ambient: test doubles (tests/helpers/mock-worker.ts)
conform to THIS type, and drift between host usage and the double breaks
the build.

## Methods

### addEventListener()

> **addEventListener**(`type`, `listener`): `void`

Defined in: [worker/src/messages.ts:430](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/messages.ts#L430)

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

Defined in: [worker/src/messages.ts:428](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/messages.ts#L428)

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

Defined in: [worker/src/messages.ts:431](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/messages.ts#L431)

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

Defined in: [worker/src/messages.ts:429](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/messages.ts#L429)

#### Returns

`void`
