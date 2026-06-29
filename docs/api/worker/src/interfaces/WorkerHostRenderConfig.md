[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerHostRenderConfig

# Interface: WorkerHostRenderConfig

Defined in: [worker/src/host.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L47)

Render configuration accepted by [WorkerHostShape.startRender](WorkerHostShape.md#startrender).
Only `durationMs` is genuinely the caller's decision; the rest default
from context the host already has.

## Properties

### durationMs

> `readonly` **durationMs**: `number` \| `Millis`

Defined in: [worker/src/host.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L49)

Total render duration in milliseconds — a plain number is branded internally.

***

### fps?

> `readonly` `optional` **fps?**: `number`

Defined in: [worker/src/host.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L54)

Content frame rate (frame count and per-frame timestamps).

#### Default Value

```ts
60
```

***

### height?

> `readonly` `optional` **height?**: `number`

Defined in: [worker/src/host.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L64)

Output height in pixels.

#### Default Value

```ts
the attached canvas's height at attachCanvas() time
```

***

### width?

> `readonly` `optional` **width?**: `number`

Defined in: [worker/src/host.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/host.ts#L59)

Output width in pixels.

#### Default Value

```ts
the attached canvas's width at attachCanvas() time
```
