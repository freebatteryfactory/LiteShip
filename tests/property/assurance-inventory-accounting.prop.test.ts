/** Independent filesystem accounting laws for the assurance-density meter. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildAssuranceInventory, normalizedLogicalLoc } from '../../scripts/lib/assurance-inventory.js';
import { spawnArgvCapture } from '../../scripts/lib/spawn.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-assurance-accounting-'));
  roots.push(root);
  for (const path of [
    ['packages', 'core', 'src'],
    ['packages', 'canonical', 'src'],
    ['tests', 'unit'],
    ['tests', 'property'],
    ['tests', 'support'],
    ['tests', 'generated'],
    ['tests', 'fixtures'],
    ['scripts'],
    ['.github', 'workflows'],
  ]) {
    mkdirSync(join(root, ...path), { recursive: true });
  }
  writeFileSync(join(root, 'packages', 'core', 'src', 'index.ts'), 'export const coreValue = 1;\n');
  writeFileSync(join(root, 'packages', 'canonical', 'src', 'index.ts'), 'export const canonicalValue = 2;\n');
  return root;
}

function packageByName(root: string, name: string) {
  return buildAssuranceInventory(root).packages.find((entry) => entry.name === name)!;
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await spawnArgvCapture('git', args, { cwd: root });
  if (result.exitCode !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderrTail}`);
  return result.stdout;
}

async function visibleRepositoryFiles(root: string): Promise<readonly string[]> {
  return (await git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']))
    .split('\0')
    .filter(Boolean);
}

const statementCount = fc.integer({ min: 1, max: 40 });

function statements(count: number, prefix: string): string {
  return Array.from({ length: count }, (_, index) => `expect(${index}).toBe(${index}); // ${prefix}-${index}`).join(
    '\n',
  );
}

describe('unique authored evidence accounting', () => {
  it('counts one physical shared test once globally while crediting every imported owner edge', () => {
    fc.assert(
      fc.property(statementCount, (count) => {
        const root = fixture();
        const source = `
          import { coreValue } from '@liteship/core';
          import { encode } from '@liteship/canonical';
          test('shared owner law', () => {
            expect(coreValue).toBe(1);
            expect(typeof encode).toBe('function');
            ${statements(count, 'shared')}
          });
        `;
        const path = join(root, 'tests', 'unit', 'shared.test.ts');
        writeFileSync(path, source);
        const inventory = buildAssuranceInventory(root);
        const expectedLoc = normalizedLogicalLoc(path, source);
        expect(inventory.totals.authoredEvidenceLoc).toBe(expectedLoc);
        expect(inventory.packages.find((entry) => entry.name === '@liteship/core')!.evidenceFiles).toContain(
          'tests/unit/shared.test.ts',
        );
        expect(inventory.packages.find((entry) => entry.name === '@liteship/canonical')!.evidenceFiles).toContain(
          'tests/unit/shared.test.ts',
        );
      }),
      { seed: 0xa551_1001, numRuns: 80 },
    );
  });

  it('adds distinct authored files exactly once regardless of how many owners each reaches', () => {
    fc.assert(
      fc.property(fc.array(statementCount, { minLength: 1, maxLength: 10 }), (counts) => {
        const root = fixture();
        let expected = 0;
        for (const [index, count] of counts.entries()) {
          const source = `
            import { defineBoundary } from '@liteship/core';
            import { encode } from '@liteship/canonical';
            test('shared-${index}', () => {
              expect(defineBoundary).toBeDefined();
              expect(encode).toBeDefined();
              ${statements(count, `file-${index}`)}
            });
          `;
          const path = join(root, 'tests', 'unit', `shared-${index}.test.ts`);
          writeFileSync(path, source);
          expected += normalizedLogicalLoc(path, source);
        }
        expect(buildAssuranceInventory(root).totals.authoredEvidenceLoc).toBe(expected);
      }),
      { seed: 0xa551_1002, numRuns: 60 },
    );
  });

  it('propagates package ownership through relative support imports without multiplying global LOC', () => {
    fc.assert(
      fc.property(statementCount, (count) => {
        const root = fixture();
        const supportSource = `
          import { defineBoundary } from '@liteship/core';
          export const exercise = () => defineBoundary({
            input: 'viewport.width',
            thresholds: [1],
            states: ['small', 'large'],
          });
        `;
        const testSource = `
          import { exercise } from '../support/exercise.js';
          test('support ownership', () => {
            expect(exercise()).toBeDefined();
            ${statements(count, 'support')}
          });
        `;
        const supportPath = join(root, 'tests', 'support', 'exercise.ts');
        const testPath = join(root, 'tests', 'unit', 'support-owner.test.ts');
        writeFileSync(supportPath, supportSource);
        writeFileSync(testPath, testSource);
        const inventory = buildAssuranceInventory(root);
        expect(inventory.totals.authoredEvidenceLoc).toBe(
          normalizedLogicalLoc(supportPath, supportSource) + normalizedLogicalLoc(testPath, testSource),
        );
        expect(inventory.packages.find((entry) => entry.name === '@liteship/core')!.evidenceFiles).toEqual([
          'tests/support/exercise.ts',
          'tests/unit/support-owner.test.ts',
        ]);
      }),
      { seed: 0xa551_1003, numRuns: 70 },
    );
  });
});

describe('non-authored corpus separation', () => {
  it('gives ignored generated output zero credit while counting new non-ignored evidence before commit', async () => {
    const root = fixture();
    writeFileSync(join(root, '.gitignore'), 'tests/integration/astro/.astro/\n');
    await git(root, ['init', '--quiet']);
    await git(root, ['add', '.']);

    const baseline = buildAssuranceInventory(root).totals.authoredEvidenceLoc;
    const ignoredRoot = join(root, 'tests', 'integration', 'astro', '.astro');
    mkdirSync(ignoredRoot, { recursive: true });
    const ignoredPath = 'tests/integration/astro/.astro/content.d.ts';
    writeFileSync(
      join(root, ...ignoredPath.split('/')),
      "import type { Boundary } from '@liteship/core';\nexport declare const generatedAstroType: Boundary;\n",
    );
    expect((await git(root, ['check-ignore', ignoredPath])).trim()).toBe(ignoredPath);
    expect(await visibleRepositoryFiles(root)).toContain('packages/core/src/index.ts');
    expect(await visibleRepositoryFiles(root)).not.toContain(ignoredPath);
    const afterIgnoredOutput = buildAssuranceInventory(root);
    expect(afterIgnoredOutput.totals.authoredEvidenceLoc).toBe(baseline);
    expect(afterIgnoredOutput.totals.generatedEvidenceLoc).toBe(0);
    expect(packageByName(root, '@liteship/core').evidenceFiles).not.toContain(ignoredPath);

    const candidate = join(root, 'tests', 'property', 'candidate.prop.test.ts');
    const candidateSource =
      "import { defineBoundary } from '@liteship/core';\n" +
      "test('candidate evidence', () => expect(defineBoundary).toBeDefined());\n";
    writeFileSync(candidate, candidateSource);
    expect(await visibleRepositoryFiles(root)).toContain('tests/property/candidate.prop.test.ts');
    expect(buildAssuranceInventory(root).totals.authoredEvidenceLoc).toBe(
      baseline + normalizedLogicalLoc(candidate, candidateSource),
    );
    expect(packageByName(root, '@liteship/core').evidenceFiles).toContain('tests/property/candidate.prop.test.ts');
  });

  it('reports generated tests without crediting them to authored density', () => {
    fc.assert(
      fc.property(statementCount, (count) => {
        const root = fixture();
        const generated = `
          import { defineBoundary } from '@liteship/core';
          test('generated', () => {
            expect(defineBoundary).toBeDefined();
            ${statements(count, 'generated')}
          });
        `;
        writeFileSync(join(root, 'tests', 'generated', 'bulk.test.ts'), generated);
        const inventory = buildAssuranceInventory(root);
        expect(inventory.totals.authoredEvidenceLoc).toBe(0);
        expect(inventory.totals.generatedEvidenceLoc).toBeGreaterThan(0);
        expect(packageByName(root, '@liteship/core').generatedEvidenceLoc).toBeGreaterThan(0);
      }),
      { seed: 0xa551_1004, numRuns: 60 },
    );
  });

  it('reports fixture corpora by physical code LOC without granting authored evidence', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 30 }), (values) => {
        const root = fixture();
        writeFileSync(join(root, 'tests', 'fixtures', 'cases.json'), JSON.stringify(values, null, 2));
        const inventory = buildAssuranceInventory(root);
        expect(inventory.totals.authoredEvidenceLoc).toBe(0);
        expect(inventory.totals.corpusLoc).toBeGreaterThan(0);
      }),
      { seed: 0xa551_1005, numRuns: 60 },
    );
  });

  it('reports generated implementation source but excludes it from the authored denominator', () => {
    fc.assert(
      fc.property(statementCount, (count) => {
        const root = fixture();
        const generated = Array.from(
          { length: count },
          (_, index) => `export const generated${index} = ${index};`,
        ).join('\n');
        writeFileSync(join(root, 'packages', 'core', 'src', 'fleet.generated.ts'), generated);
        const inventory = buildAssuranceInventory(root);
        expect(inventory.totals.sourceRoles.generated).toBe(normalizedLogicalLoc('fleet.generated.ts', generated));
        expect(inventory.totals.sourceLoc).toBe(
          inventory.totals.sourceRoles.product +
            inventory.totals.sourceRoles.verificationEngine +
            inventory.totals.sourceRoles.rustWasm +
            inventory.totals.sourceRoles.workflowAuthority,
        );
      }),
      { seed: 0xa551_1006, numRuns: 80 },
    );
  });
});

describe('source-role accounting', () => {
  it('keeps product, verification-engine, workflow, and generated roles disjoint', () => {
    fc.assert(
      fc.property(statementCount, statementCount, statementCount, (productCount, scriptCount, workflowCount) => {
        const root = fixture();
        writeFileSync(
          join(root, 'packages', 'core', 'src', 'extra.ts'),
          Array.from({ length: productCount }, (_, index) => `export const p${index} = ${index};`).join('\n'),
        );
        writeFileSync(
          join(root, 'scripts', 'probe.ts'),
          Array.from({ length: scriptCount }, (_, index) => `export const s${index} = ${index};`).join('\n'),
        );
        writeFileSync(
          join(root, '.github', 'workflows', 'probe.yml'),
          [
            'name: probe',
            'jobs:',
            '  verify:',
            '    runs-on: ubuntu-latest',
            ...Array.from({ length: workflowCount }, (_, index) => `    # case-${index}`),
          ].join('\n'),
        );
        const inventory = buildAssuranceInventory(root);
        expect(inventory.totals.sourceRoles.product).toBeGreaterThanOrEqual(productCount);
        expect(inventory.totals.sourceRoles.verificationEngine).toBeGreaterThanOrEqual(scriptCount);
        expect(inventory.totals.sourceRoles.workflowAuthority).toBeGreaterThan(0);
        expect(inventory.totals.sourceLoc).toBe(
          inventory.totals.sourceRoles.product +
            inventory.totals.sourceRoles.verificationEngine +
            inventory.totals.sourceRoles.rustWasm +
            inventory.totals.sourceRoles.workflowAuthority,
        );
      }),
      { seed: 0xa551_1007, numRuns: 50 },
    );
  });

  it('keeps formatting and comments from moving either side of the density ratio', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (count) => {
        const compactRoot = fixture();
        const expandedRoot = fixture();
        const declarations = Array.from({ length: count }, (_, index) => `export const v${index}=${index};`);
        writeFileSync(join(compactRoot, 'packages', 'core', 'src', 'format.ts'), declarations.join(''));
        writeFileSync(
          join(expandedRoot, 'packages', 'core', 'src', 'format.ts'),
          declarations.map((line, index) => `// declaration ${index}\n${line}\n`).join('\n'),
        );
        const compact = buildAssuranceInventory(compactRoot);
        const expanded = buildAssuranceInventory(expandedRoot);
        expect(compact.totals.sourceLoc).toBe(expanded.totals.sourceLoc);
        expect(compact.totals.ratioMilli).toBe(expanded.totals.ratioMilli);
      }),
      { seed: 0xa551_1008, numRuns: 50 },
    );
  });
});

describe('evidence-class anti-theater laws', () => {
  it('does not grant property credit from a filename without both generation and assertion execution', () => {
    fc.assert(
      fc.property(fc.constantFrom('fc.assert', 'fc.property', 'property', 'arbitrary'), (decoration) => {
        const root = fixture();
        writeFileSync(
          join(root, 'tests', 'property', 'decorative.prop.test.ts'),
          `import { defineBoundary } from '@liteship/core';\ntest('decorative', () => expect('${decoration}').toContain('property'));\n`,
        );
        expect(packageByName(root, '@liteship/core').evidenceClasses.property).toBe(0);
      }),
      { seed: 0xa551_1009, numRuns: 40 },
    );
  });

  it('does not grant chaos or simulation credit from prose in an ordinary unit filename', () => {
    fc.assert(
      fc.property(fc.constantFrom('chaos', 'fault injection', 'simulation', 'determinism'), (claim) => {
        const root = fixture();
        writeFileSync(
          join(root, 'tests', 'unit', 'ordinary.test.ts'),
          `import { defineBoundary } from '@liteship/core';\ntest('${claim}', () => expect(defineBoundary).toBeDefined());\n`,
        );
        const classes = packageByName(root, '@liteship/core').evidenceClasses;
        expect(classes.chaos).toBe(0);
        expect(classes.simulation).toBe(0);
      }),
      { seed: 0xa551_100a, numRuns: 40 },
    );
  });

  it('does not grant mutation or MC/DC credit from source words under any test path', () => {
    fc.assert(
      fc.property(fc.constantFrom('mutation', 'mutant', 'mcdc', 'condition coverage'), (claim) => {
        const root = fixture();
        writeFileSync(
          join(root, 'tests', 'unit', 'semantic-assurance.test.ts'),
          `import { defineBoundary } from '@liteship/core';\ntest('${claim}', () => expect(defineBoundary).toBeDefined());\n`,
        );
        const classes = packageByName(root, '@liteship/core').evidenceClasses;
        expect(classes.mutation).toBe(0);
        expect(classes.mcdc).toBe(0);
      }),
      { seed: 0xa551_100b, numRuns: 40 },
    );
  });
});
