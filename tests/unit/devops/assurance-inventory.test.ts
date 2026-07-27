import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { makeRepoIR, type McdcFacts, type MutationFacts } from '@liteship/gauntlet';
import {
  assuranceRegressions,
  assuranceProgress,
  baselineFromInventory,
  buildAssuranceInventory,
  normalizedLogicalLoc,
  parseAssuranceBaseline,
  type AssuranceInventory,
} from '../../../scripts/lib/assurance-inventory.js';
import {
  buildSemanticAssuranceReceipt,
  writeSemanticAssuranceReceipt,
} from '../../../packages/cli/src/internal/semantic-assurance-receipt.js';
import { spawnArgv } from '../../../scripts/lib/spawn.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-assurance-'));
  roots.push(root);
  mkdirSync(join(root, 'packages', 'core', 'src'), { recursive: true });
  mkdirSync(join(root, 'packages', 'core', 'src', 'schema'), { recursive: true });
  mkdirSync(join(root, 'tests', 'unit', 'core'), { recursive: true });
  writeFileSync(
    join(root, 'packages', 'core', 'src', 'index.ts'),
    'export const value = 1;\nexport const other = 2;\n',
  );
  writeFileSync(join(root, 'packages', 'core', 'src', 'schema', 'brands.ts'), 'export type Brand = string;\n');
  writeFileSync(
    join(root, 'tests', 'unit', 'core', 'value.test.ts'),
    "import { value } from '@liteship/core';\ntest('value', () => expect(value).toBe(1));\n",
  );
  return root;
}

describe('assurance inventory', () => {
  it('measures the candidate worktree without reading deleted tracked source', async () => {
    const root = fixture();
    const retired = join(root, 'packages', 'core', 'src', 'retired.ts');
    writeFileSync(retired, 'export const retired = true;\n');
    expect((await spawnArgv('git', ['init'], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] })).exitCode).toBe(0);
    expect((await spawnArgv('git', ['add', '.'], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] })).exitCode).toBe(0);
    rmSync(retired);

    const core = buildAssuranceInventory(root).packages.find((entry) => entry.name === '@liteship/core')!;
    expect(core.sourceLoc).toBe(3);
  });

  it('attributes authored evidence to the canonical package owner and keeps generated evidence separate', () => {
    const root = fixture();
    mkdirSync(join(root, 'tests', 'generated'), { recursive: true });
    writeFileSync(
      join(root, 'tests', 'generated', 'core-generated.test.ts'),
      "import { value } from '@liteship/core';\nexpect(value).toBe(1);\n",
    );

    const core = buildAssuranceInventory(root).packages.find((entry) => entry.name === '@liteship/core')!;
    expect(core.sourceLoc).toBeGreaterThan(0);
    expect(core.authoredEvidenceLoc).toBeGreaterThan(0);
    expect(core.generatedEvidenceLoc).toBeGreaterThan(0);
    expect(core.highestAssurance).toBe('L4');
    expect(core.evidenceRequirements).toContain('mutation');
    expect(core.missingEvidence).toContain('mutation');
    expect(core.evidenceClasses.unit).toBe(1);
    expect(core.evidenceFiles).toEqual(['tests/unit/core/value.test.ts']);
  });

  it('attributes a relative package-source import to the same canonical owner', () => {
    const root = fixture();
    mkdirSync(join(root, 'tests', 'unit', 'meta'), { recursive: true });
    writeFileSync(
      join(root, 'tests', 'unit', 'meta', 'projection.test.ts'),
      "import { value } from '../../../packages/core/src/index.js';\nexpect(value).toBe(1);\n",
    );

    const core = buildAssuranceInventory(root).packages.find((entry) => entry.name === '@liteship/core')!;
    expect(core.authoredEvidenceLoc).toBeGreaterThan(0);
    expect(core.evidenceFiles).toEqual(['tests/unit/core/value.test.ts', 'tests/unit/meta/projection.test.ts']);
  });

  it('separates executable Node suites from support evidence and records transitive reverse closure', () => {
    const root = fixture();
    mkdirSync(join(root, 'tests', 'support'), { recursive: true });
    writeFileSync(join(root, 'tests', 'support', 'base.ts'), 'export const base = 1;\n');
    writeFileSync(join(root, 'tests', 'support', 'fixture.ts'), "export { base } from './base.js';\n");
    writeFileSync(
      join(root, 'tests', 'unit', 'core', 'support-closure.test.ts'),
      "import { base } from '../../support/fixture.js';\ntest('support', () => expect(base).toBe(1));\n",
    );

    const selection = buildAssuranceInventory(root).nodeTestSelection;
    expect(selection.entrypoints).toContain('tests/unit/core/support-closure.test.ts');
    expect(selection.entrypoints).not.toContain('tests/support/fixture.ts');
    expect(selection.dependents).toEqual(
      expect.arrayContaining([
        {
          path: 'tests/support/base.ts',
          entrypoints: ['tests/unit/core/support-closure.test.ts'],
        },
        {
          path: 'tests/support/fixture.ts',
          entrypoints: ['tests/unit/core/support-closure.test.ts'],
        },
      ]),
    );
  });

  it('detects a planted unique repository density regression and ignores a strengthening', () => {
    const inventory = buildAssuranceInventory(fixture());
    const baseline = baselineFromInventory(inventory);
    const weakened = {
      ...inventory,
      totals: { ...inventory.totals, ratioMilli: inventory.totals.ratioMilli - 1 },
    } satisfies AssuranceInventory;
    expect(assuranceRegressions(weakened, baseline)).toEqual([
      {
        package: 'repository',
        kind: 'density',
        priorMilli: inventory.totals.ratioMilli,
        currentMilli: inventory.totals.ratioMilli - 1,
      },
    ]);
    expect(assuranceRegressions(inventory, baseline)).toEqual([]);
  });

  it('requires reviewed ratchet advancement when a proof class is earned, then catches its deletion', () => {
    const root = fixture();
    const before = buildAssuranceInventory(root);
    const staleBaseline = baselineFromInventory(before);
    const propertyPath = join(root, 'tests', 'property', 'core-law.prop.test.ts');
    mkdirSync(join(root, 'tests', 'property'), { recursive: true });
    writeFileSync(
      propertyPath,
      "import fc from 'fast-check';\nimport { value } from '@liteship/core';\ntest('generated law', () => fc.assert(fc.property(fc.integer(), (n) => { expect(value + n).toBe(n + 1); })));\n",
    );

    const strengthened = buildAssuranceInventory(root);
    expect(assuranceProgress(strengthened, staleBaseline)).toContainEqual(
      expect.objectContaining({
        package: '@liteship/core',
        authoredEvidenceLocDelta: expect.any(Number),
        earnedEvidence: ['property'],
        openedEvidence: [],
      }),
    );
    expect(assuranceRegressions(strengthened, staleBaseline)).toContainEqual({
      package: '@liteship/core',
      kind: 'stale-strengthen',
      evidenceGap: 'property',
    });

    const advanced = baselineFromInventory(strengthened);
    expect(assuranceRegressions(strengthened, advanced)).toEqual([]);
    rmSync(propertyPath);
    expect(assuranceRegressions(buildAssuranceInventory(root), advanced)).toContainEqual({
      package: '@liteship/core',
      kind: 'evidence-gap',
      evidenceGap: 'property',
    });
  });

  it('keeps live mutation and MC/DC receipts out of quick authority and fail-closed in admission', () => {
    const inventory = buildAssuranceInventory(fixture());
    const baseline = baselineFromInventory(inventory);
    const artificiallyAdmitted = {
      ...baseline,
      packages: baseline.packages.map((entry) => ({
        ...entry,
        missingEvidence: entry.missingEvidence.filter((gap) => gap !== 'mutation' && gap !== 'mcdc'),
      })),
    };

    expect(assuranceRegressions(inventory, artificiallyAdmitted)).toEqual([]);
    expect(assuranceRegressions(inventory, artificiallyAdmitted, { requireSemanticAssurance: true })).toEqual(
      expect.arrayContaining([
        { package: '@liteship/core', kind: 'evidence-gap', evidenceGap: 'mcdc' },
        { package: '@liteship/core', kind: 'evidence-gap', evidenceGap: 'mutation' },
      ]),
    );
  });

  it('fails closed when positional metrics are detached from the canonical catalog', () => {
    const inventory = buildAssuranceInventory(fixture());
    const baseline = baselineFromInventory(inventory);

    expect(() =>
      assuranceRegressions(inventory, {
        ...baseline,
        catalogFingerprint: `sha256:${'0'.repeat(64)}`,
      }),
    ).toThrow('canonical package catalog');
  });

  it('refuses a legacy or malformed assurance ratchet', () => {
    expect(() => parseAssuranceBaseline({ schemaVersion: 2 })).toThrow(/schema-v3/u);
    expect(() =>
      parseAssuranceBaseline({
        schemaVersion: 3,
        catalogFingerprint: `sha256:${'0'.repeat(64)}`,
        uniqueRatioMilli: -1,
        packages: [],
      }),
    ).toThrow(/schema-v3/u);
  });

  it('counts one shared evidence file once globally while retaining every owner edge', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'tests', 'unit', 'core', 'shared.test.ts'),
      "import { encode } from '@liteship/canonical';\nimport { defineBoundary } from '@liteship/core';\ntest('shared', () => expect([encode, defineBoundary]).toHaveLength(2));\n",
    );
    const inventory = buildAssuranceInventory(root);
    const core = inventory.packages.find((entry) => entry.name === '@liteship/core')!;
    const canonical = inventory.packages.find((entry) => entry.name === '@liteship/canonical')!;
    expect(core.evidenceFiles).toContain('tests/unit/core/shared.test.ts');
    expect(canonical.evidenceFiles).toContain('tests/unit/core/shared.test.ts');
    const authoredFiles = ['tests/unit/core/value.test.ts', 'tests/unit/core/shared.test.ts'];
    const uniqueLoc = authoredFiles.reduce((sum, path) => {
      const source = path.endsWith('shared.test.ts')
        ? "import { encode } from '@liteship/canonical';\nimport { defineBoundary } from '@liteship/core';\ntest('shared', () => expect([encode, defineBoundary]).toHaveLength(2));\n"
        : "import { value } from '@liteship/core';\ntest('value', () => expect(value).toBe(1));\n";
      return sum + normalizedLogicalLoc(path, source);
    }, 0);
    expect(inventory.totals.authoredEvidenceLoc).toBe(uniqueLoc);
  });

  it('does not grant a proof class from a filename alone', () => {
    const root = fixture();
    writeFileSync(join(root, 'tests', 'unit', 'core', 'chaos.test.ts'), "test('ordinary', () => expect(1).toBe(1));\n");
    writeFileSync(
      join(root, 'tests', 'unit', 'core', 'mutation.test.ts'),
      "import { value } from '@liteship/core';\ntest('mutation mutant mcdc condition', () => expect(value).toBe(1));\n",
    );
    const core = buildAssuranceInventory(root).packages.find((entry) => entry.name === '@liteship/core')!;
    expect(core.evidenceClasses.chaos).toBe(0);
    expect(core.evidenceClasses.mutation).toBe(0);
    expect(core.evidenceClasses.mcdc).toBe(0);
  });

  it('grants mutation credit only from a current addressed live-execution receipt', () => {
    const root = fixture();
    const file = 'packages/core/src/schema/brands.ts';
    const reason = { kind: 'effective-level', level: 'L4' } as const;
    const ir = makeRepoIR({
      files: [{ id: file, contentDigest: 'blake3:fixture-brands', packageName: '@liteship/core' }],
    });
    const facts: MutationFacts = {
      outcomes: [
        {
          mutantId: 'blake3:fixture-mutant',
          verdict: 'killed',
          file,
          line: 1,
          column: 1,
          operator: 'equality',
          originalText: '===',
          mutatedText: '!==',
          coveringTests: ['tests/unit/core/value.test.ts'],
          equivalentJustification: null,
          equivalentJustificationDigest: null,
          subsumedBy: [],
        },
      ],
      targetCensus: [{ file, applicableMutants: 1, reasons: [reason] }],
      operatorApplicability: [{ file, operator: 'equality', applicableMutants: 1 }],
      scoreBaseline: {},
    };
    writeSemanticAssuranceReceipt(
      root,
      buildSemanticAssuranceReceipt({ mode: 'mutation', facts, ir, toolchainDigest: 'tc-sha256:fixture' }),
    );
    const inventory = buildAssuranceInventory(root, {
      semanticAssurance: {
        ir,
        selection: { expectedTargets: [{ file, reasons: [reason] }], unresolvedEntrypoints: [] },
        toolchainDigests: { mutation: 'tc-sha256:fixture', mcdc: 'tc-sha256:fixture-mcdc' },
      },
    });
    const core = inventory.packages.find((entry) => entry.name === '@liteship/core')!;
    expect(core.evidenceClasses.mutation).toBe(1);
    expect(core.missingEvidence).not.toContain('mutation');
  });

  it('grants MC/DC credit only from a current addressed live-execution receipt', () => {
    const root = fixture();
    const file = 'packages/core/src/schema/brands.ts';
    const reason = { kind: 'effective-level', level: 'L4' } as const;
    const ir = makeRepoIR({
      files: [{ id: file, contentDigest: 'blake3:fixture-brands', packageName: '@liteship/core' }],
    });
    const facts: McdcFacts = {
      conditions: [
        {
          conditionId: 'blake3:fixture-condition',
          file,
          line: 1,
          column: 1,
          decision: 'left && right',
          condition: 'left',
          forceTrueVerdict: 'killed',
          forceFalseVerdict: 'killed',
          coveringTests: ['tests/unit/core/value.test.ts'],
        },
      ],
      targetCensus: [{ file, applicableConditions: 1, reasons: [reason] }],
    };
    writeSemanticAssuranceReceipt(
      root,
      buildSemanticAssuranceReceipt({ mode: 'mcdc', facts, ir, toolchainDigest: 'tc-sha256:fixture-mcdc' }),
    );
    const inventory = buildAssuranceInventory(root, {
      semanticAssurance: {
        ir,
        selection: { expectedTargets: [{ file, reasons: [reason] }], unresolvedEntrypoints: [] },
        toolchainDigests: { mutation: 'tc-sha256:fixture', mcdc: 'tc-sha256:fixture-mcdc' },
      },
    });
    const core = inventory.packages.find((entry) => entry.name === '@liteship/core')!;
    expect(core.evidenceClasses.mcdc).toBe(1);
    expect(core.missingEvidence).not.toContain('mcdc');
  });

  it('grants benchmark evidence only to a package-owned SUT reached by the measured callback', () => {
    const root = fixture();
    mkdirSync(join(root, 'tests', 'bench'), { recursive: true });
    mkdirSync(join(root, 'benchmarks'), { recursive: true });
    const benchPath = join(root, 'tests', 'bench', 'core.bench.ts');
    writeFileSync(
      join(root, 'benchmarks', 'distributions.json'),
      JSON.stringify({
        schemaVersion: 2,
        distributions: [
          {
            name: 'fastPath',
            file: 'tests/bench/core.bench.ts',
            inputSize: 1,
            shape: 'single-call',
            replicates: 1,
            subjects: [
              {
                role: 'sut',
                origin: { kind: 'module', specifier: '@liteship/core/evidence' },
                symbol: 'value',
                binding: 'value',
              },
            ],
          },
        ],
      }),
    );
    writeFileSync(benchPath, "import { value } from '@liteship/core/evidence';\nbench.add('fastPath', () => {});\n");
    expect(
      buildAssuranceInventory(root).packages.find((entry) => entry.name === '@liteship/core')!.evidenceClasses
        .benchmark,
    ).toBe(0);

    writeFileSync(
      benchPath,
      "import { value } from '@liteship/core/evidence';\nbench.add('fastPath', () => value());\n",
    );
    expect(
      buildAssuranceInventory(root).packages.find((entry) => entry.name === '@liteship/core')!.evidenceClasses
        .benchmark,
    ).toBe(1);
  });

  it('normalizes formatting and comments before counting TypeScript LOC', () => {
    const expanded = 'export const one = 1;\n// prose\nexport const two = 2;\n';
    const compact = 'export const one=1; export const two=2;';
    expect(normalizedLogicalLoc('probe.ts', expanded)).toBe(normalizedLogicalLoc('probe.ts', compact));
  });

  it('reports generated tests and fixture corpora without crediting authored density', () => {
    const root = fixture();
    mkdirSync(join(root, 'tests', 'generated'), { recursive: true });
    mkdirSync(join(root, 'tests', 'fixtures'), { recursive: true });
    writeFileSync(join(root, 'tests', 'generated', 'bulk.test.ts'), "test('generated', () => expect(1).toBe(1));\n");
    writeFileSync(join(root, 'tests', 'fixtures', 'cases.json'), '[{"case":1}]\n');
    const inventory = buildAssuranceInventory(root);
    expect(inventory.totals.generatedEvidenceLoc).toBeGreaterThan(0);
    expect(inventory.totals.corpusLoc).toBeGreaterThan(0);
    expect(inventory.totals.authoredEvidenceLoc).toBe(
      normalizedLogicalLoc(
        'tests/unit/core/value.test.ts',
        "import { value } from '@liteship/core';\ntest('value', () => expect(value).toBe(1));\n",
      ),
    );
  });

  it('reports generated source separately without charging mechanical bytes to authored density', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'packages', 'core', 'src', 'catalog.generated.ts'),
      'export const generatedOne = 1;\nexport const generatedTwo = 2;\n',
    );
    const inventory = buildAssuranceInventory(root);
    expect(inventory.totals.sourceRoles.generated).toBeGreaterThan(0);
    expect(inventory.totals.sourceLoc).toBe(
      inventory.totals.sourceRoles.product +
        inventory.totals.sourceRoles.verificationEngine +
        inventory.totals.sourceRoles.rustWasm +
        inventory.totals.sourceRoles.workflowAuthority,
    );
  });
});
