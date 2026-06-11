[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerLike

# Interface: WorkerLike

Defined in: [worker/src/messages.ts:357](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L357)

The DOM Worker surface czap's hosts actually drive (postMessage with
transfer, terminate, message listening). Named so the dependency is
structural rather than ambient: test doubles (tests/helpers/mock-worker.ts)
conform to THIS type, and drift between host usage and the double breaks
the build.

## Methods

### addEventListener()

> **addEventListener**(`type`, `listener`): `void`

Defined in: [worker/src/messages.ts:360](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L360)

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

Defined in: [worker/src/messages.ts:358](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L358)

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

Defined in: [worker/src/messages.ts:361](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L361)

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

Defined in: [worker/src/messages.ts:359](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L359)

#### Returns

`void`
