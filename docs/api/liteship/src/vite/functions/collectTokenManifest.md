[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / collectTokenManifest

# Function: collectTokenManifest()

> **collectTokenManifest**(`projectRoot`, `options?`): `Promise`\<`Readonly`\<`Record`\<`string`, [`TokenManifestEntry`](../type-aliases/TokenManifestEntry.md)\>\>\>

Defined in: vite/dist/token-manifest.d.ts:48

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
