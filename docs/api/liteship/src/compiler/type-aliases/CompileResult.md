[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / CompileResult

# Type Alias: CompileResult

> **CompileResult** = \{ `result`: [`CSSCompileResult`](../interfaces/CSSCompileResult.md); `target`: `"css"`; \} \| \{ `result`: [`GLSLCompileResult`](../interfaces/GLSLCompileResult.md); `target`: `"glsl"`; \} \| \{ `result`: [`WGSLCompileResult`](../interfaces/WGSLCompileResult.md); `target`: `"wgsl"`; \} \| \{ `result`: [`ARIACompileResult`](../interfaces/ARIACompileResult.md); `target`: `"aria"`; \} \| \{ `result`: [`AIManifestCompileResult`](../interfaces/AIManifestCompileResult.md); `target`: `"ai"`; \} \| \{ `result`: [`ConfigTemplateResult`](../interfaces/ConfigTemplateResult.md); `target`: `"config"`; \} \| \{ `result`: [`MotionCompileResult`](../interfaces/MotionCompileResult.md); `target`: `"motion"`; \}

Defined in: compiler/dist/dispatch.d.ts:95

Tagged compile output returned by [dispatch](../functions/dispatch.md).

`target` discriminates the `result` payload so callers can narrow without
casts. The mapping is 1:1 with the arms of [CompilerDef](CompilerDef.md).
