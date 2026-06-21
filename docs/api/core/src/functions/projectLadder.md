[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / projectLadder

# Function: projectLadder()

> **projectLadder**\<`Label`\>(`order`): `Record`\<`Label`, `ReadonlySet`\<[`LadderTarget`](../type-aliases/LadderTarget.md)\>\>

Defined in: core/src/cap-ladder.ts:64

Project [LADDER\_TARGETS](../variables/LADDER_TARGETS.md) onto a vocabulary's ordered rung labels,
producing a `Record<Label, ReadonlySet<LadderTarget>>`. The `order` array is
the vocabulary's rungs lowest-to-highest; `order[i]` receives the targets at
ladder index `i`. Both `RUNG_TARGETS` (core) and `TIER_TARGETS` (quantizer)
are built by this single function, so a congruence guard need only compare
the two projections index-for-index.

## Type Parameters

### Label

`Label` *extends* `string`

## Parameters

### order

readonly `Label`[]

## Returns

`Record`\<`Label`, `ReadonlySet`\<[`LadderTarget`](../type-aliases/LadderTarget.md)\>\>

## Throws

if `order.length !== LADDER_RUNGS` — a vocabulary with the wrong rung
count cannot be a faithful projection of the ladder, so the mismatch is loud.
