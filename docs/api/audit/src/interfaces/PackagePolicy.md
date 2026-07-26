[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / PackagePolicy

# Interface: PackagePolicy

Defined in: [audit/src/policy.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L41)

## Properties

### allowedInternalImports

> `readonly` **allowedInternalImports**: readonly `string`[]

Defined in: [audit/src/policy.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L42)

***

### analyzableArtifacts?

> `readonly` `optional` **analyzableArtifacts?**: readonly `string`[]

Defined in: [audit/src/policy.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L49)

Package-relative source/declaration globs that constitute an analyzed
package. Omission retains the reusable engine's standard TS/TSX default;
LiteShip's generated catalog projection always emits this field exactly.

***

### kind

> `readonly` **kind**: `"standalone"` \| `"core"` \| `"layered"` \| `"host-adjacent"`

Defined in: [audit/src/policy.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L43)
