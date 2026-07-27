/** Package artifact coverage is derived from the declared glob and physical files. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { collectProfileArtifactCoverage, type DevopsProfile } from '@liteship/audit';

const declarationNames = fc.uniqueArray(fc.constantFrom('a', 'b', 'c', 'core', 'design', 'worker', 'scene'), {
  minLength: 0,
  maxLength: 7,
});

describe('package artifact coverage properties', () => {
  it('classifies exactly the generated declaration corpus and never calls zero files analyzed', () => {
    fc.assert(
      fc.property(declarationNames, (names) => {
        const root = mkdtempSync(join(tmpdir(), 'liteship-audit-artifacts-'));
        try {
          const packageDir = join(root, 'node_modules', '@fixture', 'spine');
          mkdirSync(packageDir, { recursive: true });
          writeFileSync(
            join(packageDir, 'package.json'),
            `${JSON.stringify({ name: '@fixture/spine', version: '0.0.0', exports: {} })}\n`,
            'utf8',
          );
          for (const name of names) {
            writeFileSync(join(packageDir, `${name}.d.ts`), `export declare const ${name}: string;\n`, 'utf8');
          }

          const profile: DevopsProfile = {
            repoRoot: root,
            internalPackagePrefix: '@fixture/',
            packageTopology: {
              '@fixture/spine': {
                allowedInternalImports: [],
                kind: 'standalone',
                analyzableArtifacts: ['*.d.ts'],
              },
            },
            dynamicImportExemptions: new Set(),
            surfacePolicy: {},
            packageRoots: { '@fixture/spine': packageDir },
          };

          const [coverage] = collectProfileArtifactCoverage(profile);
          if (names.length === 0) {
            expect(coverage).toMatchObject({ package: '@fixture/spine', coverage: 'unverified' });
          } else {
            expect(coverage).toEqual({
              package: '@fixture/spine',
              coverage: 'analyzed',
              expectedArtifacts: ['*.d.ts'],
              matchedFiles: names.map((name) => `${name}.d.ts`).sort((left, right) => left.localeCompare(right)),
            });
          }
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }),
      { numRuns: 40 },
    );
  });
});
