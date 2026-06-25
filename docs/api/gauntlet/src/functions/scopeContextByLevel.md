[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / scopeContextByLevel

# Function: scopeContextByLevel()

> **scopeContextByLevel**(`context`, `level`, `map`, `effectiveLevels?`): [`GateContext`](../interfaces/GateContext.md)

Defined in: [gauntlet/src/engine.ts:141](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L141)

Derive a [GateContext](../interfaces/GateContext.md) scoped to files at-or-above `level`, per `map`.

`readFile` and `repoRoot` are passed through unchanged; only `files()` is
narrowed to those whose level is `atLeast(level)`. A gate written against
[GateContext](../interfaces/GateContext.md) thus only ever sees the files its rigor aims at — an L3 gate
run with the map drops the L0/L1 tooling entirely. Pure: no clock, no I/O, just
a filter over the base context's file list.

When `effectiveLevels` is supplied (the `--ir` path), a file's PROPAGATED level
(import-graph propagation) is the scoping level — a file pulled into an L4 path
is now in an L4 gate's band even though its GLOB would have excluded it. When it
is OMITTED (the lean path) the glob-only [levelOf](levelOf.md) is used — byte-identical
to before B3.4.

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

### level

[`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

### map

readonly [`LevelRule`](../interfaces/LevelRule.md)[]

### effectiveLevels?

`ReadonlyMap`\<`string`, [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)\>

## Returns

[`GateContext`](../interfaces/GateContext.md)
