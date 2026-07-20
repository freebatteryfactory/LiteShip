[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / ARIACompiler

# Variable: ARIACompiler

> `const` **ARIACompiler**: `object`

Defined in: [compiler/src/aria.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/aria.ts#L149)

ARIA compiler namespace.

Compiles boundary definitions into validated ARIA attribute maps keyed by
state. Invalid attribute keys (not `aria-*` or `role`) are filtered and
trigger a diagnostic warning. Returns both the full state mapping and the
attributes for the current active state.

## Type Declaration

### compile

> **compile**: \<`B`\>(`boundary`, `states`, `currentState`) => [`ARIACompileResult`](../interfaces/ARIACompileResult.md)\<`StateUnion`\<`B`\>\>

Compile a boundary definition and per-state ARIA attribute maps into a
validated result containing the full state-to-attributes mapping and the
attributes for the current active state.

Only valid ARIA attributes (`aria-*`) and `role` are retained; all other
keys are dropped and trigger a diagnostic warning.

#### Type Parameters

##### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

#### Parameters

##### boundary

`B`

The boundary definition with states

##### states

`{ [S in string]: Record<string, string> }`

Per-state ARIA attribute maps

##### currentState

`StateUnion`\<`B`\>

The currently active state

#### Returns

[`ARIACompileResult`](../interfaces/ARIACompileResult.md)\<`StateUnion`\<`B`\>\>

An [ARIACompileResult](../interfaces/ARIACompileResult.md) with validated state attributes

#### Example

```ts
import { Boundary } from '@liteship/core';
import { ARIACompiler } from '@liteship/compiler';

const boundary = Boundary.make({
  input: 'width',
  at: [[0, 'collapsed'], [768, 'expanded']],
});
const result = ARIACompiler.compile(boundary, {
  collapsed: { 'aria-expanded': 'false', 'aria-label': 'Show more' },
  expanded: { 'aria-expanded': 'true', 'aria-label': 'Show less' },
}, 'collapsed');
console.log(result.currentAttributes);
// { 'aria-expanded': 'false', 'aria-label': 'Show more' }
```

## Example

```ts
import { Boundary } from '@liteship/core';
import { ARIACompiler } from '@liteship/compiler';

const boundary = Boundary.make({
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
