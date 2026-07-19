[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / normalizeRepoPath

# Function: normalizeRepoPath()

> **normalizeRepoPath**(`p`): `string`

Defined in: [core/src/internal/path-normalize.ts:13](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/path-normalize.ts#L13)

Rewrite every backslash to a forward slash — the one POSIX repo-path form used
for stable, platform-independent ids. A distinct op from `node:path` joins: it
only canonicalizes separators, it does not resolve `.`/`..` or absolutize.

## Parameters

### p

`string`

## Returns

`string`
