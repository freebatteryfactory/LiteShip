[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerLike

# Interface: WorkerLike

Defined in: [worker/src/messages.ts:383](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L383)

The DOM Worker surface czap's hosts actually drive (postMessage with
transfer, terminate, message listening). Named so the dependency is
structural rather than ambient: test doubles (tests/helpers/mock-worker.ts)
conform to THIS type, and drift between host usage and the double breaks
the build.

## Methods

### addEventListener()

> **addEventListener**(`type`, `listener`): `void`

Defined in: [worker/src/messages.ts:386](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L386)

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

Defined in: [worker/src/messages.ts:384](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L384)

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

Defined in: [worker/src/messages.ts:387](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L387)

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

Defined in: [worker/src/messages.ts:385](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L385)

#### Returns

`void`
