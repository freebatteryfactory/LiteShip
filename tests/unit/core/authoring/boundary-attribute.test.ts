/**
 * CUT A4 — `BoundaryAttribute.isAllowedKey`: the shared predicate for which
 * attribute keys may cross the boundary/runtime projection seam (ARIA / data).
 * Homed in `@liteship/core` so `@liteship/compiler` (ARIA compilation) and `@liteship/astro`
 * (runtime boundary attributes) consume one law instead of keeping two
 * same-shape copies in sync by hand.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { BoundaryAttribute } from '@liteship/core';

describe('BoundaryAttribute.isAllowedKey', () => {
  it('accepts any aria-* prefixed attribute', () => {
    expect(BoundaryAttribute.isAllowedKey('aria-expanded')).toBe(true);
    expect(BoundaryAttribute.isAllowedKey('aria-label')).toBe(true);
    expect(BoundaryAttribute.isAllowedKey('aria-hidden')).toBe(true);
    // Bare prefix matches — parity with the predicate this unifies (startsWith).
    expect(BoundaryAttribute.isAllowedKey('aria-')).toBe(true);
  });

  it('accepts the exact role key', () => {
    expect(BoundaryAttribute.isAllowedKey('role')).toBe(true);
  });

  it('rejects non-boundary / unsafe attribute keys', () => {
    for (const key of [
      'class',
      'onclick',
      'style',
      'id',
      'href',
      'data-liteship-boundary',
      'roles', // not the exact 'role'
      'role ', // trailing space
      'ARIA-label', // case-sensitive: not 'aria-'
      '--liteship-x', // CSS var, not an attribute key
      '',
    ]) {
      expect(BoundaryAttribute.isAllowedKey(key), `expected ${JSON.stringify(key)} rejected`).toBe(false);
    }
  });
});
