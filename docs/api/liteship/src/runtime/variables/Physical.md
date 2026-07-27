[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / Physical

# Variable: Physical

> `const` **Physical**: `object`

Defined in: web/dist/index.d.ts:51

Physical DOM-state helpers for save/restore across morphs and hot
reloads. Captures focus, selection, scroll, and IME composition so a
subsequent [Morph.morph](Morph.md#morph) preserves them.

## Type Declaration

### capture

> `readonly` **capture**: *typeof* `capture`

Snapshot focus/selection/scroll state on the document.

### restore

> `readonly` **restore**: *typeof* `restore`

Re-apply a snapshot produced by [Physical.capture](#capture).
