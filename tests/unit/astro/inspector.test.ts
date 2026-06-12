/**
 * Dev inspector pure helpers — threshold rewrite and Boundary.make snippets.
 */

import { describe, expect, test } from 'vitest';
import { boundaryParseFailureMessage } from '../../../packages/astro/src/runtime/boundary.js';
import { formatBoundaryMakeSnippet, rewriteBoundaryThreshold } from '../../../packages/astro/src/runtime/inspector.js';

const boundaryJson = JSON.stringify({
  id: 'hero',
  input: 'viewport.width',
  thresholds: [0, 768, 1200],
  states: ['compact', 'wide', 'xl'],
  hysteresis: 20,
});

describe('rewriteBoundaryThreshold', () => {
  test('rewrites an interior threshold while preserving monotonic order', () => {
    const next = rewriteBoundaryThreshold(boundaryJson, 1, 800);
    expect(next).not.toBeNull();
    const parsed = JSON.parse(next!) as { thresholds: number[] };
    expect(parsed.thresholds).toEqual([0, 800, 1200]);
  });

  test('rejects rewrites that break monotonic thresholds', () => {
    expect(rewriteBoundaryThreshold(boundaryJson, 1, 0)).toBeNull();
    expect(rewriteBoundaryThreshold(boundaryJson, 2, 700)).toBeNull();
  });

  test('rejects fixed endpoints and malformed JSON', () => {
    expect(rewriteBoundaryThreshold(boundaryJson, 0, 100)).toBeNull();
    expect(rewriteBoundaryThreshold('{not json', 1, 800)).toBeNull();
  });
});

describe('formatBoundaryMakeSnippet', () => {
  test('formats a paste-ready Boundary.make call', () => {
    const snippet = formatBoundaryMakeSnippet(boundaryJson);
    expect(snippet).toContain("input: 'viewport.width'");
    expect(snippet).toContain("[0, 'compact']");
    expect(snippet).toContain("[768, 'wide']");
    expect(snippet).toContain('hysteresis: 20');
    expect(snippet.startsWith('Boundary.make({')).toBe(true);
  });
});

describe('boundaryParseFailureMessage (inspector honesty)', () => {
  test('matches the runtime diagnostic for invalid JSON', () => {
    expect(boundaryParseFailureMessage('{bad')).toContain('not valid JSON');
  });
});
