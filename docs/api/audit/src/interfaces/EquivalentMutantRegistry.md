[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / EquivalentMutantRegistry

# Interface: EquivalentMutantRegistry

Defined in: [audit/src/mutation-verdict.ts:172](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L172)

The injected EQUIVALENT-MUTANT registry — resolves a mutant's CONTENT ADDRESS to its
justification, or `null` when the mutant is not a registered equivalent. The host
loads it from a committed, content-addressed artifact (`benchmarks/mutation-
equivalents.json`); the verdict consults it. Keying on `mutant.id` (not file:line)
is the ANTI-DRIFT keystone: the id is the blake3 of `{file, operator, line, column,
originalText, mutatedText}`, so any change to the mutated code yields a NEW id that
the registry no longer matches — a stale justification can never silently cover a
different (possibly real) mutant. Composition: a function over the open contract, not
a class.

## Methods

### justification()

> **justification**(`mutantId`): `string` \| `null`

Defined in: [audit/src/mutation-verdict.ts:174](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L174)

The justification for `mutantId`, or `null` when it is not a registered equivalent.

#### Parameters

##### mutantId

`string`

#### Returns

`string` \| `null`
