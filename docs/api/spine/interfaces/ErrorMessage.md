[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ErrorMessage

# Interface: ErrorMessage

Defined in: [\_spine/worker.d.ts:236](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L236)

Bounded worker failure sent to the host.

## Properties

### code?

> `readonly` `optional` **code?**: [`WorkerErrorCode`](../type-aliases/WorkerErrorCode.md)

Defined in: [\_spine/worker.d.ts:239](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L239)

Which failure site produced the error; optional so custom protocol implementations keep compiling.

***

### context?

> `readonly` `optional` **context?**: `string`

Defined in: [\_spine/worker.d.ts:246](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L246)

Inbound message `type` the worker was handling when it threw (e.g. 'compute').

***

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: [\_spine/worker.d.ts:244](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L244)

Literal next step the main-thread consumer can render.

***

### message

> `readonly` **message**: `string`

Defined in: [\_spine/worker.d.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L240)

***

### subjectId?

> `readonly` `optional` **subjectId?**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/worker.d.ts:242](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L242)

Content address of the entity being processed when the failure occurred, when known.

***

### type

> `readonly` **type**: `"error"`

Defined in: [\_spine/worker.d.ts:237](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L237)
