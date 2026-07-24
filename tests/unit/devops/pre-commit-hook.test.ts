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
    expect(source).toContain('pnpm run docs:check:fast');
    expect(source).not.toMatch(/pnpm run docs:check(?:\s|$)/);
  });

  test('keeps the cheap local sentinel and the exact CI TypeDoc authority as distinct layers', () => {
    const packageJson = JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const docsCheck = readFileSync(resolve(REPO, 'scripts/docs-check.ts'), 'utf8');

    expect(packageJson.scripts['docs:check:fast']).toContain('docs-input-fingerprint.ts');
    expect(packageJson.scripts['docs:build']).toMatch(/typedoc.*docs-input-fingerprint\.ts --write/);
    expect(docsCheck).toContain('assertTypeDocInputFingerprint(REPO_ROOT)');
    expect(docsCheck).toContain("spawnSync('pnpm', ['exec', 'typedoc'");
    expect(docsCheck.indexOf('assertTypeDocInputFingerprint(REPO_ROOT)')).toBeLessThan(
      docsCheck.indexOf("spawnSync('pnpm', ['exec', 'typedoc'"),
    );
  });
});
