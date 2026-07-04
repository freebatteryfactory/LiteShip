/**
 * Shared sealed-graph fixture builders for the mutation-channel test suites — the ONE
 * definition of the deterministic `META` clock stub and the sealed signal-node/graph
 * builders. Three suites (graph-mutation, graph-mutation-client, graph-form) previously
 * carried byte-identical copies; the `as unknown as SignalNode` cast is deliberately
 * fragile glue over the node shape, so it must live in exactly one place — a node-shape
 * change then breaks one file loudly instead of letting three copies rot independently.
 */
import { sealGraph, sealNode } from '@czap/core';
import type { CellMeta, DocumentGraph, DocumentGraphEdge, DocumentGraphNode, SignalNode } from '@czap/core';

export const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

export const node = (input: string): SignalNode =>
  sealNode({ _tag: 'DocGraphSignalNode', _version: 1, family: 'signal', id: '', meta: META, input } as unknown as SignalNode);

export const graph = (nodes: DocumentGraphNode[], edges: DocumentGraphEdge[] = []): DocumentGraph =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<DocumentGraph, 'id' | 'digest'>);
