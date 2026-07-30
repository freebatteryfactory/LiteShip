[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / ViewTransitionCompileInput

# Interface: ViewTransitionCompileInput

Defined in: compiler/dist/view-transition-compile.d.ts:29

Input to [compileViewTransition](../functions/compileViewTransition.md).

## Properties

### boundary

> `readonly` **boundary**: `string`

Defined in: compiler/dist/view-transition-compile.d.ts:31

The boundary/target name (e.g. `'hero'`) — seeds the `view-transition-name` ident.

***

### delayMs?

> `readonly` `optional` **delayMs?**: `number`

Defined in: compiler/dist/view-transition-compile.d.ts:54

Optional stagger / entry delay (ms) applied as `animation-delay` on the pseudos.

***

### durationMs

> `readonly` **durationMs**: `number`

Defined in: compiler/dist/view-transition-compile.d.ts:39

Cross-fade duration (ms) for the old/new pseudo-element animations.

***

### easing

> `readonly` **easing**: `string`

Defined in: compiler/dist/view-transition-compile.d.ts:46

The ALREADY-COMPILED CSS timing-function string to REUSE (e.g. `'ease'`,
`'linear'`, or a spring `'linear(0.0000, …)'`). This is the identical string the
boundary's motion compiled to — the pseudo cross-fade reads one curve with it
(Law 4), never recomputing its own.

***

### mpaNavigation?

> `readonly` `optional` **mpaNavigation?**: `boolean`

Defined in: compiler/dist/view-transition-compile.d.ts:52

Emit the build-time `@view-transition { navigation: auto }` at-rule for MPA
documents (cross-document view transitions). Omit / `false` for SPA, where the
router invokes `document.startViewTransition` and no at-rule is needed.

***

### selector?

> `readonly` `optional` **selector?**: `string`

Defined in: compiler/dist/view-transition-compile.d.ts:37

The element selector the name is assigned to. Defaults to the boundary's data
attribute selector (`[data-liteship-boundary="<boundary>"]`) — the same hook
`MotionCompiler` keys its `liteship-motion-*` animations off.
