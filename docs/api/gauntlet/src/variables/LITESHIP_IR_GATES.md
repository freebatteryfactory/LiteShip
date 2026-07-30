[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / LITESHIP\_IR\_GATES

# Variable: LITESHIP\_IR\_GATES

> `const` **LITESHIP\_IR\_GATES**: readonly [`Gate`](../interfaces/Gate.md)[]

Defined in: [gauntlet/src/runner.ts:232](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L232)

The IR composition is the exact lean composition with the text bare-throw
scanner replaced by its AST fact fold, unioned with IR-only authorities. It
cannot silently drop a lean gate when either set changes.
