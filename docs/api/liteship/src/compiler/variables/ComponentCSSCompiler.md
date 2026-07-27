[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / ComponentCSSCompiler

# Variable: ComponentCSSCompiler

> `const` **ComponentCSSCompiler**: `object`

Defined in: compiler/dist/component-css.d.ts:26

Component CSS compiler namespace.

Wraps [StyleCSSCompiler](StyleCSSCompiler.md) with component-scoped conventions: children
inside `[data-liteship-slot]` use `display: contents` so slotted content
inherits layout from the surrounding parent, and elements tagged
`[data-liteship-adaptive="<name>"]` get `container-type: inline-size` so
adaptive-mounted instances participate in container queries.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

Compile a component definition into scoped CSS with slot + adaptive markers.
