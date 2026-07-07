/**
 * Value lerping between output states — numeric records and typed CSS values.
 *
 * Linearly interpolates numeric property records and typed {@link TypedValue}
 * unions within-kind; cross-kind interpolation is refused loudly (no 50% snap).
 *
 * @module
 */

import { Diagnostics } from './diagnostics.js';

/** A single transform function part (e.g. `translateY(24px)`). */
export interface TransformPart {
  readonly fn: string;
  readonly args: readonly TypedValue[];
}

/** Typed value union — interpolate within-kind only. */
export type TypedValue =
  | { readonly k: 'number'; readonly v: number }
  | { readonly k: 'opacity'; readonly v: number }
  | { readonly k: 'length'; readonly v: number; readonly unit: 'px' | 'rem' | '%' | 'vw' | 'vh' }
  | { readonly k: 'angle'; readonly v: number; readonly unit: 'deg' | 'rad' | 'turn' }
  | { readonly k: 'transform'; readonly parts: readonly TransformPart[] };

type LengthUnit = 'px' | 'rem' | '%' | 'vw' | 'vh';
type AngleUnit = 'deg' | 'rad' | 'turn';

const TRANSFORM_FNS = ['translate', 'translateX', 'translateY', 'translateZ', 'scale', 'rotate'] as const;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function warnInterpolate(code: string, message: string, detail?: unknown): void {
  Diagnostics.warnOnce({
    source: 'interpolateTyped',
    code,
    message,
    detail,
  });
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

  const transformMatch = /^([a-zA-Z]+)\((.+)\)$/.exec(trimmed);
  if (transformMatch) {
    const fn = transformMatch[1]!;
    const argStr = transformMatch[2]!.trim();
    const argParts = argStr.split(/,\s*/);
    const args = argParts.map((part, i) => parseTypedBinding(`${key}:${i}`, part));
    return { k: 'transform', parts: [{ fn, args }] };
  }

  if (TRANSFORM_FNS.some((fn) => key === fn || key.startsWith(fn))) {
    const asLength = parseTypedBinding(key, trimmed.includes('(') ? trimmed : `${key}(${trimmed})`);
    if (asLength.k === 'transform') return asLength;
  }

  const asNumber = Number.parseFloat(trimmed);
  if (!Number.isNaN(asNumber) && trimmed === String(asNumber)) {
    return { k: 'number', v: asNumber };
  }

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
    warnInterpolate('cross-kind', `refusing cross-kind interpolation: ${from.k} → ${to.k}`, { from, to });
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
          'unit-mismatch',
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
        warnInterpolate('unit-mismatch', `refusing angle interpolation across units: ${from.unit} → ${toAngle.unit}`, {
          from,
          to,
        });
        return to;
      }
      return { k: 'angle', v: lerp(from.v, toAngle.v, eased), unit: from.unit };
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
            warnInterpolate('transform-fn-mismatch', `refusing transform fn mismatch: ${a.fn} → ${b.fn}`, {
              from: a,
              to: b,
            });
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
