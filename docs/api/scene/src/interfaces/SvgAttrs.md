[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SvgAttrs

# Interface: SvgAttrs

Defined in: [scene/src/systems/svg.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/systems/svg.ts#L32)

Composed SVG attribute struct written to the `_svgAttrs` output
component. All visual fields are optional — only the ones a downstream
renderer needs to emit are populated. `_tag` is the discriminator
(scene `_tag` convention) so consumers can pattern-match the struct.

## Properties

### \_tag

> `readonly` **\_tag**: `"SvgAttrs"`

Defined in: [scene/src/systems/svg.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/systems/svg.ts#L33)

***

### clipPath?

> `readonly` `optional` **clipPath?**: `string`

Defined in: [scene/src/systems/svg.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/systems/svg.ts#L37)

***

### mixBlendMode?

> `readonly` `optional` **mixBlendMode?**: `string`

Defined in: [scene/src/systems/svg.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/systems/svg.ts#L36)

***

### opacity?

> `readonly` `optional` **opacity?**: `number`

Defined in: [scene/src/systems/svg.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/systems/svg.ts#L35)

***

### transform?

> `readonly` `optional` **transform?**: `string`

Defined in: [scene/src/systems/svg.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/systems/svg.ts#L34)
