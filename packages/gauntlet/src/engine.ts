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
import { atLeast, rankOf, type AssuranceLevel } from './assurance.js';
import { levelOf, type LevelRule } from './assurance-map.js';
import type { FileId } from './repo-ir.js';
import { applyWaivers, type Waiver } from './waiver.js';
import { type GateVerdictCache, allFileIds, coverageDigestOf, gateVerdictKey } from './verdict-cache.js';

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
  /**
   * The PROPAGATED effective assurance levels (Slice B, B3.4) — a file's level
   * after import-graph propagation (`propagateAssuranceLevels`), so a file PULLED
   * INTO an L4 path is scoped + reported as L4 regardless of its folder ("AUTHORITY
   * decides assurance, not folder names"). Present ONLY on the IR-present (`--ir`)
   * path, where the host has the import graph to compute it.
   *
   * When present it is the SOURCE OF TRUTH for level-scoping (a file's effective
   * level instead of recomputing the glob-only {@link levelOf}) AND it ELEVATES a
   * finding's level to the effective level of its location when that is higher (so
   * a divergence on a file pulled into L4 is reported AT L4, not just the gate's
   * base level). When ABSENT (the lean path) behaviour is UNCHANGED — glob levels
   * via {@link assuranceMap}, no finding elevation. Never lowers a level (max only).
   */
  readonly effectiveLevels?: ReadonlyMap<FileId, AssuranceLevel>;
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
 * The level a file is SCOPED + REPORTED at: its PROPAGATED effective level when
 * `effectiveLevels` is supplied AND carries an entry for the file (the `--ir`
 * path — "AUTHORITY decides assurance, not folder names"), else the glob-only
 * {@link levelOf} over `map` (the lean path — UNCHANGED). The effective map only
 * ever RAISES a file above its glob floor, so consulting it never lowers a level.
 * A file absent from the effective map (e.g. a fixture file not in the IR) falls
 * back to the glob level — never a crash.
 */
function effectiveLevelOf(
  file: string,
  map: readonly LevelRule[],
  effectiveLevels?: ReadonlyMap<FileId, AssuranceLevel>,
): AssuranceLevel {
  const propagated = effectiveLevels?.get(file);
  return propagated ?? levelOf(file, map);
}

/**
 * Derive a {@link GateContext} scoped to files at-or-above `level`, per `map`.
 *
 * `readFile` and `repoRoot` are passed through unchanged; only `files()` is
 * narrowed to those whose level is `atLeast(level)`. A gate written against
 * {@link GateContext} thus only ever sees the files its rigor aims at — an L3 gate
 * run with the map drops the L0/L1 tooling entirely. Pure: no clock, no I/O, just
 * a filter over the base context's file list.
 *
 * When `effectiveLevels` is supplied (the `--ir` path), a file's PROPAGATED level
 * (import-graph propagation) is the scoping level — a file pulled into an L4 path
 * is now in an L4 gate's band even though its GLOB would have excluded it. When it
 * is OMITTED (the lean path) the glob-only {@link levelOf} is used — byte-identical
 * to before B3.4.
 */
export function scopeContextByLevel(
  context: GateContext,
  level: AssuranceLevel,
  map: readonly LevelRule[],
  effectiveLevels?: ReadonlyMap<FileId, AssuranceLevel>,
): GateContext {
  return {
    repoRoot: context.repoRoot,
    readFile: context.readFile,
    files: (): readonly string[] =>
      context.files().filter((f) => atLeast(effectiveLevelOf(f, map, effectiveLevels), level)),
    // The UNSCOPED corpus passes through verbatim — scoping narrows the JUDGED surface
    // (`files()`), NEVER the confirmer EVIDENCE. A confirmer-reading gate (the
    // claim-vs-reality family) reads `allFiles()` for its test corpus, so its evidence
    // survives level-scoping exactly as `readFile` does. Fall back to the scoped (well,
    // pre-scope) `files()` when the underlying context predates this accessor.
    allFiles: (): readonly string[] => (context.allFiles !== undefined ? context.allFiles() : context.files()),
    // Pass the injected IR through unchanged — scoping narrows `files()`, not the
    // IR (a gate that folds the IR sees the full graph; it scopes itself). Omit
    // the key entirely when no IR was injected, so the shape stays minimal.
    ...(context.ir !== undefined ? { ir: context.ir } : {}),
    // Likewise the injected supply-chain facts (Slice C): file-scoping never
    // narrows them (they describe the lockfile / SBOM / capsules / workflows, not
    // src files), so they pass through unchanged. Omit the key when absent.
    ...(context.supplyChain !== undefined ? { supplyChain: context.supplyChain } : {}),
    // Likewise the injected mutation facts (Slice C, mutation-as-divergence): the
    // facts already carry each mutant's own `file` (the gate scopes itself to the
    // file's propagated level via the IR), so file-scoping never narrows them — they
    // pass through unchanged. Omit the key when absent. WITHOUT this pass-through the
    // mutationDivergenceGate (an L4 gate, so always scoped) would see no facts and
    // throw `mutation-facts unavailable` even though the host injected them.
    ...(context.mutation !== undefined ? { mutation: context.mutation } : {}),
    // Likewise the injected MC/DC facts (the avionics MC/DC tier): each
    // McdcConditionOutcome carries its own `file` + (line, column) (the gate scopes
    // itself to the file's propagated level via the IR), so file-scoping never narrows
    // them — they pass through unchanged. Omit the key when absent. WITHOUT this
    // pass-through the mcdcCoverageGate (an L4 gate, so always scoped) would see no facts
    // and throw `mcdc-facts unavailable` even though the host injected them — exactly the
    // scoped-context drop the supplyChain/mutation pass-throughs above already fix.
    ...(context.mcdc !== undefined ? { mcdc: context.mcdc } : {}),
    // Likewise the injected DST (simulation) facts (the determinism spine): each
    // ScenarioReplayFact carries its own scenarioId (the gate folds it as an L4
    // verdict; the scenario id is the location, not a src file), so file-scoping never
    // narrows them — they pass through unchanged. Omit the key when absent. WITHOUT
    // this pass-through the simulationDeterminismGate (an L4 gate, so always scoped)
    // would see no facts and report `not-evidenced` even though the host injected the
    // corpus verdicts — exactly the scoped-context drop the supplyChain/mutation
    // pass-throughs above already fix.
    ...(context.simulation !== undefined ? { simulation: context.simulation } : {}),
    // Likewise the injected requirements-traceability facts (the avionics-tier ledger):
    // each ResolvedInvariant carries its own INV-* id + level (the gate folds it as a
    // finding at the invariant's level; the id is the location, not a src file), so
    // file-scoping never narrows them — they pass through unchanged. Omit the key when
    // absent. WITHOUT this pass-through the traceabilityBridgeGate (an L4 gate, so
    // always scoped) would see no facts and silently fold NOTHING even though the host
    // injected the resolved ledger — exactly the scoped-context drop the
    // supplyChain/mutation/simulation pass-throughs above already fix.
    ...(context.traceability !== undefined ? { traceability: context.traceability } : {}),
    // Likewise the injected standards-integrity facts (the raccoon-rule backstop):
    // each StandardsChange carries its own elementKey (the gate folds it as an L4
    // verdict; the element key is the location, not a src file), so file-scoping never
    // narrows them — they pass through unchanged. Omit the key when absent. WITHOUT
    // this pass-through the standardsIntegrityGate (an L4 gate, so always scoped) would
    // see no facts and silently fold NOTHING even though the host injected the diffed
    // surface — exactly the scoped-context drop the supplyChain/mutation/simulation/
    // traceability pass-throughs above already fix.
    ...(context.standards !== undefined ? { standards: context.standards } : {}),
    // Likewise the injected declared-fix facts (the raccoon-rule agent-fix admission,
    // phases B+C): the verdict describes the WHOLE fix (its declared scope, size, and
    // the standards before/after), not any one src file, so file-scoping never narrows
    // it — it passes through unchanged. Omit the key when absent. WITHOUT this
    // pass-through the declaredFixProtocolGate (an L4 gate, so always scoped) would see
    // no facts and silently fold NOTHING even though the host injected a rejected
    // verdict — exactly the scoped-context drop the standards/traceability pass-throughs
    // above already fix.
    ...(context.declaredFix !== undefined ? { declaredFix: context.declaredFix } : {}),
    // Likewise the injected decode-fuzz facts (the untrusted-byte decode-surface
    // hardening): each DecoderFuzzFact carries its own decoderId (the gate folds it
    // as an L4 verdict; the decoder id is the location, not a src file), so
    // file-scoping never narrows them — they pass through unchanged. Omit the key
    // when absent. WITHOUT this pass-through the fuzzCorpusGate (an L4 gate, so
    // always scoped) would see no facts and report `not-evidenced` even though the
    // host injected the per-decoder verdicts — exactly the scoped-context drop the
    // supplyChain/mutation/simulation/traceability/standards pass-throughs above fix.
    ...(context.fuzzCorpus !== undefined ? { fuzzCorpus: context.fuzzCorpus } : {}),
  };
}

/**
 * Elevate a finding's `level` to the PROPAGATED effective level of its location
 * when that is HIGHER (Slice B, B3.4) — so a divergence on a file pulled into an
 * L4 path is reported AT L4, not just the emitting gate's base level. Criticality
 * thus tracks the file's REAL assurance, not the gate's. This does NOT change
 * blocking (authority + severity decide that); it makes a finding on a
 * high-assurance file correctly LOUD in the report.
 *
 * No-ops when `effectiveLevels` is absent (the lean path — UNCHANGED), when the
 * finding has no location, when the location is not in the effective map, or when
 * the effective level is not higher than the finding's current level (max only,
 * never lowers). Returns the SAME finding object when nothing changes (stable
 * structural equality on the lean path).
 */
function elevateFindingLevel(f: Finding, effectiveLevels: ReadonlyMap<FileId, AssuranceLevel> | undefined): Finding {
  if (effectiveLevels === undefined) return f;
  const file = f.location?.file;
  if (file === undefined) return f;
  const effective = effectiveLevels.get(file);
  if (effective === undefined || rankOf(effective) <= rankOf(f.level)) return f;
  return { ...f, level: effective };
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
    // gate sees everything (back-compat). On the --ir path the PROPAGATED effective
    // levels (when present) drive scoping, so a file pulled into the gate's band by
    // an import edge is in scope even when its glob would have excluded it.
    const scoped =
      opts.assuranceMap !== undefined
        ? scopeContextByLevel(context, gate.level, opts.assuranceMap, opts.effectiveLevels)
        : context;

    // Compute the RAW gate.run findings — from the verdict cache when it HITS,
    // else by running the gate (the expensive part) and writing the result back.
    // verifyGate / earnedAuthority / applyWaivers below still run EVERY time on
    // these raw findings; only `gate.run` is ever skipped. The cache is a pure
    // speedup — `runRawCached` returns EXACTLY what `gate.run(scoped)` would.
    const rawUnelevated = armedCache !== undefined ? runRawCached(gate, scoped, armedCache) : gate.run(scoped);
    // ELEVATE each finding's level to the propagated effective level of its
    // location when that is higher (--ir path only) — a finding on a file pulled
    // into an L4 path is reported AT L4, so criticality tracks the file's REAL
    // assurance, not just the gate's. Cap-to-advisory below is independent (level
    // is criticality tagging; severity decides blocking). On the lean path
    // (no effectiveLevels) this is the identity map — findings are unchanged.
    const raw = rawUnelevated.map((f) => elevateFindingLevel(f, opts.effectiveLevels));
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
        f.severity === 'error' && (f.ruleId === 'gauntlet/waiver-expired' || f.ruleId === 'gauntlet/waiver-forbidden');
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
    // The UNSCOPED corpus — identical to `files()` here (no scoping is applied to a
    // memory context). A confirmer-reading gate's self-proof fixtures thus expose the
    // full corpus via `allFiles()`, matching the real nodeContext.
    allFiles: (): readonly string[] => [...map.keys()],
  };
}

/** Severity rollup helper re-exported for report headers. */
export type { Severity };
