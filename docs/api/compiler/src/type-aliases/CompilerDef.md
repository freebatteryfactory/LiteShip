[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / CompilerDef

# Type Alias: CompilerDef

> **CompilerDef** = \{ `_tag`: `"CSSCompiler"`; `boundary`: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md); `selector?`: `string`; `states`: [`CSSStates`](CSSStates.md); \} \| \{ `_tag`: `"GLSLCompiler"`; `boundary`: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md); `states`: [`GLSLStates`](GLSLStates.md); \} \| \{ `_tag`: `"WGSLCompiler"`; `boundary`: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md); `states`: [`WGSLStates`](WGSLStates.md); \} \| \{ `_tag`: `"ARIACompiler"`; `boundary`: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md); `states`: [`ARIAStates`](../interfaces/ARIAStates.md); \} \| \{ `_tag`: `"AICompiler"`; `manifest`: [`AIManifestInput`](../interfaces/AIManifestInput.md); \} \| \{ `_tag`: `"ConfigCompiler"`; `config`: [`Config`](../../../liteship/src/type-aliases/Config.md); \} \| \{ `_tag`: `"MotionCompiler"`; `input`: [`MotionCompileInput`](../interfaces/MotionCompileInput.md); \} \| \{ `_tag`: `"ViewTransitionCompiler"`; `input`: [`ViewTransitionCompileInput`](../interfaces/ViewTransitionCompileInput.md); \}

Defined in: [compiler/src/dispatch.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/dispatch.ts#L94)

Tagged discriminated union describing a single compilation request.

Every arm carries exactly the inputs its target needs; [dispatch](../functions/dispatch.md)
switches on `_tag` and closes with an `assertNever` guard, so TypeScript
guarantees exhaustiveness and no runtime `unknown`/`as` casts are required.

Arms:
- `CSSCompiler`    — boundary + per-state CSS property maps → `@container` rules.
                     Bare properties target `selector` (default `.liteship-boundary`).
- `GLSLCompiler`   — boundary + per-state numeric uniforms → GLSL uniform block.
- `WGSLCompiler`   — boundary + per-state scalar/vector uniforms → WGSL bindings.
- `ARIACompiler`   — boundary + per-state attribute maps + active state → ARIA attributes.
- `AICompiler`     — an [AIManifestInput](../interfaces/AIManifestInput.md) → tool-call-ready manifest JSON.
- `ConfigCompiler` — a `Config` → pretty-printed JSON template.
- `MotionCompiler`  — a `CssMotionPlan` → `@property` / `@keyframes` / transitions.
- `ViewTransitionCompiler` — an explicit view-transition request → scoped progressive-enhancement CSS.

## Union Members

### Type Literal

\{ `_tag`: `"CSSCompiler"`; `boundary`: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md); `selector?`: `string`; `states`: [`CSSStates`](CSSStates.md); \}

#### \_tag

> `readonly` **\_tag**: `"CSSCompiler"`

#### boundary

> `readonly` **boundary**: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md)

#### selector?

> `readonly` `optional` **selector?**: `string`

CSS selector for bare properties; defaults to `.liteship-boundary`.

#### states

> `readonly` **states**: [`CSSStates`](CSSStates.md)

***

### Type Literal

\{ `_tag`: `"GLSLCompiler"`; `boundary`: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md); `states`: [`GLSLStates`](GLSLStates.md); \}

***

### Type Literal

\{ `_tag`: `"WGSLCompiler"`; `boundary`: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md); `states`: [`WGSLStates`](WGSLStates.md); \}

***

### Type Literal

\{ `_tag`: `"ARIACompiler"`; `boundary`: [`Boundary`](../../../liteship/src/type-aliases/Boundary.md); `states`: [`ARIAStates`](../interfaces/ARIAStates.md); \}

***

### Type Literal

\{ `_tag`: `"AICompiler"`; `manifest`: [`AIManifestInput`](../interfaces/AIManifestInput.md); \}

***

### Type Literal

\{ `_tag`: `"ConfigCompiler"`; `config`: [`Config`](../../../liteship/src/type-aliases/Config.md); \}

***

### Type Literal

\{ `_tag`: `"MotionCompiler"`; `input`: [`MotionCompileInput`](../interfaces/MotionCompileInput.md); \}

***

### Type Literal

\{ `_tag`: `"ViewTransitionCompiler"`; `input`: [`ViewTransitionCompileInput`](../interfaces/ViewTransitionCompileInput.md); \}
