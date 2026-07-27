/**
 * Slice B (B3) — the SYMBOL-EVIDENCED LanguageService reference oracle.
 *
 * `symbolReferenceOracle` builds a real `ts.LanguageService` over a profile's
 * source corpus and, via `getReferencesAtPosition`, resolves each exported
 * symbol's TRUE cross-file references — the `symbol-evidenced` class no AST /
 * regex oracle reaches. This test proves the oracle over a tiny but REAL in-repo
 * tmp corpus:
 *   • a cross-file-referenced export → reference count > 0, not an orphan;
 *   • an unreferenced export → orphan, count 0;
 *   • the facts carry coverageClass `symbol-evidenced` + oracleId
 *     `ts-language-service`;
 *   • determinism: building twice over unchanged source → identical facts.
 *
 * It scopes to a tmp fixture (not the whole repo) so the LanguageService build
 * stays fast — the oracle over the whole repo is the heavy per-run cost the IR
 * path + the B2 cache mitigate.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
// The oracle is NOT yet exported from @liteship/audit's barrel — the integrator wires
// that (this agent builds in NEW files only). Import it via its src path (the
// "src-path import = no public surface" pattern) so the self-contained oracle is
// fully tested before the ~10-line wire-in. `resolveDevopsProfile` IS already in
// the barrel (existing export), so it comes from the package entry.
import {
  symbolReferenceOracle,
  asOrphanValue,
  symbolIdOfOrphanFact,
  LANGUAGE_SERVICE_ORACLE_ID,
  SYMBOL_ORPHAN_PROPERTY,
  SYMBOL_REFERENCE_COUNT_PROPERTY,
  type OrphanValue,
} from '../../../packages/audit/src/repo-ir-language-service.js';
import { resolveDevopsProfile } from '@liteship/audit';
import type { Fact } from '@liteship/gauntlet';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-ls-oracle-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

const PKG = (name: string, deps: Record<string, string> = {}): string =>
  JSON.stringify({ name, version: '0.0.0', dependencies: deps, exports: { '.': { development: './src/index.ts' } } });

/**
 * A one-package fixture: `usedThing` is imported + used by a sibling file (a real
 * cross-file reference the LanguageService resolves); `lonelyThing` is exported
 * but never referenced anywhere (a genuine orphan).
 */
function fixtureRepo(): string {
  return makeFixture({
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/core/package.json': PKG('@acme/core'),
    'packages/core/src/index.ts':
      'export const usedThing = 1;\n' +
      'export const lonelyThing = 2;\n',
    // consumer references usedThing across the file boundary; never lonelyThing.
    'packages/core/src/consumer.ts':
      "import { usedThing } from './index.js';\n" +
      'export const total = usedThing + 1;\n',
  });
}

function acmeProfile(root: string) {
  return resolveDevopsProfile({
    repoRoot: root,
    internalPackagePrefix: '@acme/',
    packageTopology: { '@acme/core': { allowedInternalImports: [], kind: 'core' } },
  });
}

/** The orphan fact for a given exported name (file-scoped to core/index). */
function orphanFactFor(facts: readonly Fact[], name: string): { fact: Fact; value: OrphanValue } | undefined {
  for (const fact of facts) {
    if (fact.property !== SYMBOL_ORPHAN_PROPERTY) continue;
    const value = asOrphanValue(fact.value);
    if (value?.name === name && fact.file === 'packages/core/src/index.ts') return { fact, value };
  }
  return undefined;
}

describe('symbolReferenceOracle — symbol-evidenced cross-file references over a real tmp corpus', () => {
  it('resolves a cross-file-referenced export as NOT an orphan with a positive count', () => {
    const facts = symbolReferenceOracle({ profile: acmeProfile(fixtureRepo()) });
    const used = orphanFactFor(facts, 'usedThing');
    expect(used).toBeDefined();
    expect(used?.value.isOrphan).toBe(false);
    expect(used?.value.externalReferenceCount).toBeGreaterThan(0);

    // The paired symbol-reference-count fact carries the same magnitude.
    const countFact = facts.find(
      (f) =>
        f.property === SYMBOL_REFERENCE_COUNT_PROPERTY &&
        f.file === 'packages/core/src/index.ts' &&
        f.line === used?.fact.line,
    );
    expect(countFact?.value).toBe(used?.value.externalReferenceCount);
  });

  it('resolves an unreferenced export as an ORPHAN with count 0', () => {
    const facts = symbolReferenceOracle({ profile: acmeProfile(fixtureRepo()) });
    const lonely = orphanFactFor(facts, 'lonelyThing');
    expect(lonely).toBeDefined();
    expect(lonely?.value.isOrphan).toBe(true);
    expect(lonely?.value.externalReferenceCount).toBe(0);
  });

  it('emits every fact with the symbol-evidenced coverage class + the ts-language-service oracle id', () => {
    const facts = symbolReferenceOracle({ profile: acmeProfile(fixtureRepo()) });
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      expect(fact.oracleId).toBe(LANGUAGE_SERVICE_ORACLE_ID);
      expect(fact.coverageClass).toBe('symbol-evidenced');
      expect([SYMBOL_ORPHAN_PROPERTY, SYMBOL_REFERENCE_COUNT_PROPERTY]).toContain(fact.property);
    }
  });

  it('reconstructs the IR SymbolId (<file>#<name>) from an orphan fact', () => {
    const facts = symbolReferenceOracle({ profile: acmeProfile(fixtureRepo()) });
    const used = orphanFactFor(facts, 'usedThing');
    expect(used).toBeDefined();
    expect(symbolIdOfOrphanFact(used!.fact.file, used!.value)).toBe('packages/core/src/index.ts#usedThing');
  });

  it('is DETERMINISTIC — running twice over unchanged source yields identical facts', () => {
    const root = fixtureRepo();
    const profile = acmeProfile(root);
    const a = symbolReferenceOracle({ profile });
    const b = symbolReferenceOracle({ profile });
    expect(a).toEqual(b);
  });

  it('returns [] for an empty corpus (no source files)', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'empty-root', private: true, type: 'module' }),
    });
    const profile = resolveDevopsProfile({
      repoRoot: root,
      internalPackagePrefix: '@acme/',
      packageTopology: {},
    });
    expect(symbolReferenceOracle({ profile })).toEqual([]);
  });
});

describe('asOrphanValue — the forced narrowing guard', () => {
  it('accepts a well-formed orphan value and rejects malformed shapes (property-based)', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string(),
          isOrphan: fc.boolean(),
          externalReferenceCount: fc.nat(),
        }),
        (value) => {
          const narrowed = asOrphanValue(value);
          expect(narrowed).toEqual(value);
        },
      ),
    );
    // Non-orphan shapes narrow to undefined (never a throw, never a mis-read).
    for (const bad of [null, undefined, 1, 'x', {}, { name: 'a' }, { name: 1, isOrphan: true, externalReferenceCount: 0 }]) {
      expect(asOrphanValue(bad)).toBeUndefined();
    }
  });
});
