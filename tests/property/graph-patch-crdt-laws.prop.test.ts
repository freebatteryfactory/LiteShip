/**
 * Property test (L4) — the formal CRDT / strong-eventual-consistency laws of the
 * {@link GraphPatch} document-graph CRDT.
 *
 * GraphPatch (`packages/core/src/graph-patch.ts`) is the other half of the causal
 * trust spine: a tagged-delta mutation over the content-addressed
 * {@link DocumentGraph}. The sibling `tests/unit/core/graph-patch.test.ts` pins
 * the re-addressing, preview≡apply, remove round-trip and update-cell laws. This
 * file adds the MISSING CRDT laws an avionics-grade replicated structure needs:
 * IDEMPOTENCE, COMMUTATIVITY (of non-conflicting patches), and CONVERGENCE /
 * strong eventual consistency (all orderings of concurrent non-conflicting patches
 * reach the same state) — with the content-address `id` (minted through the one
 * `contentAddressOf` kernel via `sealGraph`) as the equality oracle.
 *
 * TWO LOAD-BEARING RESULTS pinned here, both INVESTIGATED against the live
 * substrate (not assumed), both the CORRECT contract rather than a weakened test:
 *
 *  (1) CONVERGENCE HOLDS for non-conflicting (disjoint-cell) patches. Because the
 *      graph id is `contentAddressOf` the SORTED node ids + sorted edges, the
 *      final id is invariant under the order in which disjoint additions land —
 *      so N concurrent non-conflicting patches converge to ONE id under ALL
 *      permutations. This is strong eventual consistency, proven over all 6
 *      orderings of 3 concurrent patches.
 *
 *  (2) CONFLICTING patches are NOT reconciled by `GraphPatch.apply` — apply is
 *      deliberately LAST-WRITER-WINS at the structural-delta layer: two patches
 *      updating the SAME logical cell to DIFFERENT payloads yield an
 *      ORDER-DEPENDENT result (apply(apply(G,p1),p2) ≠ apply(apply(G,p2),p1)).
 *      `apply` does NOT surface the conflict — by design. Conflict / fork
 *      detection lives ONE LAYER UP, on the receipt DAG (`GraphPatch.forkOf` →
 *      `DAG.merge` / `DAG.isFork`, the single-writer anti-fork rule). We pin BOTH
 *      facts as LAWS: (a) at the apply layer, conflicting patches are
 *      order-dependent (so a host MUST route concurrent writers through the
 *      fork-detection seam, never silently apply both); (b) the fork-detection
 *      seam ACTUALLY surfaces the concurrent fork. This is the honest contract —
 *      we report the LWW boundary loudly rather than fake a conflict-detector
 *      onto `apply` that the substrate does not have.
 *
 * Deterministic: a fixed fast-check seed (`0x5eed`) so a failure reproduces and
 * the suite never flakes. The graph arbitrary builds small, valid, content-sealed
 * DocumentGraphs from the real `signal` node family, sealed through `sealNode` /
 * `sealGraph` (never a hand-minted id).
 *
 * @module
 */

// PROVES: INV-GRAPHPATCH-IDEMPOTENT, INV-GRAPHPATCH-COMMUTATIVE, INV-GRAPHPATCH-CONVERGENCE, INV-GRAPHPATCH-CONFLICT-BOUNDARY
import { describe, test, expect } from 'vitest';
import { Effect } from 'effect';
import fc from 'fast-check';
import { GraphPatch, DAG, ContentAddress, sealNode, sealGraph } from '@czap/core';
import type {
  SignalNode,
  DocumentGraphNode,
  DocumentGraph as DocumentGraphType,
  CellMeta,
  PatchOp,
} from '@czap/core';

const SEED = 0x5eed;
const RUNS = 300;

/** A fixed CellMeta — meta is EXCLUDED from the content address, so a constant is fine + deterministic. */
const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

// ---------------------------------------------------------------------------
// Node + graph builders (seal through the kernel — never hand-mint an id)
// ---------------------------------------------------------------------------

/**
 * A valid pre-seal sentinel content address — `sealNode` immediately replaces `id`
 * with the real fnv1a address, so this only needs to satisfy the `ContentAddress`
 * brand (a properly-shaped sentinel, not a hand-minted identity, never a bare cast).
 */
const SENTINEL_ID = ContentAddress('fnv1a:00000000');

/** A minimal sealed Signal node keyed by its `input` axis (its logical cell), optional `range` payload. */
function signal(input: string, range?: readonly [number, number]): SignalNode {
  const draft: SignalNode = {
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: SENTINEL_ID,
    meta: META,
    input,
    ...(range !== undefined ? { range } : {}),
  };
  return sealNode(draft);
}

/** Seal a DocumentGraph of nodes (no edges — the CRDT laws here exercise the node multiset). */
function graphOf(nodes: readonly DocumentGraphNode[]): DocumentGraphType {
  return sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta: META,
    nodes: [...nodes],
    edges: [],
  } as Omit<DocumentGraphType, 'id' | 'digest'>);
}

// ---------------------------------------------------------------------------
// Arbitraries — small valid DocumentGraphs + disjoint concurrent patches
// ---------------------------------------------------------------------------

/** Distinct signal-axis names, so every node is its own logical cell (no accidental cell collisions). */
const arbAxis = fc.string({ minLength: 1, maxLength: 6 }).filter((s) => /^[a-z0-9_]+$/i.test(s));

/** A small set of DISTINCT signal axes (1..4). The `.filter` over a Set guarantees uniqueness. */
const arbDistinctAxes = fc
  .uniqueArray(arbAxis, { minLength: 1, maxLength: 4 })
  .map((axes) => [...new Set(axes)]);

/** A small valid base DocumentGraph: distinct signal nodes, sealed. */
const arbBaseGraph = arbDistinctAxes.map((axes) => graphOf(axes.map((a) => signal(a))));

/**
 * Three DISJOINT new axes guaranteed distinct from each other AND from a base
 * graph's axes — the raw material for non-conflicting concurrent patches. We
 * prefix to force disjointness rather than hope the random axes miss the base.
 */
const arbThreeNewAxes = fc
  .tuple(arbAxis, arbAxis, arbAxis)
  .map(([x, y, z]) => [`p0_${x}`, `p1_${y}`, `p2_${z}`] as const);

// ---------------------------------------------------------------------------
// LAW 1 — IDEMPOTENCE: re-applying the same patch to the same base is a no-op.
// (The patch id structurally includes `base`, and apply re-addresses the same
// node multiset, so a second apply to the same base yields the same id.)
// ---------------------------------------------------------------------------

describe('GraphPatch — IDEMPOTENCE (re-apply to the same base converges)', () => {
  test('apply(base, p) twice yields the SAME content-address id', () => {
    fc.assert(
      fc.property(arbBaseGraph, arbAxis, (base, axis) => {
        const node = signal(`new_${axis}`);
        const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node }]);
        const first = GraphPatch.apply(base, patch).id;
        const second = GraphPatch.apply(base, patch).id;
        return first === second;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('apply is settled: re-applying the SAME add to its OWN result is a no-op (the node already exists)', () => {
    // Adding a node that is already present dedups (apply keys nodes by content-address id),
    // so applying the patch to the result again does not change the id — set-union idempotence.
    fc.assert(
      fc.property(arbBaseGraph, arbAxis, (base, axis) => {
        const node = signal(`new_${axis}`);
        const op: PatchOp = { op: 'add', family: 'signal', node };
        const once = GraphPatch.apply(base, GraphPatch.propose(base, [op]));
        // Re-derive the SAME logical add against the now-larger graph: the node is already
        // present, so applying again must not change the id.
        const twice = GraphPatch.apply(once, GraphPatch.propose(once, [op]));
        return twice.id === once.id;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// LAW 2 — COMMUTATIVITY: two NON-CONFLICTING patches (disjoint cells) applied
// in either order yield the SAME final id. (Each patch is re-based onto the
// running graph honestly — propose against the current graph, not the stale base.)
// ---------------------------------------------------------------------------

describe('GraphPatch — COMMUTATIVITY of non-conflicting (disjoint-cell) patches', () => {
  test('apply(apply(G, p1), p2) and apply(apply(G, p2), p1) reach the SAME id', () => {
    fc.assert(
      fc.property(arbBaseGraph, arbThreeNewAxes, (base, [ax1, ax2]) => {
        const n1 = signal(ax1);
        const n2 = signal(ax2);
        const op1: PatchOp = { op: 'add', family: 'signal', node: n1 };
        const op2: PatchOp = { op: 'add', family: 'signal', node: n2 };

        // Order A: p1 then p2 (p2 re-based onto p1's result).
        const a1 = GraphPatch.apply(base, GraphPatch.propose(base, [op1]));
        const a2 = GraphPatch.apply(a1, GraphPatch.propose(a1, [op2]));

        // Order B: p2 then p1 (p1 re-based onto p2's result).
        const b1 = GraphPatch.apply(base, GraphPatch.propose(base, [op2]));
        const b2 = GraphPatch.apply(b1, GraphPatch.propose(b1, [op1]));

        return a2.id === b2.id;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// LAW 3 — CONVERGENCE (strong eventual consistency): N=3 concurrent
// non-conflicting patches, applied in ALL 6 permutations, converge to one id.
// ---------------------------------------------------------------------------

/** All 6 permutations of [0,1,2] — the orderings concurrent patches may interleave in. */
const PERMS_3: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

describe('GraphPatch — CONVERGENCE (strong eventual consistency over all orderings)', () => {
  test('3 concurrent non-conflicting adds converge to ONE id across all 6 orderings', () => {
    fc.assert(
      fc.property(arbBaseGraph, arbThreeNewAxes, (base, [ax0, ax1, ax2]) => {
        const ops: readonly PatchOp[] = [
          { op: 'add', family: 'signal', node: signal(ax0) },
          { op: 'add', family: 'signal', node: signal(ax1) },
          { op: 'add', family: 'signal', node: signal(ax2) },
        ];
        const finals = PERMS_3.map((perm) => {
          let g = base;
          for (const i of perm) {
            // Re-base each op onto the CURRENT graph (honest concurrent replay), apply.
            g = GraphPatch.apply(g, GraphPatch.propose(g, [ops[i]!]));
          }
          return g.id;
        });
        // Strong eventual consistency: every ordering reaches the identical content address.
        return new Set(finals).size === 1;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('convergence equals the single batch patch (order-independence ⟺ the merged multiset)', () => {
    // The converged id must also equal applying all three ops in ONE patch — the laws agree
    // on the final node multiset, not merely on each other.
    fc.assert(
      fc.property(arbBaseGraph, arbThreeNewAxes, (base, [ax0, ax1, ax2]) => {
        const ops: readonly PatchOp[] = [
          { op: 'add', family: 'signal', node: signal(ax0) },
          { op: 'add', family: 'signal', node: signal(ax1) },
          { op: 'add', family: 'signal', node: signal(ax2) },
        ];
        const batched = GraphPatch.apply(base, GraphPatch.propose(base, ops)).id;
        // Sequential, any order (use the identity ordering — convergence already proved order-free).
        let g = base;
        for (const op of ops) g = GraphPatch.apply(g, GraphPatch.propose(g, [op]));
        return g.id === batched;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// LAW 4 — CONFLICT BOUNDARY (the honest report): conflicting patches are
// order-dependent at the apply layer (LWW, NOT silently convergent), and the
// fork-detection seam (forkOf → DAG) actually surfaces the concurrent fork.
// ---------------------------------------------------------------------------

describe('GraphPatch — CONFLICT BOUNDARY (apply is LWW; fork detection lives on the receipt DAG)', () => {
  test('conflicting patches (same logical cell, different payload) are ORDER-DEPENDENT at the apply layer', () => {
    // Two writers update the SAME signal cell to DIFFERENT payloads off a shared base.
    // `apply` is last-writer-wins: the two orders produce DIFFERENT final ids. This LAW
    // pins that apply does NOT silently reconcile a conflict — a host must detect it, not
    // trust apply to converge. (If apply ever became order-INDEPENDENT here it would be
    // hiding a write; this guard would fail and flag that.)
    fc.assert(
      fc.property(arbBaseGraph, arbAxis, (baseGraph, axis) => {
        const cell = `conf_${axis}`;
        const original = signal(cell);
        const base = graphOf([...baseGraph.nodes, original]);
        const updateA = signal(cell, [0, 1]); // same cell, payload A
        const updateB = signal(cell, [0, 2]); // same cell, payload B
        // diff collapses each into one `update` op on the shared cell — a genuine conflict.
        const pA = GraphPatch.diff(base, graphOf([...baseGraph.nodes, updateA]));
        const pB = GraphPatch.diff(base, graphOf([...baseGraph.nodes, updateB]));

        const ab = GraphPatch.apply(GraphPatch.apply(base, pA), pB).id;
        const ba = GraphPatch.apply(GraphPatch.apply(base, pB), pA).id;
        // ORDER-DEPENDENT: the last write wins, so the two orders DISAGREE.
        return ab !== ba;
      }),
      { seed: SEED, numRuns: RUNS },
    );
  });

  test('the fork-detection seam SURFACES two concurrent patches off a shared base (forkOf → DAG.isFork)', async () => {
    // The honest conflict-surfacing layer: mint a receipt for each concurrent patch sharing
    // the SAME `previous` (a genesis parent), ingest both into one receipt DAG. Two children
    // of the same parent = a fork; `forkOf` reports it. This is where concurrency is DETECTED,
    // not at `apply`.
    const base = graphOf([signal('shared')]);
    const pA = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: signal('branch_a') }]);
    const pB = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: signal('branch_b') }]);

    // A common parent receipt, then two children both chaining onto it (concurrent branches).
    const parent = await Effect.runPromise(GraphPatch.receipt(pA));
    const childA = await Effect.runPromise(GraphPatch.receipt(pA, { previous: parent.hash }));
    const childB = await Effect.runPromise(GraphPatch.receipt(pB, { previous: parent.hash }));

    const local = DAG.fromReceipts([parent]);
    const result = GraphPatch.forkOf(local, [childA, childB]);
    // Two children of one parent ⇒ the DAG has multiple heads ⇒ a fork is SURFACED.
    expect(result.forked).toBe(true);
    expect(DAG.isFork(result.dag)).toBe(true);
  });

  test('a single child off the parent is NOT a fork (the seam does not cry wolf)', async () => {
    const base = graphOf([signal('shared')]);
    const p = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: signal('only') }]);
    const parent = await Effect.runPromise(GraphPatch.receipt(p));
    const child = await Effect.runPromise(GraphPatch.receipt(p, { previous: parent.hash }));
    const result = GraphPatch.forkOf(DAG.fromReceipts([parent]), [child]);
    expect(result.forked).toBe(false);
  });
});
