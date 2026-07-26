import { describe, expect, it } from 'vitest';
import { forbiddenSourceImportClosure, sourceRuntimeImports } from '../../../scripts/lib/source-import-contract.js';

describe('@liteship/stage import boundary', () => {
  it('uses the node-free Astro projection instead of the host integration barrel', () => {
    const imports = sourceRuntimeImports('.', 'packages/stage/src/dual-export.ts');
    expect(imports).toContain('@liteship/astro/adaptive-runtime');
    expect(imports).not.toContain('@liteship/astro');
  });

  it('the adaptive projection source closure contains no Node builtin', () => {
    expect(
      forbiddenSourceImportClosure('.', 'packages/astro/src/adaptive-runtime.ts', [
        { pattern: /^node:/, reason: 'node-free adaptive projection cannot reach a Node builtin' },
      ]),
    ).toEqual([]);
  });
});
