/**
 * dispatch() -- tagged CompilerDef discriminated union.
 *
 * Smoke tests that each target routes correctly and returns
 * the right discriminated union shape.
 */

import { describe, test, expect } from 'vitest';
import { defineBoundary, defineConfig } from '@liteship/core';
import { hasTag } from '@liteship/error';
import { dispatch } from '@liteship/compiler';
import type { AIManifest, CompilerDef } from '@liteship/compiler';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const boundary = defineBoundary({
  input: 'width',
  at: [
    [0, 'small'],
    [768, 'large'],
  ] as const,
});

const cssStates = {
  small: { 'font-size': '14px' },
  large: { 'font-size': '18px' },
};

const numericStates = {
  small: { columns: 1 },
  large: { columns: 3 },
};

const ariaInput = {
  states: {
    small: { 'aria-label': 'Compact' },
    large: { 'aria-label': 'Full' },
  },
  currentState: 'small',
};

const aiManifest: AIManifest = {
  version: '1.0',
  dimensions: {},
  slots: {},
  actions: {},
  constraints: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('dispatch()', () => {
  test('CSSCompiler def returns { target: "css" }', () => {
    const result = dispatch({ _tag: 'CSSCompiler', boundary, states: cssStates });
    expect(result.target).toBe('css');
    expect(result.result).toBeDefined();
  });

  test('GLSLCompiler def returns { target: "glsl" }', () => {
    const result = dispatch({ _tag: 'GLSLCompiler', boundary, states: numericStates });
    expect(result.target).toBe('glsl');
    expect(result.result).toHaveProperty('declarations');
    expect(result.result).toHaveProperty('uniforms');
  });

  test('WGSLCompiler def returns { target: "wgsl" }', () => {
    const result = dispatch({ _tag: 'WGSLCompiler', boundary, states: numericStates });
    expect(result.target).toBe('wgsl');
    expect(result.result).toHaveProperty('structs');
    expect(result.result).toHaveProperty('bindings');
  });

  test('ARIACompiler def returns { target: "aria" }', () => {
    const result = dispatch({ _tag: 'ARIACompiler', boundary, states: ariaInput });
    expect(result.target).toBe('aria');
    expect(result.result).toHaveProperty('stateAttributes');
    expect(result.result).toHaveProperty('currentAttributes');
  });

  test('AICompiler def returns { target: "ai" }', () => {
    const result = dispatch({ _tag: 'AICompiler', manifest: aiManifest });
    expect(result.target).toBe('ai');
    expect(result.result).toHaveProperty('toolDefinitions');
    expect(result.result).toHaveProperty('systemPrompt');
  });

  test('ConfigCompiler def returns json string', () => {
    const cfg = defineConfig({});
    const def: CompilerDef = { _tag: 'ConfigCompiler', config: cfg };
    const result = dispatch(def);
    expect(result.target).toBe('config');
    expect((result as { target: string; result: { json: string } }).result.json).toContain('ConfigDef');
  });
});

// ---------------------------------------------------------------------------
// Dispatch arm defaults
// ---------------------------------------------------------------------------

describe('dispatch() arm defaults', () => {
  test('ARIACompiler def defaults currentState to the boundary first state', () => {
    const result = dispatch({ _tag: 'ARIACompiler', boundary, states: { states: ariaInput.states } });
    expect(result.target).toBe('aria');
    if (result.target === 'aria') {
      expect(result.result.currentAttributes).toEqual({ 'aria-label': 'Compact' });
    }
  });

  test('CSSCompiler def without selector uses the documented .liteship-boundary default', () => {
    const result = dispatch({ _tag: 'CSSCompiler', boundary, states: cssStates });
    if (result.target === 'css') {
      expect(result.result.raw).toContain('.liteship-boundary {');
    }
  });

  test('CSSCompiler def passes selector through to the CSS compiler', () => {
    const result = dispatch({ _tag: 'CSSCompiler', boundary, states: cssStates, selector: '.card' });
    if (result.target === 'css') {
      expect(result.result.raw).toContain('.card {');
      expect(result.result.raw).not.toContain('.liteship-boundary');
    }
  });

  test('AICompiler def accepts a partial manifest input and normalizes defaults', () => {
    const result = dispatch({ _tag: 'AICompiler', manifest: { actions: {} } });
    expect(result.target).toBe('ai');
    if (result.target === 'ai') {
      expect(result.result.manifest).toEqual({
        version: '1.0',
        dimensions: {},
        slots: {},
        actions: {},
        constraints: [],
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Exhaustiveness guard (assertNever)
// ---------------------------------------------------------------------------

describe('dispatch() exhaustiveness guard', () => {
  test('an out-of-type _tag (bad data the types forbid) fails as a typed InvariantViolationError', () => {
    // Forge a value outside the CompilerDef union — the static type guarantees
    // this is unreachable, so the only way to hit the `default: assertNever`
    // arm is to defeat the types with a cast. Reaching it must NOT silently
    // return undefined; it must throw the algebra's InvariantViolationError
    // naming the broken contract, never a bare Error.
    const forged = { _tag: 'NotACompiler' } as unknown as CompilerDef;
    try {
      dispatch(forged);
      throw new Error('expected dispatch to throw on an out-of-type _tag');
    } catch (e) {
      expect(hasTag(e, 'InvariantViolationError')).toBe(true);
      expect((e as { invariant: string }).invariant).toBe('CompilerDef._tag');
      expect((e as { message: string }).message).toContain('unhandled variant');
    }
  });
});
