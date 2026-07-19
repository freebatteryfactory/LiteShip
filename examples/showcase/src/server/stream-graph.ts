/**
 * The authority side of graph-native stream recovery (#133-full) — the "emit leg".
 *
 * The stream pushes server→client. When the host authority crosses a DISCRETE
 * state (`StateCellStore.applyDiscrete` → the cell's generation increments on a
 * real index change), it mints a {@link DiscreteStateTransition} receipt with
 * `mintTransition(prev, next, { base, resultId })` and emits it on the SSE stream
 * as a `{ type: 'receipt', data: { receipt, transition } }` frame. The client
 * ATTESTS that frame (hash self-consistency + `${base}#${cell}` subject law)
 * before buffering it, then — after a disconnect gap — QUERYs this module's read
 * leg, re-adopts the server graph, and replays the buffered crossing by
 * generation. This module is the deterministic, in-memory authority the showcase
 * routes share; a real host swaps the graph/store for KV / a DB / a session store.
 *
 * @module
 */
import { StateCellStore, mintTransition, sealGraph, sealNode } from '@liteship/core';
import type {
  CellMeta,
  DocumentGraph,
  DocumentGraphNode,
  ReceiptEnvelope,
  SignalNode,
  DiscreteStateTransition,
} from '@liteship/core';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'showcase' },
  updated: { wall_ms: 0, counter: 0, node_id: 'showcase' },
  version: 1,
};

const signal = (input: string): SignalNode =>
  sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '',
    meta: META,
    input,
  } as unknown as SignalNode);

const build = (nodes: DocumentGraphNode[]): DocumentGraph =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges: [] } as Omit<
    DocumentGraph,
    'id' | 'digest'
  >);

/**
 * The two authoritative graph identities the demo crossing spans:
 *   - `INITIAL_GRAPH` (G0) is inlined into the page as the client's local base;
 *   - `CURRENT_GRAPH` (G1) is what the QUERY read leg returns after the crossing
 *     recast the graph. `chainPatchesBetween(G0.id, G1.id, entries)` walks the
 *     `base → resultId` chain, so the emitted transition MUST carry
 *     `{ base: G0.id, resultId: G1.id }` for gap replay to select it.
 */
export const INITIAL_GRAPH: DocumentGraph = build([signal('workspace.collapsed')]);
export const CURRENT_GRAPH: DocumentGraph = build([signal('workspace.collapsed'), signal('workspace.expanded')]);

/** The StateCell registrations the crossing replays INTO — inlined for the client store. */
export const STREAM_CELL_REGISTRATIONS = [{ name: 'workspace', states: ['collapsed', 'expanded'] as const }] as const;

/** The resumption artifact id shared by the page, the SSE route, and recovery. */
export const STREAM_ARTIFACT_ID = 'showcase-workspace';

let cachedFrame: Promise<{ readonly receipt: ReceiptEnvelope; readonly transition: DiscreteStateTransition }> | null =
  null;

/**
 * Mint the attested transition receipt for the `workspace: collapsed → expanded`
 * crossing, memoized. The crossing is driven through a real
 * {@link StateCellStore.applyDiscrete} (generation 0 → 1 on the index change), so
 * the transition's `next`/`generation` are the authority's, not inferred from the
 * graph — the exact contract `mintTransition` encodes.
 */
export function crossingReceipt(): Promise<{
  readonly receipt: ReceiptEnvelope;
  readonly transition: DiscreteStateTransition;
}> {
  cachedFrame ??= (async () => {
    const store = StateCellStore.create();
    store.register('workspace', ['collapsed', 'expanded']);
    const previous = store.snapshot('workspace'); // collapsed, generation 0
    const next = store.applyDiscrete('workspace', 'expanded'); // expanded, generation 1
    return mintTransition(previous, next, { base: INITIAL_GRAPH.id, resultId: CURRENT_GRAPH.id });
  })();
  return cachedFrame;
}

/** The serialized SSE `receipt` frame body for the crossing (`data: <json>\n\n`). */
export async function crossingReceiptFrame(): Promise<string> {
  const { receipt, transition } = await crossingReceipt();
  return JSON.stringify({ type: 'receipt', data: { receipt, transition } });
}
