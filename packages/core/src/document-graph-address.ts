/**
 * DocumentGraph addressing + validation kernel.
 *
 * The ONLY mint site for DocumentGraph node and graph ids — exactly as
 * `makeEntityId` (composable.ts) is the only mint site for `EntityId`. Routes
 * through the shared `content-address.ts` kernel so the fnv1a identity law
 * cannot diverge from the EntityId/BoundaryDef law. The graph-level integrity
 * digest is the paired `AddressedDigest` (sha256) over the SAME bytes, so the
 * two laws (identity vs receipt) cannot disagree.
 *
 * Structural validation (cycle + dangling-edge integrity) and topological
 * linearization REUSE `Plan.validate` / `Plan.topoSort` by lifting the graph to
 * a synthetic `PlanIR` over node-id endpoints — no reimplementation.
 *
 * @module
 */

import type { ContentAddress, AddressedDigest } from './brands.js';
import { fnv1aBytes } from './fnv.js';
import { canonicalAddressBytes, contentAddressOf } from './content-address.js';
import { AddressedDigest as AddressedDigestNS } from './addressed-digest.js';
import { Plan } from './plan.js';
import type { PlanIR, PlanValidationError } from './plan.js';
import type { DocumentGraph as DocGraph, DocumentGraphNode, DocumentGraphEdge } from './document-graph.js';

/**
 * Mint the content address for a node: `fnv1a` over the canonical CBOR of the
 * payload, EXCLUDING the `id` (derived) and the volatile `meta` (HLC/version).
 * Structurally-equal nodes therefore dedup across graphs and over time.
 */
export function addressNode(node: DocumentGraphNode): ContentAddress {
  const { id: _id, meta: _meta, ...payload } = node;
  return contentAddressOf(payload);
}

/** Return a copy of the node with its `id` set to the correct content address. */
export function sealNode<N extends DocumentGraphNode>(node: N): N {
  return { ...node, id: addressNode(node) };
}

/**
 * Mint the graph identity (`id`, fnv1a) + integrity digest (`digest`,
 * fnv1a+sha256) over the SAME canonical bytes: the sorted node ids + sorted
 * edges. Re-ordering authoring does not fork identity (the graph is a canonical
 * multiset); node payloads are covered transitively because each node id is
 * itself a content address of its payload.
 */
export function addressDocumentGraph(graph: {
  readonly nodes: readonly DocumentGraphNode[];
  readonly edges: readonly DocumentGraphEdge[];
}): { readonly id: ContentAddress; readonly digest: AddressedDigest } {
  const nodeIds = graph.nodes.map((node) => node.id).slice().sort();
  const edges = graph.edges
    .map((edge) => [edge.from, edge.to, edge.type] as const)
    .slice()
    .sort((a, b) => `${a[0]}|${a[1]}|${a[2]}`.localeCompare(`${b[0]}|${b[1]}|${b[2]}`));
  const bytes = canonicalAddressBytes({ nodeIds, edges });
  return { id: fnv1aBytes(bytes), digest: AddressedDigestNS.of(bytes, 'sha256') };
}

/** Return a copy of the graph with `id` + `digest` set to the correct addresses. */
export function sealGraph(graph: Omit<DocGraph, 'id' | 'digest'>): DocGraph {
  const { id, digest } = addressDocumentGraph(graph);
  return { ...graph, id, digest };
}

/** Lift a DocumentGraph to a synthetic `PlanIR` so `Plan.validate`/`topoSort` apply over node-id endpoints. */
function toPlanIR(graph: { readonly nodes: readonly DocumentGraphNode[]; readonly edges: readonly DocumentGraphEdge[] }): PlanIR {
  return {
    name: 'document-graph',
    steps: graph.nodes.map((node) => ({ id: node.id, name: node.family, opType: { type: 'noop' } as const })),
    edges: graph.edges.map((edge) => ({ from: edge.from, to: edge.to, type: edge.type })),
  };
}

/** Validate structural integrity: no cycles, every edge endpoint references an existing node. Reuses `Plan.validate`. */
export function validateGraph(graph: {
  readonly nodes: readonly DocumentGraphNode[];
  readonly edges: readonly DocumentGraphEdge[];
}): { readonly ok: true } | { readonly ok: false; readonly errors: readonly PlanValidationError[] } {
  const result = Plan.validate(toPlanIR(graph));
  return result.ok ? { ok: true } : { ok: false, errors: result.errors };
}

/**
 * Topologically order the node ids (Kahn's algorithm via `Plan.topoSort`).
 * `cycle` is populated with the participating node ids when the graph is cyclic.
 */
export function linearizeGraph(graph: {
  readonly nodes: readonly DocumentGraphNode[];
  readonly edges: readonly DocumentGraphEdge[];
}): { readonly sorted: readonly ContentAddress[]; readonly cycle?: readonly ContentAddress[] } {
  const result = Plan.topoSort(toPlanIR(graph));
  // The sorted ids ARE node content addresses (they came from node.id), just
  // widened to string through the synthetic PlanIR — re-narrow without re-minting.
  const sorted = result.sorted.map((id) => id as ContentAddress);
  return result.cycle ? { sorted, cycle: result.cycle.map((id) => id as ContentAddress) } : { sorted };
}

