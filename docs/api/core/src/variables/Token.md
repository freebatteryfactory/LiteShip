[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Token

# Variable: Token

> `const` **Token**: `TokenFactory` & `object`

Defined in: [core/src/token.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/token.ts#L153)

Token namespace -- design token primitive for adaptive rendering.

Create named design values that vary across axes (theme, density, contrast).
Tokens are content-addressed and produce CSS custom property references.

## Type Declaration

### cssVar

> **cssVar**: *typeof* `_cssVar`

### tap

> **tap**: *typeof* `_tap`

## Example

```ts
import { Token } from '@liteship/core';

const spacing = Token.make({
  name: 'gap', category: 'spacing',
  axes: ['density'],
  values: { 'compact': '4px', 'comfortable': '8px' },
  fallback: '6px',
});
const resolved = Token.tap(spacing, { density: 'compact' });
// resolved === '4px'
const cssRef = Token.cssVar(spacing);
// cssRef === 'var(--liteship-gap)'
```
