[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FileNode

# Interface: FileNode

Defined in: [gauntlet/src/repo-ir.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L125)

A node in the file table.

## Properties

### contentDigest

> `readonly` **contentDigest**: `string`

Defined in: [gauntlet/src/repo-ir.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L134)

The host fills this with a blake3 `AddressedDigest` display string over the
file's volatile-stripped utf8 bytes (design §1: blake3, not bare fnv1a which
collides at repo scale). In-memory fixtures may use a deterministic
placeholder (see [PLACEHOLDER\_DIGEST](../variables/PLACEHOLDER_DIGEST.md)); the IR treats it as opaque.

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/repo-ir.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L127)

Repo-relative POSIX path — the node's stable identity.

***

### packageName

> `readonly` **packageName**: `string` \| `null`

Defined in: [gauntlet/src/repo-ir.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L136)

The package this file belongs to, or `null` for a repo-root / unowned file.
