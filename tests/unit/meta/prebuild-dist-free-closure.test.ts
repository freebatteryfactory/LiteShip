/**
 * Prebuild dist-free closure — proof harness for the cold-checkout import law.
 *
 * CI's plan job runs `tsx scripts/ci-plan.ts` on a clean checkout before any
 * workspace `dist/` exists. Between 2026-07-24 and 2026-07-27 this failed ten
 * of twenty CI runs through three different files (`assurance-inventory.ts`,
 * `evidence-requirements.ts`, `registry.ts`) — each cured individually while
 * the CLASS survived, because a warm local workspace (dist present) can never
 * observe the defect. The authority under test here
 * (scripts/lib/prebuild-closure-contract.ts, applied by
 * scripts/prebuild-dist-free-gate.ts) closes the class: it enumerates every
 * `tsx scripts/*.ts` workflow/lifecycle invocation, classifies how its job
 * provides dist (`none` | `build` | `artifact`), and walks the live import
 * closure of every cold entry, failing on any edge that resolves into a
 * workspace `dist/`.
 *
 * The harness proves the law on synthetic hosts (RED and GREEN), retains the
 * incident shape as a cure packet, pins the live tree green with a non-vacuous
 * census, and property-checks the walker's determinism.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolve } from 'node:path';
import {
  buildPrebuildClosureReceipt,
  enumerateLifecycleEntrypoints,
  enumerateWorkflowEntrypoints,
  expandRootCommandEntrypoints,
  liveModuleSpecifiers,
  resolveWorkspaceTarget,
  walkPrebuildClosure,
  type ClosureHost,
  type WorkspaceManifest,
} from '../../../scripts/lib/prebuild-closure-contract.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

/** In-memory host over a synthetic tree: path -> source, plus manifests. */
function syntheticHost(
  files: Readonly<Record<string, string>>,
  manifests: readonly WorkspaceManifest[] = [],
): ClosureHost {
  const byName = new Map(manifests.map((manifest) => [manifest.name, manifest]));
  return {
    readFile: (path) => files[path] ?? null,
    fileExists: (path) => path in files,
    workspaceManifest: (name) => byName.get(name) ?? null,
  };
}

const DIST_ONLY_ERROR: WorkspaceManifest = {
  name: '@fixture/error',
  dir: 'packages/error',
  exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
};

describe('workflow entrypoint enumeration (dist provisioning)', () => {
  const ROOT_SCRIPTS = {
    build: 'pnpm exec tsx scripts/native-tsc.ts -- --build',
    'assurance:gate': 'pnpm exec tsx scripts/assurance-inventory.ts',
  } as const;
  const WORKFLOW = [
    'name: fixture',
    'jobs:',
    '  cold-job:',
    '    steps:',
    '      - run: pnpm install --frozen-lockfile',
    '      - run: pnpm exec tsx scripts/cold.ts',
    '      - run: pnpm run build',
    '      - run: pnpm exec tsx scripts/warm.ts',
    '  artifact-job:',
    '    steps:',
    '      - uses: actions/download-artifact@v7',
    '        with:',
    '          name: frozen-release-artifacts',
    '          path: .',
    '      - run: pnpm exec tsx scripts/provisioned.ts',
    '  evidence-job:',
    '    steps:',
    '      - uses: actions/download-artifact@v7',
    '        with:',
    '          name: affected-plan',
    '          path: .liteship',
    '      - run: pnpm exec tsx scripts/still-cold.ts',
    '',
  ].join('\n');

  it('classifies before-build as cold and after-build as build-provisioned', () => {
    const entries = enumerateWorkflowEntrypoints('.github/workflows/fixture.yml', WORKFLOW, ROOT_SCRIPTS);
    const byScript = new Map(entries.map((entry) => [entry.script, entry.distProvision]));
    expect(byScript.get('scripts/cold.ts')).toBe('none');
    expect(byScript.get('scripts/native-tsc.ts')).toBe('none');
    expect(byScript.get('scripts/warm.ts')).toBe('build');
  });

  it('a download-artifact restoring the workspace root provisions dist; one into .liteship does not', () => {
    const entries = enumerateWorkflowEntrypoints('.github/workflows/fixture.yml', WORKFLOW, ROOT_SCRIPTS);
    const byScript = new Map(entries.map((entry) => [entry.script, entry.distProvision]));
    expect(byScript.get('scripts/provisioned.ts')).toBe('artifact');
    expect(byScript.get('scripts/still-cold.ts')).toBe('none');
  });

  it('lifecycle scripts are always cold (they run at install, before any build)', () => {
    const entries = enumerateLifecycleEntrypoints({
      scripts: { prepare: 'pnpm exec tsx scripts/hook.ts', build: 'tsc' },
    });
    expect(entries).toEqual([{ script: 'scripts/hook.ts', declaredBy: 'package.json#prepare', distProvision: 'none' }]);
  });

  it('recursively expands pnpm run wrappers so cold workflow scripts cannot hide behind package.json', () => {
    const workflow = [
      'jobs:',
      '  admission:',
      '    steps:',
      '      - run: pnpm install --frozen-lockfile',
      '      - run: pnpm run assurance:gate -- --require-semantic',
    ].join('\n');
    expect(enumerateWorkflowEntrypoints('.github/workflows/fixture.yml', workflow, ROOT_SCRIPTS)).toContainEqual({
      script: 'scripts/assurance-inventory.ts',
      declaredBy: '.github/workflows/fixture.yml#admission',
      distProvision: 'none',
    });
  });

  it('preserves command ordering inside wrapper scripts', () => {
    const expanded = expandRootCommandEntrypoints('pnpm run release-proof', 'fixture#job', {
      build: 'pnpm exec tsx scripts/native-tsc.ts -- --build',
      'release-proof': 'pnpm run build && pnpm exec tsx scripts/after-build.ts',
    });
    expect(expanded.entrypoints).toEqual([
      { script: 'scripts/native-tsc.ts', declaredBy: 'fixture#job', distProvision: 'none' },
      { script: 'scripts/after-build.ts', declaredBy: 'fixture#job', distProvision: 'build' },
    ]);
  });
});

describe('live specifier extraction (what tsx actually loads)', () => {
  it('keeps value imports, side-effect imports, and dynamic imports', () => {
    const source = [
      "import { a } from './a.js';",
      "import './side-effect.js';",
      "export { b } from './b.js';",
      "const lazy = async () => import('./lazy.js');",
    ].join('\n');
    expect(liveModuleSpecifiers('f.ts', source)).toEqual(['./a.js', './side-effect.js', './b.js', './lazy.js']);
  });

  it('erases type-only clauses and all-type named bindings (tsx never loads them)', () => {
    const source = [
      "import type { T } from './types-only.js';",
      "import { type U, type V } from './all-type.js';",
      "export type { W } from './type-reexport.js';",
      "import { type X, y } from './mixed.js';",
    ].join('\n');
    expect(liveModuleSpecifiers('f.ts', source)).toEqual(['./mixed.js']);
  });
});

describe('closure walk — RED and GREEN on synthetic trees', () => {
  it('RED: a value-import chain reaching a dist-only workspace export is a finding with its chain', () => {
    const host = syntheticHost(
      {
        'scripts/entry.ts': "import { helper } from './lib/helper.js';",
        'scripts/lib/helper.ts': "import { boom } from '@fixture/error';\nexport const helper = boom;",
      },
      [DIST_ONLY_ERROR],
    );
    const { findings } = walkPrebuildClosure(
      [{ script: 'scripts/entry.ts', declaredBy: 'fixture#job', distProvision: 'none' }],
      host,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      kind: 'dist-import',
      importer: 'scripts/lib/helper.ts',
      specifier: '@fixture/error',
      resolved: 'packages/error/dist/index.js',
      chain: ['scripts/entry.ts', 'scripts/lib/helper.ts'],
    });
  });

  it('GREEN: the same chain with a type-only import has no finding', () => {
    const host = syntheticHost(
      {
        'scripts/entry.ts': "import { helper } from './lib/helper.js';",
        'scripts/lib/helper.ts': "import type { Boom } from '@fixture/error';\nexport const helper = (x: Boom) => x;",
      },
      [DIST_ONLY_ERROR],
    );
    const { findings } = walkPrebuildClosure(
      [{ script: 'scripts/entry.ts', declaredBy: 'fixture#job', distProvision: 'none' }],
      host,
    );
    expect(findings).toHaveLength(0);
  });

  it('an unresolvable relative import is its own finding kind (never silently skipped)', () => {
    const host = syntheticHost({ 'scripts/entry.ts': "import { gone } from './missing.js';" });
    const { findings } = walkPrebuildClosure(
      [{ script: 'scripts/entry.ts', declaredBy: 'fixture#job', distProvision: 'none' }],
      host,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('unresolvable-import');
  });

  it('cure packet (CI runs 30263467365 / 30156066346 / 30157571443): a projection script whose registry value-imports a dist-only error package', () => {
    // The retained shape of the incident: scripts/ci-plan.ts -> registry.ts ->
    // @liteship/error -> packages/error/dist/index.js on a checkout with no dist.
    const host = syntheticHost(
      {
        'scripts/ci-plan.ts': "import { REGISTRY } from '../packages/command/src/checks/registry.js';",
        'packages/command/src/checks/registry.ts':
          "import { ValidationError } from '@fixture/error';\nexport const REGISTRY = [ValidationError];",
      },
      [DIST_ONLY_ERROR],
    );
    const { findings } = walkPrebuildClosure(
      [{ script: 'scripts/ci-plan.ts', declaredBy: 'ci.yml#plan', distProvision: 'none' }],
      host,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.importer).toBe('packages/command/src/checks/registry.ts');
  });
});

describe('workspace export resolution', () => {
  it('resolves subpath exports through import/default conditions', () => {
    const manifest: WorkspaceManifest = {
      name: '@fixture/core',
      dir: 'packages/core',
      exports: {
        '.': { import: './dist/index.js' },
        './fs-walk': { types: './dist/fs-walk.d.ts', default: './dist/fs-walk.js' },
      },
    };
    expect(resolveWorkspaceTarget(manifest, '')).toBe('packages/core/dist/index.js');
    expect(resolveWorkspaceTarget(manifest, 'fs-walk')).toBe('packages/core/dist/fs-walk.js');
  });

  it('falls back to main when no exports map exists', () => {
    expect(resolveWorkspaceTarget({ name: 'x', dir: 'packages/x', main: './dist/index.js' }, '')).toBe(
      'packages/x/dist/index.js',
    );
  });
});

describe('walker determinism (property)', () => {
  it('a dist edge at any depth yields exactly one finding whose chain length equals the depth', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),
        (depth, decoys) => {
          const files: Record<string, string> = {};
          for (let level = 0; level < depth; level += 1) {
            const next =
              level === depth - 1
                ? "import { boom } from '@fixture/error';\nexport const v = boom;"
                : `import { v } from './m${level + 1}.js';\nexport { v };`;
            const decoy = decoys[level]! ? "\nimport type { T } from '@fixture/error';" : '';
            files[`scripts/m${level}.ts`] = next + decoy;
          }
          const { findings } = walkPrebuildClosure(
            [{ script: 'scripts/m0.ts', declaredBy: 'fixture#job', distProvision: 'none' }],
            syntheticHost(files, [DIST_ONLY_ERROR]),
          );
          expect(findings).toHaveLength(1);
          expect(findings[0]!.chain).toHaveLength(depth);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('live tree', () => {
  it('the current head has zero cold dist-reaching imports and a non-vacuous census', () => {
    const receipt = buildPrebuildClosureReceipt(REPO);
    expect(receipt.findings).toEqual([]);
    // Non-vacuity: direct workflow entrypoints, package-script wrappers, and
    // lifecycle hooks must all remain visible. Losing any family makes the
    // gate opaque rather than green.
    const cold = receipt.entrypoints.filter((entry) => entry.distProvision === 'none');
    const built = receipt.entrypoints.filter((entry) => entry.distProvision === 'build');
    expect(cold.map((entry) => entry.script)).toContain('scripts/ci-plan.ts');
    expect(built.map((entry) => entry.script)).toContain('scripts/assurance-inventory.ts');
    expect(built.map((entry) => entry.script)).toContain('scripts/verify-affected-result-evidence.ts');
    expect(cold.some((entry) => entry.declaredBy.startsWith('package.json#'))).toBe(true);
    expect(receipt.censusDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(receipt.closure.length).toBeGreaterThan(0);
  });
});
