/**
 * Property test: boundary manifest identity.
 *
 * For any boundary definition, the id `collectBoundaryManifest` emits is
 * exactly the content address `Boundary.make` mints for the same
 * definition (ADR-0003 identity law) and matches the pinned
 * `fnv1a:xxxxxxxx` format -- the manifest is a derivation, never a
 * re-hash or a hand-typed value.
 */

import { afterEach, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Boundary } from '@liteship/core';
import { collectBoundaryManifest } from '@liteship/vite';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-manifest-prop-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('boundary manifest identity properties', () => {
  test('manifest ids equal Boundary.make ids for arbitrary definitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 5 }),
        fc.constantFrom('viewport.width', 'container-width', 'scroll.y'),
        async (rawThresholds, input) => {
          const sorted = [...rawThresholds].sort((a, b) => a - b);
          const pairs = sorted.map((t, i) => [t, `state${i}`] as const);
          const reference = Boundary.make({
            input,
            at: pairs as unknown as readonly [readonly [number, string]],
          });

          const root = makeTempDir();
          const srcDir = join(root, 'src');
          mkdirSync(srcDir, { recursive: true });
          // The fixture mints its own id via Boundary.make (resolved through
          // the workspace test alias), so the assertion below proves the
          // manifest carries the minted address -- not a re-hash, not a copy
          // of anything this test file computed.
          writeFileSync(
            join(srcDir, 'boundaries.ts'),
            `
import { Boundary } from '@liteship/core';

export const generated = Boundary.make({
  input: ${JSON.stringify(input)},
  at: ${JSON.stringify(pairs)},
});
`,
          );

          const manifest = await collectBoundaryManifest(root);
          const entry = manifest['generated'];

          expect(entry).toBeDefined();
          expect(entry!.id).toBe(reference.id);
          expect(entry!.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);
        },
      ),
      { numRuns: 10 },
    );
  });
});
