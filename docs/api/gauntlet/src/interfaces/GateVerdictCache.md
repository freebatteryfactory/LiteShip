[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateVerdictCache

# Interface: GateVerdictCache

Defined in: [gauntlet/src/verdict-cache.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L64)

The injected verdict store. The engine reads/writes RAW gate findings (the
pre-authority, pre-waiver output of `gate.run`) through this narrow seam; a
host backs it with the filesystem (`.liteship/cache/gauntlet/<keyhash>.json`),
a test backs it with a `Map`. `read` returns `null` on a MISS (absent OR
unreadable OR malformed — every uncertain case falls through to a re-run,
never a stale serve).

## Methods

### read()

> **read**(`key`): readonly [`Finding`](Finding.md)[] \| `null`

Defined in: [gauntlet/src/verdict-cache.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L66)

The cached RAW findings for `key`, or `null` on a MISS (re-run).

#### Parameters

##### key

`string`

#### Returns

readonly [`Finding`](Finding.md)[] \| `null`

***

### write()

> **write**(`key`, `findings`): `void`

Defined in: [gauntlet/src/verdict-cache.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L68)

Record the RAW findings produced for `key` (a fresh gate.run result).

#### Parameters

##### key

`string`

##### findings

readonly [`Finding`](Finding.md)[]

#### Returns

`void`
