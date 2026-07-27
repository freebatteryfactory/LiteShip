[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ErrorMessage

# Interface: ErrorMessage

Defined in: [\_spine/worker.d.ts:237](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L237)

Bounded worker failure sent to the host.

## Properties

### code?

> `readonly` `optional` **code?**: [`WorkerErrorCode`](../type-aliases/WorkerErrorCode.md)

Defined in: [\_spine/worker.d.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L240)

Which failure site produced the error; optional so custom protocol implementations keep compiling.

***

### context?

> `readonly` `optional` **context?**: `string`

Defined in: [\_spine/worker.d.ts:247](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L247)

Inbound message `type` the worker was handling when it threw (e.g. 'compute').

***

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: [\_spine/worker.d.ts:245](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L245)

Literal next step the main-thread consumer can render.

***

### message

> `readonly` **message**: `string`

Defined in: [\_spine/worker.d.ts:241](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L241)

***

### subjectId?

> `readonly` `optional` **subjectId?**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/worker.d.ts:243](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L243)

Content address of the entity being processed when the failure occurred, when known.

***

### type

> `readonly` **type**: `"error"`

Defined in: [\_spine/worker.d.ts:238](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L238)
