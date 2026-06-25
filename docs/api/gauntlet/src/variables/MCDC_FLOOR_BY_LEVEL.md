[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / MCDC\_FLOOR\_BY\_LEVEL

# Variable: MCDC\_FLOOR\_BY\_LEVEL

> `const` **MCDC\_FLOOR\_BY\_LEVEL**: `Readonly`\<`Record`\<[`AssuranceLevel`](../type-aliases/AssuranceLevel.md), `number`\>\>

Defined in: [gauntlet/src/gates/mcdc-coverage.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/mcdc-coverage.ts#L77)

The MC/DC COVERAGE FLOOR (minimum acceptable covered-condition fraction) per level —
the blocking target. L4 = 1.0 (FULL MC/DC: every condition's independent effect
observed); lower levels descend. Redlinable DATA, sibling to KILL_FLOOR_BY_LEVEL.
