/**
 * Capsule declaration locking {@link addressDocumentGraph} — the DocumentGraph
 * addressing kernel — as a standing `pureTransform` contract. Where
 * `graph-patch-identity.ts` proves the structural differ inverts itself, this
 * pins the addressing kernel's THREE standing laws: determinism (same graph →
 * same address), format (the `fnv1a:` brand), and — the regression guard for the
 * `localeCompare → code-unit` fix (CUT B1) — locale-INDEPENDENCE: the address is
 * a function of the graph's content MULTISET, never the authoring/insertion order
 * of its nodes. Shuffling the seed's inputs must not fork identity.
 *
 * WHY `pureTransform`: `sealGraph` is a pure function of its payload — canonical
 * CBOR over sorted node ids + sorted edges, then fnv1a. No receipt byte law, no
 * mutate channel; the determinism law is exactly the pure-transform fit.
 *
 * WHY THE INPUT IS SEED MATERIAL (mirroring graph-patch-identity): a
 * `DocumentGraph` is content-addressed — its node `id`s and graph `id`/`digest`
 * are minted ONLY through `sealNode`/`sealGraph`, which a schema-arbitrary cannot
 * produce. So the input schema generates a small, fully-supported SEED domain
 * (axis-name lists + acyclic edge index pairs) and `run` SEALS it into a real,
 * valid graph through the one kernel. The invariants then assert over that REAL
 * sealed graph's address, never a weakened stand-in.
 *
 * @module
 */

import { Schema } from 'effect';
import type { ContentAddress } from '../brands.js';
import { defineCapsule } from '../assembly.js';
import { sealGraph, sealNode } from '../document-graph-address.js';
import type {
  DocumentGraph,
  DocumentGraphEdge,
  DocumentGraphNode,
  SignalNode,
} from '../document-graph.js';
import type { CellMeta } from '../protocol.js';

/** An acyclic edge index pair — `[i, j]` over the sealed node list. */
const EdgeSeed = Schema.Tuple([Schema.Number, Schema.Number]);

/**
 * Seed material the schema-arbitrary CAN produce (String/Array/Tuple/Number are
 * fully-supported AST nodes): a graph described by its signal-axis name list plus
 * acyclic edge index pairs. `run` seals this into a real graph.
 */
const GraphAddressSeed = Schema.Struct({
  /** Signal-axis names → one sealed `SignalNode` per DISTINCT name. */
  inputs: Schema.Array(Schema.String),
  /** `[i, j]` index pairs → a `from`→`to` edge between sealed nodes (normalized acyclic). */
  edges: Schema.Array(EdgeSeed),
});

type GraphAddressSeedValue = Schema.Schema.Type<typeof GraphAddressSeed>;

/** Fixed volatile meta — excluded from the content address, so a constant is faithful. */
const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'document-graph-address' },
  updated: { wall_ms: 0, counter: 0, node_id: 'document-graph-address' },
  version: 1,
};

/** Seal a minimal Signal node keyed by its input axis (its id is minted from the payload). */
function signalNode(input: string): SignalNode {
  return sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta: META,
    input,
  } as unknown as SignalNode);
}

/**
 * Build a real, sealed, structurally-VALID graph from a seed. Distinct inputs
 * dedup to distinct nodes; edge index pairs are normalized to `min → max` over
 * the node list (so every endpoint exists and the graph stays acyclic, never a
 * self-loop), keeping the seal honest without weakening it.
 */
function buildGraph(seed: GraphAddressSeedValue): DocumentGraph {
  const seen = new Set<string>();
  const nodes: DocumentGraphNode[] = [];
  for (const input of seed.inputs) {
    if (seen.has(input)) continue;
    seen.add(input);
    nodes.push(signalNode(input));
  }

  const edges: DocumentGraphEdge[] = [];
  const edgeKeys = new Set<string>();
  if (nodes.length >= 2) {
    for (const pair of seed.edges) {
      const i = Math.abs(Math.trunc(pair[0])) % nodes.length;
      const j = Math.abs(Math.trunc(pair[1])) % nodes.length;
      if (i === j) continue; // no self-loops
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      const fromNode = nodes[lo];
      const toNode = nodes[hi];
      if (fromNode === undefined || toNode === undefined) continue;
      const edge: DocumentGraphEdge = { from: fromNode.id, to: toNode.id, type: 'seq' };
      const key = `${edge.from} ${edge.to} ${edge.type}`;
      if (edgeKeys.has(key)) continue; // dedup parallel edges
      edgeKeys.add(key);
      edges.push(edge);
    }
  }

  return sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<
    DocumentGraph,
    'id' | 'digest'
  >);
}

/**
 * A DETERMINISTIC AUTHORING-ORDER perturbation of an ALREADY-SEALED graph:
 * reverse the `nodes` and `edges` arrays and re-seal. This preserves the content
 * MULTISET exactly — the same sealed node identities, the same directed edges
 * between the same identities — and changes ONLY the authoring/insertion order of
 * the arrays. That is precisely the axis the code-unit sort (CUT B1) must be
 * invariant to. (Perturbing the SEED instead would re-index edges and could flip
 * a directed endpoint, genuinely forking the graph — so we perturb post-seal.)
 * Pure (no RNG) so the property test never flakes.
 */
function reorderGraph(graph: DocumentGraph): DocumentGraph {
  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta: META,
    nodes: [...graph.nodes].reverse(),
    edges: [...graph.edges].reverse(),
  } as Omit<DocumentGraph, 'id' | 'digest'>);
}

/** The output: the sealed graph plus its address and integrity digest. */
interface GraphAddressOutput {
  readonly graph: DocumentGraph;
  readonly id: ContentAddress;
  readonly integrityDigest: string;
}

/**
 * Declared capsule for the DocumentGraph addressing kernel. Registered in the
 * module-level catalog at import time; walked by the factory compiler. The
 * generated property test feeds schema-seeds, `run` seals a real graph and reads
 * its address, and the invariants assert determinism / format / order-independence
 * over the REAL sealed address. The bench measures real addressing latency
 * (O(nodes) — scales with the arbitrary's graph sizes).
 */
export const documentGraphAddressCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'core.document-graph.address',
  input: GraphAddressSeed,
  output: Schema.Unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'determinism',
      check: (input: unknown, output: unknown): boolean => {
        const o = output as GraphAddressOutput;
        // LAW: same seed → same address. Re-seal independently and compare both
        // the fnv1a id and the sha256 integrity digest (the paired law).
        const again = buildGraph(input as GraphAddressSeedValue);
        return again.id === o.id && again.digest.integrity_digest === o.integrityDigest;
      },
      message: 'sealing the same seed twice must yield the same id + integrity digest (determinism)',
    },
    {
      name: 'address-format',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as GraphAddressOutput;
        // LAW: the graph id is an fnv1a content address — `fnv1a:` + 8 hex digits.
        return /^fnv1a:[0-9a-f]{8}$/.test(o.id as unknown as string);
      },
      message: 'graph id must match the fnv1a:<8 hex> content-address brand',
    },
    {
      name: 'order-independent-address',
      check: (input: unknown, output: unknown): boolean => {
        const o = output as GraphAddressOutput;
        // LAW (the CUT B1 regression guard): the address is a function of the
        // content MULTISET, not authoring order. Reversing the sealed graph's
        // node + edge arrays preserves the multiset exactly and MUST mint the SAME
        // id — the code-unit sort the locale fix installed makes this hold across
        // machines/locales.
        const reordered = reorderGraph(o.graph);
        return reordered.id === o.id && reordered.digest.integrity_digest === o.integrityDigest;
      },
      message: 'reordering the seed (authoring order) must not fork the address (code-unit / locale-independence)',
    },
  ],
  // Scale-aware: the addressing cost is O(nodes) canonical-CBOR + fnv1a + sha256.
  // The arbitrary's graphs are small (axis-name lists), but `run` re-seals every
  // distinct node; 4ms p95 holds with comfortable headroom for the generated
  // sizes while still catching a super-linear regression in the kernel.
  budgets: { p95Ms: 4, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: GraphAddressSeedValue): GraphAddressOutput => {
    const graph = buildGraph(input);
    return { graph, id: graph.id, integrityDigest: graph.digest.integrity_digest };
  },
});

/** Internal helpers exported for direct unit assertions over the seed→graph builder. */
export const _documentGraphAddressInternals = { buildGraph, reorderGraph, signalNode } as const;
