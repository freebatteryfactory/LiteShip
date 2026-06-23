/**
 * Content-addressed incremental — the per-gate verdict cache (Slice B, B2).
 *
 * THE ONE NET-NEW SYSTEM of B2, and the one place SOUNDNESS is everything: a
 * cache that serves a STALE verdict (a cached "green" when the covered code has
 * actually changed and is now red) is a LIE — the worst failure class in this
 * codebase, because it would let a real defect ship. So the discipline here is
 * blunt: the cache key MUST capture EVERYTHING that affects a gate's raw output,
 * and when ANYTHING is uncertain the cache MISSES (re-runs) rather than serves.
 * The cache is a pure SPEEDUP layered onto {@link runGates}; it never changes a
 * verdict, only avoids recomputing one that is provably identical.
 *
 * This module is part of the LEAN engine: it carries NO `typescript`, NO `fs`,
 * and NO crypto dep. The COVERAGE DIGEST is a deterministic STRING fold over the
 * already-computed (blake3) `contentDigest`s the host put on each `FileNode` — the
 * engine never hashes file bytes itself; it only stably concatenates digests the
 * host already minted. The store is INJECTED (the {@link GateVerdictCache}
 * interface): in-memory for tests, fs-backed in the CLI host (which owns `fs` +
 * crypto). The engine touches neither.
 *
 * The FOUR soundness inputs to a key (design §4 + the B2 directive + the
 * OUT-OF-IR-EVIDENCE fix):
 * - the COVERAGE DIGEST — a deterministic function of the gate's covered files'
 *   `(FileId, contentDigest)` pairs: a covered byte changes → a new digest → MISS.
 *   This captures ONLY the bytes that live IN THE IR (the package source built from
 *   `auditSourceGlobs`). It does NOT — and cannot — capture evidence a gate reads
 *   from OUTSIDE the IR (a confirmer test under `tests/`, a `benchmarks/*.json`
 *   registry, a `traceability/*.yaml` ledger, a committed standards snapshot, or the
 *   CONTENT of a host-injected fact whose source bytes are an external artifact like
 *   the lockfile). That out-of-IR evidence is captured by the next input.
 * - the EVIDENCE DIGEST — an OPTIONAL per-gate digest of the EXACT out-of-IR bytes a
 *   gate reads (see {@link Gate.evidenceDigest}). A gate that reads only IR files
 *   omits it (undefined → folds to the empty marker → behaviour unchanged from
 *   before this fix). A gate that reads `context.allFiles()` (the test confirmer
 *   corpus), `context.readFile(benchmarks/…)`, or an injected fact returns a stable
 *   content fold of exactly those bytes, so editing the out-of-IR evidence WITHOUT
 *   touching IR source flips the key → MISS → re-run. This is the keystone that
 *   makes the cache sound for the claim-vs-reality + injected-fact gate families.
 * - the TOOLCHAIN DIGEST — a host-supplied hash that CHANGES when the gauntlet's
 *   gate logic changes (a gate edit → rebuilt dist → new toolchainDigest → every
 *   cached verdict invalidated). Without it, editing a gate's logic while its
 *   covered files are unchanged would serve a stale verdict — the exact lie. This
 *   is the anti-lie keystone, and it is computed in the HOST (see the CLI's
 *   `toolchainDigest`), never here.
 * - the ENV fingerprint — a verdict cached under one toolchain (node / platform /
 *   arch / pm), or under one RUN MODE (`--mutate` / `--simulate` / `--symbols`, the
 *   host folds the mode into env), is never served to another, mirroring the
 *   idempotency layer.
 *
 * @module
 */

import type { Finding } from './finding.js';
import type { FileId, RepoIR } from './repo-ir.js';

/**
 * The injected verdict store. The engine reads/writes RAW gate findings (the
 * pre-authority, pre-waiver output of `gate.run`) through this narrow seam; a
 * host backs it with the filesystem (`.czap/cache/gauntlet/<keyhash>.json`),
 * a test backs it with a `Map`. `read` returns `null` on a MISS (absent OR
 * unreadable OR malformed — every uncertain case falls through to a re-run,
 * never a stale serve).
 */
export interface GateVerdictCache {
  /** The cached RAW findings for `key`, or `null` on a MISS (re-run). */
  read(key: string): readonly Finding[] | null;
  /** Record the RAW findings produced for `key` (a fresh gate.run result). */
  write(key: string, findings: readonly Finding[]): void;
}

/** The parts {@link gateVerdictKey} composes — every input that affects a raw verdict. */
export interface GateVerdictKeyParts {
  /**
   * The host's hash over the gauntlet's BUILT gate logic (its dist bytes + the
   * package version + the env fingerprint). CHANGES when a gate's logic changes —
   * the anti-lie keystone (a gate edit invalidates every cached verdict even when
   * the covered files are byte-identical).
   */
  readonly toolchainDigest: string;
  /** The gate whose verdict this keys — two gates over the same files key apart. */
  readonly gateId: string;
  /** The deterministic digest of the gate's covered `(FileId, contentDigest)` pairs. */
  readonly coverageDigest: string;
  /**
   * The OPTIONAL digest of the gate's OUT-OF-IR evidence (see
   * {@link Gate.evidenceDigest}) — the confirmer test corpus, the `benchmarks/*.json`
   * registries, the ledgers/snapshots, or the CONTENT of a host-injected fact. A gate
   * that reads only IR files omits it (`undefined`): the key folds the empty marker
   * {@link NO_EVIDENCE_MARKER}, so a pure-IR gate's key is UNCHANGED from before the
   * out-of-IR-evidence fix (back-compat). A gate that reads out-of-IR bytes returns a
   * stable content fold of exactly those bytes — editing them flips this segment →
   * MISS → re-run (the soundness keystone for the claim-vs-reality + injected-fact
   * families).
   */
  readonly evidenceDigest?: string;
  /** The environment fingerprint (node / platform / arch / pm) — host-supplied. */
  readonly env: Readonly<Record<string, string>>;
}

/**
 * The field separator used inside a key segment — US (unit separator, 0x1f), a
 * control byte that cannot appear in a FileId (a POSIX path), a digest (hex /
 * `algo:hex`), a gateId, or an env value. Using a byte the inputs cannot contain
 * means no concatenation is ambiguous: `a\x1fb` can never collide with `a\x1f` +
 * `b` because neither `a` nor `b` may contain `\x1f`.
 */
const UNIT = '\x1f';
/** The record separator (RS, 0x1e) — delimits the top-level key segments. */
const RECORD = '\x1e';

/**
 * Build the deterministic verdict-cache key from the four soundness inputs. PURE:
 * the same parts always yield the same key (determinism is itself a tested law).
 *
 * The key is a plain STABLE STRING — NOT a crypto hash (the engine carries no
 * crypto dep; the host hashes the key into a short filename slug). It composes
 * the four segments with the {@link RECORD} separator, and folds the env
 * fingerprint by its SORTED keys so two structurally-equal env maps with
 * different insertion order key identically (the canonicalization the idempotency
 * CBOR layer gets for free, done here over a flat string map without a dep).
 *
 * The `coverageDigest` is ALREADY a fold over the covered files (see
 * {@link coverageDigestOf}); this composer just binds it to the gate, toolchain,
 * and env so a change in ANY of the four flips the key (→ MISS → re-run).
 */
export function gateVerdictKey(parts: GateVerdictKeyParts): string {
  const envFold = Object.keys(parts.env)
    .sort()
    .map((k) => `${k}${UNIT}${parts.env[k] ?? ''}`)
    .join(UNIT);
  // A gate that reads only IR files supplies no evidence digest — fold the inert
  // NO_EVIDENCE_MARKER so a pure-IR gate's key is byte-identical to the pre-fix key
  // (back-compat: every existing pure-IR gate caches exactly as before). A gate with
  // out-of-IR evidence supplies a real fold, which can never equal the marker (it
  // carries the `ev:` scheme), so the two never collide.
  const evidence = parts.evidenceDigest ?? NO_EVIDENCE_MARKER;
  return [
    `tc${UNIT}${parts.toolchainDigest}`,
    `gate${UNIT}${parts.gateId}`,
    `cov${UNIT}${parts.coverageDigest}`,
    `evd${UNIT}${evidence}`,
    `env${UNIT}${envFold}`,
  ].join(RECORD);
}

/**
 * The inert marker folded into the key for a gate that declares NO out-of-IR evidence
 * (its {@link Gate.evidenceDigest} is absent or returns `undefined`). By design NOT a
 * real evidence fold (a real fold carries the `ev:` scheme {@link stableEvidenceDigest}
 * emits) so an "no evidence" key can never collide with a real "this exact evidence"
 * key — a gate that GAINS out-of-IR evidence keys apart from its old pure-IR self.
 */
export const NO_EVIDENCE_MARKER = 'evidence:none' as const;

/**
 * The deterministic COVERAGE DIGEST — a stable string fold over the
 * `(FileId, contentDigest)` pairs of a gate's covered files, SORTED by FileId so
 * the digest is order-independent (the canonical-key-order doctrine, done without
 * a hash dep). The `contentDigest`s are ALREADY blake3 addresses the host minted
 * over each file's volatile-stripped bytes (design §1) — the engine does NOT
 * re-hash bytes; it only concatenates digests stably. A covered file's byte
 * change → a new `contentDigest` → a new fold → a new key → a cache MISS.
 *
 * SOUNDNESS RAIL — a covered FileId that is ABSENT from the IR (a gate declares it
 * covers a file the IR doesn't contain, or a text-only gate with no IR at all)
 * yields the sentinel {@link MISSING_DIGEST_SENTINEL} for that file. Because the
 * sentinel is INERT (never a real content address) and is folded in like any
 * digest, an uncoverable file produces a STABLE key that can never match a key
 * built when the file IS present with real content — but the engine ALSO refuses
 * to cache at all in the no-IR / uncoverable case (see {@link runGates}); this
 * sentinel is the defence-in-depth second line, not the primary guard.
 */
export function coverageDigestOf(coveredFiles: readonly FileId[], ir: RepoIR | undefined): string {
  // Sort + de-dup the FileIds so the fold is order- and multiplicity-independent.
  const ids = [...new Set(coveredFiles)].sort();
  return ids
    .map((id) => {
      const node = ir?.files.get(id);
      const digest = node?.contentDigest ?? MISSING_DIGEST_SENTINEL;
      return `${id}${UNIT}${digest}`;
    })
    .join(RECORD);
}

/**
 * The inert sentinel folded in for a covered file ABSENT from the IR. By design
 * NOT a real content address (it carries the `missing:` scheme + a NUL-free
 * marker) so it can never collide with a real blake3 `AddressedDigest` display
 * string — an uncovered file is content-keyed as "absent", never as some real
 * digest that a later present-and-changed version might coincidentally match.
 */
export const MISSING_DIGEST_SENTINEL = 'missing:not-in-ir' as const;

/**
 * The conservative DEFAULT coverage when a {@link Gate} declares none: EVERY file
 * in the IR. This is the SAFE FLOOR (design §4) for IN-IR evidence — a gate with no
 * declared coverage is assumed to depend on every IR file, so any change to a file
 * IN THE IR invalidates its cached verdict. Narrowing this (a gate declaring
 * `coverage`) is an OPT-IN optimization that is sound ONLY if the gate genuinely
 * reads only those files; an INACCURATE (too-narrow) coverage is a SOUNDNESS BUG (it
 * would `cache-hit` when an uncovered IR dependency changed). The default-to-all
 * floor never has that hazard.
 *
 * SCOPE — and the limit this floor does NOT cover. The IR is PACKAGE SOURCE ONLY
 * (built from `auditSourceGlobs`); "EVERY file in the IR" is therefore every package
 * SOURCE file, NOT every repo byte. A gate that reads evidence OUTSIDE the IR (a
 * confirmer test under `tests/`, a `benchmarks/*.json` registry, a ledger/snapshot,
 * or an injected fact derived from an external artifact) is NOT covered by this
 * floor — its out-of-IR evidence is captured separately by {@link Gate.evidenceDigest}
 * (folded into the key alongside this coverage digest). The two are complementary:
 * the coverage floor guards in-IR bytes; the evidence digest guards out-of-IR bytes.
 * Neither alone is sufficient for an out-of-IR-reading gate.
 */
export function allFileIds(ir: RepoIR): readonly FileId[] {
  return [...ir.files.keys()];
}

/**
 * A deterministic STRING fold over a gate's OUT-OF-IR evidence — the helper a
 * {@link Gate.evidenceDigest} returns. Each entry is a `(label, bytes)` pair (e.g.
 * `["tests/foo.test.ts", "<file body>"]` for a confirmer corpus, or
 * `["fact", stableSerialize(facts)]` for an injected fact). The pairs are SORTED by
 * label so the fold is order-independent (the same canonical-key-order doctrine
 * {@link coverageDigestOf} uses), then concatenated with the {@link UNIT}/{@link RECORD}
 * control bytes. PURE + lean: no crypto, no fs — it stably concatenates the bytes the
 * gate already read through the {@link GateContext}; the HOST hashes the resulting
 * key into a short filename slug. The `ev:` scheme prefix marks the result a REAL
 * evidence fold so it can never collide with {@link NO_EVIDENCE_MARKER}.
 *
 * SOUNDNESS: the entries MUST be EXACTLY the out-of-IR bytes the gate's `run` reads
 * (same files, same fact). A digest that omits a byte the gate reads is the same
 * too-narrow-coverage SOUNDNESS BUG `coverage` warns about — it would serve a stale
 * verdict when that byte changed. When in doubt, fold MORE (the cost is a needless
 * MISS, never a stale serve).
 */
export function stableEvidenceDigest(entries: readonly (readonly [string, string])[]): string {
  const sorted = [...entries].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const fold = sorted.map(([label, bytes]) => `${label}${UNIT}${bytes}`).join(RECORD);
  return `ev:${fold}`;
}

/**
 * A deterministic, recursively KEY-SORTED serialization of a plain-data value — the
 * fold a fact-reading {@link Gate.evidenceDigest} uses to digest its host-injected
 * fact (whose source bytes — the lockfile, the ledger, the snapshot, the per-mutant
 * verdicts — are OUTSIDE the IR, so the coverage digest cannot capture them). Object
 * keys are emitted in SORTED order so two structurally-equal facts with different key
 * insertion order serialize identically (the canonical-order doctrine, done over flat
 * plain data without a CBOR dep). Arrays preserve order (an array's order is
 * semantic). PURE: no clock, no I/O, no crypto.
 *
 * The injected facts are flat, JSON-shaped plain data (strings / numbers / booleans /
 * null / arrays / records — see each `*-facts.ts`), so this total recursion covers
 * them. A non-plain value (a function, a symbol) is not part of any facts shape and
 * folds to its `typeof` tag (it can never appear in a fact, but the fold stays total
 * rather than throwing).
 */
export function stableSerialize(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableSerialize(v)).join(',')}]`;
  }
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'number' || t === 'boolean') return String(value);
  if (t === 'object') {
    const record = value as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(record[k])}`).join(',')}}`;
  }
  // undefined / function / symbol / bigint — never part of a facts shape; keep total.
  return `<${t}>`;
}

/**
 * The OUT-OF-IR evidence digest for an INJECTED-FACT gate — the one-line
 * {@link Gate.evidenceDigest} for a gate whose verdict folds a single host-injected
 * fact (`context.mutation` / `context.supplyChain` / `context.traceability` / …)
 * whose SOURCE bytes (the per-mutant verdicts, the lockfile, the ledger, the snapshot)
 * are an EXTERNAL artifact OUTSIDE the IR. Returns a stable content digest of the fact
 * under `label`, or `undefined` when the fact is ABSENT (the gate then keys as a
 * pure-IR gate — sound, because an absent fact means the gate's verdict does not
 * depend on it: it advisories "not-evidenced" / is simply not in the set).
 *
 * The label namespaces the fact family so two gates that both inject (different) facts
 * cannot collide; the value is folded via {@link stableSerialize} (recursive,
 * key-sorted) so structurally-equal facts digest identically and ANY content change —
 * a flipped mutant verdict, an edited ledger line, a new SBOM entry — flips the key.
 */
export function injectedFactEvidenceDigest(label: string, fact: unknown): string | undefined {
  if (fact === undefined) return undefined;
  return stableEvidenceDigest([[label, stableSerialize(fact)]]);
}

/**
 * The inert marker {@link factAccessEvidenceDigest} folds for a channel a gate
 * ACCESSED and found ABSENT (`undefined`). DISTINCT from {@link NO_EVIDENCE_MARKER}
 * (the gate declared/read NO evidence at all) and from a real `ev:` fold (a present
 * fact) — three mutually-exclusive states keyed apart. The `absent:` scheme prefix
 * means it can never collide with a real evidence fold (`ev:`) or the no-evidence
 * marker (`evidence:none`), so a gate whose verdict DEPENDS on a channel being absent
 * (the supply-chain `not-evidenced` branch) keys apart BOTH from a present-fact verdict
 * AND from a gate that never touched the channel — the absence is folded as evidence.
 */
export const ACCESSED_ABSENT_MARKER = 'absent:accessed' as const;

/**
 * The OUT-OF-IR evidence digest for a gate whose verdict DEPENDS on a fact channel
 * REGARDLESS of whether it is present or absent — the absence-aware sibling of
 * {@link injectedFactEvidenceDigest}. The structural soundness keystone for the
 * not-evidenced gate families (supply-chain, simulation, standards, …): when the gate
 * ACCESSES the channel and finds it ABSENT, its verdict (the `not-evidenced`
 * advisories) DEPENDS on that absence, so the digest folds a DISTINCT
 * accessed-and-absent segment ({@link ACCESSED_ABSENT_MARKER}) rather than collapsing
 * to the no-evidence marker. This makes the verdict key reflect absence-dependence:
 *  - PRESENT  → a real `ev:` content fold of the fact (any content change flips it);
 *  - ABSENT   → the `absent:accessed` marker (DISTINCT from never-accessed);
 * so flipping the channel absent↔present (everything else fixed) ALWAYS flips the key.
 *
 * Unlike {@link injectedFactEvidenceDigest} (which returns `undefined` on absence — the
 * opt-in "not in the set, no dependence" contract), this folds the absence as a
 * dependency: use it for a gate whose verdict CHANGES on absence (it emits findings ABOUT
 * the missing fact), NOT for an opt-in gate that simply does nothing when the fact is
 * absent. PURE, lean, deterministic — the same fold vocabulary, no clock, no I/O.
 */
export function factAccessEvidenceDigest(label: string, fact: unknown): string {
  if (fact === undefined) return stableEvidenceDigest([[label, ACCESSED_ABSENT_MARKER]]);
  return stableEvidenceDigest([[label, stableSerialize(fact)]]);
}
