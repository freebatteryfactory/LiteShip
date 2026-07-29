[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / CSSCompiler

# Variable: CSSCompiler

> `const` **CSSCompiler**: `object`

Defined in: compiler/dist/css.d.ts:197

CSS compiler namespace.

Compiles boundary definitions into `@container` query rules, serializes
compile results to CSS text, and generates `@property` registrations for
custom properties that enable GPU-interpolated transitions.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

### generatePropertyRegistrations

> `readonly` **generatePropertyRegistrations**: *typeof* [`generatePropertyRegistrations`](../functions/generatePropertyRegistrations.md)

### serialize

> `readonly` **serialize**: *typeof* `serialize`

## Example

```ts
import { defineBoundary } from '@liteship/core';
import { CSSCompiler } from '@liteship/compiler';

const boundary = defineBoundary({
  input: 'width',
  at: [[0, 'sm'], [768, 'lg']],
});
const result = CSSCompiler.compile(boundary, {
  sm: { '--gap': '8px' }, lg: { '--gap': '24px' },
});
const css = CSSCompiler.serialize(result);
const props = CSSCompiler.generatePropertyRegistrations({
  sm: { '--gap': '8px' }, lg: { '--gap': '24px' },
});
```
