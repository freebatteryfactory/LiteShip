// @vitest-environment node

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { proveInstalledRuntimeFacadeIdentity } from '../../journey/harness.js';

const roots: string[] = [];

function fixture(facadeSource: string): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-runtime-identity-'));
  roots.push(root);
  const facade = join(root, 'node_modules', 'facade');
  const owner = join(facade, 'node_modules', 'owner');
  mkdirSync(owner, { recursive: true });
  writeFileSync(
    join(facade, 'package.json'),
    JSON.stringify({ name: 'facade', type: 'module', exports: { './surface': './surface.mjs' } }),
  );
  writeFileSync(join(facade, 'surface.mjs'), facadeSource);
  writeFileSync(join(owner, 'package.json'), JSON.stringify({ name: 'owner', type: 'module', exports: './index.mjs' }));
  writeFileSync(
    join(owner, 'index.mjs'),
    ['export const shared = Object.freeze({ value: 1 });', 'export function identity(value) { return value; }'].join(
      '\n',
    ),
  );
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('installed runtime facade identity proof', () => {
  test('passes only when a strict nested owner is reachable through the facade and every export is identical', async () => {
    const root = fixture("export * from 'owner';");
    const proof = await proveInstalledRuntimeFacadeIdentity(root, 'facade/surface', 'owner');

    expect(proof.exportNames).toEqual(['identity', 'shared']);
    expect(proof.facadeUrl).toContain('/node_modules/facade/');
    expect(proof.ownerUrl).toContain('/node_modules/facade/node_modules/owner/');
  });

  test('reds when the facade wraps an owner export under the same public name', async () => {
    const root = fixture(
      [
        "import { identity as ownerIdentity } from 'owner';",
        "export { shared } from 'owner';",
        'export function identity(value) { return ownerIdentity(value); }',
      ].join('\n'),
    );

    await expect(proveInstalledRuntimeFacadeIdentity(root, 'facade/surface', 'owner')).rejects.toThrow(
      'wrapped or copied',
    );
  });

  test('reds when the facade drops an owner runtime export', async () => {
    const root = fixture("export { shared } from 'owner';");

    await expect(proveInstalledRuntimeFacadeIdentity(root, 'facade/surface', 'owner')).rejects.toThrow(
      'runtime export set differs',
    );
  });
});
