import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { LITESHIP_LOCKFILE_POLICY } from '../../../packages/cli/src/lib/supply-chain-policy.js';

/**
 * effect version-sync drift guard.
 *
 * `effect` is the monorepo-wide algebraic-effect substrate and the single
 * sanctioned prerelease dependency. The root `pnpm.overrides.effect` physically
 * pins one resolved version across the workspace (mirroring `pnpm.overrides.astro`),
 * and every published `@czap/*` package must advertise the SAME bounded library
 * range so a consumer never sees one package demand `>=4.0.0-beta.0` while another
 * demands the tested floor — a silent, install-time-only divergence.
 *
 * Source of truth: root `pnpm.overrides.effect` (V). Library range R = `>=${V} <5`.
 * Roles (the one real asymmetry vs the astro guard — effect's fields are not
 * symmetric: libraries declare the RANGE, apps pin the exact FLOOR):
 *   - packages/* peerDependencies / dependencies.effect  === R          (libraries)
 *   - packages/* devDependencies.effect                  === V          (the dev pin)
 *   - examples/* dependencies.effect                     === V          (apps pin the floor)
 *   - the create-liteship template dependencies.effect   === `^${V}`    (caret floor; see scaffold)
 *
 * Pin the LAW and derive `expected` from the override, so a floor bump is a
 * one-line change the guard propagates.
 */

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const TEMPLATE = 'packages/create-liteship/templates/default/package.json';

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

const root = readJson(join(REPO_ROOT, 'package.json'));
const V = ((root.pnpm as Record<string, Record<string, string>> | undefined)?.overrides ?? {}).effect;
const R = `>=${V} <5`;
const CARET = `^${V}`;

type Role = 'lib-range' | 'dev-floor' | 'app-floor' | 'template-caret';
interface Pin {
  readonly file: string;
  readonly field: string;
  readonly range: string;
  readonly expected: string;
  readonly role: Role;
}

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

function effectPinsIn(manifestPath: string, group: 'packages' | 'examples' | 'template'): Pin[] {
  if (!existsSync(manifestPath)) return [];
  const pkg = readJson(manifestPath);
  const file = relative(REPO_ROOT, manifestPath).replace(/\\/g, '/');
  const pins: Pin[] = [];
  for (const field of DEP_FIELDS) {
    const range = (pkg[field] as Record<string, string> | undefined)?.effect;
    if (typeof range !== 'string') continue;
    let expected: string;
    let role: Role;
    if (group === 'template') {
      expected = CARET;
      role = 'template-caret';
    } else if (group === 'examples') {
      expected = V;
      role = 'app-floor';
    } else if (field === 'devDependencies') {
      expected = V;
      role = 'dev-floor';
    } else {
      expected = R;
      role = 'lib-range';
    }
    pins.push({ file, field, range, expected, role });
  }
  return pins;
}

function collectPins(): Pin[] {
  const pins: Pin[] = [];
  for (const group of ['packages', 'examples'] as const) {
    const groupDir = join(REPO_ROOT, group);
    if (!existsSync(groupDir)) continue;
    for (const name of readdirSync(groupDir)) {
      pins.push(...effectPinsIn(join(groupDir, name, 'package.json'), group));
    }
  }
  pins.push(...effectPinsIn(join(REPO_ROOT, TEMPLATE), 'template'));
  return pins;
}

const pins = collectPins();

describe('effect version sync', () => {
  it('the root pnpm.overrides.effect is the single source of truth', () => {
    expect(V, 'root package.json must pin pnpm.overrides.effect').toBeTypeOf('string');
    expect(V, 'overrides.effect must be an exact prerelease version (the tested floor)').toMatch(
      /^\d+\.\d+\.\d+-/,
    );
  });

  it('found the expected effect pins (drift guard for the derived list)', () => {
    // If the sweep silently finds nothing, the per-pin loop below would vacuously
    // pass — name the load-bearing pins so a structural change is caught.
    const keys = pins.map((p) => `${p.file}:${p.field}`);
    expect(keys).toContain('packages/core/package.json:peerDependencies');
    expect(keys).toContain('packages/cli/package.json:dependencies');
    expect(keys).toContain(`${TEMPLATE}:dependencies`);
    expect(pins.some((p) => p.role === 'app-floor')).toBe(true);
  });

  it('every effect pin matches its role-derived expected range', () => {
    for (const pin of pins) {
      expect(
        pin.range,
        `${pin.file} ${pin.field}.effect (${pin.range}) must be "${pin.expected}" — role ${pin.role}, derived from overrides.effect ${V}`,
      ).toBe(pin.expected);
    }
  });

  it('the supply-chain policy prose cites the canonical range (no stale prose)', () => {
    const exception = LITESHIP_LOCKFILE_POLICY.prereleaseAllowlist.find((e) => e.dependency === 'effect');
    expect(exception, 'effect must be a named prerelease exception').toBeDefined();
    expect(exception!.reason, `policy reason must cite the canonical range R (${R})`).toContain(R);
  });

  it('literal-bearing test files embed the current effect floor (no silent rot on a bump)', () => {
    // These fixtures/assertions hard-code the effect range/floor for their own
    // reasons; the manifest sweep above does NOT cover them, so a floor bump would
    // leave them stale. Pin them here — a bump reds these for a coordinated update.
    const read = (rel: string): string => readFileSync(join(REPO_ROOT, rel), 'utf8');
    expect(read('tests/unit/cli/supply-chain-lib.test.ts'), 'supply-chain-lib must embed the range R').toContain(R);
    for (const rel of [
      'tests/unit/cli/supply-chain-lib.test.ts',
      'tests/unit/meta/feedback-integrity.test.ts',
      'tests/unit/meta/codebase-audit.test.ts',
      'tests/unit/meta/satellite-scan.test.ts',
    ]) {
      expect(read(rel), `${rel} embeds the effect floor; bump it together (expected ${V})`).toContain(V);
    }
  });
});
