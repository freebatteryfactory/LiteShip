[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / Messages

# Variable: Messages

> `const` **Messages**: `object`

Defined in: [worker/src/messages.ts:391](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/messages.ts#L391)

Runtime guards and type projections for the worker protocol vocabulary.

## Type Declaration

### isFromWorker()

> `readonly` **isFromWorker**(`msg`): `msg is FromWorkerMessage`

Type guard: is a FromWorkerMessage

#### Parameters

##### msg

`unknown`

#### Returns

`msg is FromWorkerMessage`

### isToWorker()

> `readonly` **isToWorker**(`msg`): `msg is ToWorkerMessage`

Type guard: is a ToWorkerMessage

#### Parameters

##### msg

`unknown`

#### Returns

`msg is ToWorkerMessage`
