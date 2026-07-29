[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [vite/src](../README.md) / collectTokenManifest

# Function: collectTokenManifest()

> **collectTokenManifest**(`projectRoot`, `options?`): `Promise`\<`Readonly`\<`Record`\<`string`, [`TokenManifestEntry`](../type-aliases/TokenManifestEntry.md)\>\>\>

Defined in: [vite/src/token-manifest.ts:212](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/token-manifest.ts#L212)

Derive the token map for `virtual:liteship/tokens` and `virtual:liteship/tokens.css`.

## Parameters

### projectRoot

`string`

Absolute path of the project to scan.

### options?

[`CollectTokenManifestOptions`](../interfaces/CollectTokenManifestOptions.md)

Optional `tokenDir` override (mirror of `dirs.token`).

## Returns

`Promise`\<`Readonly`\<`Record`\<`string`, [`TokenManifestEntry`](../type-aliases/TokenManifestEntry.md)\>\>\>
