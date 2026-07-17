[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / applySvgAttrs

# Function: applySvgAttrs()

> **applySvgAttrs**(`frame`, `resolve`): `number`

Defined in: [scene/src/systems/svg-egress.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/systems/svg-egress.ts#L81)

Thin DOM applicator — write a collected [SvgAttrsFrame](../type-aliases/SvgAttrsFrame.md) onto live
SVG elements. For each entity present in the frame it resolves the target
element and applies the populated attributes:

 - `transform`     → `setAttribute('transform', …)`
 - `opacity`       → `setAttribute('opacity', String(…))`
 - `mixBlendMode`  → `style.mixBlendMode = …`
 - `clipPath`      → `setAttribute('clip-path', …)`

Only populated fields are touched, so an element keeps any
author-supplied values for attributes SVGSystem left absent. Returns the
number of elements actually written (resolved + present), letting callers
assert the egress reached the DOM.

## Parameters

### frame

[`SvgAttrsFrame`](../type-aliases/SvgAttrsFrame.md)

### resolve

[`SvgElementResolver`](../type-aliases/SvgElementResolver.md)

## Returns

`number`
