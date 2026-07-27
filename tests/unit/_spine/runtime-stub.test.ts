/**
 * Package hygiene for the type-only spine: peer declarations and the
 * runtime stub that turns a value import into a teaching error.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, test } from 'vitest';

const packageRoot = fileURLToPath(new URL('../../../packages/_spine', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
  exports: Record<string, Record<string, string>>;
  files: string[];
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};

describe('@liteship/_spine package hygiene', () => {
  test('declares astro/vite as optional peers and no effect peer (shed in Wave 8)', () => {
    expect(manifest.peerDependencies?.['astro']).toBeDefined();
    expect(manifest.peerDependencies?.['vite']).toBeDefined();
    expect(manifest.peerDependenciesMeta?.['astro']?.optional).toBe(true);
    expect(manifest.peerDependenciesMeta?.['vite']?.optional).toBe(true);
    // effect was the type contract's transport; Wave 8 moved every mirrored
    // surface to a LiteShip-native owner, so effect is no longer a peer at all.
    expect(manifest.peerDependencies?.['effect']).toBeUndefined();
  });

  test('exports map routes runtime imports at the teaching stub', () => {
    expect(manifest.exports['.']?.['types']).toBe('./index.d.ts');
    expect(manifest.exports['.']?.['default']).toBe('./stub.js');
    expect(manifest.files).toContain('stub.js');
  });

  test('the stub throws a teaching error naming import type and @liteship/core', async () => {
    await expect(import(/* @vite-ignore */ pathToFileURL(resolve(packageRoot, 'stub.js')).href)).rejects.toThrow(
      /type-only.*import type.*@liteship\/core/s,
    );
  });
});
