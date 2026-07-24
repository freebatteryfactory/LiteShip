import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assuranceRegressions,
  baselineFromInventory,
  buildAssuranceInventory,
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
    "import { value } from '@liteship/core';\nexpect(value).toBe(1);\n",
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
    expect(core).toMatchObject({ sourceLoc: 3, authoredEvidenceLoc: 2, generatedEvidenceLoc: 2, ratioMilli: 666 });
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
    expect(core.authoredEvidenceLoc).toBe(4);
    expect(core.evidenceFiles).toEqual(['tests/unit/core/value.test.ts', 'tests/unit/meta/projection.test.ts']);
  });

  it('detects a planted density regression and ignores a strengthening', () => {
    const inventory = buildAssuranceInventory(fixture());
    const baseline = baselineFromInventory(inventory);
    const core = inventory.packages.find((entry) => entry.name === '@liteship/core')!;
    const weakened = {
      ...inventory,
      packages: inventory.packages.map((entry) =>
        entry.name === core.name
          ? {
              ...entry,
              sourceLoc: entry.sourceLoc + 1,
              ratioMilli: Math.floor((entry.authoredEvidenceLoc * 1_000) / (entry.sourceLoc + 1)),
            }
          : entry,
      ),
    } satisfies AssuranceInventory;
    expect(assuranceRegressions(weakened, baseline)).toEqual([
      {
        package: '@liteship/core',
        kind: 'density',
        priorMilli: core.ratioMilli,
        currentMilli: Math.floor((core.authoredEvidenceLoc * 1_000) / (core.sourceLoc + 1)),
      },
    ]);
    expect(assuranceRegressions(inventory, baseline)).toEqual([]);
  });
});
