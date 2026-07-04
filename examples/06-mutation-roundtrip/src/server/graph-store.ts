/**
 * The host's authoritative graph store — the authority boundary.
 *
 * In-memory for the demo; a real host swaps the body of loadGraph/saveGraph for
 * KV / a DB / a per-session store. The channel doesn't care where it lives — it
 * only validates a client's proposed patch against whatever loadGraph returns.
 */
import { sealNode, sealGraph } from '@czap/core';
import type { DocumentGraph, DocumentGraphNode, DocumentGraphEdge, SignalNode, CellMeta, GraphStore } from '@czap/core';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'server' },
  updated: { wall_ms: 0, counter: 0, node_id: 'server' },
  version: 1,
};

const signal = (input: string): SignalNode =>
  sealNode({ _tag: 'DocGraphSignalNode', _version: 1, family: 'signal', id: '', meta: META, input } as unknown as SignalNode);

const build = (nodes: DocumentGraphNode[], edges: DocumentGraphEdge[] = []): DocumentGraph =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<DocumentGraph, 'id' | 'digest'>);

// The server's current truth — a small graph with two signals.
let current: DocumentGraph = build([signal('scroll.y'), signal('viewport.width')]);

export const store: GraphStore = {
  loadGraph: () => current,
  // Compare-and-swap: `expected` is the base graph the patch was validated against.
  // Reject a write whose base has been superseded by a concurrent commit (trivial
  // in-memory; a real host does a version-conditional DB/KV update).
  saveGraph: (next, expected) => {
    if (current.id !== expected.id) return false;
    current = next;
    return true;
  },
};

/** Read the current server graph (for SSR + the GET endpoint). */
export const currentGraph = (): DocumentGraph => current;
