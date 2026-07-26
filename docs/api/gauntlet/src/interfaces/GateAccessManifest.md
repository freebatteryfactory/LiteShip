[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateAccessManifest

# Interface: GateAccessManifest

Defined in: [gauntlet/src/gate.ts:453](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L453)

Machine-readable description of the GateContext surfaces a hosted gate reads.
Covered IR files need no per-file declaration: their bytes are already folded
by the coverage digest. Everything outside that domain must be named here.

## Properties

### allFiles?

> `readonly` `optional` **allFiles?**: `true`

Defined in: [gauntlet/src/gate.ts:455](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L455)

The gate enumerates the unscoped confirmer corpus.

***

### facts?

> `readonly` `optional` **facts?**: readonly [`GateFactAccess`](GateFactAccess.md)[]

Defined in: [gauntlet/src/gate.ts:461](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L461)

Host-produced fact channels the gate reads.

***

### ir?

> `readonly` `optional` **ir?**: readonly (`"refs"` \| `"facts"`)[]

Defined in: [gauntlet/src/gate.ts:459](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L459)

Host-oracle-computed RepoIR tables the gate reads.

***

### outOfIrGlobs?

> `readonly` `optional` **outOfIrGlobs?**: readonly `string`[]

Defined in: [gauntlet/src/gate.ts:457](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L457)

Repo-relative globs for files read outside the IR coverage domain.
