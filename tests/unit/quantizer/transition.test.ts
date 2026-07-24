/**
 * Transition -- state crossing transition configuration.
 *
 * Resolution order: exact match -> wildcard -> instant (duration: 0).
 */

import { describe, test, expect } from 'vitest';
import { Millis, defineBoundary } from '@liteship/core';
import { Transition } from '@liteship/quantizer';
import type { TransitionConfig } from '@liteship/quantizer';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const boundary = defineBoundary({
  input: 'width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

// Minimal quantizer stub for Transition.for()
const stubQuantizer = {
  boundary,
  state: null as any,
  changes: null as any,
  evaluate: () => 'mobile' as const,
};

// ---------------------------------------------------------------------------
// Defaults: bare-boundary overload + plain-number durations
// ---------------------------------------------------------------------------

describe('Transition.for defaults', () => {
  test('accepts a bare boundary in place of a quantizer', () => {
    const t = Transition.for(boundary, {
      'mobile->tablet': { duration: Millis(250) },
    });
    expect(t.getTransition('mobile', 'tablet').duration).toBe(250);
    expect(t.getTransition('tablet', 'desktop').duration).toBe(0);
  });

  test('accepts plain-number duration and delay without the Millis brand', () => {
    const t = Transition.for(boundary, {
      '*': { duration: 300, delay: 50 },
    });
    const resolved = t.getTransition('tablet', 'desktop');
    expect(resolved.duration).toBe(300);
    expect(resolved.delay).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Resolution order
// ---------------------------------------------------------------------------

describe('Transition.for', () => {
  test('returns a Transition with config and getTransition', () => {
    const t = Transition.for(stubQuantizer, {});
    expect(t.config).toBeDefined();
    expect(t.getTransition).toBeDefined();
  });

  test('exact match takes priority', () => {
    const exactConfig: TransitionConfig = { duration: Millis(300) };
    const wildcardConfig: TransitionConfig = { duration: Millis(100) };

    const t = Transition.for(stubQuantizer, {
      'mobile->tablet': exactConfig,
      '*': wildcardConfig,
    });

    const result = t.getTransition('mobile', 'tablet');
    expect(result.duration).toBe(Millis(300));
  });

  test('wildcard used when no exact match', () => {
    const wildcardConfig: TransitionConfig = { duration: Millis(200) };

    const t = Transition.for(stubQuantizer, {
      '*': wildcardConfig,
    });

    const result = t.getTransition('mobile', 'desktop');
    expect(result.duration).toBe(Millis(200));
  });

  test('instant fallback when no config at all', () => {
    const t = Transition.for(stubQuantizer, {});

    const result = t.getTransition('mobile', 'desktop');
    expect(result.duration).toBe(Millis(0));
  });

  test('from == to still resolves', () => {
    const t = Transition.for(stubQuantizer, {
      '*': { duration: Millis(100) },
    });

    const result = t.getTransition('mobile', 'mobile');
    expect(result.duration).toBe(Millis(100));
  });

  test('duration 0 is valid (instant transition)', () => {
    const t = Transition.for(stubQuantizer, {
      'mobile->tablet': { duration: Millis(0) },
    });

    const result = t.getTransition('mobile', 'tablet');
    expect(result.duration).toBe(0);
  });

  test('easing and delay are optional', () => {
    const t = Transition.for(stubQuantizer, {
      '*': { duration: Millis(100) },
    });

    const result = t.getTransition('mobile', 'tablet');
    expect(result.easing).toBeUndefined();
    expect(result.delay).toBeUndefined();
  });

  test('easing and delay are preserved when provided', () => {
    const easing = (t: number) => t * t;
    const t = Transition.for(stubQuantizer, {
      '*': { duration: Millis(100), easing, delay: Millis(50) },
    });

    const result = t.getTransition('mobile', 'tablet');
    expect(result.easing).toBe(easing);
    expect(result.delay).toBe(Millis(50));
  });

  test('config is accessible', () => {
    const config = { '*': { duration: Millis(100) } };
    const t = Transition.for(stubQuantizer, config);
    expect(t.config).toBe(config);
  });

  test("'*->*' pair keys are a compile error and never match at runtime", () => {
    // TransitionMap's pair keys are a template over the boundary's state
    // union, so the historical '*->*' docblock mistake (which silently
    // resolved to instant duration-0 transitions) no longer type-checks.
    // The any-to-any wildcard is '*'.
    const t = Transition.for(stubQuantizer, {
      // @ts-expect-error -- '*' is not a state of the boundary; use the '*' wildcard key instead
      '*->*': { duration: Millis(300) },
    });

    // Runtime behavior for anyone who suppressed the type error: the key
    // never matches, so the lookup falls through to the instant default.
    const result = t.getTransition('mobile', 'tablet');
    expect(result.duration).toBe(Millis(0));
  });
});
