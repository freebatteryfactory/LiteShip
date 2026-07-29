[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / BackpressureHint

# Interface: BackpressureHint

Defined in: web/dist/types.d.ts:254

Backpressure hint emitted when SSE buffer fills.

## Properties

### bufferSize

> `readonly` **bufferSize**: `number`

Defined in: web/dist/types.d.ts:255

***

### coalescedCount

> `readonly` **coalescedCount**: `number`

Defined in: web/dist/types.d.ts:264

Cumulative count of same-id `patch` supersessions (coalesce hits).

***

### droppedCount

> `readonly` **droppedCount**: `number`

Defined in: web/dist/types.d.ts:262

Cumulative count of messages evicted/rejected by the overflow policy.

***

### dropping

> `readonly` **dropping**: `boolean`

Defined in: web/dist/types.d.ts:258

***

### maxBufferSize

> `readonly` **maxBufferSize**: `number`

Defined in: web/dist/types.d.ts:256

***

### percentFull

> `readonly` **percentFull**: `number`

Defined in: web/dist/types.d.ts:257

***

### policy

> `readonly` **policy**: [`OverflowPolicy`](../type-aliases/OverflowPolicy.md)

Defined in: web/dist/types.d.ts:260

The active [OverflowPolicy](../type-aliases/OverflowPolicy.md) (the rule governing `dropping`).
