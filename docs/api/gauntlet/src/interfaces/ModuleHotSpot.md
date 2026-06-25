[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ModuleHotSpot

# Interface: ModuleHotSpot

Defined in: [gauntlet/src/ambition-proof.ts:121](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L121)

One module's place on the heatmap — its ambition, proof, hotness, and the raw signals.

## Properties

### ambition

> `readonly` **ambition**: [`ModuleAmbition`](ModuleAmbition.md)

Defined in: [gauntlet/src/ambition-proof.ts:123](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L123)

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/ambition-proof.ts:122](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L122)

***

### hotness

> `readonly` **hotness**: `number`

Defined in: [gauntlet/src/ambition-proof.ts:136](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L136)

AMBITION ÷ max(PROOF, floor) — hottest first when ranked.

***

### proof

> `readonly` **proof**: `object`

Defined in: [gauntlet/src/ambition-proof.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L125)

The PROOF sub-scores + the blended scalar (each in `[0, 1]`).

#### callSites

> `readonly` **callSites**: `number`

#### hasBench

> `readonly` **hasBench**: `number`

#### hasEnrolledInvariant

> `readonly` **hasEnrolledInvariant**: `number`

#### hasPropertyTest

> `readonly` **hasPropertyTest**: `number`

#### hasTestFile

> `readonly` **hasTestFile**: `number`

#### mutationScore

> `readonly` **mutationScore**: `number`

#### proof

> `readonly` **proof**: `number`

The mean of the six sub-scores.
