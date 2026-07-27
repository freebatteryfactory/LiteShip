[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CompilerDef

# Type Alias: CompilerDef

> **CompilerDef** = \{ `_tag`: `"CSSCompiler"`; `boundary`: [`Boundary`](../interfaces/Boundary.md); `selector?`: `string`; `states`: [`CSSStates`](CSSStates.md); \} \| \{ `_tag`: `"GLSLCompiler"`; `boundary`: [`Boundary`](../interfaces/Boundary.md); `states`: [`GLSLStates`](GLSLStates.md); \} \| \{ `_tag`: `"WGSLCompiler"`; `boundary`: [`Boundary`](../interfaces/Boundary.md); `states`: [`WGSLStates`](WGSLStates.md); \} \| \{ `_tag`: `"ARIACompiler"`; `boundary`: [`Boundary`](../interfaces/Boundary.md); `states`: [`ARIAStates`](../interfaces/ARIAStates.md); \} \| \{ `_tag`: `"AICompiler"`; `manifest`: [`AIManifestInput`](../interfaces/AIManifestInput.md); \} \| \{ `_tag`: `"ConfigCompiler"`; `config`: [`Config`](../interfaces/Config.md); \}

Defined in: [\_spine/compiler.d.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L310)

Closed union of definition projections accepted by the compiler dispatcher.
