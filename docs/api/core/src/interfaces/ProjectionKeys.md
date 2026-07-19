[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProjectionKeys

# Interface: ProjectionKeys

Defined in: [core/src/graph/projection.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/projection.ts#L25)

The per-quantizer output keys, one per cast target.

## Properties

### ariaKey

> `readonly` **ariaKey**: `string`

Defined in: [core/src/graph/projection.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/projection.ts#L33)

ARIA/data attribute:  `data-liteship-<name>` (name preserved verbatim).

***

### cssKey

> `readonly` **cssKey**: `string`

Defined in: [core/src/graph/projection.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/projection.ts#L27)

CSS custom property:  `--liteship-<name>` (name preserved verbatim).

***

### glslKey

> `readonly` **glslKey**: `string`

Defined in: [core/src/graph/projection.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/projection.ts#L29)

GLSL uniform:         `u_<snake>` (the identifier the shader declares).

***

### wgslKey

> `readonly` **wgslKey**: `string`

Defined in: [core/src/graph/projection.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/projection.ts#L31)

WGSL struct field:    `<snake>` (the bare field name the buffer declares).
