/**
 * Type-export surface gate — the Wave-8.5 mechanism (issue #156) that closes the
 * api-surface snapshot's structural blind spot.
 *
 * The committed api-surface snapshot is VALUE-only (runtime `import * as`), so a
 * type-only export that appears, vanishes, or is renamed on a package's public
 * surface — the exact CapSet CLASS of slip — is invisible to it. This gate walks
 * the shipped `.ts` / `.d.ts` AST and pins every public TYPE export, so that class
 * of drift reds here.
 *
 * RED-FIRST: the teeth tests (synthetic-walk precision + the CapSet-class BITE +
 * the value-gate-is-blind cross-check) do not depend on the committed snapshot —
 * they prove the enumerator catches what it must before the snapshot is minted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildTypeExportSurface,
  enumeratePackageTypeExports,
  serializeTypeExportSurface,
  diffTypeExportSurface,
  type SurfaceReader,
  type TypeExportRosterEntry,
  type TypeExportSurfaceSnapshot,
} from '../../../packages/audit/src/type-export-surface.js';
import { LITESHIP_API_SURFACE_POLICY } from '../../fixtures/api-surface-policy.js';
import { scaledTimeout } from '../../../vitest.shared.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const PACKAGES_DIR = resolve(REPO_ROOT, 'packages');
const SNAPSHOT_PATH = resolve(REPO_ROOT, 'tests/fixtures/type-export-surface.json');

/**
 * The type-surface roster: every public runtime barrel the value gate locks, PLUS
 * `@czap/_spine` (the `.d.ts`-only mirror the value gate cannot enumerate at all,
 * and the whole reason a TYPE surface is needed). Deliberately data, resolved to
 * each package's SOURCE entry (`development`/`types`, never the built `dist`).
 */
const ROSTER_NAMES: readonly string[] = [...LITESHIP_API_SURFACE_POLICY.publicPackages, '@czap/_spine'];

interface ManifestExports {
  readonly '.'?: { readonly development?: string; readonly types?: string; readonly import?: string };
}

function manifestByName(pkgName: string): { readonly dir: string; readonly exports: ManifestExports } {
  for (const dir of readdirSync(PACKAGES_DIR)) {
    const pj = join(PACKAGES_DIR, dir, 'package.json');
    if (!existsSync(pj)) continue;
    const manifest = JSON.parse(readFileSync(pj, 'utf8')) as { name?: string; exports?: ManifestExports };
    if (manifest.name === pkgName) return { dir: join(PACKAGES_DIR, dir), exports: manifest.exports ?? {} };
  }
  throw new Error(`no packages/*/package.json declares name ${pkgName}`);
}

function rosterEntry(pkgName: string): TypeExportRosterEntry {
  const { dir, exports } = manifestByName(pkgName);
  const dot = exports['.'] ?? {};
  const rel = dot.development ?? dot.types ?? dot.import;
  if (rel === undefined) throw new Error(`${pkgName} declares no '.' export entry`);
  return { name: pkgName, entryFile: resolve(dir, rel) };
}

const ROSTER: readonly TypeExportRosterEntry[] = ROSTER_NAMES.map(rosterEntry);

/** A virtual filesystem reader over a `{ absPath: content }` map — pure, disk-free. */
function virtualReader(files: Readonly<Record<string, string>>): SurfaceReader {
  return {
    readFile: (path) => {
      const text = files[path];
      if (text === undefined) throw new Error(`virtual reader: no file ${path}`);
      return text;
    },
    fileExists: (path) => path in files,
  };
}

describe('type-export enumerator — precision (pure synthetic walk)', () => {
  it('collects declared + relative-star + type-only re-exports; skips values and unreached internals', () => {
    const files = {
      '/virt/index.d.ts': [
        `export interface Alpha { readonly x: number }`,
        `export type Beta = string;`,
        `export enum Gamma { A, B }`,
        `export * from './more.js';`, // followed → Delta collected
        `export type { Zeta } from './named.js';`, // type-only named re-export → Zeta
        `export { type Eta, plainValue } from './mixed.js';`, // inline: Eta is type, plainValue is not
        `export const notAType = 1;`, // value → skipped
        `export function alsoNotAType(): void {}`, // value → skipped
      ].join('\n'),
      '/virt/more.ts': `export type Delta = number;\nexport const internalValue = 2;`,
      '/virt/named.ts': `export type Zeta = boolean;`,
      '/virt/mixed.ts': `export type Eta = 1 | 2;\nexport const plainValue = 3;`,
    } as const;
    const got = enumeratePackageTypeExports('/virt/index.d.ts', virtualReader(files));
    const byName = Object.fromEntries(got.map((d) => [d.name, d.kind]));
    expect(byName).toEqual({
      Alpha: 'interface',
      Beta: 'type',
      Gamma: 'enum',
      Delta: 'type', // reached through the relative `export *`
      Zeta: 'type', // `export type { Zeta }`
      Eta: 'type', // `export { type Eta }`
    });
    // Values never enter the TYPE surface — that is the api-surface gate's plane.
    expect(byName).not.toHaveProperty('notAType');
    expect(byName).not.toHaveProperty('alsoNotAType');
    expect(byName).not.toHaveProperty('plainValue');
    expect(byName).not.toHaveProperty('internalValue');
  });

  it('is order-deterministic (sorted by name, then kind)', () => {
    const files = {
      '/v/index.ts': `export type Zed = 1;\nexport interface Amy {}\nexport type Amy2 = 2;`,
    } as const;
    const got = enumeratePackageTypeExports('/v/index.ts', virtualReader(files));
    expect(got.map((d) => d.name)).toEqual(['Amy', 'Amy2', 'Zed']);
  });
});

describe('type-export enumerator — teeth (the CapSet class of slip / value gate is blind)', () => {
  it('surfaces the spine mirror type `CapSet`, and a dropped mirror type reds as removed', () => {
    const live = buildTypeExportSurface(ROSTER);
    const spine = live.packages['@czap/_spine'];
    expect(spine, '@czap/_spine must be in the type surface roster').toBeDefined();
    const hasCapSet = spine!.typeExports.some((d) => d.name === 'CapSet');
    expect(hasCapSet, 'the spine mirror declares interface CapSet').toBe(true);

    // Simulate the omission slip: drop CapSet from the spine surface. The value
    // snapshot cannot see this (CapSet has no runtime footprint); this gate does.
    const dropped: TypeExportSurfaceSnapshot = {
      ...live,
      packages: {
        ...live.packages,
        '@czap/_spine': {
          typeExports: spine!.typeExports.filter((d) => d.name !== 'CapSet'),
        },
      },
    };
    const drift = diffTypeExportSurface(dropped, live);
    const capSetDrift = drift.filter((d) => d.pkg === '@czap/_spine' && d.detail.includes('CapSet'));
    expect(capSetDrift).toHaveLength(1);
    expect(capSetDrift[0]!.changeClass).toBe('added'); // live has it, "dropped" baseline does not
  });

  it('captures a type-only export the VALUE api-surface snapshot is structurally blind to', () => {
    const live = buildTypeExportSurface(ROSTER);
    const coreTypes = live.packages['@czap/core']!.typeExports.map((d) => d.name);
    // `SchemaPort` is `export type { SchemaPort } from './schema-port.js'` — a
    // type-only export: present here, absent from the runtime value surface.
    expect(coreTypes).toContain('SchemaPort');

    const valueSnapshot = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'tests/fixtures/api-surface-snapshot.json'), 'utf8'),
    ) as {
      packages: Record<string, { exports: readonly { name: string }[] }>;
    };
    const coreValues = valueSnapshot.packages['@czap/core']!.exports.map((e) => e.name);
    expect(coreValues, 'SchemaPort is a TYPE — it must not appear in the value surface').not.toContain('SchemaPort');
  });
});

describe('type-export surface snapshot gate (drift)', () => {
  it(
    'the committed snapshot matches the live type surface (regenerate with CZAP_UPDATE_TYPE_EXPORT_SNAPSHOT=1)',
    { timeout: scaledTimeout(60_000) },
    () => {
      const live = serializeTypeExportSurface(buildTypeExportSurface(ROSTER));
      // if/else (NOT an early return): a bare `return` before the first `expect`
      // trips the no-early-return-test gate — the regen branch must not read as an
      // assertion-less test path (mirrors tests/unit/meta/api-surface.test.ts).
      if (process.env.CZAP_UPDATE_TYPE_EXPORT_SNAPSHOT === '1') {
        writeFileSync(SNAPSHOT_PATH, live);
      } else {
        const committed = readFileSync(SNAPSHOT_PATH, 'utf8');
        const drift = diffTypeExportSurface(
          JSON.parse(committed) as TypeExportSurfaceSnapshot,
          JSON.parse(live) as TypeExportSurfaceSnapshot,
        );
        expect(
          live === committed,
          drift.length === 0
            ? 'Type surface serialization drifted but no per-type diff was found — regenerate with CZAP_UPDATE_TYPE_EXPORT_SNAPSHOT=1 and review.'
            : `Public TYPE surface drifted from the committed snapshot:\n` +
                drift.map((d) => `  • ${d.pkg}: ${d.detail} [${d.changeClass}]`).join('\n') +
                `\n\nIf intentional, regenerate (CZAP_UPDATE_TYPE_EXPORT_SNAPSHOT=1 npx vitest run tests/unit/audit/type-export-surface.test.ts) and review the diff — a dropped type is a broken public contract, never a silent pass.`,
        ).toBe(true);
      }
    },
  );

  it('the committed snapshot is byte-canonical (re-serializing it is a no-op)', () => {
    const committed = readFileSync(SNAPSHOT_PATH, 'utf8');
    const reserialized = serializeTypeExportSurface(JSON.parse(committed) as TypeExportSurfaceSnapshot);
    expect(reserialized).toBe(committed);
  });

  it('the committed snapshot covers exactly the roster', () => {
    const committed = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as TypeExportSurfaceSnapshot;
    expect(Object.keys(committed.packages).sort()).toEqual([...ROSTER_NAMES].sort());
  });
});
