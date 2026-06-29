[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FloorDirection

# Type Alias: FloorDirection

> **FloorDirection** = `"higher-is-stronger"` \| `"lower-is-stronger"`

Defined in: [gauntlet/src/standards-facts.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L147)

The DIRECTION of a numeric floor — which way is STRONGER. Captured per-floor so
the diff knows which way is weakening WITHOUT a hardcoded per-name table:
 - `higher-is-stronger`: a coverage floor, a mutation-score baseline (a LOWER
   value is a WEAKEN — less is demanded).
 - `lower-is-stronger`: a complexity-class ceiling, an advisory budget (a HIGHER
   value is a WEAKEN — more is tolerated).
