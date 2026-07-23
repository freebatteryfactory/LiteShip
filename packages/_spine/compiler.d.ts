/**
 * @liteship/compiler type spine -- multi-target output generation.
 */

import type { Boundary, StateUnion, ContentAddress } from './core.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. CSS COMPILER (Boundary -> @container rules via lightningcss)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CSSContainerRule {
  readonly name: string;
  readonly query: string;
  readonly rules: readonly CSSRule[];
}

export interface CSSRule {
  readonly selector: string;
  readonly properties: Record<string, string>;
}

export interface CSSStateBody {
  readonly bareProps?: Record<string, string>;
  readonly rules?: readonly CSSRule[];
}

export type CSSStateInput = Record<string, string> | CSSStateBody;

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

export interface GLSLUniform {
  readonly name: string;
  readonly type: GLSLType;
  readonly comment?: string;
}

export interface GLSLDefine {
  readonly name: string;
  readonly value: string;
  readonly comment?: string;
}

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

export interface WGSLBinding {
  readonly group: number;
  readonly binding: number;
  readonly name: string;
  readonly type: WGSLType;
}

export type WGSLUniformVector =
  readonly [number, number] | readonly [number, number, number] | readonly [number, number, number, number];

export type WGSLUniformValue = number | WGSLUniformVector;

export interface WGSLStruct {
  readonly name: string;
  readonly fields: readonly { readonly name: string; readonly type: WGSLType }[];
}

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

export interface AIDimension {
  readonly states: readonly string[];
  readonly current: string;
  readonly exclusive: boolean;
  readonly description: string;
}

export interface AISlot {
  readonly accepts: readonly string[];
  readonly description: string;
}

export interface AIAction {
  readonly params: Record<string, AIParamSchema>;
  readonly effects: readonly string[];
  readonly description: string;
}

export interface AIParamSchema {
  readonly type: string;
  readonly enum?: readonly string[];
  readonly min?: number;
  readonly max?: number;
  /** Defaults to `false` (JSON Schema convention). */
  readonly required?: boolean;
  readonly description: string;
}

export interface AIConstraint {
  readonly id: string;
  readonly condition: unknown;
  readonly message: string;
}

export interface AIToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly returns: Record<string, unknown>;
}

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

export type CSSStates = Readonly<Record<string, Readonly<Record<string, string>>>>;
export type GLSLStates = Readonly<Record<string, Readonly<Record<string, number>>>>;
export type WGSLStates = Readonly<Record<string, Readonly<Record<string, WGSLUniformValue>>>>;
export interface ARIAStates {
  readonly states: Record<string, Record<string, string>>;
  /** Defaults to the boundary's first state. */
  readonly currentState?: string;
}

export interface ConfigTemplateResult {
  readonly json: string;
}

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

export type DefKind = 'boundary' | 'token' | 'style' | 'theme' | 'component';

export interface TokenCSSResult {
  readonly properties: readonly string[];
  readonly customProperties: string;
  readonly themed: string;
}

export interface TokenTailwindResult {
  readonly themeBlock: string;
}

export interface TokenJSResult {
  readonly code: string;
  readonly typeDeclaration: string;
}

export interface ThemeCSSResult {
  readonly selectors: string;
  readonly transitions: string;
}

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
