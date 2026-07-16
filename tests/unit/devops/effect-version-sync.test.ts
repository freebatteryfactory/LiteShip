import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LITESHIP_LOCKFILE_POLICY } from '../../../packages/cli/src/lib/supply-chain-policy.js';

/**
 * effect version-sync drift guard — catalog residual.
 *
 * `effect` is the monorepo-wide algebraic-effect substrate and the single
 * sanctioned prerelease dependency. The pnpm catalog (pnpm-workspace.yaml
 * `catalog:`) declares the ONE effect spec every workspace manifest references
 * as "catalog:", so per-package RANGE AGREEMENT is structural: pnpm resolves
 * every reference to the catalog value. The old per-package role matrix
 * (lib-range / dev-floor / app-floor) is therefore gone — the catalog enforces
 * it by construction.
 *
 * But "pnpm resolves them identically" holds ONLY while every manifest actually
 * says "catalog:". Four things the catalog cannot self-enforce, and this guard
 * keeps:
 *   (a) The per-manifest reference. Every effect-bearing workspace manifest must
 *       carry the literal string "catalog:". A reintroduced literal range
 *       (`>=4.0.0-beta.32 <5`) resolves fine in isolation yet silently escapes
 *       the catalog — the exact install-time-only divergence the catalog was
 *       adopted to kill. Swept below; a literal reintroduction reds the sweep.
 *   (b) The physical pin. `pnpm.overrides.effect` freezes ONE resolved version
 *       for the whole tree; it must stay tethered to the catalog range's floor.
 *   (c) The create-liteship template. A scaffolded standalone project has no
 *       workspace catalog, so its dependencies.effect carries a LITERAL caret
 *       pin (`^${floor}`) that must track the catalog floor.
 *   (d) The supply-chain policy prose. The lockfile-policy effect exception
 *       documents the canonical range in prose; it must cite the live catalog
 *       value so a floor bump does not leave stale documentation behind.
 */

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const TEMPLATE = 'packages/create-liteship/templates/default/package.json';
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(REPO_ROOT, rel), 'utf8')) as Record<string, unknown>;
}

// The catalog is the source of truth. pnpm-workspace.yaml carries exactly one
// `effect:` key (under `catalog:`); parse its value and derive the floor.
const workspace = readFileSync(join(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8');
const catalogMatch = /^\s+effect:\s*(.+?)\s*$/m.exec(workspace);
const CATALOG_EFFECT = catalogMatch ? catalogMatch[1].replace(/^['"]|['"]$/g, '') : undefined;
const FLOOR = CATALOG_EFFECT ? /(\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?)/.exec(CATALOG_EFFECT)?.[1] : undefined;

const root = readJson('package.json');
const OVERRIDE = ((root.pnpm as Record<string, Record<string, string>> | undefined)?.overrides ?? {}).effect;

// Per-manifest sweep: every effect reference across the workspace (packages/* +
// examples/*), with the field it appears in. The catalog makes RANGE agreement
// structural only while each of these literally says "catalog:".
interface EffectRef {
  readonly file: string;
  readonly field: (typeof DEP_FIELDS)[number];
  readonly value: string;
}

function effectRefsIn(manifestRel: string): EffectRef[] {
  const abs = join(REPO_ROOT, manifestRel);
  if (!existsSync(abs)) return [];
  const pkg = JSON.parse(readFileSync(abs, 'utf8')) as Record<string, unknown>;
  const refs: EffectRef[] = [];
  for (const field of DEP_FIELDS) {
    const value = (pkg[field] as Record<string, string> | undefined)?.effect;
    if (typeof value === 'string') refs.push({ file: manifestRel, field, value });
  }
  return refs;
}

function collectWorkspaceEffectRefs(): EffectRef[] {
  const refs: EffectRef[] = [];
  for (const group of ['packages', 'examples'] as const) {
    const groupDir = join(REPO_ROOT, group);
    if (!existsSync(groupDir)) continue;
    for (const name of readdirSync(groupDir)) {
      refs.push(...effectRefsIn(`${group}/${name}/package.json`));
    }
  }
  return refs;
}

const refs = collectWorkspaceEffectRefs();

describe('effect version sync (catalog residual)', () => {
  it('pnpm-workspace.yaml declares catalog.effect as a bounded prerelease range', () => {
    expect(CATALOG_EFFECT, 'pnpm-workspace.yaml must declare a catalog: effect entry').toBeTypeOf('string');
    expect(CATALOG_EFFECT, 'catalog.effect must be a bounded `>=<prerelease> <major>` range').toMatch(
      /^>=\d+\.\d+\.\d+-[A-Za-z0-9.]+ <\d+$/,
    );
    expect(FLOOR, 'catalog.effect must carry a prerelease floor').toMatch(/^\d+\.\d+\.\d+-/);
  });

  it('found the load-bearing effect references (non-vacuous sweep)', () => {
    // A silent empty sweep would let the per-ref loop below pass vacuously —
    // name the load-bearing manifests so a dropped effect line or a renamed
    // package is caught structurally.
    const keys = refs.map((r) => `${r.file}:${r.field}`);
    expect(keys).toContain('packages/core/package.json:peerDependencies');
    expect(keys).toContain('packages/cli/package.json:dependencies');
    expect(keys).toContain('packages/command/package.json:dependencies');
    // at least one examples/* application still references effect
    expect(refs.some((r) => r.file.startsWith('examples/'))).toBe(true);
  });

  it('every effect-bearing workspace manifest references "catalog:" (no literal range reintroduction)', () => {
    for (const ref of refs) {
      expect(
        ref.value,
        `${ref.file} ${ref.field}.effect is "${ref.value}" — it MUST be "catalog:". A literal range ` +
          `escapes the pnpm catalog and silently reintroduces per-package drift; let ` +
          `pnpm-workspace.yaml carry the single ${CATALOG_EFFECT} spec.`,
      ).toBe('catalog:');
    }
  });

  it('pnpm.overrides.effect (the physical pin) stays tethered to the catalog floor', () => {
    expect(OVERRIDE, 'root pnpm.overrides.effect must pin the exact resolved floor').toBe(FLOOR);
  });

  it('the create-liteship template caret pin tracks the catalog floor', () => {
    // The template is scaffolded into a standalone project with no workspace
    // catalog, so it cannot say "catalog:" — it must carry a literal caret pin
    // that tracks the floor. This is the one pin the catalog cannot make structural.
    const template = readJson(TEMPLATE);
    const templateEffect = (template.dependencies as Record<string, string> | undefined)?.effect;
    expect(templateEffect, `${TEMPLATE} must pin dependencies.effect as a caret floor`).toBe(`^${FLOOR}`);
  });

  it('the supply-chain policy prose cites the live catalog range (no stale prose)', () => {
    const exception = LITESHIP_LOCKFILE_POLICY.prereleaseAllowlist.find((e) => e.dependency === 'effect');
    expect(exception, 'effect must be a named prerelease exception').toBeDefined();
    expect(
      exception!.reason,
      `policy reason must cite the live catalog range (${CATALOG_EFFECT}) so a bump reds it for update`,
    ).toContain(CATALOG_EFFECT);
  });
});
