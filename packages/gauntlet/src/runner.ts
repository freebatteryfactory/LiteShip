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
import { runGates, type GauntletResult } from './engine.js';
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
 * Equivalent to `runGates(gates, nodeContext(opts.repoRoot, opts.globs))`.
 */
export function runGauntletOnRepo(gates: readonly Gate[], opts: RunGauntletOnRepoOptions): GauntletResult {
  return runGates(gates, nodeContext(opts.repoRoot, opts.globs));
}
