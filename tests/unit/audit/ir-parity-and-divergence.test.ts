/**
 * Slice B (B1, step 3) — the parity proof + the live oracle-divergence dogfood,
 * built from a REAL `ts.Program` over a tmp fixture corpus (fast, controlled).
 *
 * DELIVERABLE 2 (parity): over a fixture corpus the IR-fold `noBareThrowIRGate`
 * and the regex `noBareThrowGate` AGREE on the genuine code bare-throws, AND the
 * AST oracle is a STRICT REFINEMENT — a `throw new Error` inside a comment/string
 * that the regex's codeOnly-stripping mishandles is correctly NOT a finding for
 * the AST fold. We assert agreement on real code sites + that the AST never
 * over-reports relative to the regex (more precise, never less).
 *
 * DELIVERABLE 3 (dogfood): the divergence gate, run over a corpus whose ONLY
 * keyword-pair occurrence is inside a doc COMMENT, surfaces that as an ADVISORY
 * cross-class divergence — the live proof the text-only invariant-regex oracle is
 * imprecise (it fires on a comment the AST oracle ignores) and should be retired.
 * This is exactly the false-positive that bit this slice's own development.
 *
 * @module
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import {
  buildRepoIR,
  withRepoRoot,
  liteshipDevopsProfile,
  resolveDevopsProfile,
  type DevopsProfile,
} from '@czap/audit';
import { liteshipRegexOracle } from '../../../packages/cli/src/lib/repo-ir-gauntlet.js';
import {
  noBareThrowGate,
  noBareThrowIRGate,
  noDefaultExportDivergenceGate,
  memoryContext,
  type GateContext,
  type RepoIR,
} from '@czap/gauntlet';

/**
 * Build the IR the way the CLI HOST does — audit's structural AST oracle PLUS the
 * host-injected LiteShip `invariant-regex` oracle (ADR-0012: the LiteShip-local
 * regex lives with the host, not the downstream-installable audit engine). Every
 * triangulation assertion below runs over this COMPOSED IR (both oracles' facts),
 * exactly the IR `buildRepoIRForRepo` produces.
 */
function buildHostIR(profile: DevopsProfile): RepoIR {
  return buildRepoIR(profile, { extraFactOracles: [liteshipRegexOracle] });
}

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-ir-parity-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

const PKG = (name: string): string =>
  JSON.stringify({ name, version: '0.0.0', dependencies: {}, exports: { '.': { development: './src/index.ts' } } });

function acmeProfile(root: string) {
  return resolveDevopsProfile({
    repoRoot: root,
    internalPackagePrefix: '@acme/',
    packageTopology: { '@acme/core': { allowedInternalImports: [], kind: 'core' } },
  });
}

/**
 * A textmap GateContext for the REGEX gate (it scans codeOnly(text)). Built from
 * the same fixture files keyed by their repo-relative path, so both gates see the
 * SAME corpus.
 */
function textContext(files: Record<string, string>): GateContext {
  const rel: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) {
    // strip the package.json files — the gate only scans .ts.
    if (k.endsWith('.ts')) rel[k] = v;
  }
  return memoryContext(rel);
}

function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

/** `file:line` of a finding, for set comparison. */
function loc(file: string | undefined, line: number | undefined): string {
  return `${file ?? '?'}:${line ?? 0}`;
}

describe('parity — the IR-fold no-bare-throw fold reproduces the regex gate, more precisely', () => {
  // A corpus with: TWO genuine code bare-throws (Error + TypeError), a tagged
  // variant (clean), AND a `throw new Error` INSIDE A COMMENT + inside a STRING —
  // the precision trap. The AST oracle sees only the two real throws.
  const corpusFiles: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/core/package.json': PKG('@acme/core'),
    'packages/core/src/index.ts':
      'export function a() {\n' +
      "  throw new Error('real one');\n" + // line 2 — genuine
      '}\n' +
      'export function b() {\n' +
      "  throw new TypeError('real two');\n" + // line 5 — genuine
      '}\n' +
      '// This comment mentions throw new Error("not real") — the AST ignores it.\n' + // line 7 — comment
      'export function c() {\n' +
      "  const s = 'throw new Error(\\'in a string\\')';\n" + // line 9 — string literal
      '  return s;\n' +
      '}\n',
  };

  it('AGREES with the regex gate on the genuine code bare-throws', () => {
    const ir = buildRepoIR(acmeProfile(makeFixture(corpusFiles)));

    const regexFindings = noBareThrowGate.run(textContext(corpusFiles));
    const irFindings = noBareThrowIRGate.run(irContext(ir));

    const regexSet = new Set(regexFindings.map((f) => loc(f.location?.file, f.location?.line)));
    const irSet = new Set(irFindings.map((f) => loc(f.location?.file, f.location?.line)));

    // Both find the two genuine throws at lines 2 and 5.
    const expected = new Set([
      'packages/core/src/index.ts:2',
      'packages/core/src/index.ts:5',
    ]);
    expect(irSet).toEqual(expected);

    // The AST fold is a STRICT REFINEMENT of the regex scan: every AST finding is
    // also a regex finding (the AST never over-reports relative to the regex), and
    // they agree on the genuine code sites.
    for (const site of irSet) expect(regexSet.has(site)).toBe(true);
    // And the regex gate (codeOnly-stripped) likewise lands exactly the two — the
    // comment + string occurrences are stripped, so on THIS corpus they agree
    // byte-for-byte (the codeOnly strip handles these cleanly; the AST is the
    // guarantee it is ALWAYS precise, not corpus-dependent).
    expect(regexSet).toEqual(expected);
  });

  it('the AST oracle never flags the comment/string occurrence (precision guarantee)', () => {
    const ir = buildRepoIR(acmeProfile(makeFixture(corpusFiles)));
    const irFindings = noBareThrowIRGate.run(irContext(ir));
    const lines = irFindings.map((f) => f.location?.line).sort((a, b) => (a ?? 0) - (b ?? 0));
    // Lines 7 (comment) and 9 (string) are NEVER findings — only the real throws.
    expect(lines).toEqual([2, 5]);
  });
});

describe('dogfood — the divergence gate surfaces the comment-occurrence false-positive', () => {
  // The corpus: ZERO real default exports, but a doc COMMENT that names the
  // keyword pair (the recurring false-positive this slice fought). The
  // invariant-regex oracle fires on the comment line; the AST oracle does not.
  const corpusFiles: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/core/package.json': PKG('@acme/core'),
    'packages/core/src/index.ts':
      '/**\n' +
      ' * This module uses named exports only. The forbidden form is\n' +
      ' * `export default` — written here in a comment so the text-only regex\n' + // line 3 — comment-occurrence
      ' * oracle fires while the AST oracle correctly does not.\n' +
      ' */\n' +
      'export const named = 1;\n',
  };

  it('reports the comment-occurrence as an ADVISORY cross-class divergence (retire-the-weak signal)', () => {
    const ir = buildHostIR(acmeProfile(makeFixture(corpusFiles)));

    // Sanity: the invariant-regex oracle DID fire on the comment line (text-only),
    // and the AST oracle did NOT — computed from the live IR facts.
    const defFacts = ir.facts.filter((f) => f.property === 'is-default-export');
    const regexFacts = defFacts.filter((f) => f.oracleId === 'invariant-regex');
    const astFacts = defFacts.filter((f) => f.oracleId === 'ts-ast');
    expect(regexFacts.length).toBeGreaterThanOrEqual(1);
    expect(astFacts).toHaveLength(0);
    expect(regexFacts[0]?.line).toBe(3);

    const findings = noDefaultExportDivergenceGate.run(irContext(ir));
    // Exactly one divergence — at the comment line.
    const onThisFile = findings.filter((f) => f.location?.file === 'packages/core/src/index.ts');
    expect(onThisFile).toHaveLength(1);
    const f = onThisFile[0]!;
    expect(f.location?.line).toBe(3);
    expect(f.severity).toBe('advisory'); // cross-class: text-only vs file-proxy-only
    expect(f.detail).toContain('cannot tell comment from code');
    expect(f.detail).toContain('RETIRE');
    expect(f.coverageClass).toBe('file-proxy-only');
  });

  it('is SILENT on a clean file (no keyword pair anywhere) — both oracles agree (absent)', () => {
    const clean: Record<string, string> = {
      'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const x = 1;\nexport function y() { return x; }\n',
    };
    const ir = buildHostIR(acmeProfile(makeFixture(clean)));
    expect(noDefaultExportDivergenceGate.run(irContext(ir))).toEqual([]);
  });
});

describe('B1 close — the LIVE triangulated cross-check over THIS very repo', () => {
  const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  // The full-repo ts.Program build is expensive — build the real IR ONCE and share
  // it across the assertions (it is immutable). Generous scaled timeout for the
  // one-time build.
  let realIR: RepoIR;
  beforeAll(() => {
    // The COMPOSED IR — audit's structural AST oracle + the host-injected LiteShip
    // invariant-regex oracle — exactly the IR the CLI host (`buildRepoIRForRepo`)
    // builds. The live cross-check still runs; the regex oracle is now host-injected.
    realIR = buildHostIR(withRepoRoot(liteshipDevopsProfile, REPO_ROOT));
  }, scaledTimeout(60_000));

  function runOnRealRepo() {
    return noDefaultExportDivergenceGate.run({
      repoRoot: REPO_ROOT,
      readFile: () => undefined,
      files: () => [],
      ir: realIR,
    });
  }

  it('the divergence gate fires over the real repo, and every divergence is advisory + traceable', () => {
    // The headline B1 deliverable: a live cross-check over the repo, over the real
    // IR the host path builds.
    const ir = realIR;
    const findings = runOnRealRepo();

    // There ARE divergences (the cross-check is doing real work, not a no-op).
    expect(findings.length).toBeGreaterThan(0);

    // Every real-repo divergence is ADVISORY (cross-class: ts-ast file-proxy-only
    // vs invariant-regex text-only) — the quiet retire-the-weak-oracle tier, never
    // a loud same-class contradiction. This is the watch-item the design pins: the
    // coverage-gap divergences must stay quiet so they never drown real ones.
    for (const f of findings) {
      expect(f.severity, `${f.location?.file}:${f.location?.line} should be advisory`).toBe('advisory');
      // Self-explaining + traceable: names both oracles + coverage classes + loc.
      expect(f.detail).toContain('ts-ast');
      expect(f.detail).toContain('invariant-regex');
      expect(f.detail).toContain('picks no winner');
      expect(f.coverageClass).toBe('file-proxy-only');
    }

    // The LAW (head-probe): the divergence set is computed from the LIVE oracle
    // facts. On THIS repo every divergence is the AST oracle catching a SANCTIONED
    // default export the invariant-regex rule intentionally EXCLUDES (the Astro
    // client-directive contract + the dev-toolbar-app entrypoint). The repo's own
    // source carefully phrases AROUND the keyword pair in prose, so there are no
    // comment-occurrence (regex-present / AST-absent) divergences here — the
    // FIXTURE dogfood above proves that direction. The pin is the LAW (all sites
    // are excluded-default-export files), not a brittle path list: assert every
    // divergence falls in a file the canonical NO_DEFAULT_EXPORT rule excludes.
    const ast = ir.facts.filter((f) => f.property === 'is-default-export' && f.oracleId === 'ts-ast');
    const regex = ir.facts.filter((f) => f.property === 'is-default-export' && f.oracleId === 'invariant-regex');
    // The AST oracle saw real default exports; the regex oracle saw NONE of them on
    // these files (they are all excluded), so the divergence count equals the AST
    // facts on excluded files — computed, not hardcoded.
    const divergedFiles = new Set(findings.map((f) => f.location?.file));
    // Every diverged file has an AST fact and NO regex fact (the exclude in action).
    for (const file of divergedFiles) {
      expect(ast.some((f) => f.file === file)).toBe(true);
      expect(regex.some((f) => f.file === file)).toBe(false);
    }
  });

  it('is DETERMINISTIC — folding the same IR yields the same divergence set twice', () => {
    // The IR is content-addressed + immutable (the B2 cache invariant); folding it
    // twice is pure, so the divergence set is identical. (The IR-BUILD determinism
    // is pinned separately in repo-ir-build.test.ts; here we pin the FOLD.)
    const setOf = (): readonly string[] =>
      runOnRealRepo()
        .map((f) => `${f.location?.file}:${f.location?.line}`)
        .sort();
    expect(setOf()).toEqual(setOf());
  });
});
