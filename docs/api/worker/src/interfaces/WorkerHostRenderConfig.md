[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerHostRenderConfig

# Interface: WorkerHostRenderConfig

Defined in: [worker/src/host.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L46)

Render configuration accepted by [WorkerHostShape.startRender](WorkerHostShape.md#startrender).
Only `durationMs` is genuinely the caller's decision; the rest default
from context the host already has.

## Properties

### durationMs

> `readonly` **durationMs**: `number` \| `Millis`

Defined in: [worker/src/host.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L48)

Total render duration in milliseconds — a plain number is branded internally.

***

### fps?

> `readonly` `optional` **fps?**: `number`

Defined in: [worker/src/host.ts:53](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L53)

Content frame rate (frame count and per-frame timestamps).

#### Default Value

```ts
60
```

***

### height?

> `readonly` `optional` **height?**: `number`

Defined in: [worker/src/host.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L63)

Output height in pixels.

#### Default Value

```ts
the attached canvas's height at attachCanvas() time
```

***

### width?

> `readonly` `optional` **width?**: `number`

Defined in: [worker/src/host.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/host.ts#L58)

Output width in pixels.

#### Default Value

```ts
the attached canvas's width at attachCanvas() time
```
