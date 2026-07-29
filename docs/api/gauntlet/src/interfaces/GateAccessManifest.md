[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / GateAccessManifest

# Interface: GateAccessManifest

Defined in: [gauntlet/src/gate.ts:539](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L539)

Machine-readable description of the GateContext surfaces a hosted gate reads.
Covered IR files need no per-file declaration: their bytes are already folded
by the coverage digest. Everything outside that domain must be named here.

## Properties

### allFiles?

> `readonly` `optional` **allFiles?**: `true`

Defined in: [gauntlet/src/gate.ts:541](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L541)

The gate enumerates the unscoped confirmer corpus.

***

### facts?

> `readonly` `optional` **facts?**: readonly [`GateFactAccess`](GateFactAccess.md)[]

Defined in: [gauntlet/src/gate.ts:547](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L547)

Host-produced fact channels the gate reads.

***

### ir?

> `readonly` `optional` **ir?**: readonly (`"refs"` \| `"facts"`)[]

Defined in: [gauntlet/src/gate.ts:545](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L545)

Host-oracle-computed RepoIR tables the gate reads.

***

### outOfIrGlobs?

> `readonly` `optional` **outOfIrGlobs?**: readonly `string`[]

Defined in: [gauntlet/src/gate.ts:543](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L543)

Repo-relative globs for files read outside the IR coverage domain.
