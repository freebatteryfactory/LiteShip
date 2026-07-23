/**
 * @liteship/design layer type spine -- tokens, styles, themes, components.
 *
 * Extends the core spine with design primitives that compile to
 * CSS custom properties, @layer, @scope, @property, @container,
 * and Tailwind v4 @theme blocks.
 */

import type { Boundary, StateUnion, ContentAddress, Millis, SignalInput, StateName } from './core.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. BRANDS
// ═══════════════════════════════════════════════════════════════════════════════

declare const TokenRefBrand: unique symbol;
export type TokenRef<N extends string = string> = N & { readonly [TokenRefBrand]: N };

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. CSS TEMPLATE LITERALS
// ═══════════════════════════════════════════════════════════════════════════════

export type CSSCustomProp = `--${string}`;
export type CSSProp = `--liteship-${string}`;
export type CSSLength = `${number}px` | `${number}rem` | `${number}em` | `${number}%` | `${number}vw` | `${number}vh`;
export type CSSTime = `${number}ms` | `${number}s`;

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. TOKEN
// ═══════════════════════════════════════════════════════════════════════════════

export interface Token<N extends string = string, Axes extends readonly string[] = readonly string[]> {
  readonly _tag: 'TokenDef';
  readonly _version: 1;
  readonly id: ContentAddress;
  readonly name: N;
  readonly category: 'color' | 'spacing' | 'typography' | 'shadow' | 'radius' | 'animation' | 'effect';
  readonly axes: Axes;
  readonly values: Record<string, unknown>;
  readonly fallback: unknown;
  readonly cssProperty: CSSCustomProp;
}

/** Define a content-addressed design {@link Token}. */
export declare function defineToken<N extends string>(config: {
  readonly name: N;
  readonly category: Token['category'];
  /** Single-value shorthand — derives `axes: []`, `values: {}`, `fallback: value`. */
  readonly value: unknown;
}): Token<N, readonly []>;
export declare function defineToken<N extends string, const A extends readonly [string, ...string[]] = readonly ['default']>(config: {
  readonly name: N;
  readonly category: Token['category'];
  /** Default: ['default'] — single-value tokens need no axis declaration. */
  readonly axes?: A;
  readonly values: Record<string, unknown>;
  /** Default: derived from values.default when omitted; omitting both is a validation error. */
  readonly fallback?: unknown;
}): Token<N, A>;

export declare namespace Token {
  export function tap<N extends string, Axes extends readonly string[]>(
    token: Token<N, Axes>,
    axes?: Partial<Record<Axes[number], string>>,
  ): string;

  export function cssVar<N extends string, Axes extends readonly string[]>(token: Token<N, Axes>): CSSCustomProp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. STYLE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShadowLayer {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread?: number;
  readonly color: string;
  readonly inset?: boolean;
}

export interface StyleLayer {
  readonly properties: Record<string, string>;
  readonly pseudo?: Record<string, Record<string, string>>;
  readonly boxShadow?: readonly ShadowLayer[];
}

/** `defineStyle` transition input — plain `number` durations are branded with {@link Millis} internally. */
export interface StyleTransitionConfig {
  readonly duration: number;
  readonly easing?: string;
  readonly properties?: readonly string[];
}

export interface Style<B extends Boundary = Boundary> {
  readonly _tag: 'StyleDef';
  readonly _version: 1;
  readonly id: ContentAddress;
  readonly boundary?: B;
  readonly base: StyleLayer;
  readonly states?: { readonly [S in StateUnion<B> & string]?: StyleLayer };
  readonly transition?: {
    readonly duration: Millis;
    readonly easing?: string;
    readonly properties?: readonly string[];
  };
}

/** Define an adaptive {@link Style} bound to optional boundary states. */
export declare function defineStyle<B extends Boundary>(config: {
  readonly boundary?: B;
  readonly base: StyleLayer;
  readonly states?: { readonly [S in StateUnion<B> & string]?: StyleLayer };
  readonly transition?: StyleTransitionConfig;
}): Style<B>;

export declare namespace Style {
  export function tap<B extends Boundary>(style: Style<B>, state?: StateUnion<B>): Record<string, string>;

  export function mergeLayers(...layers: readonly StyleLayer[]): StyleLayer;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. THEME
// ═══════════════════════════════════════════════════════════════════════════════

export interface Theme<V extends readonly string[] = readonly string[]> {
  readonly _tag: 'ThemeDef';
  readonly _version: 1;
  readonly id: ContentAddress;
  readonly name: string;
  readonly variants: V;
  readonly tokens: Record<string, Record<V[number] & string, unknown>>;
  readonly meta?: Record<V[number] & string, { readonly label: string; readonly mode: 'light' | 'dark' }>;
}

/** Define a {@link Theme} mapping token names to variant-keyed values. */
export declare function defineTheme<const V extends readonly [string, ...string[]]>(config: {
  readonly name: string;
  readonly variants: V;
  readonly tokens: Record<string, Record<V[number] & string, unknown>>;
  readonly meta?: Theme<V>['meta'];
}): Theme<V>;

export declare namespace Theme {
  export function tap<V extends readonly string[]>(theme: Theme<V>, variant: V[number]): Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 6. COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SlotConfig {
  /** Default: false. */
  readonly required?: boolean;
  readonly description?: string;
}

export interface Component<B extends Boundary = Boundary, SlotNames extends readonly string[] = readonly string[]> {
  readonly _tag: 'ComponentDef';
  readonly id: ContentAddress;
  readonly name: string;
  readonly boundary?: B;
  readonly styles: Style<B>;
  readonly slots: { readonly [K in SlotNames[number]]: SlotConfig };
  readonly defaultSlot?: SlotNames[number];
}

export declare namespace Component {
  export function make<
    B extends Boundary,
    const SN extends readonly [string, ...string[]] = readonly ['children'],
  >(config: {
    readonly name: string;
    readonly boundary?: B;
    readonly styles: Style<B>;
    /** Default: an implied single 'children' slot with defaultSlot 'children'. */
    readonly slots?: { readonly [K in SN[number]]: SlotConfig };
    readonly defaultSlot?: SN[number];
  }): Component<B, SN>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 7. UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TokensOf<T extends Theme> = keyof T['tokens'];
export type VariantsOf<T extends Theme> = T['variants'][number];
export type SlotsOf<C extends Component> = keyof C['slots'];
