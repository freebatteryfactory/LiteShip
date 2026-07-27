// @vitest-environment node
/**
 * PROVES: the concrete cold-CI failures that escaped a warm checkout remain
 * replayable CurePackets. Each case keeps the historical defect input and the
 * repaired form side by side so future refactors must preserve the detector's
 * useful distinction rather than merely keeping its synthetic canary green.
 */

import { describe, expect, test } from 'vitest';
import {
  walkPrebuildClosure,
  type ClosureHost,
  type WorkspaceManifest,
} from '../../scripts/lib/prebuild-closure-contract.js';
import { scanWorkflowOutputHeredocs } from '../../scripts/lib/workflow-output-contract.js';
import {
  evaluatePackageImports,
  type WorkspacePackageSubject,
} from '../../scripts/lib/workspace-dependency-contract.js';

const manifest = (name: string, dir: string): WorkspaceManifest => ({
  name,
  dir,
  exports: { '.': { import: './dist/index.js' } },
});

function sourceHost(files: Readonly<Record<string, string>>, manifests: readonly WorkspaceManifest[]): ClosureHost {
  const byName = new Map(manifests.map((entry) => [entry.name, entry]));
  return {
    readFile: (path) => files[path] ?? null,
    fileExists: (path) => Object.hasOwn(files, path),
    workspaceManifest: (name) => byName.get(name) ?? null,
  };
}

const importer: WorkspacePackageSubject = Object.freeze({
  name: '@liteship/vite',
  dir: 'packages/vite',
  declared: Object.freeze([]),
});

describe('CI run 30263467365 — planner loaded a built error package before build', () => {
  const errorManifest = manifest('@liteship/error', 'packages/error');

  test('historical registry value import reaches dist on a cold checkout', () => {
    const files = {
      'scripts/ci-plan.ts': "import { CHECK_REGISTRY } from '../packages/command/src/checks/registry.js';",
      'packages/command/src/checks/registry.ts':
        "import { ValidationError } from '@liteship/error';\nexport const CHECK_REGISTRY = ValidationError;",
    };
    const result = walkPrebuildClosure(
      [{ script: 'scripts/ci-plan.ts', declaredBy: 'ci.yml#plan', distProvision: 'none' }],
      sourceHost(files, [errorManifest]),
    );
    expect(result.findings).toEqual([
      {
        kind: 'dist-import',
        importer: 'packages/command/src/checks/registry.ts',
        specifier: '@liteship/error',
        resolved: 'packages/error/dist/index.js',
        chain: ['scripts/ci-plan.ts', 'packages/command/src/checks/registry.ts'],
      },
    ]);
  });

  test('a local static-invariant error keeps the planner closure cold-safe', () => {
    const files = {
      'scripts/ci-plan.ts': "import { CHECK_REGISTRY } from '../packages/command/src/checks/registry.js';",
      'packages/command/src/checks/registry.ts':
        "export const CHECK_REGISTRY = (() => { throw new TypeError('invalid static registry'); })();",
    };
    const result = walkPrebuildClosure(
      [{ script: 'scripts/ci-plan.ts', declaredBy: 'ci.yml#plan', distProvision: 'none' }],
      sourceHost(files, [errorManifest]),
    );
    expect(result.findings).toEqual([]);
    expect(result.closure).toEqual(['packages/command/src/checks/registry.ts', 'scripts/ci-plan.ts']);
  });

  test('the same dist import is admissible only when the invocation proves a prior build', () => {
    const files = {
      'scripts/admit.ts': "import { ValidationError } from '@liteship/error';\nvoid ValidationError;",
    };
    const result = walkPrebuildClosure(
      [{ script: 'scripts/admit.ts', declaredBy: 'ci.yml#admit', distProvision: 'build' }],
      sourceHost(files, [errorManifest]),
    );
    expect(result.findings).toEqual([]);
    expect(result.closure).toEqual([]);
  });
});

describe('CI run 30263467365 — PLAN_EOF masked the planner failure', () => {
  const opener = 'echo "matrix<<PLAN_EOF" >> "$GITHUB_OUTPUT"';
  const closer = 'echo "PLAN_EOF"';

  test('the escaped multiline form reports the fallible command itself', () => {
    const result = scanWorkflowOutputHeredocs(
      '.github/workflows/ci.yml',
      [opener, 'pnpm exec tsx scripts/ci-plan.ts', closer].join('\n'),
    );
    expect(result.findings).toEqual([
      {
        file: '.github/workflows/ci.yml',
        openLine: 1,
        delimiter: 'PLAN_EOF',
        kind: 'fallible-interior-command',
        line: 2,
        text: 'pnpm exec tsx scripts/ci-plan.ts',
      },
    ]);
  });

  test('wrapping the same defect in a shell group cannot hide it', () => {
    const result = scanWorkflowOutputHeredocs(
      '.github/workflows/ci.yml',
      ['{', opener, 'pnpm exec tsx scripts/ci-plan.ts', closer, '} >> "$GITHUB_OUTPUT"'].join('\n'),
    );
    expect(result.findings).toContainEqual(expect.objectContaining({ kind: 'fallible-interior-command', line: 3 }));
  });

  test('compute-then-emit has no multiline protocol to corrupt', () => {
    const result = scanWorkflowOutputHeredocs(
      '.github/workflows/ci.yml',
      [
        'matrix_json="$(pnpm exec tsx scripts/ci-plan.ts)"',
        'printf \'matrix=%s\\n\' "$matrix_json" >> "$GITHUB_OUTPUT"',
      ].join('\n'),
    );
    expect(result.subjects).toEqual([]);
    expect(result.findings).toEqual([]);
  });
});

describe('CI run 30157749762 — Vite imported an undeclared workspace sibling', () => {
  const workspace = new Set(['@liteship/vite', '@liteship/web']);
  const source = [
    {
      file: 'packages/vite/src/hmr.ts',
      text: "import { morph } from '@liteship/web';\nexport const hmr = morph;",
    },
  ];

  test('the warm-resolvable undeclared import is a blocking finding', () => {
    const result = evaluatePackageImports(importer, source, workspace);
    expect(result.findings).toEqual([
      {
        kind: 'undeclared-workspace-import',
        package: '@liteship/vite',
        file: 'packages/vite/src/hmr.ts',
        specifier: '@liteship/web',
        dependency: '@liteship/web',
      },
    ]);
    expect(result.imports).toEqual([
      expect.objectContaining({
        dependency: '@liteship/web',
        binding: 'static',
        declared: false,
      }),
    ]);
  });

  test('declaring the exact sibling repairs the edge without suppressing its census row', () => {
    const declared = { ...importer, declared: Object.freeze(['@liteship/web']) };
    const result = evaluatePackageImports(declared, source, workspace);
    expect(result.findings).toEqual([]);
    expect(result.imports).toEqual([
      expect.objectContaining({
        dependency: '@liteship/web',
        declared: true,
        exempt: false,
      }),
    ]);
  });

  test('a dynamic import is still blocking without the canonical optional-edge capability', () => {
    const result = evaluatePackageImports(
      importer,
      [{ file: 'packages/vite/src/hmr.ts', text: "void import('@liteship/web');" }],
      workspace,
    );
    expect(result.findings).toEqual([
      expect.objectContaining({ kind: 'undeclared-workspace-import-dynamic', dependency: '@liteship/web' }),
    ]);
    expect(result.optional).toEqual([]);
  });

  test('the explicit optional-edge capability is narrow and remains enumerated', () => {
    const result = evaluatePackageImports(
      importer,
      [{ file: 'packages/vite/src/hmr.ts', text: "void import('@liteship/web');" }],
      workspace,
      new Set(['@liteship/vite -> @liteship/web']),
    );
    expect(result.findings).toEqual([]);
    expect(result.optional).toEqual([
      {
        package: '@liteship/vite',
        file: 'packages/vite/src/hmr.ts',
        dependency: '@liteship/web',
      },
    ]);
  });
});
