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
  memoryContext,
  PLACEHOLDER_DIGEST,
  FACT_CHANNELS,
  ABSENT_SUFFIX,
  gateVerdictKey,
  supplyChainGate,
  simulationDeterminismGate,
  fuzzCorpusGate,
  mutationDivergenceGate,
  mcdcCoverageGate,
  taintFlowGate,
  traceabilityBridgeGate,
  standardsIntegrityGate,
  declaredFixProtocolGate,
  proofPropagationGate,
  compositionCoverageGate,
  stableEvidenceDigest,
  stableSerialize,
  factAccessEvidenceDigest,
  ACCESSED_ABSENT_MARKER,
  NO_EVIDENCE_MARKER,
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
 * The benign sentinel paths the LIST perturbation ADDS — one representative path per
 * OUT-OF-IR SHAPE/ROOT a list-dependent gate might select on. This set is CO-EXTENSIVE
 * with the recorder's out-of-IR predicate ({@link isOutOfIr} / {@link isInIr}): every
 * shape that predicate flags as out-of-IR has a sentinel here, so a gate whose verdict
 * turns on the MEMBERSHIP or CARDINALITY of ANY out-of-IR shape reacts to the
 * perturbation. A narrower set (the prior test/bench-only sentinels) left WHOLE shapes
 * un-perturbed — a gate keyed on `docs/*.md` / `.github/workflows/*.yml` / a root
 * `package.json` / `traceability/*.yaml` membership would NOT react, so the law could
 * read undeclared list-evidence and pass. The shapes, matching the classifier's roots:
 *  - the NON-IR SOURCE TREES the classifier down-classifies ({@link NON_IR_SOURCE_TREES}):
 *    `tests/*.test.ts` (the confirmer corpus), `tests/bench/*.bench.ts` (the bench
 *    registrations), a generic `tests/*.ts`, `benchmarks/*.json` (the perf registries),
 *    `traceability/*.yaml` (the requirements ledger);
 *  - the NON-SOURCE ARTIFACTS the classifier flags unconditionally (any non-`.ts` path,
 *    or a `.ts` outside the IR tree): `docs/*.md`, `.github/workflows/*.yml`, a root
 *    `package.json`-sibling, AND a generic deep non-IR path (a shape with no fixed root,
 *    standing in for any out-of-IR artifact a gate could query that the named roots miss).
 *
 * Every body is BENIGN by construction — empty / no registration / an empty JSON or YAML
 * registry / a placeholder doc — so a BODY-reading gate's verdict is UNCHANGED: only a
 * LIST-dependent gate, one whose verdict turns on the SET OF PATHS, reacts. The paths are
 * fresh (a `__evidence_law_*__` marker) so they never collide with a real fixture file.
 *
 * HONEST RESIDUAL — NOT a complete guarantee. This covers every out-of-IR SHAPE/ROOT, so
 * it catches any REALISTIC list-dependence (a gate selecting on a corpus by root/extension).
 * Knowing the EXACT set of list-queries a gate makes is statically undecidable, so an
 * adversary could hard-code one VERY specific exact filename no sentinel happens to equal
 * (e.g. `docs/THIS-EXACT-NAME.md`) and its membership would not flip the perturbation. That
 * exact-path residual is the irreducible undecidable tail; the SHAPE-coverage here is the
 * tightest decidable approximation — it is co-extensive with the out-of-IR predicate, so no
 * shape the recorder flags is left un-perturbed.
 */
const LIST_SENTINELS: readonly (readonly [string, string])[] = [
  // ── the NON-IR SOURCE TREES (NON_IR_SOURCE_TREES) ─────────────────────────────
  ['tests/__evidence_law_sentinel__.test.ts', ''],
  ['tests/bench/__evidence_law_sentinel__.bench.ts', ''],
  ['tests/__evidence_law_sentinel__.ts', ''],
  ['benchmarks/__evidence_law_sentinel__.json', '{"distributions":[]}\n'],
  ['traceability/__evidence_law_sentinel__.yaml', 'requirements: []\n'],
  // ── the NON-SOURCE ARTIFACTS (every non-.ts path the classifier flags out-of-IR) ──
  ['docs/__evidence_law_sentinel__.md', '<!-- evidence-law sentinel -->\n'],
  ['.github/workflows/__evidence_law_sentinel__.yml', 'name: evidence-law-sentinel\non: []\n'],
  ['__evidence_law_sentinel__.package.json', '{"name":"__evidence_law_sentinel__"}\n'],
  // ── a generic deep non-IR path (no fixed root) — any out-of-IR artifact the named
  //    roots miss; closes the residual for shapes with no recognizable root prefix. ──
  ['vendor/__evidence_law_sentinel__/data.bin', ''],
];

/**
 * A perturbation of the FILE LIST `allFiles()`/`files()` return — ADD the benign
 * {@link LIST_SENTINELS} paths the gate has not seen (one per out-of-IR SHAPE/ROOT, so
 * co-extensive with the recorder's out-of-IR predicate), WITHOUT changing any existing
 * file's body. This isolates LIST-dependence from BODY-dependence: only a gate whose
 * verdict (or digest) depends on the SET OF PATHS itself reacts (a count, a membership
 * test, a "does file X exist"); a gate that merely enumerates then reads bodies is
 * unaffected (the sentinels' bodies are benign — empty / no registration). Because a
 * sentinel exists for EVERY out-of-IR shape (`docs/*.md`, `.github/workflows/*.yml`, a
 * root `package.json`-sibling, `traceability/*.yaml`, a generic deep path — not just
 * `tests/`/`benchmarks/`), a gate keyed on the membership of ANY such shape reacts. The
 * sentinels sit in `allFiles()` AND `files()` AND `readFile()`, so a gate that reads a
 * body sees a real (benign) file. A list-INDEPENDENT gate's run output is identical; a
 * list-DEPENDENT gate's output (or evidenceDigest) changes — exactly the signal the law
 * keys on.
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


/** The channel named by an absent-access read marker (`<channel>:absent`), else undefined. */
function absentReadChannel(read: string): EvidenceChannel | undefined {
  if (!read.endsWith(ABSENT_SUFFIX)) return undefined;
  const channel = read.slice(0, -ABSENT_SUFFIX.length);
  return isFactChannel(channel) ? channel : undefined;
}

/**
 * The ABSENCE obligation (round-6 P3) for a gate that ACCESSED `channel` and found it
 * ABSENT. The bug the old `injectedFactEvidenceDigest` had was NOT "absent ≠ present" (it
 * returned `undefined` for absent and an `ev:` fold for present — those already differ);
 * it was "accessed-absent COLLAPSES to never-accessed" — `undefined` folds the SAME
 * {@link NO_EVIDENCE_MARKER} a gate that declared NO evidence at all does. So the verdict
 * key for the absent world is byte-identical to a no-dependence world, and a warm cache
 * cannot tell them apart.
 *
 * The obligation therefore PROVES the digest keys the accessed-absent state APART FROM the
 * never-accessed state: the verdict key built from `evidenceDigest(absentCtx)` must DIFFER
 * from the key built from `undefined` (the never-accessed / no-evidence marker). An
 * absence-aware digest folds a distinct `absent:accessed` segment → the keys differ → it
 * conforms; the old absence-collapsing digest returns `undefined` → the keys are identical
 * → CAUGHT. Returns the undeclared marker (`<channel>:absent`) when the gate fails, else
 * undefined.
 */
function absentObligation(gate: Gate, ctx: GateContext, channel: EvidenceChannel): string | undefined {
  if (gate.evidenceDigest === undefined) return `${channel}${ABSENT_SUFFIX}`;
  const absentKey = gateVerdictKey({
    toolchainDigest: 'tc',
    gateId: gate.id,
    coverageDigest: 'cov',
    env: {},
    evidenceDigest: gate.evidenceDigest(ctx),
  });
  const neverAccessedKey = gateVerdictKey({
    toolchainDigest: 'tc',
    gateId: gate.id,
    coverageDigest: 'cov',
    env: {},
    evidenceDigest: undefined,
  });
  return absentKey === neverAccessedKey ? `${channel}${ABSENT_SUFFIX}` : undefined;
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

// The injected-fact channels are derived from the SINGLE SOURCE (`@czap/gauntlet`'s
// FACT_CHANNELS, pinned to GateContext by a compile-time conformance assertion) — never
// a hand-copy that can drift from the context shape (the round-5 residual: a channel the
// recorder/law forgot to instrument). cloneContext + perturbFact iterate exactly this set.

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

    // An ABSENT fact access (`<channel>:absent`) is a FIRST-CLASS evidence read (round-6
    // P3): a gate that branches on the channel being absent (the supply-chain
    // not-evidenced path) DEPENDS on that absence, so its evidenceDigest MUST key the
    // absent world apart from the present world — proven by flipping the channel absent→
    // present flipping the digest. A digest that collapses absence into the no-evidence
    // marker (the old injectedFactEvidenceDigest) fails this and is CAUGHT.
    const absentChannel = absentReadChannel(read);
    if (absentChannel !== undefined) {
      const obligation = absentObligation(gate, ctx, absentChannel);
      if (obligation !== undefined) undeclared.push(obligation);
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

// ── the list-shape keystone (Codex round-4): list-dependence is SHAPE-broad ────

/**
 * A faithful REPLICA of the OLD (pre-round-4) list perturbation — the NARROW sentinel set
 * that only added `tests/` + `benchmarks/` shapes (no `docs/`, no `.github/`, no
 * `package.json`, no `traceability/`, no generic deep path). Used by the RED-before
 * assertion to PROVE the old perturbation false-passed a gate keyed on a non-sentinel
 * shape's membership, end-to-end. A gate whose verdict depends on the membership/cardinality
 * of a shape this narrow set does not touch is classified list-INDEPENDENT by it (the verdict
 * does not move under the perturbation) → the law charges nothing → false-pass.
 */
const OLD_NARROW_LIST_SENTINELS: readonly (readonly [string, string])[] = [
  ['tests/__evidence_law_sentinel__.test.ts', ''],
  ['tests/bench/__evidence_law_sentinel__.bench.ts', ''],
  ['benchmarks/__evidence_law_sentinel__.json', '{"distributions":[]}\n'],
  ['tests/__evidence_law_sentinel__.ts', ''],
];

/** The OLD narrow list perturbation (test/bench sentinels only) — the round-4 hole. */
function oldNarrowPerturbList(base: GateContext): GateContext {
  const sentinels = new Map<string, string>(OLD_NARROW_LIST_SENTINELS.map(([p, b]) => [p, b]));
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

/** The OLD narrow allFiles obligation — list-dependence judged by {@link oldNarrowPerturbList}. */
function oldNarrowAllFilesObligation(gate: Gate, ctx: GateContext): 'allFiles' | undefined {
  const perturbed = oldNarrowPerturbList(ctx);
  const listIndependent = verdictOf(gate, ctx) === verdictOf(gate, perturbed);
  if (listIndependent) return undefined;
  return digestCovers(gate, ctx, perturbed) ? undefined : 'allFiles';
}

describe('THE LAW IS SHAPE-BROAD — list-dependence on ANY out-of-IR shape is caught (round-4 hole)', () => {
  /**
   * A throwaway CHEATER whose verdict depends on the membership/cardinality of a NON-SENTINEL
   * out-of-IR shape — `docs/*.md` — reading NO body at all. The list is evidence: adding a
   * `docs/*.md` page flips the verdict WITHOUT changing any body, so a coverage-digest-only
   * key serves a STALE verdict. The OLD narrow perturbation only added `tests/`/`benchmarks/`
   * sentinels, so the docs membership never moved → the cheater was (falsely) list-independent
   * → it PASSED. The BROADENED perturbation adds a `docs/*.md` sentinel → the verdict moves →
   * the law proves list-dependence and demands the list folded → CAUGHT.
   */
  function docsContext(): GateContext {
    const corpus = new Map<string, string>([
      ['packages/x/src/a.ts', 'export const a = 1;\n'],
      ['docs/ARCHITECTURE.md', '# arch\n'],
    ]);
    return {
      repoRoot: '/virtual',
      readFile: (p: string): string | undefined => corpus.get(p),
      files: (): readonly string[] => ['packages/x/src/a.ts'],
      allFiles: (): readonly string[] => [...corpus.keys()],
    };
  }

  const docsCheater: Gate = defineGate({
    id: 'gauntlet/__evidence_law_docs_cheater__',
    level: 'L1',
    describe:
      'A deliberately non-conforming gate (verdict depends on docs/*.md membership — an out-of-IR shape NOT in the old narrow sentinel set — reads no body, declares no evidenceDigest) — the round-4 red fixture.',
    run: (context: GateContext): readonly Finding[] => {
      // The verdict depends ONLY on the docs/*.md membership/cardinality, never a body.
      const corpus = context.allFiles !== undefined ? context.allFiles() : context.files();
      const docCount = corpus.filter((p) => p.startsWith('docs/') && p.endsWith('.md')).length;
      // "Too few docs" — a finding driven purely by the docs LIST cardinality.
      return docCount < 2
        ? [
            finding({
              ruleId: 'gauntlet/__evidence_law_docs_cheater__',
              severity: 'advisory',
              level: 'L1',
              title: 'too few docs',
              detail: `only ${docCount} doc page(s) in the corpus`,
            }),
          ]
        : [];
    },
    // NO evidenceDigest — the violation: adding/removing a docs page flips the verdict
    // without flipping the key.
    fixtures: {
      red: { name: 'a one-doc corpus the cheater counts', context: docsContext() },
      green: { name: 'the same corpus', context: docsContext() },
      mutation: {
        describe: 'a mutant that ignores the docs count',
        mutate: (gate: Gate): Gate => ({ ...gate, run: (): readonly Finding[] => [] }),
      },
    },
  });

  it('OLD narrow perturbation PASSES it (the false-pass), BROADENED perturbation FAILS it', () => {
    const greenCtx = docsCheater.fixtures.green.context;
    // RED-before (end-to-end): the OLD narrow perturbation added only test/bench sentinels,
    // so the docs/*.md membership never moved — the cheater's verdict was unchanged → the
    // old obligation judged it list-INDEPENDENT → charged NOTHING.
    expect(oldNarrowAllFilesObligation(docsCheater, greenCtx)).toBeUndefined(); // the false pass

    // GREEN-after: the BROADENED perturbation adds a docs/*.md sentinel → the verdict moves
    // (the docs count goes 1 → 2, dropping the finding) → list-DEPENDENT and undeclared → CAUGHT.
    expect(allFilesObligation(docsCheater, greenCtx)).toBe('allFiles');
    expect(undeclaredReads(docsCheater, greenCtx)).toContain('allFiles');
  });

  /**
   * The SAME proof for a `.github/workflows/*.yml`-keyed cheater — a SECOND non-sentinel
   * shape, to show the broadening is not one-off. Its verdict turns on whether ANY workflow
   * file is present (a "missing CI" gate), pure list membership, no body read.
   */
  function workflowContext(): GateContext {
    const corpus = new Map<string, string>([['packages/x/src/a.ts', 'export const a = 1;\n']]);
    return {
      repoRoot: '/virtual',
      readFile: (p: string): string | undefined => corpus.get(p),
      files: (): readonly string[] => ['packages/x/src/a.ts'],
      allFiles: (): readonly string[] => [...corpus.keys()],
    };
  }

  const workflowCheater: Gate = defineGate({
    id: 'gauntlet/__evidence_law_workflow_cheater__',
    level: 'L1',
    describe:
      'A deliberately non-conforming gate (verdict depends on .github/workflows/*.yml membership, reads no body, declares no evidenceDigest) — a second round-4 red fixture.',
    run: (context: GateContext): readonly Finding[] => {
      const corpus = context.allFiles !== undefined ? context.allFiles() : context.files();
      const hasCi = corpus.some((p) => p.startsWith('.github/workflows/') && p.endsWith('.yml'));
      // "No CI workflow present" — a finding driven purely by workflow LIST membership.
      return hasCi
        ? []
        : [
            finding({
              ruleId: 'gauntlet/__evidence_law_workflow_cheater__',
              severity: 'advisory',
              level: 'L1',
              title: 'no CI workflow',
              detail: 'no .github/workflows/*.yml present',
            }),
          ];
    },
    // NO evidenceDigest — adding a workflow flips the verdict without flipping the key.
    fixtures: {
      red: { name: 'a corpus with no workflow', context: workflowContext() },
      green: { name: 'the same corpus', context: workflowContext() },
      mutation: {
        describe: 'a mutant that ignores the workflow membership',
        mutate: (gate: Gate): Gate => ({ ...gate, run: (): readonly Finding[] => [] }),
      },
    },
  });

  it('the .github/workflows/*.yml cheater is also a false-pass OLD, CAUGHT broadened', () => {
    const greenCtx = workflowCheater.fixtures.green.context;
    expect(oldNarrowAllFilesObligation(workflowCheater, greenCtx)).toBeUndefined(); // false pass
    expect(allFilesObligation(workflowCheater, greenCtx)).toBe('allFiles'); // caught
    expect(undeclaredReads(workflowCheater, greenCtx)).toContain('allFiles');
  });

  it('a CONFORMING twin (docs cheater, WITH a docs-list-folding evidenceDigest) PASSES', () => {
    // Pins the broadened law to list-dependence-WITHOUT-declaration, not "no docs query ever".
    const conformer: Gate = defineGate({
      ...docsCheater,
      id: 'gauntlet/__evidence_law_docs_conformer__',
      evidenceDigest: (context: GateContext): string | undefined => {
        const corpus = context.allFiles !== undefined ? context.allFiles() : context.files();
        const docs = corpus.filter((p) => p.startsWith('docs/') && p.endsWith('.md')).sort();
        return `ev:docs:${docs.join('\x1e')}`;
      },
    });
    expect(allFilesObligation(conformer, conformer.fixtures.green.context)).toBeUndefined();
    expect(undeclaredReads(conformer, conformer.fixtures.green.context)).toEqual([]);
  });

  it('the broadened sentinel set is CO-EXTENSIVE with the out-of-IR predicate (no shape un-perturbed)', () => {
    // Every sentinel path the perturbation adds MUST be classified out-of-IR by the
    // recorder's predicate — otherwise the perturbation would add an in-IR path (which the
    // coverage digest already folds), not exercising list-evidence. This pins the
    // co-extensiveness the broadening claims: the perturbation set ⊆ the out-of-IR domain.
    const probeCtx: GateContext = {
      repoRoot: '/virtual',
      readFile: (): string | undefined => undefined,
      files: (): readonly string[] => ['packages/x/src/a.ts'],
      allFiles: (): readonly string[] => ['packages/x/src/a.ts'],
    };
    for (const [path] of LIST_SENTINELS) {
      expect(isOutOfIr(path, probeCtx), `sentinel "${path}" must be out-of-IR`).toBe(true);
    }
    // And the set spans every out-of-IR ROOT the classifier recognizes (the union check):
    // the non-IR source trees PLUS a non-source artifact PLUS a generic deep path.
    const sentinelPaths = LIST_SENTINELS.map(([p]) => p);
    for (const tree of ['tests/', 'benchmarks/', 'traceability/']) {
      expect(sentinelPaths.some((p) => p.startsWith(tree)), `a sentinel under ${tree}`).toBe(true);
    }
    expect(sentinelPaths.some((p) => p.startsWith('docs/') && p.endsWith('.md'))).toBe(true);
    expect(sentinelPaths.some((p) => p.startsWith('.github/workflows/'))).toBe(true);
    expect(sentinelPaths.some((p) => p.endsWith('.package.json') || p === 'package.json')).toBe(true);
    // A generic deep path with NO recognizable root prefix (the residual-narrowing shape).
    expect(
      sentinelPaths.some(
        (p) =>
          !p.startsWith('tests/') &&
          !p.startsWith('benchmarks/') &&
          !p.startsWith('traceability/') &&
          !p.startsWith('docs/') &&
          !p.startsWith('.github/') &&
          p.includes('/'),
      ),
    ).toBe(true);
  });
});

// ── the ABSENCE keystone (Codex round-5 P3): reading an ABSENT channel is recorded ──

/**
 * A faithful REPLICA of the OLD (pre-round-5) recorder's fact-channel instrumentation —
 * it installed a recording getter ONLY for the channels that were PRESENT on the context
 * (`if (value === undefined) continue;`), so a gate that ACCESSED a channel and found it
 * ABSENT recorded NOTHING. Used by the RED-before assertions to PROVE the old recorder
 * was blind to absence-dependence, end-to-end, over the SAME gate the new recorder now
 * captures. Everything else (files / allFiles / ir.*) matches the live recorder.
 */
function oldRecordingReads(base: GateContext, run: (ctx: GateContext) => void): ReadonlySet<string> {
  const reads = new Set<string>();
  const inIr = new Set<string>(base.ir !== undefined ? [...base.ir.files.keys()] : []);
  const context: GateContext = {
    repoRoot: base.repoRoot,
    readFile: (relativePath: string): string | undefined => {
      if (!inIr.has(relativePath)) reads.add(`readFile:${relativePath}`);
      return base.readFile(relativePath);
    },
    files: (): readonly string[] => base.files(),
    allFiles: (): readonly string[] => {
      reads.add('allFiles');
      return base.allFiles !== undefined ? base.allFiles() : base.files();
    },
    ...(base.ir !== undefined ? { ir: base.ir } : {}),
  };
  // OLD: install a getter ONLY for PRESENT channels — the absence hole.
  for (const channel of FACT_CHANNELS) {
    const value = (base as Record<string, unknown>)[channel];
    if (value === undefined) continue; // ← the hole: an absent channel is never instrumented
    Object.defineProperty(context, channel, {
      enumerable: true,
      configurable: true,
      get(): unknown {
        reads.add(channel);
        return value;
      },
    });
  }
  run(context);
  return reads;
}

describe('THE ABSENCE KEYSTONE — accessing an ABSENT channel is recorded as a dependency (round-5 P3)', () => {
  // The witness: the REAL absence-dependent supply-chain gate (supply-chain.ts:81). Its
  // `fold` branches on `facts?.lockfile === undefined` etc. — when supplyChain is ABSENT
  // it emits four "not-evidenced" findings, so its verdict DEPENDS on the absence.
  const probeChannel: EvidenceChannel = 'supplyChain';
  // A context with EVERY fact channel absent (a bare memory context). The supply-chain
  // gate run over it ACCESSES `context.supplyChain` and finds it undefined.
  const absentCtx: GateContext = memoryContext({});

  it('RED-before: the OLD recorder records NOTHING for the absent supplyChain access (the hole)', () => {
    const oldReads = oldRecordingReads(absentCtx, (ctx) => void supplyChainGate.run(ctx));
    // The gate read `context.supplyChain` (found it absent) — but the old recorder, which
    // only instrumented PRESENT channels, captured no marker for it. The dependency on the
    // channel's ABSENCE was invisible.
    expect(oldReads.has('supplyChain')).toBe(false);
    expect(oldReads.has(`supplyChain${ABSENT_SUFFIX}`)).toBe(false);
  });

  it('GREEN-after: the NEW recorder records the absent access as `supplyChain:absent`', () => {
    const rec = recordingContext(absentCtx);
    supplyChainGate.run(rec.context);
    const reads = rec.reads();
    // The access is now recorded — DISTINCT from a present read AND from never-accessed.
    expect(reads.has(`supplyChain${ABSENT_SUFFIX}`)).toBe(true);
    expect(reads.has('supplyChain')).toBe(false); // not the present marker (it WAS absent)
  });

  it('a gate that NEVER touches supplyChain records neither marker (no spurious dependency)', () => {
    // Prove present-channel behavior is preserved: a probe that ignores supplyChain
    // entirely records nothing for it — the absent getter fires ONLY on an explicit access,
    // so a gate that does not read the channel keys identically (no spurious cache-busting).
    const rec = recordingContext(absentCtx);
    const ignorer: Gate['run'] = (ctx) => {
      void ctx.files(); // touches files, never supplyChain
      return [];
    };
    ignorer(rec.context);
    expect(rec.reads().has(`supplyChain${ABSENT_SUFFIX}`)).toBe(false);
    expect(rec.reads().has('supplyChain')).toBe(false);
  });

  it('the absent access is DISTINCT from a present access (three mutually-exclusive markers)', () => {
    const present = recordingContext(supplyChainGate.fixtures.green.context);
    supplyChainGate.run(present.context);
    const absent = recordingContext(absentCtx);
    supplyChainGate.run(absent.context);
    // present world → `supplyChain`; absent world → `supplyChain:absent`; never read → neither.
    expect(present.reads().has('supplyChain')).toBe(true);
    expect(present.reads().has(`supplyChain${ABSENT_SUFFIX}`)).toBe(false);
    expect(absent.reads().has(`supplyChain${ABSENT_SUFFIX}`)).toBe(true);
    expect(absent.reads().has('supplyChain')).toBe(false);
  });

  it('the absent getter returns `undefined` verbatim — the gate sees an IDENTICAL world', () => {
    // FAITHFULNESS: the instrumented absent channel reads exactly as the base (undefined),
    // so the gate's run output is identical with or without the recorder.
    const rec = recordingContext(absentCtx);
    expect((rec.context as Record<string, unknown>)['supplyChain']).toBeUndefined();
    const bare = supplyChainGate.run(absentCtx);
    const wrapped = supplyChainGate.run(rec.context);
    expect(JSON.stringify(wrapped)).toBe(JSON.stringify(bare));
  });

  it('ABSENCE↔PRESENCE flips the verdict KEY (everything else fixed) — the soundness proof', () => {
    // The structural guarantee made true: with toolchain/gate/coverage/env all FIXED,
    // flipping supplyChain absent↔present changes the gate's evidenceDigest, which flips
    // the verdict-cache key — so a warm cache can NEVER serve an absent-world verdict to a
    // present world (or vice versa). The witness is the gate's REAL evidenceDigest.
    const digest = supplyChainGate.evidenceDigest;
    expect(digest).toBeDefined();
    const fixed = {
      toolchainDigest: 'tc-fixed',
      gateId: supplyChainGate.id,
      coverageDigest: 'cov-fixed',
      env: { node: 'v20' },
    } as const;
    const keyAbsent = gateVerdictKey({ ...fixed, evidenceDigest: digest?.(absentCtx) });
    const keyPresent = gateVerdictKey({
      ...fixed,
      evidenceDigest: digest?.(supplyChainGate.fixtures.green.context),
    });
    expect(keyAbsent).not.toBe(keyPresent); // the absence-state is folded into the key
  });

  it('EVERY fact channel: an absent access is recorded for ALL of them (the perturbation law covers absence)', () => {
    // The broadened law: for EVERY channel in the single-source FACT_CHANNELS, a probe that
    // accesses it while absent records the `<channel>:absent` marker. This is the absence
    // analogue of the presence perturbation — no channel is left un-instrumented when absent.
    for (const channel of FACT_CHANNELS) {
      const rec = recordingContext(absentCtx);
      // A minimal probe: access exactly this channel (the recorder's getter fires).
      void (rec.context as Record<string, unknown>)[channel];
      expect(
        rec.reads().has(`${channel}${ABSENT_SUFFIX}`),
        `channel "${channel}" absent-access must be recorded`,
      ).toBe(true);
      expect(rec.reads().has(channel), `channel "${channel}" must NOT record a present marker when absent`).toBe(false);
    }
  });

  it('FACT_CHANNELS is the single source — it lists every optional fact key the recorder instruments', () => {
    // Pin the single-source claim at runtime: the recorder installs a getter for exactly
    // these channels. A channel added to GateContext but not FACT_CHANNELS is already a
    // BUILD ERROR (the compile-time conformance assertion in evidence-recorder.ts); this
    // runtime check pins the COUNT so an accidental shrink of the list is caught too.
    const ctx = memoryContext({});
    const recorder = recordingContext(ctx);
    // Touching each channel name on the wrapped context must fire the absent getter — i.e.
    // every name in FACT_CHANNELS is genuinely instrumented (no name silently uninstalled).
    for (const channel of FACT_CHANNELS) {
      void (recorder.context as Record<string, unknown>)[channel];
    }
    expect(recorder.reads().size).toBe(FACT_CHANNELS.length);
    expect(new Set(FACT_CHANNELS).size).toBe(FACT_CHANNELS.length); // no duplicate names
  });
});

// ── the ABSENCE-IN-THE-KEY keystone (Codex round-6 P3): the digest folds absence ──

/**
 * A faithful REPLICA of the OLD (pre-round-6) `injectedFactEvidenceDigest` — the helper
 * that returned `undefined` on an ABSENT fact, collapsing "accessed-and-absent" into the
 * SAME key segment as "never declared any evidence" (both fold {@link NO_EVIDENCE_MARKER}).
 * That is the drift Codex caught: a gate whose verdict DEPENDS on a channel being absent
 * (the supply-chain `not-evidenced` branch) did NOT fold that dependence into its key, so a
 * warm cache could serve a verdict computed under the other absence-state. Used by the
 * RED-before assertions to prove the bug end-to-end over the REAL witness gates, then the
 * GREEN-after proves the live (consolidated) {@link factAccessEvidenceDigest} cures it.
 */
function oldInjectedFactEvidenceDigest(label: string, fact: unknown): string | undefined {
  if (fact === undefined) return undefined; // ← the hole: absence collapses to the no-evidence marker
  return stableEvidenceDigest([[label, stableSerialize(fact)]]);
}

/** The verdict-cache key for a witness gate's digest output (everything else FIXED). */
function keyFor(gateId: string, evidenceDigest: string | undefined): string {
  return gateVerdictKey({
    toolchainDigest: 'tc-fixed',
    gateId,
    coverageDigest: 'cov-fixed',
    env: { node: 'v20' },
    evidenceDigest,
  });
}

/** The live fact value `channel` carries on `ctx` (its present fact, or undefined). */
function factOf(ctx: GateContext, channel: EvidenceChannel): unknown {
  return (ctx as Record<string, unknown>)[channel];
}

/**
 * The witness gates whose verdict GENUINELY depends on a fact channel being ABSENT — each
 * emits a `not-evidenced` finding when its channel is `undefined`, so the absent world is a
 * distinct verdict the cache must key apart. `(gate, channel)` pairs drive every assertion
 * below over REAL shipping gates: the ABSENT world is a bare memory context (the channel is
 * `undefined`); the PRESENT world is the gate's OWN green fixture (a real fact that yields a
 * clean, divergent verdict and folds to a real `ev:` digest), not a throwaway sentinel.
 */
const ABSENCE_WITNESSES: readonly (readonly [Gate, EvidenceChannel])[] = [
  [supplyChainGate, 'supplyChain'],
  [simulationDeterminismGate, 'simulation'],
  [fuzzCorpusGate, 'fuzzCorpus'],
];

describe('THE ABSENCE-IN-THE-KEY LAW — a gate that branches on absence keys it apart (round-6 P3)', () => {
  for (const [gate, channel] of ABSENCE_WITNESSES) {
    const absentCtx = memoryContext({});
    const presentCtx = gate.fixtures.green.context; // a REAL present fact (the gate's clean world)

    it(`${gate.id}: it emits a not-evidenced verdict when ${channel} is absent (the dependence is real)`, () => {
      // Pin the premise: the gate's run output genuinely DIFFERS absent-vs-present, so the
      // verdict-cache MUST key the two apart (else a warm cache serves the wrong one).
      const absentFindings = gate.run(absentCtx);
      const presentFindings = gate.run(presentCtx);
      expect(absentFindings.length).toBeGreaterThan(0); // a not-evidenced advisory
      expect(JSON.stringify(absentFindings)).not.toBe(JSON.stringify(presentFindings));
    });

    it(`${gate.id}: RED-before — the OLD digest collapses absent into the never-accessed (no-evidence) key`, () => {
      // The bug, end-to-end on the real gate: under the OLD helper an ABSENT channel folds
      // `undefined` → the verdict key is BYTE-IDENTICAL to a gate that declared NO evidence
      // at all (NO_EVIDENCE_MARKER). The absence-dependence is invisible to the key — a warm
      // cache cannot tell an accessed-absent world from a no-dependence world.
      const oldAbsentDigest = oldInjectedFactEvidenceDigest(channel, factOf(absentCtx, channel));
      expect(oldAbsentDigest).toBeUndefined();
      const oldAbsentKey = keyFor(gate.id, oldAbsentDigest);
      const neverAccessedKey = keyFor(gate.id, undefined); // a gate that declares no evidence
      expect(oldAbsentKey).toBe(neverAccessedKey); // ← the collapse: absent ≡ never-accessed
    });

    it(`${gate.id}: GREEN-after — the LIVE digest keys absent apart from BOTH never-accessed AND present`, () => {
      // The cure: the consolidated factAccessEvidenceDigest folds a DISTINCT
      // `absent:accessed` segment on absence — three mutually-exclusive keys.
      const liveDigest = gate.evidenceDigest;
      expect(liveDigest).toBeDefined();
      const absentKey = keyFor(gate.id, liveDigest?.(absentCtx));
      const presentKey = keyFor(gate.id, liveDigest?.(presentCtx));
      const neverAccessedKey = keyFor(gate.id, undefined);
      expect(absentKey).not.toBe(neverAccessedKey); // absent ≠ never-accessed (the cure)
      expect(absentKey).not.toBe(presentKey); // absent ≠ present (soundness)
      expect(presentKey).not.toBe(neverAccessedKey); // present ≠ never-accessed (unchanged)
    });

    it(`${gate.id}: present-fact fold is BYTE-IDENTICAL to the old helper (no spurious cache busting)`, () => {
      // Back-compat: for a PRESENT fact the live digest must equal the old helper's fold, so
      // every present-fact cache key is UNCHANGED — only the absent case keys differently.
      const liveDigest = gate.evidenceDigest;
      expect(liveDigest?.(presentCtx)).toBe(oldInjectedFactEvidenceDigest(channel, factOf(presentCtx, channel)));
    });

    it(`${gate.id}: the law CONFORMS — undeclaredReads is empty for the absent world (it folds the absence)`, () => {
      // The broadened law (undeclaredReads now treats `<channel>:absent` as a first-class
      // read) passes the LIVE gate over an ABSENT context: the gate folds the absence apart
      // from never-accessed, so nothing is undeclared. The law exercising the absence path
      // on the REAL gate.
      expect(undeclaredReads(gate, absentCtx)).toEqual([]);
    });

    it(`${gate.id}: TEETH — reverting this gate to the OLD digest FAILS the absence law`, () => {
      // Prove the wiring is LOAD-BEARING, not decorative: a mutant of the gate that swaps the
      // live absence-aware digest back to the OLD (absence-collapsing) helper reads the absent
      // channel but folds `undefined` → the accessed-absent key collapses to never-accessed →
      // the law surfaces the undeclared `:absent` read. Reverting ONE gate fails a specific
      // law assertion.
      const reverted: Gate = {
        ...gate,
        evidenceDigest: (ctx: GateContext): string | undefined =>
          oldInjectedFactEvidenceDigest(channel, factOf(ctx, channel)),
      };
      const undeclared = undeclaredReads(reverted, absentCtx);
      expect(undeclared).toContain(`${channel}${ABSENT_SUFFIX}`);
    });
  }

  it('factAccessEvidenceDigest folds the three states apart (absent / present / never-accessed)', () => {
    // The digest-level invariant the gate keys depend on: absent → the `absent:accessed`
    // marker fold; present → a real `ev:` fold; and the absent marker can NEVER equal the
    // never-accessed marker (NO_EVIDENCE_MARKER) — three mutually-exclusive schemes.
    const absentFold = factAccessEvidenceDigest('supplyChain', undefined);
    const presentFold = factAccessEvidenceDigest('supplyChain', { a: 1 });
    expect(absentFold).toBe(stableEvidenceDigest([['supplyChain', ACCESSED_ABSENT_MARKER]]));
    expect(absentFold).not.toBe(presentFold);
    expect(absentFold).not.toBe(NO_EVIDENCE_MARKER);
    expect(presentFold).not.toBe(NO_EVIDENCE_MARKER);
    expect(presentFold.startsWith('ev:')).toBe(true);
  });

  // EVERY fact-consuming built-in gate paired with the channel it folds. These ship
  // DELIBERATELY OUTSIDE the default LITESHIP_GATES / LITESHIP_IR_GATES sets (the integrator
  // composes them on via the facts-injected host path), so they are NOT covered by the ALL_GATES
  // sweep — this explicit list is the consolidation guard's population. The `evidenceDigest` of
  // each is pure (it folds `context.<channel>` via the absence-aware digest; no IR read), so the
  // absence obligation can be evaluated WITHOUT running the gate (several require an injected IR
  // to run). A gate left on the old absence-collapsing helper is CAUGHT by absentObligation here.
  const FACT_CONSUMING_GATES: readonly (readonly [Gate, EvidenceChannel])[] = [
    [supplyChainGate, 'supplyChain'],
    [simulationDeterminismGate, 'simulation'],
    [fuzzCorpusGate, 'fuzzCorpus'],
    [mutationDivergenceGate, 'mutation'],
    [mcdcCoverageGate, 'mcdc'],
    [taintFlowGate, 'taint'],
    [traceabilityBridgeGate, 'traceability'],
    [standardsIntegrityGate, 'standards'],
    [declaredFixProtocolGate, 'declaredFix'],
    [proofPropagationGate, 'proof'],
    [compositionCoverageGate, 'composition'],
  ];

  it('EVERY fact-consuming gate folds the absence apart from never-accessed (the consolidation sweep)', () => {
    // The consolidation guard (round-6 P3): for EVERY fact-consuming gate, its evidenceDigest
    // over an ABSENT context must key the accessed-absent world APART from the never-accessed
    // (no-evidence) world — i.e. it uses the absence-aware digest, not the old helper. A gate
    // still on `injectedFactEvidenceDigest` would return `undefined` for absent → collapse to
    // the no-evidence marker → CAUGHT.
    const absentCtx = memoryContext({});
    for (const [gate, channel] of FACT_CONSUMING_GATES) {
      const obligation = absentObligation(gate, absentCtx, channel);
      expect(
        obligation,
        `gate "${gate.id}" does not key channel "${channel}" absent apart from never-accessed (still on the old helper?)`,
      ).toBeUndefined();
    }
  });

  it('TEETH — reverting ANY fact-consuming gate to the old helper fails the consolidation sweep', () => {
    // Prove the sweep is load-bearing across the WHOLE set: reverting EACH gate (one at a time)
    // to the old absence-collapsing helper makes absentObligation flag THAT gate. So a single
    // regression anywhere in the 11 gates is caught — the wiring is not decorative.
    const absentCtx = memoryContext({});
    for (const [gate, channel] of FACT_CONSUMING_GATES) {
      const reverted: Gate = {
        ...gate,
        evidenceDigest: (ctx: GateContext): string | undefined =>
          oldInjectedFactEvidenceDigest(channel, factOf(ctx, channel)),
      };
      expect(
        absentObligation(reverted, absentCtx, channel),
        `reverting gate "${gate.id}" to the old helper should fail the absence law`,
      ).toBe(`${channel}${ABSENT_SUFFIX}`);
    }
  });
});
