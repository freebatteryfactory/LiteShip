[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / PROOF\_FLOOR\_BY\_LEVEL

# Variable: PROOF\_FLOOR\_BY\_LEVEL

> `const` **PROOF\_FLOOR\_BY\_LEVEL**: `Readonly`\<`Record`\<[`AssuranceLevel`](../type-aliases/AssuranceLevel.md), `number`\>\>

Defined in: [gauntlet/src/gates/proof-propagation.ts:110](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/proof-propagation.ts#L110)

The minimum acceptable EFFECTIVE proof per level — the floor a global drop must
clear, exported DATA a downstream owner can redline (sibling to the
mutation kill-floor matrix). L4/L3 demand a high composed proof; L1/L0 have no
floor (proof debt is calibrating there). A module whose effective proof is below
its level's floor BECAUSE of a weak dependency is the finding.
