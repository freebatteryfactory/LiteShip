[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / BackpressureHint

# Interface: BackpressureHint

Defined in: web/dist/types.d.ts:262

Backpressure hint emitted when SSE buffer fills.

## Properties

### bufferSize

> `readonly` **bufferSize**: `number`

Defined in: web/dist/types.d.ts:263

***

### coalescedCount

> `readonly` **coalescedCount**: `number`

Defined in: web/dist/types.d.ts:272

Cumulative count of same-id `patch` supersessions (coalesce hits).

***

### droppedCount

> `readonly` **droppedCount**: `number`

Defined in: web/dist/types.d.ts:270

Cumulative count of messages evicted/rejected by the overflow policy.

***

### dropping

> `readonly` **dropping**: `boolean`

Defined in: web/dist/types.d.ts:266

***

### maxBufferSize

> `readonly` **maxBufferSize**: `number`

Defined in: web/dist/types.d.ts:264

***

### percentFull

> `readonly` **percentFull**: `number`

Defined in: web/dist/types.d.ts:265

***

### policy

> `readonly` **policy**: [`OverflowPolicy`](../type-aliases/OverflowPolicy.md)

Defined in: web/dist/types.d.ts:268

The active [OverflowPolicy](../type-aliases/OverflowPolicy.md) (the rule governing `dropping`).
