/**
 * Regression: `defineAdaptive(...).plan()` compiles CSS through `@liteship/compiler`,
 * which the HOST-FREE `liteship` root deliberately does NOT load (the P13 host-free
 * root invariant — see tests/unit/liteship/facade-subpaths.test.ts). When the
 * compiler seam is UNregistered, `plan()` must fail LOUDLY with a HostCapabilityError
 * that points the consumer at `@liteship/compiler` / the `liteship/compiler` subpath —
 * never silently, and never by falsely promising the bare `liteship` root loads it.
 *
 * This file imports NEITHER `@liteship/compiler` NOR the `liteship/compiler` subpath,
 * so the seam stays unregistered. Vitest isolates modules per test file (default
 * `isolate: true`), so the sibling `adaptive.test.ts` — which DOES `import
 * '@liteship/compiler'` — cannot leak the registration into this file's registry.
 *
 * `explain()` / `attrs()` need no host layer, so they must still work from core alone.
 */
import { describe, expect, test } from 'vitest';
import { defineAdaptive } from '@liteship/core';
import { hasTag } from '@liteship/error';

const spec = {
  boundary: {
    input: 'viewport.width',
    at: [
      [0, 'sm'],
      [768, 'md'],
    ],
  },
  style: {
    base: { properties: { color: 'black' } },
    states: { md: { properties: { color: 'white' } } },
  },
} as const;

describe('defineAdaptive from core alone — compiler seam unregistered', () => {
  test('explain() and attrs() work without any host layer', () => {
    const adaptive = defineAdaptive(spec);
    expect(adaptive.explain(800).boundary.state).toBe('md');
    expect(adaptive.attrs()['data-liteship-directive']).toBe('adaptive');
  });

  test('plan() throws a HostCapabilityError pointing at @liteship/compiler and the subpath', () => {
    const adaptive = defineAdaptive(spec);
    let thrown: unknown;
    try {
      adaptive.plan();
    } catch (e) {
      thrown = e;
    }
    expect(thrown, 'plan() must throw when the compiler seam is unregistered').toBeDefined();
    expect(hasTag(thrown, 'HostCapabilityError')).toBe(true);
    const message = (thrown as { message: string }).message;
    // Names the capability AND the subpath remediation — and does NOT tell the
    // consumer the bare `liteship` root loads the compiler (it deliberately does not).
    expect(message).toContain('@liteship/compiler');
    expect(message).toContain('liteship/compiler');
  });
});
