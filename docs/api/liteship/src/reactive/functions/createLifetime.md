[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / createLifetime

# Function: createLifetime()

> **createLifetime**(): [`Lifetime`](../type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:89

Build a fresh, undisposed [Lifetime](../type-aliases/Lifetime.md) — the standalone verb-grammar
constructor (ADR-0046 — `create` allocates a runtime resource). Equivalent to
`Lifetime.make()`; `Lifetime` stays as the composition-primitive namespace, and
this is the curated authoring-surface spelling the `liteship` root re-exports.

## Returns

[`Lifetime`](../type-aliases/Lifetime.md)
