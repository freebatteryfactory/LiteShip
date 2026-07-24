/**
 * TokenDef -- design token primitive for constraint-based adaptive rendering.
 *
 * A token defines a named design value that varies across axes (e.g. theme,
 * density, contrast). Content-addressed via FNV-1a.
 *
 * @module
 */

import type { ContentAddress } from '../schema/brands.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { Diagnostics } from '../evidence/diagnostics.js';
import { fnv1aBytes } from '../evidence/fnv.js';
import { ValidationError } from '@liteship/error';

/** Design-system category of a {@link Token} — governs compilation strategy and CSS property prefix. */
export type TokenCategory = 'color' | 'spacing' | 'typography' | 'shadow' | 'radius' | 'animation' | 'effect';

interface TokenDef<N extends string = string, Axes extends readonly string[] = readonly string[]> {
  readonly _tag: 'TokenDef';
  readonly _version: 1;
  readonly id: ContentAddress;
  readonly name: N;
  readonly category: TokenCategory;
  readonly axes: Axes;
  readonly values: Record<string, unknown>;
  readonly fallback: unknown;
  readonly cssProperty: `--${string}`;
}

function deterministicId(
  name: string,
  category: string,
  axes: readonly string[],
  values: Record<string, unknown>,
  fallback: unknown,
): ContentAddress {
  return fnv1aBytes(
    CanonicalCbor.encode({
      _tag: 'TokenDef',
      _version: 1,
      name,
      category,
      axes,
      values,
      fallback,
    }),
  );
}

/**
 * Resolve a token's value for the given axis values. Builds a sorted lookup key.
 *
 * Axes are sorted alphabetically and joined with ':' to form the lookup key.
 * Falls back to the token's fallback value if no match is found.
 *
 * The optional type parameter `T` lets callers narrow the return value when
 * they know the value shape; without it, the return is `unknown` (the
 * underlying `TokenDef.values` is `Record<string, unknown>` because token
 * values can be any JSON shape — colors as strings, spacing as numbers,
 * shadow records as objects). Pass `Token.tap<string>(...)` for a color
 * token, etc.
 *
 * @example
 * ```ts
 * const token = defineToken({
 *   name: 'primary', category: 'color',
 *   axes: ['theme'],
 *   values: { 'light': '#000', 'dark': '#fff' },
 *   fallback: '#888',
 * });
 * const value = Token.tap<string>(token, { theme: 'dark' });
 * // value === '#fff' (typed as string)
 * ```
 */
function _tap<T = unknown>(token: TokenDef, axisValues: Record<string, string>): T {
  const key = [...token.axes]
    .sort()
    .map((axis) => axisValues[axis] ?? '')
    .join(':');
  if (!(key in token.values)) {
    // Falling back is the designed behavior; the warn makes a typo'd axis value observable.
    Diagnostics.warnOnceRegistered({
      source: 'liteship/core.Token',
      code: 'core/token/token-tap-miss',
      message: `Token "${token.name}": no value for key "${key}" — known keys: [${Object.keys(token.values).join(', ')}]; returning fallback.`,
    });
  }
  return (token.values[key] ?? token.fallback) as T;
}

/**
 * Generate a CSS var() reference for a token.
 *
 * Returns a `var(--liteship-<name>)` string suitable for use in CSS properties.
 *
 * @example
 * ```ts
 * const token = defineToken({
 *   name: 'primary', category: 'color',
 *   axes: ['theme'],
 *   values: { 'light': '#000' },
 *   fallback: '#888',
 * });
 * const ref = Token.cssVar(token);
 * // ref === 'var(--liteship-primary)'
 * ```
 */
function _cssVar<N extends string>(token: TokenDef<N>): `var(--liteship-${N})` {
  return `var(--liteship-${token.name})` as `var(--liteship-${N})`;
}

/**
 * Token namespace -- design token primitive for adaptive rendering.
 *
 * Create named design values that vary across axes (theme, density, contrast).
 * Tokens are content-addressed and produce CSS custom property references.
 *
 * @example
 * ```ts
 * import { defineToken, Token } from '@liteship/core';
 *
 * const spacing = defineToken({
 *   name: 'gap', category: 'spacing',
 *   axes: ['density'],
 *   values: { 'compact': '4px', 'comfortable': '8px' },
 *   fallback: '6px',
 * });
 * const resolved = Token.tap(spacing, { density: 'compact' });
 * // resolved === '4px'
 * const cssRef = Token.cssVar(spacing);
 * // cssRef === 'var(--liteship-gap)'
 * ```
 */
/**
 * Define a design token — a named design value that varies across axes (theme,
 * density, contrast, …).
 *
 * The token is content-addressed via FNV-1a hash of its name, category, axes,
 * and values. The resulting object is frozen.
 *
 * `axes` defaults to `['default']` and `fallback` derives from `values.default`
 * when omitted, so a single-value token is just
 * `defineToken({ name, category, values: { default: '#ccc' } })`.
 *
 * Multi-axis value keys join one value per axis with ':' in alphabetical
 * axis-name order — for `axes: ['theme', 'contrast']` the key order is
 * `<contrast>:<theme>` (contrast sorts first).
 *
 * @example
 * ```ts
 * const token = defineToken({
 *   name: 'bg', category: 'color',
 *   axes: ['theme', 'contrast'],
 *   values: { 'normal:light': '#fff', 'normal:dark': '#111' },
 *   fallback: '#ccc',
 * });
 * // token._tag === 'TokenDef'
 * // token.cssProperty === '--liteship-bg'
 * ```
 */
export function defineToken<N extends string>(config: {
  readonly name: N;
  readonly category: TokenCategory;
  /** Single-value shorthand — derives `axes: []`, `values: {}`, `fallback: value`. */
  readonly value: unknown;
}): TokenDef<N, readonly []>;
export function defineToken<
  N extends string,
  const A extends readonly [string, ...string[]] = readonly ['default'],
>(config: {
  readonly name: N;
  readonly category: TokenCategory;
  /** Default: ['default'] — single-value tokens need no axis declaration. */
  readonly axes?: A;
  readonly values: Record<string, unknown>;
  /** Default: derived from values.default when omitted; omitting both is a validation error. */
  readonly fallback?: unknown;
}): TokenDef<N, A>;
export function defineToken<N extends string, const A extends readonly [string, ...string[]] = readonly ['default']>(
  config:
    | {
        readonly name: N;
        readonly category: TokenCategory;
        readonly value: unknown;
      }
    | {
        readonly name: N;
        readonly category: TokenCategory;
        readonly axes?: A;
        readonly values: Record<string, unknown>;
        readonly fallback?: unknown;
      },
): TokenDef<N, A> {
  if ('value' in config && !('values' in config)) {
    const simple = config as { name: N; category: TokenCategory; value: unknown };
    if (simple.name === '') {
      throw ValidationError('defineToken', 'Token name must not be empty.');
    }
    const axes = [] as unknown as A;
    const values = {};
    const fallback = simple.value;
    const id = deterministicId(simple.name, simple.category, axes, values, fallback);
    return Object.freeze({
      _tag: 'TokenDef' as const,
      _version: 1 as const,
      id,
      name: simple.name,
      category: simple.category,
      axes,
      values,
      fallback,
      cssProperty: `--liteship-${simple.name}` as const,
    });
  }

  const full = config as {
    readonly name: N;
    readonly category: TokenCategory;
    readonly axes?: A;
    readonly values: Record<string, unknown>;
    readonly fallback?: unknown;
  };
  if (full.name === '') {
    throw ValidationError('defineToken', 'Token name must not be empty.');
  }
  const axes = (full.axes ?? ['default']) as A;
  const seen = new Set<string>();
  for (const axis of axes) {
    if (seen.has(axis)) {
      throw ValidationError('defineToken', `duplicate axis "${axis}". Each axis must have a unique name.`);
    }
    seen.add(axis);
  }

  const sortedAxes = [...axes].sort();
  for (const key of Object.keys(full.values)) {
    const segments = key.split(':').length;
    if (segments !== axes.length) {
      throw ValidationError(
        'defineToken',
        `values key "${key}" has ${segments} segment(s) but the token declares ${axes.length} axes [${axes.join(', ')}]. ` +
          `Keys join one value per axis with ':' in alphabetical axis-name order — e.g. "${sortedAxes.map((axis) => `<${axis}>`).join(':')}".`,
      );
    }
  }

  let fallback = full.fallback;
  if (!('fallback' in full)) {
    if (!('default' in full.values)) {
      throw ValidationError(
        'defineToken',
        'fallback omitted and values has no "default" key — add values.default or pass fallback explicitly.',
      );
    }
    fallback = full.values['default'];
  }

  const id = deterministicId(full.name, full.category, axes, full.values, fallback);

  return Object.freeze({
    _tag: 'TokenDef' as const,
    _version: 1 as const,
    id,
    name: full.name,
    category: full.category,
    axes,
    values: full.values,
    fallback,
    cssProperty: `--liteship-${full.name}` as const,
  });
}

/**
 * Token — the resolution namespace for a {@link Token} definition. Construction
 * lives in the standalone {@link defineToken}; this object carries
 * {@link Token.tap} (resolve a value for given axis values) and
 * {@link Token.cssVar} (the `var(--liteship-<name>)` reference).
 */
export const Token = {
  tap: _tap,
  cssVar: _cssVar,
};

/** Public structural type for `Token`. */
export type Token<N extends string = string, Axes extends readonly string[] = readonly string[]> = TokenDef<N, Axes>;
