import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { resolveImport, type PackageExportTarget } from '../../../packages/audit/src/structure.js';

describe('audit package-export wildcard resolution', () => {
  test.each(['alpha', '$&', "$'", '$`', "$&-$'-$`"])(
    'projects the literal captured suffix %j into every wildcard segment',
    (suffix) => {
      const targets = new Map<string, PackageExportTarget>([
        ['@liteship/example', { './*': 'packages/example/src/*/mirror/*.ts' }],
      ]);
      expect(resolveImport(`@liteship/example/${suffix}`, 'consumer.ts', targets, '@liteship/')).toEqual({
        specifier: `@liteship/example/${suffix}`,
        targetFile: `packages/example/src/${suffix}/mirror/${suffix}.ts`,
        targetPackage: '@liteship/example',
        kind: 'internal-package',
      });
    },
  );

  test('preserves arbitrary replacement-token mixtures as literal subpath data', () => {
    const targets = new Map<string, PackageExportTarget>([
      ['@liteship/example', { './*': 'packages/example/src/*/mirror/*.ts' }],
    ]);
    const suffixes = fc
      .array(fc.constantFrom('alpha', '$&', "$'", '$`', '-', '_'), { minLength: 1, maxLength: 8 })
      .map((parts) => parts.join(''));

    fc.assert(
      fc.property(suffixes, (suffix) => {
        const resolved = resolveImport(`@liteship/example/${suffix}`, 'consumer.ts', targets, '@liteship/');
        expect(resolved.targetFile).toBe(`packages/example/src/${suffix}/mirror/${suffix}.ts`);
      }),
      { seed: 0xa0d17, numRuns: 256 },
    );
  });
});
