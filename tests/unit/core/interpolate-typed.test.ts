/**
 * Typed value interpolation — within-kind lerp, cross-kind refusal (#130 child 1).
 *
 * @module
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  interpolateTyped,
  parseTypedBinding,
  formatTypedValue,
  Diagnostics,
  type TypedValue,
} from '@czap/core';

describe('parseTypedBinding', () => {
  test('parses numeric opacity', () => {
    expect(parseTypedBinding('opacity', 0)).toEqual({ k: 'opacity', v: 0 });
  });

  test('parses length with unit', () => {
    expect(parseTypedBinding('--czap-hero-y', '24px')).toEqual({ k: 'length', v: 24, unit: 'px' });
  });

  test('parses transform function strings', () => {
    const parsed = parseTypedBinding('transform', 'translateY(24px)');
    expect(parsed.k).toBe('transform');
    if (parsed.k === 'transform') {
      expect(parsed.parts[0]?.fn).toBe('translateY');
    }
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
