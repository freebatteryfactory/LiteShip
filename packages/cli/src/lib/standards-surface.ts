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
} from '@czap/gauntlet';
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

// ────────────── the SNAPSHOT-GENESIS git seams (bootstrap-aware activation) ───
//
// The backstop diffs the LIVE surface against the snapshot AS COMMITTED ON THE BASE.
// But the snapshot was BORN on a feature branch — it does NOT exist on `main` yet. On
// the bootstrap PR (base = origin/main) the base GENUINELY has no prior baseline to
// diff against — that is GENESIS, not a config error. To distinguish the two we ask
// git TWO deterministic questions, injected as seams (testable, no shell):
//   1. WHEN was the snapshot introduced? (the earliest commit that ADDED the file.)
//   2. Is that intro commit an ANCESTOR of the base ref?
// If the intro commit is NOT an ancestor of the base, the base PREDATES the snapshot's
// very existence → there is no baseline → the backstop is INACTIVE (a loud pass). If it
// IS an ancestor (the base SHOULD carry the snapshot) but the snapshot could not be read
// → a genuine CONFIG ERROR (unfetched / wrong path) → FAIL-CLOSED.

/**
 * Resolve the INTRODUCTION commit of a repo-relative path — the earliest commit that
 * ADDED it (`git log --diff-filter=A --format=%H --reverse -- <path> | head -1`,
 * argument-vector, no shell). Returns the full SHA, or `undefined` if the path was never
 * added in this history (a shallow clone that does not reach the genesis, or a brand-new
 * untracked file). THROWS (tagged) only on a git INVOCATION fault (git missing / not a
 * repo) — distinct from "no introducing commit found", which is a clean `undefined`.
 */
export type GitIntroReader = (repoRoot: string, path: string) => string | undefined;

/** The default {@link GitIntroReader} — a real `git log --diff-filter=A …` via `execFileSync`. */
export const defaultGitIntro: GitIntroReader = (repoRoot, path) => {
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
      .find((l) => l.length > 0);
    return first;
  } catch (err: unknown) {
    if (isRecord(err) && typeof (err as { status?: unknown }).status === 'number') {
      // A non-zero exit with no matching commit is a clean "not found"; only a spawn
      // fault (no status) is the environment error that must fail closed.
      return undefined;
    }
    throw IoError('git.log', `failed to invoke git to resolve the intro commit of ${path}`, { path, cause: err });
  }
};

/**
 * Ask git whether `ancestor` is an ANCESTOR of `descendant` (`git merge-base
 * --is-ancestor`, argument-vector, no shell): exit 0 ⇒ ancestor (true), exit 1 ⇒ not an
 * ancestor (false). THROWS (tagged) only on a git INVOCATION fault OR an UNEXPECTED exit
 * (e.g. a bad ref — exit ≥ 2), so a malformed ref can never be silently read as "not an
 * ancestor" (which would mis-classify a config error as genesis).
 */
export type GitAncestryReader = (repoRoot: string, ancestor: string, descendant: string) => boolean;

/** The default {@link GitAncestryReader} — a real `git merge-base --is-ancestor …` via `execFileSync`. */
export const defaultGitAncestry: GitAncestryReader = (repoRoot, ancestor, descendant) => {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true; // exit 0 → ancestor.
  } catch (err: unknown) {
    // `merge-base --is-ancestor` exits 1 when NOT an ancestor — a clean `false`. Any
    // OTHER non-zero exit (≥ 2 — e.g. a bad/unknown ref) or a spawn fault is an error we
    // must NOT swallow as "not an ancestor" (that would mis-read a config error as genesis).
    if (isRecord(err) && (err as { status?: unknown }).status === 1) return false;
    throw IoError(
      'git.merge-base',
      `failed to determine whether ${ancestor} is an ancestor of ${descendant} (a bad ref or a git fault — never silently "not an ancestor")`,
      { cause: err },
    );
  }
};

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
  /** The `git show <ref>:<path>` reader (default {@link defaultGitShow}). */
  readonly gitShow?: GitShowReader;
  /** The intro-commit resolver for the snapshot path (default {@link defaultGitIntro}). */
  readonly gitIntro?: GitIntroReader;
  /** The ancestry oracle (`merge-base --is-ancestor`) (default {@link defaultGitAncestry}). */
  readonly gitAncestry?: GitAncestryReader;
}

/**
 * The BOOTSTRAP-AWARE result of the raccoon-rule backstop — a discriminated state so the
 * GENESIS case (no prior baseline yet exists) is a CLEAN, LOUD pass distinct from a green
 * diff and distinct from a fail-closed config error:
 *
 *  - `active`: the base ref carries the snapshot → the diff ran; `facts` are the decided
 *    {@link StandardsIntegrityFacts} the `standardsIntegrityGate` folds.
 *  - `inactive`: the snapshot's introduction commit is NOT an ancestor of the base ref →
 *    the base PREDATES the snapshot's existence (the genesis it cannot guard). There is no
 *    prior baseline to diff against, so the backstop is INACTIVE — a LOUD pass (the
 *    `message` says so), NOT a silent green. You cannot sneak a weakening past a baseline
 *    that does not exist. It activates once the base carries the snapshot (post-merge).
 *
 * A CONFIG ERROR (the intro commit IS an ancestor of the base — the base SHOULD have the
 * snapshot — but it could not be read: unfetched / wrong path) is NEITHER state: it THROWS
 * (fail-closed), so a fetch/config fault can never masquerade as genesis.
 */
export type StandardsIntegrityResult =
  | { readonly _tag: 'active'; readonly facts: StandardsIntegrityFacts }
  | {
      readonly _tag: 'inactive';
      /** The base ref the backstop would have diffed against. */
      readonly baseRef: string;
      /** The commit that introduced the snapshot (the genesis it cannot guard at `baseRef`). */
      readonly introCommit: string;
      /** The loud, self-explaining message (printed by the gate; NOT a silent pass). */
      readonly message: string;
    };

/**
 * Compose the INACTIVE message — loud + self-explaining, naming the base, the intro commit,
 * and exactly when the backstop activates (post-merge, once the base carries the snapshot).
 */
function inactiveMessage(baseRef: string, introCommit: string): string {
  return (
    `standards backstop INACTIVE: the snapshot ${STANDARDS_SNAPSHOT_PATH} does not exist at base "${baseRef}" ` +
    `(it was introduced at ${introCommit}, which is NOT an ancestor of "${baseRef}"); the backstop activates once ` +
    `"${baseRef}" carries the snapshot — i.e. post-merge. NOT a silent pass — there is genuinely no prior baseline ` +
    `to guard, so you cannot sneak a weakening past a baseline that does not exist.`
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
 * BOOTSTRAP-AWARE: returns a {@link StandardsIntegrityResult} discriminated state. If the
 * base ref carries the snapshot → `active` (the decided facts). If the base PREDATES the
 * snapshot's existence (its introduction commit is NOT an ancestor of the base) → there is
 * no prior baseline → `inactive` (a LOUD pass, never a silent green — you cannot sneak a
 * weakening past a baseline that does not exist; the backstop activates post-merge). If the
 * base SHOULD carry the snapshot (the intro commit IS an ancestor) but it could not be read
 * → a genuine CONFIG ERROR → THROWS (fail-closed), so a fetch/path fault never poses as
 * genesis.
 */
export function buildStandardsIntegrityFacts(
  repoRoot: string,
  now: Date,
  opts: StandardsFactsOptions = {},
): StandardsIntegrityResult {
  const live = readLiveStandardsSurface(repoRoot, now);
  const baseRef = resolveStandardsBaseRef(opts.env ?? process.env);
  const gitShow = opts.gitShow ?? defaultGitShow;

  // Try to read the PRIOR baseline at the base ref. If it is present, the backstop is
  // ACTIVE and we run the normal diff.
  const raw = gitShow(repoRoot, baseRef, STANDARDS_SNAPSHOT_PATH);
  if (raw === undefined) {
    // The base ref does NOT carry the snapshot. DISTINGUISH genesis from a config error:
    // resolve the snapshot's introduction commit and ask whether it is an ANCESTOR of the
    // base. If it is NOT an ancestor, the base PREDATES the snapshot's existence → GENESIS
    // → INACTIVE (a loud pass — there is no prior baseline to guard). If it IS an ancestor
    // (the base SHOULD have it) OR the intro commit cannot be resolved (we cannot prove
    // genesis), FALL THROUGH to readBaseSnapshot, which FAILS CLOSED (the config-error path).
    const gitIntro = opts.gitIntro ?? defaultGitIntro;
    const gitAncestry = opts.gitAncestry ?? defaultGitAncestry;
    const introCommit = gitIntro(repoRoot, STANDARDS_SNAPSHOT_PATH);
    if (introCommit !== undefined && !gitAncestry(repoRoot, introCommit, baseRef)) {
      return { _tag: 'inactive', baseRef, introCommit, message: inactiveMessage(baseRef, introCommit) };
    }
    // CONFIG ERROR (intro is an ancestor of base, or unprovable genesis): fail closed.
    // `readBaseSnapshot` re-reads via the SAME seam and throws the precise tagged message.
    readBaseSnapshot(repoRoot, baseRef, gitShow);
    // `readBaseSnapshot` always throws on an undefined read; this is unreachable, but the
    // tagged throw above is the real exit — never a silent pass.
    throw InvariantViolationError(
      'standards-surface',
      `the standards snapshot ${STANDARDS_SNAPSHOT_PATH} could not be read at base "${baseRef}" and genesis could not be proven — fail-closed.`,
    );
  }

  const base = parseSnapshot(raw, `${baseRef}:${STANDARDS_SNAPSHOT_PATH}`);
  const changes = diffStandardsSurface(base.elements, live.elements);
  const signoffs = readStandardsWaivers(repoRoot);
  const alwaysBlocking = new Set(ALWAYS_BLOCKING_RULES);
  const partitioned = applyStandardsWaivers(changes, signoffs, now, alwaysBlocking);
  return {
    _tag: 'active',
    facts: { ...partitioned, committedAddress: base.address, liveAddress: live.address },
  };
}
