[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [liteship/src](../README.md) / Theme

# Type Alias: Theme

> **Theme** = `object`

Defined in: core/dist/authoring/theme.d.ts:92

Theme — the resolution namespace for a Theme definition. Construction
lives in the standalone [defineTheme](../functions/defineTheme.md); this object carries
[Theme.tap](#tap) (resolve all tokens for a given variant).

## Properties

### tap

> **tap**: \<`V`\>(`theme`, `variant`) => `Record`\<`string`, `unknown`\>

Defined in: core/dist/authoring/theme.d.ts:93

Resolve all tokens for a given variant, returning a map of token name to value.

Iterates the theme's token map and extracts each token's value for the
specified variant.

#### Type Parameters

##### V

`V` *extends* readonly `string`[]

#### Parameters

##### theme

`ThemeDef`\<`V`\>

##### variant

`V`\[`number`\]

#### Returns

`Record`\<`string`, `unknown`\>

#### Example

```ts
const theme = defineTheme({
  name: 'brand',
  variants: ['light', 'dark'],
  tokens: { bg: { light: '#fff', dark: '#111' }, fg: { light: '#000', dark: '#eee' } },
});
const darkTokens = Theme.tap(theme, 'dark');
// darkTokens === { bg: '#111', fg: '#eee' }
```
