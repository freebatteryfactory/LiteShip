/**
 * @czap/genui brands — ContentAddress validation (spine-reanchored).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { ContentAddress, isContentAddress } from '../../../packages/genui/src/brands.js';

describe('@czap/genui brands', () => {
  test('isContentAddress accepts canonical fnv1a addresses', () => {
    expect(isContentAddress('fnv1a:00000001')).toBe(true);
    expect(isContentAddress('fnv1a:abcdef12')).toBe(true);
  });

  test('isContentAddress rejects malformed addresses', () => {
    expect(isContentAddress('sha256:abc')).toBe(false);
    expect(isContentAddress('fnv1a:ABCDEF12')).toBe(false);
    expect(isContentAddress('fnv1a:123')).toBe(false);
  });

  test('ContentAddress constructor validates and returns branded value', () => {
    expect(ContentAddress('fnv1a:deadbeef')).toBe('fnv1a:deadbeef');
    expect(() => ContentAddress('not-an-address')).toThrow(/expected fnv1a/);
  });
});
