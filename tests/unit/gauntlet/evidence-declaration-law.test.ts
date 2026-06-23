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
  makeRepoIR,
  PLACEHOLDER_DIGEST,
  type EvidenceChannel,
  type Gate,
  type GateContext,
  type Finding,
} from '@czap/gauntlet';

// ── the law engine ───────────────────────────────────────────────────────────

/**
 * Channels covered by a digest OTHER than `evidenceDigest`, so reading them is NOT an
 * `evidenceDigest` obligation. The ONLY genuinely-exempt channels:
 *  - `ir.facts` / `ir.refs` — host-oracle-computed IR VALUES folded by the EXTENDED
 *    TOOLCHAIN digest (the cli/audit oracle dist, P1 #1). Not the coverage digest, not
 *    `evidenceDigest`: the toolchain digest changes when the oracle dist changes.
 *
 * `allFiles` is DELIBERATELY NOT exempt here (the keystone fix — Codex round-3). The
 * file LIST is itself evidence: a gate whose verdict depends on `allFiles()`'s RESULT
 * (e.g. "are there N test files", "does file X exist in the corpus") can serve a stale
 * verdict when the list changes even if no body it read changed. `allFiles` is handled
 * by the dedicated LIST-DEPENDENCE check ({@link allFilesObligation}), not blanket-
 * exempted: a gate that merely ENUMERATES then reads bodies is proven list-INDEPENDENT
 * and passes; a gate whose run output changes when the list changes MUST fold the list
 * (or be caught).
 */
const NON_EVIDENCE_CHANNELS: ReadonlySet<string> = new Set<EvidenceChannel>(['ir.facts', 'ir.refs']);

/**
 * Does `path` live in the IR's COVERAGE-DIGEST domain — i.e. is it IN the IR file set, so
 * its bytes are folded by the coverage digest and reading it is NOT an `evidenceDigest`
 * obligation? This is the COMPLETE out-of-IR predicate's complement: OUT-OF-IR is
 * ANYTHING NOT in the IR file set — no 3-root hand-list, no exempted prefixes.
 *
 * Two worlds, ONE membership semantics:
 *  - REAL node context (`ctx.ir` present) — the coverage digest folds exactly
 *    `ir.files`, so in-IR ⇔ `ctx.ir.files.has(path)`. EXACT + complete: a `package.json`,
 *    a `.github/workflows/*`, a `docs/*`, a `tests/*`, a `benchmarks/*` — NONE are in
 *    `ir.files`, so every one is an out-of-IR obligation.
 *  - DEGENERATE memory fixture (`ctx.ir` absent) — there is no `ir.files` to test, so the
 *    law uses the FAITHFUL stand-in for the set a host WOULD build (`auditSourceGlobs` =
 *    every `.ts`/`.tsx` under a `packages/<pkg>/src/` tree). A fixture, however, may use a
 *    SHORTHAND source path (`good.ts`, `bad.ts`) as a package-source stand-in (the regex
 *    gates do), so the predicate also admits a bare SOURCE FILE (a `.ts`/`.tsx` NOT under
 *    a known non-IR tree) as in-IR. Crucially every NON-SOURCE artifact — a `package.json`
 *    / `.github/*` / `docs/*.md` / any non-`.ts` path — and every `.ts` under a non-IR
 *    tree (`tests/`, `benchmarks/`, `traceability/`) is OUT-OF-IR (an obligation). This is
 *    what closes hole #1: a manifest/workflow/doc read is no longer silently ignored.
 *
 * The two worlds AGREE on the real repo (a host's `ir.files` IS the `auditSourceGlobs`
 * set, all under the `packages/<pkg>/src` tree), so the law classifies by IR MEMBERSHIP —
 * never the old 3-root out-of-IR hand-list. On the `ctx.ir`-present path it is EXACT; the no-IR
 * stand-in is the tightest faithful approximation (it catches EVERY non-source artifact).
 */
function isInIr(path: string, ctx: GateContext): boolean {
  if (ctx.ir !== undefined) return ctx.ir.files.has(path);
  // No injected IR — use the faithful stand-in for `ir.files`:
  //  • real package source (`packages/<pkg>/src/**` `.ts`/`.tsx`) is in-IR; OR
  //  • a fixture SHORTHAND source file: a bare `.ts`/`.tsx` NOT under a non-IR tree
  //    (the regex gates' `good.ts`/`bad.ts` stand-ins for package source).
  // Everything else — a non-`.ts` artifact (package.json / a .yml workflow / a .md doc),
  // or a `.ts`/`.tsx` UNDER a non-IR tree (tests/ confirmer, benchmarks/, traceability/) —
  // is OUT-OF-IR, an evidenceDigest obligation.
  if (PACKAGE_SOURCE.test(path)) return true;
  const isSourceFile = path.endsWith('.ts') || path.endsWith('.tsx');
  return isSourceFile && !NON_IR_SOURCE_TREES.some((tree) => path.startsWith(tree));
}

/**
 * The IR's package-source shape — every `.ts`/`.tsx` under a `packages/<pkg>/src/` tree
 * (the `auditSourceGlobs` set). This is exactly what a host's `ts.Program` lands in
 * `ir.files`; a `.d.ts` under `src/` IS package source (the host lists it), so it is
 * matched (over-classifying a `.d.ts` as in-IR is sound — the coverage digest folds it).
 */
const PACKAGE_SOURCE = /^packages\/[^/]+\/src\/.*\.tsx?$/;

/**
 * The NON-IR SOURCE trees — `.ts`/`.tsx` files here are NOT in `auditSourceGlobs` (which
 * is the `packages/<pkg>/src` tree only), so a SOURCE FILE under one of these is out-of-IR evidence:
 * `tests/` (the confirmer corpus + `tests/bench/*.bench.ts`), `benchmarks/` (the perf
 * registries), `traceability/` (the requirements ledger). This is NOT the old out-of-IR
 * hand-list (which IGNORED everything else) — it only down-classifies SOURCE FILES that
 * sit OUTSIDE the IR's package-source tree; every NON-source artifact is out-of-IR
 * unconditionally (handled in {@link isInIr} by the source-file gate).
 */
const NON_IR_SOURCE_TREES: readonly string[] = ['tests/', 'benchmarks/', 'traceability/'];

/**
 * Is `path` OUT-OF-IR — a `readFile` of evidence the COVERAGE digest cannot see, so its
 * read is an `evidenceDigest` obligation? COMPLETE predicate: out-of-IR ⇔ NOT in the IR
 * file set ({@link isInIr}). Replaces the old 3-root hand-list (`tests/`/`benchmarks/`/
 * `traceability/`), which silently IGNORED every other non-IR path (`package.json`,
 * `.github/*`, `docs/*`) — a gate reading those could stale-hit unnoticed.
 */
function isOutOfIr(path: string, ctx: GateContext): boolean {
  return !isInIr(path, ctx);
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

/**
 * The benign sentinel paths the LIST perturbation ADDS — one per file SHAPE a
 * list-dependent gate might select on (a `tests/` confirmer, a `tests/bench/*.bench.ts`
 * registration, a `benchmarks/*.json` registry, a generic `tests/*.ts`). Covering MULTIPLE
 * shapes means a gate that counts/membership-tests ANY of these corpora reacts to the
 * perturbation — a single-shape sentinel could miss a selector keyed on a different shape.
 * Every body is BENIGN by construction: empty / no bench registration / an empty JSON
 * registry, so a BODY-reading gate's verdict is UNCHANGED (only a LIST-dependent gate, one
 * whose verdict turns on the SET OF PATHS, reacts). The paths are fresh (a `__evidence_
 * law_*__` marker) so they never collide with a real fixture file.
 */
const LIST_SENTINELS: readonly (readonly [string, string])[] = [
  ['tests/__evidence_law_sentinel__.test.ts', ''],
  ['tests/bench/__evidence_law_sentinel__.bench.ts', ''],
  ['benchmarks/__evidence_law_sentinel__.json', '{"distributions":[]}\n'],
  ['tests/__evidence_law_sentinel__.ts', ''],
];

/**
 * A perturbation of the FILE LIST `allFiles()`/`files()` return — ADD the benign
 * {@link LIST_SENTINELS} paths the gate has not seen, WITHOUT changing any existing file's
 * body. This isolates LIST-dependence from BODY-dependence: only a gate whose verdict (or
 * digest) depends on the SET OF PATHS itself reacts (a count, a membership test, a
 * "does file X exist"); a gate that merely enumerates then reads bodies is unaffected (the
 * sentinels' bodies are benign — empty / no registration). The sentinels sit in
 * `allFiles()` AND `files()` AND `readFile()`, so a gate that reads a body sees a real
 * (benign) file. A list-INDEPENDENT gate's run output is identical; a list-DEPENDENT
 * gate's output (or evidenceDigest) changes — exactly the signal the law keys on.
 */
function perturbList(base: GateContext): GateContext {
  const sentinels = new Map<string, string>(LIST_SENTINELS.map(([p, b]) => [p, b]));
  const sentinelPaths = [...sentinels.keys()];
  const clone = cloneContext(base);
  const baseAll = (): readonly string[] => (base.allFiles !== undefined ? base.allFiles() : base.files());
  return {
    ...clone,
    readFile: (p: string): string | undefined => (sentinels.has(p) ? sentinels.get(p) : base.readFile(p)),
    files: (): readonly string[] => [...base.files(), ...sentinelPaths],
    allFiles: (): readonly string[] => [...baseAll(), ...sentinelPaths],
  };
}

/**
 * The verdict (run output) of a gate over `ctx`, as a stable string — used to decide
 * LIST-INDEPENDENCE: if `run` yields the SAME verdict over the base and the
 * list-perturbed context, the gate does not depend on the file LIST (it only enumerated),
 * so reading `allFiles()` is no obligation. A DIFFERENT verdict means the list IS a
 * verdict dependency → the gate must fold it (or be caught). Captures a throw as a
 * distinct, comparable outcome so a gate that throws is still classified deterministically.
 */
function verdictOf(gate: Gate, ctx: GateContext): string {
  try {
    const findings = gate.run(ctx);
    // Fold the findings to a stable shape — ruleId + level + detail capture what the
    // verdict actually SAYS, so a list change that adds/drops/edits a finding flips this.
    return `ok:${JSON.stringify(findings.map((f) => [f.ruleId, f.level, f.severity, f.detail]))}`;
  } catch (err) {
    return `throw:${(err as Error).message}`;
  }
}

/**
 * The LIST-DEPENDENCE obligation for a gate that read `allFiles()`. The file LIST is
 * evidence; this decides whether the gate DECLARES it:
 *  - LIST-INDEPENDENT — the gate's run verdict is unchanged when a new path is added to
 *    the list (it enumerated then read bodies; the new path changed nothing it judges).
 *    No obligation: the list is not a verdict dependency.
 *  - LIST-DEPENDENT — the verdict CHANGES with the list. The list IS a dependency, so the
 *    gate's `evidenceDigest` MUST fold a digest of the relevant list (proven by the SAME
 *    list perturbation flipping the digest). A list-dependent gate that declares nothing
 *    is the stale-cache hole the law CATCHES.
 *
 * Returns the undeclared read marker (`'allFiles'`) when the gate is list-dependent but
 * its digest does not cover the list, else `undefined` (conforms).
 */
function allFilesObligation(gate: Gate, ctx: GateContext): 'allFiles' | undefined {
  const perturbed = perturbList(ctx);
  const listIndependent = verdictOf(gate, ctx) === verdictOf(gate, perturbed);
  if (listIndependent) return undefined; // the list is not a verdict dependency
  // The list IS a dependency — the evidenceDigest must reflect list membership.
  return digestCovers(gate, ctx, perturbed) ? undefined : 'allFiles';
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
 *  - `readFile:<in-IR path>` — the COVERAGE digest folds the IR file set (package
 *    source; on the real path exactly `ir.files`). See {@link isInIr}.
 *
 * Required (MUST flip evidenceDigest when perturbed):
 *  - `readFile:<out-of-IR path>` — ANY path NOT in the IR file set: a `tests/` confirmer,
 *    a `benchmarks/*.json`, a `traceability/` ledger, a `package.json`, a `.github/*`
 *    workflow, a `docs/*` page — the COMPLETE predicate, not a 3-root hand-list.
 *  - an injected-fact channel — the fact content (external-artifact source bytes).
 *  - `allFiles` when the gate's verdict DEPENDS ON THE LIST — the file LIST is evidence;
 *    a list-dependent gate must fold it (see {@link allFilesObligation}). A gate that
 *    merely enumerates then reads bodies is list-independent and exempt.
 */
function undeclaredReads(gate: Gate, ctx: GateContext): readonly string[] {
  const reads = readsOf(gate, ctx);
  const undeclared: string[] = [];
  for (const read of reads) {
    if (NON_EVIDENCE_CHANNELS.has(read)) continue;

    if (read === 'allFiles') {
      // The file LIST is evidence: require it folded IFF the verdict depends on it.
      const obligation = allFilesObligation(gate, ctx);
      if (obligation !== undefined) undeclared.push(obligation);
      continue;
    }

    if (isFactChannel(read)) {
      if (!digestCovers(gate, ctx, perturbFact(ctx, read))) undeclared.push(read);
      continue;
    }

    const path = readFilePath(read);
    if (path !== undefined) {
      if (!isOutOfIr(path, ctx)) continue; // in-IR (coverage-digest domain), not an obligation
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

// ── the keystone probes (Codex round-3): the two exemption HOLES, now CLOSED ───

/**
 * A faithful REPLICA of the OLD (pre-fix) law's `undeclaredReads` — the 3-root out-of-IR
 * hand-list AND the blanket `allFiles` exemption. Used by the RED-before assertions to
 * PROVE the old law false-passed each cheater (returned `[]`), end-to-end, not just at the
 * predicate level. This is the law as it stood before this commit, run over the SAME
 * cheater gate so the regression is undeniable.
 */
function oldLawUndeclaredReads(gate: Gate, ctx: GateContext): readonly string[] {
  const OLD_NON_EVIDENCE = new Set<string>(['ir.facts', 'ir.refs', 'allFiles']); // allFiles EXEMPT (hole #2)
  const OLD_OUT_OF_IR_ROOTS = ['tests/', 'benchmarks/', 'traceability/'];
  const oldIsOutOfIr = (p: string): boolean => OLD_OUT_OF_IR_ROOTS.some((r) => p.startsWith(r)); // 3-root hand-list (hole #1)
  const reads = readsOf(gate, ctx);
  const undeclared: string[] = [];
  for (const read of reads) {
    if (OLD_NON_EVIDENCE.has(read)) continue;
    if (isFactChannel(read)) {
      if (!digestCovers(gate, ctx, perturbFact(ctx, read))) undeclared.push(read);
      continue;
    }
    const path = readFilePath(read);
    if (path !== undefined) {
      if (!oldIsOutOfIr(path)) continue;
      if (!digestCovers(gate, ctx, perturbFile(ctx, path))) undeclared.push(read);
      continue;
    }
    undeclared.push(read);
  }
  return undeclared;
}

describe('THE LAW IS COMPLETE — out-of-IR is IR-membership, not a 3-root hand-list (hole #1)', () => {
  /**
   * A throwaway CHEATER reading an OUT-OF-IR path that is NOT under any of the OLD
   * hand-list roots (`tests/`/`benchmarks/`/`traceability/`): it reads `package.json`'s
   * body — a real out-of-IR artifact whose verdict it depends on — and folds NO
   * `evidenceDigest`. Editing `package.json` (a dependency bump, a script change) would
   * serve a STALE verdict under a coverage-digest-only key. The OLD law IGNORED this read
   * (not in the 3 roots → classified in-IR → no obligation); the COMPLETE law CATCHES it
   * (not in `ir.files`, not package source → out-of-IR → obligation).
   */
  function manifestContext(): GateContext {
    const corpus = new Map<string, string>([
      ['packages/x/src/a.ts', 'export const a = 1;\n'],
      ['package.json', '{"name":"root","dependencies":{"left-pad":"1.0.0"}}\n'],
    ]);
    return {
      repoRoot: '/virtual',
      readFile: (p: string): string | undefined => corpus.get(p),
      files: (): readonly string[] => ['packages/x/src/a.ts'],
      allFiles: (): readonly string[] => [...corpus.keys()],
    };
  }

  const manifestCheater: Gate = defineGate({
    id: 'gauntlet/__evidence_law_manifest_cheater__',
    level: 'L1',
    describe:
      'A deliberately non-conforming gate (reads package.json — out-of-IR but NOT under the old 3 roots — declares no evidenceDigest) — the hole-#1 red fixture.',
    run: (context: GateContext): readonly Finding[] => {
      // The verdict genuinely depends on package.json's body — a dep present is a finding.
      const manifest = context.readFile('package.json') ?? '';
      return manifest.includes('left-pad')
        ? [
            finding({
              ruleId: 'gauntlet/__evidence_law_manifest_cheater__',
              severity: 'advisory',
              level: 'L1',
              title: 'x',
              detail: 'x',
            }),
          ]
        : [];
    },
    // NO evidenceDigest — the violation: editing package.json would stale-hit.
    fixtures: {
      red: { name: 'a manifest the cheater reads', context: manifestContext() },
      green: { name: 'the same manifest', context: manifestContext() },
      mutation: {
        describe: 'a mutant that ignores package.json',
        mutate: (gate: Gate): Gate => ({ ...gate, run: (): readonly Finding[] => [] }),
      },
    },
  });

  it('OLD law would PASS it (the false-pass), NEW law FAILS it: package.json is out-of-IR', () => {
    const greenCtx = manifestCheater.fixtures.green.context;
    // RED-before (end-to-end): the OLD 3-root predicate classified package.json as in-IR
    // (no root prefix matched), so the read was IGNORED — the old law returned NOTHING.
    expect(oldLawUndeclaredReads(manifestCheater, greenCtx)).toEqual([]); // the false pass

    // GREEN-after: the COMPLETE law sees package.json is NOT in the IR file set → an
    // obligation the cheater did not declare → CAUGHT.
    expect(isOutOfIr('package.json', greenCtx)).toBe(true);
    expect(undeclaredReads(manifestCheater, greenCtx)).toContain('readFile:package.json');
  });

  it('the SAME predicate holds on a real-IR context: a non-IR path is out-of-IR by ir.files', () => {
    // Build a context WITH an injected IR whose file set is exactly the package source.
    // A `.github/workflows/ci.yml` read is out-of-IR because it is NOT in `ir.files` —
    // proving the predicate is IR-MEMBERSHIP, identical with or without an injected IR.
    const ir = makeRepoIR({
      files: [{ id: 'packages/x/src/a.ts', contentDigest: PLACEHOLDER_DIGEST, packageName: '@czap/x' }],
    });
    const ctx: GateContext = {
      repoRoot: '/virtual',
      readFile: (): string | undefined => undefined,
      files: (): readonly string[] => ['packages/x/src/a.ts'],
      ir,
    };
    expect(isOutOfIr('packages/x/src/a.ts', ctx)).toBe(false); // in ir.files → in-IR
    expect(isOutOfIr('.github/workflows/ci.yml', ctx)).toBe(true); // not in ir.files → out-of-IR
    expect(isOutOfIr('package.json', ctx)).toBe(true);
    expect(isOutOfIr('docs/ARCHITECTURE.md', ctx)).toBe(true);
  });
});

describe('THE LAW IS COMPLETE — a verdict that depends on allFiles().length is caught (hole #2)', () => {
  /**
   * A throwaway CHEATER whose verdict depends on the file LIST ITSELF — it counts the
   * `tests/` entries in `allFiles()` and flags when there are "too few", reading NO file
   * BODY at all. The list is evidence: ADDING a test file flips the verdict WITHOUT
   * changing any body the gate read, so a coverage-digest-only key (no body read to fold)
   * would serve a STALE verdict. The OLD law blanket-EXEMPTED `allFiles` ("discovery
   * only") → this cheater passed. The COMPLETE law proves the verdict is list-DEPENDENT
   * and demands the list folded → CAUGHT.
   */
  function listContext(): GateContext {
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

  const listCheater: Gate = defineGate({
    id: 'gauntlet/__evidence_law_list_cheater__',
    level: 'L1',
    describe:
      'A deliberately non-conforming gate (verdict depends on allFiles().length, reads no body, declares no evidenceDigest) — the hole-#2 red fixture.',
    run: (context: GateContext): readonly Finding[] => {
      // The verdict depends ONLY on the LIST (a membership/count test), never a body.
      const corpus = context.allFiles !== undefined ? context.allFiles() : context.files();
      const testCount = corpus.filter((p) => p.startsWith('tests/') && p.endsWith('.test.ts')).length;
      // "Too few test files" — a finding driven purely by the list's cardinality.
      return testCount < 2
        ? [
            finding({
              ruleId: 'gauntlet/__evidence_law_list_cheater__',
              severity: 'advisory',
              level: 'L1',
              title: 'too few tests',
              detail: `only ${testCount} test file(s) in the corpus`,
            }),
          ]
        : [];
    },
    // NO evidenceDigest — the violation: adding/removing a test file flips the verdict
    // without flipping the key.
    fixtures: {
      red: { name: 'a one-test corpus the cheater counts', context: listContext() },
      green: { name: 'the same corpus', context: listContext() },
      mutation: {
        describe: 'a mutant that ignores the count',
        mutate: (gate: Gate): Gate => ({ ...gate, run: (): readonly Finding[] => [] }),
      },
    },
  });

  it('OLD law would PASS it (allFiles exempt), NEW law FAILS it: the list IS evidence', () => {
    const greenCtx = listCheater.fixtures.green.context;
    // RED-before (end-to-end): the OLD law put `allFiles` in NON_EVIDENCE_CHANNELS and the
    // cheater reads NO body (only the list), so the old law found NOTHING to charge.
    expect(oldLawUndeclaredReads(listCheater, greenCtx)).toEqual([]); // the false pass

    // GREEN-after: the COMPLETE law proves the verdict CHANGES when the list changes
    // (list-dependent) and the digest does not cover it → CAUGHT.
    expect(allFilesObligation(listCheater, greenCtx)).toBe('allFiles');
    expect(undeclaredReads(listCheater, greenCtx)).toContain('allFiles');
  });

  it('a CONFORMING twin (same run, WITH a list-folding evidenceDigest) PASSES the law', () => {
    // Prove the law is not "no allFiles ever" — a list-dependent gate that FOLDS the list
    // (its membership) conforms. Pins the law to list-dependence-WITHOUT-declaration.
    const conformer: Gate = defineGate({
      ...listCheater,
      id: 'gauntlet/__evidence_law_list_conformer__',
      evidenceDigest: (context: GateContext): string | undefined => {
        const corpus = context.allFiles !== undefined ? context.allFiles() : context.files();
        // Fold the LIST membership the verdict depends on (the test-file set). Adding or
        // removing a test path flips this digest — exactly what soundness requires.
        const tests = corpus.filter((p) => p.startsWith('tests/') && p.endsWith('.test.ts')).sort();
        return `ev:list:${tests.join('\x1e')}`;
      },
    });
    expect(allFilesObligation(conformer, conformer.fixtures.green.context)).toBeUndefined();
    const undeclared = undeclaredReads(conformer, conformer.fixtures.green.context);
    expect(undeclared).toEqual([]);
  });

  it('a list-INDEPENDENT gate (enumerates, then reads bodies) is NOT charged for allFiles', () => {
    // Prove the law does not over-fire: a gate that reads allFiles() purely to ENUMERATE
    // and whose verdict depends only on BODIES (not the list) is list-independent, so the
    // bare `allFiles` read is no obligation (only its out-of-IR body reads are).
    const enumerator: Gate = defineGate({
      ...listCheater,
      id: 'gauntlet/__evidence_law_enumerator__',
      run: (context: GateContext): readonly Finding[] => {
        // Depends on a BODY's content, not the list cardinality — adding an unrelated
        // (benign) path to the list changes nothing it judges.
        const corpus = context.allFiles !== undefined ? context.allFiles() : context.files();
        for (const p of corpus) {
          if (p.startsWith('tests/') && (context.readFile(p) ?? '').includes('FORBIDDEN')) {
            return [finding({ ruleId: 'gauntlet/__evidence_law_enumerator__', severity: 'advisory', level: 'L1', title: 'x', detail: p })];
          }
        }
        return [];
      },
      // It DOES fold its out-of-IR body reads (so only the allFiles list-charge is under test).
      evidenceDigest: (context: GateContext): string | undefined => {
        const corpus = context.allFiles !== undefined ? context.allFiles() : context.files();
        const entries = corpus
          .filter((p) => p.startsWith('tests/'))
          .sort()
          .map((p): readonly [string, string] => [p, context.readFile(p) ?? '']);
        return `ev:${entries.map(([p, b]) => `${p}\x1f${b}`).join('\x1e')}`;
      },
    });
    // The sentinel path the perturbation adds has a benign body (no FORBIDDEN), so the
    // enumerator's verdict is unchanged → list-independent → no allFiles charge.
    expect(allFilesObligation(enumerator, enumerator.fixtures.green.context)).toBeUndefined();
  });
});
