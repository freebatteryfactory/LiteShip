[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / MUTATION\_OPERATORS

# Variable: MUTATION\_OPERATORS

> `const` **MUTATION\_OPERATORS**: readonly [`MutationOperatorId`](../type-aliases/MutationOperatorId.md)[]

Defined in: [audit/src/mutation-engine.ts:94](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L94)

The closed, canonically-ordered list of operator ids — the ORDER is the
deterministic tiebreak the catalogue sort uses when two mutants share a
`(line, column)` (two operators applicable at the same span, e.g. an `equality`
inside a `logical`). Ascending index = canonical precedence. Exported so the
meta-proof can assert the exact catalogue without re-deriving it.
