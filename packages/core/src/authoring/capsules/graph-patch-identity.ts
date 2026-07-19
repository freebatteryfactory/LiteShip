/**
 * Capsule declaration locking the GraphPatch round-trip identity as a standing
 * `pureTransform` contract: `apply(a, diff(a, b))` deep-equals `b`. Where
 * `canonical-cbor-decode.ts` proves the byte reader inverts the byte writer,
 * this proves the structural DIFFER inverts itself over two {@link DocumentGraph}
 * identities — the contract the future graph editor builds against.
 *
 * WHY `pureTransform` (not `receiptedMutation`): `run` is a PURE function of its
 * input — `diff` then `apply`, no receipt byte law, no async hashing, no mutate
 * channel. `GraphPatch.receipt` (the receipted seam) is deliberately NOT exercised
 * here; the round-trip identity is a value-level property the pure-transform
 * harness's property test fits exactly.
 *
 * WHY THE INPUT IS SEED MATERIAL (not raw `DocumentGraph`s): a `DocumentGraph`
 * is content-addressed — its node `id`s and graph `id`/`digest` are `fnv1a` over
 * the canonical CBOR of the payload, minted ONLY through `sealNode`/`sealGraph`.
 * The schema-driven arbitrary (`schemaToArbitrary`) cannot mint those addresses;
 * a raw `Struct` arbitrary would emit graphs with garbage `id`s that `apply`
 * re-seals away, making the round-trip vacuously red on EVERY sample. So the
 * input schema generates a small, fully-supported SEED domain (axis-name lists +
 * acyclic edge index pairs) and `run` SEALS it into two real, valid, sealed
 * graphs through the one kernel. The invariants then assert over those REAL
 * sealed graphs (returned in the output), so the property they verify is the
 * genuine `diff`/`apply`/`validate` contract, never a weakened stand-in.
 *
 * @module
 */

import type { ContentAddress } from '../../schema/brands.js';
import { defineCapsule } from '../assembly.js';
import { S } from '../../schema/constructors.js';
import type { Infer } from '../../schema/infer.js';
import { sealGraph, sealNode } from '../../graph/document-graph-address.js';
import { GraphPatch } from '../../graph/graph-patch.js';
import type { DocumentGraph, DocumentGraphEdge, DocumentGraphNode, SignalNode } from '../../graph/document-graph.js';
import type { CellMeta } from '../../schema/protocol.js';

/**
 * Seed material the schema-arbitrary CAN produce (String/Tuple/Number are all
 * fully supported AST nodes): two graphs described by their signal-axis name
 * lists plus acyclic edge index pairs. An edge is a fixed-arity
 * `S.tuple(S.number, S.number)` whose two positions `run` reads as `[i, j]`
 * (arity 2 is decode-enforced). `run` seals these into real graphs.
 */
const EdgeSeed = S.tuple(S.number, S.number);

const GraphSeed = S.struct({
  /** Signal-axis names → one sealed `SignalNode` per DISTINCT name. */
  inputs: S.array(S.string),
  /** `[i, j]` index pairs → a `from`→`to` edge between sealed nodes (normalized acyclic). */
  edges: S.array(EdgeSeed),
});

/** The capsule input: seeds for the two graphs the round-trip carries between. */
const GraphPatchIdentityInput = S.struct({
  a: GraphSeed,
  b: GraphSeed,
});

type GraphSeedValue = Infer<typeof GraphSeed>;

/** Fixed volatile meta — excluded from the content address, so a constant is faithful. */
const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'graph-patch-identity' },
  updated: { wall_ms: 0, counter: 0, node_id: 'graph-patch-identity' },
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
 * self-loop), keeping `validate` honest without weakening it.
 */
function buildGraph(seed: GraphSeedValue): DocumentGraph {
  // Dedup axis names → distinct sealed nodes (content-address dedup is the law).
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
      // An edge seed is an `S.tuple(S.number, S.number)`: decode enforces arity 2,
      // so both `[i, j]` positions are present numbers.
      const [rawI, rawJ] = pair;
      const i = Math.abs(Math.trunc(rawI)) % nodes.length;
      const j = Math.abs(Math.trunc(rawJ)) % nodes.length;
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
 * CANONICAL graph equality — the faithful "same graph" test for the round-trip.
 *
 * A {@link DocumentGraph} is, by its own addressing kernel
 * (`document-graph-address.ts`), a CONTENT-ADDRESSED MULTISET: `id`/`digest` are
 * minted over the SORTED node ids + sorted edges, so "Re-ordering authoring does
 * not fork identity". The `nodes`/`edges` arrays therefore carry AUTHORING ORDER,
 * which is volatile (like `meta`) and NOT part of graph identity.
 *
 * `apply` rebuilds `nodes` in Map-insertion order (kept-then-added), which need
 * not match `b`'s authoring order even when the two are THE SAME graph. So a
 * positional `deepEquals` over the arrays would report a false mismatch on a
 * genuine round-trip (it did: a=[''], b=[' ','']). The honest equality is the
 * graph's OWN identity law: same `_tag`/`_version`/`id`/`digest`, plus the same
 * node MULTISET (by node id) and edge MULTISET (by structural triple). This is
 * STRONGER than id-equality alone (it re-checks the underlying members), and
 * never weaker than the real contract — it just refuses to treat authoring order
 * as identity, exactly as the kernel does.
 */
function sameGraph(a: DocumentGraph, b: DocumentGraph): boolean {
  if (a.id !== b.id) return false;
  if (a.digest.integrity_digest !== b.digest.integrity_digest) return false;
  if (a._tag !== b._tag || a._version !== b._version) return false;
  // Node multiset by content-address id (each id IS the address of its payload,
  // so id-equality of the multiset implies payload-equality of every member).
  const aNodeIds = a.nodes.map((n) => n.id).sort();
  const bNodeIds = b.nodes.map((n) => n.id).sort();
  if (aNodeIds.length !== bNodeIds.length) return false;
  for (let i = 0; i < aNodeIds.length; i++) if (aNodeIds[i] !== bNodeIds[i]) return false;
  // Edge multiset by structural triple.
  const edgeTriple = (e: DocumentGraphEdge): string => `${e.from} ${e.to} ${e.type}`;
  const aEdges = a.edges.map(edgeTriple).sort();
  const bEdges = b.edges.map(edgeTriple).sort();
  if (aEdges.length !== bEdges.length) return false;
  for (let i = 0; i < aEdges.length; i++) if (aEdges[i] !== bEdges[i]) return false;
  return true;
}

/** The output: the sealed graphs, the diff patch, the applied result, and the verdict. */
interface GraphPatchIdentityOutput {
  readonly a: DocumentGraph;
  readonly b: DocumentGraph;
  readonly patch: GraphPatch;
  readonly result: DocumentGraph;
  readonly verified: boolean;
}

/**
 * Declared capsule for the GraphPatch round-trip identity. Registered in the
 * module-level catalog at import time; walked by the factory compiler. The
 * generated property test feeds schema-seeds, `run` seals two real graphs and
 * computes `diff`→`apply`, and the invariants assert the round-trip / validity /
 * id-consistency over the SEALED graphs.
 */
export const graphPatchIdentityCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'core.graph-patch-identity',
  input: GraphPatchIdentityInput,
  output: S.unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'diff-apply-round-trip',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as GraphPatchIdentityOutput;
        // The standing contract: apply(a, diff(a, b)) IS the same graph as b. `run`
        // already computed this into `result` + `verified`; re-assert both
        // independently so a regression in EITHER the apply path or the verdict
        // surfaces. Equality is the graph's own (order-independent) identity law —
        // see `sameGraph`.
        return o.verified === true && sameGraph(o.result, o.b);
      },
      message: 'apply(a, diff(a, b)) must be the same graph as b (the structural differ is its own inverse)',
    },
    {
      name: 'patch-validates',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as GraphPatchIdentityOutput;
        // The would-be result is structurally sound (no cycle, no dangling edge):
        // validate RE-RUNS validateGraph on apply(a, patch).
        return GraphPatch.validate(o.a, o.patch).ok === true;
      },
      message: 'the diff patch must validate against its base (no cycle / no dangling edge introduced)',
    },
    {
      name: 'result-id-consistency',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as GraphPatchIdentityOutput;
        // `diff` stamps resultId = b.id; apply re-addresses through the one kernel.
        // Both must equal b.id — a content-addressed patch whose stamped result id
        // disagreed with the applied id would be a forged address.
        return o.patch.resultId === o.b.id && o.result.id === o.b.id;
      },
      message: 'patch.resultId and the applied result id must both equal b.id (re-addressing is faithful)',
    },
  ],
  budgets: { p95Ms: 2, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: { readonly a: GraphSeedValue; readonly b: GraphSeedValue }): GraphPatchIdentityOutput => {
    const a = buildGraph(input.a);
    const b = buildGraph(input.b);
    const patch = GraphPatch.diff(a, b);
    const result = GraphPatch.apply(a, patch);
    return { a, b, patch, result, verified: sameGraph(result, b) };
  },
});

/** Internal helpers exported for direct unit assertions over the seed→graph builder. */
export const _graphPatchIdentityInternals = { buildGraph, sameGraph, signalNode } as const;
