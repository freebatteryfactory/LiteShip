/**
 * Typed value interpolation — within-kind lerp, cross-kind refusal (#130 child 1).
 *
 * @module
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { interpolateTyped, parseTypedBinding, formatTypedValue, Diagnostics, type TypedValue } from '@liteship/core';

describe('parseTypedBinding', () => {
  test('parses numeric opacity', () => {
    expect(parseTypedBinding('opacity', 0)).toEqual({ k: 'opacity', v: 0 });
  });

  test('parses length with unit', () => {
    expect(parseTypedBinding('--liteship-hero-y', '24px')).toEqual({ k: 'length', v: 24, unit: 'px' });
  });

  test('parses transform function strings', () => {
    const parsed = parseTypedBinding('transform', 'translateY(24px)');
    expect(parsed.k).toBe('transform');
    if (parsed.k === 'transform') {
      expect(parsed.parts[0]?.fn).toBe('translateY');
    }
  });

  test('warns on unparseable binding instead of silently defaulting to zero', () => {
    const sink = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink.sink);
    const parsed = parseTypedBinding('--liteship-hero-y', 'not-a-value');
    expect(parsed).toEqual({ k: 'number', v: 0 });
    expect(sink.events.some((e) => e.code === 'unparseable-binding')).toBe(true);
    Diagnostics.reset();
  });

  test('does not recurse when transform-like value already contains parentheses', () => {
    const sink = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink.sink);
    const parsed = parseTypedBinding('translateY', '(24px)');
    expect(parsed.k).not.toBe('transform');
    expect(sink.events.some((e) => e.code === 'unparseable-binding')).toBe(true);
    Diagnostics.reset();
  });
});

describe('interpolateTyped', () => {
  beforeEach(() => Diagnostics.reset());
  afterEach(() => Diagnostics.reset());

  test('lerps numbers and opacity within-kind', () => {
    expect(interpolateTyped({ k: 'number', v: 0 }, { k: 'number', v: 100 }, 0.5)).toEqual({
      k: 'number',
      v: 50,
    });
    expect(interpolateTyped({ k: 'opacity', v: 0 }, { k: 'opacity', v: 1 }, 0.25)).toEqual({
      k: 'opacity',
      v: 0.25,
    });
  });

  test('lerps length when units match', () => {
    const from: TypedValue = { k: 'length', v: 0, unit: 'px' };
    const to: TypedValue = { k: 'length', v: 24, unit: 'px' };
    expect(interpolateTyped(from, to, 0.5)).toEqual({ k: 'length', v: 12, unit: 'px' });
  });

  test('refuses cross-kind loudly — holds `to`', () => {
    const sink = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink.sink);
    const from: TypedValue = { k: 'number', v: 0 };
    const to: TypedValue = { k: 'length', v: 24, unit: 'px' };
    expect(interpolateTyped(from, to, 0.5)).toEqual(to);
    expect(sink.events.some((e) => e.code === 'cross-kind')).toBe(true);
  });

  test('refuses length unit mismatch loudly — holds `to`', () => {
    const sink = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink.sink);
    const from: TypedValue = { k: 'length', v: 0, unit: 'px' };
    const to: TypedValue = { k: 'length', v: 1, unit: 'rem' };
    expect(interpolateTyped(from, to, 0.5)).toEqual(to);
    expect(sink.events.some((e) => e.code === 'unit-mismatch')).toBe(true);
  });

  test('formatTypedValue round-trips length', () => {
    const value: TypedValue = { k: 'length', v: 12.5, unit: 'px' };
    expect(formatTypedValue(value)).toBe('12.5px');
  });
});

describe('color TypedValue (F-MOT-3)', () => {
  beforeEach(() => Diagnostics.reset());
  afterEach(() => Diagnostics.reset());

  test('parses #rrggbb and #rgb hex into sRGB 0..255 components', () => {
    expect(parseTypedBinding('--liteship-hero-color', '#ff0000')).toEqual({
      k: 'color',
      space: 'srgb',
      components: [255, 0, 0],
    });
    // #f00 shorthand expands to the same triple.
    expect(parseTypedBinding('--liteship-hero-color', '#f00')).toEqual({
      k: 'color',
      space: 'srgb',
      components: [255, 0, 0],
    });
  });

  test('parses functional rgb() and oklch() (before the generic transform arm)', () => {
    expect(parseTypedBinding('--c', 'rgb(10 20 30)')).toEqual({ k: 'color', space: 'srgb', components: [10, 20, 30] });
    expect(parseTypedBinding('--c', 'oklch(0.7 0.15 30)')).toEqual({
      k: 'color',
      space: 'oklch',
      components: [0.7, 0.15, 30],
    });
  });

  test('normalizes percentage color channels into the canonical numeric domain (Codex P2)', () => {
    // rgb %: 100% → 255 (not the raw 100, which would render ~39% red).
    expect(parseTypedBinding('--c', 'rgb(100% 0% 0%)')).toEqual({ k: 'color', space: 'srgb', components: [255, 0, 0] });
    // oklch lightness %: 70% → 0.7 (not the raw, invalid 70).
    expect(parseTypedBinding('--c', 'oklch(70% 0.1 30)')).toEqual({
      k: 'color',
      space: 'oklch',
      components: [0.7, 0.1, 30],
    });
    // Mixed `%`/number in one rgb() still lands in ONE domain so it interpolates correctly.
    expect(parseTypedBinding('--c', 'rgb(50% 128 0)')).toEqual({
      k: 'color',
      space: 'srgb',
      components: [127.5, 128, 0],
    });
    // ...and the normalized color round-trips to valid CSS, not the corrupted raw magnitude.
    expect(formatTypedValue(parseTypedBinding('--c', 'rgb(100% 0% 0%)'))).toBe('rgb(255 0 0)');
  });

  test('lerps within color space component-wise', () => {
    const from: TypedValue = { k: 'color', space: 'srgb', components: [0, 0, 0] };
    const to: TypedValue = { k: 'color', space: 'srgb', components: [255, 100, 0] };
    expect(interpolateTyped(from, to, 0.5)).toEqual({ k: 'color', space: 'srgb', components: [127.5, 50, 0] });
  });

  test('formatTypedValue emits modern space-separated syntax (fractional-lossless)', () => {
    expect(formatTypedValue({ k: 'color', space: 'srgb', components: [127.5, 50, 0] })).toBe('rgb(127.5 50 0)');
    expect(formatTypedValue({ k: 'color', space: 'oklch', components: [0.7, 0.15, 30] })).toBe('oklch(0.7 0.15 30)');
  });

  test('refuses CROSS-SPACE color interpolation loudly — holds `to`, no coerced lerp', () => {
    const sink = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink.sink);
    const from: TypedValue = { k: 'color', space: 'srgb', components: [255, 0, 0] };
    const to: TypedValue = { k: 'color', space: 'oklch', components: [0.7, 0.15, 30] };
    expect(interpolateTyped(from, to, 0.5)).toEqual(to);
    expect(sink.events.some((e) => e.code === 'color-space-mismatch')).toBe(true);
  });
});

describe('parseTypedBinding unitless decimals', () => {
  test('parses unitless decimal strings like "1.0" without silent zero fallback', () => {
    expect(parseTypedBinding('weight', '1.0')).toEqual({ k: 'number', v: 1 });
    expect(parseTypedBinding('opacity', '1.0')).toEqual({ k: 'opacity', v: 1 });
    expect(formatTypedValue(parseTypedBinding('weight', '1.0'))).toBe('1');
  });
});
