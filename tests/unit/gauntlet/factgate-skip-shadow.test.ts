/**
 * FactGate PoC — the falsification experiment for "gate-as-data".
 *
 * The closure {@link noSkippedTestGate} fuses acquisition + normalization + decision in one
 * arbitrary `run(context)` body that may read anything on the context (the structural hole the
 * `verdict-cache-soundness` law can only *police*, not *remove*). {@link noSkippedTestFactGate}
 * is the same rule reshaped as DATA: a host-side PRODUCER lands a {@link SkipSiteFacts} pack,
 * the gate DECLARES it consumes `skipSites`, and a context-free KERNEL decides over it.
 *
 * These tests are the 10 acceptance criteria from the plan — the experiment's pass/fail spec.
 * Criterion #6 (the shadow-diff) is the load-bearing one: old ≡ new over the adversarial corpus.
 * Criterion #10 is the hypothesis: the decision DID fit a data-only kernel — no escape hatch.
 *
 * Every input is deterministic — literal corpora, produced facts, no clock, no real filesystem.
 */

import { describe, it, expect } from 'vitest';
import {
  noSkippedTestGate,
  noSkippedTestFactGate,
  defineFactGate,
  isFactGate,
  factBundleDigest,
  produceSkipSiteFacts,
  produceSkipSiteFactsFromContext,
  decideSkipSite,
  decideSkips,
  governedFiles,
  verifyGate,
  runGates,
  makeRepoIR,
  memoryContext,
  type GateContext,
  type Finding,
  type FactBundle,
  type SkipSiteFact,
  type SkipSiteFacts,
} from '@czap/gauntlet';

// ── scaffolding ──────────────────────────────────────────────────────────────

const RULE = 'gauntlet/no-skipped-test';
const TC = 'tc-sha256:factgate';
const ENV = { node: 'v22.0.0', platform: 'linux', arch: 'x64', pm: '' } as const;

/** A context over a literal corpus (files == allFiles), with the SkipSite pack produced onto it. */
function dualCtx(corpus: Record<string, string>): GateContext {
  const base: GateContext = {
    repoRoot: '/virtual',
    readFile: (p: string): string | undefined => corpus[p],
    files: (): readonly string[] => Object.keys(corpus),
    allFiles: (): readonly string[] => Object.keys(corpus),
  };
  return { ...base, skipSites: produceSkipSiteFactsFromContext(base) };
}

/** Normalize a finding to the fields both gates must agree on, for an order-independent diff. */
function norm(f: Finding): string {
  return JSON.stringify({ ruleId: f.ruleId, file: f.location?.file, line: f.location?.line, title: f.title, detail: f.detail });
}
function normSet(findings: readonly Finding[]): readonly string[] {
  return findings
    .filter((f) => f.ruleId === RULE)
    .map(norm)
    .sort();
}

/** An in-memory verdict store + write counter — the cache test-double. */
function makeMemoryCache(): { read(k: string): readonly Finding[] | null; write(k: string, f: readonly Finding[]): void; writes: number } {
  const store = new Map<string, readonly Finding[]>();
  const self = {
    writes: 0,
    read: (k: string): readonly Finding[] | null => store.get(k) ?? null,
    write: (k: string, f: readonly Finding[]): void => {
      self.writes += 1;
      store.set(k, f);
    },
  };
  return self;
}

/** A cacheable context: a byte-FIXED IR source + an out-of-IR tests/ body, with skipSites produced. */
function factCacheCtx(testBody: string): GateContext {
  const source = 'packages/widget/src/widget.ts';
  const testPath = 'tests/unit/widget/probe.test.ts';
  const ir = makeRepoIR({ files: [{ id: source, contentDigest: 'widget-FIXED', packageName: null }], facts: [] });
  const corpus: Record<string, string> = { [source]: 'export const x = 1;\n', [testPath]: testBody };
  const base: GateContext = {
    repoRoot: '/virtual',
    ir,
    readFile: (p: string): string | undefined => corpus[p],
    files: (): readonly string[] => [source],
    allFiles: (): readonly string[] => [source, testPath],
  };
  return { ...base, skipSites: produceSkipSiteFactsFromContext(base) };
}

// The SANCTIONED green site (must match the allowlist byte-for-byte) + its file.
const SANCTIONED_FILE = 'tests/smoke/intro-render.test.ts';
const SANCTIONED_LINE = "it.skip('skipped — ffmpeg libx264 render probe failed (see czap doctor)', () => {});\n";

/** The adversarial corpus the shadow-diff runs both gates over — every hazard class. */
const SHADOW_CORPORA: Record<string, Record<string, string>> = {
  'exotic + aliased UNSANCTIONED forms': {
    'tests/unit/widget/unwired.test.ts':
      'const renderIt = COND ? it : it.skip;\n' +
      "renderIt('not wired yet', () => {});\n" +
      "it.concurrent.skip('chained modifier skip', () => {});\n" +
      'it["skip"]("bracket skip", () => {});\n' +
      'it[cond ? "skip" : "only"]("computed skip", () => {});\n',
    'tests/unit/widget/import-rename.test.ts':
      'import { it as spec } from "vitest";\nspec.skip("import-renamed runner skip", () => {});\n',
    'tests/unit/widget/rebind.test.ts': 'const t = it;\nt.skip("rebound runner skip", () => {});\n',
  },
  'a SANCTIONED site passes + prose mention is clean': {
    [SANCTIONED_FILE]: SANCTIONED_LINE,
    'tests/unit/widget/good.test.ts':
      "// This suite never uses it.skip — every test runs.\nit('asserts a real fact', () => {\n  expect('it.skip is only mentioned in prose'.length).toBeGreaterThan(0);\n});\n",
  },
  'a placeholder-marked skip blocks even if it looked sanctioned': {
    'tests/unit/widget/todo.test.ts': "it.skip('TODO wire this up later', () => {});\n",
  },
  'a DIFFERENT (unsanctioned) skip in an otherwise-sanctioned file blocks (per-site)': {
    [SANCTIONED_FILE]: SANCTIONED_LINE + "it.skip('a second, unenumerated skip', () => {});\n",
  },
  'tests/generated/ skips are EXCLUDED (the plumb-gate owns that tree)': {
    'tests/generated/capsule.test.ts': "it.skip('generated placeholder', () => {});\n",
    'tests/unit/widget/real.test.ts': "it('runs', () => { expect(1).toBe(1); });\n",
  },
  'a clean corpus — both silent': {
    'tests/unit/widget/clean.test.ts': "it('runs', () => { expect(1).toBe(1); });\n",
  },
};

// ── #6 — the shadow-diff (the load-bearing equivalence) ──────────────────────

describe('FactGate #6 — shadow-diff: closure gate ≡ fact gate over the adversarial corpus', () => {
  for (const [name, corpus] of Object.entries(SHADOW_CORPORA)) {
    it(`identical findings: ${name}`, () => {
      const ctx = dualCtx(corpus);
      const closure = normSet(noSkippedTestGate.run(ctx));
      const fact = normSet(noSkippedTestFactGate.run(ctx));
      expect(fact).toEqual(closure);
    });
  }

  it('the two agree that the unsanctioned corpus is NON-empty (the diff is not vacuously equal)', () => {
    const ctx = dualCtx(SHADOW_CORPORA['exotic + aliased UNSANCTIONED forms']!);
    expect(normSet(noSkippedTestFactGate.run(ctx)).length).toBeGreaterThan(0);
    expect(normSet(noSkippedTestGate.run(ctx))).toEqual(normSet(noSkippedTestFactGate.run(ctx)));
  });
});

// ── #1 — the author surface is data + a context-free decision ────────────────

describe('FactGate #1 — no GateContext-reading author function', () => {
  it('is a fact gate that DECLARES its evidence and decides over data alone', () => {
    expect(isFactGate(noSkippedTestFactGate)).toBe(true);
    expect(noSkippedTestFactGate.form).toBe('fact');
    expect(noSkippedTestFactGate.requires).toEqual(['skipSites']);
    // decide takes the FactBundle (data), never a context — it produces findings from a
    // hand-built pack with NO context anywhere in scope.
    const pack: SkipSiteFacts = {
      sites: [{ file: 'tests/a.test.ts', line: 3, form: 'call', token: 'it.skip', carriesPlaceholder: false, sanctionMatched: false, capabilityConsistent: false }],
    };
    const findings = noSkippedTestFactGate.decide({ skipSites: pack });
    expect(findings.length).toBe(1);
    expect(findings[0]!.ruleId).toBe(RULE);
  });
});

// ── #2 — cache identity derives from the DECLARED fact, not the corpus ────────

describe('FactGate #2 — cache identity is the FactPack digest, not a gate-authored evidenceDigest', () => {
  const pack: SkipSiteFacts = { sites: [{ file: 'tests/x.test.ts', line: 1, form: 'call', token: 'it.skip', carriesPlaceholder: false, sanctionMatched: false, capabilityConsistent: false }] };
  const withCorpusA: GateContext = { repoRoot: '/v', readFile: () => 'AAA', files: () => ['a.ts'], allFiles: () => ['a.ts'], skipSites: pack };
  const withCorpusB: GateContext = { repoRoot: '/v', readFile: () => 'totally different bytes', files: () => ['b.ts', 'c.ts'], allFiles: () => ['b.ts', 'c.ts'], skipSites: pack };

  it('identical skipSites + DIFFERENT corpus/readFile → SAME identity (undeclared evidence ignored)', () => {
    expect(noSkippedTestFactGate.evidenceDigest!(withCorpusA)).toBe(noSkippedTestFactGate.evidenceDigest!(withCorpusB));
  });

  it('DIFFERENT skipSites → DIFFERENT identity', () => {
    const other: SkipSiteFacts = { sites: [{ ...pack.sites[0]!, line: 2 }] };
    const ctxOther: GateContext = { ...withCorpusA, skipSites: other };
    expect(noSkippedTestFactGate.evidenceDigest!(ctxOther)).not.toBe(noSkippedTestFactGate.evidenceDigest!(withCorpusA));
  });
});

// ── #3 — a source-byte change (via the producer) refolds the cache ───────────

describe('FactGate #3 — out-of-IR byte change refolds (cache soundness is structural)', () => {
  it('adding an unsanctioned skip to a tests/ file flips the key → MISS → re-folded (not stale-green)', () => {
    const cache = makeMemoryCache();
    const r1 = runGates([noSkippedTestFactGate], factCacheCtx("it('runs', () => { expect(1).toBe(1); });\n"), { cache, toolchainDigest: TC, env: ENV });
    expect(r1.findings.filter((f) => f.ruleId === RULE).length).toBe(0);
    const r2 = runGates([noSkippedTestFactGate], factCacheCtx("it.skip('not wired', () => {});\n"), { cache, toolchainDigest: TC, env: ENV });
    expect(r2.findings.filter((f) => f.ruleId === RULE).length).toBeGreaterThan(0);
  });

  it('an identical corpus re-run still HITS (caching preserved, not just disabled)', () => {
    const cache = makeMemoryCache();
    const body = "it('runs', () => { expect(1).toBe(1); });\n";
    runGates([noSkippedTestFactGate], factCacheCtx(body), { cache, toolchainDigest: TC, env: ENV });
    expect(cache.writes).toBe(1);
    runGates([noSkippedTestFactGate], factCacheCtx(body), { cache, toolchainDigest: TC, env: ENV });
    expect(cache.writes).toBe(1); // served from cache, no second write
  });
});

// ── #4 — a detector that changes the FactPack content changes the identity ────

describe('FactGate #4 — a detector change that alters the facts changes the cache identity', () => {
  it('two detectors that disagree on a site produce different fact digests', () => {
    const files = ['tests/unit/widget/a.test.ts'];
    const read = (): string => 'maybeSkip();\n';
    const blind = produceSkipSiteFacts(files, read, () => []);
    const sees = produceSkipSiteFacts(files, read, () => [{ line: 1, form: 'call', token: 'it.skip' }]);
    const ctxBlind: GateContext = { repoRoot: '/v', readFile: read, files: () => files, allFiles: () => files, skipSites: blind };
    const ctxSees: GateContext = { ...ctxBlind, skipSites: sees };
    expect(factBundleDigest(ctxSees, ['skipSites'])).not.toBe(factBundleDigest(ctxBlind, ['skipSites']));
    // NOTE: producer-IMPLEMENTATION identity independent of output (the 5-digest provenance —
    // producerDigest / toolchainDigest) is deliberately deferred; this PoC folds fact CONTENT.
  });
});

// ── #5 — a sanction-registry change manifests as a fact-content change ────────

describe('FactGate #5 — a sanction change changes the FactPack identity', () => {
  it('the same skip, sanctioned vs not, yields different facts → different identity', () => {
    const base: SkipSiteFact = { file: 'tests/x.test.ts', line: 1, form: 'call', token: 'it.skip', carriesPlaceholder: false, sanctionMatched: false, capabilityConsistent: false };
    const unsanctioned: GateContext = { repoRoot: '/v', readFile: () => '', files: () => [], allFiles: () => [], skipSites: { sites: [base] } };
    const sanctioned: GateContext = { ...unsanctioned, skipSites: { sites: [{ ...base, sanctionMatched: true, capabilityConsistent: true }] } };
    expect(factBundleDigest(sanctioned, ['skipSites'])).not.toBe(factBundleDigest(unsanctioned, ['skipSites']));
    // And the kernel decides them oppositely — the registry-fold actually drives the verdict.
    expect(decideSkipSite(base)).toBe('block');
    expect(decideSkipSite({ ...base, sanctionMatched: true, capabilityConsistent: true })).toBe('allow');
  });
});

// ── #7 — the existing red/green/mutation fixtures keep their teeth ────────────

describe('FactGate #7 — self-proves through the SAME authority ratchet', () => {
  it('red caught, green clean, mutation killed → blocking', () => {
    const proof = verifyGate(noSkippedTestFactGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});

// ── #8 — a malformed fact gate fails at construction ─────────────────────────

describe('FactGate #8 — defineFactGate validates the declaration', () => {
  const fixtures = noSkippedTestFactGate.fixtures;
  const base = { id: 'x/probe', level: 'L2' as const, describe: 'd', decide: (_f: FactBundle): readonly Finding[] => [], fixtures };

  it('an empty requires throws (a fact gate must declare ≥1 channel)', () => {
    expect(() => defineFactGate({ ...base, requires: [] })).toThrow();
  });
  it('an empty id throws', () => {
    expect(() => defineFactGate({ ...base, id: '  ', requires: ['skipSites'] })).toThrow();
  });
  it('a valid declaration constructs a fact gate', () => {
    const g = defineFactGate({ ...base, requires: ['skipSites'] });
    expect(isFactGate(g)).toBe(true);
    expect(typeof g.run).toBe('function'); // synthesized
    expect(typeof g.evidenceDigest).toBe('function'); // synthesized
  });
});

// ── #9 — the kernel is a pure boolean composition (the bounded vocabulary) ────

describe('FactGate #9 — the decision is a data-only kernel (the floor truth table)', () => {
  for (const placeholder of [false, true]) {
    for (const matched of [false, true]) {
      for (const consistent of [false, true]) {
        const expected = !placeholder && matched && consistent ? 'allow' : 'block';
        it(`placeholder=${placeholder} matched=${matched} consistent=${consistent} → ${expected}`, () => {
          const site: SkipSiteFact = { file: 'f.ts', line: 1, form: 'call', token: 'it.skip', carriesPlaceholder: placeholder, sanctionMatched: matched, capabilityConsistent: consistent };
          expect(decideSkipSite(site)).toBe(expected);
        });
      }
    }
  }
});

// ── #10 — the hypothesis: it FIT a data-only kernel; no escape hatch ──────────

describe('FactGate #10 — the FactPack is pure, serializable data (no escape hatch)', () => {
  it('the produced facts JSON round-trip identically — no closures, no context handles', () => {
    const ctx = dualCtx(SHADOW_CORPORA['exotic + aliased UNSANCTIONED forms']!);
    const facts = ctx.skipSites as SkipSiteFacts;
    expect(JSON.parse(JSON.stringify(facts))).toEqual(facts);
    expect(facts.sites.length).toBeGreaterThan(0);
    // The decision consumes ONLY this serializable data — the verdict is reproducible from
    // the JSON alone, with no producer, no context, no filesystem. That is the experiment's
    // YES: the decision fit a bounded data-only kernel; the producer owns all acquisition.
    const fromJson: FactBundle = { skipSites: JSON.parse(JSON.stringify(facts)) as SkipSiteFacts };
    expect(normSet(decideSkips(fromJson))).toEqual(normSet(noSkippedTestFactGate.run(ctx)));
  });

  it('an absent FactPack folds to an empty verdict (the lean-path graceful floor)', () => {
    const empty: GateContext = { repoRoot: '/v', readFile: () => undefined, files: () => [], allFiles: () => [] };
    expect(noSkippedTestFactGate.run(empty)).toEqual([]);
    expect(governedFiles(empty)).toEqual([]);
    // memoryContext is also accepted (no skipSites) → silent, not a crash.
    expect(noSkippedTestFactGate.run(memoryContext({}))).toEqual([]);
  });
});
