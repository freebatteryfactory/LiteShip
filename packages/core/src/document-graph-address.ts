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

import { ParseError } from '@czap/error';
import type { ContentAddress, AddressedDigest } from './brands.js';
import { IntegrityDigest } from './brands.js';
import { fnv1aBytes } from './fnv.js';
import { canonicalAddressBytes, contentAddressOf } from './content-address.js';
import { AddressedDigest as AddressedDigestNS } from './addressed-digest.js';
import { Plan } from './plan.js';
import type { PlanIR, PlanValidationError, EdgeType } from './plan.js';
import type { DocumentGraph as DocGraph, DocumentGraphNode, DocumentGraphEdge } from './document-graph.js';
import type { CellMeta } from './protocol.js';
import type { HLC } from './brands.js';
import { isWellFormedNode } from './document-graph-schema.js';

/**
 * The ONE `_version` this build's DocumentGraph reader understands. A graph
 * stamped with a different `_version` (a future writer / corrupted envelope) is
 * rejected fail-closed by {@link decodeDocumentGraph} — never coerced into a v1
 * graph. Bump this (and add a migration) when the graph envelope evolves.
 */
const SUPPORTED_GRAPH_VERSION = 1 as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate + construct an {@link HLC} stamp from an untrusted value, or `undefined` if malformed. */
const readHlc = (value: unknown): HLC | undefined => {
  if (
    !isRecord(value) ||
    typeof value.wall_ms !== 'number' ||
    typeof value.counter !== 'number' ||
    typeof value.node_id !== 'string'
  ) {
    return undefined;
  }
  return { wall_ms: value.wall_ms, counter: value.counter, node_id: value.node_id };
};

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
  // Deterministic UTF-16 code-unit order, NOT localeCompare — graph identity
  // must be byte-identical across machines/locales (CUT B1). Default Array.sort
  // on strings is already code-unit, but the comparators are explicit so the
  // determinism is unmistakable.
  const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  const nodeIds = graph.nodes
    .map((node) => node.id)
    .slice()
    .sort(cmp);
  const edges = graph.edges
    .map((edge) => [edge.from, edge.to, edge.type] as const)
    .slice()
    .sort((a, b) => cmp(`${a[0]}|${a[1]}|${a[2]}`, `${b[0]}|${b[1]}|${b[2]}`));
  const bytes = canonicalAddressBytes({ nodeIds, edges });
  return { id: fnv1aBytes(bytes), digest: AddressedDigestNS.of(bytes, 'sha256') };
}

/** Return a copy of the graph with `id` + `digest` set to the correct addresses. */
export function sealGraph(graph: Omit<DocGraph, 'id' | 'digest'>): DocGraph {
  const { id, digest } = addressDocumentGraph(graph);
  return { ...graph, id, digest };
}

/** Lift a DocumentGraph to a synthetic `PlanIR` so `Plan.validate`/`topoSort` apply over node-id endpoints. */
function toPlanIR(graph: {
  readonly nodes: readonly DocumentGraphNode[];
  readonly edges: readonly DocumentGraphEdge[];
}): PlanIR {
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

/**
 * VERSION-AWARE, FAIL-CLOSED reader for an UNTRUSTED DocumentGraph value (a graph
 * lowered from persisted JSON / a wire payload). `sealGraph` only re-mints ids; it
 * does NOT verify the envelope `_tag`/`_version` or that every node is well-formed.
 * A host that reconstructs a graph from outside the program must run it through
 * THIS gate first, so a future-version (`_version: 2`) or malformed graph is
 * rejected with ONE canonical tagged `ParseError` — never silently misparsed
 * into a v1 shape. "Written data needs a reader": this is the graph envelope's
 * fail-closed reader, the twin of {@link isWellFormedNode}'s per-node gate.
 *
 * @throws `ParseError` (`source: 'DocumentGraph'`) when the value is not a
 *   record, carries the wrong `_tag`, an unsupported `_version`, or a node that
 *   fails the {@link isWellFormedNode} trust gate.
 */
export function decodeDocumentGraph(value: unknown): DocGraph {
  if (!isRecord(value)) {
    throw ParseError('DocumentGraph', `expected an object, got ${value === null ? 'null' : typeof value}`, {
      code: 'not_an_object',
    });
  }
  if (value._tag !== 'DocumentGraph') {
    throw ParseError('DocumentGraph', `expected _tag "DocumentGraph", got ${JSON.stringify(value._tag)}`, {
      code: 'wrong_tag',
    });
  }
  if (value._version !== SUPPORTED_GRAPH_VERSION) {
    throw ParseError(
      'DocumentGraph',
      `unsupported _version ${JSON.stringify(value._version)} — this build understands _version ${SUPPORTED_GRAPH_VERSION} only`,
      { code: 'unsupported_version' },
    );
  }
  if (!Array.isArray(value.nodes)) {
    throw ParseError('DocumentGraph', 'expected `nodes` to be an array', { code: 'malformed_nodes' });
  }
  if (!Array.isArray(value.edges)) {
    throw ParseError('DocumentGraph', 'expected `edges` to be an array', { code: 'malformed_edges' });
  }
  // Collect the nodes THROUGH the well-formedness gate so each is narrowed to
  // DocumentGraphNode by `isWellFormedNode` — no laundering double-cast.
  const nodes: DocumentGraphNode[] = [];
  for (let i = 0; i < value.nodes.length; i++) {
    const candidate: unknown = value.nodes[i];
    if (!isWellFormedNode(candidate)) {
      throw ParseError('DocumentGraph', `node at index ${i} is not a well-formed DocumentGraphNode`, {
        code: 'malformed_node',
      });
    }
    nodes.push(candidate);
  }
  // Validate + narrow each edge's structural triple: from/to are addresses, and `type` must be a
  // real EdgeType — not merely a string. A bogus type string (`"bogus"`) would otherwise seal and
  // adopt as a structurally-invalid edge the routing layer can't interpret. Fail-closed here.
  const EDGE_TYPES = new Set<string>(['seq', 'par', 'choice_then', 'choice_else']);
  const edges: DocumentGraphEdge[] = [];
  for (let i = 0; i < value.edges.length; i++) {
    const edge: unknown = value.edges[i];
    if (
      !isRecord(edge) ||
      typeof edge.from !== 'string' ||
      typeof edge.to !== 'string' ||
      typeof edge.type !== 'string' ||
      !EDGE_TYPES.has(edge.type)
    ) {
      throw ParseError('DocumentGraph', `edge at index ${i} is not a well-formed { from, to, type: EdgeType } triple`, {
        code: 'malformed_edge',
      });
    }
    edges.push({ from: edge.from as ContentAddress, to: edge.to as ContentAddress, type: edge.type as EdgeType });
  }
  const metaRecord = value.meta;
  if (!isRecord(metaRecord) || typeof metaRecord.version !== 'number') {
    throw ParseError('DocumentGraph', 'expected `meta` to be a well-formed CellMeta (created/updated HLC + version)', {
      code: 'malformed_meta',
    });
  }
  const created = readHlc(metaRecord.created);
  const updated = readHlc(metaRecord.updated);
  if (!created || !updated) {
    throw ParseError('DocumentGraph', 'expected `meta.created` / `meta.updated` to be well-formed HLC stamps', {
      code: 'malformed_meta',
    });
  }
  const meta: CellMeta = { created, updated, version: metaRecord.version };
  if (typeof value.id !== 'string') {
    throw ParseError('DocumentGraph', 'expected `id` to be a content-address string', { code: 'malformed_id' });
  }
  const digestRecord = value.digest;
  if (
    !isRecord(digestRecord) ||
    typeof digestRecord.display_id !== 'string' ||
    typeof digestRecord.integrity_digest !== 'string' ||
    (digestRecord.algo !== 'sha256' && digestRecord.algo !== 'blake3')
  ) {
    throw ParseError('DocumentGraph', 'expected `digest` to be a well-formed AddressedDigest', {
      code: 'malformed_digest',
    });
  }
  const digest: AddressedDigest = {
    display_id: digestRecord.display_id as ContentAddress,
    integrity_digest: IntegrityDigest(digestRecord.integrity_digest),
    algo: digestRecord.algo,
  };
  // Shape + version + per-node/-edge well-formedness all hold; construct the typed
  // graph from the validated parts (no `as unknown` laundering).
  return {
    _tag: 'DocumentGraph',
    _version: SUPPORTED_GRAPH_VERSION,
    id: value.id as ContentAddress,
    digest,
    meta,
    nodes,
    edges,
  };
}
