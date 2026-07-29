[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / liteship/src/compiler

# liteship/src/compiler

`liteship/compiler` — the curated facade over `@liteship/compiler`: LiteShip's
projection targets. Turns boundary definitions and per-bearing values into cast
output (CSS, GLSL, WGSL, ARIA, AI manifests, MCP-app manifests, token/theme/style
projections, and the motion compilers). Curated named re-exports only — no
behavior lives here.

## Interfaces

- [AIAction](interfaces/AIAction.md)
- [AIConstraint](interfaces/AIConstraint.md)
- [AIDimension](interfaces/AIDimension.md)
- [AIManifest](interfaces/AIManifest.md)
- [AIManifestCompileResult](interfaces/AIManifestCompileResult.md)
- [AIManifestInput](interfaces/AIManifestInput.md)
- [AIParamSchema](interfaces/AIParamSchema.md)
- [AISlot](interfaces/AISlot.md)
- [AIToolDefinition](interfaces/AIToolDefinition.md)
- [AIValidationIssue](interfaces/AIValidationIssue.md)
- [ARIACompileResult](interfaces/ARIACompileResult.md)
- [ARIAStates](interfaces/ARIAStates.md)
- [CompiledResponsiveMedia](interfaces/CompiledResponsiveMedia.md)
- [CompiledReveal](interfaces/CompiledReveal.md)
- [CompiledScrollTimeline](interfaces/CompiledScrollTimeline.md)
- [CompiledStagger](interfaces/CompiledStagger.md)
- [CompiledStaggerItem](interfaces/CompiledStaggerItem.md)
- [CompileMcpAppManifestInput](interfaces/CompileMcpAppManifestInput.md)
- [ConfigTemplateResult](interfaces/ConfigTemplateResult.md)
- [CSSAtRuleGroup](interfaces/CSSAtRuleGroup.md)
- [CSSCompileResult](interfaces/CSSCompileResult.md)
- [CSSContainerRule](interfaces/CSSContainerRule.md)
- [CSSRule](interfaces/CSSRule.md)
- [CSSStateBody](interfaces/CSSStateBody.md)
- [GLSLCompileResult](interfaces/GLSLCompileResult.md)
- [GLSLDefine](interfaces/GLSLDefine.md)
- [GLSLUniform](interfaces/GLSLUniform.md)
- [ManifestPromptView](interfaces/ManifestPromptView.md)
- [ManifestResourceView](interfaces/ManifestResourceView.md)
- [ManifestToolView](interfaces/ManifestToolView.md)
- [ManifestUiResourceView](interfaces/ManifestUiResourceView.md)
- [McpAppManifest](interfaces/McpAppManifest.md)
- [MotionCompileInput](interfaces/MotionCompileInput.md)
- [MotionCompileResult](interfaces/MotionCompileResult.md)
- [MotionScrollTimeline](interfaces/MotionScrollTimeline.md)
- [MotionSpringConfig](interfaces/MotionSpringConfig.md)
- [MotionSupportMetadata](interfaces/MotionSupportMetadata.md)
- [MotionTransitionFallbackSupport](interfaces/MotionTransitionFallbackSupport.md)
- [MotionViewTimeline](interfaces/MotionViewTimeline.md)
- [StyleCSSResult](interfaces/StyleCSSResult.md)
- [ThemeCSSResult](interfaces/ThemeCSSResult.md)
- [TokenCSSResult](interfaces/TokenCSSResult.md)
- [TokenJSResult](interfaces/TokenJSResult.md)
- [TokenTailwindResult](interfaces/TokenTailwindResult.md)
- [ViewTransitionCompileInput](interfaces/ViewTransitionCompileInput.md)
- [ViewTransitionCompileResult](interfaces/ViewTransitionCompileResult.md)
- [WGSLBinding](interfaces/WGSLBinding.md)
- [WGSLCompileResult](interfaces/WGSLCompileResult.md)
- [WGSLStruct](interfaces/WGSLStruct.md)

## Type Aliases

- [CompilerDef](type-aliases/CompilerDef.md)
- [CompileResult](type-aliases/CompileResult.md)
- [CSSStateInput](type-aliases/CSSStateInput.md)
- [CSSStates](type-aliases/CSSStates.md)
- [GLSLStates](type-aliases/GLSLStates.md)
- [GLSLType](type-aliases/GLSLType.md)
- [MotionEasing](type-aliases/MotionEasing.md)
- [WGSLBindingType](type-aliases/WGSLBindingType.md)
- [WGSLStates](type-aliases/WGSLStates.md)
- [WGSLType](type-aliases/WGSLType.md)
- [WGSLUniformValue](type-aliases/WGSLUniformValue.md)
- [WGSLUniformVector](type-aliases/WGSLUniformVector.md)

## Variables

- [AIManifestCompiler](variables/AIManifestCompiler.md)
- [ARIACompiler](variables/ARIACompiler.md)
- [ComponentCSSCompiler](variables/ComponentCSSCompiler.md)
- [CSSCompiler](variables/CSSCompiler.md)
- [GLSLCompiler](variables/GLSLCompiler.md)
- [MotionCompiler](variables/MotionCompiler.md)
- [StyleCSSCompiler](variables/StyleCSSCompiler.md)
- [ThemeCSSCompiler](variables/ThemeCSSCompiler.md)
- [TokenCSSCompiler](variables/TokenCSSCompiler.md)
- [TokenJSCompiler](variables/TokenJSCompiler.md)
- [TokenTailwindCompiler](variables/TokenTailwindCompiler.md)
- [WGSLCompiler](variables/WGSLCompiler.md)

## Functions

- [compileMcpAppManifest](functions/compileMcpAppManifest.md)
- [compileResponsiveMedia](functions/compileResponsiveMedia.md)
- [compileReveal](functions/compileReveal.md)
- [compileScrollTimeline](functions/compileScrollTimeline.md)
- [compileStagger](functions/compileStagger.md)
- [compileViewTransition](functions/compileViewTransition.md)
- [dispatch](functions/dispatch.md)
- [generatePropertyRegistrations](functions/generatePropertyRegistrations.md)
