/**
 * The convenience runner — run a set of gates over a real repo in one call.
 *
 * `runGauntletOnRepo` is sugar over {@link runGates} + {@link nodeContext}: it
 * globs the repo into a {@link GateContext} and runs the gates through the same
 * authority ratchet the in-memory path uses. The filesystem touch is confined to
 * {@link nodeContext}; this module just composes.
 *
 * @module
 */

import type { Gate } from './gate.js';
import { runGates, type GauntletResult, type RunGatesOptions } from './engine.js';
import { nodeContext } from './node-context.js';

/** Options for {@link runGauntletOnRepo}. */
export interface RunGauntletOnRepoOptions {
  /** Absolute root of the repo to run against. */
  readonly repoRoot: string;
  /** Repo-relative glob patterns selecting the files the gates consider. */
  readonly globs: readonly string[];
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
  return runGates(gates, nodeContext(opts.repoRoot, opts.globs), runOpts);
}
