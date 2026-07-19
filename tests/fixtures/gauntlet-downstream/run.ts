/**
 * The downstream runner — composes LiteShip's built-in gate set with the project's
 * OWN custom gate and runs them over the project's source tree.
 *
 * This is the exact shape a downstream integrator writes after `npm i @liteship/gauntlet`:
 * import the built-in {@link LITESHIP_GATES}, append your own {@link noConsoleLogGate},
 * and hand the combined set to {@link runGauntletOnRepo}. The engine qualifies every
 * gate — theirs and ours — through the one authority ratchet. No fork, no rebuild,
 * no reach into the engine internals: every gauntlet import below is from the
 * package barrel `@liteship/gauntlet`, and the custom gate is a sibling module that is
 * ALSO authored only against that barrel.
 *
 * @module
 */

import { runGauntletOnRepo, LITESHIP_GATES, type Gate, type GauntletResult } from '@liteship/gauntlet';
import { noConsoleLogGate } from './no-console-log.gate.js';

/**
 * The composed gate set: LiteShip's built-ins PLUS the downstream's custom gate.
 * Composition over inheritance — a flat union, not a subclass. The custom gate sits
 * alongside the built-ins as a peer; the engine treats them identically.
 */
export const DOWNSTREAM_GATES: readonly Gate[] = [...LITESHIP_GATES, noConsoleLogGate];

/**
 * Run the composed gauntlet over the downstream project rooted at `repoRoot`,
 * scoped to its `src/**` TypeScript. Returns the structured {@link GauntletResult}
 * — the same value the CLI and an agent consume (findings + per-gate proofs +
 * the single blocking verdict).
 *
 * @param repoRoot Absolute root of the downstream project (the fixture dir).
 */
export function runDownstreamGauntlet(repoRoot: string): GauntletResult {
  return runGauntletOnRepo(DOWNSTREAM_GATES, {
    repoRoot,
    globs: ['src/**/*.ts'],
  });
}
