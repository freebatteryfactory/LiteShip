/**
 * Umbrella roster drift guard — `LITESHIP_PACKAGES` must match manifest deps.
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LITESHIP_PACKAGES } from '../../../packages/liteship/src/index.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const MANIFEST_PATH = resolve(REPO, 'packages/liteship/package.json');

function czapDependenciesFromManifest(): string[] {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  return Object.keys(manifest.dependencies ?? {})
    .filter((name) => name.startsWith('@czap/'))
    .sort();
}

describe('liteship umbrella roster', () => {
  it('LITESHIP_PACKAGES matches every @czap/* dependency in package.json', () => {
    expect([...LITESHIP_PACKAGES].sort()).toEqual(czapDependenciesFromManifest());
  });

  it('includes framework primitive packages', () => {
    expect(LITESHIP_PACKAGES).toContain('@czap/canonical');
    expect(LITESHIP_PACKAGES).toContain('@czap/genui');
  });
});
