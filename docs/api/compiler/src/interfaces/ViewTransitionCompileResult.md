[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [compiler/src](../README.md) / ViewTransitionCompileResult

# Interface: ViewTransitionCompileResult

Defined in: [compiler/src/view-transition-compile.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L62)

CSS artifacts emitted by [compileViewTransition](../functions/compileViewTransition.md).

## Properties

### atRule

> `readonly` **atRule**: `string`

Defined in: [compiler/src/view-transition-compile.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L70)

`@view-transition { navigation: auto; }` for MPA; empty for the SPA default.

***

### nameAssignment

> `readonly` **nameAssignment**: `string`

Defined in: [compiler/src/view-transition-compile.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L66)

`<selector> { view-transition-name: <ident>; }`.

***

### pseudoStyles

> `readonly` **pseudoStyles**: `string`

Defined in: [compiler/src/view-transition-compile.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L68)

`::view-transition-old(<name>)` + `::view-transition-new(<name>)` cross-fade rules.

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/view-transition-compile.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L72)

Full concatenated sheet (non-empty sections joined by a blank line).

***

### viewTransitionName

> `readonly` **viewTransitionName**: `string`

Defined in: [compiler/src/view-transition-compile.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L64)

The readable, content-address-suffixed custom-ident used as the `view-transition-name`.
