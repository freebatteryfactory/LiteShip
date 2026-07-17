/**
 * Capsule declaration locking the AI cast's graph SUMMARIZER — {@link
 * summarizeGraph} — as a standing `pureTransform` contract. Where
 * `graph-patch-identity.ts` proves the differ inverts itself, this pins the
 * token-budget LAWS the model-facing context depends on:
 *
 *  - DETERMINISM: same (graph, budget) ⇒ byte-identical summary (so the same
 *    AIContext content-address every time, on every machine).
 *  - BUDGET HONESTY: `estimatedTokens` never exceeds `tokenBudget` (the summary
 *    fits the budget it was cut to), and `truncated` is set iff a node was
 *    dropped.
 *  - BUDGET MONOTONICITY: a SMALLER budget never yields a LARGER summary — fewer
 *    lines, never more (the law a host relies on to trade context for cost).
 *  - TOTAL NODE-COUNT HONESTY: `nodeCount` always reports the TRUE total even
 *    when lines were elided (so the model knows what was hidden).
 *
 * WHY `pureTransform`: `summarizeGraph` is a pure function of `(graph, budget)` —
 * no receipt byte law, no async hashing, no mutate channel.
 *
 * WHY THE INPUT IS SEED MATERIAL (not a raw `DocumentGraph` + budget): a
 * `DocumentGraph` is content-addressed — node `id`s + graph `id`/`digest` are
 * `fnv1a` over the canonical CBOR of the payload, minted ONLY through
 * `sealNode`/`sealGraph`. A schema-arbitrary cannot mint those addresses, so the
 * seed generates a fully-supported domain (signal-axis name lists + two budgets)
 * and `run` SEALS a real graph and summarizes it at BOTH budgets, returning the
 * sealed graph so the invariants assert over the REAL summarizer output. The
 * axis-name domain deliberately includes the `__proto__`/`constructor` edge
 * vectors (lesson #12/#26): a node whose `input` is `__proto__` must summarize
 * and round-trip like any other (the summarizer keys nothing on a poisoned
 * prototype) — the seed dedups by raw string (distinct axis name ⇒ distinct node)
 * which is faithful because `summarizeNode` reads the axis VALUE, never folds it.
 *
 * @module
 */

import type { ContentAddress } from '../brands.js';
import { defineCapsule } from '../assembly.js';
import { S } from '../schema/index.js';
import type { Infer } from '../schema/index.js';
import { sealGraph, sealNode } from '../document-graph-address.js';
import { summarizeGraph } from '../ai-cast.js';
import type { GraphSummary } from '../ai-cast.js';
import type { DocumentGraph, DocumentGraphNode, SignalNode } from '../document-graph.js';
import type { CellMeta } from '../protocol.js';

/**
 * Seed material the schema-arbitrary CAN produce: the signal-axis names of the
 * graph to summarize, plus two NON-NEGATIVE budgets (one tight, one loose) so the
 * monotonicity law has two points to compare. `run` seals the graph and
 * summarizes at both.
 */
const AiCastSummarizeSeed = S.struct({
  /** Signal-axis names → one sealed `SignalNode` per DISTINCT name. */
  inputs: S.array(S.string),
  /** A token budget (clamped to ≥ 0 in `run`). */
  budgetA: S.number,
  /** A second token budget (clamped to ≥ 0 in `run`) — compared against `budgetA`. */
  budgetB: S.number,
});

type AiCastSummarizeSeedValue = Infer<typeof AiCastSummarizeSeed>;

/** Fixed volatile meta — excluded from the content address, so a constant is faithful. */
const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'ai-cast-summarize' },
  updated: { wall_ms: 0, counter: 0, node_id: 'ai-cast-summarize' },
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

/** Build a real, sealed graph from the seed (distinct axis names dedup to distinct nodes). */
function buildGraph(seed: AiCastSummarizeSeedValue): DocumentGraph {
  const seen = new Set<string>();
  const nodes: DocumentGraphNode[] = [];
  for (const input of seed.inputs) {
    if (seen.has(input)) continue;
    seen.add(input);
    nodes.push(signalNode(input));
  }
  return sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges: [] } as Omit<
    DocumentGraph,
    'id' | 'digest'
  >);
}

/** Clamp a raw seed number to a non-negative integer budget the summarizer accepts. */
function clampBudget(n: number): number {
  if (!Number.isFinite(n)) return 0;
  // CLAMP (not fold): a negative budget is clamped to 0 (a 0 budget → minimal/empty
  // summary), preserving the budget-edge semantics. `Math.abs` would turn -5 into 5
  // and silently grant a positive budget — wrong.
  return Math.max(0, Math.trunc(n));
}

/** Byte-faithful structural equality over a {@link GraphSummary} (deterministic VALUE). */
function sameSummary(a: GraphSummary, b: GraphSummary): boolean {
  if (a._tag !== b._tag) return false;
  if (a.base !== b.base) return false;
  if (a.tokenBudget !== b.tokenBudget) return false;
  if (a.estimatedTokens !== b.estimatedTokens) return false;
  if (a.truncated !== b.truncated) return false;
  if (a.nodeCount !== b.nodeCount) return false;
  if (a.lines.length !== b.lines.length) return false;
  for (let i = 0; i < a.lines.length; i++) if (a.lines[i] !== b.lines[i]) return false;
  return true;
}

/** The output: the sealed graph, the two clamped budgets, and both summaries. */
interface AiCastSummarizeOutput {
  readonly graph: DocumentGraph;
  readonly budgetA: number;
  readonly budgetB: number;
  readonly summaryA: GraphSummary;
  readonly summaryB: GraphSummary;
}

/**
 * Declared capsule for the AI cast summarizer. Registered in the module-level
 * catalog at import time; walked by the factory compiler. The generated property
 * test feeds schema-seeds, `run` seals a real graph and summarizes it at two
 * budgets, and the invariants assert determinism / budget honesty / monotonicity
 * / node-count honesty over the REAL summaries.
 */
export const aiCastSummarizeCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'core.ai-cast.summarize',
  input: AiCastSummarizeSeed,
  output: S.unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'determinism',
      check: (input: unknown, output: unknown): boolean => {
        const o = output as AiCastSummarizeOutput;
        // LAW: same (graph, budget) ⇒ byte-identical summary. Re-summarize the
        // SAME sealed graph at the SAME budget and demand value-equality — the
        // summary is what the AIContext content-address depends on, so a hidden
        // non-determinism here would fork the context id across machines.
        const again = summarizeGraph(o.graph, o.budgetA);
        return sameSummary(again, o.summaryA);
      },
      message: 'same (graph, budget) must yield a byte-identical summary (the AIContext id depends on it)',
    },
    {
      name: 'fits-budget',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as AiCastSummarizeOutput;
        // LAW: the summary FITS its budget — estimatedTokens never exceeds the
        // budget it was cut to. (Both branches: a tight budget and a loose one.)
        return o.summaryA.estimatedTokens <= o.budgetA && o.summaryB.estimatedTokens <= o.budgetB;
      },
      message: 'estimatedTokens must never exceed tokenBudget (the summary fits the budget it was cut to)',
    },
    {
      name: 'truncated-iff-elided',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as AiCastSummarizeOutput;
        // LAW: `truncated` is set IFF at least one node was dropped. lines ≤
        // nodeCount always; truncated ⇔ lines < nodeCount.
        for (const s of [o.summaryA, o.summaryB]) {
          if (s.lines.length > s.nodeCount) return false;
          if (s.truncated !== s.lines.length < s.nodeCount) return false;
        }
        return true;
      },
      message: 'truncated must hold iff a node was elided (lines < nodeCount)',
    },
    {
      name: 'budget-monotonic',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as AiCastSummarizeOutput;
        // LAW: a SMALLER budget never yields MORE lines (nor more estimated
        // tokens). Compare the two budgets head-to-head over the SAME graph — the
        // host's "trade context for cost" lever must be monotone.
        const [small, large] = o.budgetA <= o.budgetB ? [o.summaryA, o.summaryB] : [o.summaryB, o.summaryA];
        return small.lines.length <= large.lines.length && small.estimatedTokens <= large.estimatedTokens;
      },
      message: 'a smaller budget must never yield a larger summary (budget monotonicity)',
    },
    {
      name: 'node-count-honest',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as AiCastSummarizeOutput;
        // LAW: nodeCount always reports the TRUE total even when truncated — the
        // model must know what was elided, not just what it was shown.
        return o.summaryA.nodeCount === o.graph.nodes.length && o.summaryB.nodeCount === o.graph.nodes.length;
      },
      message: 'nodeCount must equal the true graph node total even when lines are elided',
    },
  ],
  budgets: { p95Ms: 2, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: AiCastSummarizeSeedValue): AiCastSummarizeOutput => {
    const graph = buildGraph(input);
    const budgetA = clampBudget(input.budgetA);
    const budgetB = clampBudget(input.budgetB);
    return {
      graph,
      budgetA,
      budgetB,
      summaryA: summarizeGraph(graph, budgetA),
      summaryB: summarizeGraph(graph, budgetB),
    };
  },
});

/** Internal helpers exported for direct unit assertions over the seed→summary builder. */
export const _aiCastSummarizeInternals = { buildGraph, signalNode, clampBudget, sameSummary } as const;
