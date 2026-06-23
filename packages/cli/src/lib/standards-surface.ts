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
 * Resolve the BASE REF the live surface is diffed against — the snapshot the change is
 * being REVIEWED against, NOT the working-tree snapshot. Deterministic precedence:
 *
 *  1. `CZAP_STANDARDS_BASE_REF` — an explicit override (CI sets it to the PR base, e.g.
 *     `origin/main` or the merge-base SHA). Highest authority: the host KNOWS the base.
 *  2. `GITHUB_BASE_REF` — GitHub Actions sets this on a pull_request run to the target
 *     branch name; we read it as `origin/<branch>` (the fetched remote-tracking ref).
 *  3. {@link STANDARDS_DEFAULT_BASE_REF} (`main`) — the integration baseline for a local
 *     run / a push to a feature branch.
 *
 * Returns the chosen ref STRING (resolution of whether the snapshot exists at that ref
 * is the caller's fail-closed job). Reads only `env` (injected for determinism/tests).
 */
export function resolveStandardsBaseRef(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env[STANDARDS_BASE_REF_ENV];
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim();
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
 */
export function buildStandardsIntegrityFacts(
  repoRoot: string,
  now: Date,
  opts: StandardsFactsOptions = {},
): StandardsIntegrityFacts {
  const live = readLiveStandardsSurface(repoRoot, now);
  const baseRef = resolveStandardsBaseRef(opts.env ?? process.env);
  const base = readBaseSnapshot(repoRoot, baseRef, opts.gitShow ?? defaultGitShow);
  const changes = diffStandardsSurface(base.elements, live.elements);
  const signoffs = readStandardsWaivers(repoRoot);
  const alwaysBlocking = new Set(ALWAYS_BLOCKING_RULES);
  const partitioned = applyStandardsWaivers(changes, signoffs, now, alwaysBlocking);
  return { ...partitioned, committedAddress: base.address, liveAddress: live.address };
}
