[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / defineTheme

# Function: defineTheme()

> **defineTheme**\<`V`\>(`config`): `ThemeDef`\<`V`\>

Defined in: [core/src/authoring/theme.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/theme.ts#L109)

Define a theme — maps token names to variant-keyed values, enabling coherent
multi-variant token resolution (e.g. light/dark themes).

Validates that every token has a value for each declared variant. The
resulting object is frozen and content-addressed via FNV-1a.

## Type Parameters

### V

`V` *extends* readonly \[`string`, `string`\]

## Parameters

### config

#### meta?

`Record`\<`V`\[`number`\], \{ `label`: `string`; `mode`: `"light"` \| `"dark"`; \}\>

#### name

`string`

#### tokens

`Record`\<`string`, `Record`\<`V`\[`number`\] & `string`, `unknown`\>\>

#### variants

`V`

## Returns

`ThemeDef`\<`V`\>

## Example

```ts
const theme = defineTheme({
  name: 'ocean',
  variants: ['light', 'dark'],
  tokens: { primary: { light: '#0066cc', dark: '#3399ff' } },
  meta: { light: { label: 'Light', mode: 'light' }, dark: { label: 'Dark', mode: 'dark' } },
});
// theme._tag === 'ThemeDef'
// theme.id === 'fnv1a:...'
```
