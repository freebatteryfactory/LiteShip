[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / discoverInstalledPackageRoots

# Function: discoverInstalledPackageRoots()

> **discoverInstalledPackageRoots**(`cwd`, `packageNames`): [`ConsumerDiscovery`](../interfaces/ConsumerDiscovery.md)

Defined in: [audit/src/consumer.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L62)

Discover the installed roots of `packageNames` reachable from `cwd`.
BFS to fixpoint: each found package's realpath becomes a new seed, which
is what surfaces pnpm's hidden transitive `@czap/*` dependencies (they
live next to their importer inside the virtual store, not under the
project's top-level `node_modules/@czap`).

## Parameters

### cwd

`string`

### packageNames

readonly `string`[]

## Returns

[`ConsumerDiscovery`](../interfaces/ConsumerDiscovery.md)
