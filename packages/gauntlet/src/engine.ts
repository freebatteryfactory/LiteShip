/**
 * The engine — compose gates into a run.
 *
 * `runGates` verifies each gate against its fixtures (the authority ratchet),
 * runs the qualified gates over the real context, and applies each gate's
 * EARNED authority to its findings: a self-proven gate's `error` findings can
 * block; an unproven gate's findings are capped to `advisory` (they surface but
 * never fail the run). The result carries the findings, the per-gate proofs
 * (the receipts), and the single blocking verdict.
 *
 * This is the metacircular core: the gauntlet's own gates are just gates, run
 * through this same path, qualified by this same ratchet.
 *
 * @module
 */

import type { GateContext, Gate } from './gate.js';
import type { Finding, Severity } from './finding.js';
import { verifyGate, earnedAuthority, type Authority, type GateProof } from './authority.js';
import { atLeast, type AssuranceLevel } from './assurance.js';
import { levelOf, type LevelRule } from './assurance-map.js';
import { applyWaivers, type Waiver } from './waiver.js';
import {
  type GateVerdictCache,
  allFileIds,
  coverageDigestOf,
  gateVerdictKey,
} from './verdict-cache.js';

/** A gate's outcome within a run: its proof, earned authority, and findings. */
export interface GateOutcome {
  readonly gateId: string;
  readonly proof: GateProof;
  readonly authority: Authority;
  /** Findings KEPT (post-waiver), with authority already applied to severity. */
  readonly findings: readonly Finding[];
  /** Findings a valid waiver suppressed for this gate (audit trail). */
  readonly waived: readonly Finding[];
  /** Findings ABOUT this gate's waivers (expired / stale / forbidden). */
  readonly waiverFindings: readonly Finding[];
}

/** The result of a gauntlet run. */
export interface GauntletResult {
  /** All KEPT findings across all gates, with authority already applied to severity. */
  readonly findings: readonly Finding[];
  /** Per-gate outcomes (proofs = the qualification receipts). */
  readonly outcomes: readonly GateOutcome[];
  /** True iff any self-proven (blocking) gate emitted an `error` finding, or a waiver expired/was forbidden. */
  readonly blocked: boolean;
}

/** Options for {@link runGates} — all optional, all back-compatible. */
export interface RunGatesOptions {
  /**
   * The assurance map used to SCOPE each gate to files at-or-above its level.
   * Omit to run every gate over ALL files (back-compat — no level scoping).
   */
  readonly assuranceMap?: readonly LevelRule[];
  /** Waivers applied to every gate's findings (matched → suppressed). */
  readonly waivers?: readonly Waiver[];
  /** Injected clock for waiver-expiry evaluation. Defaults to the epoch (no expiry) — NEVER `Date.now()`. */
  readonly now?: Date;
  /**
   * The INJECTED content-addressed verdict cache (Slice B, B2). When present
   * ALONGSIDE {@link toolchainDigest}, each gate's RAW `gate.run` output is cached
   * against the content digest of its covered files; an unchanged digest serves
   * the cached raw findings and SKIPS the expensive `gate.run`. Omit it (the lean
   * `czap check` / MCP path, or any caller that wants a full run) and the engine
   * behaves EXACTLY as before — a full run, no caching. The cache NEVER changes a
   * verdict; it only avoids recomputing a provably-identical one. See
   * {@link GateVerdictCache} for the soundness model.
   */
  readonly cache?: GateVerdictCache;
  /**
   * The host's TOOLCHAIN DIGEST — a hash that CHANGES when the gauntlet's gate
   * logic changes (a gate edit → rebuilt dist → new digest). REQUIRED for caching
   * (passing {@link cache} without it is treated as no cache): it is the anti-lie
   * keystone that invalidates every cached verdict when gate LOGIC changes, even
   * when the covered files are byte-identical. Host-computed (the CLI), never here.
   */
  readonly toolchainDigest?: string;
  /**
   * The environment fingerprint folded into every cache key (node / platform /
   * arch / pm), so a verdict cached under one toolchain is never served to
   * another. Defaults to an empty fingerprint (the host supplies the real one);
   * only consulted on the cache path.
   */
  readonly env?: Readonly<Record<string, string>>;
}

/** Cap a finding's severity to `advisory` (for gates that have not self-proven). */
function asAdvisory(f: Finding): Finding {
  return f.severity === 'advisory' ? f : { ...f, severity: 'advisory' };
}

/**
 * Derive a {@link GateContext} scoped to files at-or-above `level`, per `map`.
 *
 * `readFile` and `repoRoot` are passed through unchanged; only `files()` is
 * narrowed to those whose {@link levelOf} is `atLeast(level)`. A gate written
 * against {@link GateContext} thus only ever sees the files its rigor aims at —
 * an L3 gate run with the map drops the L0/L1 tooling entirely. Pure: no clock,
 * no I/O, just a filter over the base context's file list.
 */
export function scopeContextByLevel(
  context: GateContext,
  level: AssuranceLevel,
  map: readonly LevelRule[],
): GateContext {
  return {
    repoRoot: context.repoRoot,
    readFile: context.readFile,
    files: (): readonly string[] => context.files().filter((f) => atLeast(levelOf(f, map), level)),
    // Pass the injected IR through unchanged — scoping narrows `files()`, not the
    // IR (a gate that folds the IR sees the full graph; it scopes itself). Omit
    // the key entirely when no IR was injected, so the shape stays minimal.
    ...(context.ir !== undefined ? { ir: context.ir } : {}),
  };
}

/** The epoch — the default `now` when none is injected (so no waiver expires by default). */
const EPOCH = new Date(0);

/**
 * The armed verdict cache — the store + the toolchain digest + the env, captured
 * together AFTER the both-present check so the cache path needs no narrowing cast.
 * Present iff `runGates` was given BOTH a `cache` and a `toolchainDigest`.
 */
interface ArmedCache {
  readonly store: GateVerdictCache;
  readonly toolchainDigest: string;
  readonly env: Readonly<Record<string, string>>;
}

/**
 * Compute a gate's RAW `gate.run` findings through the verdict cache (Slice B,
 * B2). Returns EXACTLY what `gate.run(scoped)` would — the cache is a pure
 * speedup that never changes the verdict, only avoids recomputing a
 * provably-identical one.
 *
 * The SOUNDNESS contract (every uncertain case MISSES — re-runs — never serves):
 *
 * 1. NO IR present — a gate (e.g. a text-only regex gate) running with no injected
 *    `ir` CANNOT be content-keyed (there are no `contentDigest`s to key on). The
 *    cache MISSES UNCONDITIONALLY: we run the gate and do NOT write (there is no
 *    sound key to write under). This is the no-IR soundness rail: you cannot cache
 *    what you cannot content-address.
 * 2. IR present — the gate's covered FileIds are `gate.coverage?.(ir)` (the OPT-IN
 *    narrowing) or {@link allFileIds} (the conservative default: every file). The
 *    coverage digest folds those files' `(FileId, contentDigest)` pairs; the key
 *    binds it to the gateId, the toolchainDigest, and the env. `cache.read(key)`
 *    HITS → return the cached raw findings (skip `gate.run`); MISSES → run the
 *    gate and `cache.write(key, raw)`.
 *
 * Because the key includes the toolchainDigest, a gate-LOGIC change (rebuilt dist
 * → new digest) flips the key for unchanged files too — the anti-lie keystone.
 */
function runRawCached(gate: Gate, scoped: GateContext, cache: ArmedCache): readonly Finding[] {
  const ir = scoped.ir;
  if (ir === undefined) {
    // No IR ⇒ nothing to content-address ⇒ the cache MUST MISS (never serve a
    // verdict we cannot tie to content). Run, but do not write.
    return gate.run(scoped);
  }
  const covered = gate.coverage !== undefined ? gate.coverage(ir) : allFileIds(ir);
  const coverageDigest = coverageDigestOf(covered, ir);
  const key = gateVerdictKey({
    toolchainDigest: cache.toolchainDigest,
    gateId: gate.id,
    coverageDigest,
    env: cache.env,
  });

  const hit = cache.store.read(key);
  if (hit !== null) return hit;

  const raw = gate.run(scoped);
  cache.store.write(key, raw);
  return raw;
}

/**
 * Run a set of gates over `context`. Each gate is first verified against its own
 * fixtures; unproven gates run but are demoted to advisory. When `opts.assuranceMap`
 * is given, each gate sees ONLY files at-or-above its level (rigor scoping — no
 * more red-drowning); without it every gate sees all files (back-compat). When
 * `opts.waivers` are given, they are applied to each gate's findings against the
 * injected `opts.now` (defaults to the epoch — NEVER `Date.now()`): matched
 * findings are suppressed, and expired/stale/forbidden waivers surface as their
 * own findings (expired + forbidden BLOCK).
 *
 * Returns the merged KEPT findings, the proofs, and whether a blocking gate (or a
 * blocking waiver finding) failed the run.
 */
export function runGates(gates: readonly Gate[], context: GateContext, opts: RunGatesOptions = {}): GauntletResult {
  const outcomes: GateOutcome[] = [];
  const allFindings: Finding[] = [];
  const now = opts.now ?? EPOCH;
  const waivers = opts.waivers ?? [];
  // The cache is ARMED only when BOTH a store and a toolchainDigest are supplied:
  // without the toolchainDigest a gate-logic change could not invalidate a cached
  // verdict (the lie). A cache without a digest is therefore treated as no cache.
  // Capture the narrowed pair in one value so the per-gate path needs no cast.
  const armedCache: ArmedCache | undefined =
    opts.cache !== undefined && opts.toolchainDigest !== undefined
      ? { store: opts.cache, toolchainDigest: opts.toolchainDigest, env: opts.env ?? {} }
      : undefined;
  let blocked = false;

  for (const gate of gates) {
    const proof = verifyGate(gate);
    const authority = earnedAuthority(proof);

    // Scope the context to the gate's level when a map is supplied; otherwise the
    // gate sees everything (back-compat).
    const scoped =
      opts.assuranceMap !== undefined ? scopeContextByLevel(context, gate.level, opts.assuranceMap) : context;

    // Compute the RAW gate.run findings — from the verdict cache when it HITS,
    // else by running the gate (the expensive part) and writing the result back.
    // verifyGate / earnedAuthority / applyWaivers below still run EVERY time on
    // these raw findings; only `gate.run` is ever skipped. The cache is a pure
    // speedup — `runRawCached` returns EXACTLY what `gate.run(scoped)` would.
    const raw = armedCache !== undefined ? runRawCached(gate, scoped, armedCache) : gate.run(scoped);
    const authed = authority === 'blocking' ? raw : raw.map(asAdvisory);

    // Apply waivers AFTER authority (a waiver suppresses a kept finding; it does
    // not resurrect an advisory-demoted one). Waiver findings carry their OWN
    // severity (expired/forbidden = error → block; stale = warning).
    //
    // SCOPE the waivers to THIS gate by ruleId: a waiver targets one rule, and a
    // gate only emits its own rule's findings, so a no-silent-catch waiver must
    // not be evaluated against the no-bare-throw gate — otherwise it would look
    // "stale" (matches nothing) at every OTHER gate. Staleness is only meaningful
    // among the waivers for the rule the gate actually runs.
    const gateWaivers = waivers.filter((w) => w.ruleId === gate.id);
    const { kept, waived, waiverFindings } = applyWaivers(authed, gateWaivers, now);

    const outcomeFindings = [...kept, ...waiverFindings];
    for (const f of outcomeFindings) {
      allFindings.push(f);
      // A blocking gate's `error` blocks; a waiver-expired/forbidden `error`
      // blocks unconditionally (the waiver mechanism has teeth regardless of the
      // gate's earned authority).
      const isWaiverError =
        f.severity === 'error' &&
        (f.ruleId === 'gauntlet/waiver-expired' || f.ruleId === 'gauntlet/waiver-forbidden');
      if ((authority === 'blocking' && f.severity === 'error' && kept.includes(f)) || isWaiverError) {
        blocked = true;
      }
    }

    outcomes.push({ gateId: gate.id, proof, authority, findings: kept, waived, waiverFindings });
  }

  return { findings: allFindings, outcomes, blocked };
}

/**
 * An in-memory {@link GateContext} over a `path → text` map — the substrate for
 * fixtures and tests. A gate written against {@link GateContext} runs against
 * this identically to the real repo, so red/green fixtures need no filesystem.
 */
export function memoryContext(files: Readonly<Record<string, string>>, repoRoot = '/virtual'): GateContext {
  const map = new Map(Object.entries(files));
  return {
    repoRoot,
    readFile: (relativePath: string): string | undefined => map.get(relativePath),
    files: (): readonly string[] => [...map.keys()],
  };
}

/** Severity rollup helper re-exported for report headers. */
export type { Severity };
