/**
 * @liteship/design layer type spine -- tokens, styles, themes, components.
 *
 * Extends the core spine with design primitives that compile to
 * CSS custom properties, @layer, @scope, @property, @container,
 * and Tailwind v4 @theme blocks.
 */

import type { Boundary, StateUnion, ContentAddress, Millis, SignalInput, StateName } from './core.d.ts';

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

export declare namespace Token {
  export interface Shape<N extends string = string, Axes extends readonly string[] = readonly string[]> {
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

  export function make<N extends string>(config: {
    readonly name: N;
    readonly category: Shape['category'];
    /** Single-value shorthand — derives `axes: []`, `values: {}`, `fallback: value`. */
    readonly value: unknown;
  }): Shape<N, readonly []>;

  export function make<N extends string, const A extends readonly [string, ...string[]] = readonly ['default']>(config: {
    readonly name: N;
    readonly category: Shape['category'];
    /** Default: ['default'] — single-value tokens need no axis declaration. */
    readonly axes?: A;
    readonly values: Record<string, unknown>;
    /** Default: derived from values.default when omitted; omitting both is a validation error. */
    readonly fallback?: unknown;
  }): Shape<N, A>;

  export function tap<N extends string, Axes extends readonly string[]>(
    token: Shape<N, Axes>,
    axes?: Partial<Record<Axes[number], string>>,
  ): string;

  export function cssVar<N extends string, Axes extends readonly string[]>(token: Shape<N, Axes>): CSSCustomProp;
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

/** `Style.make` transition input — plain `number` durations are branded with {@link Millis} internally. */
export interface TransitionConfig {
  readonly duration: number;
  readonly easing?: string;
  readonly properties?: readonly string[];
}

export declare namespace Style {
  export interface Shape<B extends Boundary.Shape = Boundary.Shape> {
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

  export function make<B extends Boundary.Shape>(config: {
    readonly boundary?: B;
    readonly base: StyleLayer;
    readonly states?: { readonly [S in StateUnion<B> & string]?: StyleLayer };
    readonly transition?: TransitionConfig;
  }): Shape<B>;

  export function tap<B extends Boundary.Shape>(style: Shape<B>, state?: StateUnion<B>): Record<string, string>;

  export function mergeLayers(...layers: readonly StyleLayer[]): StyleLayer;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. THEME
// ═══════════════════════════════════════════════════════════════════════════════

export declare namespace Theme {
  export interface Shape<V extends readonly string[] = readonly string[]> {
    readonly _tag: 'ThemeDef';
    readonly _version: 1;
    readonly id: ContentAddress;
    readonly name: string;
    readonly variants: V;
    readonly tokens: Record<string, Record<V[number] & string, unknown>>;
    readonly meta?: Record<V[number] & string, { readonly label: string; readonly mode: 'light' | 'dark' }>;
  }

  export function make<const V extends readonly [string, ...string[]]>(config: {
    readonly name: string;
    readonly variants: V;
    readonly tokens: Record<string, Record<V[number] & string, unknown>>;
    readonly meta?: Shape<V>['meta'];
  }): Shape<V>;

  export function tap<V extends readonly string[]>(theme: Shape<V>, variant: V[number]): Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 6. COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SlotConfig {
  /** Default: false. */
  readonly required?: boolean;
  readonly description?: string;
}

export declare namespace Component {
  export interface Shape<
    B extends Boundary.Shape = Boundary.Shape,
    SlotNames extends readonly string[] = readonly string[],
  > {
    readonly _tag: 'ComponentDef';
    readonly id: ContentAddress;
    readonly name: string;
    readonly boundary?: B;
    readonly styles: Style.Shape<B>;
    readonly slots: { readonly [K in SlotNames[number]]: SlotConfig };
    readonly defaultSlot?: SlotNames[number];
  }

  export function make<B extends Boundary.Shape, const SN extends readonly [string, ...string[]] = readonly ['children']>(config: {
    readonly name: string;
    readonly boundary?: B;
    readonly styles: Style.Shape<B>;
    /** Default: an implied single 'children' slot with defaultSlot 'children'. */
    readonly slots?: { readonly [K in SN[number]]: SlotConfig };
    readonly defaultSlot?: SN[number];
  }): Shape<B, SN>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 7. UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TokensOf<T extends Theme.Shape> = keyof T['tokens'];
export type VariantsOf<T extends Theme.Shape> = T['variants'][number];
export type SlotsOf<C extends Component.Shape> = keyof C['slots'];
