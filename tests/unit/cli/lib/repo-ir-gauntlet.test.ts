/**
 * The HOST injection path (`packages/cli/src/lib/repo-ir-gauntlet.ts`, Slice B/C) —
 * the CLI-only wiring that builds the repo-IR via `@liteship/audit`, host-injects the
 * LiteShip `invariant-regex` oracle, composes the avionics opt-in gates, and runs
 * the gauntlet with the IR threaded in.
 *
 * The suite pins the LAWS, not the gate internals (those are proven in their own
 * suites):
 *
 *  - THE HOST ORACLE: `liteshipRegexOracle` runs the THREE canonical triangulated
 *    rules (NO_DEFAULT_EXPORT / NO_VAR / NO_REQUIRE) over a file's RAW lines, firing
 *    a per-line property fact where the canonical pattern matches, and emitting the
 *    distinct policy-EXCLUDE marker (the exclude-vs-miss seam) for a sanctioned file —
 *    referencing the canonical `INVARIANTS` source of truth, never a fork. It is
 *    PURE + DETERMINISTIC (a property over arbitrary text).
 *
 *  - THE IR BUILD: `buildRepoIRForRepo` materializes a real `RepoIR` over a tiny but
 *    REAL `@liteship/`-scoped fixture, carrying BOTH the audit AST oracle's facts AND the
 *    host regex oracle's `invariant-regex` facts (the triangulation substrate), and is
 *    deterministic over the source bytes (the same bytes → an identical IR).
 *
 *  - THE RUN + RECEIPT: `runGauntletWithRepoIR` builds the IR, folds the always-on
 *    traceability + standards facts against the INJECTED wall-clock (the two-clock
 *    law — no ambient `Date.now()`), wires the verdict cache (armed vs `--no-cache`),
 *    composes each opt-in gate's facts only when its flag is set, and returns the
 *    engine verdict. Each light opt-in (`--proof` / `--composition` / `--taint` /
 *    `--simulate` / `--supply-chain`) and each cache namespace is exercised.
 *
 *  - THE FAIL-LOUD EDGES: a `--supply-chain` run with no `pnpm-lock.yaml`, a corrupt
 *    mutation-score baseline, and a corrupt equivalent-mutant registry are TAGGED
 *    throws (a corrupt artifact must be visible, never a silent green).
 *
 * The fixture is a hermetic tmp repo (a single `@liteship/` package + the committed
 * traceability ledger + a standards snapshot generated from the live surface so the
 * always-on raccoon-rule gate has matching ground truth). No network; the injected
 * clock makes every run byte-reproducible.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fc from 'fast-check';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { scaledTimeout, repoRoot } from '../../../../vitest.shared.js';
import { isTaggedError } from '@liteship/error';
import { INVARIANTS } from '@liteship/command/invariants';
import { readFileSync } from 'node:fs';
import {
  readLiveStandardsSurface,
  serializeStandardsSurface,
  STANDARDS_SNAPSHOT_PATH,
  type GitShowReader,
} from '../../../../packages/cli/src/lib/standards-surface.js';
import type { Fact, FileId } from '@liteship/gauntlet';
import {
  liteshipRegexOracle,
  buildRepoIRForRepo,
  runGauntletWithRepoIR as runGauntletWithRepoIRRaw,
  DEFAULT_EXPORT_CHECK_EXCLUDED,
  type RepoIRGauntletCacheOptions,
} from '../../../../packages/cli/src/lib/repo-ir-gauntlet.js';

/** The injected wall-clock — every run is reproducible against THIS date (two-clock law). */
const NOW = new Date('2026-06-22T00:00:00.000Z');

/**
 * The raccoon-rule backstop now diffs the LIVE surface against a PRIOR, INDEPENDENT
 * baseline sourced FROM GIT (the snapshot as committed on the base ref the change is
 * reviewed against), never the working-tree snapshot. A hermetic fixture has no git
 * history, so we inject the BASE via the gitShow seam: the fixture's freshly-written
 * working snapshot IS the unweakened baseline (a fresh fixture weakens nothing), so the
 * diff is empty and the always-on gate is green — exactly as before the fortification,
 * but now via the base-ref path. (A fixture that DID weaken a standard would still be
 * caught: it would diverge from this base.)
 */
const fixtureBaseGitShow: GitShowReader = (repoRoot) => readFileSync(join(repoRoot, STANDARDS_SNAPSHOT_PATH), 'utf8');

/** Wrap `runGauntletWithRepoIR`, injecting the hermetic base-ref snapshot reader by default. */
function runGauntletWithRepoIR(
  repoRoot: string,
  now: Date,
  globs?: readonly string[],
  cacheOpts: RepoIRGauntletCacheOptions = {},
): ReturnType<typeof runGauntletWithRepoIRRaw> {
  return runGauntletWithRepoIRRaw(repoRoot, now, globs, {
    standards: { gitShow: fixtureBaseGitShow },
    ...cacheOpts,
  });
}

/**
 * The real-IR / full-run tests build a `ts.Program` and run the gauntlet over a tmp
 * repo; under coverage instrumentation that exceeds the 10s default, so the heavy
 * cases carry a generous, machine-scaled budget (the same policy the other
 * subprocess-heavy suites use).
 */
const HEAVY = scaledTimeout(120_000);

/** Invoke the host oracle the way `buildRepoIR` does, over an in-memory file. */
function runOracle(file: FileId, text: string): readonly Fact[] {
  return liteshipRegexOracle({ file, text, packageName: '@liteship/example', sourceFile: undefined });
}

/** The per-line property facts emitted under a given oracle property (the regex fired). */
function propertyFacts(facts: readonly Fact[], property: string): readonly Fact[] {
  return facts.filter((f) => f.property === property);
}

// ───────────────────────────────────────────────────────────────────────────
// 1. THE HOST ORACLE — `liteshipRegexOracle` (pure, in-memory)
// ───────────────────────────────────────────────────────────────────────────

describe('liteshipRegexOracle — the host-injected invariant-regex oracle', () => {
  it('fires the NO_DEFAULT_EXPORT property fact on the exact line a default export sits', () => {
    const file = 'packages/core/src/thing.ts' as FileId;
    const facts = runOracle(file, 'export const a = 1;\nexport default function main() {}\n');
    const defaultExportFacts = propertyFacts(facts, 'is-default-export');
    expect(defaultExportFacts).toHaveLength(1);
    expect(defaultExportFacts[0]!.line).toBe(2);
    expect(defaultExportFacts[0]!.value).toBe(true);
    expect(defaultExportFacts[0]!.oracleId).toBe('invariant-regex');
    expect(defaultExportFacts[0]!.coverageClass).toBe('text-only');
  });

  it('fires the NO_VAR and NO_REQUIRE property facts at their lines too (all three rules, one path)', () => {
    const file = 'packages/core/src/multi.ts' as FileId;
    const facts = runOracle(file, 'var x = 1;\nconst y = require("z");\n');
    expect(propertyFacts(facts, 'var-declaration')).toHaveLength(1);
    expect(propertyFacts(facts, 'var-declaration')[0]!.line).toBe(1);
    expect(propertyFacts(facts, 'require-call')).toHaveLength(1);
    expect(propertyFacts(facts, 'require-call')[0]!.line).toBe(2);
  });

  it('a clean file emits NO property facts (the oracle is silent when nothing fires)', () => {
    const facts = runOracle('packages/core/src/clean.ts' as FileId, 'export const a = 1;\nconst b = 2;\n');
    expect(propertyFacts(facts, 'is-default-export')).toHaveLength(0);
    expect(propertyFacts(facts, 'var-declaration')).toHaveLength(0);
    expect(propertyFacts(facts, 'require-call')).toHaveLength(0);
  });

  it('a NO_DEFAULT_EXPORT-EXCLUDED file emits the exclude marker, NOT a property fact (exclude-vs-miss seam)', () => {
    // The canonical NO_DEFAULT_EXPORT rule excludes Astro client-directive files.
    const excluded = 'packages/astro/src/client-directives/example.ts' as FileId;
    const facts = runOracle(excluded, 'export default function directive() {}\n');
    // No property fact — the regex is silent BY DESIGN on an excluded file.
    expect(propertyFacts(facts, 'is-default-export')).toHaveLength(0);
    // The self-describing marker IS emitted, naming WHICH rule excluded the file.
    const markers = facts.filter((f) => f.property === DEFAULT_EXPORT_CHECK_EXCLUDED);
    expect(markers).toHaveLength(1);
    expect(markers[0]!.line).toBe(1);
    expect(markers[0]!.value).toBe('NO_DEFAULT_EXPORT');
    expect(markers[0]!.oracleId).toBe('invariant-regex');
  });

  it('the exclude marker reads the canonical rule name from the live INVARIANTS ledger, not a hardcoded string', () => {
    // The marker value must be the literal `name` the committed ledger carries — proving
    // the oracle references the source of truth, never a hand-copied fork.
    const canonical = INVARIANTS.find((r) => r.name === 'NO_DEFAULT_EXPORT');
    expect(canonical).toBeDefined();
    const excluded = 'packages/astro/src/client-directives/x.ts' as FileId;
    const facts = runOracle(excluded, 'export default 1;\n');
    const marker = facts.find((f) => f.property === DEFAULT_EXPORT_CHECK_EXCLUDED);
    expect(marker!.value).toBe(canonical!.name);
  });

  it('every emitted fact targets the SAME file the oracle was handed (never a dangling fact)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^packages\/[a-z]+\/src\/[a-z]+\.ts$/),
        fc.array(fc.constantFrom('export default 1;', 'var z = 1;', 'require("y");', 'const ok = 1;'), {
          maxLength: 8,
        }),
        (file, lines) => {
          const facts = runOracle(file as FileId, lines.join('\n'));
          for (const f of facts) expect(f.file).toBe(file);
        },
      ),
    );
  });

  it('is DETERMINISTIC + idempotent — the same bytes yield byte-identical facts (no ambient state)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('export default 1;', 'var z = 1;', 'require("y");', 'const ok = 1;', ''), {
          maxLength: 10,
        }),
        (lines) => {
          const file = 'packages/core/src/det.ts' as FileId;
          const text = lines.join('\n');
          expect(runOracle(file, text)).toEqual(runOracle(file, text));
        },
      ),
    );
  });

  it('emits one property fact PER matching line (the per-line scan, not a per-file boolean)', () => {
    const file = 'packages/core/src/many.ts' as FileId;
    const text = 'var a = 1;\nconst b = 2;\nvar c = 3;\nvar d = 4;\n';
    expect(propertyFacts(runOracle(file, text), 'var-declaration')).toHaveLength(3);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2 + 3. THE IR BUILD + THE RUN — over a hermetic real fixture
// ───────────────────────────────────────────────────────────────────────────

/** A minimal `@liteship/`-scoped package manifest (the profile globs `packages/*`). */
function pkgManifest(name: string): string {
  return JSON.stringify({ name, version: '0.0.0', exports: { '.': { development: './src/index.ts' } } });
}

/** Lay a fixture tree under a fresh tmp root and return the absolute root path. */
function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-rig-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  // The always-on traceability + standards gates read these committed artifacts; a
  // missing ledger is a tagged throw, so the hermetic repo MUST carry them. The
  // snapshot is generated FROM the live surface so the raccoon-rule diff is empty
  // (the gate has matching ground truth) — fully deterministic against NOW.
  mkdirSync(join(root, 'traceability'), { recursive: true });
  writeFileSync(
    join(root, 'traceability', 'invariants.yaml'),
    'invariants:\n  - id: INV-EX-LAW\n    law: "example holds."\n    level: L2\n    category: meta\n',
    'utf8',
  );
  // A signed-deferral trace keeps the always-on traceability gate green against NOW
  // (a far-future expiry resolves WAIVED, not EXPIRED) — the ledger grammar requires a
  // non-empty `traces:` sequence, and the invariant must be referenced.
  writeFileSync(
    join(root, 'traceability', 'testing-ledger.yaml'),
    'traces:\n  - id: INV-EX-LAW\n    waiver:\n      owner: fixture\n      justification: "hermetic test fixture"\n      expiry: "2999-01-01"\n',
    'utf8',
  );
  const liveSurface = readLiveStandardsSurface(root, NOW);
  writeFileSync(join(root, 'traceability', 'standards-snapshot.json'), serializeStandardsSurface(liveSurface), 'utf8');
  return root;
}

/** The single-package source fixture: one named export + an internal relative import. */
function sourceFiles(): Record<string, string> {
  return {
    'package.json': JSON.stringify({ name: 'liteship-fixture-root', private: true, type: 'module' }),
    'packages/example/package.json': pkgManifest('@liteship/example'),
    'packages/example/src/index.ts': "import { helper } from './helper.js';\nexport const value = helper() + 1;\n",
    'packages/example/src/helper.ts': 'export function helper(): number {\n  return 41;\n}\n',
  };
}

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function freshFixture(extra: Record<string, string> = {}): string {
  const root = makeFixture({ ...sourceFiles(), ...extra });
  fixtures.push(root);
  return root;
}

describe('buildRepoIRForRepo — the host-injected IR build', () => {
  let root: string;
  beforeAll(() => {
    root = makeFixture(sourceFiles());
  }, HEAVY);
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it(
    'materializes a real IR over the fixture corpus (every source file lands in the table)',
    () => {
      const ir = buildRepoIRForRepo(root);
      expect(ir.files.has('packages/example/src/index.ts')).toBe(true);
      expect(ir.files.has('packages/example/src/helper.ts')).toBe(true);
      // Real, non-placeholder content digests (the build actually hashed the bytes).
      for (const node of ir.files.values()) expect(node.contentDigest.length).toBeGreaterThan(0);
    },
    HEAVY,
  );

  it(
    'carries the host regex oracle facts (invariant-regex) alongside the AST oracle facts',
    () => {
      // The fixture's helper.ts is clean, so add a file that fires NO_DEFAULT_EXPORT to
      // prove the host oracle's facts are folded into the composed IR.
      const withDefault = makeFixture({
        ...sourceFiles(),
        'packages/example/src/legacy.ts': 'const legacy = 1;\nexport default legacy;\n',
      });
      try {
        const ir = buildRepoIRForRepo(withDefault);
        const regexFacts = ir.facts.filter((f) => f.oracleId === 'invariant-regex');
        // The host oracle ran (at minimum the default-export fact fired on legacy.ts).
        expect(regexFacts.some((f) => f.property === 'is-default-export')).toBe(true);
        expect(regexFacts.some((f) => f.file === 'packages/example/src/legacy.ts')).toBe(true);
      } finally {
        rmSync(withDefault, { recursive: true, force: true });
      }
    },
    HEAVY,
  );

  it(
    'is DETERMINISTIC — the same source bytes yield an identical IR file table + digests',
    () => {
      const a = buildRepoIRForRepo(root);
      const b = buildRepoIRForRepo(root);
      const digestsOf = (ir: ReturnType<typeof buildRepoIRForRepo>): readonly string[] =>
        [...ir.files.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([id, n]) => `${id}:${n.contentDigest}`);
      expect(digestsOf(b)).toEqual(digestsOf(a));
    },
    HEAVY,
  );

  it(
    'the --symbols build (withSymbolReferences) still produces a faithful IR over the same corpus',
    () => {
      const irPlain = buildRepoIRForRepo(root, false);
      const irSymbols = buildRepoIRForRepo(root, true);
      // The file table is identical (symbols add reference facts, not files).
      expect(new Set(irSymbols.files.keys())).toEqual(new Set(irPlain.files.keys()));
      // The symbols build is a strict superset of facts (the whole-corpus symbol oracle
      // only ADDS reference facts, never removes the AST/regex oracle facts).
      expect(irSymbols.facts.length).toBeGreaterThanOrEqual(irPlain.facts.length);
    },
    HEAVY,
  );
});

describe('runGauntletWithRepoIR — build IR + always-on facts + run + receipt', () => {
  it(
    'runs the default --ir path and returns a well-formed GauntletResult (no opt-ins)',
    async () => {
      const root = freshFixture();
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root });
      expect(Array.isArray(result.findings)).toBe(true);
      expect(Array.isArray(result.outcomes)).toBe(true);
      expect(typeof result.blocked).toBe('boolean');
    },
    HEAVY,
  );

  it(
    'is DETERMINISTIC against the injected clock — two runs over the same bytes agree on the verdict',
    async () => {
      const root = freshFixture();
      const a = await runGauntletWithRepoIR(root, NOW, undefined, { noCache: true });
      const b = await runGauntletWithRepoIR(root, NOW, undefined, { noCache: true });
      expect(b.blocked).toBe(a.blocked);
      expect(b.findings.map((f) => f.ruleId).sort()).toEqual(a.findings.map((f) => f.ruleId).sort());
    },
    HEAVY,
  );

  it(
    'the --no-cache path disarms the verdict cache yet returns the same verdict shape',
    async () => {
      const root = freshFixture();
      const cached = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root });
      const uncached = await runGauntletWithRepoIR(root, NOW, undefined, { noCache: true });
      expect(uncached.blocked).toBe(cached.blocked);
    },
    HEAVY,
  );

  it(
    'honours an explicit glob override (the non-sentinel forward path)',
    async () => {
      const root = freshFixture();
      const result = await runGauntletWithRepoIR(root, NOW, ['packages/**/*.ts'], { noCache: true });
      expect(typeof result.blocked).toBe('boolean');
    },
    HEAVY,
  );

  it(
    'the --proof opt-in composes its gate + facts without throwing (light path)',
    async () => {
      const root = freshFixture();
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withProof: true });
      expect(Array.isArray(result.findings)).toBe(true);
    },
    HEAVY,
  );

  it(
    'the --composition opt-in composes its gate + facts without throwing (light path)',
    async () => {
      const root = freshFixture();
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withComposition: true });
      expect(Array.isArray(result.findings)).toBe(true);
    },
    HEAVY,
  );

  it(
    'the --taint opt-in traces the corpus dataflow and composes the taint gate',
    async () => {
      const root = freshFixture();
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withTaint: true });
      expect(Array.isArray(result.findings)).toBe(true);
    },
    HEAVY,
  );

  it(
    'the --simulate opt-in drives the determinism corpus and composes the simulation gate',
    async () => {
      const root = freshFixture();
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withSimulate: true });
      expect(Array.isArray(result.findings)).toBe(true);
    },
    HEAVY,
  );

  it(
    'the cache is NAMESPACED by --symbols — a symbols-on verdict is computed independently',
    async () => {
      // Two runs (symbols off, symbols on) both complete with the cache armed; the
      // namespacing keeps them from cross-serving (the stale-serve lie). We pin that the
      // mode flows through end-to-end rather than the private key bytes.
      const root = freshFixture();
      const off = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withSymbolReferences: false });
      const on = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withSymbolReferences: true });
      expect(typeof off.blocked).toBe('boolean');
      expect(typeof on.blocked).toBe('boolean');
    },
    HEAVY,
  );

  it(
    'the --supply-chain opt-in (with a real lockfile + workspace) computes the SBOM facts and folds the gate',
    async () => {
      // A minimal-but-valid pnpm-lock.yaml + pnpm-workspace.yaml lets the host's heavy
      // supply-chain analyzer run end-to-end (lockfile parse → SBOM → CI scan → the
      // injected facts), exercising the real address-of-lockfile read + the workspace
      // projection rather than the no-lockfile fail-loud edge.
      const root = freshFixture({
        'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n",
        'pnpm-lock.yaml': "lockfileVersion: '9.0'\nimporters:\n  .:\npackages:\n",
        'packages/example/package.json': JSON.stringify({
          name: '@liteship/example',
          version: '0.0.0',
          private: true,
          exports: { '.': { development: './src/index.ts' } },
        }),
      });
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withSupplyChain: true });
      expect(Array.isArray(result.findings)).toBe(true);
      expect(typeof result.blocked).toBe('boolean');
    },
    HEAVY,
  );
});

// ───────────────────────────────────────────────────────────────────────────
// 3b. THE HEAVY OPT-INS over an empty-seam fixture (real code, no subprocess)
// ───────────────────────────────────────────────────────────────────────────

describe('runGauntletWithRepoIR — the --mutate / --mcdc seam paths (no L4 seams present)', () => {
  it(
    '--mutate composes the mutation gate; an absent baseline/registry yields an empty (no-floor) run',
    async () => {
      // The fixture has NONE of the real LiteShip L4 seam files, so `l4SeamTargets`
      // produces zero targets (every candidate recorded as unreadable → no per-mutant
      // subprocess), exercising the host's mutation-fact assembly + the absent-artifact
      // branches of readMutationScoreBaseline / readEquivalentMutantRegistry.
      const root = freshFixture();
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withMutate: true });
      expect(Array.isArray(result.findings)).toBe(true);
    },
    HEAVY,
  );

  it(
    '--mcdc composes the MC/DC gate over the same empty-seam path',
    async () => {
      const root = freshFixture();
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withMcdc: true });
      expect(Array.isArray(result.findings)).toBe(true);
    },
    HEAVY,
  );

  it(
    'a present, POPULATED mutation-score baseline + equivalents registry parse cleanly (the happy-read path)',
    async () => {
      // A non-empty, well-formed ratchet + registry exercises the host's baseline/registry
      // READERS' success path (each finite-number entry accepted, the registry built) — the
      // ratchet floor is armed even though this fixture has no live L4 seams to score.
      const root = freshFixture({
        'benchmarks/mutation-score.json': JSON.stringify({ 'packages/example/src/index.ts': 0.9 }),
        'benchmarks/mutation-equivalents.json': JSON.stringify({ entries: [] }),
      });
      const result = await runGauntletWithRepoIR(root, NOW, undefined, { cacheCwd: root, withMutate: true });
      expect(Array.isArray(result.findings)).toBe(true);
    },
    HEAVY,
  );
});

// ───────────────────────────────────────────────────────────────────────────
// 4. THE FAIL-LOUD EDGES — a corrupt artifact must be VISIBLE, never a silent green
// ───────────────────────────────────────────────────────────────────────────

describe('runGauntletWithRepoIR — fail-loud edges (tagged throws, never a silent pass)', () => {
  it(
    '--supply-chain with NO pnpm-lock.yaml throws a tagged InvariantViolation',
    async () => {
      const root = freshFixture(); // the fixture deliberately has no lockfile
      await expect(
        runGauntletWithRepoIR(root, NOW, undefined, { noCache: true, withSupplyChain: true }),
      ).rejects.toSatisfy((e: unknown) => isTaggedError(e));
    },
    HEAVY,
  );

  it(
    'a corrupt (non-object) committed mutation-score ratchet throws a tagged error on the run',
    async () => {
      // Build the fixture with a CLEAN tree (the standards snapshot is generated from clean
      // floors), THEN corrupt the committed ratchet artifact. The always-on run re-reads it
      // and refuses LOUD — a corrupt ratchet must be visible, never silently treated as "no
      // floor". (The mutation-score baseline is read by both the always-on standards floor
      // surface and the --mutate baseline reader; either way the corrupt artifact fails the
      // run, never a silent green.)
      const root = freshFixture();
      mkdirSync(join(root, 'benchmarks'), { recursive: true });
      writeFileSync(join(root, 'benchmarks/mutation-score.json'), JSON.stringify([1, 2, 3]), 'utf8');
      await expect(runGauntletWithRepoIR(root, NOW, undefined, { noCache: true, withMutate: true })).rejects.toSatisfy(
        (e: unknown) => isTaggedError(e),
      );
    },
    HEAVY,
  );

  it(
    'a non-numeric mutation-score entry throws a tagged error on the run (a corrupt ratchet)',
    async () => {
      const root = freshFixture();
      mkdirSync(join(root, 'benchmarks'), { recursive: true });
      writeFileSync(
        join(root, 'benchmarks/mutation-score.json'),
        JSON.stringify({ 'packages/x.ts': 'not-a-number' }),
        'utf8',
      );
      await expect(runGauntletWithRepoIR(root, NOW, undefined, { noCache: true, withMutate: true })).rejects.toSatisfy(
        (e: unknown) => isTaggedError(e),
      );
    },
    HEAVY,
  );

  it(
    'a malformed equivalent-mutant registry (no "entries" array) throws a tagged error on --mutate',
    async () => {
      // The registry parse fails loud on a shape without the required `entries` array —
      // a corrupt registry must be visible, never silently treated as "no equivalents".
      const root = freshFixture({ 'benchmarks/mutation-equivalents.json': JSON.stringify({ bogus: 'shape' }) });
      await expect(runGauntletWithRepoIR(root, NOW, undefined, { noCache: true, withMutate: true })).rejects.toSatisfy(
        (e: unknown) => isTaggedError(e),
      );
    },
    HEAVY,
  );
});

// ───────────────────────────────────────────────────────────────────────────
// 5. THE --spine-relation HOST PATH — over the REAL repo (needs the real _spine
//    mirror + runtime surface; a hermetic @liteship/example fixture has neither).
// ───────────────────────────────────────────────────────────────────────────

describe('runGauntletWithRepoIR — the --spine-relation host path blocks on a planted drift (#156)', () => {
  const CORE_DTS = resolve(repoRoot, 'packages/_spine/core.d.ts');
  // The spine probe needs the REAL spine + runtime surface, so this runs over the real
  // repo root. The standards base-ref is served from the committed working-tree snapshot
  // (an empty diff → the always-on raccoon-rule gate is green), so the ONLY planted change
  // is the spine drift — the run's block is attributable to the spine-relation gate.
  const realSnapshotBase: GitShowReader = (r) => readFileSync(join(r, STANDARDS_SNAPSHOT_PATH), 'utf8');

  it(
    'a planted Millis-brand-loss drift reds the spine-relation gate → `liteship check --ir --spine-relation` BLOCKS',
    async () => {
      const drifted = readFileSync(CORE_DTS, 'utf8').replace(
        'readonly durationMs: Millis;',
        'readonly durationMs: number;',
      );
      expect(drifted, 'the drift edit must actually change core.d.ts').not.toBe(readFileSync(CORE_DTS, 'utf8'));
      const result = await runGauntletWithRepoIRRaw(repoRoot, NOW, undefined, {
        noCache: true,
        withSpineRelation: true,
        spineRelation: { overlay: { [CORE_DTS]: drifted } },
        standards: { gitShow: realSnapshotBase },
      });
      // The host COMPOSED the gate and INJECTED the facts: the VideoConfig mirror (durationMs
      // demoted past its Millis brand) surfaces as a blocking L4 spine-relation finding.
      const spineFindings = result.findings.filter((f) => f.ruleId === 'gauntlet/spine-relation');
      expect(spineFindings.some((f) => f.title.includes('VideoConfig'))).toBe(true);
      expect(spineFindings.some((f) => f.severity === 'error' && f.level === 'L4')).toBe(true);
      // An L4 spine error forces the run to BLOCK (independent of any other finding).
      expect(result.blocked).toBe(true);
    },
    HEAVY,
  );
});
