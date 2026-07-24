[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createLifetime

# Function: createLifetime()

> **createLifetime**(): [`LifetimeShape`](../interfaces/LifetimeShape.md)

Defined in: [core/src/reactive/lifetime.ts:237](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/lifetime.ts#L237)

Build a fresh, undisposed [Lifetime](../variables/Lifetime.md) — the standalone verb-grammar
constructor (ADR-0046 — `create` allocates a runtime resource). Equivalent to
`Lifetime.make()`; `Lifetime` stays as the composition-primitive namespace, and
this is the curated authoring-surface spelling the `liteship` root re-exports.

## Returns

[`LifetimeShape`](../interfaces/LifetimeShape.md)
