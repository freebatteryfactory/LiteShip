/**
 * GraphPatch — a typed graph MUTATION over the keystone {@link DocumentGraph} IR
 * (P5b). The structural differ's counterpart: where `document-graph-address.ts`
 * MINTS identity, this module MOVES between two identities by a tagged delta.
 *
 * LOCKED DECISION: **tagged-delta**. A patch is a `_tag`/`_version` envelope
 * (C6 discipline) carrying the `base` graph id it applies to plus an ordered set
 * of {@link PatchOp}s (add/remove/update of nodes; add/remove of edges). It is a
 * VALUE, never a closure: it serializes, content-addresses, and replays.
 *
 * Identity is RE-MINTED only through `sealGraph` (→ `contentAddressOf`, the one
 * kernel; never cborg/JSON): {@link apply} runs the ops then RE-ADDRESSES, so the
 * result's `id`/`digest` update and a patched graph is indistinguishable from one
 * authored fresh. "Written data needs a reader": {@link apply} and
 * {@link validate} ARE the readers of a patch — a patch nobody applies is inert.
 *
 * {@link diff} is the inverse: `apply(a, diff(a, b))` deep-equals `b`. It uses the
 * node `id` (content address) set difference — because a node's id IS the
 * `contentAddressOf` its payload, a changed payload surfaces as a remove+add of
 * the same logical cell, collapsed into a single `update` op for readability while
 * remaining a faithful remove-then-add at apply time.
 *
 * {@link receipt} composes the patch's `resultId` onto the receipt byte law
 * ({@link Receipt}); concurrent-patch fork detection composes onto
 * {@link DAG.merge} via {@link forkOf}.
 *
 * @module
 */

import { Effect } from 'effect';
import type { ContentAddress, HLC } from './brands.js';
import { contentAddressOf } from './content-address.js';
import { sealGraph, validateGraph } from './document-graph-address.js';
import type { DocumentGraph, DocumentGraphNode, DocumentGraphEdge, NodeFamily } from './document-graph.js';
import type { PlanValidationError } from './plan.js';
import { Receipt, type ReceiptEnvelope } from './receipt.js';
import { TypedRef } from './typed-ref.js';
import { HLC as HLCOps } from './hlc.js';
import { DAG, type MergeResult } from './dag.js';

/** A node-level mutation: add/remove/update a single addressed {@link DocumentGraphNode}. */
export interface NodePatchOp {
  readonly op: 'add' | 'remove' | 'update';
  readonly family: NodeFamily;
  readonly node: DocumentGraphNode;
}

/** An edge-level mutation: add/remove a single {@link DocumentGraphEdge}. */
export interface EdgePatchOp {
  readonly op: 'add' | 'remove';
  readonly edge: DocumentGraphEdge;
}

/** The tagged-delta operation: a discriminated union over node- and edge-level mutations. */
export type PatchOp = NodePatchOp | EdgePatchOp;

/** Narrow a {@link PatchOp} to its node-level arm. */
const isNodeOp = (op: PatchOp): op is NodePatchOp => 'node' in op;

/**
 * A typed, content-addressable graph mutation (C6). `base` is the graph id the
 * delta applies to; `resultId` (when present) is the `apply` result's id — the
 * seam {@link receipt} and {@link forkOf} bind to.
 */
export interface GraphPatch {
  readonly _tag: 'GraphPatch';
  readonly _version: 1;
  /** The id of the {@link DocumentGraph} this patch applies to. */
  readonly base: ContentAddress;
  readonly ops: readonly PatchOp[];
  /** The id of the graph `apply(base, this)` produces (set by `propose`/`apply`). */
  readonly resultId?: ContentAddress;
}

/** Edge identity key: a patch removes/adds edges by structural triple, never by reference. */
const edgeKey = (edge: DocumentGraphEdge): string => `${edge.from} ${edge.to} ${edge.type}`;

/**
 * Propose a patch from a `base` graph and an op list, stamping `resultId` by
 * previewing the apply. The patch is a pure value — proposing never mutates
 * `base`.
 */
export function propose(base: DocumentGraph, ops: readonly PatchOp[]): GraphPatch {
  const draft: GraphPatch = { _tag: 'GraphPatch', _version: 1, base: base.id, ops };
  const result = apply(base, draft);
  return { ...draft, resultId: result.id };
}

/**
 * Apply a patch's ops to a graph, then RE-ADDRESS via {@link sealGraph} so the
 * result's `id`/`digest` reflect the new content. Node ops key on the node `id`
 * (content address); edge ops key on the structural triple. `update` is a
 * remove-then-add of the carried node (its id already encodes the new payload).
 * Idempotent per op kind: removing an absent node/edge is a no-op; adding an
 * existing one dedups.
 */
export function apply(graph: DocumentGraph, patch: GraphPatch): DocumentGraph {
  const nodes = new Map<ContentAddress, DocumentGraphNode>(graph.nodes.map((node) => [node.id, node]));
  const edges = new Map<string, DocumentGraphEdge>(graph.edges.map((edge) => [edgeKey(edge), edge]));

  for (const op of patch.ops) {
    if (isNodeOp(op)) {
      if (op.op === 'remove') {
        nodes.delete(op.node.id);
      } else {
        // 'add' and 'update' both install the node under its content-address id.
        nodes.set(op.node.id, op.node);
      }
    } else if (op.op === 'remove') {
      edges.delete(edgeKey(op.edge));
    } else {
      edges.set(edgeKey(op.edge), op.edge);
    }
  }

  // RE-ADDRESS through the one kernel — never hand-mint an id/digest.
  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta: graph.meta,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  });
}

/**
 * Preview a patch — {@link apply} without committing. Same bytes as `apply`,
 * named for the intent: callers use `preview` to inspect/validate a candidate
 * result without implying it has been persisted.
 */
export function preview(graph: DocumentGraph, patch: GraphPatch): DocumentGraph {
  return apply(graph, patch);
}

/**
 * Validate a patch by RE-RUNNING {@link validateGraph} on its apply result:
 * structural integrity (no cycles, no dangling edge endpoints) of the graph the
 * patch WOULD produce. A patch that introduces a cycle or a dangling edge fails
 * here, before anyone commits it.
 */
export function validate(
  graph: DocumentGraph,
  patch: GraphPatch,
): { readonly ok: true } | { readonly ok: false; readonly errors: readonly PlanValidationError[] } {
  return validateGraph(apply(graph, patch));
}

/**
 * Structural differ: the tagged delta that carries `a` to `b`. Nodes diff by
 * `id` set difference (a payload change is a remove+add of the same logical cell,
 * collapsed into one `update` op when family + logical key match); edges diff by
 * structural triple. `apply(a, diff(a, b))` deep-equals `b` (round-trip).
 */
export function diff(a: DocumentGraph, b: DocumentGraph): GraphPatch {
  const aNodes = new Map(a.nodes.map((node) => [node.id, node]));
  const bNodes = new Map(b.nodes.map((node) => [node.id, node]));

  const removed = a.nodes.filter((node) => !bNodes.has(node.id));
  const added = b.nodes.filter((node) => !aNodes.has(node.id));

  // Collapse a removed+added pair that share a family + logical key into one
  // `update` op (readability) — apply treats update as remove-then-add, so the
  // round-trip is preserved either way.
  const removedByLogical = new Map<string, DocumentGraphNode>();
  for (const node of removed) removedByLogical.set(logicalKey(node), node);

  const nodeOps: PatchOp[] = [];
  const consumedRemovals = new Set<ContentAddress>();
  for (const node of added) {
    const prior = removedByLogical.get(logicalKey(node));
    if (prior) {
      nodeOps.push({ op: 'update', family: node.family, node });
      consumedRemovals.add(prior.id);
    } else {
      nodeOps.push({ op: 'add', family: node.family, node });
    }
  }
  for (const node of removed) {
    if (!consumedRemovals.has(node.id)) {
      nodeOps.push({ op: 'remove', family: node.family, node });
    }
  }

  const aEdges = new Map(a.edges.map((edge) => [edgeKey(edge), edge]));
  const bEdges = new Map(b.edges.map((edge) => [edgeKey(edge), edge]));
  const edgeOps: PatchOp[] = [];
  for (const edge of b.edges) if (!aEdges.has(edgeKey(edge))) edgeOps.push({ op: 'add', edge });
  for (const edge of a.edges) if (!bEdges.has(edgeKey(edge))) edgeOps.push({ op: 'remove', edge });

  // Apply removes before adds is unnecessary (node ops key by distinct ids), but
  // edge removes-after-adds is harmless; order nodes-then-edges for replay clarity.
  const ops: readonly PatchOp[] = [...nodeOps, ...edgeOps];
  return { _tag: 'GraphPatch', _version: 1, base: a.id, ops, resultId: b.id };
}

/**
 * The logical identity of a node for `update` collapsing: family plus the
 * family's stable user-facing key (signal axis, component/entity name), falling
 * back to the node id. This is a READABILITY heuristic only — apply never relies
 * on it (it keys purely by content-address id).
 */
function logicalKey(node: DocumentGraphNode): string {
  switch (node.family) {
    case 'signal':
      return `signal ${node.input}`;
    case 'component':
      return `component ${node.name}`;
    case 'pose':
      return `pose ${node.entityRef} ${node.state}`;
    case 'transition':
      return `transition ${node.fromPose} ${node.toPose}`;
    case 'projection':
      return `projection ${node.sourceRef} ${node.target}`;
    default:
      // entity / policy / export have no stable non-payload key → treat each id
      // as its own logical cell (no update collapsing).
      return `${node.family} ${node.id}`;
  }
}

/**
 * The receipt subject id for a patch: a content address over `{ base, ops }`, so
 * structurally-equal patches share a receipt subject (the mutation's identity,
 * minted through the one kernel — distinct from the sha256 receipt byte law).
 */
export function patchId(patch: GraphPatch): ContentAddress {
  return contentAddressOf({ base: patch.base, ops: patch.ops });
}

/**
 * Compose the patch's `resultId` onto the {@link Receipt} byte law: a single
 * genesis-or-linked envelope whose payload is a {@link TypedRef} over the
 * mutation, subject-keyed by the patch identity. Effect-returning because the
 * receipt byte law hashes via `crypto.subtle` (SHA-256) — the same async kernel
 * `Receipt.createEnvelope` rides on; folding it to a sync value would force a
 * second, divergent hashing path. `timestamp`/`previous` default to a genesis
 * stamp; pass them to chain this patch onto a prior receipt.
 */
export function receipt(
  patch: GraphPatch,
  options?: { readonly timestamp?: HLC; readonly previous?: string | readonly string[] },
): Effect.Effect<ReceiptEnvelope> {
  return Effect.gen(function* () {
    const timestamp = options?.timestamp ?? HLCOps.create('graph-patch');
    const previous = options?.previous ?? Receipt.GENESIS;
    const payload = yield* TypedRef.create('GraphPatch@1', {
      base: patch.base,
      resultId: patch.resultId,
      ops: patch.ops,
    });
    return yield* Receipt.createEnvelope(
      'graph-patch',
      { type: 'artifact', id: patch.resultId ?? patchId(patch) },
      payload,
      timestamp,
      previous,
    );
  });
}

/**
 * Concurrent-patch fork detection, composed onto {@link DAG.merge}: ingest a set
 * of patch receipts into a receipt DAG; `merge` enforces the single-writer
 * anti-fork rule and reports whether the head diverged. Use when two patches
 * race off a shared `base` and you must decide if they forked the chain.
 */
export function forkOf(local: DAG.Graph, patchReceipts: readonly ReceiptEnvelope[]): MergeResult {
  return DAG.merge(local, patchReceipts);
}

/**
 * GraphPatch namespace — the tagged-delta mutation surface over
 * {@link DocumentGraph}. Propose a delta, apply/preview it (re-addressing through
 * the one kernel), validate the would-be result, diff two graphs, and mint a
 * receipt / detect concurrent forks.
 *
 * @example
 * ```ts
 * import { GraphPatch } from '@czap/core';
 *
 * const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node }]);
 * const next = GraphPatch.apply(base, patch);          // re-addressed: next.id !== base.id
 * const check = GraphPatch.validate(base, patch);      // { ok: true } | { ok: false, errors }
 * const back = GraphPatch.diff(base, next);            // apply(base, back) deep-equals next
 * ```
 */
export const GraphPatch = {
  propose,
  apply,
  preview,
  validate,
  diff,
  patchId,
  receipt,
  forkOf,
};

export declare namespace GraphPatch {
  /** Alias for {@link PatchOp}. */
  export type Op = PatchOp;
  /** Alias for {@link NodePatchOp}. */
  export type NodeOp = NodePatchOp;
  /** Alias for {@link EdgePatchOp}. */
  export type EdgeOp = EdgePatchOp;
}
