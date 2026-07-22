/**
 * The FAULT TABLE — declared, seed-driven faults a scenario injects at named
 * points, the generalization of the `receiptedMutation` `faults` concept (a
 * capsule's `cli.ship-emit` declares `empty-target-path` / `empty-version` /
 * `empty-capsule-id` faults
 * that drive its receipt to `rejected`).
 *
 * A DST fault is a DATA record (composition, no class): a named point, a kind
 * (`drop` / `delay` / `reorder` / `error`), and the seed-driven condition under
 * which it FIRES. The firing is a function of the world's seeded rng, so it is
 * reproducible: a scenario + a fault that produces a failure replays IDENTICALLY
 * from the same seed (the FoundationDB property — a bug carries its seed). The
 * fault NEVER reads ambient randomness; whether it fires is decided by the world's
 * {@link Rng} alone.
 *
 * The fault table does NOT itself perform IO or throw — it is consulted by a step
 * (via {@link consultFault}) which then SHAPES its own observable outcome (drops
 * the message, records a delay, reorders, or surfaces a tagged error as data).
 * Faults are observed as data in the trace, so a faulted run is still byte-exact
 * and replayable — that is the whole point.
 *
 * @module
 */

import type { Rng } from '../clock/rng.js';

/**
 * The four fault kinds, each a deterministic perturbation of a step's behavior:
 *  - `drop`    — the message/effect at this point does not happen (observed as a
 *    dropped outcome; downstream sees absence).
 *  - `delay`   — the effect is deferred by a deterministic number of logical ticks
 *    (observed with a recorded delay; ordering relative to peers shifts).
 *  - `reorder` — the effect's position relative to a sibling is swapped (observed
 *    as an out-of-declared-order outcome).
 *  - `error`   — the effect fails with a tagged error, surfaced as an observed
 *    failure VALUE (never a bare throw past the step boundary).
 */
export type FaultKind = 'drop' | 'delay' | 'reorder' | 'error';

/**
 * One declared fault — a DATA record. `point` is the named injection point a step
 * consults; `kind` is the perturbation; `probability` is the seed-driven firing
 * chance in `[0, 1]` (1 = always fires, 0 = never). `delayTicks` is consulted only
 * for `kind: 'delay'` (logical ticks to defer); `detail` is the human WHY woven
 * into the observed outcome and any Finding. The firing draw is taken from the
 * world's seeded {@link Rng}, so a `probability` of 0.5 fires deterministically for
 * a given seed.
 */
export interface Fault {
  /** The named injection point a step consults (e.g. `worker.message`). */
  readonly point: string;
  /** The perturbation kind. */
  readonly kind: FaultKind;
  /** Seed-driven firing chance in [0, 1]. 1 = always, 0 = never. */
  readonly probability: number;
  /** Logical ticks to defer — consulted only for `kind: 'delay'` (default 1). */
  readonly delayTicks?: number;
  /** Human WHY — woven into the observed outcome and any Finding. */
  readonly detail?: string;
}

/**
 * The fault table — the declared faults keyed by the world. A plain readonly list;
 * a scenario consults it by point. Composition: no registry class, just data the
 * world carries and {@link consultFault} folds.
 */
export type FaultTable = readonly Fault[];

/**
 * The decision a step gets back from consulting the table at a point: whether a
 * fault FIRED, and if so which one (so the step shapes its outcome). When nothing
 * fires, `fired` is `false` and the step proceeds normally — the no-fault path is
 * indistinguishable from a world with no faults at all.
 */
export type FaultDecision = { readonly fired: false } | { readonly fired: true; readonly fault: Fault };

/**
 * Consult the fault table at `point`, deciding deterministically (from the world's
 * seeded {@link Rng}) whether a declared fault fires. Draws ONE value from `rng`
 * per declared fault at this point, in declared order, so the decision is a pure
 * function of (seed, table, draw-order) — reproducible across replays. The first
 * fault whose draw is below its `probability` wins (declared order is the
 * tie-break). Returns `{ fired: false }` when no fault is declared at the point or
 * none fires.
 *
 * IMPORTANT (determinism law): this ALWAYS draws exactly one rng value per fault
 * declared at `point`, whether or not it fires — so the rng stream advances
 * identically regardless of the seed's outcome, keeping the whole run's draw
 * sequence stable. A conditional draw would fork the stream and break replay.
 */
export function consultFault(table: FaultTable, point: string, rng: Rng): FaultDecision {
  for (const fault of table) {
    if (fault.point !== point) continue;
    // Always draw — advancing the stream deterministically regardless of outcome.
    const draw = rng.next();
    if (draw < fault.probability) {
      return { fired: true, fault };
    }
  }
  return { fired: false };
}
