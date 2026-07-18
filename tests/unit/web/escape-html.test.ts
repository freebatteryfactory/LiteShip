import { describe, expect, test } from 'vitest';
import { escapeHtml } from '../../../packages/web/src/security/html-trust.js';

describe('escapeHtml', () => {
  test('escapes the five HTML metacharacters to their named/numeric entities', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  test('replaces ampersand first so later replacements are not double-escaped', () => {
    // If `&` were escaped after `<`, the `&` in `&lt;` would become `&amp;lt;`.
    expect(escapeHtml('<b>a & b</b>')).toBe('&lt;b&gt;a &amp; b&lt;/b&gt;');
    expect(escapeHtml('a<b')).toBe('a&lt;b');
  });

  test('neutralises an attribute-breakout / script-injection payload', () => {
    expect(escapeHtml('" onload="alert(1)')).toBe('&quot; onload=&quot;alert(1)');
    expect(escapeHtml('<script>bad()</script>')).toBe('&lt;script&gt;bad()&lt;/script&gt;');
  });

  test('leaves strings without metacharacters unchanged', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml('plain text 123')).toBe('plain text 123');
  });
});
