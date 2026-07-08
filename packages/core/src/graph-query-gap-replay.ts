/**
 * Graph-native gap replay (#133-full) — StateCell + patch/receipt chain over the
 * QUERY read-leg (#119). Discrete crossings replay; continuous transients do not.
 *
 * @module
 */

import type { ContentAddress } from './brands.js';
import type { DocumentGraph } from './document-graph.js';
import type { GraphPatch } from './graph-patch.js';
import type { Receipt } from './receipt.js';
import { createGraphQueryRefreshBase, graphQueryEtag, sendGraphQuery, type GraphQueryResponse } from './graph-query.js';
import { inputToSource } from './signal-input.js';
import type { StateCellStoreShape } from './state-cell.js';
import { asReplayableRecoveryCell, filterDiscreteSnapshotSignals, signalSourceKind } from './stream-recovery.js';

type ReceiptEnvelope = Receipt.Envelope;

/** A minted graph-patch receipt paired with the patch bytes it attests. */
export interface PatchReceiptEntry {
  readonly receipt: ReceiptEnvelope;
  readonly patch: GraphPatch;
}

/** Options for replaying discrete cells from a local patch/receipt chain. */
export interface ReplayDiscreteFromPatchReceiptsOptions {
  readonly localBaseId: ContentAddress;
  readonly serverGraphId: ContentAddress;
  readonly entries: readonly PatchReceiptEntry[];
  readonly cellStore: StateCellStoreShape;
  readonly applyDiscrete?: (payload: unknown) => void;
}

/** Options for QUERY-backed graph-native gap replay (#133-full). */
export interface GraphNativeGapReplayOptions {
  readonly queryUrl: string;
  readonly localBase: DocumentGraph;
  readonly entries: readonly PatchReceiptEntry[];
  readonly cellStore: StateCellStoreShape;
  readonly adopt: (graph: DocumentGraph) => void;
  readonly applyDiscrete?: (payload: unknown) => void;
  readonly fetchImpl?: typeof fetch;
  readonly maxRetries?: number;
}

/** Result of {@link runGraphNativeGapReplay}. */
export interface GraphNativeGapReplayResult {
  readonly query: GraphQueryResponse;
  readonly replayedCells: readonly ReturnType<typeof asReplayableRecoveryCell>[];
  readonly discretePayloads: readonly unknown[];
}

/** Extract replayable discrete signal payloads from a validated patch's ops. */
export function discreteSignalPayloadsFromPatch(patch: GraphPatch): readonly Record<string, unknown>[] {
  const payloads: Record<string, unknown>[] = [];

  for (const op of patch.ops) {
    if (op.op !== 'add' || !('node' in op) || op.family !== 'signal') {
      continue;
    }

    const signalNode = op.node;
    if (signalNode.family !== 'signal') {
      continue;
    }

    const input = signalNode.input;
    const source = inputToSource(input);
    const kind = source ? signalSourceKind(source) : 'discrete';

    if (kind !== 'discrete') {
      continue;
    }

    if (source?.type === 'custom' || input.endsWith('.state') || input === 'state' || input.includes('mode')) {
      payloads.push({ state: input });
      continue;
    }

    payloads.push({ [input]: signalNode.id });
  }

  return payloads;
}

/** Walk a linear patch/receipt chain from `localBaseId` toward `serverGraphId`. */
export function chainPatchesBetween(
  localBaseId: ContentAddress,
  serverGraphId: ContentAddress,
  entries: readonly PatchReceiptEntry[],
): readonly GraphPatch[] {
  if (localBaseId === serverGraphId) {
    return [];
  }

  const byBase = new Map<string, PatchReceiptEntry[]>();
  for (const entry of entries) {
    if (entry.receipt.kind !== 'graph-patch') {
      continue;
    }
    const list = byBase.get(entry.patch.base) ?? [];
    list.push(entry);
    byBase.set(entry.patch.base, list);
  }

  const chain: GraphPatch[] = [];
  let current = localBaseId;

  for (let guard = 0; guard <= entries.length; guard++) {
    if (current === serverGraphId) {
      break;
    }

    const candidates = byBase.get(current);
    if (!candidates || candidates.length === 0) {
      break;
    }

    const direct = candidates.find((entry) => entry.patch.resultId === serverGraphId);
    const next = direct ?? candidates[0]!;
    chain.push(next.patch);

    if (!next.patch.resultId) {
      break;
    }
    current = next.patch.resultId;
  }

  return chain;
}

/**
 * Replay missed discrete crossings from a patch/receipt chain — continuous
 * transients are stripped by the discrete/continuous law.
 */
export function replayDiscreteFromPatchReceipts(options: ReplayDiscreteFromPatchReceiptsOptions): {
  readonly replayedCells: readonly NonNullable<ReturnType<typeof asReplayableRecoveryCell>>[];
  readonly discretePayloads: readonly unknown[];
} {
  const patches = chainPatchesBetween(options.localBaseId, options.serverGraphId, options.entries);
  const rawPayloads: unknown[] = [];

  for (const patch of patches) {
    for (const payload of discreteSignalPayloadsFromPatch(patch)) {
      rawPayloads.push(payload);
    }
  }

  const discretePayloads = filterDiscreteSnapshotSignals(rawPayloads);
  const replayedCells: NonNullable<ReturnType<typeof asReplayableRecoveryCell>>[] = [];

  for (const payload of discretePayloads) {
    if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;
      if (typeof record.state === 'string') {
        try {
          const cell = options.cellStore.hydrateDiscrete('state', record.state, 0);
          const replayable = asReplayableRecoveryCell(cell);
          if (replayable) {
            replayedCells.push(replayable);
          }
        } catch {
          // Unregistered cell names are skipped — the host owns the registry.
        }
      } else {
        for (const [name, value] of Object.entries(record)) {
          if (typeof value !== 'string') {
            continue;
          }
          try {
            const cell = options.cellStore.hydrateDiscrete(name, value, 0);
            const replayable = asReplayableRecoveryCell(cell);
            if (replayable) {
              replayedCells.push(replayable);
            }
          } catch {
            // Unregistered cell names are skipped — the host owns the registry.
          }
        }
      }
    }

    options.applyDiscrete?.(payload);
  }

  return { replayedCells, discretePayloads };
}

/**
 * Full graph-native gap replay: conditional QUERY read → adopt → patch/receipt
 * discrete replay. Does NOT widen the SSE replay payload.
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
    return { query, replayedCells: [], discretePayloads: [] };
  }

  const serverGraphId = query.status === 'ok' ? query.graph.id : options.localBase.id;
  const { replayedCells, discretePayloads } = replayDiscreteFromPatchReceipts({
    localBaseId: options.localBase.id,
    serverGraphId,
    entries: options.entries,
    cellStore: options.cellStore,
    applyDiscrete: options.applyDiscrete,
  });

  return { query, replayedCells, discretePayloads };
}

export { createGraphQueryRefreshBase };
