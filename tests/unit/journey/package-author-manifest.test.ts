// @vitest-environment node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { writePackedAuthorManifest, type PackedWorkspace } from '../../journey/harness.js';

describe('current packed package-author manifest', () => {
  test('uses the facade as its only LiteShip dependency without enabling hoisting', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-package-author-manifest-'));
    try {
      const tarball = join(root, 'liteship-1.0.0.tgz');
      writeFileSync(tarball, 'fixture');
      const packed: PackedWorkspace = {
        tarballDir: root,
        tarballByName: new Map([['liteship', tarball]]),
      };
      writePackedAuthorManifest(root, packed);

      const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
        readonly dependencies: Readonly<Record<string, string>>;
        readonly pnpm: { readonly overrides: Readonly<Record<string, string>> };
      };
      expect(Object.keys(manifest.dependencies).sort()).toEqual(['liteship', 'typescript']);
      expect(manifest.dependencies['liteship']).toMatch(/^file:/);
      expect(manifest.pnpm.overrides['liteship']).toMatch(/^file:/);
      expect(existsSync(join(root, '.npmrc'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
