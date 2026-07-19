/**
 * Simulation facts — the pre-computed, host-injected DST evidence the
 * {@link simulationDeterminismGate} folds into {@link Finding}s (Slice C, the
 * avionics tier).
 *
 * This module defines the {@link SimulationFacts} INTERFACE and nothing else.
 * Like {@link RepoIR} and {@link SupplyChainFacts}, it carries NO heavy
 * dependency: `@liteship/gauntlet` stays the lean engine, so it never imports the DST
 * harness, mints a world, runs a scenario, or content-addresses a trace. A HOST
 * (the CLI's `liteship check --ir --simulate` path) runs the scenario corpus through
 * the `@liteship/core/simulation` harness — `replay`/`assertReplayDeterministic` — and
 * hands the engine these flat, already-decided facts. The gate's only job is to
 * FOLD them into Findings at the avionics level (ADR-0012: the lean engine folds
 * facts; the host computes them).
 *
 * THE DETERMINISM SPINE: a replay-DIVERGENCE (two replays of the SAME seed produce
 * DIFFERENT trace digests) is the cardinal DST failure — it means the
 * system-under-test read real time / real randomness OUTSIDE the world's injected
 * substrate, or has an ordering bug. The host records that as a fact (the two
 * digests + the seed that reproduces it); the gate folds it into a self-explaining
 * L4 Finding. The seed travels with the finding so the bug replays byte-for-byte.
 *
 * @module
 */

/**
 * The DST evidence the host supplies — the result of running the scenario corpus
 * through the `@liteship/core/simulation` harness. `runs` is EVERY scenario the host
 * replayed; an empty/absent `runs` is reported by the gate as an advisory
 * "not-evidenced" finding (honest under-coverage, never a silent green) — see
 * {@link simulationDeterminismGate}.
 */
export interface SimulationFacts {
  /** Every scenario the host replayed through the harness. */
  readonly runs?: readonly ScenarioReplayFact[];
}

/**
 * One scenario's replay verdict — the host ran it TWICE from `seed` and compared
 * the byte-exact trace digests. `divergence` is present IFF the two replays
 * disagreed (the determinism failure). A run with no `divergence` is deterministic
 * (the replay property held).
 */
export interface ScenarioReplayFact {
  /** The scenario's stable id (the corpus / regression-seed key). */
  readonly scenarioId: string;
  /** The seed both replays used — the reproducible identity of any divergence. */
  readonly seed: number;
  /**
   * The two replay trace digests. EQUAL ⇒ deterministic; the host still records
   * them so the gate can SHOW the agreeing identity on a clean run if asked.
   */
  readonly firstDigest: string;
  readonly secondDigest: string;
  /**
   * Present IFF the two replays diverged — the determinism violation. Carries the
   * human WHY and the first observable point at which the traces parted, so the
   * Finding names a concrete divergence, not just "not equal".
   */
  readonly divergence?: ReplayDivergence;
}

/**
 * The recorded detail of a replay divergence — enough to act on without re-running
 * the harness. `firstDivergentLabel` names the earliest observation point where the
 * two traces parted (or `null` when they diverged in length/shape rather than at a
 * labeled point); `detail` is the human explanation the host decided.
 */
export interface ReplayDivergence {
  /** The earliest trace label at which the two replays parted, or null. */
  readonly firstDivergentLabel: string | null;
  /** Human WHY — e.g. "step `worker.message` observed a wall-clock-derived value". */
  readonly detail: string;
}
