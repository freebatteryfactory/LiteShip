/**
 * HTML scan tests -- comment and code-block blanking for macro safety.
 */

import { describe, expect, test } from 'vitest';
import { blankHtmlCommentsAndCodeBlocks, lineOfOffset } from '../../../packages/vite/src/html-scan.js';

describe('blankHtmlCommentsAndCodeBlocks', () => {
  test('blanks data-czap macros inside HTML comments while preserving offsets', () => {
    const source = [
      '<!-- teaching: data-czap="viewport" is the macro label -->',
      '<div data-czap="viewport"></div>',
    ].join('\n');
    const blanked = blankHtmlCommentsAndCodeBlocks(source);
    expect(blanked.length).toBe(source.length);
    expect([...blanked.matchAll(/data-czap="/g)]).toHaveLength(1);
    expect(source).toContain('<!-- teaching: data-czap="viewport"');
  });

  test('blanks data-czap macros inside pre/code samples while preserving offsets', () => {
    const source = [
      '<pre><code>&lt;div data-czap="viewport"&gt;</code></pre>',
      '<section data-czap="hero"></section>',
    ].join('\n');
    const blanked = blankHtmlCommentsAndCodeBlocks(source);
    expect(blanked.length).toBe(source.length);
    expect([...blanked.matchAll(/data-czap="/g)]).toHaveLength(1);
    expect(source).toContain('data-czap="viewport"');
  });
});

describe('lineOfOffset', () => {
  test('returns 1-based line numbers', () => {
    expect(lineOfOffset('a\nb\nc', 0)).toBe(1);
    expect(lineOfOffset('a\nb\nc', 2)).toBe(2);
    expect(lineOfOffset('a\nb\nc', 4)).toBe(3);
  });
});
