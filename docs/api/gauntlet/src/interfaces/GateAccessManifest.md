[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateAccessManifest

# Interface: GateAccessManifest

Defined in: [gauntlet/src/gate.ts:538](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L538)

Machine-readable description of the GateContext surfaces a hosted gate reads.
Covered IR files need no per-file declaration: their bytes are already folded
by the coverage digest. Everything outside that domain must be named here.

## Properties

### allFiles?

> `readonly` `optional` **allFiles?**: `true`

Defined in: [gauntlet/src/gate.ts:540](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L540)

The gate enumerates the unscoped confirmer corpus.

***

### facts?

> `readonly` `optional` **facts?**: readonly [`GateFactAccess`](GateFactAccess.md)[]

Defined in: [gauntlet/src/gate.ts:546](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L546)

Host-produced fact channels the gate reads.

***

### ir?

> `readonly` `optional` **ir?**: readonly (`"refs"` \| `"facts"`)[]

Defined in: [gauntlet/src/gate.ts:544](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L544)

Host-oracle-computed RepoIR tables the gate reads.

***

### outOfIrGlobs?

> `readonly` `optional` **outOfIrGlobs?**: readonly `string`[]

Defined in: [gauntlet/src/gate.ts:542](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L542)

Repo-relative globs for files read outside the IR coverage domain.
