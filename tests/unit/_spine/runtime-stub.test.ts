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

describe('@czap/_spine package hygiene', () => {
  test('declares effect as a peer and astro/vite as optional peers', () => {
    expect(manifest.peerDependencies?.['effect']).toBeDefined();
    expect(manifest.peerDependencies?.['astro']).toBeDefined();
    expect(manifest.peerDependencies?.['vite']).toBeDefined();
    expect(manifest.peerDependenciesMeta?.['astro']?.optional).toBe(true);
    expect(manifest.peerDependenciesMeta?.['vite']?.optional).toBe(true);
    // effect types are the contract — it must stay a required peer.
    expect(manifest.peerDependenciesMeta?.['effect']).toBeUndefined();
  });

  test('exports map routes runtime imports at the teaching stub', () => {
    expect(manifest.exports['.']?.['types']).toBe('./index.d.ts');
    expect(manifest.exports['.']?.['default']).toBe('./stub.js');
    expect(manifest.files).toContain('stub.js');
  });

  test('the stub throws a teaching error naming import type and @czap/core', async () => {
    await expect(import(/* @vite-ignore */ pathToFileURL(resolve(packageRoot, 'stub.js')).href)).rejects.toThrow(
      /type-only.*import type.*@czap\/core/s,
    );
  });
});
