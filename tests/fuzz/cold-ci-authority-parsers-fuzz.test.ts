// @vitest-environment node
/**
 * PROVES: cold-CI authority parsers are total over hostile source/workflow
 * bytes and preserve their fail-closed distinctions under irrelevant text.
 * These fuzz laws complement the historical CurePackets with malformed and
 * near-miss inputs that the real repository should never need to contain.
 */

import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  liveModuleSpecifiers,
  walkPrebuildClosure,
  type ClosureHost,
} from '../../scripts/lib/prebuild-closure-contract.js';
import { scanWorkflowOutputHeredocs } from '../../scripts/lib/workflow-output-contract.js';
import {
  evaluatePackageImports,
  moduleSpecifierEdges,
  specifierPackageName,
  type WorkspacePackageSubject,
} from '../../scripts/lib/workspace-dependency-contract.js';

const subject = (declared: readonly string[] = []): WorkspacePackageSubject =>
  Object.freeze({
    name: '@fixture/consumer',
    dir: 'packages/consumer',
    declared: Object.freeze([...declared]),
  });

const workspaceNames = new Set(['@fixture/consumer', '@fixture/provider']);

describe('TypeScript module-edge parser fuzz', () => {
  test('arbitrary Unicode source is total and deterministic', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 2_000 }), (source) => {
        const first = moduleSpecifierEdges('fixture.ts', source);
        const second = moduleSpecifierEdges('fixture.ts', source);
        expect(second).toEqual(first);
        expect(Object.isFrozen(first)).toBe(true);
        for (const edge of first) {
          expect(typeof edge.specifier).toBe('string');
          expect(['static', 'dynamic']).toContain(edge.binding);
        }
      }),
      { seed: 0xc01d7e57, numRuns: 300 },
    );
  });

  test('the cold-closure parser is total over the same hostile source population', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 2_000 }), (source) => {
        const first = liveModuleSpecifiers('fixture.ts', source);
        const second = liveModuleSpecifiers('fixture.ts', source);
        expect(second).toEqual(first);
        expect(Object.isFrozen(first)).toBe(true);
        expect(first.every((specifier) => typeof specifier === 'string')).toBe(true);
      }),
      { seed: 0xc01d5afe, numRuns: 300 },
    );
  });

  test('comments and string literals cannot mint module edges', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 500 }).filter((value) => !value.includes('*/')),
        fc.string({ maxLength: 500 }).filter((value) => !value.includes('`') && !value.includes('${')),
        (comment, literal) => {
          const source = [`/* ${comment} */`, `const text = \`${literal}\`;`].join('\n');
          expect(moduleSpecifierEdges('fixture.ts', source)).toEqual([]);
          expect(liveModuleSpecifiers('fixture.ts', source)).toEqual([]);
        },
      ),
      { seed: 0xc011e475, numRuns: 180 },
    );
  });

  test('subpaths always collapse to their owning scoped package', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/u), { minLength: 0, maxLength: 8 }),
        (subpaths) => {
          const suffix = subpaths.length === 0 ? '' : `/${subpaths.join('/')}`;
          expect(specifierPackageName(`@fixture/provider${suffix}`)).toBe('@fixture/provider');
        },
      ),
      { seed: 0x5c0fed01, numRuns: 160 },
    );
  });

  test('relative paths stay outside workspace-package classification', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('./', '../', '../../'),
        fc.array(fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/u), { minLength: 1, maxLength: 6 }),
        (prefix, segments) => {
          expect(specifierPackageName(`${prefix}${segments.join('/')}.js`)).toBeNull();
        },
      ),
      { seed: 0x10ca1eaf, numRuns: 160 },
    );
  });
});

describe('cold-closure host fault injection', () => {
  const absentHost: ClosureHost = Object.freeze({
    readFile: () => null,
    fileExists: () => false,
    workspaceManifest: () => null,
  });

  test('every missing enumerated cold entrypoint fails closed with its identity', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/u), { minLength: 1, maxLength: 6 }),
        (segments) => {
          const script = `scripts/${segments.join('/')}.ts`;
          const result = walkPrebuildClosure(
            [{ script, declaredBy: 'fixture#missing', distProvision: 'none' }],
            absentHost,
          );
          expect(result.findings).toEqual([
            {
              kind: 'missing-entrypoint',
              importer: script,
              specifier: script,
              resolved: null,
              chain: [script],
            },
          ]);
          expect(result.closure).toEqual([script]);
        },
      ),
      { seed: 0xabad1dea, numRuns: 160 },
    );
  });

  test('a provisioned entrypoint is outside the cold law even when absent locally', () => {
    for (const distProvision of ['build', 'artifact'] as const) {
      const result = walkPrebuildClosure(
        [{ script: 'scripts/admit.ts', declaredBy: 'fixture#warm', distProvision }],
        absentHost,
      );
      expect(result).toEqual({ closure: [], findings: [] });
    }
  });

  test('filesystem read failures propagate instead of becoming an empty green receipt', () => {
    const failure = new Error('injected read failure');
    const throwingHost: ClosureHost = {
      readFile: () => {
        throw failure;
      },
      fileExists: () => true,
      workspaceManifest: () => null,
    };
    expect(() =>
      walkPrebuildClosure(
        [{ script: 'scripts/entry.ts', declaredBy: 'fixture#io-error', distProvision: 'none' }],
        throwingHost,
      ),
    ).toThrow(failure);
  });
});

describe('workspace dependency classifier fuzz', () => {
  test('declaration membership alone controls an otherwise identical static edge', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z][a-z0-9]{0,20}$/u), (binding) => {
        const source = `import { ${binding} } from '@fixture/provider';\nvoid ${binding};`;
        const missing = evaluatePackageImports(
          subject(),
          [{ file: 'packages/consumer/src/index.ts', text: source }],
          workspaceNames,
        );
        const declared = evaluatePackageImports(
          subject(['@fixture/provider']),
          [{ file: 'packages/consumer/src/index.ts', text: source }],
          workspaceNames,
        );
        expect(missing.findings).toHaveLength(1);
        expect(declared.findings).toEqual([]);
        expect(missing.imports[0]).toMatchObject({ declared: false });
        expect(declared.imports[0]).toMatchObject({ declared: true });
      }),
      { seed: 0xdec1a4e5, numRuns: 160 },
    );
  });

  test('unrelated third-party specifiers never become workspace findings', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/u), (packageName) => {
        fc.pre(packageName !== 'provider');
        const result = evaluatePackageImports(
          subject(),
          [
            {
              file: 'packages/consumer/src/index.ts',
              text: `import value from '${packageName}';\nvoid value;`,
            },
          ],
          workspaceNames,
        );
        expect(result.imports).toEqual([]);
        expect(result.findings).toEqual([]);
      }),
      { seed: 0x7a1ad0ff, numRuns: 160 },
    );
  });

  test('duplicate static references produce one finding but retain every census edge', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), (count) => {
        const text = Array.from(
          { length: count },
          (_, index) => `export type { P as P${String(index)} } from '@fixture/provider';`,
        ).join('\n');
        const result = evaluatePackageImports(
          subject(),
          [{ file: 'packages/consumer/src/index.ts', text }],
          workspaceNames,
        );
        expect(result.findings).toHaveLength(1);
        expect(result.imports).toHaveLength(count);
        expect(result.imports.every((edge) => edge.binding === 'static')).toBe(true);
      }),
      { seed: 0xded0beef, numRuns: 120 },
    );
  });
});

describe('workflow output parser fuzz', () => {
  test('arbitrary workflow bytes are total and deterministic', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 4_000 }), (workflow) => {
        const first = scanWorkflowOutputHeredocs('fixture.yml', workflow);
        const second = scanWorkflowOutputHeredocs('fixture.yml', workflow);
        expect(second).toEqual(first);
        expect(Object.isFrozen(first.subjects)).toBe(true);
        expect(Object.isFrozen(first.findings)).toBe(true);
      }),
      { seed: 0x0a7f00d5, numRuns: 300 },
    );
  });

  test('single-quoted shell metacharacters remain inert payload', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 300 }).filter((value) => !value.includes("'")),
        (payload) => {
          const workflow = [
            'echo "value<<SAFE_EOF" >> "$GITHUB_OUTPUT"',
            `echo '${payload};|&&||$(not-run)\`not-run\`'`,
            'echo "SAFE_EOF"',
          ].join('\n');
          expect(scanWorkflowOutputHeredocs('fixture.yml', workflow).findings).toEqual([]);
        },
      ),
      { seed: 0x51a61e00, numRuns: 180 },
    );
  });

  test('an unquoted command separator always makes an emit line fallible', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(';', '|', '&&', '||'),
        fc.constantFrom('false', 'exit 1', 'pnpm run plan'),
        (operator, command) => {
          const interior = `echo "$value"${operator}${command}`;
          const workflow = ['echo "value<<RED_EOF" >> "$GITHUB_OUTPUT"', interior, 'echo "RED_EOF"'].join('\n');
          expect(scanWorkflowOutputHeredocs('fixture.yml', workflow).findings).toEqual([
            expect.objectContaining({ kind: 'fallible-interior-command', line: 2, text: interior }),
          ]);
        },
      ),
      { seed: 0xfa11ab1e, numRuns: 120 },
    );
  });

  test('command substitution remains fallible inside double quotes', () => {
    fc.assert(
      fc.property(fc.constantFrom('$(', '`'), (opener) => {
        const interior = opener === '$(' ? 'echo "$(pnpm run plan)"' : 'echo "`pnpm run plan`"';
        const workflow = ['echo "value<<RED_EOF" >> "$GITHUB_OUTPUT"', interior, 'echo "RED_EOF"'].join('\n');
        expect(scanWorkflowOutputHeredocs('fixture.yml', workflow).findings).toHaveLength(1);
      }),
      { seed: 0x5ab5717e, numRuns: 80 },
    );
  });

  test('mismatched delimiters never accidentally close each other', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][A-Z0-9_]{0,16}$/u),
        fc.stringMatching(/^[A-Z][A-Z0-9_]{0,16}$/u),
        (opened, closed) => {
          fc.pre(opened !== closed);
          const workflow = [`echo "value<<${opened}" >> "$GITHUB_OUTPUT"`, 'echo "$value"', `echo "${closed}"`].join(
            '\n',
          );
          expect(scanWorkflowOutputHeredocs('fixture.yml', workflow).findings).toContainEqual(
            expect.objectContaining({ kind: 'unterminated-heredoc', delimiter: opened }),
          );
        },
      ),
      { seed: 0xde11c105, numRuns: 160 },
    );
  });
});
