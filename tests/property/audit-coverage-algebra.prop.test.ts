/** Consumer audit coverage is an evidence-state algebra, not a zero-filled scorecard. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { runAuditPasses, type DevopsProfile } from '@liteship/audit';

describe('audit coverage algebra properties', () => {
  it('consumer aggregate skips remain not-checked for every non-empty installed fleet', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), (packageCount) => {
        const root = mkdtempSync(join(tmpdir(), 'liteship-audit-coverage-'));
        try {
          const packageRoots: Record<string, string> = {};
          const packageTopology: DevopsProfile['packageTopology'] = {};
          for (let index = 0; index < packageCount; index += 1) {
            const name = `@fixture/pkg-${index}`;
            const directory = join(root, 'node_modules', '@fixture', `pkg-${index}`);
            mkdirSync(directory, { recursive: true });
            writeFileSync(
              join(directory, 'package.json'),
              `${JSON.stringify({ name, type: 'module', exports: {} }, null, 2)}\n`,
              'utf8',
            );
            packageRoots[name] = directory;
            packageTopology[name] = { allowedInternalImports: [], kind: 'core' };
          }

          const result = runAuditPasses({
            repoRoot: root,
            internalPackagePrefix: '@fixture/',
            packageTopology,
            dynamicImportExemptions: new Set(),
            surfacePolicy: {},
            packageRoots,
          });

          expect(result.structure.summary.packageCount).toBe(packageCount);
          expect(result.structure.summary.coverageClassification.orphan.coverage).toBe('not-checked');
          expect(result.structure.summary.coverageClassification.symbol.coverage).toBe('not-checked');
          expect(result.structure.summary.coverageClassification.orphan).not.toHaveProperty('candidateCount');
          expect(result.structure.summary.coverageClassification.symbol).not.toHaveProperty('consumedCount');
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }),
      { numRuns: 24, seed: 0xa0d17 },
    );
  });
});
