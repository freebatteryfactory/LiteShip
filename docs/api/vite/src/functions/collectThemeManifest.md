[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / collectThemeManifest

# Function: collectThemeManifest()

> **collectThemeManifest**(`projectRoot`, `options?`): `Promise`\<`Readonly`\<`Record`\<`string`, [`ThemeManifestEntry`](../type-aliases/ThemeManifestEntry.md)\>\>\>

Defined in: [vite/src/token-manifest.ts:276](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/token-manifest.ts#L276)

Derive the theme map for `virtual:czap/themes`.

## Parameters

### projectRoot

`string`

Absolute path of the project to scan.

### options?

[`CollectThemeManifestOptions`](../interfaces/CollectThemeManifestOptions.md)

Optional `themeDir` override (mirror of `dirs.theme`).

## Returns

`Promise`\<`Readonly`\<`Record`\<`string`, [`ThemeManifestEntry`](../type-aliases/ThemeManifestEntry.md)\>\>\>
