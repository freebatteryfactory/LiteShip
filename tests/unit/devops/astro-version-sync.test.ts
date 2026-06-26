import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

/**
 * Astro version-sync drift guard.
 *
 * The whole workspace is pinned to ONE Astro major by the root
 * `pnpm.overrides.astro` resolution — that single override physically forces
 * every transitive `astro` to the same version. But the example/template/
 * fixture manifests carry their own caret pins (`astro: ^7.0.0`), and the
 * `@czap/astro` / `@czap/_spine` peers carry bounded ranges. Nothing stops one
 * of those from drifting to a different major than the override resolves to —
 * a published peer that advertises `>=6` while the workspace ships 7, or a
 * template that scaffolds `astro@^6` while `npm create liteship` users get a 7
 * runtime. That's a silent, install-time-only divergence.
 *
 * Pin the LAW (every Astro pin's major === the override's major), not the exact
 * version, so caret patch/minor bumps need no churn. The pin list is DERIVED
 * from the workspace, so a new Astro-using package joins the guard the moment
 * it declares an `astro` dependency.
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

/** First major in a semver range (`^7.0.0`, `>=7`, `7.x`, `~7.1.0` → 7). */
function majorOf(range: string): number | null {
  const match = range.match(/\d+/);
  return match ? Number(match[0]) : null;
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

/** Every manifest that could carry an `astro` pin: all workspace packages +
 *  examples, plus the two non-workspace files (the scaffolder template data
 *  and the integration fixture). */
function collectManifests(): string[] {
  const manifests: string[] = [];
  for (const group of ['packages', 'examples']) {
    const groupDir = join(REPO_ROOT, group);
    if (!existsSync(groupDir)) continue;
    for (const name of readdirSync(groupDir)) {
      const manifest = join(groupDir, name, 'package.json');
      if (existsSync(manifest)) manifests.push(manifest);
    }
  }
  // The scaffolder template is plain data, NOT a workspace member, so it is not
  // covered by the packages/* sweep — add it explicitly.
  manifests.push(join(REPO_ROOT, 'packages/create-liteship/templates/default/package.json'));
  manifests.push(join(REPO_ROOT, 'tests/integration/astro/package.json'));
  return manifests;
}

const root = readJson(join(REPO_ROOT, 'package.json'));
const overrideRange = ((root.pnpm as Record<string, Record<string, string>> | undefined)?.overrides ?? {}).astro;
const overrideMajor = overrideRange ? majorOf(overrideRange) : null;
const pins = collectManifests().flatMap(astroPinsIn);

describe('astro version sync', () => {
  it('the root pnpm.overrides.astro is the single source of truth', () => {
    expect(overrideRange, 'root package.json must pin pnpm.overrides.astro').toBeTypeOf('string');
    expect(overrideMajor, `overrides.astro ${overrideRange} must name a major`).not.toBeNull();
  });

  it('found the expected Astro pins (drift guard for the derived list)', () => {
    // If the sweep silently finds nothing, the per-pin loop below would vacuously
    // pass — name the load-bearing pins so a structural change is caught.
    const files = pins.map((p) => p.file);
    expect(files).toContain('packages/astro/package.json');
    expect(files).toContain('packages/create-liteship/templates/default/package.json');
    expect(files.some((f) => f.startsWith('examples/'))).toBe(true);
  });

  it('every Astro pin tracks the override major', () => {
    for (const pin of pins) {
      const pinMajor = majorOf(pin.range);
      expect(pinMajor, `${pin.file} ${pin.field}.astro = ${pin.range} must name a major`).not.toBeNull();
      expect(
        pinMajor,
        `${pin.file} ${pin.field}.astro (${pin.range}) must track the workspace override astro (${overrideRange})`,
      ).toBe(overrideMajor);
    }
  });
});
