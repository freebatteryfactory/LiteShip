/**
 * `@czap/compiler` — **CZAP** projection targets: turns boundary definitions
 * and per-bearing values into **cast** output (CSS, GLSL, WGSL, ARIA, AI, …).
 *
 * @module
 */

export { CSSCompiler, generatePropertyRegistrations } from './css.js';
export type {
  CSSRule,
  CSSContainerRule,
  CSSCompileResult,
  CSSStateBody,
  CSSStateInput,
  CSSAtRuleGroup,
} from './css.js';

export { GLSLCompiler } from './glsl.js';
export type { GLSLType, GLSLUniform, GLSLDefine, GLSLCompileResult } from './glsl.js';

export { WGSLCompiler } from './wgsl.js';
export type {
  WGSLType,
  WGSLBinding,
  WGSLStruct,
  WGSLCompileResult,
  WGSLUniformVector,
  WGSLUniformValue,
} from './wgsl.js';

export { ARIACompiler } from './aria.js';
export type { ARIACompileResult } from './aria.js';

export { AIManifestCompiler } from './ai-manifest.js';
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
} from './ai-manifest.js';

// CUT D6: pure MCP-app manifest projection over the real MCP/MCP-Apps surfaces.
export { compileMcpAppManifest } from './mcp-app-manifest.js';
export type {
  McpAppManifest,
  CompileMcpAppManifestInput,
  ManifestToolView,
  ManifestResourceView,
  ManifestUiResourceView,
  ManifestPromptView,
} from './mcp-app-manifest.js';

export { dispatch } from './dispatch.js';
export type {
  CompileResult,
  CompilerDef,
  CSSStates,
  GLSLStates,
  WGSLStates,
  ARIAStates,
  ConfigTemplateResult,
} from './dispatch.js';

export { TokenCSSCompiler } from './token-css.js';
export type { TokenCSSResult } from './token-css.js';

export { TokenTailwindCompiler } from './token-tailwind.js';
export type { TokenTailwindResult } from './token-tailwind.js';

export { TokenJSCompiler } from './token-js.js';
export type { TokenJSResult } from './token-js.js';

export { ThemeCSSCompiler } from './theme-css.js';
export type { ThemeCSSResult } from './theme-css.js';

export { StyleCSSCompiler } from './style-css.js';
export type { StyleCSSResult } from './style-css.js';

export { ComponentCSSCompiler } from './component-css.js';

export { MotionCompiler } from './motion.js';
export type {
  MotionCompileInput,
  MotionCompileResult,
  MotionEasing,
  MotionSpringConfig,
  MotionViewTimeline,
  MotionScrollTimeline,
} from './motion.js';

export { compileReveal } from './reveal-compile.js';
export type { CompiledReveal } from './reveal-compile.js';

export { compileStagger } from './stagger-compile.js';
export type { CompiledStagger, CompiledStaggerItem } from './stagger-compile.js';

export { compileScrollTimeline } from './scroll-timeline-compile.js';
export type { CompiledScrollTimeline } from './scroll-timeline-compile.js';

export { compileResponsiveMedia } from './responsive-media-compile.js';
export type { CompiledResponsiveMedia } from './responsive-media-compile.js';

// ── Capsule declarations — cast-compiler hardening (property + bench + budget) ──
// Concrete `pureTransform` instances of the 7-arm capsule factory, exported here
// so they register in the live `getCapsuleCatalog()` and the type-directed
// capsule detector (`scripts/lib/capsule-detector.ts`) walks them from
// `@czap/compiler`'s source root. Each pins the GLSL / WGSL / ARIA compiler's
// LAWS over a seeded Boundary + per-state value domain.
export { glslCompileCapsule } from './capsules/glsl-compile.js';
export { wgslCompileCapsule } from './capsules/wgsl-compile.js';
export { ariaCompileCapsule } from './capsules/aria-compile.js';
