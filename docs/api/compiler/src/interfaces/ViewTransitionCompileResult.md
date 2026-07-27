[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / ViewTransitionCompileResult

# Interface: ViewTransitionCompileResult

Defined in: [compiler/src/view-transition-compile.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L61)

CSS artifacts emitted by [compileViewTransition](../functions/compileViewTransition.md).

## Properties

### atRule

> `readonly` **atRule**: `string`

Defined in: [compiler/src/view-transition-compile.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L69)

`@view-transition { navigation: auto; }` for MPA; empty for the SPA default.

***

### nameAssignment

> `readonly` **nameAssignment**: `string`

Defined in: [compiler/src/view-transition-compile.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L65)

`<selector> { view-transition-name: <ident>; }`.

***

### pseudoStyles

> `readonly` **pseudoStyles**: `string`

Defined in: [compiler/src/view-transition-compile.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L67)

`::view-transition-old(<name>)` + `::view-transition-new(<name>)` cross-fade rules.

***

### raw

> `readonly` **raw**: `string`

Defined in: [compiler/src/view-transition-compile.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L71)

Full concatenated sheet (non-empty sections joined by a blank line).

***

### viewTransitionName

> `readonly` **viewTransitionName**: `string`

Defined in: [compiler/src/view-transition-compile.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/view-transition-compile.ts#L63)

The sanitized custom-ident used as the `view-transition-name`.
