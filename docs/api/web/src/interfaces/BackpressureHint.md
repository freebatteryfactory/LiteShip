[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / BackpressureHint

# Interface: BackpressureHint

Defined in: [web/src/types.ts:300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L300)

Backpressure hint emitted when SSE buffer fills.

## Properties

### bufferSize

> `readonly` **bufferSize**: `number`

Defined in: [web/src/types.ts:301](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L301)

***

### coalescedCount

> `readonly` **coalescedCount**: `number`

Defined in: [web/src/types.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L310)

Cumulative count of same-id `patch` supersessions (coalesce hits).

***

### droppedCount

> `readonly` **droppedCount**: `number`

Defined in: [web/src/types.ts:308](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L308)

Cumulative count of messages evicted/rejected by the overflow policy.

***

### dropping

> `readonly` **dropping**: `boolean`

Defined in: [web/src/types.ts:304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L304)

***

### maxBufferSize

> `readonly` **maxBufferSize**: `number`

Defined in: [web/src/types.ts:302](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L302)

***

### percentFull

> `readonly` **percentFull**: `number`

Defined in: [web/src/types.ts:303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L303)

***

### policy

> `readonly` **policy**: [`OverflowPolicy`](../type-aliases/OverflowPolicy.md)

Defined in: [web/src/types.ts:306](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L306)

The active [OverflowPolicy](../type-aliases/OverflowPolicy.md) (the rule governing `dropping`).
