// @vitest-environment node
/**
 * PROVES: cold-checkout CI authorities remain total, deterministic, and
 * fail-closed across command ordering, shell-output protocols, and workspace
 * import syntax. These properties exercise the state space around the exact
 * failures from CI runs 30157749762 and 30263467365 rather than restating the
 * five live-tree gates.
 */

import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  enumerateLifecycleEntrypoints,
  enumerateWorkflowEntrypoints,
  expandRootCommandEntrypoints,
  liveModuleSpecifiers,
} from '../../scripts/lib/prebuild-closure-contract.js';
import { scanWorkflowOutputHeredocs } from '../../scripts/lib/workflow-output-contract.js';
import {
  evaluatePackageImports,
  moduleSpecifierEdges,
  specifierPackageName,
  type WorkspacePackageSubject,
} from '../../scripts/lib/workspace-dependency-contract.js';

const ROOT_SCRIPTS = Object.freeze({
  build: 'pnpm exec tsx scripts/native-tsc.ts -- --build',
  cold: 'pnpm exec tsx scripts/cold.ts',
  warm: 'pnpm exec tsx scripts/warm.ts',
  nested: 'pnpm run build && pnpm run warm',
});

const packageSubject = (name: string, declared: readonly string[] = []): WorkspacePackageSubject =>
  Object.freeze({
    name,
    dir: `packages/${name.replace('@fixture/', '')}`,
    declared: Object.freeze([...declared]),
  });

describe('package-script expansion laws', () => {
  test('build position partitions cold and warm entrypoints for every sequence', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<'cold' | 'build' | 'warm'>('cold', 'build', 'warm'), {
          minLength: 1,
          maxLength: 30,
        }),
        (commands) => {
          const expanded = expandRootCommandEntrypoints(
            commands.map((command) => `pnpm run ${command}`).join(' && '),
            'fixture#ordering',
            ROOT_SCRIPTS,
          );
          let built = false;
          let cursor = 0;
          for (const command of commands) {
            if (command === 'build') {
              expect(expanded.entrypoints[cursor]).toMatchObject({
                script: 'scripts/native-tsc.ts',
                distProvision: built ? 'build' : 'none',
              });
              built = true;
            } else {
              expect(expanded.entrypoints[cursor]).toMatchObject({
                script: command === 'cold' ? 'scripts/cold.ts' : 'scripts/warm.ts',
                distProvision: built ? 'build' : 'none',
              });
            }
            cursor += 1;
          }
          expect(expanded.entrypoints).toHaveLength(commands.length);
          expect(expanded.finalProvision).toBe(built ? 'build' : 'none');
        },
      ),
      { seed: 0x51a7c01d, numRuns: 160 },
    );
  });

  test('nested wrappers preserve the provisioning transition', () => {
    expect(expandRootCommandEntrypoints('pnpm run nested', 'fixture#nested', ROOT_SCRIPTS)).toEqual({
      entrypoints: [
        { script: 'scripts/native-tsc.ts', declaredBy: 'fixture#nested', distProvision: 'none' },
        { script: 'scripts/warm.ts', declaredBy: 'fixture#nested', distProvision: 'build' },
      ],
      finalProvision: 'build',
    });
  });

  test('wrapper cycles fail closed with their complete path', () => {
    expect(() =>
      expandRootCommandEntrypoints('pnpm run a', 'fixture#cycle', {
        a: 'pnpm run b',
        b: 'pnpm run c',
        c: 'pnpm run a',
      }),
    ).toThrow('a -> b -> c -> a');
  });

  test('unknown root scripts cannot invent entrypoints or provisioning', () => {
    expect(expandRootCommandEntrypoints('pnpm run absent', 'fixture#unknown', ROOT_SCRIPTS)).toEqual({
      entrypoints: [],
      finalProvision: 'none',
    });
  });
});

describe('workflow provisioning laws', () => {
  const workflow = (first: readonly string[], second: readonly string[]): string =>
    [
      'name: fixture',
      'jobs:',
      '  first:',
      '    steps:',
      ...first.map((line) => `      - run: ${line}`),
      '  second:',
      '    steps:',
      ...second.map((line) => `      - run: ${line}`),
    ].join('\n');

  test('build authority never leaks across job boundaries', () => {
    const entries = enumerateWorkflowEntrypoints(
      '.github/workflows/fixture.yml',
      workflow(['pnpm run build', 'pnpm run warm'], ['pnpm run cold']),
      ROOT_SCRIPTS,
    );
    expect(entries).toEqual([
      {
        script: 'scripts/native-tsc.ts',
        declaredBy: '.github/workflows/fixture.yml#first',
        distProvision: 'none',
      },
      {
        script: 'scripts/warm.ts',
        declaredBy: '.github/workflows/fixture.yml#first',
        distProvision: 'build',
      },
      {
        script: 'scripts/cold.ts',
        declaredBy: '.github/workflows/fixture.yml#second',
        distProvision: 'none',
      },
    ]);
  });

  test('an artifact restored outside packages does not provision dist', () => {
    const text = [
      'jobs:',
      '  evidence:',
      '    steps:',
      '      - uses: actions/download-artifact@v7',
      '        with:',
      '          path: reports',
      '      - run: pnpm run cold',
    ].join('\n');
    expect(enumerateWorkflowEntrypoints('fixture.yml', text, ROOT_SCRIPTS)[0]).toMatchObject({
      script: 'scripts/cold.ts',
      distProvision: 'none',
    });
  });

  test('a root-restored artifact provisions following source tools', () => {
    const text = [
      'jobs:',
      '  evidence:',
      '    steps:',
      '      - uses: actions/download-artifact@v7',
      '        with:',
      '          path: .',
      '      - run: pnpm run cold',
    ].join('\n');
    expect(enumerateWorkflowEntrypoints('fixture.yml', text, ROOT_SCRIPTS)[0]).toMatchObject({
      script: 'scripts/cold.ts',
      distProvision: 'artifact',
    });
  });

  test('all install lifecycle entrypoints are cold and unrelated scripts are absent', () => {
    const entries = enumerateLifecycleEntrypoints({
      scripts: {
        preinstall: 'pnpm exec tsx scripts/preinstall.ts',
        install: 'pnpm exec tsx scripts/install.ts',
        postinstall: 'pnpm exec tsx scripts/postinstall.ts',
        prepare: 'pnpm exec tsx scripts/prepare.ts',
        test: 'pnpm exec tsx scripts/test.ts',
      },
    });
    expect(entries.map((entry) => entry.declaredBy)).toEqual([
      'package.json#preinstall',
      'package.json#install',
      'package.json#postinstall',
      'package.json#prepare',
    ]);
    expect(entries.every((entry) => entry.distProvision === 'none')).toBe(true);
    expect(entries.some((entry) => entry.script === 'scripts/test.ts')).toBe(false);
  });
});

describe('live module-specifier erasure laws', () => {
  test.each([
    ["import type { A } from '@fixture/a';", []],
    ["export type { A } from '@fixture/a';", []],
    ["import { type A } from '@fixture/a';", []],
    ["export { type A } from '@fixture/a';", []],
    ["import '@fixture/a';", ['@fixture/a']],
    ["import A from '@fixture/a';", ['@fixture/a']],
    ["import A, { type B } from '@fixture/a';", ['@fixture/a']],
    ["export { A } from '@fixture/a';", ['@fixture/a']],
    ["const value = import('@fixture/a');", ['@fixture/a']],
  ])('%s', (source, expected) => {
    expect(liveModuleSpecifiers('fixture.ts', source)).toEqual(expected);
  });
});

describe('GitHub output protocol laws', () => {
  const open = 'echo "matrix<<PLAN_EOF" >> "$GITHUB_OUTPUT"';
  const close = 'echo "PLAN_EOF"';

  test.each([
    'pnpm exec tsx scripts/ci-plan.ts',
    'matrix="$(pnpm exec tsx scripts/ci-plan.ts)"',
    'echo "$(pnpm exec tsx scripts/ci-plan.ts)"',
    'echo `pnpm exec tsx scripts/ci-plan.ts`',
    'echo "$matrix" && false',
    'echo "$matrix" || true',
    'echo "$matrix"; false',
    'echo "$matrix" | tee out',
    'echo <(pnpm exec tsx scripts/ci-plan.ts)',
    'echo >(consumer)',
  ])('rejects fallible interior form: %s', (interior) => {
    const result = scanWorkflowOutputHeredocs('fixture.yml', [open, interior, close].join('\n'));
    expect(result.subjects).toHaveLength(1);
    expect(result.findings).toEqual([
      expect.objectContaining({ kind: 'fallible-interior-command', line: 2, text: interior }),
    ]);
  });

  test.each([
    'echo "$matrix"',
    'printf \'%s\\n\' "$matrix"',
    'echo "matrix=$matrix"',
    "echo 'literal; pipe| substitution$(none) `none`'",
    'printf "matrix=%s\\n" "$matrix"',
    '# a comment cannot fail',
    '',
  ])('accepts emission-only interior form: %s', (interior) => {
    const result = scanWorkflowOutputHeredocs('fixture.yml', [open, interior, close].join('\n'));
    expect(result.findings).toEqual([]);
  });

  test('a delimiter mismatch is an unterminated record', () => {
    const result = scanWorkflowOutputHeredocs('fixture.yml', [open, 'echo "$matrix"', 'echo "OTHER"'].join('\n'));
    expect(result.findings).toContainEqual(
      expect.objectContaining({ kind: 'unterminated-heredoc', openLine: 1, delimiter: 'PLAN_EOF' }),
    );
  });

  test.each([`echo '$value`, 'echo "$value', 'echo "$value"' + '\\'])(
    'rejects malformed emission syntax: %s',
    (interior) => {
      const result = scanWorkflowOutputHeredocs('fixture.yml', [open, interior, close].join('\n'));
      expect(result.findings).toEqual([
        expect.objectContaining({ kind: 'fallible-interior-command', line: 2, text: interior }),
      ]);
    },
  );

  test('a commented historical heredoc is documentation, not an output subject', () => {
    const result = scanWorkflowOutputHeredocs(
      'fixture.yml',
      ['# echo "matrix<<PLAN_EOF" >> "$GITHUB_OUTPUT"', '# pnpm exec tsx scripts/ci-plan.ts'].join('\n'),
    );
    expect(result.subjects).toEqual([]);
    expect(result.findings).toEqual([]);
  });

  test('multiple output records retain independent delimiter and finding identities', () => {
    const result = scanWorkflowOutputHeredocs(
      'fixture.yml',
      [
        'echo "safe<<SAFE_EOF" >> "$GITHUB_OUTPUT"',
        'echo "$safe"',
        'echo "SAFE_EOF"',
        'echo "unsafe<<RED_EOF" >> "$GITHUB_OUTPUT"',
        'echo "$unsafe"; false',
        'echo "RED_EOF"',
      ].join('\n'),
    );
    expect(result.subjects.map(({ openLine, delimiter }) => ({ openLine, delimiter }))).toEqual([
      { openLine: 1, delimiter: 'SAFE_EOF' },
      { openLine: 4, delimiter: 'RED_EOF' },
    ]);
    expect(result.findings).toEqual([
      expect.objectContaining({ delimiter: 'RED_EOF', line: 5, text: 'echo "$unsafe"; false' }),
    ]);
  });

  test('arbitrary valid delimiters round-trip when the close matches', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Z][A-Z0-9_]{0,20}$/u), (delimiter) => {
        const result = scanWorkflowOutputHeredocs(
          'fixture.yml',
          [`echo "value<<${delimiter}" >> "$GITHUB_OUTPUT"`, 'echo "$value"', `echo "${delimiter}"`].join('\n'),
        );
        expect(result.subjects).toEqual([{ file: 'fixture.yml', openLine: 1, delimiter }]);
        expect(result.findings).toEqual([]);
      }),
      { seed: 0x0a70c001, numRuns: 120 },
    );
  });
});

describe('workspace import-edge laws', () => {
  test.each([
    ["import { x } from '@fixture/b';", [{ specifier: '@fixture/b', binding: 'static' }]],
    ["export { x } from '@fixture/b/subpath';", [{ specifier: '@fixture/b/subpath', binding: 'static' }]],
    ["type X = import('@fixture/b').X;", [{ specifier: '@fixture/b', binding: 'static' }]],
    ["const x = import('@fixture/b');", [{ specifier: '@fixture/b', binding: 'dynamic' }]],
  ])('classifies %s', (source, expected) => {
    expect(moduleSpecifierEdges('fixture.ts', source)).toEqual(expected);
  });

  test.each([
    ['@fixture/name', '@fixture/name'],
    ['@fixture/name/subpath', '@fixture/name'],
    ['typescript', 'typescript'],
    ['typescript/lib/tsserver', 'typescript'],
    ['./local.js', null],
    ['../parent.js', null],
    ['node:fs', null],
    ['@broken', null],
  ])('maps %s to %s', (specifier, expected) => {
    expect(specifierPackageName(specifier)).toBe(expected);
  });

  test('a static edge dominates a dynamic edge to the same undeclared package', () => {
    const result = evaluatePackageImports(
      packageSubject('@fixture/a'),
      [
        {
          file: 'packages/a/src/index.ts',
          text: "void import('@fixture/b');\nexport type { B } from '@fixture/b';",
        },
      ],
      new Set(['@fixture/a', '@fixture/b']),
      new Set(['@fixture/a -> @fixture/b']),
    );
    expect(result.findings).toEqual([
      expect.objectContaining({ kind: 'undeclared-workspace-import', dependency: '@fixture/b' }),
    ]);
    expect(result.optional).toEqual([]);
    expect(result.imports).toHaveLength(2);
  });

  test('dynamic exemptions are exact package-pair capabilities', () => {
    const sources = [
      { file: 'packages/a/src/one.ts', text: "void import('@fixture/b');" },
      { file: 'packages/a/src/two.ts', text: "void import('@fixture/c');" },
    ];
    const result = evaluatePackageImports(
      packageSubject('@fixture/a'),
      sources,
      new Set(['@fixture/a', '@fixture/b', '@fixture/c']),
      new Set(['@fixture/a -> @fixture/b']),
    );
    expect(result.optional).toEqual([
      { package: '@fixture/a', file: 'packages/a/src/one.ts', dependency: '@fixture/b' },
    ]);
    expect(result.findings).toEqual([
      expect.objectContaining({
        kind: 'undeclared-workspace-import-dynamic',
        file: 'packages/a/src/two.ts',
        dependency: '@fixture/c',
      }),
    ]);
  });

  test('declaring a dependency clears static and dynamic findings without erasing the census', () => {
    fc.assert(
      fc.property(fc.boolean(), (dynamic) => {
        const statement = dynamic ? "void import('@fixture/b');" : "export type { B } from '@fixture/b';";
        const result = evaluatePackageImports(
          packageSubject('@fixture/a', ['@fixture/b']),
          [{ file: 'packages/a/src/index.ts', text: statement }],
          new Set(['@fixture/a', '@fixture/b']),
        );
        expect(result.findings).toEqual([]);
        expect(result.optional).toEqual([]);
        expect(result.imports).toEqual([
          expect.objectContaining({
            dependency: '@fixture/b',
            binding: dynamic ? 'dynamic' : 'static',
            declared: true,
            exempt: false,
          }),
        ]);
      }),
      { seed: 0xdec1a4ed, numRuns: 80 },
    );
  });
});
