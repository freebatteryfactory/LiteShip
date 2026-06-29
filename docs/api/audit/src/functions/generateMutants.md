[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / generateMutants

# Function: generateMutants()

> **generateMutants**(`sourceFile`, `options?`): readonly [`Mutant`](../interfaces/Mutant.md)[]

Defined in: [audit/src/mutation-engine.ts:212](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L212)

Generate the canonical, sorted, content-addressed list of mutants for a parsed
source file — the deterministic heart of the engine.

Algorithm (every step is a pure function of `sourceFile.text`):
 1. ONE top-down `ts.forEachChild` traversal; at each node, every operator in
    the catalogue is offered the node and returns 0+ [Mutation](../interfaces/Mutation.md)s.
 2. Each mutation is located (1-based line/column from its start offset) and
    content-addressed into a [Mutant](../interfaces/Mutant.md).
 3. The full list is TOTAL-sorted: line, then column, then operator rank, then
    the mutated text (a final content tiebreak so the order is total even if two
    operators emit at the identical span — impossible in the current catalogue,
    but the sort is total by construction, never order-dependent on traversal).
 4. If a `budget` caps the list, the SEEDED deterministic prefix is taken (see
    [GenerateMutantsOptions.budget](../interfaces/GenerateMutantsOptions.md#budget)).

Same source bytes → byte-identical mutant list with stable ids. No clock, no rng
(except the content-seeded budget selection), no I/O.

## Parameters

### sourceFile

`SourceFile`

### options?

[`GenerateMutantsOptions`](../interfaces/GenerateMutantsOptions.md) = `{}`

## Returns

readonly [`Mutant`](../interfaces/Mutant.md)[]
