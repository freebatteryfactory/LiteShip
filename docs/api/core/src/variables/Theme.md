[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Theme

# Variable: Theme

> `const` **Theme**: `ThemeFactory` & `object`

Defined in: [core/src/theme.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/theme.ts#L99)

Theme namespace -- theme primitive for constraint-based adaptive rendering.

Map token names to variant-keyed values, enabling coherent multi-variant
token resolution (e.g. light/dark themes). Content-addressed via FNV-1a.

## Type Declaration

### tap

> **tap**: *typeof* `_tap`

## Example

```ts
import { Theme } from '@liteship/core';

const theme = Theme.make({
  name: 'brand',
  variants: ['light', 'dark'],
  tokens: {
    bg: { light: '#fff', dark: '#111' },
    fg: { light: '#000', dark: '#eee' },
  },
});
const lightTokens = Theme.tap(theme, 'light');
// lightTokens === { bg: '#fff', fg: '#000' }
```
