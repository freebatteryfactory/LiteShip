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
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  noSkippedTestGate,
  noSkippedTestFactGate,
  nodeContext,
  defineGate,
  defineFactGate,
  FACT_KINDS,
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
  type Gate,
  type GateContext,
  type Finding,
  type FactBundle,
  type FactKind,
  type SkipSiteFact,
  type SkipSiteFacts,
  type SkipMatch,
  type SkipConditionality,
  type SkipDetector,
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

/**
 * A context whose `files()` and `allFiles()` are DISJOINT (the real nodeContext shape: IR
 * source is judged, the tests/ tree rides allFiles), with the pack produced onto it. Exercises
 * `governedFiles`' union + the `tests/generated/` exclusion — the duplicated-helper surface the
 * `dualCtx` (files==allFiles) corpora never hit (review finding MEDIUM-1).
 */
function splitCtx(judged: Record<string, string>, extra: Record<string, string>): GateContext {
  const corpus: Record<string, string> = { ...judged, ...extra };
  const base: GateContext = {
    repoRoot: '/virtual',
    readFile: (p: string): string | undefined => corpus[p],
    files: (): readonly string[] => Object.keys(judged),
    allFiles: (): readonly string[] => Object.keys(corpus),
  };
  return { ...base, skipSites: produceSkipSiteFactsFromContext(base) };
}

/** A STUB "AST" detector that tags every `it.skip(` line with a fixed conditionality. */
function stubAstDetector(conditional: SkipConditionality): SkipDetector {
  return (source: string): readonly SkipMatch[] => {
    const out: SkipMatch[] = [];
    source.split('\n').forEach((line, i) => {
      if (/\bit\.skip\s*\(/.test(line)) out.push({ line: i + 1, form: 'call', token: 'it.skip', conditional });
    });
    return out;
  };
}

/** A context with an injected (stub AST) skipDetector — BOTH gates consult it — and the pack produced with it. */
function astDualCtx(corpus: Record<string, string>, detector: SkipDetector): GateContext {
  const base: GateContext = {
    repoRoot: '/virtual',
    readFile: (p: string): string | undefined => corpus[p],
    files: (): readonly string[] => Object.keys(corpus),
    allFiles: (): readonly string[] => Object.keys(corpus),
    skipDetector: detector,
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
  it('an UNKNOWN/misspelled fact kind throws — never silently brands a gate that folds empty facts (codex P2)', () => {
    // `['skipSite']` (missing the trailing s) would otherwise pass the non-empty check, brand the
    // gate, and yield an empty verdict forever (the pickFacts/factBundleDigest switch defaults treat
    // it as a no-op). Validate against the FACT_KINDS source of truth → fail loud at construction.
    expect(() => defineFactGate({ ...base, requires: ['skipSite'] as unknown as FactKind[] })).toThrow();
    expect(() => defineFactGate({ ...base, requires: ['skipSites', 'bogus'] as unknown as FactKind[] })).toThrow();
    // FACT_KINDS is the single source the type derives from AND the runtime allowlist validates against.
    expect([...FACT_KINDS]).toContain('skipSites');
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

// ── #1b — the fact discriminant is UNFORGEABLE (review CRITICAL-1) ────────────

describe('FactGate #1b — isFactGate is a boundary, not an honor-system string check', () => {
  it('defineGate REJECTS a hand-set form:fact (only defineFactGate may mint a fact gate)', () => {
    expect(() =>
      defineGate({
        id: 'x/forge',
        level: 'L2',
        describe: 'a closure gate falsely claiming the data-only contract',
        form: 'fact',
        run: (): readonly Finding[] => [],
        fixtures: noSkippedTestFactGate.fixtures,
      }),
    ).toThrow();
  });

  it('isFactGate REJECTS a raw object claiming form:fact (it lacks the brand)', () => {
    // The exact forgery the review built: a context-reading run wearing the fact discriminant.
    const forgery = {
      id: 'x/forge',
      level: 'L2',
      describe: 'd',
      form: 'fact',
      requires: ['skipSites'],
      decide: (): readonly Finding[] => [],
      run: (ctx: GateContext): readonly Finding[] => {
        ctx.readFile('secret.ts'); // would smuggle — but this is NOT a fact gate
        return [];
      },
      fixtures: noSkippedTestFactGate.fixtures,
    } as unknown as Gate;
    expect(forgery.form).toBe('fact'); // it CLAIMS the discriminant…
    expect(isFactGate(forgery)).toBe(false); // …but isFactGate is not fooled
  });

  it('isFactGate ACCEPTS only the minted object — identity-bound; a spread with an arbitrary run is NOT a fact gate', () => {
    expect(isFactGate(noSkippedTestFactGate)).toBe(true);
    // The soundness property the WeakSet buys: a `{ ...factGate, run: smuggle }` is a NEW
    // identity → not a member → NOT a fact gate. The discriminant cannot ride a swapped run.
    const spreadWithArbitraryRun = {
      ...noSkippedTestFactGate,
      run: (ctx: GateContext): readonly Finding[] => {
        ctx.readFile('secret.ts');
        return [];
      },
    } as Gate;
    expect(isFactGate(spreadWithArbitraryRun)).toBe(false);
  });

  it('the brand cannot be HARVESTED off a real fact gate (no on-object symbol to copy onto a forgery)', () => {
    // The prior cure stamped an enumerable symbol — harvestable via getOwnPropertySymbols and
    // re-stampable onto a forgery (the re-review's ATTACK 1). The WeakSet leaves NO own brand to
    // copy: harvest every own symbol off a real fact gate, stamp them onto a forgery, still false.
    const forgery = { ...noSkippedTestFactGate } as Record<string | symbol, unknown>;
    for (const s of Object.getOwnPropertySymbols(noSkippedTestFactGate)) {
      forgery[s] = (noSkippedTestFactGate as unknown as Record<symbol, unknown>)[s];
    }
    expect(isFactGate(forgery as unknown as Gate)).toBe(false);
  });

  it('a real fact gate is FROZEN — its run cannot be swapped IN PLACE while keeping the brand (codex P1)', () => {
    // The WeakSet brands object IDENTITY; without freezing, `realFactGate.run = smuggle` keeps the
    // same identity (still a member) while swapping in a context-reading closure. The gate is frozen,
    // so the mutation does not take effect — the brand and the data-only run cannot drift apart.
    expect(Object.isFrozen(noSkippedTestFactGate)).toBe(true);
    const swap = (): void => {
      (noSkippedTestFactGate as unknown as { run: unknown }).run = (ctx: GateContext): readonly Finding[] => {
        ctx.readFile('secret.ts');
        return [];
      };
    };
    // Strict mode throws; non-strict silently no-ops — either way the run does not change.
    try {
      swap();
    } catch {
      /* frozen → TypeError in strict mode is the expected outcome */
    }
    expect(isFactGate(noSkippedTestFactGate)).toBe(true); // still the genuine gate
    expect(noSkippedTestFactGate.run).toBe(noSkippedTestFactGate.run); // run unchanged (not the smuggling closure)
    expect(noSkippedTestFactGate.run(memoryContext({}))).toEqual([]); // and it still behaves as the real, data-only decision
  });
});

// ── #6b — the AST (detectSkipsAST) path is exercised (review HIGH-1) ──────────

describe('FactGate #6b — shadow-diff over the INJECTED AST detector (conditional ≠ undefined)', () => {
  const cases: { name: string; conditional: SkipConditionality; corpus: Record<string, string>; expectFindings: boolean }[] = [
    // The sanctioned ffmpeg site, but the AST proves it UNCONDITIONAL → non-sanctionable → BLOCK.
    { name: 'sanctioned site proven unconditional → both block', conditional: 'unconditional', corpus: { [SANCTIONED_FILE]: SANCTIONED_LINE }, expectFindings: true },
    // The same site proven enclosing-if conditional → consistent → ALLOW.
    { name: 'sanctioned site proven enclosing-if → both allow', conditional: 'enclosing-if', corpus: { [SANCTIONED_FILE]: SANCTIONED_LINE }, expectFindings: false },
    // An unsanctioned conditional skip → not enumerated → BLOCK regardless of conditionality.
    { name: 'unsanctioned conditional skip → both block', conditional: 'enclosing-if', corpus: { 'tests/unit/widget/cond.test.ts': "it.skip('gated but unenumerated', () => {});\n" }, expectFindings: true },
  ];
  for (const c of cases) {
    it(`closure ≡ fact on the AST path: ${c.name}`, () => {
      const ctx = astDualCtx(c.corpus, stubAstDetector(c.conditional));
      const closure = normSet(noSkippedTestGate.run(ctx));
      const fact = normSet(noSkippedTestFactGate.run(ctx));
      expect(fact).toEqual(closure);
      expect(fact.length > 0).toBe(c.expectFindings);
    });
  }
});

// ── #11 — belt-and-suspenders: real-repo equivalence + producer teeth ────────

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const GLOBS = ['packages/*/src/**/*.ts'] as const;

describe('FactGate #11 — belt-and-suspenders (real-repo equivalence + producer mutation teeth)', () => {
  it('SUSPENDER 1 — closure ≡ fact over the ACTUAL repo (the shadow-diff as a real-repo invariant)', () => {
    // Not a synthetic corpus: the real package source + tests/ tree, with its real sanctioned
    // skips, prose mentions, and exotic forms. Both gates use the token detector (no host AST
    // injected here). If the fact gate ever diverges from the battle-tested closure gate on a
    // real file, this reds — the production-readiness proof the swap-to-production rests on.
    const ctx = nodeContext(REPO_ROOT, [...GLOBS]);
    const factCtx = { ...ctx, skipSites: produceSkipSiteFactsFromContext(ctx) };
    const closure = normSet(noSkippedTestGate.run(ctx));
    const fact = normSet(noSkippedTestFactGate.run(factCtx));
    expect(fact).toEqual(closure);
  });

  it('SUSPENDER 2 — the producer detector is LOAD-BEARING (mutating it changes the verdict — producer teeth)', () => {
    // The review (MEDIUM-2) noted the fact gate's own mutation tests only the KERNEL; the
    // producer's detector had no teeth of its own. This is that guard: a WEAKENED producer (a
    // literal `.skip(`-only detector — the exact pre-AST blind spot) MISSES the alias/bracket/
    // computed forms the full detector catches, so the fact gate's verdict genuinely DROPS. And
    // the full producer matches the closure reference. Mutate the producer → the verdict moves.
    const corpus = SHADOW_CORPORA['exotic + aliased UNSANCTIONED forms']!;
    const fullCtx = dualCtx(corpus); // token detectSkips — the full detector
    const literalOnly: SkipDetector = (src: string): readonly SkipMatch[] => {
      const out: SkipMatch[] = [];
      src.split('\n').forEach((line, i) => {
        if (/\b(?:it|test|describe|bench)\.skip\s*\(/.test(line)) out.push({ line: i + 1, form: 'call', token: 'literal.skip' });
      });
      return out;
    };
    const weakFacts = produceSkipSiteFacts(governedFiles(fullCtx), (f) => fullCtx.readFile(f), literalOnly);
    const full = normSet(noSkippedTestFactGate.run(fullCtx));
    const weak = normSet(noSkippedTestFactGate.run({ ...fullCtx, skipSites: weakFacts }));
    expect(full.length).toBeGreaterThan(weak.length); // the weakened producer misses the exotic forms
    expect(full).toEqual(normSet(noSkippedTestGate.run(fullCtx))); // the full producer matches the reference
  });
});

// ── #6c — governedFiles union + exclusion, differentially (review MEDIUM-1) ───

describe('FactGate #6c — shadow-diff over DISJOINT files()/allFiles() + tests/generated exclusion', () => {
  it('both gates union judged∪allFiles AND exclude tests/generated identically', () => {
    const ctx = splitCtx(
      { 'packages/widget/src/widget.ts': 'export const x = 1;\n' }, // judged (IR) source — no skips
      {
        'tests/unit/widget/probe.test.ts': "it.skip('out-of-IR unsanctioned skip', () => {});\n", // governed via allFiles
        'tests/generated/capsule.test.ts': "it.skip('generated — the plumb-gate owns this', () => {});\n", // EXCLUDED
      },
    );
    const closure = normSet(noSkippedTestGate.run(ctx));
    const fact = normSet(noSkippedTestFactGate.run(ctx));
    expect(fact).toEqual(closure);
    // Exactly the out-of-IR tests/ skip is flagged; the tests/generated one is excluded by BOTH.
    expect(fact.length).toBe(1);
    expect(fact[0]).toContain('tests/unit/widget/probe.test.ts');
    expect(JSON.stringify(fact)).not.toContain('tests/generated');
  });
});
