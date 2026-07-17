[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / TypeValidator

# TypeValidator

Runtime validator that verifies values against kernel schemas.

[TypeValidator.validate](../../variables/TypeValidator.md#validate) is a SYNC strict kernel decode: it returns a
value-or-tagged-error [Result](type-aliases/Result.md) — an `ok` carrying the decoded `T`, or an
`err` carrying a tagged [ParseError](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts) folded from the strict decoder's
path-tagged issue list. It never throws on bad input and never returns an
Effect. Used by capsule dispatchers to check inputs before invoking handlers.

## Type Aliases

- [Result](type-aliases/Result.md)
