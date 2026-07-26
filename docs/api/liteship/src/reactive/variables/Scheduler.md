[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / Scheduler

# Variable: Scheduler

> `const` **Scheduler**: `object`

Defined in: core/dist/reactive/scheduler.d.ts:39

Scheduler — clock abstraction that decouples animation driver from real time.
Pick the impl that matches the runtime: `raf` in browser, `noop` on the
server, `fixedStep` for deterministic video render, `audioSync` to drive UI
in lockstep with an [AVBridge](../../media/variables/AVBridge.md).

## Type Declaration

### audioSync

> **audioSync**: *typeof* `_audioSync`

Scheduler that polls an [AVBridge](../../media/variables/AVBridge.md) and fires callbacks when the sample frame advances.

### fixedStep

> **fixedStep**: *typeof* `_fixedStep`

Fixed-step scheduler at the given fps — deterministic timestamps for offline rendering.

### noop

> **noop**: *typeof* `_noop`

No-op scheduler for SSR / environments without rAF.

### raf

> **raf**: *typeof* `_raf`

`requestAnimationFrame`-backed scheduler for browser real-time work.
