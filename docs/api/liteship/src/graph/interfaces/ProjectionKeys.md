[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / ProjectionKeys

# Interface: ProjectionKeys

Defined in: core/dist/graph/projection.d.ts:24

The per-quantizer output keys, one per cast target.

## Properties

### ariaKey

> `readonly` **ariaKey**: `string`

Defined in: core/dist/graph/projection.d.ts:32

ARIA/data attribute:  `data-liteship-<name>` (name preserved verbatim).

***

### cssKey

> `readonly` **cssKey**: `string`

Defined in: core/dist/graph/projection.d.ts:26

CSS custom property:  `--liteship-<name>` (name preserved verbatim).

***

### glslKey

> `readonly` **glslKey**: `string`

Defined in: core/dist/graph/projection.d.ts:28

GLSL uniform:         `u_<snake>` (the identifier the shader declares).

***

### wgslKey

> `readonly` **wgslKey**: `string`

Defined in: core/dist/graph/projection.d.ts:30

WGSL struct field:    `<snake>` (the bare field name the buffer declares).
