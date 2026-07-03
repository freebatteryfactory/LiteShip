[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CapSet

# Interface: CapSet

Defined in: [core/src/caps.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/caps.ts#L33)

Immutable set of [CapTier](../type-aliases/CapTier.md)s — the tagged value returned by [Cap](../variables/Cap.md) combinators.

`levels` is a canonical **sorted, deduped array** (ladder order via `LEVEL_ORD`), NOT a
`Set`. A `CapSet` rides inside a content-addressed graph node and travels over JSON
transports (the client→server mutation channel), and a `Set` is neither: `JSON.stringify`
turns it into `{}` (silent loss), and its insertion order made the content address
nondeterministic for the same logical set. The sorted array is JSON-faithful and gives one
canonical form. `Cap`'s combinators keep it deduped + sorted; treat it as a set.

## Properties

### \_tag

> `readonly` **\_tag**: `"CapSet"`

Defined in: [core/src/caps.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/caps.ts#L34)

***

### levels

> `readonly` **levels**: readonly [`CapTier`](../type-aliases/CapTier.md)[]

Defined in: [core/src/caps.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/caps.ts#L35)
