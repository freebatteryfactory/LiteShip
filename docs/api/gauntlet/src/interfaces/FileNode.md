[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / FileNode

# Interface: FileNode

Defined in: [gauntlet/src/repo-ir.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L126)

A node in the file table.

## Properties

### contentDigest

> `readonly` **contentDigest**: `string`

Defined in: [gauntlet/src/repo-ir.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L135)

The host fills this with a blake3 `AddressedDigest` display string over the
file's volatile-stripped utf8 bytes (design §1: blake3, not bare fnv1a which
collides at repo scale). In-memory fixtures may use a deterministic
placeholder (see [PLACEHOLDER\_DIGEST](../variables/PLACEHOLDER_DIGEST.md)); the IR treats it as opaque.

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/repo-ir.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L128)

Repo-relative POSIX path — the node's stable identity.

***

### packageName

> `readonly` **packageName**: `string` \| `null`

Defined in: [gauntlet/src/repo-ir.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L137)

The package this file belongs to, or `null` for a repo-root / unowned file.
