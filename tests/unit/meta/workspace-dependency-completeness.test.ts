/**
 * Workspace dependency completeness — proof harness for the declared-import law.
 *
 * CI run 30157749762 failed the clean-checkout build with TS2307:
 * `packages/vite/src/hmr.ts` imported `@liteship/web` while `@liteship/vite`
 * did not declare it. A warm workspace resolves such an import through stale
 * links, so only a cold machine ever sees the hole. The authority under test
 * (scripts/lib/workspace-dependency-contract.ts, applied by
 * scripts/workspace-dependency-gate.ts) enumerates every workspace package's
 * source imports and rejects any STATIC workspace specifier the importer does
 * not declare. Dynamic-only edges are the designed optionality pattern (the
 * CLI's optional `@liteship/mcp-server` sibling) — enumerated in the receipt,
 * never blocking, never invisible.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { dynamicImportExemptions } from '../../../packages/cli/src/internal/liteship-audit-policy.js';
import {
  buildWorkspaceDependencyReceipt,
  evaluatePackageImports,
  moduleSpecifierEdges,
  specifierPackageName,
  type WorkspacePackageSubject,
} from '../../../scripts/lib/workspace-dependency-contract.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const WORKSPACE = new Set(['@fixture/vite', '@fixture/web', '@fixture/mcp-server']);
const VITE: WorkspacePackageSubject = { name: '@fixture/vite', dir: 'packages/vite', declared: ['@fixture/core'] };

describe('specifier classification', () => {
  it('extracts static, re-export, and dynamic edges with their binding', () => {
    const source = [
      "import { a } from '@fixture/web';",
      "export { b } from './local.js';",
      "type Remote = import('@fixture/web').Remote;",
      "const lazy = () => import('@fixture/mcp-server');",
    ].join('\n');
    expect(moduleSpecifierEdges('f.ts', source)).toEqual([
      { specifier: '@fixture/web', binding: 'static' },
      { specifier: './local.js', binding: 'static' },
      { specifier: '@fixture/web', binding: 'static' },
      { specifier: '@fixture/mcp-server', binding: 'dynamic' },
    ]);
  });

  it('maps subpaths to their owning package and ignores relative/node specifiers', () => {
    expect(specifierPackageName('@liteship/core/fs-walk')).toBe('@liteship/core');
    expect(specifierPackageName('liteship')).toBe('liteship');
    expect(specifierPackageName('./local.js')).toBeNull();
    expect(specifierPackageName('node:fs')).toBeNull();
  });
});

describe('completeness law — RED and GREEN', () => {
  it('RED (cure packet, run 30157749762): a static undeclared workspace import is a finding', () => {
    const { findings } = evaluatePackageImports(
      VITE,
      [{ file: 'packages/vite/src/hmr.ts', text: "import { morph } from '@fixture/web';" }],
      WORKSPACE,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      kind: 'undeclared-workspace-import',
      package: '@fixture/vite',
      file: 'packages/vite/src/hmr.ts',
      dependency: '@fixture/web',
    });
  });

  it('GREEN: a declared import is silent; a third-party import is out of scope', () => {
    const declared: WorkspacePackageSubject = { ...VITE, declared: ['@fixture/web'] };
    const { findings, optional } = evaluatePackageImports(
      declared,
      [
        {
          file: 'packages/vite/src/hmr.ts',
          text: "import { morph } from '@fixture/web';\nimport ts from 'typescript';",
        },
      ],
      WORKSPACE,
    );
    expect(findings).toHaveLength(0);
    expect(optional).toHaveLength(0);
  });

  it('a dynamic-only undeclared edge is enumerated as optional, not a finding', () => {
    const { findings, optional } = evaluatePackageImports(
      VITE,
      [{ file: 'packages/vite/src/lsp.ts', text: "const load = () => import('@fixture/mcp-server');" }],
      WORKSPACE,
      new Set(['@fixture/vite -> @fixture/mcp-server']),
    );
    expect(findings).toHaveLength(0);
    expect(optional).toEqual([
      { package: '@fixture/vite', file: 'packages/vite/src/lsp.ts', dependency: '@fixture/mcp-server' },
    ]);
  });

  it('an undeclared dynamic edge blocks unless the canonical policy explicitly exempts it', () => {
    const { findings, optional } = evaluatePackageImports(
      VITE,
      [{ file: 'packages/vite/src/lsp.ts', text: "const load = () => import('@fixture/mcp-server');" }],
      WORKSPACE,
    );
    expect(optional).toHaveLength(0);
    expect(findings).toEqual([
      expect.objectContaining({
        kind: 'undeclared-workspace-import-dynamic',
        package: '@fixture/vite',
        dependency: '@fixture/mcp-server',
      }),
    ]);
  });

  it('a dependency imported both dynamically and statically in one file blocks (static wins)', () => {
    const { findings, optional } = evaluatePackageImports(
      VITE,
      [
        {
          file: 'packages/vite/src/mixed.ts',
          text: "import type { T } from '@fixture/web';\nimport { v } from '@fixture/web';\nconst l = () => import('@fixture/web');",
        },
      ],
      WORKSPACE,
    );
    expect(findings).toHaveLength(1);
    expect(optional).toHaveLength(0);
  });
});

describe('live tree', () => {
  it('every static workspace import is declared, and the known optional seam stays enumerated', () => {
    const receipt = buildWorkspaceDependencyReceipt(REPO, dynamicImportExemptions);
    expect(receipt.findings).toEqual([]);
    // Non-vacuity: the fleet census must keep enumerating the packages and the
    // CLI's documented optional mcp-server seam. Zero subjects = broken enumerator.
    expect(receipt.subjects.length).toBeGreaterThanOrEqual(20);
    expect(
      receipt.optionalDynamicImports.some(
        (edge) => edge.package === '@liteship/cli' && edge.dependency === '@liteship/mcp-server',
      ),
    ).toBe(true);
    expect(receipt.imports.length).toBeGreaterThan(0);
    expect(receipt.censusDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });
});
