/**
 * @liteship/compiler type spine -- multi-target output generation.
 */

import type { Boundary, StateUnion, ContentAddress } from './core.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. CSS COMPILER (Boundary -> @container rules via lightningcss)
// ═══════════════════════════════════════════════════════════════════════════════

/** One container-scoped CSS rule emitted by the low-level style compiler. */
export interface CSSContainerRule {
  readonly name: string;
  readonly query: string;
  readonly rules: readonly CSSRule[];
}

/** One selector/declaration pair emitted by a CSS compiler. */
export interface CSSRule {
  readonly selector: string;
  readonly properties: Record<string, string>;
}

/** Structured declarations for a state, including optional pseudo selectors. */
export interface CSSStateBody {
  readonly bareProps?: Record<string, string>;
  readonly rules?: readonly CSSRule[];
}

/** Shorthand or structured authored CSS declarations for one state. */
export type CSSStateInput = Record<string, string> | CSSStateBody;

/** Deterministic stylesheet projection and its structured rule inventory. */
export interface CSSCompileResult {
  readonly containerRules: readonly CSSContainerRule[];
  readonly raw: string;
}

export declare const CSSCompiler: {
  compile<B extends Boundary>(
    boundary: B,
    states: { [S in StateUnion<B> & string]: CSSStateInput },
    selector?: string,
  ): CSSCompileResult;

  serialize(result: CSSCompileResult): string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. GLSL COMPILER (uniform declarations + bindUniforms)
// ═══════════════════════════════════════════════════════════════════════════════

/** GLSL uniform types supported by LiteShip's shader projection. */
export type GLSLType =
  | 'float'
  | 'int'
  | 'uint'
  | 'bool'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'ivec2'
  | 'ivec3'
  | 'ivec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'sampler2D'
  | 'samplerCube';

/** One named GLSL uniform declaration and its authored default. */
export interface GLSLUniform {
  readonly name: string;
  readonly type: GLSLType;
  readonly comment?: string;
}

/** One preprocessor define emitted into a GLSL program. */
export interface GLSLDefine {
  readonly name: string;
  readonly value: string;
  readonly comment?: string;
}

/** GLSL source plus the uniforms and defines required to drive it. */
export interface GLSLCompileResult {
  readonly defines: readonly GLSLDefine[];
  readonly uniforms: readonly GLSLUniform[];
  readonly uniformValues: Record<string, number>;
  readonly declarations: string;
  readonly bindUniforms: string;
}

export declare const GLSLCompiler: {
  compile<B extends Boundary>(
    boundary: B,
    states: { [S in StateUnion<B> & string]: Record<string, number> },
  ): GLSLCompileResult;

  serialize(result: GLSLCompileResult): string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. WGSL COMPILER (struct definitions + binding)
// ═══════════════════════════════════════════════════════════════════════════════

/** WGSL scalar and vector types supported by LiteShip's shader projection. */
export type WGSLType =
  | 'f32'
  | 'i32'
  | 'u32'
  | 'bool'
  | 'vec2f'
  | 'vec3f'
  | 'vec4f'
  | 'vec2i'
  | 'vec3i'
  | 'vec4i'
  | 'mat2x2f'
  | 'mat3x3f'
  | 'mat4x4f';

/** One WGSL resource binding in a declared bind group. */
export interface WGSLBinding {
  readonly group: number;
  readonly binding: number;
  readonly name: string;
  readonly type: WGSLType;
}

/** Fixed-width numeric tuple accepted as a WGSL uniform vector. */
export type WGSLUniformVector =
  readonly [number, number] | readonly [number, number, number] | readonly [number, number, number, number];

/** Runtime value accepted by a generated WGSL uniform. */
export type WGSLUniformValue = number | WGSLUniformVector;

/** Named WGSL structure and its ordered field declarations. */
export interface WGSLStruct {
  readonly name: string;
  readonly fields: readonly { readonly name: string; readonly type: WGSLType }[];
}

/** WGSL source plus its bindings, uniforms, and generated structures. */
export interface WGSLCompileResult {
  readonly structs: readonly WGSLStruct[];
  readonly bindings: readonly WGSLBinding[];
  readonly bindingValues: Record<string, WGSLUniformValue>;
  readonly stateBindings: Record<string, Record<string, WGSLUniformValue>>;
  readonly declarations: string;
}

export declare const WGSLCompiler: {
  compile<B extends Boundary>(
    boundary: B,
    states: { [S in StateUnion<B> & string]: Record<string, WGSLUniformValue> },
  ): WGSLCompileResult;

  serialize(result: WGSLCompileResult): string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. ARIA COMPILER (attribute strings from boundary metadata)
// ═══════════════════════════════════════════════════════════════════════════════

/** Accessibility attributes and announcements projected per adaptive state. */
export interface ARIACompileResult<S extends string = string> {
  readonly stateAttributes: Record<S, Record<string, string>>;
  readonly currentAttributes: Record<string, string>;
}

export declare const ARIACompiler: {
  compile<B extends Boundary>(
    boundary: B,
    states: { [S in StateUnion<B> & string]: Record<string, string> },
    currentState: StateUnion<B>,
  ): ARIACompileResult<StateUnion<B> & string>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. AI MANIFEST COMPILER (tool definitions + grammar validation)
// ═══════════════════════════════════════════════════════════════════════════════

/** Agent-facing manifest projected from one adaptive definition. */
export interface AIManifest {
  readonly version: string;
  readonly dimensions: Record<string, AIDimension>;
  readonly slots: Record<string, AISlot>;
  readonly actions: Record<string, AIAction>;
  readonly constraints: readonly AIConstraint[];
}

/** Authoring-time manifest input; omitted fields default (version '1.0', empty records, no constraints). */
export interface AIManifestInput {
  readonly version?: string;
  readonly dimensions?: Record<string, AIDimension>;
  readonly slots?: Record<string, AISlot>;
  readonly actions?: Record<string, AIAction>;
  readonly constraints?: readonly AIConstraint[];
}

/** One state dimension described to an agent. */
export interface AIDimension {
  readonly states: readonly string[];
  readonly current: string;
  readonly exclusive: boolean;
  readonly description: string;
}

/** One named content slot available to an agent-authored composition. */
export interface AISlot {
  readonly accepts: readonly string[];
  readonly description: string;
}

/** One action an agent may propose through the manifest. */
export interface AIAction {
  readonly params: Record<string, AIParamSchema>;
  readonly effects: readonly string[];
  readonly description: string;
}

/** Restricted parameter schema used by agent action declarations. */
export interface AIParamSchema {
  readonly type: string;
  readonly enum?: readonly string[];
  readonly min?: number;
  readonly max?: number;
  /** Defaults to `false` (JSON Schema convention). */
  readonly required?: boolean;
  readonly description: string;
}

/** Machine-readable constraint attached to an AI manifest. */
export interface AIConstraint {
  readonly id: string;
  readonly condition: unknown;
  readonly message: string;
}

/** Tool definition synthesized from an agent-visible action. */
export interface AIToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly returns: Record<string, unknown>;
}

/** AI manifest projection together with its generated tool definitions. */
export interface AIManifestCompileResult {
  readonly manifest: AIManifest;
  readonly toolDefinitions: readonly AIToolDefinition[];
  readonly jsonSchema: Record<string, unknown>;
  readonly systemPrompt: string;
}

/**
 * Structured validation failure for AI-generated output — the teach-by-data
 * shape consumed by LLM re-prompting loops. `message` is the prose form
 * surfaced through the parallel `errors` array.
 */
export interface AIValidationIssue {
  /** Dot path into the output, e.g. 'params.cols' or 'dimensions.layout'. */
  readonly path: string;
  /** What the manifest expects at that path. */
  readonly expected: string;
  /** What the output actually carried. */
  readonly received: string;
  /** Literal next step to repair the output. */
  readonly hint: string;
  /** Prose form — identical to the corresponding `errors` entry. */
  readonly message: string;
}

export declare const AIManifestCompiler: {
  compile(input: AIManifestInput): AIManifestCompileResult;
  validateAIOutput(
    output: unknown,
    input: AIManifestInput,
  ): { valid: boolean; errors: readonly string[]; issues: readonly AIValidationIssue[] };
  generateSystemPrompt(input: AIManifestInput): string;
  generateToolDefinitions(input: AIManifestInput): readonly AIToolDefinition[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 6. DISPATCH — tagged CompilerDef discriminated union
// ═══════════════════════════════════════════════════════════════════════════════

import type { Config } from './config.js';

/** State-indexed CSS property tables accepted by compiler dispatch. */
export type CSSStates = Readonly<Record<string, Readonly<Record<string, string>>>>;
/** State-indexed GLSL numeric uniform tables accepted by compiler dispatch. */
export type GLSLStates = Readonly<Record<string, Readonly<Record<string, number>>>>;
/** State-indexed WGSL uniform tables accepted by compiler dispatch. */
export type WGSLStates = Readonly<Record<string, Readonly<Record<string, WGSLUniformValue>>>>;
/** State-indexed accessibility output accepted by compiler dispatch. */
export interface ARIAStates {
  readonly states: Record<string, Record<string, string>>;
  /** Defaults to the boundary's first state. */
  readonly currentState?: string;
}

/** Generated host-configuration template and its destination filename. */
export interface ConfigTemplateResult {
  readonly json: string;
}

/** Closed union of definition projections accepted by the compiler dispatcher. */
export type CompilerDef =
  | {
      readonly _tag: 'CSSCompiler';
      readonly boundary: Boundary;
      readonly states: CSSStates;
      readonly selector?: string;
    }
  | { readonly _tag: 'GLSLCompiler'; readonly boundary: Boundary; readonly states: GLSLStates }
  | { readonly _tag: 'WGSLCompiler'; readonly boundary: Boundary; readonly states: WGSLStates }
  | { readonly _tag: 'ARIACompiler'; readonly boundary: Boundary; readonly states: ARIAStates }
  | { readonly _tag: 'AICompiler'; readonly manifest: AIManifestInput }
  | { readonly _tag: 'ConfigCompiler'; readonly config: Config };

/** Closed union returned by the compiler dispatcher for every target. */
export type CompileResult =
  | { readonly target: 'css'; readonly result: CSSCompileResult }
  | { readonly target: 'glsl'; readonly result: GLSLCompileResult }
  | { readonly target: 'wgsl'; readonly result: WGSLCompileResult }
  | { readonly target: 'aria'; readonly result: ARIACompileResult }
  | { readonly target: 'ai'; readonly result: AIManifestCompileResult }
  | { readonly target: 'config'; readonly result: ConfigTemplateResult };

export declare function dispatch(def: CompilerDef): CompileResult;

// ═══════════════════════════════════════════════════════════════════════════════
// § 7. DESIGN LAYER COMPILER TARGETS
// ═══════════════════════════════════════════════════════════════════════════════

import type { Token, Style, Theme, Component } from './design.js';

/** Definition kinds accepted by the component-level compiler projections. */
export type DefKind = 'boundary' | 'token' | 'style' | 'theme' | 'component';

/** CSS custom-property projection of a token definition. */
export interface TokenCSSResult {
  readonly properties: readonly string[];
  readonly customProperties: string;
  readonly themed: string;
}

/** Tailwind theme extension projected from a token definition. */
export interface TokenTailwindResult {
  readonly themeBlock: string;
}

/** JavaScript-friendly data projection of a token definition. */
export interface TokenJSResult {
  readonly code: string;
  readonly typeDeclaration: string;
}

/** CSS projection of a theme and its named variants. */
export interface ThemeCSSResult {
  readonly selectors: string;
  readonly transitions: string;
}

/** CSS projection of one adaptive style definition. */
export interface StyleCSSResult {
  readonly scoped: string;
  readonly layers: string;
  readonly startingStyle: string;
}

export declare const TokenCSSCompiler: {
  compile(token: Token, theme?: Theme): TokenCSSResult;
};

export declare const TokenTailwindCompiler: {
  compile(tokens: readonly Token[]): TokenTailwindResult;
};

export declare const TokenJSCompiler: {
  compile(tokens: readonly Token[]): TokenJSResult;
};

export declare const ThemeCSSCompiler: {
  compile(theme: Theme): ThemeCSSResult;
};

export declare const StyleCSSCompiler: {
  compile(style: Style, componentName?: string): StyleCSSResult;
  compileAdaptive(style: Style): string;
};

export declare const ComponentCSSCompiler: {
  compile(component: Component): StyleCSSResult;
};
