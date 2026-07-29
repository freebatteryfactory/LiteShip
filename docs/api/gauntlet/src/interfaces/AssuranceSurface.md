[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / AssuranceSurface

# Interface: AssuranceSurface

Defined in: [gauntlet/src/facts/standards-facts.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L117)

One ASSURANCE-MAP entry (`LITESHIP_ASSURANCE_MAP`): a glob → level. A file's
level LOWERED (an L4 path demoted to L2) is a WEAKEN. The key is the glob (a
stable identity); a change in its level is the diff.

## Properties

### \_tag

> `readonly` **\_tag**: `"assurance"`

Defined in: [gauntlet/src/facts/standards-facts.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L118)

***

### glob

> `readonly` **glob**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L120)

The repo-relative glob this rule scopes.

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/facts/standards-facts.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L122)

The assurance level paths matching the glob carry — LOWERING it is a WEAKEN.

***

### order?

> `readonly` `optional` **order?**: `number`

Defined in: [gauntlet/src/facts/standards-facts.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L128)

First-match priority in the ordered assurance map. Format-1 snapshots omit
this field; format 2 records it so reordering overlapping rules is part of
the standards surface rather than invisible serialization noise.
