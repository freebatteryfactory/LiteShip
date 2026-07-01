[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / BackpressureHint

# Interface: BackpressureHint

Defined in: [web/src/types.ts:295](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L295)

Backpressure hint emitted when SSE buffer fills.

## Properties

### bufferSize

> `readonly` **bufferSize**: `number`

Defined in: [web/src/types.ts:296](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L296)

***

### coalescedCount

> `readonly` **coalescedCount**: `number`

Defined in: [web/src/types.ts:305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L305)

Cumulative count of same-id `patch` supersessions (coalesce hits).

***

### droppedCount

> `readonly` **droppedCount**: `number`

Defined in: [web/src/types.ts:303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L303)

Cumulative count of messages evicted/rejected by the overflow policy.

***

### dropping

> `readonly` **dropping**: `boolean`

Defined in: [web/src/types.ts:299](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L299)

***

### maxBufferSize

> `readonly` **maxBufferSize**: `number`

Defined in: [web/src/types.ts:297](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L297)

***

### percentFull

> `readonly` **percentFull**: `number`

Defined in: [web/src/types.ts:298](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L298)

***

### policy

> `readonly` **policy**: [`OverflowPolicy`](../type-aliases/OverflowPolicy.md)

Defined in: [web/src/types.ts:301](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L301)

The active [OverflowPolicy](../type-aliases/OverflowPolicy.md) (the rule governing `dropping`).
