import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('pre-commit hook ownership', () => {
  test('the installed hook is a stable wrapper around tracked policy', () => {
    const wrapper = readFileSync(resolve(REPO, 'scripts/pre-commit-wrapper.sh'), 'utf8');
    const source = readFileSync(resolve(REPO, 'scripts/pre-commit.sh'), 'utf8');
    const linker = readFileSync(resolve(REPO, 'scripts/link-pre-commit.ts'), 'utf8');

    expect(wrapper).toContain('scripts/pre-commit.sh');
    expect(linker).toContain("'pre-commit-wrapper.sh'");
    expect(source).toContain('pnpm preflight --staged');
    expect(source).not.toContain('pnpm run build');
    expect(source).not.toContain('pnpm run typecheck');
  });

  test('keeps the cheap fingerprint, local full proof, and CI authority distinct', () => {
    const packageJson = JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const docsCheck = readFileSync(resolve(REPO, 'scripts/docs-check.ts'), 'utf8');

    expect(packageJson.scripts['docs:check:fast']).toContain('docs-input-fingerprint.ts');
    expect(packageJson.scripts['docs:check:local']).toBe('pnpm run docs:check');
    expect(packageJson.scripts['docs:build']).toMatch(/typedoc.*docs-input-fingerprint\.ts --write/);
    expect(docsCheck).toContain('assertTypeDocInputFingerprint(REPO_ROOT)');
    expect(docsCheck).toContain("spawnSync('pnpm', ['exec', 'typedoc'");
    expect(docsCheck.indexOf('assertTypeDocInputFingerprint(REPO_ROOT)')).toBeLessThan(
      docsCheck.indexOf("spawnSync('pnpm', ['exec', 'typedoc'"),
    );
  });
});
