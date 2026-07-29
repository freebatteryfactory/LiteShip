[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/migrate](../README.md) / fromCSSCustomProperties

# Function: fromCSSCustomProperties()

> **fromCSSCustomProperties**(`css`, `options?`): [`MigrationResult`](../interfaces/MigrationResult.md)

Defined in: compiler/dist/migrate/from-css-custom-properties.d.ts:63

Lower `:root { … }` and `html[data-theme="X"] { … }` custom-property rules into
`@liteship/core` definitions.

Produces one `defineTheme` (variants ordered `default` first, then each
`data-theme` variant in first-seen order) when more than one variant is present,
or one `defineToken` per token when only a single variant is present. Every
lossy (`var()`/`calc()`), unclassifiable, incomplete-variant, or
constructor-rejected declaration is recorded as a [MigrationDiagnostic](../interfaces/MigrationDiagnostic.md)
instead of throwing.

## Parameters

### css

`string`

### options?

[`FromCSSCustomPropertiesOptions`](../interfaces/FromCSSCustomPropertiesOptions.md)

## Returns

[`MigrationResult`](../interfaces/MigrationResult.md)

## Example

```ts
const { themes } = fromCSSCustomProperties(`
  :root { --liteship-bg: #ffffff; }
  html[data-theme="dark"] { --liteship-bg: #111111; }
`);
// themes[0]: variants ['default', 'dark'],
//            tokens { bg: { default: '#ffffff', dark: '#111111' } }
```
