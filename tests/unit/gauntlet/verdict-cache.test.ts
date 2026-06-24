/**
 * The content-addressed verdict cache (Slice B, B2) — where SOUNDNESS is won.
 *
 * A cache that serves a STALE verdict (a cached "green" when the covered code has
 * changed and is now red) is a LIE — it would let a real defect ship. These tests
 * PROVE the cache never lies: it HITS only when EVERYTHING that affects a gate's
 * raw output is identical, and MISSES (re-runs) on ANY change — a covered file's
 * content (the files under test), the toolchain digest (the gate logic itself), or
 * the absence of an IR to content-key against. The two MISS proofs (content +
 * toolchain) and the property that the cached run == the fresh run are the
 * anti-lie core.
 *
 * Every input is deterministic (literal IRs, fixed fast-check seeds, an injected
 * `now`); nothing reads the wall clock or the filesystem (the fs host is proven
 * separately in the CLI tests).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  defineGate,
  finding,
  makeRepoIR,
  memoryContext,
  runGates,
  gateVerdictKey,
  coverageDigestOf,
  MISSING_DIGEST_SENTINEL,
  type Fact,
  type FileId,
  type FileNode,
  type Finding,
  type Gate,
  type GateContext,
  type GateVerdictCache,
  type RepoIR,
  type Waiver,
} from '@czap/gauntlet';

// ── test scaffolding ─────────────────────────────────────────────────────────

/** An in-memory verdict store + a hit/write counter, the test-double for the cache. */
function makeMemoryCache(): GateVerdictCache & {
  readonly store: Map<string, readonly Finding[]>;
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

/** A FileNode with an explicit content digest (the host-minted blake3 stand-in). */
function fileNode(id: FileId, contentDigest: string): FileNode {
  return { id, contentDigest, packageName: null };
}

/**
 * Build a minimal IR over `files` (id → contentDigest) carrying one `marked` fact
 * per file id present in `markedFiles`. A gate folds over the facts to emit one
 * finding per marked file — so a gate's verdict genuinely depends on file content.
 */
function makeIR(files: Record<FileId, string>, markedFiles: readonly FileId[] = []): RepoIR {
  const facts: Fact[] = markedFiles.map((file) => ({
    file,
    property: 'marked',
    value: true,
    oracleId: 'test-oracle',
    coverageClass: 'file-proxy-only',
  }));
  return makeRepoIR({
    files: Object.entries(files).map(([id, digest]) => fileNode(id, digest)),
    facts,
  });
}

/** A context carrying an injected IR (the host shape the cache path needs). */
function ctxWithIR(ir: RepoIR): GateContext {
  const base = memoryContext(Object.fromEntries([...ir.files.keys()].map((id) => [id, ''])));
  return { ...base, ir };
}

/**
 * IRs registered as "the run under test" — the counting gate increments its `runs`
 * spy ONLY for these, so `verifyGate`'s fixture runs (the gate's OWN red/green
 * fixtures, run every `runGates` call by the authority ratchet) never inflate the
 * counter. This isolates the spy to the expensive real-context `gate.run`.
 */
const REAL_RUN_IRS = new WeakSet<RepoIR>();
/** A context over `ir`, registering it so the counting gate counts this run. */
function realCtx(ir: RepoIR): GateContext {
  REAL_RUN_IRS.add(ir);
  return ctxWithIR(ir);
}

/**
 * A counting gate: emits one `error` finding per `marked` fact, and increments a
 * `runs` counter every time `gate.run` executes (the spy that proves a HIT skips
 * the expensive run). `coverage` narrows to exactly the marked files (the OPT-IN
 * narrowing) when `narrow` is set, else the default-to-all floor applies.
 */
function makeCountingGate(opts: { id?: string; narrow?: boolean } = {}): Gate & { runs: number } {
  const id = opts.id ?? 'test/counting';
  const self = {
    runs: 0,
    ...defineGate({
      id,
      level: 'L2',
      describe: 'emits one finding per marked file (a real content-dependent verdict)',
      run: (c: GateContext): readonly Finding[] => {
        const ir = c.ir;
        // Count ONLY the real run under test, never the fixture-verification runs
        // (verifyGate runs the gate over its red/green fixtures every call).
        if (ir === undefined || REAL_RUN_IRS.has(ir)) self.runs += 1;
        if (ir === undefined) return [];
        return ir.facts
          .filter((f) => f.property === 'marked')
          .map((f) =>
            finding({
              ruleId: id,
              severity: 'error',
              level: 'L2',
              title: `marked: ${f.file}`,
              detail: `file ${f.file} is marked`,
              location: { file: f.file },
            }),
          );
      },
      // OPT-IN narrowing: cover only the marked files. SOUND here because the gate
      // genuinely folds only over marked-file facts.
      ...(opts.narrow === true
        ? {
            coverage: (ir: RepoIR): readonly FileId[] =>
              ir.facts.filter((f) => f.property === 'marked').map((f) => f.file),
          }
        : {}),
      fixtures: {
        red: { name: 'red', context: ctxWithIR(makeIR({ 'r.ts': 'dr' }, ['r.ts'])) },
        green: { name: 'green', context: ctxWithIR(makeIR({ 'g.ts': 'dg' }, [])) },
        mutation: { describe: 'invert', mutate: (g: Gate): Gate => ({ ...g, run: () => [] }) },
      },
    }),
  };
  return self;
}

const TC_A = 'tc-sha256:aaaa';
const TC_B = 'tc-sha256:bbbb';
const ENV = { node: 'v22.0.0', platform: 'linux', arch: 'x64', pm: '' } as const;

// ── HIT: same IR + same toolchain serves the cache, skips gate.run ───────────

describe('verdict cache — HIT', () => {
  it('a second run with the same IR + toolchain serves the cache and does NOT re-invoke gate.run', () => {
    const ir = makeIR({ 'packages/a/src/x.ts': 'digA', 'packages/a/src/y.ts': 'digB' }, ['packages/a/src/x.ts']);
    const ctx = realCtx(ir);
    const gate = makeCountingGate();
    const cache = makeMemoryCache();

    const r1 = runGates([gate], ctx, { cache, toolchainDigest: TC_A, env: ENV });
    expect(gate.runs).toBe(1); // first run: a MISS → gate.run executed
    expect(cache.writes).toBe(1);

    const r2 = runGates([gate], ctx, { cache, toolchainDigest: TC_A, env: ENV });
    expect(gate.runs).toBe(1); // STILL 1 — the second run HIT, skipping gate.run
    expect(cache.hits).toBe(1);

    // The cached verdict is IDENTICAL to the fresh one (a pure speedup).
    expect(r2.findings).toEqual(r1.findings);
    expect(r2.findings.length).toBe(1);
  });
});

// ── MISS on content change (the cached-projection invalidation law) ──────────

describe('verdict cache — MISS on covered-content change', () => {
  it('flipping one covered file digest yields a new key → gate.run re-invoked', () => {
    const before = makeIR({ 'packages/a/src/x.ts': 'digA', 'packages/a/src/y.ts': 'digB' }, ['packages/a/src/x.ts']);
    const gate = makeCountingGate();
    const cache = makeMemoryCache();

    runGates([gate], realCtx(before), { cache, toolchainDigest: TC_A, env: ENV });
    expect(gate.runs).toBe(1);

    // Flip the COVERED file's content digest — a genuinely different file.
    const after = makeIR({ 'packages/a/src/x.ts': 'digA-CHANGED', 'packages/a/src/y.ts': 'digB' }, [
      'packages/a/src/x.ts',
    ]);
    runGates([gate], realCtx(after), { cache, toolchainDigest: TC_A, env: ENV });
    expect(gate.runs).toBe(2); // changed covered content → MISS → re-run (no stale serve)
  });

  it('with default-to-all coverage, changing an UNDECLARED file still MISSES (the safe floor)', () => {
    // The gate marks only x.ts but does NOT declare coverage → covers ALL files.
    const before = makeIR({ 'packages/a/src/x.ts': 'digA', 'packages/a/src/y.ts': 'digB' }, ['packages/a/src/x.ts']);
    const gate = makeCountingGate(); // no narrowing → default-to-all
    const cache = makeMemoryCache();

    runGates([gate], realCtx(before), { cache, toolchainDigest: TC_A, env: ENV });
    expect(gate.runs).toBe(1);

    // Change y.ts — a file the gate does NOT emit findings about. The default-to-all
    // floor still invalidates: ANY repo byte change re-runs. This is the soundness
    // floor — a too-narrow coverage would (wrongly) HIT here.
    const after = makeIR({ 'packages/a/src/x.ts': 'digA', 'packages/a/src/y.ts': 'digB-CHANGED' }, [
      'packages/a/src/x.ts',
    ]);
    runGates([gate], realCtx(after), { cache, toolchainDigest: TC_A, env: ENV });
    expect(gate.runs).toBe(2); // default-to-all → unrelated change still MISSES
  });
});

// ── MISS on toolchain change (THE ANTI-LIE TEST) ─────────────────────────────

describe('verdict cache — MISS on toolchain change (the anti-lie keystone)', () => {
  it('the SAME IR with a DIFFERENT toolchain digest MISSES → re-run (a gate-logic edit is never served stale)', () => {
    const ir = makeIR({ 'packages/a/src/x.ts': 'digA' }, ['packages/a/src/x.ts']);
    const ctx = realCtx(ir);
    const gate = makeCountingGate();
    const cache = makeMemoryCache();

    runGates([gate], ctx, { cache, toolchainDigest: TC_A, env: ENV });
    expect(gate.runs).toBe(1);

    // Simulate a gate-LOGIC edit: same files, same content, DIFFERENT toolchain
    // digest (the rebuilt-dist case). The cache MUST miss — serving the old verdict
    // here would be the exact lie (a code change to the gate served stale).
    runGates([gate], ctx, { cache, toolchainDigest: TC_B, env: ENV });
    expect(gate.runs).toBe(2); // toolchain changed → MISS → re-run
  });
});

// ── SOUNDNESS RAIL: no IR ⇒ unconditional MISS (cannot content-key) ──────────

describe('verdict cache — no-IR soundness rail', () => {
  it('a gate running with NO injected IR MISSES every run (you cannot cache what you cannot content-address)', () => {
    const gate = makeCountingGate();
    const cache = makeMemoryCache();
    // memoryContext leaves `ir` undefined — the text-only-gate-with-no-IR case.
    const ctx = memoryContext({ 'a.ts': '' });

    runGates([gate], ctx, { cache, toolchainDigest: TC_A, env: ENV });
    runGates([gate], ctx, { cache, toolchainDigest: TC_A, env: ENV });
    expect(gate.runs).toBe(2); // both runs executed — never served from cache
    expect(cache.writes).toBe(0); // and nothing was written (no sound key exists)
  });
});

// ── CORRECTNESS (the no-lie core, property-based) ────────────────────────────

describe('verdict cache — correctness property (the cache never changes the verdict)', () => {
  it('for any IR + gate, a cached run produces EXACTLY the same final findings as a fresh run', () => {
    fc.assert(
      fc.property(
        // A random set of files (id → digest) + a random marked subset.
        fc.uniqueArray(fc.stringMatching(/^pkg\/[a-z]{1,6}\.ts$/), { minLength: 1, maxLength: 6 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }),
        fc.boolean(),
        (ids, markFlags, narrow) => {
          const files = Object.fromEntries(ids.map((id, i) => [id, `dig-${i}`]));
          const marked = ids.filter((_, i) => markFlags[i % markFlags.length] === true);
          const ir = makeIR(files, marked);
          const ctx = realCtx(ir);

          // Fresh (cache-less) run.
          const fresh = runGates([makeCountingGate({ narrow })], ctx);
          // Cached run (cold cache → fills, then identical re-read on a 2nd run).
          const cache = makeMemoryCache();
          const cached1 = runGates([makeCountingGate({ narrow })], ctx, {
            cache,
            toolchainDigest: TC_A,
            env: ENV,
          });
          const cached2 = runGates([makeCountingGate({ narrow })], ctx, {
            cache,
            toolchainDigest: TC_A,
            env: ENV,
          });

          // The verdict is IDENTICAL across fresh, cold-cache, and warm-cache runs.
          expect(cached1.findings).toEqual(fresh.findings);
          expect(cached2.findings).toEqual(fresh.findings);
          expect(cached1.blocked).toBe(fresh.blocked);
        },
      ),
      { numRuns: 200, seed: 0x5eed },
    );
  });
});

// ── WAIVER / AUTHORITY are re-applied every run, NEVER cached ─────────────────

describe('verdict cache — waiver/authority not cached (re-applied on the cached RAW findings)', () => {
  it('a waiver that expires between run 1 and run 2 takes effect on the CACHED raw findings', () => {
    const ir = makeIR({ 'packages/a/src/x.ts': 'digA' }, ['packages/a/src/x.ts']);
    const ctx = realCtx(ir);
    const gate = makeCountingGate();
    const cache = makeMemoryCache();

    // A waiver suppressing the gate's finding, expiring 2027-01-01.
    const waiver: Waiver = {
      ruleId: gate.id,
      file: 'packages/a/src/x.ts',
      owner: 'tester',
      reason: 'declared-benign for the test',
      expires: '2027-01-01',
      blastRadius: 'none (test)',
      debtScore: 1,
    };

    // Run 1, BEFORE expiry: the raw finding is cached; the active waiver suppresses
    // it → kept is empty, the run does not block.
    const r1 = runGates([gate], ctx, {
      cache,
      toolchainDigest: TC_A,
      env: ENV,
      waivers: [waiver],
      now: new Date('2026-06-01'),
    });
    expect(gate.runs).toBe(1);
    expect(r1.findings.filter((f) => f.ruleId === gate.id).length).toBe(0); // waived
    expect(r1.blocked).toBe(false);

    // Run 2, AFTER expiry: gate.run is SKIPPED (cache HIT on identical content +
    // toolchain), but the waiver now EXPIRES → the raw finding re-reds AND a
    // blocking waiver-expired error is added. Authority + waivers re-applied on the
    // cached raw findings; they were never themselves cached.
    const r2 = runGates([gate], ctx, {
      cache,
      toolchainDigest: TC_A,
      env: ENV,
      waivers: [waiver],
      now: new Date('2028-01-01'),
    });
    expect(gate.runs).toBe(1); // gate.run was NOT re-invoked (a HIT)
    expect(cache.hits).toBe(1);
    expect(r2.findings.some((f) => f.ruleId === 'gauntlet/waiver-expired')).toBe(true);
    expect(r2.blocked).toBe(true); // the expired waiver blocks — re-applied, not cached
  });
});

// ── BACK-COMPAT: no cache ⇒ identical behaviour to today (full run) ──────────

describe('verdict cache — back-compat (no cache ⇒ a full run, unchanged)', () => {
  it('runGates with NO cache runs every gate and equals the result of a cache-less run', () => {
    const ir = makeIR({ 'packages/a/src/x.ts': 'digA' }, ['packages/a/src/x.ts']);
    const ctx = realCtx(ir);
    const gate = makeCountingGate();

    const a = runGates([gate], ctx); // no opts at all
    expect(gate.runs).toBe(1);
    const b = runGates([gate], ctx); // again — runs again (no caching)
    expect(gate.runs).toBe(2);
    expect(b.findings).toEqual(a.findings);
  });

  it('a cache WITHOUT a toolchain digest is treated as no cache (the arm-only-with-both rail)', () => {
    const ir = makeIR({ 'packages/a/src/x.ts': 'digA' }, ['packages/a/src/x.ts']);
    const ctx = realCtx(ir);
    const gate = makeCountingGate();
    const cache = makeMemoryCache();

    // Cache present but NO toolchainDigest → the engine must NOT arm the cache
    // (without the digest a gate-logic change could not invalidate — unsound).
    runGates([gate], ctx, { cache });
    runGates([gate], ctx, { cache });
    expect(gate.runs).toBe(2); // ran both times — cache never consulted
    expect(cache.writes).toBe(0);
  });
});

// ── gateVerdictKey + coverageDigestOf determinism + soundness ────────────────

describe('gateVerdictKey — determinism + sensitivity', () => {
  const parts = { toolchainDigest: TC_A, gateId: 'g', coverageDigest: 'cov', env: ENV } as const;

  it('is stable across runs for identical inputs', () => {
    expect(gateVerdictKey(parts)).toBe(gateVerdictKey(parts));
  });

  it('is insensitive to env key ORDER (canonicalized) but sensitive to env VALUES', () => {
    const reordered = { ...parts, env: { pm: '', arch: 'x64', platform: 'linux', node: 'v22.0.0' } };
    expect(gateVerdictKey(reordered)).toBe(gateVerdictKey(parts));
    const diffEnv = { ...parts, env: { ...ENV, node: 'v20.0.0' } };
    expect(gateVerdictKey(diffEnv)).not.toBe(gateVerdictKey(parts));
  });

  it('flips when ANY of toolchain / gateId / coverageDigest / evidenceDigest changes', () => {
    expect(gateVerdictKey({ ...parts, toolchainDigest: TC_B })).not.toBe(gateVerdictKey(parts));
    expect(gateVerdictKey({ ...parts, gateId: 'g2' })).not.toBe(gateVerdictKey(parts));
    expect(gateVerdictKey({ ...parts, coverageDigest: 'cov2' })).not.toBe(gateVerdictKey(parts));
    // The out-of-IR evidence digest is a key segment: two different evidence folds key
    // apart (the soundness keystone for out-of-IR-reading gates).
    expect(gateVerdictKey({ ...parts, evidenceDigest: 'ev:a' })).not.toBe(
      gateVerdictKey({ ...parts, evidenceDigest: 'ev:b' }),
    );
  });

  it('an OMITTED evidenceDigest keys IDENTICALLY to before the fix (pure-IR gate back-compat)', () => {
    // A pure-IR gate supplies no evidence digest; the key must be byte-identical to the
    // historical 4-segment key so its existing cache entries still hit. (We assert the
    // omitted case equals itself and differs from any REAL evidence fold — a real fold
    // carries the `ev:` scheme and can never alias the inert no-evidence marker.)
    expect(gateVerdictKey(parts)).toBe(gateVerdictKey({ ...parts, evidenceDigest: undefined }));
    expect(gateVerdictKey(parts)).not.toBe(gateVerdictKey({ ...parts, evidenceDigest: 'ev:something' }));
  });
});

describe('coverageDigestOf — order-independent + content-sensitive', () => {
  const ir = makeIR({ 'b.ts': 'digB', 'a.ts': 'digA' });

  it('is independent of the covered-files argument order and of duplicates', () => {
    expect(coverageDigestOf(['a.ts', 'b.ts'], ir)).toBe(coverageDigestOf(['b.ts', 'a.ts'], ir));
    expect(coverageDigestOf(['a.ts', 'a.ts', 'b.ts'], ir)).toBe(coverageDigestOf(['a.ts', 'b.ts'], ir));
  });

  it('changes when a covered file content digest changes', () => {
    const ir2 = makeIR({ 'a.ts': 'digA-X', 'b.ts': 'digB' });
    expect(coverageDigestOf(['a.ts'], ir2)).not.toBe(coverageDigestOf(['a.ts'], ir));
  });

  it('folds the inert MISSING sentinel for a covered file absent from the IR (never a real digest)', () => {
    const digest = coverageDigestOf(['ghost.ts'], ir);
    expect(digest).toContain(MISSING_DIGEST_SENTINEL);
    // An absent file and a present file with that literal as its digest must not
    // collide structurally — the sentinel marks "absent", not a content address.
    expect(digest).not.toBe(coverageDigestOf([], ir));
  });

  it('with no IR at all, every covered file folds to the absent sentinel', () => {
    expect(coverageDigestOf(['a.ts'], undefined)).toContain(MISSING_DIGEST_SENTINEL);
  });
});
