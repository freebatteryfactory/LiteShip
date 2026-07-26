[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / GenFrame

# Variable: GenFrame

> `const` **GenFrame**: `object`

Defined in: core/dist/media/gen-frame.d.ts:95

Generative-UI frame scheduler namespace.

Turns a bursty LLM token stream into evenly-paced frames the DOM runtime
can apply without stalling, and resolves disconnect gaps using the receipt
chain or transport resumption.

## Type Declaration

### make

> **make**: *typeof* `_make`

Create a new fixed-step scheduler bound to a [TokenBuffer](../type-aliases/TokenBuffer.md) and quality-tier probe.

### resolveGap

> **resolveGap**: *typeof* `resolveGap`

Pick a recovery [GapStrategy](../type-aliases/GapStrategy.md) after a stream disconnect.
