[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / ViewTransitionCompileResult

# Interface: ViewTransitionCompileResult

Defined in: compiler/dist/view-transition-compile.d.ts:57

CSS artifacts emitted by [compileViewTransition](../functions/compileViewTransition.md).

## Properties

### atRule

> `readonly` **atRule**: `string`

Defined in: compiler/dist/view-transition-compile.d.ts:65

`@view-transition { navigation: auto; }` for MPA; empty for the SPA default.

***

### nameAssignment

> `readonly` **nameAssignment**: `string`

Defined in: compiler/dist/view-transition-compile.d.ts:61

`<selector> { view-transition-name: <ident>; }`.

***

### pseudoStyles

> `readonly` **pseudoStyles**: `string`

Defined in: compiler/dist/view-transition-compile.d.ts:63

`::view-transition-old(<name>)` + `::view-transition-new(<name>)` cross-fade rules.

***

### raw

> `readonly` **raw**: `string`

Defined in: compiler/dist/view-transition-compile.d.ts:67

Full concatenated sheet (non-empty sections joined by a blank line).

***

### viewTransitionName

> `readonly` **viewTransitionName**: `string`

Defined in: compiler/dist/view-transition-compile.d.ts:59

The readable, content-address-suffixed custom-ident used as the `view-transition-name`.
