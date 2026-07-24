/**
 * #146 — answer-first package metadata check (the prepublish enforcement point).
 *
 * The catalog (`packages/cli/src/lib/package-metadata-catalog.ts`) is the ONE
 * source of the 25 publishable descriptions/keywords; `runPackageSmokeScan` calls
 * {@link checkPackedMetadata} on every packed manifest at release time. These
 * tests pin the check's semantics AND run it directly against all 25 REAL
 * manifests on disk — so a drifted or jargon description fails here even when the
 * heavy `pnpm run package:smoke` (which packs every scope) isn't run.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PACKAGES } from '@liteship/command';
import {
  PACKAGE_METADATA_CATALOG,
  answerFirstViolation,
  checkPackedMetadata,
  type PackedMetadata,
} from '../../../../packages/cli/src/lib/package-metadata-catalog.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..');

/** Read a publishable scope's real manifest from disk. */
function readManifest(dir: string): PackedMetadata & Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(REPO, dir, 'package.json'), 'utf8')) as PackedMetadata &
    Record<string, unknown>;
}

describe('catalog — the single source is complete and answer-first', () => {
  it('has exactly one entry per publishable smoke-roster package (no drift, no orphans)', () => {
    const catalogNames = Object.keys(PACKAGE_METADATA_CATALOG).sort();
    const rosterNames = PACKAGES.map((pkg) => pkg.name).sort();
    expect(catalogNames).toEqual(rosterNames);
  });

  it('every catalog description passes the answer-first heuristic', () => {
    for (const [name, meta] of Object.entries(PACKAGE_METADATA_CATALOG)) {
      expect(answerFirstViolation(meta.description, name), `${name} description is not answer-first`).toBeNull();
    }
  });

  it('every catalog keyword list is present, non-spammy, and never marks a published package "internal"', () => {
    for (const [name, meta] of Object.entries(PACKAGE_METADATA_CATALOG)) {
      expect(meta.keywords.length, `${name} needs keywords`).toBeGreaterThan(0);
      expect(
        meta.keywords.map((k) => k.toLowerCase()),
        `${name} must not keyword "internal"`,
      ).not.toContain('internal');
      // Non-spammy: a small, de-duplicated set.
      expect(new Set(meta.keywords).size).toBe(meta.keywords.length);
      expect(meta.keywords.length).toBeLessThanOrEqual(7);
    }
  });
});

describe('answerFirstViolation — rejects the known anti-patterns, accepts real answers', () => {
  it('accepts a plain-English answer', () => {
    expect(
      answerFirstViolation('Detect device capabilities for LiteShip and map them to render tiers.', '@liteship/detect'),
    ).toBeNull();
  });

  it('rejects a type/symbol inventory ("Label: A, B, C, …")', () => {
    // @liteship/core's OLD description.
    expect(
      answerFirstViolation(
        'Primitives: Boundary, Token, Style, Theme, Signal, DocumentGraph + GraphPatch (the content-addressed IR)',
        '@liteship/core',
      ),
    ).toMatch(/symbol inventory/);
    // @liteship/web's OLD description.
    expect(
      answerFirstViolation('DOM runtime: Morph, SlotRegistry, SSE client, Physical state, LLM adapter', '@liteship/web'),
    ).toMatch(/symbol inventory/);
  });

  it('rejects a dependency list', () => {
    // @liteship/audit's OLD description tail.
    expect(
      answerFirstViolation(
        'Profile-driven surface audit engine (deps `@liteship/canonical` / `@liteship/error` / `@liteship/gauntlet`)',
        '@liteship/audit',
      ),
    ).toMatch(/dependencies/);
  });

  it('rejects an empty description, a name-only description, and a code-symbol opener', () => {
    expect(answerFirstViolation('', '@liteship/core')).toMatch(/empty/);
    expect(answerFirstViolation('@liteship/core', '@liteship/core')).toMatch(/package name/);
    expect(answerFirstViolation('`TaggedError` coproduct over an open contract', '@liteship/error')).toMatch(/code symbol/);
  });

  it('rejects a leaked workspace: protocol string', () => {
    expect(answerFirstViolation('Installs workspace:* deps for the stack', 'liteship')).toMatch(/workspace:/);
  });
});

describe('checkPackedMetadata — validates a packed manifest against the catalog (Law 6)', () => {
  const good = (name: string): PackedMetadata => ({
    name,
    description: PACKAGE_METADATA_CATALOG[name]!.description,
    keywords: [...PACKAGE_METADATA_CATALOG[name]!.keywords],
  });

  it('passes a manifest that matches the catalog exactly', () => {
    expect(checkPackedMetadata(good('@liteship/core'), '@liteship/core')).toEqual([]);
  });

  it('flags a package with no catalog entry', () => {
    const v = checkPackedMetadata({ name: '@liteship/ghost', description: 'x'.repeat(40), keywords: ['a'] }, '@liteship/ghost');
    expect(v.some((x) => x.field === 'catalog')).toBe(true);
  });

  it('flags a description that drifted from the catalog', () => {
    const m = { ...good('@liteship/core'), description: 'Some other perfectly fine plain-English sentence about core.' };
    const v = checkPackedMetadata(m, '@liteship/core');
    expect(v.some((x) => x.field === 'description' && /drifted from the catalog/.test(x.message))).toBe(true);
  });

  it('flags keywords that drifted from the catalog', () => {
    const m = { ...good('@liteship/core'), keywords: ['liteship', 'wrong'] };
    const v = checkPackedMetadata(m, '@liteship/core');
    expect(v.some((x) => x.field === 'keywords' && /drifted from the catalog/.test(x.message))).toBe(true);
  });

  it('flags a published package still marked private', () => {
    const v = checkPackedMetadata({ ...good('@liteship/core'), private: true }, '@liteship/core');
    expect(v.some((x) => x.field === 'private')).toBe(true);
  });

  it('flags a stray "internal" keyword and empty keywords', () => {
    const withInternal = checkPackedMetadata(
      {
        name: '@liteship/_spine',
        description: PACKAGE_METADATA_CATALOG['@liteship/_spine']!.description,
        keywords: ['internal'],
      },
      '@liteship/_spine',
    );
    expect(withInternal.some((x) => x.field === 'keywords' && /internal/.test(x.message))).toBe(true);

    const empty = checkPackedMetadata({ ...good('@liteship/core'), keywords: [] }, '@liteship/core');
    expect(empty.some((x) => x.field === 'keywords' && /missing or empty/.test(x.message))).toBe(true);
  });
});

describe('checkPackedMetadata — all 25 REAL publishable manifests satisfy the check', () => {
  // Drives the exact enforcement `runPackageSmokeScan` runs, but over the manifests
  // on disk (no pack step) — so this is green iff the release gate would be.
  it('reports zero violations across the whole publishable roster', () => {
    const violations: string[] = [];
    for (const pkg of PACKAGES) {
      const manifest = readManifest(pkg.dir);
      for (const v of checkPackedMetadata(manifest, pkg.name)) {
        violations.push(`${v.package} [${v.field}]: ${v.message}`);
      }
    }
    expect(violations, `metadata violations:\n  - ${violations.join('\n  - ')}`).toEqual([]);
  });
});
