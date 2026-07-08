import { describe, expect, test } from 'vitest';
import { diagnoseBoundaryShadowing } from '../../../packages/vite/src/boundary-shadowing.js';

describe('boundary-shadowing diagnostic (#114)', () => {
  test('warns when a foreign rule shadows boundary output at equal specificity', () => {
    const boundary = '.hero { color: red; }';
    const foreign = '@media (min-width: 768px) { .hero { color: blue; } }';
    const warnings = diagnoseBoundaryShadowing(boundary, foreign, 'app.css');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('.hero');
    expect(warnings[0]).toContain('color');
  });

  test('stays quiet when selectors do not overlap', () => {
    const warnings = diagnoseBoundaryShadowing('.hero { color: red; }', '.footer { color: blue; }', 'app.css');
    expect(warnings).toEqual([]);
  });

  test('does not false-positive on substring selector names (.hero vs .hero-title)', () => {
    const warnings = diagnoseBoundaryShadowing('.hero { color: red; }', '.hero-title { color: blue; }', 'app.css');
    expect(warnings).toEqual([]);
  });
});
