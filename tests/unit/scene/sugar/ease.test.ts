import { describe, it, expect } from 'vitest';
import { ease, easeFnFor } from '@liteship/scene';

describe('ease', () => {
  it('cubic: 0 -> 0, 1 -> 1, monotonic increasing', () => {
    expect(ease.cubic(0)).toBe(0);
    expect(ease.cubic(1)).toBe(1);
    expect(ease.cubic(0.3) < ease.cubic(0.6)).toBe(true);
  });
  it('spring overshoots 1 briefly then settles near 1', () => {
    const peak = Math.max(ease.spring(0.3), ease.spring(0.4), ease.spring(0.5));
    expect(peak).toBeGreaterThan(1);
    expect(ease.spring(1)).toBeCloseTo(1, 1);
  });
  it('bounce is nonnegative and ends near 1', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(ease.bounce(t)).toBeGreaterThanOrEqual(0);
    }
    expect(ease.bounce(1)).toBeCloseTo(1, 2);
  });
  it('stepped(8) quantizes into discrete levels', () => {
    const step = ease.stepped(8);
    expect(step(0)).toBe(0);
    expect(step(1)).toBe(1);
    const distinct = new Set([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(step)).size;
    expect(distinct).toBeLessThanOrEqual(9);
  });
});

describe('easeFnFor', () => {
  it('maps each named tag to its catalog function', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(easeFnFor('cubic')(t)).toBe(ease.cubic(t));
      expect(easeFnFor('spring')(t)).toBe(ease.spring(t));
      expect(easeFnFor('bounce')(t)).toBe(ease.bounce(t));
    }
  });

  it('builds the step quantizer from a { stepped } tag', () => {
    const fn = easeFnFor({ stepped: 4 });
    expect(fn(0.4)).toBe(0.25);
    expect(fn(0.9)).toBe(0.75);
    expect(fn(1)).toBe(1);
  });
});
