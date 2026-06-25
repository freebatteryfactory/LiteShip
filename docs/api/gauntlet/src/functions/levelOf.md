[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / levelOf

# Function: levelOf()

> **levelOf**(`file`, `map?`): [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/assurance-map.ts:239](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/assurance-map.ts#L239)

The level of `file` per the assurance map: the FIRST matching rule's level
(rules are most-specific first), else `L1`. Pure + deterministic — no clock,
no randomness, no filesystem; a repo-relative path in, a level out.

## Parameters

### file

`string`

repo-relative path (forward slashes).

### map?

readonly [`LevelRule`](../interfaces/LevelRule.md)[] = `LITESHIP_ASSURANCE_MAP`

the ordered rule list (defaults to [LITESHIP\_ASSURANCE\_MAP](../variables/LITESHIP_ASSURANCE_MAP.md)).

## Returns

[`AssuranceLevel`](../type-aliases/AssuranceLevel.md)
