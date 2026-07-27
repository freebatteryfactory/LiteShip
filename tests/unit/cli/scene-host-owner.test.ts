import { describe, expect, test } from 'vitest';
import { sourceRuntimeImports } from '../../../scripts/lib/source-import-contract.js';

const SCENE_ADAPTERS = [
  'packages/cli/src/commands/scene-compile.ts',
  'packages/cli/src/commands/scene-render.ts',
] as const;

describe('scene CLI host composition owner', () => {
  test.each(SCENE_ADAPTERS)('%s projects through the shared command host', (file) => {
    const imports = sourceRuntimeImports('.', file);
    expect(imports).toContain('../internal/run-command.js');
    expect(imports).not.toEqual(
      expect.arrayContaining(['@liteship/command/host', '@liteship/core', '@liteship/stage', 'node:url']),
    );
  });
});
