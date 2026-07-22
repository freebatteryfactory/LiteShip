[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / discoverInstalledPackageRoots

# Function: discoverInstalledPackageRoots()

> **discoverInstalledPackageRoots**(`cwd`, `packageNames`): [`ConsumerDiscovery`](../interfaces/ConsumerDiscovery.md)

Defined in: [audit/src/consumer.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L71)

Discover the installed roots of `packageNames` reachable from `cwd`.
BFS to fixpoint: each found package's realpath becomes a new seed, which
is what surfaces pnpm's hidden transitive `@liteship/*` dependencies (they
live next to their importer inside the virtual store, not under the
project's top-level `node_modules/@liteship`).

## Parameters

### cwd

`string`

### packageNames

readonly `string`[]

## Returns

[`ConsumerDiscovery`](../interfaces/ConsumerDiscovery.md)
