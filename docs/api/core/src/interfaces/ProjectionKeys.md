[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProjectionKeys

# Interface: ProjectionKeys

Defined in: [core/src/projection.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/projection.ts#L23)

The per-quantizer output keys, one per cast target.

## Properties

### ariaKey

> `readonly` **ariaKey**: `string`

Defined in: [core/src/projection.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/projection.ts#L29)

ARIA/data attribute:  `data-czap-<name>` (name preserved verbatim).

***

### cssKey

> `readonly` **cssKey**: `string`

Defined in: [core/src/projection.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/projection.ts#L25)

CSS custom property:  `--czap-<name>` (name preserved verbatim).

***

### glslKey

> `readonly` **glslKey**: `string`

Defined in: [core/src/projection.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/projection.ts#L27)

GLSL uniform:         `u_<snake>` (the identifier the shader declares).
