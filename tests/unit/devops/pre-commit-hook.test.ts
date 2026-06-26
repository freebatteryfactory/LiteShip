import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('pre-commit hook docs gate trigger', () => {
  test('docs check watches deleted API inputs and spine declaration changes', () => {
    const source = readFileSync(resolve(REPO, 'scripts/pre-commit.sh'), 'utf8');

    expect(source).toContain('--diff-filter=ACMRD');
    expect(source).toContain('packages/[^/]+/src/.*\\.ts');
    expect(source).toContain('packages/_spine/.*\\.d\\.ts');
    expect(source).toContain('packages/_spine/typedoc-entry\\.ts');
    expect(source).toContain('typedoc\\.json');
    expect(source).toContain('docs/api/');
    expect(source).toContain('pnpm run docs:check');
  });
});
