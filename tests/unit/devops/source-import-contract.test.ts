import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { forbiddenSourceImports, sourceRuntimeImports } from '../../../scripts/lib/source-import-contract.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(source: string): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-source-import-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'entry.ts'), source);
  return root;
}

const RULES = [
  { pattern: /^@liteship\//u, reason: 'workspace runtime package' },
  { pattern: /(?:^|\/)dist(?:\/|$)/u, reason: 'built output' },
] as const;

describe('source import contract', () => {
  it('finds static imports, re-exports, and literal dynamic imports', () => {
    const root = fixture(`
      import '@liteship/core';
      export { value } from '../dist/value.js';
      void import('@liteship/command');
    `);
    expect(forbiddenSourceImports(root, 'scripts/entry.ts', RULES)).toEqual([
      { specifier: '../dist/value.js', reason: 'built output' },
      { specifier: '@liteship/command', reason: 'workspace runtime package' },
      { specifier: '@liteship/core', reason: 'workspace runtime package' },
    ]);
  });

  it('ignores comments, strings, and allowed source imports', () => {
    const root = fixture(`
      // import '@liteship/core';
      const prose = "../dist/value.js";
      export { value } from './value.js';
      void prose;
    `);
    expect(forbiddenSourceImports(root, 'scripts/entry.ts', RULES)).toEqual([]);
  });

  it('is deterministic when a stateful regular expression is supplied', () => {
    const root = fixture("import '@liteship/core';\n");
    const globalRule = [{ pattern: /^@liteship\//gu, reason: 'workspace runtime package' }] as const;
    expect(forbiddenSourceImports(root, 'scripts/entry.ts', globalRule)).toEqual(
      forbiddenSourceImports(root, 'scripts/entry.ts', globalRule),
    );
  });

  it('projects only executable import edges in deterministic order', () => {
    const root = fixture(`
      import type { TypeOnly } from '@liteship/type-only';
      import '@liteship/zeta';
      export { value } from './value.js';
      void import('@liteship/alpha');
      type Local = TypeOnly;
      void (0 as unknown as Local);
    `);

    expect(sourceRuntimeImports(root, 'scripts/entry.ts')).toEqual(['./value.js', '@liteship/alpha', '@liteship/zeta']);
  });

  it('ignores import-shaped comments and string data', () => {
    const root = fixture(`
      // import '@liteship/comment';
      const sample = "export { value } from '@liteship/string'";
      export type { TypeOnly } from '@liteship/type-only';
      void sample;
    `);

    expect(sourceRuntimeImports(root, 'scripts/entry.ts')).toEqual([]);
  });

  it('returns the same structural projection across repeated parses', () => {
    const root = fixture("import '@liteship/core';\nexport { value } from './value.js';\n");
    const first = sourceRuntimeImports(root, 'scripts/entry.ts');
    const second = sourceRuntimeImports(root, 'scripts/entry.ts');
    expect(second).toEqual(first);
    expect(first).toEqual(['./value.js', '@liteship/core']);
  });
});
