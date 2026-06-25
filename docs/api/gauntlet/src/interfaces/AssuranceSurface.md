[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / AssuranceSurface

# Interface: AssuranceSurface

Defined in: [gauntlet/src/standards-facts.ts:116](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L116)

One ASSURANCE-MAP entry (`LITESHIP_ASSURANCE_MAP`): a glob → level. A file's
level LOWERED (an L4 path demoted to L2) is a WEAKEN. The key is the glob (a
stable identity); a change in its level is the diff.

## Properties

### \_tag

> `readonly` **\_tag**: `"assurance"`

Defined in: [gauntlet/src/standards-facts.ts:117](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L117)

***

### glob

> `readonly` **glob**: `string`

Defined in: [gauntlet/src/standards-facts.ts:119](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L119)

The repo-relative glob this rule scopes.

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/standards-facts.ts:121](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L121)

The assurance level paths matching the glob carry — LOWERING it is a WEAKEN.
