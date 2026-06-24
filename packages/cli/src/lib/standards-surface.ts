/**
 * The HOST standards-surface EXTRACTOR — the AGENT-SAFETY META-GAUNTLET (the
 * "raccoon rule"), phase A: read the LIVE standards surface, content-address it,
 * diff it against the committed snapshot, apply the owner sign-offs, and produce the
 * flat {@link StandardsIntegrityFacts} the lean `@czap/gauntlet`
 * `standardsIntegrityGate` folds.
 *
 * "The repairman may be a raccoon with commit access." This is the UNCONDITIONAL
 * COMMIT BACKSTOP: it reads COMMITTED REALITY (the gauntlet's own rigor config off
 * its exports + the committed `benchmarks/`/`traceability/` artifacts), not anyone's
 * declaration — so it catches a silent weakening of the standards regardless of
 * who/how it landed.
 *
 * THE BASELINE IS A PRIOR, INDEPENDENT REF — not the working snapshot. The diff is
 * against the standards snapshot AS COMMITTED ON THE BASE the change is reviewed
 * against (`git show <base>:traceability/standards-snapshot.json`), NOT the
 * just-committed working-tree snapshot. So a raccoon who weakens a standard AND
 * regenerates+commits the snapshot in the SAME commit STILL diffs as a weakening
 * versus the base — you cannot sign away a lie by shipping the lie and its cover-up
 * together. The base ref is resolved deterministically + the read is FAIL-CLOSED (an
 * unresolvable base ⇒ refuse, never fall back to the working snapshot).
 *
 * This is the SAME host-injection pattern as `traceability.ts` (the host computes
 * the heavy facts off disk; the lean engine just folds): the gauntlet carries no
 * `@czap/core` content-address kernel and reads no clock, so the addressing + the
 * sign-off-expiry comparison live HERE. The extractor is DETERMINISTIC — the same
 * live config + committed snapshot + sign-offs + injected date yield a byte-identical
 * surface and the same verdicts.
 *
 * THE STANDARDS SURFACE (what the snapshot captures — the gauntlet's own rigor):
 *  - THE GATE SET: every gate in `LITESHIP_GATES` + `LITESHIP_IR_GATES` + the opt-in
 *    gates (ruleId + assurance level + the presence of each self-proving fixture).
 *  - THE ASSURANCE MAP: `LITESHIP_ASSURANCE_MAP` (glob → level).
 *  - THE WAIVERS: `LITESHIP_WAIVERS` (ruleId + expiry) + `ALWAYS_BLOCKING_RULES`.
 *  - THE INVARIANTS LEDGER: `traceability/invariants.yaml` (id + level + proof/waiver).
 *  - THE FLOORS: the committed numeric floors (`benchmarks/mutation-score.json`,
 *    the `benchmarks/complexity-map.json` complexity ceilings) — each with its
 *    DECLARED direction so the diff knows which way is weakening.
 *
 * @module
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentAddressOf } from '@czap/core';
import { InvariantViolationError, IoError, ParseError } from '@czap/error';
import {
  LITESHIP_GATES,
  LITESHIP_IR_GATES,
  LITESHIP_WAIVERS,
  LITESHIP_ASSURANCE_MAP,
  ALWAYS_BLOCKING_RULES,
  SANCTIONED_SKIPS,
  normalizeSiteLine,
  supplyChainGate,
  mutationDivergenceGate,
  mcdcCoverageGate,
  simulationDeterminismGate,
  traceabilityBridgeGate,
  standardsIntegrityGate,
  capabilityGateLinkGate,
  sortSurfaceElements,
  surfaceElementKey,
  diffStandardsSurface,
  applyStandardsWaivers,
  type AssuranceLevel,
  type Gate,
  type Waiver,
  type StandardsElement,
  type StandardsSurface,
  type StandardsWaiver,
  type StandardsIntegrityFacts,
  type SiteConditionalityResolver,
} from '@czap/gauntlet';
import { detectSkipsAST } from '@czap/audit';
import { buildTraceabilityFacts } from './traceability.js';

/** Repo-relative location of the committed, reviewable standards snapshot. */
export const STANDARDS_SNAPSHOT_PATH = 'traceability/standards-snapshot.json';
/** Repo-relative location of the committed owner sign-offs (the only honest escape). */
export const STANDARDS_WAIVERS_PATH = 'traceability/standards-waivers.json';
/** The committed per-file mutation-score baseline (higher = stronger). */
const MUTATION_SCORE_BASELINE = 'benchmarks/mutation-score.json';
/** The committed complexity map (each entry's class ceiling; lower rank = stronger). */
const COMPLEXITY_MAP = 'benchmarks/complexity-map.json';

/**
 * The NAMED standards gate sets, captured under their set name so the SAME ruleId in
 * two sets is two surface elements — dropping a gate from one set is a real weaken,
 * even if it survives in the other. The opt-in / always-on host gates are captured as
 * a single `HOST_GATES` set (they are the standards the host composes onto a run).
 */
const GATE_SETS: readonly { readonly set: string; readonly gates: readonly Gate[] }[] = [
  { set: 'LITESHIP_GATES', gates: LITESHIP_GATES },
  { set: 'LITESHIP_IR_GATES', gates: LITESHIP_IR_GATES },
  {
    set: 'HOST_GATES',
    gates: [
      supplyChainGate,
      mutationDivergenceGate,
      mcdcCoverageGate,
      simulationDeterminismGate,
      traceabilityBridgeGate,
      standardsIntegrityGate,
      capabilityGateLinkGate,
    ],
  },
];

/** The complexity-class ladder (ascending growth) — a LOWER rank is a STRICTER ceiling. */
const COMPLEXITY_LADDER = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A stable per-waiver identity (ruleId + optional file/line) — the diff's match key. */
function waiverKey(w: Waiver): string {
  const file = w.file ?? '';
  const line = w.line ?? '';
  return `${w.ruleId}|${file}|${line}`;
}

/**
 * Extract every GATE-set element: one {@link GateSurface} per gate per set, recording
 * its ruleId, level, and the presence of each self-proving fixture (the authority
 * ratchet's evidence — a reduced count is a gate that no longer self-proves).
 */
function gateElements(): readonly StandardsElement[] {
  const out: StandardsElement[] = [];
  for (const { set, gates } of GATE_SETS) {
    for (const gate of gates) {
      const f = gate.fixtures;
      out.push({
        _tag: 'gate',
        ruleId: gate.id,
        set,
        level: gate.level,
        // `defineGate` enforces all three; capturing the presence FAITHFULLY models the
        // self-proof so a future gate that somehow loses a fixture (or is composed into a
        // set without one) is caught as `fixture-reduced`.
        redFixtureCount: f.red !== undefined ? 1 : 0,
        greenFixtureCount: f.green !== undefined ? 1 : 0,
        mutationFixtureCount: f.mutation !== undefined ? 1 : 0,
      });
    }
  }
  return out;
}

/** Extract every WAIVER element + every ALWAYS-BLOCKING rule element. */
function waiverElements(): readonly StandardsElement[] {
  const out: StandardsElement[] = [];
  for (const w of LITESHIP_WAIVERS) {
    out.push({ _tag: 'waiver', key: waiverKey(w), ruleId: w.ruleId, expiry: w.expires });
  }
  for (const ruleId of ALWAYS_BLOCKING_RULES) {
    out.push({ _tag: 'always-blocking', ruleId });
  }
  return out;
}

/** Extract every ASSURANCE-MAP element (glob → level). */
function assuranceElements(): readonly StandardsElement[] {
  return LITESHIP_ASSURANCE_MAP.map(
    (rule): StandardsElement => ({ _tag: 'assurance', glob: rule.glob, level: rule.level }),
  );
}

/**
 * Extract every SANCTIONED CAPABILITY-GATED SKIP (`SANCTIONED_SKIPS`) — the
 * waiver-with-teeth that makes each legit `tests/` skip VISIBLE on the content-addressed
 * surface, at PER-SITE granularity. The `(file, site)` is the stable identity, so a file
 * with two sanctioned sites (the wasm-parity dual arms) becomes two elements; adding a NEW
 * site to an already-sanctioned file is a visible WEAKEN the raccoon-rule diff surfaces
 * (one more skip allowed). The site is stored already-normalized so the snapshot is
 * byte-stable regardless of source indentation.
 */
function skipAllowlistElements(): readonly StandardsElement[] {
  return SANCTIONED_SKIPS.map(
    (s): StandardsElement => ({
      _tag: 'skip-allowlist',
      file: s.file,
      site: normalizeSiteLine(s.site),
      capability: s.capability,
    }),
  );
}

/**
 * Extract every INVARIANT-ledger element. Reuses the host traceability state machine
 * ({@link buildTraceabilityFacts}) so the invariants + their resolved proof/waiver kind
 * come from the SAME source of truth the traceability gate uses — never a fork. The
 * proof kind: a `waived`/`expired` invariant is held by a WAIVER; everything else
 * (proven, or declared-with-intent-of-proof) is `proof`.
 */
function invariantElements(repoRoot: string, now: Date): readonly StandardsElement[] {
  const facts = buildTraceabilityFacts(repoRoot, now);
  return facts.invariants.map((inv): StandardsElement => {
    const proofKind: 'proof' | 'waiver' =
      inv.state._tag === 'waived' || inv.state._tag === 'expired' ? 'waiver' : 'proof';
    return { _tag: 'invariant', id: inv.id, level: inv.level as AssuranceLevel, proofKind };
  });
}

/**
 * Extract every committed numeric FLOOR element, each with its DECLARED direction so
 * the diff knows which way is weakening:
 *  - the per-file mutation-score baseline (higher-is-stronger — a LOWER baseline
 *    demands less);
 *  - the complexity-class ceiling per pinned hot path, captured as the ladder RANK
 *    (lower-is-stronger — a HIGHER rank tolerates a worse class).
 */
function floorElements(repoRoot: string): readonly StandardsElement[] {
  const out: StandardsElement[] = [];

  const scorePath = join(repoRoot, MUTATION_SCORE_BASELINE);
  if (existsSync(scorePath)) {
    const parsed: unknown = JSON.parse(readFileSync(scorePath, 'utf8'));
    if (!isRecord(parsed)) {
      throw InvariantViolationError(
        'standards-surface',
        `${MUTATION_SCORE_BASELINE} is not a JSON object of file→score — a corrupt floor artifact`,
      );
    }
    for (const [file, score] of Object.entries(parsed)) {
      if (typeof score !== 'number' || !Number.isFinite(score)) {
        throw InvariantViolationError(
          'standards-surface',
          `${MUTATION_SCORE_BASELINE} entry for "${file}" is not a finite number (got ${String(score)})`,
        );
      }
      out.push({ _tag: 'floor', name: `mutation-score::${file}`, value: score, direction: 'higher-is-stronger' });
    }
  }

  const complexityPath = join(repoRoot, COMPLEXITY_MAP);
  if (existsSync(complexityPath)) {
    const parsed: unknown = JSON.parse(readFileSync(complexityPath, 'utf8'));
    if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
      throw ParseError(COMPLEXITY_MAP, 'expected an { entries: [...] } object');
    }
    for (const entry of parsed.entries) {
      if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.class !== 'string') continue;
      const rank = (COMPLEXITY_LADDER as readonly string[]).indexOf(entry.class);
      if (rank < 0) {
        throw InvariantViolationError(
          'standards-surface',
          `${COMPLEXITY_MAP} records path "${entry.path}" with unrecognized class "${entry.class}"`,
        );
      }
      // The committed CLASS RANK is the ceiling-floor: a HIGHER rank (worse class)
      // tolerated for the path is a WEAKEN, so lower-is-stronger.
      out.push({ _tag: 'floor', name: `complexity-class::${entry.path}`, value: rank, direction: 'lower-is-stronger' });
    }
  }

  return out;
}

/**
 * Read the LIVE standards surface — the gauntlet's own rigor config (off its exports)
 * + the committed `benchmarks/`/`traceability/` artifacts — into a canonical,
 * content-addressed model. Pure given (`repoRoot`, `now`): deterministic + sorted; the
 * content address is minted via the ONE `contentAddressOf` kernel over the SORTED
 * elements (so the address omits ordering noise). `now` is the INJECTED wall-clock date
 * the traceability state machine resolves invariant states against (the two-clock law).
 *
 * Run twice over the same config → byte-identical surface + identical address.
 */
export function readLiveStandardsSurface(repoRoot: string, now: Date): StandardsSurface {
  const elements = sortSurfaceElements([
    ...gateElements(),
    ...waiverElements(),
    ...assuranceElements(),
    ...skipAllowlistElements(),
    ...invariantElements(repoRoot, now),
    ...floorElements(repoRoot),
  ]);
  // A duplicate key would silently collapse two elements in the diff — fail loud.
  const seen = new Set<string>();
  for (const el of elements) {
    const key = surfaceElementKey(el);
    if (seen.has(key)) {
      throw InvariantViolationError(
        'standards-surface',
        `duplicate standards element key "${key}" — the surface model is not uniquely keyed (a real extractor bug, never a silent collapse)`,
      );
    }
    seen.add(key);
  }
  // `contentAddressOf` already returns a `fnv1a:`-prefixed ContentAddress — record it
  // verbatim (no re-prefix), so the address is the exact kernel output.
  const address = String(contentAddressOf(elements));
  return { snapshotFormat: 1, elements, address };
}

/**
 * Serialize a surface to its CANONICAL JSON string — sorted elements, 2-space indent,
 * a trailing newline — so the committed snapshot is byte-reproducible and diffs are
 * minimal + reviewable (the same contract as the api-surface snapshot).
 */
export function serializeStandardsSurface(surface: StandardsSurface): string {
  return `${JSON.stringify(
    { snapshotFormat: surface.snapshotFormat, address: surface.address, elements: surface.elements },
    null,
    2,
  )}\n`;
}

/**
 * Parse a standards-snapshot JSON STRING (from any source — the working tree or a git
 * ref) into a {@link StandardsSurface}. Fails loud (tagged {@link ParseError}) on a
 * malformed shape. `source` names where the bytes came from, for the error message.
 */
function parseSnapshot(raw: string, source: string): StandardsSurface {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.snapshotFormat !== 1 || !Array.isArray(parsed.elements)) {
    throw ParseError(source, 'not a recognizable standards snapshot (snapshotFormat 1 + elements[])');
  }
  return {
    snapshotFormat: 1,
    elements: parsed.elements as readonly StandardsElement[],
    address: typeof parsed.address === 'string' ? parsed.address : '',
  };
}

/** Read + parse the committed (working-tree) standards snapshot. Fails loud on a malformed file. */
export function readCommittedSnapshot(repoRoot: string): StandardsSurface {
  const path = join(repoRoot, STANDARDS_SNAPSHOT_PATH);
  if (!existsSync(path)) {
    throw InvariantViolationError(
      'standards-surface',
      `the committed standards snapshot ${STANDARDS_SNAPSHOT_PATH} is missing — the raccoon-rule backstop needs the committed ground truth to diff against. Generate it intentionally (CZAP_UPDATE_STANDARDS_SNAPSHOT=1).`,
    );
  }
  return parseSnapshot(readFileSync(path, 'utf8'), STANDARDS_SNAPSHOT_PATH);
}

// ─────────────────────── the PRIOR-baseline (git) snapshot ───────────────────
//
// The raccoon backstop must diff the LIVE surface against a PRIOR, INDEPENDENT
// baseline — the snapshot AS COMMITTED ON THE BASE the change is reviewed against —
// NOT the just-committed working-tree snapshot. Otherwise a raccoon weakens a
// standard AND regenerates+commits the snapshot in the SAME commit: live == working
// snapshot ⇒ no weakening seen. Sourcing the baseline from git (`git show
// <base>:traceability/standards-snapshot.json`) makes a same-commit code+snapshot
// weakening STILL diff as a weakening versus the base. You cannot sign away a lie by
// shipping the lie and its cover-up together.

/** Override the resolved base ref (CI sets this to the PR base / integration branch). */
export const STANDARDS_BASE_REF_ENV = 'CZAP_STANDARDS_BASE_REF';
/** The default integration baseline when no explicit base ref is supplied. */
export const STANDARDS_DEFAULT_BASE_REF = 'main';

/**
 * The git all-zeros object id — the "null commit" sentinel GitHub Actions puts in
 * `github.event.before` for the FIRST push of a brand-new branch (there is no prior
 * tip the ref pointed at). It is NEVER a valid base ref: `git show <zero>:<path>`
 * cannot resolve. We treat an all-zeros override as "no explicit base supplied" so the
 * resolution FALLS THROUGH to the integration baseline ({@link STANDARDS_DEFAULT_BASE_REF})
 * — and if THAT lacks the snapshot, {@link readBaseSnapshot} fails CLOSED (refuse, never
 * pass). This keeps the zero-SHA handling deterministic + env-driven in ONE place.
 */
export const GIT_ZERO_SHA = '0000000000000000000000000000000000000000';

/** True iff `ref` is the git all-zeros object id (any length ≥ 7 of all zeros, trimmed). */
function isZeroSha(ref: string): boolean {
  const t = ref.trim();
  return t.length >= 7 && /^0+$/.test(t);
}

/**
 * A `git show <ref>:<path>` reader — the injection seam. Returns the file's bytes at
 * the ref, or `undefined` if the ref/path does not resolve (a deleted/absent baseline
 * file at that ref). THROWS (tagged) only on a git INVOCATION fault (git missing, not
 * a repo) — distinct from "the ref has no such file", which is a clean `undefined` so
 * the caller can fail-closed with a precise message.
 *
 * Pure-ish: no clock, no global state; given the same repo + ref + path it returns the
 * same bytes (git content-addresses). Tests inject a deterministic stub.
 */
export type GitShowReader = (repoRoot: string, ref: string, path: string) => string | undefined;

/**
 * The default {@link GitShowReader} — a real `git show <ref>:<path>` via `execFileSync`
 * (argument vector, never a shell string — no command-injection seam). A non-zero exit
 * (the ref or path does not exist at that ref) is mapped to `undefined`; a spawn fault
 * (git binary absent / not a git work tree) re-throws so the caller fails CLOSED.
 */
export const defaultGitShow: GitShowReader = (repoRoot, ref, path) => {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err: unknown) {
    // `execFileSync` throws for BOTH a non-zero exit (status set) and a spawn failure
    // (no status — e.g. ENOENT git-not-found). A non-zero exit means the object does
    // not exist at that ref → a clean `undefined`. A spawn failure is an environment
    // fault the caller must surface as fail-closed.
    if (isRecord(err) && typeof (err as { status?: unknown }).status === 'number') return undefined;
    throw IoError('git.show', `failed to invoke git to read ${ref}:${path}`, { path, cause: err });
  }
};

/**
 * A reader resolving the INTRODUCTION COMMIT of `path` reachable from HEAD — the FIRST
 * commit (oldest, by `--reverse`) that ADDED the file (`--diff-filter=A`). The branch
 * BASELINE: on a feature branch whose base (e.g. `origin/main`) predates the snapshot's
 * existence, the snapshot was BORN on the branch, so its birth commit IS reachable from
 * HEAD (under the repo's `fetch-depth: 0` full-history checkout). Diffing the live surface
 * vs the snapshot AS COMMITTED AT ITS BIRTH guards every branch-local weakening landed
 * AFTER the snapshot was introduced — the window the inactive state used to leave unguarded.
 *
 * Returns the 40-char commit SHA, or `undefined` if the path has NO add-commit in HEAD's
 * history (the file was never committed — effectively never once introduced). THROWS
 * (tagged) only on a git INVOCATION fault (git missing / not a repo), the SAME fail-closed
 * discipline as {@link GitShowReader}: a missing/never-added file is a clean `undefined`,
 * never a mis-read.
 *
 * The seam (injected, argument-vector — no shell) is hermetically stubbable; it is the ONLY
 * git verb beyond `git show` the extractor uses, and it is reachable from HEAD WITHOUT any
 * `merge-base --is-ancestor origin/main` ancestry math (the fragile query the genesis
 * rewrite removed and which a shallow PR-merge checkout cannot satisfy).
 */
export type GitIntroCommitReader = (repoRoot: string, path: string) => string | undefined;

/**
 * The default {@link GitIntroCommitReader} — `git log --diff-filter=A --format=%H --reverse
 * -- <path>` over HEAD, taking the FIRST line (the oldest add-commit). A clean empty output
 * (no add-commit reachable) is `undefined`; a spawn fault re-throws (fail-closed). The
 * `--reverse` orders oldest-first so the head of the list is the genuine introduction
 * commit even if the file were ever deleted + re-added (the first add is the birth).
 */
export const defaultGitIntroCommit: GitIntroCommitReader = (repoRoot, path) => {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%H', '--reverse', '--', path], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 16 * 1024 * 1024,
    });
    const first = out
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l !== '');
    return first;
  } catch (err: unknown) {
    // A non-zero exit (status set) — e.g. an unborn HEAD with no commits — is the clean
    // "no introduction commit" → undefined. A spawn fault (no status — git absent / not a
    // repo) re-throws so the caller fails CLOSED.
    if (isRecord(err) && typeof (err as { status?: unknown }).status === 'number') return undefined;
    throw IoError('git.log', `failed to invoke git to resolve the introduction commit of ${path}`, {
      path,
      cause: err,
    });
  }
};

// ────────────── the GENESIS PROBE PATH (bootstrap-aware activation, `git show`-only) ──
//
// The backstop diffs the LIVE surface against the snapshot AS COMMITTED ON THE BASE.
// But the snapshot was BORN on a feature branch — it does NOT exist on `main` yet. On
// the bootstrap PR (base = origin/main) the base GENUINELY has no prior baseline to
// diff against — that is GENESIS, not a config error. We MUST distinguish the two, but
// WITHOUT the intro-commit / ancestry git math: on CI's pull_request run the base is a
// fetched `origin/main` and, in the PR merge-checkout, the snapshot's INTRODUCTION commit
// is frequently NOT reachable — so `merge-base --is-ancestor <intro> origin/main` exits
// 128 (bad object), which (correctly, to avoid mis-reading a config error as genesis)
// THREW → the whole gate fail-closed at "origin/main". That intro+ancestry math is too
// fragile for the CI checkout.
//
// THE ROBUST PROBE — one extra `git show` against the SAME seam (no new git verbs):
// resolve a KNOWN-STABLE file at the base. If that file READS at the base, the base ref
// genuinely exists (it is fetched/resolvable) but simply does not carry the snapshot yet
// → the base PREDATES the snapshot → GENESIS → INACTIVE (a loud pass). If even the
// known-stable file is `undefined`, the base ref itself is UNRESOLVABLE (unfetched / a
// bogus ref) → a genuine CONFIG ERROR → FAIL-CLOSED. A `git show` non-zero exit is the
// clean `undefined` the {@link GitShowReader} already maps; only a git INVOCATION fault
// re-throws — so a missing object can never be mis-read, and the probe is robust to a
// shallow PR-merge checkout (it never needs the intro commit reachable).

/**
 * The KNOWN-STABLE file used to PROBE whether the base ref resolves at all (genesis vs a
 * config error). `package.json` is the deterministic, history-spanning choice: it has
 * existed at the repo ROOT in EVERY commit since the repo's genesis (a pnpm workspace's
 * root manifest is created in the first commit and never removed — removing it would
 * break the entire build), so `git show <anyResolvableRef>:package.json` is defined at
 * any commit we could ever review against. It is NOT the standards snapshot, so its
 * presence isolates exactly the question "does the base commit exist?" from "does the
 * base carry the snapshot?". Read through the SAME {@link GitShowReader} seam so the
 * probe is hermetically testable (no separate git verb to stub).
 */
export const STANDARDS_BASE_PROBE_PATH = 'package.json';

/**
 * Resolve the BASE REF the live surface is diffed against — the snapshot the change is
 * being REVIEWED against, NOT the working-tree snapshot. Deterministic precedence:
 *
 *  1. `CZAP_STANDARDS_BASE_REF` — an explicit override (CI sets it to the PR base, e.g.
 *     `origin/main`, OR, for a PUSH, `github.event.before`: the SHA the ref pointed at
 *     BEFORE the push, so the diff covers the ENTIRE pushed range — not just `HEAD~1`,
 *     which would miss a weakening introduced earlier in a multi-commit push). Highest
 *     authority: the host KNOWS the base. EXCEPTION: an all-zeros {@link GIT_ZERO_SHA}
 *     override is the GitHub "null commit" sentinel for the FIRST push of a brand-new
 *     branch (no prior tip) — it is NOT a usable ref, so it is IGNORED and resolution
 *     falls through to the integration baseline below (which, if it lacks the snapshot,
 *     makes {@link readBaseSnapshot} fail CLOSED — never a silent pass).
 *  2. `GITHUB_BASE_REF` — GitHub Actions sets this on a pull_request run to the target
 *     branch name; we read it as `origin/<branch>` (the fetched remote-tracking ref).
 *  3. {@link STANDARDS_DEFAULT_BASE_REF} (`main`) — the integration baseline for a local
 *     run / a push to a feature branch / the brand-new-branch bootstrap fall-through.
 *
 * Returns the chosen ref STRING (resolution of whether the snapshot exists at that ref
 * is the caller's fail-closed job). Reads only `env` (injected for determinism/tests).
 */
export function resolveStandardsBaseRef(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env[STANDARDS_BASE_REF_ENV];
  // An all-zeros override (the brand-new-branch `github.event.before` sentinel) is NOT a
  // resolvable ref — ignore it so we fall through to the integration baseline rather than
  // hand `git show 000…:…` a guaranteed-unresolvable ref. Deterministic, env-driven.
  if (typeof explicit === 'string' && explicit.trim() !== '' && !isZeroSha(explicit)) {
    return explicit.trim();
  }
  const ghBase = env.GITHUB_BASE_REF;
  if (typeof ghBase === 'string' && ghBase.trim() !== '') return `origin/${ghBase.trim()}`;
  return STANDARDS_DEFAULT_BASE_REF;
}

/**
 * Read the PRIOR standards snapshot AS COMMITTED ON THE BASE REF (via git), the
 * INDEPENDENT baseline the raccoon backstop diffs against. FAIL-CLOSED: if the base ref
 * cannot be resolved, or the snapshot does not exist at it, this THROWS (the backstop
 * refuses to pass, never silently falls back to the working-tree snapshot — which is
 * exactly the bypass we are closing). The ONLY sanctioned escape is the explicit
 * regeneration of the snapshot reviewed against this same base.
 *
 * `git` is injected ({@link GitShowReader}) so the heavy I/O is testable + the seam is
 * a single argument-vector invocation (no shell).
 */
export function readBaseSnapshot(
  repoRoot: string,
  baseRef: string,
  gitShow: GitShowReader = defaultGitShow,
): StandardsSurface {
  const raw = gitShow(repoRoot, baseRef, STANDARDS_SNAPSHOT_PATH);
  if (raw === undefined) {
    throw InvariantViolationError(
      'standards-surface',
      `the standards snapshot ${STANDARDS_SNAPSHOT_PATH} could not be read at the base ref "${baseRef}" — the raccoon-rule backstop diffs the LIVE surface against the PRIOR, INDEPENDENT baseline (the snapshot as committed on the base the change is reviewed against), NEVER the just-committed working-tree snapshot (which a same-commit weakening could regenerate to hide the lie). Ensure the base is fetched (e.g. \`git fetch origin ${STANDARDS_DEFAULT_BASE_REF}\`) or set ${STANDARDS_BASE_REF_ENV} to the correct base ref. FAIL-CLOSED: the backstop refuses rather than pass.`,
    );
  }
  return parseSnapshot(raw, `${baseRef}:${STANDARDS_SNAPSHOT_PATH}`);
}

/** Write the committed standards snapshot (the intentional-regeneration path). */
export function writeCommittedSnapshot(repoRoot: string, surface: StandardsSurface): void {
  writeFileSync(join(repoRoot, STANDARDS_SNAPSHOT_PATH), serializeStandardsSurface(surface));
}

/**
 * Read the committed owner sign-offs (the only honest escape). Absent file → an EMPTY
 * list (no weakening is signed — the strict default). A malformed file is a tagged
 * throw (a corrupt sign-off ledger must be visible, never silently treated as "no
 * sign-offs", which would re-block a legitimately-signed weakening — or worse, a
 * truncated file could silently DROP a forbidden-check entry).
 */
export function readStandardsWaivers(repoRoot: string): readonly StandardsWaiver[] {
  const path = join(repoRoot, STANDARDS_WAIVERS_PATH);
  if (!existsSync(path)) return [];
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(parsed) || !Array.isArray(parsed.signoffs)) {
    throw ParseError(STANDARDS_WAIVERS_PATH, 'expected a { signoffs: [...] } object');
  }
  const out: StandardsWaiver[] = [];
  for (const s of parsed.signoffs) {
    if (
      !isRecord(s) ||
      typeof s.elementKey !== 'string' ||
      typeof s.weakening !== 'string' ||
      typeof s.owner !== 'string' ||
      typeof s.justification !== 'string' ||
      typeof s.expiry !== 'string'
    ) {
      throw InvariantViolationError(
        'standards-surface',
        `a sign-off in ${STANDARDS_WAIVERS_PATH} is missing a required field (elementKey, weakening, owner, justification, expiry all required + string)`,
      );
    }
    out.push({
      elementKey: s.elementKey,
      weakening: s.weakening as StandardsWaiver['weakening'],
      owner: s.owner,
      justification: s.justification,
      expiry: s.expiry,
    });
  }
  return out;
}

/** Optional injection seams for {@link buildStandardsIntegrityFacts} (defaulted; tests override). */
export interface StandardsFactsOptions {
  /** The environment the base ref is resolved from (default `process.env`). */
  readonly env?: NodeJS.ProcessEnv;
  /**
   * The `git show <ref>:<path>` reader (default {@link defaultGitShow}). The SAME seam
   * serves BOTH the snapshot read and the {@link STANDARDS_BASE_PROBE_PATH} genesis probe,
   * so a single injected stub controls every git read the extractor makes.
   */
  readonly gitShow?: GitShowReader;
  /**
   * The snapshot INTRODUCTION-COMMIT reader (default {@link defaultGitIntroCommit}). Used on
   * the BIRTH-BASELINE path: when the configured base resolves but predates the snapshot, the
   * extractor diffs the live surface vs the snapshot AS COMMITTED AT ITS BIRTH commit
   * (reachable from HEAD under `fetch-depth: 0`) — guarding every branch-local weakening
   * landed after the snapshot was introduced. Injected so the path is hermetically testable
   * (no real git history in a temp repo) and so a shallow checkout never needs the fragile
   * `merge-base --is-ancestor origin/main` ancestry math.
   */
  readonly gitIntroCommit?: GitIntroCommitReader;
}

/**
 * The BOOTSTRAP-AWARE result of the raccoon-rule backstop — a discriminated state so the
 * (now unreachable-in-practice) GENESIS case is a CLEAN, LOUD pass distinct from a green
 * diff and distinct from a fail-closed config error:
 *
 *  - `active`: a prior baseline EXISTS → the diff ran; `facts` are the decided
 *    {@link StandardsIntegrityFacts} the `standardsIntegrityGate` folds. The baseline is one
 *    of two, in precedence order:
 *      1. the snapshot AS COMMITTED ON THE BASE REF (the post-merge case, the base carries
 *         the snapshot) — the reviewed-against ground truth; OR
 *      2. when the base ref RESOLVES but PREDATES the snapshot (the bootstrap PR), the
 *         snapshot AS COMMITTED AT ITS BIRTH (introduction) commit, reachable from HEAD — the
 *         BRANCH BASELINE. This guards every branch-local weakening landed AFTER the snapshot
 *         was introduced (the window the old `inactive` state left unguarded). It uses ONLY
 *         `git log --diff-filter=A … <snapshot>` over HEAD + a `git show` of the birth — NO
 *         `merge-base --is-ancestor origin/main` ancestry math (the fragility a shallow
 *         PR-merge checkout cannot satisfy).
 *  - `inactive`: the snapshot exists NOWHERE in HEAD's history — it was effectively NEVER
 *    once committed (the introduction commit does not resolve), AND the base resolves but
 *    lacks it. There is genuinely no prior baseline of any kind to diff against → a LOUD pass
 *    (the `message` says so), NOT a silent green. Once the snapshot is committed anywhere in
 *    HEAD's history (i.e. always, in practice, on any branch that carries it), the birth
 *    baseline applies and this branch becomes UNREACHABLE — kept in the discriminated type
 *    for totality + the genuinely-never-committed edge, never expected to fire on a real run.
 *
 * A CONFIG ERROR (the base ref is UNRESOLVABLE — even the known-stable probe file is absent
 * there: unfetched / a bogus ref) is NEITHER state: it THROWS (fail-closed), so a
 * fetch/config fault can never masquerade as genesis.
 */
export type StandardsIntegrityResult =
  | { readonly _tag: 'active'; readonly facts: StandardsIntegrityFacts }
  | {
      readonly _tag: 'inactive';
      /** The base ref the backstop would have diffed against (it resolves but lacks the snapshot). */
      readonly baseRef: string;
      /** The loud, self-explaining message (printed by the gate; NOT a silent pass). */
      readonly message: string;
    };

/**
 * Compose the INACTIVE message — loud + self-explaining. Reached ONLY when the snapshot
 * exists NOWHERE in HEAD's history (no introduction commit resolves) AND the base resolves
 * but lacks it: there is genuinely no prior baseline of any kind. In practice — on any branch
 * that has ever committed the snapshot — the BIRTH BASELINE applies instead and the backstop
 * is ACTIVE; this message is the totality/never-committed edge, not the expected bootstrap
 * path (which now diffs vs the snapshot's birth commit).
 */
function inactiveMessage(baseRef: string): string {
  return (
    `standards backstop INACTIVE: no prior baseline ANYWHERE — the snapshot ${STANDARDS_SNAPSHOT_PATH} does ` +
    `not exist at the base "${baseRef}" (the base resolves — ${STANDARDS_BASE_PROBE_PATH} reads at it — but ` +
    `predates the snapshot) AND has NO introduction commit reachable from HEAD (it was never committed). NOT a ` +
    `silent pass — there is genuinely no baseline to guard, so you cannot sneak a weakening past a baseline that ` +
    `does not exist. The backstop activates as soon as the snapshot is committed (the birth baseline) or the base ` +
    `carries it (post-merge).`
  );
}

/**
 * Build the {@link StandardsIntegrityFacts} the `standardsIntegrityGate` folds — the
 * HOST's heavy job (the raccoon-rule backstop). Pure given (`repoRoot`, `now`, `opts`):
 *
 *  1. Read the LIVE standards surface (content-addressed).
 *  2. Read the PRIOR, INDEPENDENT baseline — the snapshot AS COMMITTED ON THE BASE REF
 *     the change is reviewed against (via git), NOT the working-tree snapshot. This is
 *     the fortification: a same-commit code+snapshot weakening still diffs as a
 *     weakening versus the base, because the working-tree snapshot is not the baseline.
 *     FAIL-CLOSED — an unresolvable base ref / absent baseline THROWS (refuse, never
 *     pass).
 *  3. Diff them (the PURE `diffStandardsSurface` — classify every change).
 *  4. Apply the owner sign-offs against the injected `now` + the live always-blocking
 *     rule ids (so a weakening of an always-blocking rule can never be signed).
 *
 * `now` is the INJECTED wall-clock date (the two-clock law — never `Date.now()` here).
 * A SUCCESSFUL extraction over an UN-weakened branch yields zero unsigned weakenings
 * (the gate is green); a weakening without a matching sign-off — even one whose
 * working-tree snapshot was regenerated to match — yields a blocking finding versus the
 * base.
 *
 * `committedAddress` carries the BASE snapshot's address (the prior baseline the diff is
 * against), so the report's drift keystone reflects the reviewed-against ground truth,
 * not the working snapshot.
 *
 * BOOTSTRAP-AWARE (robust to CI's PR merge-checkout — `git show` + a single `git log
 * --diff-filter=A`, NO `merge-base --is-ancestor` ancestry math): returns a
 * {@link StandardsIntegrityResult} discriminated state.
 *  - If the base ref CARRIES the snapshot → `active`, diffing vs the base (post-merge).
 *  - If the base ref RESOLVES (the known-stable {@link STANDARDS_BASE_PROBE_PATH} reads
 *    there) but lacks the snapshot — the base PREDATES the snapshot (the bootstrap PR) —
 *    the backstop does NOT go inactive: it resolves the snapshot's INTRODUCTION (birth)
 *    commit reachable from HEAD ({@link GitIntroCommitReader}, under `fetch-depth: 0`) and
 *    diffs vs the snapshot AS COMMITTED AT ITS BIRTH (the BRANCH BASELINE) → `active`. This
 *    guards every branch-local weakening landed AFTER the snapshot was introduced (the
 *    window the old inactive state left unguarded). The intro commit is reachable from HEAD
 *    WITHOUT the fragile `merge-base --is-ancestor origin/main` query.
 *  - `inactive` now applies ONLY if the snapshot exists NOWHERE in HEAD's history (no
 *    introduction commit resolves) — effectively NEVER once committed — AND the base lacks
 *    it. A LOUD pass (never a silent green); UNREACHABLE-IN-PRACTICE once the snapshot is
 *    committed on any branch.
 *  - If the base ref is UNRESOLVABLE (even the probe file is absent there: unfetched / a
 *    bogus ref) → a genuine CONFIG ERROR → THROWS (fail-closed); a fetch/path fault never
 *    poses as genesis.
 */
export function buildStandardsIntegrityFacts(
  repoRoot: string,
  now: Date,
  opts: StandardsFactsOptions = {},
): StandardsIntegrityResult {
  const live = readLiveStandardsSurface(repoRoot, now);
  const baseRef = resolveStandardsBaseRef(opts.env ?? process.env);
  const gitShow = opts.gitShow ?? defaultGitShow;
  const gitIntroCommit = opts.gitIntroCommit ?? defaultGitIntroCommit;

  // Try to read the PRIOR baseline at the base ref. If it is present, the backstop is
  // ACTIVE and we diff vs the base (the post-merge case, the reviewed-against ground truth).
  const raw = gitShow(repoRoot, baseRef, STANDARDS_SNAPSHOT_PATH);
  if (raw !== undefined) {
    const base = parseSnapshot(raw, `${baseRef}:${STANDARDS_SNAPSHOT_PATH}`);
    return activeFacts(repoRoot, now, base, live);
  }

  // The base ref does NOT carry the snapshot. Distinguish a CONFIG ERROR (the base ref does
  // not resolve at all) from the BOOTSTRAP case (the base resolves but predates the snapshot)
  // with ONE `git show` of the KNOWN-STABLE probe file — NO `merge-base --is-ancestor` math.
  const probe = gitShow(repoRoot, baseRef, STANDARDS_BASE_PROBE_PATH);
  if (probe === undefined) {
    // CONFIG ERROR (the base ref does not resolve at all): fail closed. `readBaseSnapshot`
    // re-reads via the SAME seam and throws the precise tagged message.
    readBaseSnapshot(repoRoot, baseRef, gitShow);
    // `readBaseSnapshot` always throws on an undefined read; this is unreachable, but the
    // tagged throw above is the real exit — never a silent pass.
    throw InvariantViolationError(
      'standards-surface',
      `the standards snapshot ${STANDARDS_SNAPSHOT_PATH} could not be read at base "${baseRef}" and the base ref did not resolve — fail-closed.`,
    );
  }

  // BOOTSTRAP (the base resolves but predates the snapshot — e.g. the PR vs origin/main where
  // the snapshot was born on this branch). DO NOT go inactive: diff vs the snapshot's BIRTH
  // commit (the BRANCH BASELINE), reachable from HEAD, so a weakening landed AFTER the
  // snapshot was introduced is STILL caught. Resolve the introduction commit with a single
  // `git log --diff-filter=A … <snapshot>` over HEAD — no ancestry query a shallow PR-merge
  // checkout cannot satisfy.
  const introCommit = gitIntroCommit(repoRoot, STANDARDS_SNAPSHOT_PATH);
  if (introCommit !== undefined) {
    const birthRaw = gitShow(repoRoot, introCommit, STANDARDS_SNAPSHOT_PATH);
    if (birthRaw !== undefined) {
      const birth = parseSnapshot(birthRaw, `${introCommit}:${STANDARDS_SNAPSHOT_PATH}`);
      return activeFacts(repoRoot, now, birth, live);
    }
    // The introduction commit resolved but the snapshot does not read THERE — a git
    // inconsistency (the add-commit names the path, but `git show <intro>:<path>` is empty).
    // Fail CLOSED rather than silently fall through to a baseline-less pass.
    throw InvariantViolationError(
      'standards-surface',
      `the standards snapshot ${STANDARDS_SNAPSHOT_PATH} resolved an introduction commit (${introCommit}) but could not be read AT it — a git inconsistency. FAIL-CLOSED: the backstop refuses rather than pass without a baseline.`,
    );
  }

  // The snapshot has NO introduction commit reachable from HEAD AND the base lacks it — it was
  // genuinely never committed anywhere in this history. There is no baseline of any kind. A
  // LOUD pass (NOT a silent green). Unreachable-in-practice once the snapshot is committed.
  return { _tag: 'inactive', baseRef, message: inactiveMessage(baseRef) };
}

/**
 * Diff `baseline` (the prior, reviewed-against surface — the base-ref OR the birth-commit
 * snapshot) against the `live` surface, apply the owner sign-offs against the injected `now`
 * + the live always-blocking rule ids, and return the decided `active` facts. The
 * `committedAddress` carries the BASELINE's address (the drift keystone reflects what the
 * diff was actually against — base or birth).
 */
function activeFacts(
  repoRoot: string,
  now: Date,
  baseline: StandardsSurface,
  live: StandardsSurface,
): StandardsIntegrityResult {
  const changes = diffStandardsSurface(baseline.elements, live.elements);
  const signoffs = readStandardsWaivers(repoRoot);
  const alwaysBlocking = new Set(ALWAYS_BLOCKING_RULES);
  // The SOUND conditionality proof (codex round-7) for the raccoon backstop's `skip-allowlist-added`
  // forbidden check: the host parses the live site via `detectSkipsAST` and injects its STRUCTURAL
  // classification, so an `if (true) { it.skip("ffmpeg…") }` placeholder is forbidden REGARDLESS of a
  // capability-naming title (the lean title-keyword heuristic was the laundering surface). Lazy — a
  // file is parsed only when a sanctioned-skip ADDITION is actually being judged, so a clean run (no
  // such change) pays nothing.
  const siteConditionality = buildSiteConditionalityResolver(repoRoot);
  const partitioned = applyStandardsWaivers(changes, signoffs, now, alwaysBlocking, siteConditionality);
  return {
    _tag: 'active',
    facts: { ...partitioned, committedAddress: baseline.address, liveAddress: live.address },
  };
}

/**
 * Build the host's {@link SiteConditionalityResolver} — given a sanctioned skip's `(file, site)`, the
 * STRUCTURAL conditionality of that site in the LIVE working tree, via `@czap/audit`'s sound
 * `detectSkipsAST` (the same proof the no-skip gate uses). Each file is parsed AT MOST ONCE (cached),
 * and only when the resolver is actually invoked (lazy — the partition calls it solely for a
 * `skip-allowlist-added` change). A site absent from the live parse (e.g. an addition whose source
 * isn't on disk) resolves `undefined`, so `siteConsistentWithCapability` falls back to the documented
 * title-keyword heuristic — never a crash, never a silent strengthening.
 */
function buildSiteConditionalityResolver(repoRoot: string): SiteConditionalityResolver {
  const perFile = new Map<string, Map<string, string>>();
  const parse = (file: string): Map<string, string> => {
    const cached = perFile.get(file);
    if (cached !== undefined) return cached;
    const out = new Map<string, string>();
    const abs = join(repoRoot, file);
    if (existsSync(abs)) {
      const text = readFileSync(abs, 'utf8');
      const lines = text.split('\n');
      for (const m of detectSkipsAST(text)) {
        // `detectSkipsAST` ALWAYS sets `conditional` (the AST proof); the field is optional only
        // because the token fallback omits it. Guard for the type — a missing one is simply not mapped
        // (the resolver then returns `undefined` → the title-keyword fallback, never a crash).
        if (m.conditional !== undefined) out.set(normalizeSiteLine(lines[m.line - 1] ?? ''), m.conditional);
      }
    }
    perFile.set(file, out);
    return out;
  };
  return (file, site) => {
    const c = parse(file).get(normalizeSiteLine(site));
    return c as ReturnType<SiteConditionalityResolver>;
  };
}
