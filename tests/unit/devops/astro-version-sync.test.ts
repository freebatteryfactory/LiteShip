import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

/**
 * Astro version-sync drift guard.
 *
 * The whole workspace is pinned to ONE Astro major by the root
 * `pnpm.overrides.astro` resolution — that single override physically forces
 * every transitive `astro` to the same version. But the example/template/
 * fixture manifests carry their own caret pins (`astro: ^7.0.0`), and the
 * `@liteship/astro` / `@liteship/_spine` peers carry bounded ranges. Nothing stops one
 * of those from drifting to a different major than the override resolves to —
 * a published peer that advertises `>=6` while the workspace ships 7, or a
 * template that scaffolds `astro@^6` while `npm create liteship` users get a 7
 * runtime. That's a silent, install-time-only divergence.
 *
 * Pin the LAW (every Astro pin's major === the override's major AND no pin
 * admits a version below the override's minimum supported floor), not the
 * exact resolved patch. The pin list is DERIVED from the workspace, so a new
 * Astro-using package joins the guard the moment it declares an `astro`
 * dependency. This keeps security/compatibility floors load-bearing without
 * turning the resolved lockfile patch into a second public compatibility law.
 */

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

interface Pin {
  readonly file: string;
  readonly field: string;
  readonly range: string;
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

type VersionTuple = readonly [major: number, minor: number, patch: number];

/** EVERY complete semver tuple named anywhere in a range — a compound range
 *  like `^7.0.0 || ^6.0.0` yields both, so no branch of a union escapes the
 *  laws below by hiding behind the first tuple. */
function allVersionsOf(range: string): VersionTuple[] {
  return [...range.matchAll(/(\d+)\.(\d+)\.(\d+)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
}

/** Every major admitted by the range: majors of all complete tuples, falling
 *  back to the first bare number for shorthand ranges (`7.x`, `>=7`). */
function majorsOf(range: string): number[] {
  const tuples = allVersionsOf(range);
  if (tuples.length > 0) return [...new Set(tuples.map((t) => t[0]))];
  const match = range.match(/\d+/);
  return match ? [Number(match[0])] : [];
}

/** The LOWEST complete semver tuple in the range — the true floor a compound
 *  range admits, not merely its first-written branch. */
function minimumVersionOf(range: string): VersionTuple | null {
  const tuples = allVersionsOf(range);
  if (tuples.length === 0) return null;
  return tuples.reduce((lowest, next) => (compareVersions(next, lowest) < 0 ? next : lowest));
}

function compareVersions(left: VersionTuple, right: VersionTuple): number {
  for (let index = 0; index < left.length; index += 1) {
    const delta = left[index]! - right[index]!;
    if (delta !== 0) return delta;
  }
  return 0;
}

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

function astroPinsIn(manifestPath: string): Pin[] {
  if (!existsSync(manifestPath)) return [];
  const pkg = readJson(manifestPath);
  const pins: Pin[] = [];
  for (const field of DEP_FIELDS) {
    const deps = pkg[field] as Record<string, string> | undefined;
    const range = deps?.astro;
    if (typeof range === 'string') {
      // Normalize to forward slashes so the POSIX-style assertions below
      // (`packages/astro/...`) hold on Windows, where `relative` yields backslashes.
      pins.push({ file: relative(REPO_ROOT, manifestPath).replace(/\\/g, '/'), field, range });
    }
  }
  return pins;
}

/** Directories that never hold authored manifests — installed trees, build
 *  output, and VCS internals. Everything else is walked, so a NEW template,
 *  fragment, or fixture manifest anywhere in the repo joins the laws below the
 *  moment it exists instead of waiting to be hand-enrolled. */
const UNAUTHORED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.astro', 'reports']);

/** Every authored manifest in the repository, recursively. */
function collectManifests(): string[] {
  const manifests: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      if (UNAUTHORED_DIRS.has(name)) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === 'package.json') manifests.push(path);
    }
  };
  walk(REPO_ROOT);
  return manifests;
}

const root = readJson(join(REPO_ROOT, 'package.json'));
const overrideRange = ((root.pnpm as Record<string, Record<string, string>> | undefined)?.overrides ?? {}).astro;
const overrideMajors = overrideRange ? majorsOf(overrideRange) : [];
const overrideMinimum = overrideRange ? minimumVersionOf(overrideRange) : null;
const pins = collectManifests().flatMap(astroPinsIn);

describe('astro version sync', () => {
  it('the root pnpm.overrides.astro is the single source of truth', () => {
    expect(overrideRange, 'root package.json must pin pnpm.overrides.astro').toBeTypeOf('string');
    expect(overrideMajors, `overrides.astro ${overrideRange} must name exactly one major`).toHaveLength(1);
    expect(overrideMinimum, `overrides.astro ${overrideRange} must name a complete minimum version`).not.toBeNull();
  });

  it('found the expected Astro pins (drift guard for the derived list)', () => {
    // If the sweep silently finds nothing, the per-pin loop below would vacuously
    // pass — name the load-bearing pins so a structural change is caught.
    const files = pins.map((p) => p.file);
    expect(files).toContain('packages/astro/package.json');
    expect(files).toContain('packages/create-liteship/templates/default/package.json');
    // The CLI-shipped fragments are copied verbatim into user projects — the
    // recursive sweep must reach them (they are NOT under packages/*/package.json).
    expect(files.some((f) => f.startsWith('packages/cli/fragments/'))).toBe(true);
    expect(files.some((f) => f.startsWith('examples/'))).toBe(true);
  });

  it('range helpers see every branch of a compound range (negative controls)', () => {
    // The defect class: a union range whose FIRST branch satisfies the law
    // while a later branch admits a stale line. Helpers must fold the whole
    // range, not its first match.
    expect(minimumVersionOf('^0.24.0 || ^0.23.0')).toEqual([0, 23, 0]);
    expect(minimumVersionOf('^0.23.0 || ^0.24.0')).toEqual([0, 23, 0]);
    expect(majorsOf('^7.0.0 || ^6.0.0').sort()).toEqual([6, 7]);
    expect(majorsOf('7.x')).toEqual([7]);
    expect(minimumVersionOf('not-a-range')).toBeNull();
  });

  it('every Astro pin tracks the override major on every branch of its range', () => {
    for (const pin of pins) {
      const pinMajors = majorsOf(pin.range);
      expect(pinMajors.length, `${pin.file} ${pin.field}.astro = ${pin.range} must name a major`).toBeGreaterThan(0);
      for (const pinMajor of pinMajors) {
        expect(
          pinMajor,
          `${pin.file} ${pin.field}.astro (${pin.range}) must track the workspace override astro (${overrideRange})`,
        ).toBe(overrideMajors[0]);
      }
    }
  });

  it('every non-workspace liteship pin scaffolds exactly the facade version (issue #173)', () => {
    // The scaffolder template's `liteship` range is hand-written data, not a
    // workspace spec — nothing resolves it at install time in THIS repo, so a
    // release that forgets the bump silently scaffolds new users onto the
    // previous minor. The law: every `liteship` pin that is not workspace:
    // protocol must have the published facade version as its exact minimum
    // (below = stale scaffold; above = unresolvable range at publish time).
    const facadeVersion = readJson(join(REPO_ROOT, 'packages/liteship/package.json')).version as string;
    const facadeMinimum = minimumVersionOf(facadeVersion);
    expect(facadeMinimum, `facade version ${facadeVersion} must be a complete semver`).not.toBeNull();

    const liteshipPins: Pin[] = [];
    for (const manifestPath of collectManifests()) {
      if (!existsSync(manifestPath)) continue;
      const pkg = readJson(manifestPath);
      for (const field of DEP_FIELDS) {
        const range = (pkg[field] as Record<string, string> | undefined)?.liteship;
        if (typeof range === 'string' && !range.startsWith('workspace:')) {
          liteshipPins.push({ file: relative(REPO_ROOT, manifestPath).replace(/\\/g, '/'), field, range });
        }
      }
    }
    // Drift guard: the scaffolder template and the CLI-shipped fragments are
    // the load-bearing pins — if the sweep stops finding them, the loop below
    // passes vacuously.
    const pinFiles = liteshipPins.map((pin) => pin.file);
    expect(pinFiles).toContain('packages/create-liteship/templates/default/package.json');
    expect(pinFiles.some((f) => f.startsWith('packages/cli/fragments/'))).toBe(true);

    for (const pin of liteshipPins) {
      const minimum = minimumVersionOf(pin.range);
      expect(minimum, `${pin.file} ${pin.field}.liteship = ${pin.range} must name a complete minimum`).not.toBeNull();
      expect(
        minimum,
        `${pin.file} ${pin.field}.liteship (${pin.range}) must scaffold exactly the facade version (${facadeVersion})`,
      ).toEqual(facadeMinimum);
    }
  });

  it('no Astro manifest admits a host below the workspace compatibility and security floor', () => {
    expect(overrideMinimum).not.toBeNull();
    for (const pin of pins) {
      const minimum = minimumVersionOf(pin.range);
      expect(
        minimum,
        `${pin.file} ${pin.field}.astro = ${pin.range} must name a complete minimum version`,
      ).not.toBeNull();
      expect(
        compareVersions(minimum!, overrideMinimum!),
        `${pin.file} ${pin.field}.astro (${pin.range}) must not admit versions below workspace floor ${overrideRange}`,
      ).toBeGreaterThanOrEqual(0);
    }
  });
});
