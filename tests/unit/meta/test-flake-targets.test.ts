/**
 * Meta guard — every path in the flake repetition list resolves to a real file.
 * Vitest exits 0 when dead paths are mixed with live ones (silent partial run).
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { FLAKE_BROWSER_TARGETS, FLAKE_NODE_TARGETS } from '../../../scripts/test-flake-targets.ts';
import { repoRoot } from '../../../vitest.shared.ts';

describe('test:flake target paths exist on disk', () => {
  it('every node flake target resolves to a file', () => {
    const missing = FLAKE_NODE_TARGETS.filter((rel) => !existsSync(resolve(repoRoot, rel)));
    expect(missing, `missing node flake targets: ${missing.join(', ')}`).toEqual([]);
  });

  it('every browser flake target resolves to a file', () => {
    const missing = FLAKE_BROWSER_TARGETS.filter((rel) => !existsSync(resolve(repoRoot, rel)));
    expect(missing, `missing browser flake targets: ${missing.join(', ')}`).toEqual([]);
  });
});
