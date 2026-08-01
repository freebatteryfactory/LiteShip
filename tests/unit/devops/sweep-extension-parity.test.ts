/** Sweep extension inventories derive from the browser host source authority. @module */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getEnvironmentConfig } from '../../../packages/vite/src/environments.js';
import { dynamicCodeSourceExtensions } from '../../../scripts/lib/dynamic-code-residue.js';
import { EFFECT_RESIDUE_SOURCE_EXTENSIONS } from '../../../scripts/lib/effect-residue.js';

const ROOT = resolve(import.meta.dirname, '../../..');

function independentlyLintOwnedPackageSourceExtensions(): readonly string[] {
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
    readonly scripts?: Readonly<Record<string, unknown>>;
  };
  const lint = manifest.scripts?.['lint'];
  if (typeof lint !== 'string') return [];
  const extensions = new Set<string>();
  for (const match of lint.matchAll(/"(packages\/[^" ]+\/src\/[^" ]+)"/gu)) {
    const extension = match[1]?.match(/(\.[A-Za-z0-9]+)$/u)?.[1];
    if (extension !== undefined) extensions.add(extension);
  }
  return [...extensions].sort();
}

describe('the residue sweeps cover the browser host source grammar', () => {
  const hostExtensions = getEnvironmentConfig('browser').resolve.extensions;
  const lintOwnedExtensions = independentlyLintOwnedPackageSourceExtensions();

  it('the browser host declares a non-empty extension authority', () => {
    expect(hostExtensions.length).toBeGreaterThan(0);
  });

  it('the effect-residue sweep owns every browser extension', () => {
    const missing = hostExtensions.filter((extension) => !EFFECT_RESIDUE_SOURCE_EXTENSIONS.includes(extension));
    expect(missing).toEqual([]);
  });

  it('the dynamic-code sweep plus the root lint authority own every browser extension', () => {
    const dynamicExtensions = dynamicCodeSourceExtensions(ROOT);
    const covered = new Set([...dynamicExtensions, ...lintOwnedExtensions]);
    const missing = hostExtensions.filter((extension) => !covered.has(extension));
    expect(missing).toEqual([]);
    expect(dynamicExtensions.filter((extension) => lintOwnedExtensions.includes(extension))).toEqual([]);
  });

  it('the sole delegated browser extension is derived from the root lint script', () => {
    const delegated = hostExtensions.filter((extension) => lintOwnedExtensions.includes(extension));
    expect(delegated).toEqual(['.ts']);
  });
});
