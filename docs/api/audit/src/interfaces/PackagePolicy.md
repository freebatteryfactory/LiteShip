[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / PackagePolicy

# Interface: PackagePolicy

Defined in: [audit/src/policy.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L38)

Injected import and surface policy for one package.

## Properties

### allowedInternalImports

> `readonly` **allowedInternalImports**: readonly `string`[]

Defined in: [audit/src/policy.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L39)

***

### analyzableArtifacts?

> `readonly` `optional` **analyzableArtifacts?**: readonly `string`[]

Defined in: [audit/src/policy.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L42)

Package-relative source/declaration globs constituting analyzed source.

***

### kind

> `readonly` **kind**: `"core"` \| `"layered"` \| `"host-adjacent"` \| `"standalone"`

Defined in: [audit/src/policy.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/policy.ts#L40)
