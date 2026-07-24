[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / collectThemeManifest

# Function: collectThemeManifest()

> **collectThemeManifest**(`projectRoot`, `options?`): `Promise`\<`Readonly`\<`Record`\<`string`, [`ThemeManifestEntry`](../type-aliases/ThemeManifestEntry.md)\>\>\>

Defined in: [vite/src/token-manifest.ts:234](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/token-manifest.ts#L234)

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
