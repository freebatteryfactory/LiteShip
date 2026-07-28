[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CompileResult

# Type Alias: CompileResult

> **CompileResult** = \{ `result`: [`CSSCompileResult`](../interfaces/CSSCompileResult.md); `target`: `"css"`; \} \| \{ `result`: [`GLSLCompileResult`](../interfaces/GLSLCompileResult.md); `target`: `"glsl"`; \} \| \{ `result`: [`WGSLCompileResult`](../interfaces/WGSLCompileResult.md); `target`: `"wgsl"`; \} \| \{ `result`: [`ARIACompileResult`](../interfaces/ARIACompileResult.md); `target`: `"aria"`; \} \| \{ `result`: [`AIManifestCompileResult`](../interfaces/AIManifestCompileResult.md); `target`: `"ai"`; \} \| \{ `result`: [`ConfigTemplateResult`](../interfaces/ConfigTemplateResult.md); `target`: `"config"`; \} \| \{ `result`: [`MotionCompileResult`](../interfaces/MotionCompileResult.md); `target`: `"motion"`; \} \| \{ `result`: [`ViewTransitionCompileResult`](../interfaces/ViewTransitionCompileResult.md); `target`: `"view-transition"`; \}

Defined in: [\_spine/compiler.d.ts:445](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L445)

Closed union returned by the compiler dispatcher for every target.
