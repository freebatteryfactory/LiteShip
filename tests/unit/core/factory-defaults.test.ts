// @vitest-environment jsdom
/**
 * Factory defaults — sensible-default widenings on core factories.
 *
 * Covers: Token.make axes/fallback defaults + value-key validation,
 * Component.make implied slots, Easing.spring engine defaults,
 * Signal.make source-payload defaults, Style.make plain-number durations,
 * Signal.audio normalized-mode validation.
 */

import { describe, expect, test } from 'vitest';
import { Effect } from 'effect';
import { AVBridge, Component, Easing, Signal, Style, Token } from '@czap/core';
import { hasTag } from '@czap/error';
import { runScopedAsync as runScoped } from '../../helpers/effect-test.js';

// ---------------------------------------------------------------------------
// Token.make — axes default to ['default'], fallback derives from values.default
// ---------------------------------------------------------------------------

describe('Token.make defaults', () => {
  test('axes default to ["default"] and fallback derives from values.default', () => {
    const token = Token.make({ name: 'primary', category: 'color', values: { default: '#000' } });

    expect(token.axes).toEqual(['default']);
    expect(token.fallback).toBe('#000');
  });

  test('throws a teaching error when fallback is omitted and values has no "default" key', () => {
    try {
      Token.make({ name: 'primary', category: 'color', values: { light: '#000' } });
      expect.unreachable('expected Token.make to throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/values\.default/);
    }
  });

  test('explicit axes + fallback behave as before', () => {
    const token = Token.make({
      name: 'gap',
      category: 'spacing',
      axes: ['density'],
      values: { compact: '4px' },
      fallback: '6px',
    });

    expect(token.axes).toEqual(['density']);
    expect(Token.tap(token, { density: 'compact' })).toBe('4px');
    expect(Token.tap(token, { density: 'spacious' })).toBe('6px');
  });
});

// ---------------------------------------------------------------------------
// Token.make — value keys must have one segment per axis
// ---------------------------------------------------------------------------

describe('Token.make value-key validation', () => {
  test('rejects keys whose segment count does not match the axis count', () => {
    try {
      Token.make({
        name: 'bg',
        category: 'color',
        axes: ['theme', 'contrast'],
        values: { light: '#fff' },
        fallback: '#ccc',
      });
      expect.unreachable('expected Token.make to throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/segment/);
      expect(String(error)).toMatch(/<contrast>:<theme>/);
    }
  });

  test('accepts keys with one value per axis', () => {
    const token = Token.make({
      name: 'bg',
      category: 'color',
      axes: ['theme', 'contrast'],
      values: { 'normal:light': '#fff', 'normal:dark': '#111' },
      fallback: '#ccc',
    });

    expect(Token.tap(token, { theme: 'dark', contrast: 'normal' })).toBe('#111');
  });

  test('value shorthand derives empty axes and uses value as fallback', () => {
    const token = Token.make({ name: 'gap', category: 'spacing', value: '8px' });
    expect(token.axes).toEqual([]);
    expect(token.values).toEqual({});
    expect(token.fallback).toBe('8px');
    expect(Token.tap(token, {})).toBe('8px');
  });
});

// ---------------------------------------------------------------------------
// Component.make — implied default slot, optional `required`
// ---------------------------------------------------------------------------

describe('Component.make defaults', () => {
  const styles = Style.make({ base: { properties: { display: 'flex' } } });

  test('slots default to an implied children slot with defaultSlot "children"', () => {
    const component = Component.make({ name: 'button', styles });

    expect(component.slots).toEqual({ children: { required: false } });
    expect(component.defaultSlot).toBe('children');
  });

  test('omitted `required` normalizes to false and hashes like an explicit false', () => {
    const implicit = Component.make({ name: 'card', styles, slots: { media: {} } });
    const explicit = Component.make({ name: 'card', styles, slots: { media: { required: false } } });

    expect(implicit.slots.media).toEqual({ required: false });
    expect(implicit.id).toBe(explicit.id);
  });

  test('explicit slots keep defaultSlot unset unless provided', () => {
    const component = Component.make({ name: 'panel', styles, slots: { header: { required: true } } });

    expect(component.slots.header).toEqual({ required: true });
    expect(component.defaultSlot).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Easing.spring — engine defaults (stiffness 170, damping 26, mass 1)
// ---------------------------------------------------------------------------

describe('Easing.spring defaults', () => {
  test('spring({}) works with engine defaults', () => {
    const fn = Easing.spring({});

    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);
    expect(fn(0.5)).toBeGreaterThan(0);
  });

  test('spring({}) equals the explicit-default config', () => {
    const defaulted = Easing.spring({});
    const explicit = Easing.spring({ stiffness: 170, damping: 26, mass: 1 });

    expect(defaulted(0.25)).toBe(explicit(0.25));
    expect(defaulted(0.75)).toBe(explicit(0.75));
  });

  test('springNaturalDuration({}) resolves to a positive finite duration', () => {
    const duration = Easing.springNaturalDuration({});

    expect(Number.isFinite(duration)).toBe(true);
    expect(duration).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Signal.make — source payload defaults
// ---------------------------------------------------------------------------

describe('Signal.make source defaults', () => {
  test('viewport defaults to axis "width"', async () => {
    const source = await runScoped(
      Effect.gen(function* () {
        const signal = yield* Signal.make({ type: 'viewport' });
        return signal.source;
      }),
    );

    expect(source).toEqual({ type: 'viewport', axis: 'width' });
  });

  test('scroll defaults to axis "y", pointer to "x", time to mode "elapsed"', async () => {
    const sources = await runScoped(
      Effect.gen(function* () {
        const scroll = yield* Signal.make({ type: 'scroll' });
        const pointer = yield* Signal.make({ type: 'pointer' });
        const time = yield* Signal.make({ type: 'time' });
        return { scroll: scroll.source, pointer: pointer.source, time: time.source };
      }),
    );

    expect(sources.scroll).toEqual({ type: 'scroll', axis: 'y' });
    expect(sources.pointer).toEqual({ type: 'pointer', axis: 'x' });
    expect(sources.time).toEqual({ type: 'time', mode: 'elapsed' });
  });
});

// ---------------------------------------------------------------------------
// Style.make — plain-number transition durations are branded internally
// ---------------------------------------------------------------------------

describe('Style.make transition duration', () => {
  test('accepts a plain number duration', () => {
    const style = Style.make({
      base: { properties: { color: 'black' } },
      transition: { duration: 200 },
    });

    expect(style.transition?.duration).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Signal.audio — normalized mode requires totalDurationSec (no silent degrade)
// ---------------------------------------------------------------------------

describe('Signal.audio normalized-mode validation', () => {
  test('throws a ValidationError when totalDurationSec is missing or non-positive', () => {
    const bridge = AVBridge.make({ sampleRate: 48_000, fps: 60 });

    try {
      Signal.audio(bridge, 'normalized');
      expect.unreachable('expected Signal.audio to throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/totalDurationSec > 0/);
    }
    expect(() => Signal.audio(bridge, 'normalized', 0)).toThrow(/totalDurationSec/);
  });

  test('sample mode still works without a duration', async () => {
    const bridge = AVBridge.make({ sampleRate: 48_000, fps: 60 });
    bridge.advanceSamples(100);

    const value = await runScoped(
      Effect.gen(function* () {
        const signal = yield* Signal.audio(bridge);
        return yield* signal.poll();
      }),
    );

    expect(value).toBe(100);
  });
});
