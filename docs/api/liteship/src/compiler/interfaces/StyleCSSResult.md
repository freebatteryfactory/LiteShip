[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / StyleCSSResult

# Interface: StyleCSSResult

Defined in: compiler/dist/style-css.d.ts:23

Output of [StyleCSSCompiler.compile](../variables/StyleCSSCompiler.md#compile).

Three complementary serializations: `scoped` is the raw `@scope`-wrapped
rule block, `layers` is the same content re-wrapped in
`@layer liteship.components { … }` with any boundary `@container` rules
appended, and `startingStyle` is an `@starting-style` block derived from
the base layer for entry animations.

## Properties

### layers

> `readonly` **layers**: `string`

Defined in: compiler/dist/style-css.d.ts:27

`@layer liteship.components { … }` block including container queries.

***

### scoped

> `readonly` **scoped**: `string`

Defined in: compiler/dist/style-css.d.ts:25

`@scope`-wrapped rule block (or plain rules when no component name).

***

### startingStyle

> `readonly` **startingStyle**: `string`

Defined in: compiler/dist/style-css.d.ts:29

`@starting-style { … }` block for entry animations (may be empty).
