import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'fast-glob';
import { describe, expect, it } from 'vitest';
import { scanCssIdentitySurface, type CssIdentitySource } from '@liteship/audit';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/** Post-2.6 live census: two core lowerers plus the compiler's generated default selector. */
const POST_2_6_CSS_IDENTITY_ANCHOR_FLOOR = 3;

function source(text: string, path = 'packages/example/src/example.ts'): CssIdentitySource {
  return { path, text };
}

function scan(text: string) {
  return scanCssIdentitySurface([source(text)]);
}

function liveSources(): readonly CssIdentitySource[] {
  return globSync('packages/*/src/**/*.ts', { cwd: REPO_ROOT, onlyFiles: true })
    .sort((left, right) => left.localeCompare(right))
    .map((path) => ({ path, text: readFileSync(resolve(REPO_ROOT, path), 'utf8') }));
}

describe('CSS identity interpolation must be escaped', () => {
  it('the live packages/*/src corpus has no unescaped boundary interpolation', () => {
    const result = scanCssIdentitySurface(liveSources());
    expect(result.findings).toEqual([]);
  });

  it('a direct escapeCssString call is admitted', () => {
    const result = scan('const selector = `[data-liteship-boundary="${escapeCssString(name)}"]`;');
    expect(result.anchoredCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it('a same-scope const bound directly to escapeCssString is admitted', () => {
    const result = scan(
      'const escaped = escapeCssString(name);\nconst selector = `[data-liteship-boundary="${escaped}"]`;',
    );
    expect(result.anchoredCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it('a bare identifier interpolated into a boundary selector is a finding', () => {
    const result = scan('const selector = `[data-liteship-boundary="${name}"]`;');
    expect(result.findings).toEqual([
      expect.objectContaining({ reason: 'unescaped-interpolation', expression: 'name' }),
    ]);
  });

  it('a member expression is a finding, not an unclassified pass', () => {
    const result = scan('const selector = `[data-liteship-boundary="${model.name}"]`;');
    expect(result.findings).toEqual([
      expect.objectContaining({ reason: 'unescaped-interpolation', expression: 'model.name' }),
    ]);
  });

  it('a nested call around escapeCssString is a finding', () => {
    const result = scan('const selector = `[data-liteship-boundary="${normalize(escapeCssString(name))}"]`;');
    expect(result.findings).toEqual([
      expect.objectContaining({
        reason: 'unescaped-interpolation',
        expression: 'normalize(escapeCssString(name))',
      }),
    ]);
  });

  it('an unclosed quoted identity is a finding even when its interpolation is escaped', () => {
    const result = scan('const selector = `[data-liteship-boundary="${escapeCssString(name)}`;');
    expect(result.findings).toEqual([expect.objectContaining({ reason: 'unclosed-quoted-identity' })]);
  });

  it('the live scan sees the named post-2.6 non-vacuity floor', () => {
    const result = scanCssIdentitySurface(liveSources());
    expect(result.anchoredCount).toBeGreaterThanOrEqual(POST_2_6_CSS_IDENTITY_ANCHOR_FLOOR);
  });
});
