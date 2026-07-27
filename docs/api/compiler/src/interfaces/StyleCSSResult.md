[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / StyleCSSResult

# Interface: StyleCSSResult

Defined in: [compiler/src/style-css.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/style-css.ts#L31)

Output of [StyleCSSCompiler.compile](../variables/StyleCSSCompiler.md#compile).

Three complementary serializations: `scoped` is the raw `@scope`-wrapped
rule block, `layers` is the same content re-wrapped in
`@layer liteship.components { … }` with any boundary `@container` rules
appended, and `startingStyle` is an `@starting-style` block derived from
the base layer for entry animations.

## Properties

### layers

> `readonly` **layers**: `string`

Defined in: [compiler/src/style-css.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/style-css.ts#L35)

`@layer liteship.components { … }` block including container queries.

***

### scoped

> `readonly` **scoped**: `string`

Defined in: [compiler/src/style-css.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/style-css.ts#L33)

`@scope`-wrapped rule block (or plain rules when no component name).

***

### startingStyle

> `readonly` **startingStyle**: `string`

Defined in: [compiler/src/style-css.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/style-css.ts#L37)

`@starting-style { … }` block for entry animations (may be empty).
