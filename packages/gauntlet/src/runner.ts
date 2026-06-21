/**
 * The real-repo runner — the ONE live entrypoint that runs the gauntlet over the
 * actual tree, with the committed assurance map and the committed waivers applied.
 *
 * `runGauntletOnRepo` is the production composition of {@link runGates} +
 * {@link nodeContext}: it globs the repo into a {@link GateContext} and runs the
 * gates through the same authority ratchet the in-memory path uses. The
 * filesystem touch is confined to {@link nodeContext}; this module just composes.
 *
 * Crucially, this is NOT dead convenience sugar — {@link litelaunchGauntlet}
 * binds the real built-in gate set, the committed {@link LITESHIP_ASSURANCE_MAP},
 * and the committed {@link LITESHIP_WAIVERS} into one call. The dogfood tests
 * exercise THIS function over `packages/&#42;/src`, so the waivers in `waivers.ts`
 * actually govern a real run (a waiver that suppresses nothing on the real repo
 * has no teeth; here they do — an active boundary waiver suppresses its finding,
 * an expired one re-reds and blocks).
 *
 * @module
 */

import type { Gate } from './gate.js';
import type { RepoIR } from './repo-ir.js';
import { runGates, type GauntletResult, type RunGatesOptions } from './engine.js';
import { nodeContext } from './node-context.js';
import { LITESHIP_ASSURANCE_MAP } from './assurance-map.js';
import { LITESHIP_WAIVERS } from './waivers.js';
import { noBareThrowGate } from './gates/no-bare-throw.js';
import { noTsIgnoreGate } from './gates/no-ts-ignore.js';
import { noNondeterminismGate } from './gates/no-nondeterminism.js';
import { noSilentCatchGate } from './gates/no-silent-catch.js';
import { noSkippedTestGate } from './gates/no-skipped-test.js';
import { noPlaceholderGate } from './gates/no-placeholder.js';

/**
 * LiteShip's built-in gate set — the gates the repo runs against itself. The two
 * always-blocking gates ({@link noSkippedTestGate} / {@link noPlaceholderGate})
 * are listed alongside the four hygiene gates: their rule ids are exactly the ones
 * {@link ALWAYS_BLOCKING_RULES} reserves, so the forbidden floor now guards rules a
 * REAL gate emits (no inert surface). A downstream project composes its own gates
 * onto this set.
 */
export const LITESHIP_GATES: readonly Gate[] = [
  noBareThrowGate,
  noTsIgnoreGate,
  noNondeterminismGate,
  noSilentCatchGate,
  noSkippedTestGate,
  noPlaceholderGate,
];

/** Options for {@link runGauntletOnRepo}. */
export interface RunGauntletOnRepoOptions {
  /** Absolute root of the repo to run against. */
  readonly repoRoot: string;
  /** Repo-relative glob patterns selecting the files the gates consider. */
  readonly globs: readonly string[];
  /**
   * The INJECTED repo-IR (Slice B) — OPTIONAL. The gauntlet is the lean engine
   * and never builds an IR; a host (the CLI, via `@czap/audit`'s `ts.Program`)
   * builds it and threads it here, where it lands on the {@link GateContext} for
   * an IR-fold gate to read. Omit it (the lean path: `czap check` / MCP) and the
   * regex gates run unchanged.
   */
  readonly ir?: RepoIR;
}

/**
 * Run `gates` over the real repo at `opts.repoRoot`, scoped to `opts.globs`.
 * Equivalent to `runGates(gates, nodeContext(opts.repoRoot, opts.globs), runOpts)`
 * — the `runOpts` (assurance map, waivers, injected clock) flow straight through,
 * so a real-repo run gets the SAME level-scoping + waiver mechanism the in-memory
 * path uses. Without `runOpts.assuranceMap` every gate sees all globbed files
 * (back-compat); with it each gate is aimed at its level (no red-drowning).
 */
export function runGauntletOnRepo(
  gates: readonly Gate[],
  opts: RunGauntletOnRepoOptions,
  runOpts: RunGatesOptions = {},
): GauntletResult {
  return runGates(gates, nodeContext(opts.repoRoot, opts.globs, opts.ir), runOpts);
}

/** The default scope: every package's TypeScript source. */
export const DEFAULT_GAUNTLET_GLOBS: readonly string[] = ['packages/*/src/**/*.ts'];

/**
 * The PRODUCTION gauntlet run — the live composition the dogfood path calls.
 *
 * Binds the real built-in {@link LITESHIP_GATES}, the committed
 * {@link LITESHIP_ASSURANCE_MAP} (so each gate is aimed at its level), and the
 * committed {@link LITESHIP_WAIVERS} (so the declared boundaries are suppressed
 * and a stale/expired waiver re-reds) into ONE call over the real repo. `now` is
 * injected — never `Date.now()` — so the waiver-expiry verdict is deterministic
 * and a test can drive the clock past a boundary review to prove the teeth fire.
 *
 * This is what makes the committed waivers actually GOVERN: the waivers in
 * `waivers.ts` are evaluated against the real findings this run surfaces, scoped
 * per-gate by ruleId in {@link runGates}. A boundary waiver that matches nothing
 * goes stale (warning); one whose `expires` is past `now` re-reds and blocks.
 *
 * The optional `ir` is the INJECTED repo-IR (Slice B). The LEAN path (`czap
 * check` / MCP — `@czap/command/host`) calls this with NO `ir`: the regex gates
 * run unchanged and an IR-fold gate (Step 3) folds only when an IR is present.
 * The HOST path (the CLI/scripts, where `@czap/audit` is available) builds the
 * IR via `buildRepoIR` and threads it here, landing it on every gate's context.
 *
 * @param repoRoot Absolute root the gates resolve against.
 * @param now      The injected clock for waiver-expiry evaluation (REQUIRED — the
 *                 caller owns the date so the verdict is reproducible).
 * @param globs    The file scope (defaults to every package's source).
 * @param ir       Optional pre-built repo-IR to inject (the host path).
 */
export function litelaunchGauntlet(
  repoRoot: string,
  now: Date,
  globs: readonly string[] = DEFAULT_GAUNTLET_GLOBS,
  ir?: RepoIR,
): GauntletResult {
  return runGauntletOnRepo(
    LITESHIP_GATES,
    { repoRoot, globs, ...(ir !== undefined ? { ir } : {}) },
    { assuranceMap: LITESHIP_ASSURANCE_MAP, waivers: LITESHIP_WAIVERS, now },
  );
}
