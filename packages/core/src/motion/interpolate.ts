/**
 * Value lerping between output states — numeric records and typed CSS values.
 *
 * Linearly interpolates numeric property records and typed {@link TypedValue}
 * unions within-kind; cross-kind interpolation is refused loudly (no 50% snap).
 *
 * @module
 */

import { Diagnostics } from '../evidence/diagnostics.js';
import type { DiagnosticCodeFor } from '@liteship/error';

/** A single transform function part (e.g. `translateY(24px)`). */
export interface TransformPart {
  readonly fn: string;
  readonly args: readonly TypedValue[];
}

/** Color space a {@link TypedValue} color carries its components in. */
export type ColorSpace = 'srgb' | 'oklch';

/** Typed value union — interpolate within-kind only. */
export type TypedValue =
  | { readonly k: 'number'; readonly v: number }
  | { readonly k: 'opacity'; readonly v: number }
  | { readonly k: 'length'; readonly v: number; readonly unit: 'px' | 'rem' | '%' | 'vw' | 'vh' }
  | { readonly k: 'angle'; readonly v: number; readonly unit: 'deg' | 'rad' | 'turn' }
  | { readonly k: 'color'; readonly space: ColorSpace; readonly components: readonly number[] }
  | { readonly k: 'transform'; readonly parts: readonly TransformPart[] };

type LengthUnit = 'px' | 'rem' | '%' | 'vw' | 'vh';
type AngleUnit = 'deg' | 'rad' | 'turn';

const TRANSFORM_FNS = ['translate', 'translateX', 'translateY', 'translateZ', 'scale', 'rotate'] as const;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function warnInterpolate(code: DiagnosticCodeFor<'core'>, message: string, detail?: unknown): void {
  Diagnostics.warnOnceRegistered({
    source: 'interpolateTyped',
    code,
    message,
    detail,
  });
}

/**
 * Normalize one functional-color channel into its space's canonical numeric domain.
 * A percentage maps INTO that domain (never left as its raw magnitude); a plain number is
 * already canonical. sRGB channels are `0..255` (100% → 255); OKLCH lightness is `0..1`
 * (70% → 0.7) and chroma `0..0.4` (100% → 0.4, per CSS Color 4); an alpha channel (index 3,
 * either space) is `0..1` (50% → 0.5). Hue (OKLCH index 2) never carries `%`.
 */
function colorChannel(part: string, space: 'srgb' | 'oklch', index: number): number {
  const value = Number.parseFloat(part);
  if (!part.includes('%')) return value;
  if (index === 3) return value / 100; // alpha, both spaces
  if (space === 'srgb') return (value / 100) * 255;
  return index === 1 ? (value / 100) * 0.4 : value / 100; // oklch chroma vs lightness
}

/**
 * Parse a color literal into a {@link TypedValue} color, or `null` when the input
 * is not a recognized color form. Supports `#rgb` / `#rrggbb` hex and functional
 * `rgb(r g b)` / `rgb(r, g, b)` (sRGB, 0..255 components) and `oklch(L C H)`
 * (OKLCH, `[lightness, chroma, hue]`). Components stay in their authored numeric
 * domain so {@link formatTypedValue} round-trips them losslessly — cross-space
 * interpolation is refused loudly in {@link interpolateTyped}, never coerced.
 */
function parseColor(trimmed: string): Extract<TypedValue, { k: 'color' }> | null {
  const hexMatch = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed);
  if (hexMatch) {
    const hex = hexMatch[1]!;
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    const components = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
    return { k: 'color', space: 'srgb', components };
  }

  const fnMatch = /^(oklch|rgb)\(\s*([^)]+?)\s*\)$/i.exec(trimmed);
  if (fnMatch) {
    const fn = fnMatch[1]!.toLowerCase();
    const space = fn === 'oklch' ? 'oklch' : 'srgb';
    // Both comma- and space-separated component syntaxes (CSS Color 4). A percentage channel
    // is NORMALIZED into this space's canonical numeric domain — NOT stripped to its raw
    // magnitude, which would corrupt the color: `rgb(100% 0 0)` is 255 red (not 100/255 ≈ 39%),
    // and `oklch(70% 0.1 30)` is lightness 0.7 (not 70). Normalizing keeps every channel in one
    // domain so mixed `%`/number authoring interpolates and formats correctly.
    const components = fnMatch[2]!
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((part, index) => colorChannel(part, space, index));
    if (components.some((n) => Number.isNaN(n))) return null;
    return { k: 'color', space, components };
  }

  return null;
}

/**
 * Parse a pose binding value into a {@link TypedValue}. Property name informs
 * opacity/transform heuristics when the value alone is ambiguous.
 */
export function parseTypedBinding(key: string, value: number | string): TypedValue {
  if (typeof value === 'number') {
    if (key === 'opacity' || key.endsWith('-opacity')) {
      return { k: 'opacity', v: value };
    }
    return { k: 'number', v: value };
  }

  const trimmed = value.trim();

  const lengthMatch = /^(-?\d*\.?\d+)(px|rem|%|vw|vh)$/.exec(trimmed);
  if (lengthMatch) {
    const unit = lengthMatch[2]!;
    return { k: 'length', v: Number.parseFloat(lengthMatch[1]!), unit: unit as LengthUnit };
  }

  const angleMatch = /^(-?\d*\.?\d+)(deg|rad|turn)$/.exec(trimmed);
  if (angleMatch) {
    const unit = angleMatch[2]!;
    return { k: 'angle', v: Number.parseFloat(angleMatch[1]!), unit: unit as AngleUnit };
  }

  // Color MUST be probed before the generic transform arm below: `rgb(...)` /
  // `oklch(...)` would otherwise be mis-parsed as `transform` functions.
  const color = parseColor(trimmed);
  if (color) return color;

  const transformMatch = /^([a-zA-Z]+)\((.+)\)$/.exec(trimmed);
  if (transformMatch) {
    const fn = transformMatch[1]!;
    const argStr = transformMatch[2]!.trim();
    const argParts = argStr.split(/,\s*/);
    const args = argParts.map((part, i) => parseTypedBinding(`${key}:${i}`, part));
    return { k: 'transform', parts: [{ fn, args }] };
  }

  if (TRANSFORM_FNS.some((fn) => key === fn || key.startsWith(fn))) {
    if (!trimmed.includes('(')) {
      const wrapped = `${key}(${trimmed})`;
      const asTransform = parseTypedBinding(key, wrapped);
      if (asTransform.k === 'transform') return asTransform;
    }
  }

  const asNumber = Number.parseFloat(trimmed);
  if (!Number.isNaN(asNumber) && /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    if (key === 'opacity' || key.endsWith('-opacity')) {
      return { k: 'opacity', v: asNumber };
    }
    return { k: 'number', v: asNumber };
  }

  warnInterpolate('core/interpolate/unparseable-binding', `could not parse binding value: "${value}"`, { key, value });
  return { k: 'number', v: 0 };
}

/** Format a {@link TypedValue} for CSS custom-property / style emission. */
export function formatTypedValue(value: TypedValue): string {
  switch (value.k) {
    case 'number':
    case 'opacity':
      return String(value.v);
    case 'length':
      return `${value.v}${value.unit}`;
    case 'angle':
      return `${value.v}${value.unit}`;
    case 'color':
      // Modern space-separated CSS syntax, which accepts fractional channels —
      // so an eased mid-frame value emits losslessly (no round-to-int snap that
      // would defeat the differential-oracle comparison against the kernel).
      return value.space === 'oklch'
        ? `oklch(${value.components.map(String).join(' ')})`
        : `rgb(${value.components.map(String).join(' ')})`;
    case 'transform':
      return value.parts.map((part) => `${part.fn}(${part.args.map((a) => formatTypedValue(a)).join(', ')})`).join(' ');
  }
}

/**
 * Interpolate between two numeric records using an eased value [0..1].
 * Returns a new record with each property lerped: from[k] + (to[k] - from[k]) * eased.
 */
export function interpolate<T extends Record<string, number>>(
  from: T,
  to: T,
  eased: number,
  defaults?: Partial<Record<string, number>>,
): T {
  const result: Record<string, number> = {};
  for (const [key, a] of Object.entries(from)) {
    const b = to[key] ?? a;
    result[key] = a + (b - a) * eased;
  }
  for (const [key, b] of Object.entries(to)) {
    if (key in result) {
      continue;
    }

    const base = defaults?.[key] ?? 0;
    result[key] = base + (b - base) * eased;
  }
  return result as unknown as T;
}

function interpolateTransformPart(from: TransformPart, to: TransformPart, eased: number): TransformPart {
  const maxArgs = Math.max(from.args.length, to.args.length);
  const args: TypedValue[] = [];
  for (let i = 0; i < maxArgs; i++) {
    const a = from.args[i] ?? to.args[i]!;
    const b = to.args[i] ?? from.args[i]!;
    args.push(interpolateTyped(a, b, eased));
  }
  return { fn: to.fn, args };
}

/**
 * Interpolate two {@link TypedValue}s within-kind. Cross-kind or unit-mismatch
 * interpolation is refused loudly — holds `to` and emits a diagnostic.
 */
export function interpolateTyped(from: TypedValue, to: TypedValue, eased: number): TypedValue {
  if (from.k !== to.k) {
    warnInterpolate('core/interpolate/cross-kind', `refusing cross-kind interpolation: ${from.k} → ${to.k}`, {
      from,
      to,
    });
    return to;
  }

  switch (from.k) {
    case 'number':
    case 'opacity':
      return { k: from.k, v: lerp(from.v, (to as typeof from).v, eased) };
    case 'length': {
      const toLength = to as Extract<TypedValue, { k: 'length' }>;
      if (from.unit !== toLength.unit) {
        warnInterpolate(
          'core/interpolate/unit-mismatch',
          `refusing length interpolation across units: ${from.unit} → ${toLength.unit}`,
          { from, to },
        );
        return to;
      }
      return { k: 'length', v: lerp(from.v, toLength.v, eased), unit: from.unit };
    }
    case 'angle': {
      const toAngle = to as Extract<TypedValue, { k: 'angle' }>;
      if (from.unit !== toAngle.unit) {
        warnInterpolate(
          'core/interpolate/unit-mismatch',
          `refusing angle interpolation across units: ${from.unit} → ${toAngle.unit}`,
          {
            from,
            to,
          },
        );
        return to;
      }
      return { k: 'angle', v: lerp(from.v, toAngle.v, eased), unit: from.unit };
    }
    case 'color': {
      const toColor = to as Extract<TypedValue, { k: 'color' }>;
      // Cross-SPACE interpolation is a category error (sRGB channels and OKLCH
      // lightness/chroma/hue are incommensurable): refuse LOUDLY and hold `to`,
      // mirroring the unit-mismatch arm. No silent lerp across color models.
      if (from.space !== toColor.space) {
        warnInterpolate(
          'core/interpolate/color-space-mismatch',
          `refusing color interpolation across spaces: ${from.space} → ${toColor.space}`,
          {
            from,
            to,
          },
        );
        return to;
      }
      const n = Math.max(from.components.length, toColor.components.length);
      const components: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = from.components[i] ?? toColor.components[i]!;
        const b = toColor.components[i] ?? from.components[i]!;
        components.push(lerp(a, b, eased));
      }
      return { k: 'color', space: from.space, components };
    }
    case 'transform': {
      const toTransform = to as Extract<TypedValue, { k: 'transform' }>;
      const maxParts = Math.max(from.parts.length, toTransform.parts.length);
      const parts: TransformPart[] = [];
      for (let i = 0; i < maxParts; i++) {
        const a = from.parts[i];
        const b = toTransform.parts[i];
        if (a && b) {
          if (a.fn !== b.fn) {
            warnInterpolate(
              'core/interpolate/transform-fn-mismatch',
              `refusing transform fn mismatch: ${a.fn} → ${b.fn}`,
              {
                from: a,
                to: b,
              },
            );
            parts.push(b);
          } else {
            parts.push(interpolateTransformPart(a, b, eased));
          }
        } else if (b) {
          parts.push(b);
        } else if (a) {
          parts.push(a);
        }
      }
      return { k: 'transform', parts };
    }
  }
}
