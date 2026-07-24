/**
 * `liteship/compiler` — the curated facade over `@liteship/compiler`: LiteShip's
 * projection targets. Turns boundary definitions and per-bearing values into cast
 * output (CSS, GLSL, WGSL, ARIA, AI manifests, MCP-app manifests, token/theme/style
 * projections, and the motion compilers). Curated named re-exports only — no
 * behavior lives here.
 * @module
 */

export { CSSCompiler, generatePropertyRegistrations } from '@liteship/compiler';
export type {
  CSSRule,
  CSSContainerRule,
  CSSCompileResult,
  CSSStateBody,
  CSSStateInput,
  CSSAtRuleGroup,
} from '@liteship/compiler';

export { GLSLCompiler } from '@liteship/compiler';
export type { GLSLType, GLSLUniform, GLSLDefine, GLSLCompileResult } from '@liteship/compiler';

export { WGSLCompiler } from '@liteship/compiler';
export type {
  WGSLType,
  WGSLBinding,
  WGSLStruct,
  WGSLCompileResult,
  WGSLUniformVector,
  WGSLUniformValue,
} from '@liteship/compiler';

export { ARIACompiler } from '@liteship/compiler';
export type { ARIACompileResult } from '@liteship/compiler';

export { AIManifestCompiler } from '@liteship/compiler';
export type {
  AIManifest,
  AIManifestInput,
  AIDimension,
  AISlot,
  AIAction,
  AIParamSchema,
  AIConstraint,
  AIToolDefinition,
  AIManifestCompileResult,
  AIValidationIssue,
} from '@liteship/compiler';

export { compileMcpAppManifest } from '@liteship/compiler';
export type {
  McpAppManifest,
  CompileMcpAppManifestInput,
  ManifestToolView,
  ManifestResourceView,
  ManifestUiResourceView,
  ManifestPromptView,
} from '@liteship/compiler';

export { dispatch } from '@liteship/compiler';
export type {
  CompileResult,
  CompilerDef,
  CSSStates,
  GLSLStates,
  WGSLStates,
  ARIAStates,
  ConfigTemplateResult,
} from '@liteship/compiler';

export { TokenCSSCompiler } from '@liteship/compiler';
export type { TokenCSSResult } from '@liteship/compiler';

export { TokenTailwindCompiler } from '@liteship/compiler';
export type { TokenTailwindResult } from '@liteship/compiler';

export { TokenJSCompiler } from '@liteship/compiler';
export type { TokenJSResult } from '@liteship/compiler';

export { ThemeCSSCompiler } from '@liteship/compiler';
export type { ThemeCSSResult } from '@liteship/compiler';

export { StyleCSSCompiler } from '@liteship/compiler';
export type { StyleCSSResult } from '@liteship/compiler';

export { ComponentCSSCompiler } from '@liteship/compiler';

export { MotionCompiler } from '@liteship/compiler';
export type {
  MotionCompileInput,
  MotionCompileResult,
  MotionEasing,
  MotionSpringConfig,
  MotionViewTimeline,
  MotionScrollTimeline,
} from '@liteship/compiler';

export { compileReveal } from '@liteship/compiler';
export type { CompiledReveal } from '@liteship/compiler';

export { compileStagger } from '@liteship/compiler';
export type { CompiledStagger, CompiledStaggerItem } from '@liteship/compiler';

export { compileScrollTimeline } from '@liteship/compiler';
export type { CompiledScrollTimeline } from '@liteship/compiler';

export { compileResponsiveMedia } from '@liteship/compiler';
export type { CompiledResponsiveMedia } from '@liteship/compiler';
