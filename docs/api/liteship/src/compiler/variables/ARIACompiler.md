[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / ARIACompiler

# Variable: ARIACompiler

> `const` **ARIACompiler**: `object`

Defined in: compiler/dist/aria.d.ts:83

ARIA compiler namespace.

Compiles boundary definitions into validated ARIA attribute maps keyed by
state. Invalid attribute keys (not `aria-*` or `role`) are filtered and
trigger a diagnostic warning. Returns both the full state mapping and the
attributes for the current active state.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

## Example

```ts
import { defineBoundary } from '@liteship/core';
import { ARIACompiler } from '@liteship/compiler';

const boundary = defineBoundary({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});
const result = ARIACompiler.compile(boundary, {
  sm: { 'aria-hidden': 'true' },
  lg: { 'aria-hidden': 'false' },
}, 'sm');
const attrs = result.currentAttributes;
// { 'aria-hidden': 'true' }
```
