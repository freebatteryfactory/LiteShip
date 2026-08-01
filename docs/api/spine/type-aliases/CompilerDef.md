[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / CompilerDef

# Type Alias: CompilerDef

> **CompilerDef** = \{ `_tag`: `"CSSCompiler"`; `boundary`: [`Boundary`](../interfaces/Boundary.md); `selector?`: `string`; `states`: [`CSSStates`](CSSStates.md); \} \| \{ `_tag`: `"GLSLCompiler"`; `boundary`: [`Boundary`](../interfaces/Boundary.md); `states`: [`GLSLStates`](GLSLStates.md); \} \| \{ `_tag`: `"WGSLCompiler"`; `boundary`: [`Boundary`](../interfaces/Boundary.md); `states`: [`WGSLStates`](WGSLStates.md); \} \| \{ `_tag`: `"ARIACompiler"`; `boundary`: [`Boundary`](../interfaces/Boundary.md); `states`: [`ARIAStates`](../interfaces/ARIAStates.md); \} \| \{ `_tag`: `"AICompiler"`; `manifest`: [`AIManifestInput`](../interfaces/AIManifestInput.md); \} \| \{ `_tag`: `"ConfigCompiler"`; `config`: [`Config`](../interfaces/Config.md); \} \| \{ `_tag`: `"MotionCompiler"`; `input`: [`MotionCompileInput`](../interfaces/MotionCompileInput.md); \} \| \{ `_tag`: `"ViewTransitionCompiler"`; `input`: [`ViewTransitionCompileInput`](../interfaces/ViewTransitionCompileInput.md); \}

Defined in: [\_spine/compiler.d.ts:434](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L434)

Closed union of definition projections accepted by the compiler dispatcher.
