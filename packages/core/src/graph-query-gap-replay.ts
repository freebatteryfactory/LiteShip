/**
 * Graph-native gap replay (#133-full) — StateCell + DiscreteStateTransition /
 * receipt chain over the QUERY read-leg (#119). Discrete crossings replay;
 * continuous transients do not.
 *
 * The dead-wrong `discreteSignalPayloadsFromPatch` (which derived a runtime state
 * VALUE from a {@link SignalNode}'s content-address) is DELETED. The next-state
 * value now arrives typed in the {@link DiscreteStateTransition} receipt payload
 * (`next`/`generation`), minted by the authority — nothing infers a value from
 * patch ops. Replay is attestation-checked (Law 15): a chain that fails the
 * structural floor (`validateChainDetailed`) applies nothing.
 *
 * @module
 */

import { Effect } from 'effect';
import type { ContentAddress } from './brands.js';
import type { DocumentGraph } from './document-graph.js';
import { Receipt, type ReceiptEnvelope } from './receipt.js';
import { Diagnostics } from './diagnostics.js';
import { createGraphQueryRefreshBase, graphQueryEtag, sendGraphQuery, type GraphQueryResponse } from './graph-query.js';
import type { StateCellStoreShape } from './state-cell.js';
import { applyTransition, discreteTransitionSubjectId, type DiscreteStateTransition } from './state-transition.js';
import { asReplayableRecoveryCell, type ReplayableRecoveryCell } from './stream-recovery.js';

/** A minted transition receipt paired with the {@link DiscreteStateTransition} it attests. */
export interface PatchReceiptEntry {
  readonly receipt: ReceiptEnvelope;
  readonly transition: DiscreteStateTransition;
}

/** Options for replaying discrete cells from a local transition/receipt chain. */
export interface ReplayDiscreteFromPatchReceiptsOptions {
  readonly localBaseId: ContentAddress;
  readonly serverGraphId: ContentAddress;
  readonly entries: readonly PatchReceiptEntry[];
  readonly cellStore: StateCellStoreShape;
  /** Typed host reflection of an applied crossing (e.g. dispatch to the DOM). */
  readonly applyTransition?: (transition: DiscreteStateTransition) => void;
}

/** Options for QUERY-backed graph-native gap replay (#133-full). */
export interface GraphNativeGapReplayOptions {
  readonly queryUrl: string;
  readonly localBase: DocumentGraph;
  readonly entries: readonly PatchReceiptEntry[];
  readonly cellStore: StateCellStoreShape;
  readonly adopt: (graph: DocumentGraph) => void;
  /** Typed host reflection of an applied crossing (e.g. dispatch to the DOM). */
  readonly applyTransition?: (transition: DiscreteStateTransition) => void;
  readonly fetchImpl?: typeof fetch;
  readonly maxRetries?: number;
}

/** Result of {@link runGraphNativeGapReplay}. */
export interface GraphNativeGapReplayResult {
  readonly query: GraphQueryResponse;
  readonly replayedCells: readonly ReplayableRecoveryCell[];
  readonly transitions: readonly DiscreteStateTransition[];
}

/**
 * Find the transition chain from `localBaseId` to `serverGraphId`.
 *
 * The receipt buffer may hold FORKS (multiple transitions sharing one base) and
 * partial branches (chains that never reach the server graph). Selection is a
 * depth-first path search over each transition's graph identity
 * (`base` → `resultId`): only the branch that actually ends at `serverGraphId`
 * is returned. A fork that dead-ends is backtracked, never replayed — replaying
 * a branch the server did not take would be silently wrong. When NO buffered
 * branch reaches the server graph (missing tail receipt, unrelated fork) the
 * result is EMPTY: the QUERY adoption already corrected the graph, and no
 * discrete replay beats a wrong one.
 */
export function chainPatchesBetween(
  localBaseId: ContentAddress,
  serverGraphId: ContentAddress,
  entries: readonly PatchReceiptEntry[],
): readonly DiscreteStateTransition[] {
  const byBase = new Map<string, PatchReceiptEntry[]>();
  for (const entry of entries) {
    if (entry.receipt.kind !== 'discrete-transition') {
      continue;
    }
    const list = byBase.get(entry.transition.base) ?? [];
    list.push(entry);
    byBase.set(entry.transition.base, list);
  }

  if (localBaseId === serverGraphId) {
    // Graph UNCHANGED (a 304 conditional read, or a same-id read). A graph-RECASTING
    // crossing — its `resultId` names a DIFFERENT graph — did not take effect: the
    // server never adopted that graph, so it is not replayed. But a STATE-ONLY crossing
    // (no `resultId`, or `resultId === base`: a pure cell crossing that never recast the
    // graph) DID happen and the HTML leg may have dropped it, so replay it. Returning []
    // here (treating equal graph ids as no work) would leave state-only SSE gaps stale.
    // The caller's chain floor + per-cell highest-generation fold settle each cell.
    return (byBase.get(localBaseId) ?? [])
      .filter((entry) => entry.transition.resultId === undefined || entry.transition.resultId === localBaseId)
      .map((entry) => entry.transition);
  }

  const path: DiscreteStateTransition[] = [];
  const visiting = new Set<string>();
  const cannotReach = new Set<string>();

  const search = (current: string): boolean => {
    if (current === serverGraphId) {
      return true;
    }
    if (cannotReach.has(current)) {
      return false;
    }
    if (visiting.has(current)) {
      return false;
    }
    visiting.add(current);

    let found = false;
    for (const entry of byBase.get(current) ?? []) {
      const resultId = entry.transition.resultId;
      if (!resultId) {
        continue;
      }
      path.push(entry.transition);
      if (search(resultId)) {
        found = true;
        break;
      }
      path.pop();
    }

    visiting.delete(current);
    if (!found) {
      cannotReach.add(current);
    }
    return found;
  };

  return search(localBaseId) ? path : [];
}

/**
 * Replay missed discrete crossings from a transition/receipt chain.
 *
 * The selected branch's receipts are run through the structural floor
 * ({@link Receipt.validateChainDetailed}: hash self-consistency, chain
 * continuity, HLC ordering) BEFORE anything applies — a reordered / truncated /
 * forked / HLC-regressed chain applies nothing (Law 15). Surviving transitions
 * are grouped per cell and the HIGHEST-generation one is applied via
 * {@link applyTransition}; the store's generation guard is the belt-and-suspenders.
 */
export async function replayDiscreteFromPatchReceipts(options: ReplayDiscreteFromPatchReceiptsOptions): Promise<{
  readonly replayedCells: readonly ReplayableRecoveryCell[];
  readonly transitions: readonly DiscreteStateTransition[];
}> {
  const branch = chainPatchesBetween(options.localBaseId, options.serverGraphId, options.entries);
  if (branch.length === 0) {
    return { replayedCells: [], transitions: [] };
  }

  // Chain-continuity floor over the SELECTED branch's receipts. `validateChainDetailed`
  // recomputes each envelope's sha256 hash (catches tamper / forgery), enforces
  // genesis-rooted continuity and monotonic HLC. A break refuses the whole replay —
  // the QUERY adoption already corrected the graph, so degrading discrete replay is
  // best-effort, never a wrong apply.
  const receiptByTransition = new Map<DiscreteStateTransition, ReceiptEnvelope>(
    options.entries.map((entry) => [entry.transition, entry.receipt]),
  );

  // SUBJECT-LAW floor (Law 15, defense-in-depth): each branch entry's receipt
  // subject MUST be the `${base}#${cell}` effect subject of ITS transition, so a
  // receipt minted for (base, cellA) can never be replayed against cellB or
  // another graph — even if a producer / buffer handed us a mismatched pair.
  for (const transition of branch) {
    const receipt = receiptByTransition.get(transition);
    if (
      receipt === undefined ||
      receipt.subject.type !== 'effect' ||
      receipt.subject.id !== discreteTransitionSubjectId(transition)
    ) {
      Diagnostics.warnOnce({
        source: 'czap/core.gap-replay',
        code: 'discrete-transition-subject-mismatch',
        message:
          `graph-native gap replay refused a transition for cell "${transition.cell}": its receipt subject ` +
          'does not match the `${base}#${cell}` subject law (a receipt for one cell cannot replay against ' +
          'another). The graph was still adopted; no discrete crossing was replayed.',
      });
      return { replayedCells: [], transitions: [] };
    }
  }

  const chain = branch
    .map((transition) => receiptByTransition.get(transition))
    .filter((receipt): receipt is ReceiptEnvelope => receipt !== undefined);

  const validated = await Effect.runPromise(
    Receipt.validateChainDetailed(chain).pipe(
      Effect.match({
        onFailure: (error) => ({ ok: false as const, error }),
        onSuccess: () => ({ ok: true as const }),
      }),
    ),
  );
  if (!validated.ok) {
    Diagnostics.warnOnce({
      source: 'czap/core.gap-replay',
      code: 'discrete-transition-chain-invalid',
      message:
        'graph-native gap replay refused a transition chain that failed the structural floor ' +
        `(${validated.error.type}) — the graph was still adopted, but no discrete crossing was replayed.`,
      detail: validated.error,
    });
    return { replayedCells: [], transitions: [] };
  }

  // Per-cell highest-generation crossing (the crossing target the cell ended at).
  const highestByCell = new Map<string, DiscreteStateTransition>();
  for (const transition of branch) {
    const current = highestByCell.get(transition.cell);
    if (current === undefined || transition.generation > current.generation) {
      highestByCell.set(transition.cell, transition);
    }
  }

  const replayedCells: ReplayableRecoveryCell[] = [];
  const applied: DiscreteStateTransition[] = [];
  for (const transition of highestByCell.values()) {
    try {
      const cell = applyTransition(options.cellStore, transition);
      const replayable = asReplayableRecoveryCell(cell);
      if (replayable) {
        replayedCells.push(replayable);
      }
      options.applyTransition?.(transition);
      applied.push(transition);
    } catch {
      // Unregistered cell names are skipped — the host owns the registry. Loud,
      // not silent (Law 1): a transition naming a cell the store never registered
      // is a wiring gap, not a condition to launder.
      Diagnostics.warnOnce({
        source: 'czap/core.gap-replay',
        code: 'discrete-transition-unknown-cell',
        message:
          `graph-native gap replay skipped a transition for cell "${transition.cell}": the StateCell store ` +
          'has no such registered cell. Register the cell on the host, or drop the transition from the stream.',
      });
    }
  }

  return { replayedCells, transitions: applied };
}

/**
 * Full graph-native gap replay: conditional QUERY read → adopt → transition/receipt
 * discrete replay. Does NOT widen the SSE replay payload with a signal.
 */
export async function runGraphNativeGapReplay(
  options: GraphNativeGapReplayOptions,
): Promise<GraphNativeGapReplayResult> {
  const query = await sendGraphQuery(options.queryUrl, {
    fetchImpl: options.fetchImpl,
    maxRetries: options.maxRetries,
    ifNoneMatch: graphQueryEtag(options.localBase),
  });

  if (query.status === 'ok') {
    options.adopt(query.graph);
  } else if (query.status === 'not_modified') {
    // Base unchanged — still replay discrete crossings the HTML leg may have dropped.
  } else {
    return { query, replayedCells: [], transitions: [] };
  }

  const serverGraphId = query.status === 'ok' ? query.graph.id : options.localBase.id;
  const { replayedCells, transitions } = await replayDiscreteFromPatchReceipts({
    localBaseId: options.localBase.id,
    serverGraphId,
    entries: options.entries,
    cellStore: options.cellStore,
    ...(options.applyTransition !== undefined ? { applyTransition: options.applyTransition } : {}),
  });

  return { query, replayedCells, transitions };
}

export { createGraphQueryRefreshBase };
