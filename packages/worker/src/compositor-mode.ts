/**
 * The compositor worker's startup-to-steady transition machine.
 *
 * The host side of a compositor worker runs in one of two macro modes:
 *
 * - **`startup`** — registrations and updates are *staged* into a single
 *   {@link StartupPacketState} and held until the first `requestCompute`,
 *   so the worker boots from one coalesced `startup-compute` post instead
 *   of a chatter of per-message sends.
 * - **`steady`** — the worker is live; mutations flush incrementally. The
 *   first compute after leaving startup is still in flight until the
 *   worker's initial `state` reply lands (`firstStateDispatchCompletedNs`
 *   / `firstStatePending`), and resolved-state dispatches are correlated
 *   against `resolvedStateDispatchCompletedNs` so a late ack can be matched
 *   to its send.
 *
 * This module owns ONLY the discriminant-and-timing fields of that
 * machine, as an explicit `_tag`-discriminated record. It carries no
 * `Worker`, no registration tables, and no listeners — those are separate
 * concerns on {@link CompositorWorkerRuntimeState}. Every transition is a
 * standalone function over the record, so a reader sees the whole mode
 * surface in one place instead of chasing ~5 captured `let` flags.
 *
 * NOTE on the seam: `requestCompute` leaves `startup` for `steady`
 * *immediately* (so a follow-up `evaluate` queues a steady update rather
 * than re-staging into the startup packet), while the startup compute it
 * dispatched is still awaiting the worker's first `state` reply — that
 * "dispatched but unsettled" condition is `firstStatePending` ON the
 * steady record, exactly mirroring the old `startupMode=false` +
 * `startupStatePending=true` flag pair.
 *
 * @module
 */

/**
 * Startup phase: messages are staged into the startup packet, not yet sent
 * to a live worker.
 */
export interface StartupMode {
  readonly _tag: 'startup';
}

/**
 * Steady phase: the worker is live.
 */
export interface SteadyMode {
  readonly _tag: 'steady';
  /**
   * `currentTimeNs()` captured when the first (startup) compute dispatch
   * finished, or `null` when no startup compute is awaiting its first
   * `state` reply. Feeds the `state-delivery:message-receipt` telemetry
   * delta.
   */
  firstStateDispatchCompletedNs: number | null;
  /** Whether the first compute is awaiting the worker's initial `state` reply. */
  firstStatePending: boolean;
  /**
   * `currentTimeNs()` captured when a resolved-state dispatch finished, or
   * `null` when none is outstanding. Feeds the resolved-state-ack receipt
   * telemetry delta.
   */
  resolvedStateDispatchCompletedNs: number | null;
  /** Whether a resolved-state dispatch is awaiting its ack. */
  resolvedStateAckPending: boolean;
}

/** The compositor's startup-to-steady macro mode. */
export type CompositorMode = StartupMode | SteadyMode;

/** Build the initial `startup` mode. */
export function initialMode(): StartupMode {
  return { _tag: 'startup' };
}

/** Type guard: the machine is still staging startup messages. */
export function isStartup(mode: CompositorMode): mode is StartupMode {
  return mode._tag === 'startup';
}

/**
 * Build a fresh `steady` mode. `firstStatePending` defaults to `false`;
 * `requestCompute`'s startup-crossing path sets it (with the dispatch
 * timestamp) when it ships the first compute.
 */
export function steadyMode(
  init: {
    readonly firstStateDispatchCompletedNs?: number | null;
    readonly firstStatePending?: boolean;
  } = {},
): SteadyMode {
  return {
    _tag: 'steady',
    firstStateDispatchCompletedNs: init.firstStateDispatchCompletedNs ?? null,
    firstStatePending: init.firstStatePending ?? false,
    resolvedStateDispatchCompletedNs: null,
    resolvedStateAckPending: false,
  };
}
