import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assuranceRegressions,
  baselineFromInventory,
  buildAssuranceInventory,
  normalizedLogicalLoc,
  parseAssuranceBaseline,
  type AssuranceInventory,
} from '../../../scripts/lib/assurance-inventory.js';

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
    const core = buildAssuranceInventory(root).packages.find((entry) => entry.name === '@liteship/core')!;
    expect(core.evidenceClasses.chaos).toBe(0);
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
});
