[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / collectTokenManifest

# Function: collectTokenManifest()

> **collectTokenManifest**(`projectRoot`, `options?`): `Promise`\<`Readonly`\<`Record`\<`string`, [`TokenManifestEntry`](../type-aliases/TokenManifestEntry.md)\>\>\>

Defined in: [vite/src/token-manifest.ts:246](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/token-manifest.ts#L246)

Derive the token map for `virtual:czap/tokens` and `virtual:czap/tokens.css`.

## Parameters

### projectRoot

`string`

Absolute path of the project to scan.

### options?

[`CollectTokenManifestOptions`](../interfaces/CollectTokenManifestOptions.md)

Optional `tokenDir` override (mirror of `dirs.token`).

## Returns

`Promise`\<`Readonly`\<`Record`\<`string`, [`TokenManifestEntry`](../type-aliases/TokenManifestEntry.md)\>\>\>
