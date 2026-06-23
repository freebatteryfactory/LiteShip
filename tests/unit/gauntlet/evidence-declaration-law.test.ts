/**
 * THE EVIDENCE-DECLARATION LAW (Slice B, B2 — the verdict-cache drill sergeant).
 *
 * `Gate.evidenceDigest` is the cache's out-of-IR soundness keystone, but before this
 * law its "a gate that reads out-of-IR / fact evidence MUST fold it" was unenforced
 * CONVENTION — `defineGate` only checks fixtures, so a future gate could silently read
 * `allFiles()` / an out-of-IR `readFile` / an injected fact and cache under the
 * no-evidence marker, serving a STALE verdict when that evidence changed (the second
 * P1 finding).
 *
 * This META-TEST makes the convention a CHECKED PROPERTY. For EVERY built-in gate
 * (LITESHIP_GATES ∪ LITESHIP_IR_GATES) it:
 *   1. Runs the gate under an INSTRUMENTED context ({@link recordingContext}) over the
 *      gate's own green-fixture world, capturing the SET of evidence channels the
 *      gate's `run` actually read.
 *   2. Partitions the reads into TOOLCHAIN-COVERED (`ir.facts` / `ir.refs`, whose
 *      values are host-oracle-computed and folded by the EXTENDED toolchain digest —
 *      the cli/audit oracle dist, P1 #1) and EVIDENCE-REQUIRED (everything else:
 *      `allFiles`, an out-of-IR `readFile`, every injected-fact channel).
 *   3. ASSERTS, for each EVIDENCE-REQUIRED read, that the gate's `evidenceDigest`
 *      COVERS it — proven by PERTURBATION: changing exactly that evidence MUST flip
 *      `gate.evidenceDigest(context)`. A gate that reads evidence its digest does not
 *      fold FAILS the law (the stale-cache hole, caught structurally).
 *
 * The teeth (P1 #2): a deliberately-NON-CONFORMING throwaway gate that reads
 * `allFiles()` but declares NO `evidenceDigest` is asserted to FAIL the law — RED if
 * the law did not exist (a cheater passes), green after (it is caught).
 *
 * Every input is deterministic — literal contexts, literal facts, no clock, no fs.
 */

import { describe, it, expect } from 'vitest';
import {
  LITESHIP_GATES,
  LITESHIP_IR_GATES,
  recordingContext,
  defineGate,
  finding,
  type EvidenceChannel,
  type Gate,
  type GateContext,
  type Finding,
} from '@czap/gauntlet';

// ── the law engine ───────────────────────────────────────────────────────────

/**
 * Channels covered by a digest OTHER than `evidenceDigest`, so reading them is NOT an
 * `evidenceDigest` obligation:
 *  - `ir.facts` / `ir.refs` — host-oracle-computed IR values folded by the EXTENDED
 *    TOOLCHAIN digest (the cli/audit oracle dist, P1 #1).
 *  - `allFiles` — the DISCOVERY surface (enumerating the unscoped corpus). Reading the
 *    LIST is not a verdict dependency; the dependency is the out-of-IR FILE bodies the
 *    gate then reads (recorded as `readFile:<path>`), which the law DOES require folded.
 */
const NON_EVIDENCE_CHANNELS: ReadonlySet<string> = new Set<EvidenceChannel>(['ir.facts', 'ir.refs', 'allFiles']);

/**
 * The OUT-OF-IR roots — the trees the IR (built from `auditSourceGlobs`, package source
 * only) does NOT contain, so their bytes are NOT folded by the COVERAGE digest and MUST
 * be folded by `evidenceDigest`: the `tests/` confirmer corpus, the `benchmarks/`
 * registries, the `traceability/` ledger. (A `.bench.ts` under `tests/bench/` is caught
 * by the `tests/` root; a top-level bench root, if any, by `benchmarks/`.)
 */
const OUT_OF_IR_ROOTS: readonly string[] = ['tests/', 'benchmarks/', 'traceability/'];

/**
 * Is `path` OUT-OF-IR — a `readFile` of evidence the COVERAGE digest cannot see, so its
 * read is an `evidenceDigest` obligation? True iff the path is under a known out-of-IR
 * root. Everything ELSE (package source `packages/<name>/src/`, or a fixture's shorthand
 * source name like `bad.ts`) is the coverage-digest domain — in-IR, no obligation.
 *
 * This is the REAL-PATH classification, deliberately NOT a `context.files()` membership
 * test: a degenerate `memoryContext` fixture lumps its `tests/` files into `files()`
 * (there is no level-scoping to separate them), which would wrongly mark them coverage-
 * covered. On the real node context `files()` is package source only and the `tests/`
 * corpus is reached via `allFiles()`. Classifying by the out-of-IR ROOT matches reality
 * in both worlds — so stripping a gate's `evidenceDigest` (the cheater) is caught even
 * when its fixture is an undifferentiated memory map.
 */
function isOutOfIr(path: string): boolean {
  return OUT_OF_IR_ROOTS.some((root) => path.startsWith(root));
}

/** A recorded `readFile:<path>` read → its path; otherwise undefined. */
function readFilePath(read: string): string | undefined {
  return read.startsWith('readFile:') ? read.slice('readFile:'.length) : undefined;
}

/** Run `gate.run` under the recorder over `ctx`, returning the recorded read-set. */
function readsOf(gate: Gate, ctx: GateContext): ReadonlySet<string> {
  const rec = recordingContext(ctx);
  // The green/red fixture is the gate's OWN known-good/known-bad world, so run is
  // well-defined here.
  gate.run(rec.context);
  return rec.reads();
}

/**
 * Does perturbing the evidence flip the gate's `evidenceDigest`? The proof a declared
 * digest actually FOLDS that evidence. The law passes iff the digest over the perturbed
 * context differs from the digest over the base.
 */
function digestCovers(gate: Gate, base: GateContext, perturbed: GateContext): boolean {
  if (gate.evidenceDigest === undefined) return false;
  // Evaluate both, capturing a throw as a distinct outcome — a digest that THROWS on the
  // perturbed evidence but not the base (or vice versa) is still SENSITIVE to it (it
  // depends on the file), so that counts as "covered".
  const evalDigest = (ctx: GateContext): string => {
    try {
      return `ok:${gate.evidenceDigest?.(ctx) ?? '<undefined>'}`;
    } catch (err) {
      return `throw:${(err as Error).message}`;
    }
  };
  const a = evalDigest(base);
  const b = evalDigest(perturbed);
  // A gate with NO out-of-IR evidence returns the same `<undefined>` for both — that is
  // not "covering" a read it nonetheless performed; the law requires a CHANGE.
  return a !== b;
}

/**
 * Build a context that PERTURBS exactly ONE out-of-IR file `path` by TOGGLING its
 * existence/content: a PRESENT file becomes ABSENT (`readFile` → undefined, and it
 * drops out of `allFiles()`), an ABSENT file becomes PRESENT (a sentinel body). This is
 * the strongest, safest perturbation — it flips ANY digest that folds the file's CONTENT
 * OR merely TAGS its presence/absence (the perf-claim `present/absent` tag, the
 * confirmer content fold, the bench surface), and — unlike appending bytes — it never
 * breaks a JSON parser the digest runs and it can perturb an absent file too. Every
 * OTHER file passes through unchanged, so the law pinpoints the single undeclared file.
 */
function perturbFile(base: GateContext, path: string): GateContext {
  // Valid JSON AND valid TS — so a digest that parses the file (the perf-contracts
  // distributions registry) does not throw on the toggled-present sentinel.
  const SENTINEL = '{"__evidence_law_sentinel__": true}\n';
  const wasPresent = base.readFile(path) !== undefined;
  const clone = cloneContext(base);
  return {
    ...clone,
    readFile: (p: string): string | undefined => {
      if (p !== path) return base.readFile(p);
      return wasPresent ? undefined : SENTINEL; // toggle present ↔ absent
    },
    files: (): readonly string[] =>
      wasPresent ? base.files().filter((f) => f !== path) : [...base.files(), path],
    allFiles: (): readonly string[] => {
      const all = base.allFiles !== undefined ? base.allFiles() : base.files();
      return wasPresent ? all.filter((f) => f !== path) : [...all, path];
    },
  };
}

/** A perturbation of one injected-fact channel — replace its value with a salted clone. */
function perturbFact(base: GateContext, channel: EvidenceChannel): GateContext {
  const value = (base as Record<string, unknown>)[channel];
  // Salt the fact: wrap it so stableSerialize sees a structurally-different value. The
  // gate's evidenceDigest folds the fact via stableSerialize, so ANY structural change
  // flips the digest. We append a discriminating marker key the original lacked.
  const salted =
    value !== null && typeof value === 'object'
      ? { ...(value as Record<string, unknown>), __evidence_law_salt__: 'perturbed' }
      : value;
  const clone = cloneContext(base);
  Object.defineProperty(clone, channel, { enumerable: true, configurable: true, value: salted });
  return clone;
}

/** A shallow structural clone of a context (so a perturbation does not mutate the base). */
function cloneContext(base: GateContext): GateContext {
  const out: GateContext = {
    repoRoot: base.repoRoot,
    readFile: base.readFile,
    files: base.files,
    ...(base.allFiles !== undefined ? { allFiles: base.allFiles } : {}),
    ...(base.ir !== undefined ? { ir: base.ir } : {}),
  };
  for (const ch of FACT_CHANNELS) {
    const v = (base as Record<string, unknown>)[ch];
    if (v !== undefined) Object.defineProperty(out, ch, { enumerable: true, configurable: true, value: v });
  }
  return out;
}

const FACT_CHANNELS: readonly EvidenceChannel[] = [
  'supplyChain',
  'mutation',
  'mcdc',
  'simulation',
  'traceability',
  'standards',
  'declaredFix',
  'taint',
  'fuzzCorpus',
  'proof',
  'composition',
];

/** True iff `read` names an injected-fact channel (vs a file read or an ir.* read). */
function isFactChannel(read: string): read is EvidenceChannel {
  return (FACT_CHANNELS as readonly string[]).includes(read);
}

/**
 * The LAW VERDICT for one gate over one of its fixture worlds: every EVIDENCE-REQUIRED
 * read the gate's `run` performed must be COVERED by its `evidenceDigest`. Returns the
 * list of UNDECLARED reads (empty ⇒ the gate conforms).
 *
 * Exempt (covered by a digest OTHER than evidenceDigest, so not an obligation):
 *  - `ir.facts` / `ir.refs` — the extended TOOLCHAIN digest (cli/audit oracle dist).
 *  - `allFiles` — discovery only; the obligation is the out-of-IR FILES it then reads.
 *  - `readFile:<package-source>` — the COVERAGE digest folds package source bytes.
 *
 * Required (MUST flip evidenceDigest when perturbed):
 *  - `readFile:<out-of-IR path>` — a tests/ confirmer, a benchmarks/*.json, a ledger…
 *  - an injected-fact channel — the fact content (external-artifact source bytes).
 */
function undeclaredReads(gate: Gate, ctx: GateContext): readonly string[] {
  const reads = readsOf(gate, ctx);
  const undeclared: string[] = [];
  for (const read of reads) {
    if (NON_EVIDENCE_CHANNELS.has(read)) continue;

    if (isFactChannel(read)) {
      if (!digestCovers(gate, ctx, perturbFact(ctx, read))) undeclared.push(read);
      continue;
    }

    const path = readFilePath(read);
    if (path !== undefined) {
      if (!isOutOfIr(path)) continue; // coverage-digest domain (package source), not an obligation
      if (!digestCovers(gate, ctx, perturbFile(ctx, path))) undeclared.push(read);
      continue;
    }

    // An unrecognized read shape — be conservative and require it folded.
    undeclared.push(read);
  }
  return undeclared;
}

// ── the law applied to every built-in gate ───────────────────────────────────

const ALL_GATES: readonly Gate[] = [...new Set([...LITESHIP_GATES, ...LITESHIP_IR_GATES])];

describe('THE EVIDENCE-DECLARATION LAW — no gate reads undeclared out-of-IR / fact evidence (P1 #2)', () => {
  for (const gate of ALL_GATES) {
    it(`${gate.id}: every out-of-IR / fact read its green fixture performs is folded by evidenceDigest`, () => {
      const undeclared = undeclaredReads(gate, gate.fixtures.green.context);
      expect(undeclared, `gate "${gate.id}" reads ${JSON.stringify(undeclared)} but its evidenceDigest does not fold them — a stale-cache hole`).toEqual([]);
    });

    it(`${gate.id}: the red fixture's reads are also folded (the divergent world keys soundly too)`, () => {
      const undeclared = undeclaredReads(gate, gate.fixtures.red.context);
      expect(undeclared, `gate "${gate.id}" (red world) reads ${JSON.stringify(undeclared)} unfolded`).toEqual([]);
    });
  }

  it('covers the WHOLE built-in set (LITESHIP_GATES ∪ LITESHIP_IR_GATES) — no gate escapes the law', () => {
    // Pin the membership so a newly-added gate is forced through the law (a gate added
    // to a set but not exercised here would be an enforcement gap).
    expect(ALL_GATES.length).toBeGreaterThanOrEqual(LITESHIP_IR_GATES.length);
    for (const g of [...LITESHIP_GATES, ...LITESHIP_IR_GATES]) {
      expect(ALL_GATES).toContain(g);
    }
  });
});

// ── the teeth (P1 #2): a non-conforming cheater MUST fail the law ─────────────

describe('THE LAW HAS TEETH — a gate that reads allFiles() but declares no evidenceDigest is CAUGHT', () => {
  /**
   * A throwaway CHEATER: it reads an OUT-OF-IR `tests/` confirmer body (via `allFiles()`
   * + `readFile`) but ships NO `evidenceDigest`. Under a coverage-digest-only key it
   * would serve a stale verdict when that confirmer corpus changed (its verdict depends
   * on the test body, but the key does not). The law MUST flag the undeclared read.
   */
  const cheaterGate: Gate = defineGate({
    id: 'gauntlet/__evidence_law_cheater__',
    level: 'L1',
    describe: 'A deliberately non-conforming gate (reads an out-of-IR tests/ body, declares no evidenceDigest) — a red fixture for the law.',
    run: (context: GateContext): readonly Finding[] => {
      // Read the unscoped corpus AND the body of every out-of-IR tests/ file — real
      // out-of-IR evidence the verdict depends on — but fold NO evidenceDigest.
      const corpus = context.allFiles !== undefined ? context.allFiles() : context.files();
      let total = 0;
      for (const p of corpus) {
        if (!p.startsWith('tests/')) continue;
        total += (context.readFile(p) ?? '').length; // the verdict depends on the body
      }
      return total > 999_999
        ? [finding({ ruleId: 'gauntlet/__evidence_law_cheater__', severity: 'advisory', level: 'L1', title: 'x', detail: 'x' })]
        : [];
    },
    // NO evidenceDigest — the violation.
    fixtures: {
      red: {
        name: 'a corpus the cheater reads',
        context: cheaterContext(),
      },
      green: {
        name: 'the same corpus (the cheater never flags)',
        context: cheaterContext(),
      },
      mutation: {
        describe: 'a mutant that ignores allFiles',
        mutate: (gate: Gate): Gate => ({ ...gate, run: (): readonly Finding[] => [] }),
      },
    },
  });

  function cheaterContext(): GateContext {
    const corpus = new Map<string, string>([
      ['packages/x/src/a.ts', 'export const a = 1;\n'],
      ['tests/unit/x/a.test.ts', "it('runs', () => {});\n"],
    ]);
    return {
      repoRoot: '/virtual',
      readFile: (p: string): string | undefined => corpus.get(p),
      files: (): readonly string[] => ['packages/x/src/a.ts'],
      allFiles: (): readonly string[] => [...corpus.keys()],
    };
  }

  it('FAILS the law: the cheater reads an out-of-IR tests/ body but folds no evidence (the stale-cache hole)', () => {
    const undeclared = undeclaredReads(cheaterGate, cheaterGate.fixtures.green.context);
    // RED-before (if the law did not exist, a cheater would pass): the law CATCHES it —
    // the undeclared out-of-IR confirmer read is surfaced.
    expect(undeclared).toContain('readFile:tests/unit/x/a.test.ts');
  });

  it('a CONFORMING twin (same run, but WITH an allFiles-folding evidenceDigest) PASSES the law', () => {
    // Prove the law is not a blanket "no allFiles ever" — a gate that DECLARES the read
    // is sound and passes. This pins the law to "undeclared", not "any out-of-IR read".
    const conformingGate: Gate = defineGate({
      ...cheaterGate,
      id: 'gauntlet/__evidence_law_conformer__',
      // Fold the confirmer corpus the run reads — exactly what the cheater omitted.
      evidenceDigest: (context: GateContext): string | undefined => {
        const all = context.allFiles !== undefined ? context.allFiles() : context.files();
        const entries = [...all].sort().map((p): readonly [string, string] => [p, context.readFile(p) ?? '']);
        // A trivial deterministic fold — any change to a read file or the file list flips it.
        return `ev:${entries.map(([p, b]) => `${p}\x1f${b}`).join('\x1e')}`;
      },
    });
    const undeclared = undeclaredReads(conformingGate, conformingGate.fixtures.green.context);
    expect(undeclared).toEqual([]); // the declared read is covered → conforms
  });
});
