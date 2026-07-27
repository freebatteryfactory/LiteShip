/** CLI private-cluster visibility and inhabitation contract. @module */

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { sourceImportClosure } from '../../../scripts/lib/source-import-contract.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const INTERNAL_ROOT = resolve(REPO_ROOT, 'packages/cli/src/internal');

function topLevelTypeScriptFiles(directory: string): readonly string[] {
  return readdirSync(resolve(REPO_ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.[cm]?tsx?$/u.test(entry.name))
    .map((entry) => `${directory}/${entry.name}`)
    .sort((left, right) => left.localeCompare(right));
}

describe('@liteship/cli private source cluster', () => {
  test('uses the canonical internal/ privacy marker and retires the ambiguous lib/ path', () => {
    expect(existsSync(INTERNAL_ROOT)).toBe(true);
    expect(existsSync(resolve(REPO_ROOT, 'packages/cli/src/lib'))).toBe(false);
  });

  test('every private module is reachable from a public CLI root or executable repository script', () => {
    const roots = [
      'packages/cli/src/index.ts',
      'packages/cli/src/bin.ts',
      'packages/cli/src/spawn-helpers.ts',
      ...topLevelTypeScriptFiles('scripts'),
    ];
    const reachable = new Set(sourceImportClosure(REPO_ROOT, roots));
    const internalFiles = readdirSync(INTERNAL_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.[cm]?tsx?$/u.test(entry.name))
      .map((entry) => `packages/cli/src/internal/${entry.name}`)
      .sort((left, right) => left.localeCompare(right));
    const unreachable = internalFiles.filter((file) => !reachable.has(file));

    expect(unreachable, 'internal/ is a privacy boundary, never an unreachable-code amnesty').toEqual([]);
  });
});
