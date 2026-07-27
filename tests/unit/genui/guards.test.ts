/**
 * @liteship/genui guards — isPlainObject structural predicate (parse/validate owner).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { isPlainObject } from '../../../packages/genui/src/guards.js';

describe('isPlainObject', () => {
  it('is true for a plain object literal', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ name: 'Text', props: {} })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('is false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('is false for an array', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  it('rejects class instances so model-controlled input stays portable data', () => {
    class Widget {}
    expect(isPlainObject(new Widget())).toBe(false);
  });

  it('is false for a function', () => {
    expect(isPlainObject(() => {})).toBe(false);
    expect(isPlainObject(function named() {})).toBe(false);
  });

  it('is false for primitives and undefined', () => {
    expect(isPlainObject('str')).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});
