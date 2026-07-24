/**
 * Verdict-cache OUT-OF-IR-EVIDENCE soundness (the lie-detector's lie-vector cure).
 *
 * The verdict cache content-keys a gate against its COVERAGE DIGEST — the bytes of
 * the gate's covered files IN THE IR. But the IR is PACKAGE SOURCE ONLY (built from
 * `auditSourceGlobs`). A gate that reads evidence OUTSIDE the IR — a confirmer test
 * under `tests/` (the claim-property family, via `allFiles()`), a `benchmarks/*.json`
 * registry (the perf-claim family, via `readFile`), a ledger/snapshot, or the CONTENT
 * of a host-injected fact (mutation / supply-chain / … whose source bytes are an
 * external artifact) — has evidence the coverage digest CANNOT see. Without folding
 * it, the cache serves a STALE verdict when that out-of-IR evidence changes while the
 * IR source stays byte-identical: the worst failure class (a real defect ships green).
 *
 * These tests PROVE the cure has teeth: for a representative gate of EACH out-of-IR
 * evidence class, they warm the cache (run 1), CHANGE AN OUT-OF-IR BYTE (the verdict
 * genuinely flips), run again, and assert the gate RE-FOLDS — the cached verdict is
 * NOT served, and the new (correct) verdict is produced. Each test is RED against the
 * pre-fix cache (the stale hit is served — the verdict does NOT change when the
 * out-of-IR byte changes) and GREEN after the `evidenceDigest` fold.
 *
 * The HIT companion proves the fix did not just disable caching: a pure IR-only
 * re-run with identical out-of-IR evidence still HITS (only out-of-IR changes refold).
 *
 * Every input is deterministic — literal IRs, literal facts, no clock, no filesystem.
 */

import { describe, it, expect } from 'vitest';
import {
  claimPropertyGate,
  mutationDivergenceGate,
  noSkippedTestGate,
  noPlaceholderGate,
  makeRepoIR,
  runGates,
  type Fact,
  type FileId,
  type FileNode,
  type Finding,
  type GateContext,
  type MutationFacts,
  type RepoIR,
} from '@liteship/gauntlet';

// ── scaffolding ──────────────────────────────────────────────────────────────

/** An in-memory verdict store + hit/miss/write counters — the cache test-double. */
function makeMemoryCache(): {
  read(key: string): readonly Finding[] | null;
  write(key: string, findings: readonly Finding[]): void;
  store: Map<string, readonly Finding[]>;
  hits: number;
  misses: number;
  writes: number;
} {
  const store = new Map<string, readonly Finding[]>();
  const self = {
    store,
    hits: 0,
    misses: 0,
    writes: 0,
    read(key: string): readonly Finding[] | null {
      const v = store.get(key);
      if (v === undefined) {
        self.misses += 1;
        return null;
      }
      self.hits += 1;
      return v;
    },
    write(key: string, findings: readonly Finding[]): void {
      self.writes += 1;
      store.set(key, findings);
    },
  };
  return self;
}

function fileNode(id: FileId, contentDigest: string): FileNode {
  return { id, contentDigest, packageName: null };
}

const TC = 'tc-sha256:soundness';
const ENV = { node: 'v22.0.0', platform: 'linux', arch: 'x64', pm: '' } as const;

/**
 * The IR carries ONLY package SOURCE files (the real `auditSourceGlobs` scope) — the
 * confirmer test corpus / benchmarks / ledgers live OUTSIDE it. So the coverage
 * digest folds only the source bytes; the out-of-IR bytes must be folded by the
 * gate's `evidenceDigest`, or the cache lies.
 */
function sourceOnlyIR(sourceFiles: Record<FileId, string>, facts: Fact[] = []): RepoIR {
  return makeRepoIR({
    files: Object.entries(sourceFiles).map(([id, digest]) => fileNode(id, digest)),
    facts,
  });
}

/**
 * A context whose `files()` is the IR (source) scope but whose `readFile`/`allFiles`
 * ALSO serve the out-of-IR corpus — exactly the real nodeContext shape (IR is
 * source-only; `allFiles()` is the full unscoped corpus incl. `tests/`). `extra`
 * carries the out-of-IR files (test bodies / benchmark JSON) `readFile` returns and
 * `allFiles()` enumerates alongside the IR source files.
 */
function ctxSourceIRPlusCorpus(ir: RepoIR, extra: Record<string, string>): GateContext {
  const sourceFiles = [...ir.files.keys()];
  const sourceText = new Map<string, string>(sourceFiles.map((id) => [id, '']));
  const corpus = new Map<string, string>(Object.entries(extra));
  return {
    repoRoot: '/virtual',
    ir,
    readFile: (p: string): string | undefined => corpus.get(p) ?? sourceText.get(p),
    // The JUDGED surface is the IR source only (what the gate flags findings on).
    files: (): readonly string[] => sourceFiles,
    // The UNSCOPED corpus = source + the out-of-IR confirmer/benchmark files.
    allFiles: (): readonly string[] => [...sourceFiles, ...corpus.keys()],
  };
}

/** Build a context where claim-property's published source + (optional) confirmer is set. */
function claimCtx(opts: { source: string; confirmerTest?: string }): {
  ctx: GateContext;
  ir: RepoIR;
} {
  // A `deterministicFold` NAME-claim in published source — a HARD finding unless a
  // determinism test confirms it. The IR carries ONLY the source file.
  const ir = sourceOnlyIR({ 'packages/widget/src/fold.ts': 'src-digest-FIXED' });
  const extra: Record<string, string> = { 'packages/widget/src/fold.ts': opts.source };
  if (opts.confirmerTest !== undefined) {
    extra['tests/unit/widget/fold-determinism.prop.test.ts'] = opts.confirmerTest;
  }
  // `readFile` must serve the source body too — override the empty source text.
  const base = ctxSourceIRPlusCorpus(ir, extra);
  return { ctx: base, ir };
}

const FOLD_SOURCE = 'export function deterministicFold(): number {\n  return 1;\n}\n';
const FOLD_CONFIRMER =
  "import { it } from 'vitest';\nit('deterministicFold replays byte-identical — a determinism proof', () => {\n  // determinism/replay assertion naming deterministicFold\n});\n";

function claimFindings(r: { findings: readonly Finding[] }): readonly Finding[] {
  return r.findings.filter((f) => f.ruleId === claimPropertyGate.id);
}

// ── CLASS 1: an allFiles()-reading gate (claim-property — confirmer test corpus) ──

describe('verdict cache soundness — claim-property (allFiles confirmer corpus)', () => {
  it('removing a confirmer TEST (out-of-IR) RE-FOLDS — the now-unconfirmed claim is NOT served stale-green', () => {
    const cache = makeMemoryCache();

    // Run 1: the confirmer test is PRESENT → the deterministicFold claim is confirmed
    // → ZERO claim findings. The verdict is cached (keyed by IR source + the evidence
    // digest of the confirmer corpus).
    const present = claimCtx({ source: FOLD_SOURCE, confirmerTest: FOLD_CONFIRMER });
    const r1 = runGates([claimPropertyGate], present.ctx, { cache, toolchainDigest: TC, env: ENV });
    expect(claimFindings(r1).length).toBe(0); // confirmed → clean

    // Run 2: the confirmer test is REMOVED (an out-of-IR byte change), but the IR
    // source file is BYTE-IDENTICAL (`src-digest-FIXED`). The claim is now UNCONFIRMED
    // → it MUST flag. A pre-fix cache keyed only on IR source serves the stale GREEN
    // here (the lie). With the evidence digest, the missing confirmer flips the key →
    // MISS → the gate re-folds and the finding appears.
    const removed = claimCtx({ source: FOLD_SOURCE }); // no confirmerTest
    const r2 = runGates([claimPropertyGate], removed.ctx, { cache, toolchainDigest: TC, env: ENV });
    expect(claimFindings(r2).length).toBeGreaterThan(0); // RE-FOLDED: the claim is now flagged
  });

  it('an IR-only re-run with the SAME confirmer corpus still HITS (the fix did not disable caching)', () => {
    const cache = makeMemoryCache();
    const a = claimCtx({ source: FOLD_SOURCE, confirmerTest: FOLD_CONFIRMER });

    runGates([claimPropertyGate], a.ctx, { cache, toolchainDigest: TC, env: ENV });
    expect(cache.writes).toBe(1);
    const before = cache.hits;

    // A fresh context with IDENTICAL IR source AND identical confirmer corpus — every
    // byte the gate reads (in-IR and out-of-IR) is unchanged → the key is identical →
    // a HIT (gate.run skipped). Only out-of-IR CHANGES refold; identity still hits.
    const b = claimCtx({ source: FOLD_SOURCE, confirmerTest: FOLD_CONFIRMER });
    runGates([claimPropertyGate], b.ctx, { cache, toolchainDigest: TC, env: ENV });
    expect(cache.hits).toBe(before + 1);
    expect(cache.writes).toBe(1); // no second write — served from cache
  });
});

// ── CLASS 2: an injected-fact gate (mutation — facts from external test runs) ─────

/**
 * Build a mutation context: one IR L4 source file + injected MutationFacts. The facts'
 * source bytes (the per-mutant kill/survive verdicts) come from EXTERNAL vitest runs,
 * NOT the IR — so editing them must refold even when the IR source is byte-identical.
 */
function mutationCtx(verdict: 'killed' | 'survived'): GateContext {
  const file = 'packages/core/src/spine.ts';
  const facts: Fact[] = [];
  const ir = sourceOnlyIR({ [file]: 'spine-digest-FIXED' }, facts);
  const mutation: MutationFacts = {
    outcomes: [
      {
        mutantId: 'm-1',
        verdict,
        file,
        line: 1,
        column: 1,
        operator: 'conditional-boundary',
        originalText: 'a < b',
        mutatedText: 'a <= b',
        coveringTests: ['tests/fixture.test.ts'],
        equivalentJustification: null,
        equivalentJustificationDigest: null,
        subsumedBy: [],
      },
    ],
    operatorApplicability: [{ file, operator: 'conditional-boundary', applicableMutants: 1 }],
    scoreBaseline: {},
  };
  return {
    repoRoot: '/virtual',
    ir,
    mutation,
    readFile: (): string | undefined => '',
    files: (): readonly string[] => [file],
    allFiles: (): readonly string[] => [file],
  };
}

function mutationFindings(r: { findings: readonly Finding[] }): readonly Finding[] {
  return r.findings.filter((f) => f.ruleId === mutationDivergenceGate.id);
}

describe('verdict cache soundness — mutation-divergence (injected fact content)', () => {
  it('a mutant flipping killed→survived (out-of-IR fact) RE-FOLDS — the survivor is NOT served stale-clean', () => {
    const cache = makeMemoryCache();

    // Run 1: the mutant was KILLED (adequate coverage) → NO survivor finding. Cached.
    const killed = mutationCtx('killed');
    const r1 = runGates([mutationDivergenceGate], killed, { cache, toolchainDigest: TC, env: ENV });
    expect(mutationFindings(r1).length).toBe(0);

    // Run 2: the SAME IR source (byte-identical `spine-digest-FIXED`), but the injected
    // mutation FACT now says the mutant SURVIVED (a confirmer test was weakened off-IR,
    // so the mutant escapes). The survivor MUST flag. A pre-fix cache keyed only on IR
    // source serves the stale CLEAN verdict (the lie). The fact-content evidence digest
    // flips the key → MISS → the gate re-folds the survivor.
    const survived = mutationCtx('survived');
    const r2 = runGates([mutationDivergenceGate], survived, { cache, toolchainDigest: TC, env: ENV });
    expect(mutationFindings(r2).length).toBeGreaterThan(0); // RE-FOLDED: survivor flagged
  });

  it('an IR-only re-run with the SAME mutation facts still HITS (caching preserved)', () => {
    const cache = makeMemoryCache();
    const a = mutationCtx('survived');
    runGates([mutationDivergenceGate], a, { cache, toolchainDigest: TC, env: ENV });
    expect(cache.writes).toBe(1);
    const before = cache.hits;

    const b = mutationCtx('survived'); // identical IR source + identical facts
    runGates([mutationDivergenceGate], b, { cache, toolchainDigest: TC, env: ENV });
    expect(cache.hits).toBe(before + 1);
    expect(cache.writes).toBe(1);
  });
});

// ── CLASS 3: the always-blocking skip/placeholder gates (now allFiles()-reading) ──
//
// noSkippedTestGate + noPlaceholderGate were WIDENED to govern the `tests/` tree (read
// through the UNSCOPED allFiles(), OUTSIDE the IR). That re-introduced the stale-cache
// hole the P1a mechanism cures: a skip ADDED to a test file changes NO IR-source byte, so
// a coverage-digest-only cache would serve a stale GREEN. Each gate declares
// `evidenceDigest` folding the governed test corpus, so editing a test under `tests/`
// flips the key → MISS → re-run. These tests pin that soundness.

/**
 * A context whose IR (judged `files()`) is a single package-source file (BYTE-FIXED
 * across runs), but whose `allFiles()`/`readFile` ALSO serve an out-of-IR `tests/` file —
 * the real nodeContext shape. Editing only the `tests/` body must refold.
 */
function skipCtx(testBody: string, testPath = 'tests/unit/widget/probe.test.ts'): GateContext {
  const source = 'packages/widget/src/widget.ts';
  const ir = sourceOnlyIR({ [source]: 'widget-digest-FIXED' });
  const corpus = new Map<string, string>([
    [source, 'export const x = 1;\n'],
    [testPath, testBody],
  ]);
  return {
    repoRoot: '/virtual',
    ir,
    readFile: (p: string): string | undefined => corpus.get(p),
    files: (): readonly string[] => [source], // IR (judged) scope — source only
    allFiles: (): readonly string[] => [source, testPath], // unscoped corpus incl. tests/
  };
}

describe('verdict cache soundness — no-skipped-test (allFiles tests/ corpus)', () => {
  it('ADDING an unsanctioned skip to a tests/ file (out-of-IR) RE-FOLDS — not served stale-green', () => {
    const cache = makeMemoryCache();

    // Run 1: a clean tests/ file (a real running test) → ZERO skip findings. Cached,
    // keyed by IR source (byte-fixed) + the evidence digest of the tests/ corpus.
    const clean = skipCtx("it('runs', () => { expect(1).toBe(1); });\n");
    const r1 = runGates([noSkippedTestGate], clean, { cache, toolchainDigest: TC, env: ENV });
    expect(r1.findings.filter((f) => f.ruleId === noSkippedTestGate.id).length).toBe(0);

    // Run 2: the IR source is BYTE-IDENTICAL, but the tests/ file now carries an
    // unsanctioned `it.skip` — an out-of-IR byte change. A coverage-digest-only cache
    // would serve the stale GREEN (the lie). The evidence digest flips the key → MISS →
    // the skip is flagged.
    const skipped = skipCtx("it.skip('not wired', () => {});\n");
    const r2 = runGates([noSkippedTestGate], skipped, { cache, toolchainDigest: TC, env: ENV });
    expect(r2.findings.filter((f) => f.ruleId === noSkippedTestGate.id).length).toBeGreaterThan(0);
  });

  it('an identical tests/ corpus re-run still HITS (caching preserved)', () => {
    const cache = makeMemoryCache();
    const body = "it('runs', () => { expect(1).toBe(1); });\n";
    runGates([noSkippedTestGate], skipCtx(body), { cache, toolchainDigest: TC, env: ENV });
    expect(cache.writes).toBe(1);
    const before = cache.hits;
    runGates([noSkippedTestGate], skipCtx(body), { cache, toolchainDigest: TC, env: ENV });
    expect(cache.hits).toBe(before + 1);
    expect(cache.writes).toBe(1);
  });
});

describe('verdict cache soundness — no-placeholder (allFiles tests/ corpus)', () => {
  it('ADDING a TODO placeholder to a tests/ file (out-of-IR) RE-FOLDS — not served stale-green', () => {
    const cache = makeMemoryCache();

    const clean = skipCtx("bench('real', () => {});\n", 'tests/bench/widget.bench.ts');
    const r1 = runGates([noPlaceholderGate], clean, { cache, toolchainDigest: TC, env: ENV });
    expect(r1.findings.filter((f) => f.ruleId === noPlaceholderGate.id).length).toBe(0);

    // Same IR source, but the bench file now leads with a TODO-placeholder comment.
    const todo = skipCtx(
      '// TODO(t): uncomment when resolveWidget exists\nbench("real", () => {});\n',
      'tests/bench/widget.bench.ts',
    );
    const r2 = runGates([noPlaceholderGate], todo, { cache, toolchainDigest: TC, env: ENV });
    expect(r2.findings.filter((f) => f.ruleId === noPlaceholderGate.id).length).toBeGreaterThan(0);
  });
});
