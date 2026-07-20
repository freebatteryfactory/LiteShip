[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Theme

# Variable: Theme

> `const` **Theme**: `object`

Defined in: [core/src/authoring/theme.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/theme.ts#L142)

Theme — the resolution namespace for a Theme definition. Construction
lives in the standalone [defineTheme](../functions/defineTheme.md); this object carries
[Theme.tap](#tap) (resolve all tokens for a given variant).

## Type Declaration

### tap

> **tap**: \<`V`\>(`theme`, `variant`) => `Record`\<`string`, `unknown`\> = `_tap`

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
