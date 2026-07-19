/**
 * string-distance owner pins — the Levenshtein table + nearest-match picker the
 * assets / scene / command "did you mean?" copies relied on ([DUP] Wave 7). The
 * three former policies diverged ONLY in the acceptance threshold; the
 * parameterized cases below prove each is preserved by a caller-supplied threshold.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { editDistance, closestMatch } from '@liteship/core';

describe('editDistance', () => {
  it('is 0 for identical strings and equals the length against an empty string', () => {
    expect(editDistance('abc', 'abc')).toBe(0);
    expect(editDistance('', '')).toBe(0);
    expect(editDistance('', 'abc')).toBe(3);
    expect(editDistance('abc', '')).toBe(3);
  });

  it('counts a single substitution / insertion / deletion as one edit', () => {
    expect(editDistance('cat', 'cot')).toBe(1); // substitute
    expect(editDistance('cat', 'cats')).toBe(1); // insert
    expect(editDistance('cats', 'cat')).toBe(1); // delete
  });

  it('matches the classic Levenshtein reference values (symmetric)', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('sitting', 'kitten')).toBe(3);
    expect(editDistance('intro-bd', 'intro-bed')).toBe(1);
  });
});

describe('closestMatch — deterministic tie-breaking', () => {
  it('returns the nearest candidate, first-in-input-order on a distance tie', () => {
    // 'cat' and 'hat' are both distance 1 from 'bat' — the first listed wins.
    expect(closestMatch('bat', ['cat', 'hat'], 2)).toBe('cat');
    expect(closestMatch('bat', ['hat', 'cat'], 2)).toBe('hat');
  });

  it('returns undefined when nothing is within threshold, or the list is empty', () => {
    expect(closestMatch('bat', [], 3)).toBeUndefined();
    expect(closestMatch('zzzz', ['alpha', 'beta'], 2)).toBeUndefined();
  });
});

describe('closestMatch — subsumes the three former threshold policies', () => {
  // The assets registry's length-scaled policy: min(2, ⌊len/3⌋), floored at 1.
  const assetsThreshold = (id: string): number => Math.max(1, Math.min(2, Math.floor(id.length / 3)));

  it('assets policy — min(2, ⌊len/3⌋): suggests a near typo, stays silent on a far miss', () => {
    const ids = ['intro-bed', 'beats', 'drop'];
    // 'intro-bd' (len 8 → threshold 2) is distance 1 from 'intro-bed' → suggested.
    expect(closestMatch('intro-bd', ids, assetsThreshold('intro-bd'))).toBe('intro-bed');
    // 'xyz' (len 3 → threshold 1) is far from every id → silent (the doc's example).
    expect(closestMatch('xyz', ['beats', 'drop'], assetsThreshold('xyz'))).toBeUndefined();
  });

  it('command policy — distance <= 3: accepts exactly at the boundary, rejects beyond it', () => {
    expect(closestMatch('glossry', ['glossary', 'help', 'describe'], 3)).toBe('glossary'); // distance 1
    expect(closestMatch('abc', ['abcdef'], 3)).toBe('abcdef'); // distance 3 — accepted at <= 3
    expect(closestMatch('abc', ['abcdefg'], 3)).toBeUndefined(); // distance 4 — beyond 3
  });

  it('scene policy — distance <= 2: accepts a 1–2 edit typo, rejects a distance-3 miss', () => {
    expect(closestMatch('introo', ['intro', 'outro'], 2)).toBe('intro'); // distance 1
    expect(closestMatch('ab', ['abcd'], 2)).toBe('abcd'); // distance 2 — accepted at <= 2
    expect(closestMatch('abc', ['abcdef'], 2)).toBeUndefined(); // distance 3 — the scene reject
  });
});
