import { describe, expect, test } from 'vitest';
import { resolveImport, type PackageExportTarget } from '../../../packages/audit/src/structure.js';

describe('audit package-export wildcard resolution', () => {
  test('projects the captured suffix into every wildcard segment', () => {
    const targets = new Map<string, PackageExportTarget>([
      ['@liteship/example', { './*': 'packages/example/src/*/mirror/*.ts' }],
    ]);
    expect(resolveImport('@liteship/example/alpha', 'consumer.ts', targets, '@liteship/')).toEqual({
      specifier: '@liteship/example/alpha',
      targetFile: 'packages/example/src/alpha/mirror/alpha.ts',
      targetPackage: '@liteship/example',
      kind: 'internal-package',
    });
  });
});
