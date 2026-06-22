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
 * The three soundness inputs to a key (design §4 + the B2 directive):
 * - the COVERAGE DIGEST — a deterministic function of the gate's covered files'
 *   `(FileId, contentDigest)` pairs: a covered byte changes → a new digest → MISS.
 * - the TOOLCHAIN DIGEST — a host-supplied hash that CHANGES when the gauntlet's
 *   gate logic changes (a gate edit → rebuilt dist → new toolchainDigest → every
 *   cached verdict invalidated). Without it, editing a gate's logic while its
 *   covered files are unchanged would serve a stale verdict — the exact lie. This
 *   is the anti-lie keystone, and it is computed in the HOST (see the CLI's
 *   `toolchainDigest`), never here.
 * - the ENV fingerprint — a verdict cached under one toolchain (node / platform /
 *   arch / pm) is never served to another, mirroring the idempotency layer.
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

/** The four parts {@link gateVerdictKey} composes — every input that affects a raw verdict. */
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
  return [
    `tc${UNIT}${parts.toolchainDigest}`,
    `gate${UNIT}${parts.gateId}`,
    `cov${UNIT}${parts.coverageDigest}`,
    `env${UNIT}${envFold}`,
  ].join(RECORD);
}

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
 * in the IR. This is the SAFE FLOOR (design §4) — a gate with no declared coverage
 * is assumed to depend on every file, so ANY repo byte change invalidates its
 * cached verdict. Narrowing this (a gate declaring `coverage`) is an OPT-IN
 * optimization that is sound ONLY if the gate genuinely reads only those files; an
 * INACCURATE (too-narrow) coverage is a SOUNDNESS BUG (it would `cache-hit` when an
 * uncovered dependency changed). The default-to-all floor never has that hazard.
 */
export function allFileIds(ir: RepoIR): readonly FileId[] {
  return [...ir.files.keys()];
}
