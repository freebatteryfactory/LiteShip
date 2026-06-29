[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / Mutation

# Interface: Mutation

Defined in: [audit/src/mutation-engine.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L120)

One concrete rewrite an operator proposes at a node: replace the source SPAN
`[start, end)` (absolute character offsets into the file) with `replacement`.
Span-precise so [applyMutant](../functions/applyMutant.md) splices exactly that range and the rest of
the file stays byte-identical (no whole-tree re-serialization).

## Properties

### end

> `readonly` **end**: `number`

Defined in: [audit/src/mutation-engine.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L125)

Absolute end offset of the replaced span (exclusive).

***

### mutatedText

> `readonly` **mutatedText**: `string`

Defined in: [audit/src/mutation-engine.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L129)

The text spliced in its place.

***

### operator

> `readonly` **operator**: [`MutationOperatorId`](../type-aliases/MutationOperatorId.md)

Defined in: [audit/src/mutation-engine.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L121)

***

### originalText

> `readonly` **originalText**: `string`

Defined in: [audit/src/mutation-engine.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L127)

The exact original text of the span (for the human-readable diff).

***

### start

> `readonly` **start**: `number`

Defined in: [audit/src/mutation-engine.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L123)

Absolute start offset of the replaced span (inclusive).
