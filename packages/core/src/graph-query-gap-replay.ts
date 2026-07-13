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

  // A STATE-ONLY crossing did NOT recast the graph (no `resultId`, or `resultId === base`:
  // a pure StateCell transition). It is not a graph edge, so the branch search never
  // follows it — but it DID happen and must still hydrate its cell.
  const isStateOnly = (t: DiscreteStateTransition): boolean => t.resultId === undefined || t.resultId === t.base;

  if (localBaseId === serverGraphId) {
    // Graph UNCHANGED (a 304 conditional read, or a same-id read): there is no recast
    // branch, so a graph-RECASTING crossing (its result graph the server never adopted)
    // is not replayed — but a state-only crossing DID happen and the HTML leg may have
    // dropped it. Returning [] here (equal graph ids as no work) would leave state-only
    // SSE gaps stale. The caller's chain floor + per-cell highest-generation fold settle.
    return (byBase.get(localBaseId) ?? []).filter((entry) => isStateOnly(entry.transition)).map((e) => e.transition);
  }

  const path: DiscreteStateTransition[] = [];
  const pathEntries: PatchReceiptEntry[] = [];
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
      if (isStateOnly(entry.transition)) {
        continue; // not a graph edge — collected below, not walked
      }
      path.push(entry.transition);
      pathEntries.push(entry);
      if (search(entry.transition.resultId!)) {
        found = true;
        break;
      }
      path.pop();
      pathEntries.pop();
    }

    visiting.delete(current);
    if (!found) {
      cannotReach.add(current);
    }
    return found;
  };

  if (!search(localBaseId)) {
    return [];
  }

  // MIXED gap: the recast branch reaches the server graph, but STATE-ONLY crossings that ride
  // the branch did not recast the graph, so the `resultId`-only walk skipped them. Fold them in —
  // a pure cell crossing on base A followed by a recast A→B must still hydrate its cell.
  //
  // Gate the fold on RECEIPT-CHAIN LINEAGE, not graph `base` alone. Two forks can share a base;
  // folding by base would pull an unrelated same-base crossing off a branch the server never
  // adopted, which then either makes the caller's `validateChainDetailed` reject the WHOLE replay
  // as a broken chain, or applies a cell crossing from the wrong branch (Codex P2). The adopted
  // lineage is the `previous`-chain walking BACK from the tip receipt (the recast that reached the
  // server graph): each receipt's `previous` names its predecessor's `hash`, so the backward walk
  // traverses exactly the inline crossings (recast AND state-only) on the selected path and never
  // steps onto a fork sibling. A state-only entry is folded only when it is (a) anchored at a graph
  // state the branch visited AND (b) on that lineage. The result stays BUFFER-ordered so the
  // caller's continuity floor sees a contiguous `previous` chain.
  const byHash = new Map<string, PatchReceiptEntry>();
  for (const entry of entries) byHash.set(entry.receipt.hash, entry);
  const lineage = new Set<string>();
  const walkBack = (hash: string): void => {
    if (lineage.has(hash)) return;
    const entry = byHash.get(hash);
    if (entry === undefined) return; // a pre-gap / genesis ancestor outside the buffer — stop.
    lineage.add(hash);
    const previous = entry.receipt.previous;
    if (typeof previous === 'string') walkBack(previous);
    else for (const p of previous) walkBack(p);
  };
  const tip = pathEntries[pathEntries.length - 1];
  if (tip !== undefined) walkBack(tip.receipt.hash);

  const branchBases = new Set<string>([localBaseId, ...path.map((t) => t.resultId!)]);
  const selected = new Set<DiscreteStateTransition>(path);
  for (const entry of entries) {
    if (
      entry.receipt.kind === 'discrete-transition' &&
      isStateOnly(entry.transition) &&
      branchBases.has(entry.transition.base) &&
      lineage.has(entry.receipt.hash)
    ) {
      selected.add(entry.transition);
    }
  }
  return entries.filter((entry) => selected.has(entry.transition)).map((entry) => entry.transition);
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
