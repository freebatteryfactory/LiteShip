[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / GenerateMutantsOptions

# Interface: GenerateMutantsOptions

Defined in: [audit/src/mutation-engine.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L175)

Options for [generateMutants](../functions/generateMutants.md).

## Properties

### budget?

> `readonly` `optional` **budget?**: `number`

Defined in: [audit/src/mutation-engine.ts:190](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L190)

A BUDGET cap on the catalogue size — at most `budget` mutants are returned. The
selection is the DETERMINISTIC PREFIX of the canonical-sorted catalogue after a
SEEDED stable shuffle whose seed is the file's content address (so the sample
is reproducible across runs, never random). Omitted/`undefined` → the FULL
catalogue (the L4 cannon — every applicable mutant). A `budget` of 0 yields no
mutants (an explicit no-op, not an error).

***

### file?

> `readonly` `optional` **file?**: `string`

Defined in: [audit/src/mutation-engine.ts:181](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L181)

The repo-relative file id stamped onto every mutant (so the divergence gate
can locate the mutant at a real IR node). When omitted, the `ts.SourceFile`'s
own `fileName` is used.
