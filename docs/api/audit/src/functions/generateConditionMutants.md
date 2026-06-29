[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / generateConditionMutants

# Function: generateConditionMutants()

> **generateConditionMutants**(`sourceFile`, `options?`): readonly [`ConditionMutant`](../interfaces/ConditionMutant.md)[]

Defined in: [audit/src/mcdc-engine.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L142)

Generate the canonical, sorted, content-addressed list of CONDITION-mutants for a
parsed source file — the deterministic heart of the MC/DC engine.

Algorithm (every step a pure function of `sourceFile.text`):
 1. ONE top-down `ts.forEachChild` traversal; at each node, if it opens a DECISION
    (an `if`/`while`/`do`/`for` test, a ternary test, a logical `&&`/`||`, or a
    boolean-`return` expression), decompose its test into the set of ATOMIC
    conditions (recursively split on `&&`/`||`; a leaf is any non-logical boolean
    sub-expression). The decision's full text is recorded for the finding.
 2. For each atomic condition, mint BOTH pins (force-true, force-false) as a precise
    span splice over the condition's `[start, end)`.
 3. De-duplicate by `(start, end, force)` (a condition that is BOTH a logical operand
    AND, say, the same node reached via two decision roots is minted once).
 4. Content-address + locate each, then TOTAL-sort (line, column, force rank, then a
    content tiebreak) so the order is independent of traversal.

Same source bytes → byte-identical list with stable ids. No clock, no rng, no I/O.

## Parameters

### sourceFile

`SourceFile`

### options?

[`GenerateConditionMutantsOptions`](../interfaces/GenerateConditionMutantsOptions.md) = `{}`

## Returns

readonly [`ConditionMutant`](../interfaces/ConditionMutant.md)[]
