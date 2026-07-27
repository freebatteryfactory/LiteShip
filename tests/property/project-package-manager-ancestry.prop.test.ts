/** Model-based filesystem properties for consumer package-manager ownership. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { detectProjectPackageManager } from '../../packages/cli/src/internal/project-package-manager.js';

type Manager = 'npm' | 'pnpm' | 'yarn';
type Marker = 'manifest' | 'lockfile';

interface Boundary {
  readonly manager: Manager;
  readonly marker: Marker;
}

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(depth: number): { readonly root: string; readonly directories: readonly string[] } {
  const root = mkdtempSync(join(tmpdir(), 'liteship-pm-model-'));
  roots.push(root);
  const directories = [root];
  let current = root;
  for (let index = 0; index < depth; index += 1) {
    current = join(current, `level-${index}`);
    mkdirSync(current, { recursive: true });
    directories.push(current);
  }
  return { root, directories };
}

function lockfile(manager: Manager): string {
  if (manager === 'npm') return 'package-lock.json';
  if (manager === 'pnpm') return 'pnpm-lock.yaml';
  return 'yarn.lock';
}

function writeBoundary(directory: string, boundary: Boundary, ownsNested: boolean): void {
  if (boundary.marker === 'manifest') {
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({
        packageManager: `${boundary.manager}@1.0.0`,
        ...(ownsNested ? { workspaces: ['**/*'] } : {}),
      }),
    );
    return;
  }
  if (ownsNested) writeFileSync(join(directory, 'package.json'), JSON.stringify({ workspaces: ['**/*'] }));
  writeFileSync(join(directory, lockfile(boundary.manager)), `${boundary.manager} fixture\n`);
}

function expected(manager: Manager): unknown {
  return manager === 'yarn'
    ? { kind: 'unsupported', manager: 'yarn', source: expect.any(String) }
    : { kind: 'supported', manager };
}

const managerArb = fc.constantFrom<Manager>('npm', 'pnpm', 'yarn');
const markerArb = fc.constantFrom<Marker>('manifest', 'lockfile');

describe('project package-manager ancestry model', () => {
  it('selects the nearest owning boundary at arbitrary nesting depth', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        managerArb,
        markerArb,
        managerArb,
        markerArb,
        fc.integer({ min: 0, max: 5 }),
        (depth, rootManager, rootMarker, nearManager, nearMarker, rawNearIndex) => {
          const tree = fixture(depth);
          const nearIndex = 1 + (rawNearIndex % depth);
          writeBoundary(tree.root, { manager: rootManager, marker: rootMarker }, true);
          writeBoundary(tree.directories[nearIndex]!, { manager: nearManager, marker: nearMarker }, true);

          expect(detectProjectPackageManager(tree.directories.at(-1)!, {})).toEqual(expected(nearManager));
        },
      ),
      { seed: 0x50_4d_01, numRuns: 120 },
    );
  });

  it('uses the workspace root when intermediate package manifests do not own nested projects', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 7 }), managerArb, markerArb, (depth, manager, marker) => {
        const tree = fixture(depth);
        writeBoundary(tree.root, { manager, marker }, true);
        for (const directory of tree.directories.slice(1, -1)) {
          writeFileSync(join(directory, 'package.json'), JSON.stringify({ private: true }));
        }

        expect(detectProjectPackageManager(tree.directories.at(-1)!, {})).toEqual(expected(manager));
      }),
      { seed: 0x50_4d_02, numRuns: 80 },
    );
  });

  it('lets the exact application marker win even when it is not a workspace owner', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        managerArb,
        markerArb,
        managerArb,
        markerArb,
        (depth, rootManager, rootMarker, appManager, appMarker) => {
          const tree = fixture(depth);
          const app = tree.directories.at(-1)!;
          writeBoundary(tree.root, { manager: rootManager, marker: rootMarker }, true);
          writeBoundary(app, { manager: appManager, marker: appMarker }, false);

          expect(detectProjectPackageManager(app, {})).toEqual(expected(appManager));
        },
      ),
      { seed: 0x50_4d_03, numRuns: 100 },
    );
  });

  it('prefers packageManager to colocated lockfiles without consulting ambient user-agent state', () => {
    fc.assert(
      fc.property(managerArb, markerArb, managerArb, (declared, _marker, invoking) => {
        const tree = fixture(1);
        const app = tree.directories.at(-1)!;
        writeBoundary(app, { manager: declared, marker: 'manifest' }, false);
        for (const manager of ['npm', 'pnpm', 'yarn'] as const) {
          writeFileSync(join(app, lockfile(manager)), `${manager}\n`);
        }

        expect(
          detectProjectPackageManager(app, {
            npm_config_user_agent: `${invoking}/1.0.0 node/v22`,
          }),
        ).toEqual(expected(declared));
      }),
      { seed: 0x50_4d_04, numRuns: 60 },
    );
  });

  it('refuses every ambiguous lockfile set rather than selecting by enumeration order', () => {
    const subsets: readonly (readonly Manager[])[] = [
      ['npm', 'pnpm'],
      ['npm', 'yarn'],
      ['pnpm', 'yarn'],
      ['npm', 'pnpm', 'yarn'],
    ];
    fc.assert(
      fc.property(fc.constantFrom(...subsets), (managers) => {
        const tree = fixture(1);
        const app = tree.directories.at(-1)!;
        for (const manager of managers) writeFileSync(join(app, lockfile(manager)), `${manager}\n`);

        const detection = detectProjectPackageManager(app, {
          npm_config_user_agent: 'npm/10.0.0 node/v22',
        });
        expect(detection).toEqual({
          kind: 'unsupported',
          manager: `conflicting lockfiles (${[...managers].sort().join(', ')})`,
          source: 'lockfile',
        });
      }),
      { seed: 0x50_4d_05, numRuns: 40 },
    );
  });

  it('ignores unrelated ancestor markers that do not declare workspace ownership', () => {
    fc.assert(
      fc.property(managerArb, markerArb, managerArb, (ambient, marker, invoking) => {
        const tree = fixture(3);
        writeBoundary(tree.root, { manager: ambient, marker }, false);
        const app = tree.directories.at(-1)!;

        expect(
          detectProjectPackageManager(app, {
            npm_config_user_agent: `${invoking}/1.0.0 node/v22`,
          }),
        ).toEqual(expected(invoking));
      }),
      { seed: 0x50_4d_06, numRuns: 80 },
    );
  });

  it('treats null and scalar workspaces fields as data, not ownership authority', () => {
    fc.assert(
      fc.property(fc.constantFrom<unknown>(null, false, true, 0, 1, 'apps/*'), managerArb, (workspaces, invoking) => {
        const tree = fixture(2);
        writeFileSync(join(tree.root, 'package.json'), JSON.stringify({ workspaces }));
        writeFileSync(join(tree.root, 'yarn.lock'), '# ambient marker\n');

        expect(
          detectProjectPackageManager(tree.directories.at(-1)!, {
            npm_config_user_agent: `${invoking}/1.0.0 node/v22`,
          }),
        ).toEqual(expected(invoking));
      }),
      { seed: 0x50_4d_07, numRuns: 60 },
    );
  });
});
