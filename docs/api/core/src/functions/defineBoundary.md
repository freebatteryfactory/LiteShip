[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / defineBoundary

# Function: defineBoundary()

> **defineBoundary**\<`I`, `S`\>(`config`): `BoundaryDef`\<`I`, `S`\>

Defined in: [core/src/authoring/boundary.ts:291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/boundary.ts#L291)

Define a boundary — the core primitive of constraint-based adaptive rendering.

A boundary quantizes a continuous signal (viewport, scroll, audio, …) into a
discrete set of named states. Every boundary is content-addressed via FNV-1a
(thresholds must be strictly ascending), supports optional hysteresis to
prevent flicker at thresholds, and can be gated by a [BoundarySpec](../variables/BoundarySpec.md) for
A/B or device-conditional activation.

## Type Parameters

### I

`I` *extends* `string`

### S

`S` *extends* readonly \[`string`, `string`\]

## Parameters

### config

#### at

\{ readonly \[K in string \| number \| symbol\]: readonly \[number, S\[K\]\] \}

#### hysteresis?

`number`

#### input

`I`

#### spec?

[`BoundarySpec`](../interfaces/BoundarySpec.md)

## Returns

`BoundaryDef`\<`I`, `S`\>

## Example

```ts
import { defineBoundary, Boundary } from '@liteship/core';

const viewport = defineBoundary({
  input: 'viewport.width',
  at: [[0, 'mobile'], [640, 'tablet'], [1024, 'desktop']],
  hysteresis: 16,
});
// viewport._tag === 'BoundaryDef'
// viewport.id === 'fnv1a:...' (content address)
// viewport.states === ['mobile', 'tablet', 'desktop']
Boundary.evaluate(viewport, 800); // 'tablet'
```
