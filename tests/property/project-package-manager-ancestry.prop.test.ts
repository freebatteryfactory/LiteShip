/** Pure model properties for consumer package-manager ownership precedence. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  selectProjectPackageManager,
  type ProjectPackageManagerBoundary,
} from '../../packages/cli/src/internal/project-package-manager.js';

type Manager = 'npm' | 'pnpm' | 'yarn';
type Marker = 'manifest' | 'lockfile';

const managerArb = fc.constantFrom<Manager>('npm', 'pnpm', 'yarn');
const markerArb = fc.constantFrom<Marker>('manifest', 'lockfile');

function boundary(manager: Manager, marker: Marker, ownsNestedProjects = true): ProjectPackageManagerBoundary {
  return {
    kind: 'boundary',
    ownsNestedProjects,
    ...(marker === 'manifest' ? { packageManager: `${manager}@1.0.0` } : {}),
    lockfileManagers: marker === 'lockfile' ? [manager] : [],
  };
}

function emptyBoundary(ownsNestedProjects: boolean): ProjectPackageManagerBoundary {
  return { kind: 'boundary', ownsNestedProjects, lockfileManagers: [] };
}

function expected(manager: Manager): unknown {
  return manager === 'yarn'
    ? { kind: 'unsupported', manager: 'yarn', source: expect.any(String) }
    : { kind: 'supported', manager };
}

describe('project package-manager ancestry model', () => {
  it('selects the nearest owning boundary at arbitrary nesting depth', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 0, max: 6 }),
        managerArb,
        markerArb,
        managerArb,
        markerArb,
        (nearDistance, rootDistance, rootManager, rootMarker, nearManager, nearMarker) => {
          const observations: ProjectPackageManagerBoundary[] = [emptyBoundary(true)];
          observations.push(...Array.from({ length: nearDistance }, () => emptyBoundary(false)));
          observations.push(boundary(nearManager, nearMarker));
          observations.push(...Array.from({ length: rootDistance }, () => emptyBoundary(false)));
          observations.push(boundary(rootManager, rootMarker));

          expect(selectProjectPackageManager(observations, {})).toEqual(expected(nearManager));
        },
      ),
      { seed: 0x50_4d_01, numRuns: 240 },
    );
  });

  it('uses the workspace root when intermediate manifests do not own nested projects', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        managerArb,
        markerArb,
        managerArb,
        (depth, manager, marker, intermediateManager) => {
          const observations: ProjectPackageManagerBoundary[] = [emptyBoundary(true)];
          observations.push(...Array.from({ length: depth }, () => boundary(intermediateManager, 'manifest', false)));
          observations.push(boundary(manager, marker));

          expect(selectProjectPackageManager(observations, {})).toEqual(expected(manager));
        },
      ),
      { seed: 0x50_4d_02, numRuns: 160 },
    );
  });

  it('lets the exact application marker win before an ancestor workspace owner', () => {
    fc.assert(
      fc.property(managerArb, markerArb, managerArb, markerArb, (rootManager, rootMarker, appManager, appMarker) => {
        // The filesystem adapter marks the exact cwd boundary as eligible even
        // when its manifest has no `workspaces` field; `ownsNestedProjects`
        // means "owns this command context" for that first observation.
        const observations = [boundary(appManager, appMarker), boundary(rootManager, rootMarker)];
        expect(selectProjectPackageManager(observations, {})).toEqual(expected(appManager));
      }),
      { seed: 0x50_4d_03, numRuns: 180 },
    );
  });

  it('prefers packageManager to colocated lockfiles without consulting ambient user-agent state', () => {
    fc.assert(
      fc.property(managerArb, managerArb, (declared, invoking) => {
        const observations: ProjectPackageManagerBoundary[] = [
          {
            kind: 'boundary',
            ownsNestedProjects: true,
            packageManager: `${declared}@1.0.0`,
            lockfileManagers: ['npm', 'pnpm', 'yarn'],
          },
        ];

        expect(
          selectProjectPackageManager(observations, {
            npm_config_user_agent: `${invoking}/1.0.0 node/v22`,
          }),
        ).toEqual(expected(declared));
      }),
      { seed: 0x50_4d_04, numRuns: 120 },
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
        const detection = selectProjectPackageManager(
          [{ kind: 'boundary', ownsNestedProjects: true, lockfileManagers: managers }],
          { npm_config_user_agent: 'npm/10.0.0 node/v22' },
        );
        expect(detection).toEqual({
          kind: 'unsupported',
          manager: `conflicting lockfiles (${[...managers].sort().join(', ')})`,
          source: 'lockfile',
        });
      }),
      { seed: 0x50_4d_05, numRuns: 80 },
    );
  });

  it('ignores unrelated ancestor markers that do not declare workspace ownership', () => {
    fc.assert(
      fc.property(managerArb, markerArb, managerArb, (ambient, marker, invoking) => {
        expect(
          selectProjectPackageManager([emptyBoundary(true), boundary(ambient, marker, false)], {
            npm_config_user_agent: `${invoking}/1.0.0 node/v22`,
          }),
        ).toEqual(expected(invoking));
      }),
      { seed: 0x50_4d_06, numRuns: 160 },
    );
  });

  it('is invariant to duplicate lockfile observations from one owner', () => {
    fc.assert(
      fc.property(managerArb, fc.integer({ min: 1, max: 8 }), (manager, copies) => {
        expect(
          selectProjectPackageManager(
            [
              {
                kind: 'boundary',
                ownsNestedProjects: true,
                lockfileManagers: Array.from({ length: copies }, () => manager),
              },
            ],
            {},
          ),
        ).toEqual(expected(manager));
      }),
      { seed: 0x50_4d_07, numRuns: 120 },
    );
  });

  it('stops consuming ancestry after the nearest decisive owner', () => {
    fc.assert(
      fc.property(managerArb, markerArb, (manager, marker) => {
        function* observations(): Iterable<ProjectPackageManagerBoundary> {
          yield boundary(manager, marker);
          throw new Error('outer ancestry must remain unread after a decisive owner');
        }

        expect(selectProjectPackageManager(observations(), {})).toEqual(expected(manager));
      }),
      { seed: 0x50_4d_08, numRuns: 120 },
    );
  });

  it('admits invalid manifests only when they precede every decisive owner', () => {
    fc.assert(
      fc.property(managerArb, markerArb, fc.string({ minLength: 1, maxLength: 80 }), (manager, marker, reason) => {
        const invalid: ProjectPackageManagerBoundary = {
          kind: 'invalid-manifest',
          manifestPath: 'outer/package.json',
          reason,
        };
        expect(selectProjectPackageManager([invalid, boundary(manager, marker)], {})).toEqual(invalid);
        expect(selectProjectPackageManager([boundary(manager, marker), invalid], {})).toEqual(expected(manager));
      }),
      { seed: 0x50_4d_09, numRuns: 160 },
    );
  });

  it('is invariant to arbitrary non-owning ancestor insertions', () => {
    fc.assert(
      fc.property(
        managerArb,
        markerArb,
        fc.array(fc.tuple(managerArb, markerArb), { maxLength: 20 }),
        (ownerManager, ownerMarker, ignored) => {
          const observations = [
            emptyBoundary(true),
            ...ignored.map(([manager, marker]) => boundary(manager, marker, false)),
            boundary(ownerManager, ownerMarker),
          ];
          expect(selectProjectPackageManager(observations, {})).toEqual(expected(ownerManager));
        },
      ),
      { seed: 0x50_4d_0a, numRuns: 200 },
    );
  });

  it('uses the invoking manager exactly when ancestry is exhausted without an owner', () => {
    fc.assert(
      fc.property(managerArb, fc.integer({ min: 0, max: 20 }), (invoking, depth) => {
        const observations = Array.from({ length: depth }, () => emptyBoundary(false));
        expect(
          selectProjectPackageManager(observations, {
            npm_config_user_agent: `${invoking}/1.0.0 node/v22`,
          }),
        ).toEqual(expected(invoking));
        expect(selectProjectPackageManager(observations, {})).toEqual({ kind: 'supported', manager: 'npm' });
      }),
      { seed: 0x50_4d_0b, numRuns: 160 },
    );
  });

  it('normalizes authored manager spelling without losing packageManager provenance', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('NPM', 'PnPm', 'YARN', 'BUN'),
        fc.stringMatching(/^\s{0,8}$/u),
        (authored, padding) => {
          const result = selectProjectPackageManager(
            [
              {
                kind: 'boundary',
                ownsNestedProjects: true,
                packageManager: `${padding}${authored}@1.0.0${padding}`,
                lockfileManagers: [],
              },
            ],
            {},
          );
          const normalized = authored.toLowerCase();
          expect(result).toEqual(
            normalized === 'npm' || normalized === 'pnpm'
              ? { kind: 'supported', manager: normalized }
              : { kind: 'unsupported', manager: normalized, source: 'packageManager' },
          );
        },
      ),
      { seed: 0x50_4d_0c, numRuns: 160 },
    );
  });
});
