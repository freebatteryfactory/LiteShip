[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / Physical

# Variable: Physical

> `const` **Physical**: `object`

Defined in: web/dist/index.d.ts:52

Physical DOM-state helpers for save/restore across morphs and hot
reloads. Passive capture covers focus, selection, and scroll. Allocate
[Physical.createTracker](#createtracker) when a host also needs IME composition state;
the tracker owns and removes its document listeners.

## Type Declaration

### capture

> `readonly` **capture**: *typeof* `capture`

Snapshot passive focus/selection/scroll state on the document.

### createTracker

> `readonly` **createTracker**: *typeof* [`createPhysicalStateTracker`](../functions/createPhysicalStateTracker.md)

Install host-owned IME tracking. Await disposal to remove its document listeners.

### restore

> `readonly` **restore**: *typeof* `restore`

Re-apply a snapshot produced by [Physical.capture](#capture).
