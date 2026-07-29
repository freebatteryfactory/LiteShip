[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / collectThemeManifest

# Function: collectThemeManifest()

> **collectThemeManifest**(`projectRoot`, `options?`): `Promise`\<`Readonly`\<`Record`\<`string`, [`ThemeManifestEntry`](../type-aliases/ThemeManifestEntry.md)\>\>\>

Defined in: vite/dist/token-manifest.d.ts:55

Derive the theme map for `virtual:liteship/themes`.

## Parameters

### projectRoot

`string`

Absolute path of the project to scan.

### options?

[`CollectThemeManifestOptions`](../interfaces/CollectThemeManifestOptions.md)

Optional `themeDir` override (mirror of `dirs.theme`).

## Returns

`Promise`\<`Readonly`\<`Record`\<`string`, [`ThemeManifestEntry`](../type-aliases/ThemeManifestEntry.md)\>\>\>
