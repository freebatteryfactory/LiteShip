[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / Morph

# Variable: Morph

> `const` **Morph**: `object`

Defined in: web/dist/morph/diff.d.ts:45

DOM morph namespace.

[morphWithState](#morphwithstate) is the default entry point — it preserves focus,
scroll, and selection across the morph and validates preserve hints.
Bare [morph](#morph) skips all of that and is only for callers that have
proven they need to.

## Type Declaration

### defaultConfig

> `readonly` **defaultConfig**: [`MorphConfig`](../interfaces/MorphConfig.md)

### morph

> `readonly` **morph**: *typeof* `morph`

### morphWithState

> `readonly` **morphWithState**: *typeof* `morphWithState`

### parseHTML

> `readonly` **parseHTML**: *typeof* `parseHTML`
