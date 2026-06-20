/**
 * AI cast — the framework PRIMITIVE that teaches a {@link DocumentGraph} how to
 * speak to a model, and validates what the model proposes coming back.
 *
 * ONE-LINE SPEC (the boundary this module honors):
 * **"LiteShip teaches graphs how to speak to models; products decide whether
 * model suggestions become action."**
 *
 * This is the PRIMITIVE half of "AI" — NOT the producer. The flow it owns:
 *
 *   DocumentGraph
 *     → castContext()   : a deterministic, content-addressed {@link AIContext}
 *                         (the model-facing prompt + tool/output schema + a
 *                          token-budgeted graph summary)            [cast OUT]
 *     → (a model fills the advertised schema and proposes a GraphPatch /
 *        GeneratedUITree — OUTSIDE this module; the framework does NOT call it)
 *     → validateGraphPatchProposal() / validateGeneratedUIProposal()
 *                         : validate + preview, then MINT a {@link
 *                           ValidatedProposal} (the security envelope)  [cast IN]
 *     → applyValidatedPatch()  : a SEPARATE, host-authorized step that ONLY
 *                                accepts a validation-minted proposal.
 *
 * THE LOAD-BEARING RULE: there is NO path from raw model output to graph
 * mutation that skips validation. `applyValidatedPatch` cannot be called with
 * anything but a {@link ValidatedProposal}, which only the validators in this
 * module can mint (the apply token's witness is private — see
 * `validated-output.ts`). The framework EXPOSES apply but NEVER invokes it
 * itself.
 *
 * PROPOSAL-SCHEMA CLOSURE: the output schema the {@link AIContext} advertises
 * for "propose a GraphPatch" is the SAME `GraphPatch` shape the framework
 * validates on the way back in. Cast-out schema and cast-in validator are two
 * faces of one type — see {@link graphPatchProposalSchema}.
 *
 * PURITY (== "no producer"): this module imports ZERO network / provider /
 * credential APIs. It is a pure, deterministic projection + validation kernel.
 * Same graph + same budget ⇒ same content-addressed context.
 *
 * @module
 */

import type { ContentAddress } from './brands.js';
import { contentAddressOf } from './content-address.js';
import type { DocumentGraph, DocumentGraphNode, NodeFamily } from './document-graph.js';
import { isWellFormedNode } from './document-graph-schema.js';
import { linearizeGraph, sealNode } from './document-graph-address.js';
import { GraphPatch } from './graph-patch.js';
import type { PatchOp } from './graph-patch.js';
import type { ValidatedProposal, ProposalTarget } from './validated-output.js';
import { mintValidated, assertTokenBinds } from './validated-output.js';
import { InvariantViolationError, ValidationError } from '@czap/error';

// genui types are re-anchored from the shared spine (the same source `@czap/genui`
// uses) — TYPES ONLY, no genui runtime import, so the cast stays pure and core
// gains no edge into genui's renderer.
import type { ComponentCatalog, GeneratedUINode } from '@czap/_spine';

// ---------------------------------------------------------------------------
// Cast OUT — the model-facing AIContext
// ---------------------------------------------------------------------------

/**
 * A token-budgeted, deterministic summary of a {@link DocumentGraph}. Built by
 * walking the graph in topological order ({@link linearizeGraph}) and emitting
 * one terse line per node until the budget is spent — so the same graph + same
 * budget always yields the same summary (and the same content address).
 */
export interface GraphSummary {
  readonly _tag: 'GraphSummary';
  /** The graph this summarizes (its content address). */
  readonly base: ContentAddress;
  /** The token budget the summary was cut to. */
  readonly tokenBudget: number;
  /** Estimated tokens the summary consumes (deterministic estimator). */
  readonly estimatedTokens: number;
  /** Whether nodes were dropped to fit the budget. */
  readonly truncated: boolean;
  /** Total node count in the graph (so the model knows what was elided). */
  readonly nodeCount: number;
  /** One terse line per included node, in topological order. */
  readonly lines: readonly string[];
}

/**
 * The output-contract schema the {@link AIContext} advertises. Targets share one
 * shape: a JSON-Schema-ish descriptor plus the {@link ProposalTarget} tag that
 * routes a returned proposal to the matching validator. The GraphPatch schema is
 * the SAME `GraphPatch` the framework validates on the way back (closure).
 */
export interface ProposalSchema {
  readonly target: ProposalTarget;
  /** Human/model-readable name of the output contract. */
  readonly name: string;
  /** JSON Schema describing the exact payload the model must return. */
  readonly jsonSchema: Record<string, unknown>;
  /** One-line description surfaced to the model. */
  readonly description: string;
}

/**
 * The model-facing context cast OUT of a {@link DocumentGraph}. Deterministic and
 * content-addressed (`id` = fnv1a∘CanonicalCbor over the payload, the one repo
 * kernel) like every other cast. Carries:
 *  - `summary`: the token-budgeted graph projection,
 *  - `proposalSchemas`: the output contracts the model may fill (graph-patch
 *    and/or generated-ui), advertised so the model knows EXACTLY what to return,
 *  - `systemPrompt`: a deterministic prose framing of the above.
 *
 * It is INERT: nothing here calls a model. A producer feeds `systemPrompt` +
 * `proposalSchemas` to whatever model it routes to; the framework only built the
 * context.
 */
export interface AIContext {
  readonly _tag: 'AIContext';
  readonly _version: 1;
  /** Content address of this context (over summary + schemas + prompt). */
  readonly id: ContentAddress;
  /** The graph this context speaks for. */
  readonly base: ContentAddress;
  readonly summary: GraphSummary;
  readonly proposalSchemas: readonly ProposalSchema[];
  readonly systemPrompt: string;
}

/** Options for {@link castContext}. */
export interface CastContextOptions {
  /** Token budget for the embedded graph summary. Default 1024. */
  readonly tokenBudget?: number;
  /**
   * Which output contracts to advertise to the model. Default: `['graph-patch']`
   * (the graph-native target). Add `'generated-ui'` when the host also exposes a
   * component catalog (pass it via {@link CastContextOptions.catalog}).
   */
  readonly targets?: readonly ProposalTarget[];
  /**
   * Host component catalog, REQUIRED when `'generated-ui'` is among the targets:
   * the advertised GeneratedUITree schema enumerates the catalog's components so
   * the model proposes only registered names.
   */
  readonly catalog?: ComponentCatalog;
}

const DEFAULT_TOKEN_BUDGET = 1024;

/**
 * Deterministic token estimator — ~4 chars/token, the conventional rough budget
 * heuristic. Pure and locale-independent (counts UTF-16 code units), so the
 * estimate is byte-stable across machines (the summary's content address depends
 * on it only through `truncated`/`estimatedTokens`, both derived here).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** A terse, deterministic one-line rendering of a node for the budgeted summary. */
function summarizeNode(node: DocumentGraphNode): string {
  const head = `${node.family}#${node.id.slice(0, 12)}`;
  switch (node.family) {
    case 'signal':
      return `${head} input=${node.input}`;
    case 'entity':
      return `${head} components=${node.components.length}`;
    case 'component':
      return `${head} name=${node.name}`;
    case 'pose':
      return `${head} state=${node.state}`;
    case 'transition':
      return `${head} ${node.fromPose.slice(0, 8)}→${node.toPose.slice(0, 8)}`;
    case 'projection':
      return `${head} target=${node.target}`;
    case 'policy':
      return `${head} requires=${node.requires}`;
    case 'export':
      return `${head} carrier=${node.carrier}`;
    default: {
      // Exhaustiveness guard — a new NodeFamily must extend this switch.
      const _exhaustive: never = node;
      return `${(_exhaustive as DocumentGraphNode).family}`;
    }
  }
}

/**
 * Project a {@link DocumentGraph} to a token-budgeted {@link GraphSummary}. Walks
 * nodes in topological order (REUSING {@link linearizeGraph}; falls back to the
 * graph's own node order if the graph is cyclic — `linearizeGraph` returns the
 * partial sort plus the cycle, and a budgeted summary must still be emittable for
 * an in-progress/invalid graph). Emits one line per node until the next line
 * would exceed the budget. DETERMINISTIC: same graph + same budget ⇒ same
 * summary ⇒ same content address.
 */
export function summarizeGraph(graph: DocumentGraph, tokenBudget = DEFAULT_TOKEN_BUDGET): GraphSummary {
  const byId = new Map<ContentAddress, DocumentGraphNode>(graph.nodes.map((n) => [n.id, n]));
  const { sorted } = linearizeGraph(graph);
  // RESOLVED (open question #4 — summary on a cyclic / in-progress graph). A
  // budgeted summary must be emittable EVEN for an invalid graph (the model is
  // often asked to FIX exactly such a graph), so summarize never throws on a
  // cycle. Topological order when acyclic; for a cyclic graph `sorted` is the
  // partial order — append any nodes the sort could not place (in their authoring
  // order, which is itself canonical for an addressed graph) so every node is
  // reachable AND the summary stays deterministic (a stable, total ordering for
  // any graph, valid or not). Validation of a PROPOSED change is a separate gate.
  const ordered: DocumentGraphNode[] = [];
  const seen = new Set<ContentAddress>();
  for (const id of sorted) {
    const node = byId.get(id);
    if (node && !seen.has(id)) {
      seen.add(id);
      ordered.push(node);
    }
  }
  for (const node of graph.nodes) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      ordered.push(node);
    }
  }

  const lines: string[] = [];
  let estimatedTokens = 0;
  let truncated = false;
  for (const node of ordered) {
    const line = summarizeNode(node);
    const cost = estimateTokens(line);
    if (estimatedTokens + cost > tokenBudget) {
      truncated = true;
      break;
    }
    lines.push(line);
    estimatedTokens += cost;
  }

  return {
    _tag: 'GraphSummary',
    base: graph.id,
    tokenBudget,
    estimatedTokens,
    truncated,
    nodeCount: graph.nodes.length,
    lines,
  };
}

// ---------------------------------------------------------------------------
// Proposal-schema closure — the output contract == the validated-in shape
// ---------------------------------------------------------------------------

/** The single node-family enum, surfaced into the advertised GraphPatch schema. */
const NODE_FAMILIES: readonly NodeFamily[] = [
  'signal',
  'entity',
  'component',
  'pose',
  'transition',
  'projection',
  'policy',
  'export',
];

/**
 * The output contract advertised for "propose a GraphPatch". This is the cast-OUT
 * face of the SAME `GraphPatch` the framework validates cast-IN — the model fills
 * exactly the shape {@link GraphPatch.validate} reads. Closure is structural: a
 * payload that satisfies this schema is a candidate `GraphPatch`; the validator
 * then re-runs the structural integrity check on its apply result.
 *
 * `base` is pinned to the context's graph so the model proposes a delta against
 * the graph it was shown.
 */
export function graphPatchProposalSchema(base: ContentAddress): ProposalSchema {
  return {
    target: 'graph-patch',
    name: 'GraphPatch',
    description:
      'Propose a tagged-delta mutation over the document graph. The framework validates ' +
      'the would-be result (no cycles, no dangling edges) before any host applies it.',
    jsonSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      required: ['_tag', '_version', 'base', 'ops'],
      properties: {
        _tag: { const: 'GraphPatch' },
        _version: { const: 1 },
        base: { const: base, description: 'The id of the graph this patch applies to.' },
        ops: {
          type: 'array',
          description: 'Ordered node/edge mutations.',
          items: {
            oneOf: [
              {
                type: 'object',
                required: ['op', 'family', 'node'],
                properties: {
                  // Nodes are CONTENT-ADDRESSED, so a changed payload has a new id. `update`
                  // is a LOGICAL REPLACE: apply drops the prior node in the same logical cell
                  // (same signal axis / component name / pose key / …) and installs this one.
                  // `add` introduces a new cell; `remove` deletes one by id.
                  op: {
                    enum: ['add', 'remove', 'update'],
                    description:
                      'add a new node, remove one by id, or update (replace the node in the same logical cell).',
                  },
                  family: { enum: [...NODE_FAMILIES] },
                  node: { type: 'object', description: 'A sealed DocumentGraphNode (the new payload for add/update).' },
                },
              },
              {
                type: 'object',
                required: ['op', 'edge'],
                properties: {
                  op: { enum: ['add', 'remove'] },
                  edge: {
                    type: 'object',
                    required: ['from', 'to', 'type'],
                    properties: { from: { type: 'string' }, to: { type: 'string' }, type: { type: 'string' } },
                  },
                },
              },
            ],
          },
        },
      },
    },
  };
}

/**
 * The output contract advertised for "propose a GeneratedUITree". Enumerates the
 * host catalog's registered component names so the model proposes only nodes the
 * host can render — the cast-OUT face of genui's `validateGeneratedUITree`
 * (cast-IN). This is the genui INSTANCE of the same propose→validate→envelope
 * discipline.
 */
export function generatedUIProposalSchema(catalog: ComponentCatalog): ProposalSchema {
  const componentNames = Object.keys(catalog.components).sort();
  return {
    target: 'generated-ui',
    name: 'GeneratedUITree',
    description:
      'Propose a UI tree using ONLY the host catalog components below. The framework ' +
      'validates names, props, and child policy before any host renders it.',
    jsonSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      // The catalog's content hash binds this schema to the EXACT catalog version. A host
      // can change a component's required props / child policy / tag WITHOUT renaming it;
      // the component-name enum would then be identical and a cached AIContext stale. Folding
      // the hash in makes the advertised schema — and the content-addressed AIContext that
      // embeds it — change whenever the catalog changes.
      'x-catalog-hash': catalog.catalogHash,
      type: 'object',
      required: ['name', 'props'],
      properties: {
        name: { enum: componentNames, description: 'A registered catalog component name.' },
        props: { type: 'object' },
        children: { type: 'array', items: { $ref: '#' } },
        slots: { type: 'object' },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// castContext — DocumentGraph → AIContext (the whole cast-OUT step)
// ---------------------------------------------------------------------------

/** Deterministic prose framing of the summary + advertised output contracts. */
function buildSystemPrompt(summary: GraphSummary, schemas: readonly ProposalSchema[]): string {
  const sections: string[] = [];
  sections.push('You are reading a content-addressed document graph and may PROPOSE a change to it.');
  sections.push('You do not apply changes. A separate host authority decides whether your proposal is admitted.');
  sections.push('');
  sections.push(`## Graph (${summary.nodeCount} nodes${summary.truncated ? ', truncated to budget' : ''})`);
  for (const line of summary.lines) sections.push(`- ${line}`);
  sections.push('');
  sections.push('## You may return one of these proposals');
  for (const schema of schemas) {
    sections.push(`### ${schema.name} (target: ${schema.target})`);
    sections.push(schema.description);
  }
  return sections.join('\n');
}

/**
 * Cast a {@link DocumentGraph} OUT to a deterministic, content-addressed
 * {@link AIContext}: a token-budgeted summary, the advertised output contracts
 * (GraphPatch always; GeneratedUITree when a catalog is supplied), and a prose
 * system prompt. NO model is called — this only BUILDS the context a producer
 * would feed to one.
 *
 * Determinism: same graph + same options ⇒ byte-identical context ⇒ same `id`.
 */
export function castContext(graph: DocumentGraph, options: CastContextOptions = {}): AIContext {
  const tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
  // RESOLVED (open question #3 — default advertised targets). Default to the
  // graph-NATIVE target alone (`['graph-patch']`): it is the only target a bare
  // DocumentGraph can advertise without extra host input. `generated-ui` needs a
  // host component catalog (a renderer concern the framework does not own), so a
  // host opts INTO it explicitly by passing `targets` + `catalog`. The
  // conservative default never advertises a contract the framework cannot close.
  const targets = options.targets ?? (['graph-patch'] as const);
  const summary = summarizeGraph(graph, tokenBudget);

  const proposalSchemas: ProposalSchema[] = [];
  for (const target of targets) {
    if (target === 'graph-patch') {
      proposalSchemas.push(graphPatchProposalSchema(graph.id));
    } else if (target === 'generated-ui') {
      if (!options.catalog) {
        throw ValidationError(
          'AICast.castContext',
          "target 'generated-ui' requires a host component catalog (options.catalog). " +
            'The advertised UI schema must enumerate the catalog the host can render.',
        );
      }
      proposalSchemas.push(generatedUIProposalSchema(options.catalog));
    }
  }

  const systemPrompt = buildSystemPrompt(summary, proposalSchemas);
  const id = contentAddressOf({ base: graph.id, summary, proposalSchemas, systemPrompt });
  return { _tag: 'AIContext', _version: 1, id, base: graph.id, summary, proposalSchemas, systemPrompt };
}

// ---------------------------------------------------------------------------
// Cast IN — validators that MINT the security envelope
// ---------------------------------------------------------------------------

/** A validation failure carrying the structured reason the proposal was rejected. */
export type ProposalRejection = {
  readonly ok: false;
  readonly target: ProposalTarget;
  readonly errors: readonly string[];
};

/** A passing validation — carries the minted {@link ValidatedProposal}. */
export type ProposalAcceptance<T> = {
  readonly ok: true;
  readonly proposal: ValidatedProposal<T>;
};

/** The outcome of validating a model proposal: an acceptance (with envelope) or a rejection (with errors). */
export type ProposalResult<T> = ProposalAcceptance<T> | ProposalRejection;

// ---------------------------------------------------------------------------
// Untrusted-node validation — FACTORED OUT to `document-graph-schema.ts`.
//
// A model-proposed node is untrusted JSON, and so is a serialized graph the
// runtime loader (`@czap/astro`) lowers. The per-family `Schema.Union` that
// answers "is this a well-formed DocumentGraphNode?" now lives in ONE place so
// BOTH this AI seam AND the loader share a single trust gate (no second,
// drifting copy). The schema + its compile-time family-exhaustiveness check
// moved verbatim; `isWellFormedNode` is re-exported below for back-compat.
// ---------------------------------------------------------------------------

/** Re-exported from `document-graph-schema.ts` so existing `@czap/core` consumers keep the same import site. */
export { isWellFormedNode, DocumentGraphNodeSchema } from './document-graph-schema.js';

/**
 * Validate a proposed node op's payload against {@link DocumentGraphNodeSchema} — the one
 * declarative schema for all eight families. Also checks the op's declared `family`
 * matches the node's own `family`. Returns an error string, or null when well-formed.
 */
function nodeSchemaError(op: { family?: unknown; node: unknown }, i: number): string | null {
  const nodeFamily = (op.node as { family?: unknown } | null)?.family;
  // The advertised NodePatchOp REQUIRES `family`; a missing op.family must not slip
  // through (it would mint a patch whose op violates the advertised schema).
  if (op.family === undefined) {
    return `Patch op[${i}] node op is missing its required 'family' field.`;
  }
  if (op.family !== nodeFamily) {
    return `Patch op[${i}] op.family ${JSON.stringify(op.family)} does not match node.family ${JSON.stringify(nodeFamily)}.`;
  }
  if (!isWellFormedNode(op.node)) {
    return `Patch op[${i}] node does not conform to the DocumentGraph node schema for family ${JSON.stringify(nodeFamily)} (missing or wrong-typed required fields).`;
  }
  return null;
}

/**
 * Validate a model-proposed {@link GraphPatch} against the graph it was cast from,
 * then MINT a {@link ValidatedProposal} on success. This is the ONLY way to obtain
 * a graph-patch proposal a host can apply.
 *
 * It runs {@link GraphPatch.validate} (which previews the apply and re-checks
 * structural integrity — no cycles, no dangling edges) AND re-pins the patch's
 * `base` to the graph (a proposal must apply to the graph the model was shown).
 * Only when BOTH pass does it call `mintValidated` — so an unvalidated patch can
 * never become a `ValidatedProposal`.
 */
export function validateGraphPatchProposal(graph: DocumentGraph, patch: GraphPatch): ProposalResult<GraphPatch> {
  const errors: string[] = [];
  // TOTAL on untrusted input: a parsed model response may not be a well-formed
  // GraphPatch envelope at all. Guard the SHAPE before touching `patch.base`/`patch.ops`
  // — a non-object patch or a missing / non-array `ops` must yield a clean
  // ProposalRejection, never a TypeError that escapes the validation boundary and
  // crashes host admission code.
  const env = patch as { _tag?: unknown; ops?: unknown } | null;
  if (env === null || typeof env !== 'object' || env._tag !== 'GraphPatch' || !Array.isArray(env.ops)) {
    return {
      ok: false,
      target: 'graph-patch',
      errors: ['Proposal is not a well-formed GraphPatch envelope (expected { _tag: "GraphPatch", ops: [...] }).'],
    };
  }
  if (patch.base !== graph.id) {
    errors.push(
      `Patch base ${patch.base} does not match the cast graph ${graph.id}. ` +
        'A proposal must apply to the graph it was cast from.',
    );
  }
  // Enforce PatchOp discriminants on the UNTRUSTED ops BEFORE the structural preview.
  // `GraphPatch.validate` only checks the graph PRODUCED by applying the ops, and
  // `GraphPatch.apply` treats every non-'remove' EDGE op as an add — so a malformed
  // edge op (e.g. `op:'update'`, off-schema for edges) would otherwise be silently
  // applied as an add, pass validate, and mint a validated edge from an off-schema op.
  // Model JSON is untrusted, so the op shape itself must be gated here (the discriminant
  // is a contract the parsed payload can violate even though the TS type forbids it).
  if (errors.length === 0) {
    const NODE_DISCRIMINANTS = new Set(['add', 'remove', 'update']);
    const EDGE_DISCRIMINANTS = new Set(['add', 'remove']);
    // The closed EdgeType set (plan.ts). `GraphPatch.validate` only checks
    // cycles/dangling endpoints, NOT the edge `type` — so without this an edge with an
    // off-schema `type` ("foo") would mint and persist as a structurally-invalid
    // DocumentGraphEdge. Model JSON is untrusted, so the edge type is gated here.
    const EDGE_TYPES = new Set(['seq', 'par', 'choice_then', 'choice_else']);
    patch.ops.forEach((rawOp, i) => {
      const op = rawOp as { op?: unknown; node?: unknown; edge?: unknown };
      if (op === null || typeof op !== 'object') {
        errors.push(`Patch op[${i}] is not an object (malformed).`);
        return;
      }
      const kind = 'node' in op ? 'node' : 'edge' in op ? 'edge' : null;
      if (kind === null) {
        errors.push(`Patch op[${i}] is neither a node nor an edge op (malformed).`);
      } else if (kind === 'node') {
        if (!NODE_DISCRIMINANTS.has(op.op as string)) {
          errors.push(
            `Patch op[${i}] (node) has invalid discriminant ${JSON.stringify(op.op)} (expected add|remove|update).`,
          );
        } else if (op.node === null || typeof op.node !== 'object') {
          // A node op with `node:null` passes the discriminant but the truthy re-seal
          // guard skips it, leaving `GraphPatch.propose` to deref `node.id` and throw.
          // Gate it here so the validator stays TOTAL.
          errors.push(`Patch op[${i}] (node) is missing its node object (got ${JSON.stringify(op.node)}).`);
        } else {
          // Schema conformance: sealNode fixes only the id, not the payload shape, so the
          // node is decoded against its family's schema (the single source of truth).
          const schemaErr = nodeSchemaError(op as { family?: unknown; node: unknown }, i);
          if (schemaErr) errors.push(schemaErr);
        }
      } else if (kind === 'edge') {
        if (!EDGE_DISCRIMINANTS.has(op.op as string)) {
          errors.push(`Patch op[${i}] (edge) has invalid discriminant ${JSON.stringify(op.op)} (expected add|remove).`);
        } else {
          const edge = op.edge as { type?: unknown } | null;
          if (edge === null || typeof edge !== 'object' || !EDGE_TYPES.has(edge.type as string)) {
            errors.push(
              `Patch op[${i}] (edge) has invalid type ${JSON.stringify((edge as { type?: unknown } | null)?.type)} ` +
                '(expected seq|par|choice_then|choice_else).',
            );
          }
        }
      }
    });
  }
  // RE-SEAL each proposed node before trusting its identity. A node op carries a
  // DocumentGraphNode whose `id` is a content address; untrusted model JSON can claim
  // `node.id` equal to an EXISTING node's id while carrying a DIFFERENT payload (a
  // content-address forgery — an add/update masquerading as another node). `sealNode`
  // recomputes the id from the payload (addressing excludes the id field), so a forged
  // id is corrected to the node's TRUE address; an edge that referenced the forged id
  // then dangles and is caught by the structural preview. Re-sealing an already-correct
  // node is a no-op (deterministic addressing). A node payload too malformed to seal is
  // rejected rather than thrown.
  let resealedOps: readonly PatchOp[] = patch.ops;
  if (errors.length === 0) {
    try {
      resealedOps = patch.ops.map((op) => ('node' in op && op.node ? { ...op, node: sealNode(op.node) } : op));
    } catch (e) {
      errors.push(`A proposed node could not be sealed (malformed node payload): ${String(e)}`);
    }
  }
  if (errors.length === 0) {
    // RESOLVED (open question #5 — RE-STAMP the result identity, never trust the
    // model's). `propose` recomputes `base` + `resultId` deterministically from the
    // (re-sealed) ops through the one kernel, discarding any model-supplied `resultId`
    // (a stale/forged value would mis-key a host that cites/caches by it). It never
    // changes WHICH patch is validated. We then validate the RE-SEALED, stamped patch
    // structurally (no cycles, no dangling edges) and mint only on success.
    const stamped = GraphPatch.propose(graph, resealedOps);
    const structural = GraphPatch.validate(graph, stamped);
    if (structural.ok) {
      return { ok: true, proposal: mintValidated('graph-patch', stamped) };
    }
    for (const err of structural.errors) {
      errors.push(typeof err === 'string' ? err : JSON.stringify(err));
    }
  }
  return { ok: false, target: 'graph-patch', errors };
}

/**
 * The catalog-validation contract genui owns.
 *
 * RESOLVED (open question #2 — inject vs MOVE genui's `validateGeneratedUITree`
 * into core). INJECTION: the cast core does NOT depend on genui's runtime, and we
 * do NOT relocate genui's validator into core. The host (which already has
 * `@czap/genui`) passes its `validateGeneratedUITree` in as this function, so the
 * cast reuses genui's EXACT validation discipline with ZERO genui-file churn and
 * no core→genui (renderer) edge — preserving the product boundary and keeping the
 * core pure. genui's internals are untouched; this is the only seam between them.
 *
 * RESOLVED (open question #8 — the injected validator's error SHAPE). We pin the
 * narrowest contract that lets the cast surface a structured rejection: a success
 * or a failure carrying `error.message` (plus an optional `error.path`). This is
 * genui's existing `validateGeneratedUITree` return shape, so the host injects it
 * verbatim (no adapter). The cast NORMALIZES it into its own `ProposalRejection`
 * so both
 * targets reject through one `ProposalResult` shape — a foreign validator that
 * conforms to the type slots in cleanly, but a malformed model tree never reaches
 * a renderer because only `ok: true` mints the envelope.
 */
export type GeneratedUIValidator = (
  node: GeneratedUINode,
  catalog: ComponentCatalog,
) =>
  | { readonly ok: true }
  | { readonly ok: false; readonly error: { readonly message: string; readonly path?: string } };

/**
 * Validate a model-proposed {@link GeneratedUINode} against a host catalog using
 * the host's genui validator, then MINT a {@link ValidatedProposal}. The genui
 * instance of the SAME envelope discipline — same gate, same minting, same
 * unforgeable token — so a UI tree cannot reach a host renderer un-validated any
 * more than a GraphPatch can reach a host mutator un-validated.
 *
 * The validator is injected (not imported) to keep the cast core free of the
 * genui renderer dependency; pass `validateGeneratedUITree` from `@czap/genui`.
 */
export function validateGeneratedUIProposal(
  node: GeneratedUINode,
  catalog: ComponentCatalog,
  validate: GeneratedUIValidator,
): ProposalResult<GeneratedUINode> {
  // TOTAL on untrusted input: parsed model JSON may not be a well-formed GeneratedUINode.
  // Guard the shape before the INJECTED validator (a host function the cast cannot assume
  // is total — it may deref `node.name`/`node.children`). A bad shape is a clean rejection.
  const n = node as { name?: unknown; children?: unknown } | null;
  if (
    n === null ||
    typeof n !== 'object' ||
    typeof n.name !== 'string' ||
    (n.children !== undefined && !Array.isArray(n.children))
  ) {
    return {
      ok: false,
      target: 'generated-ui',
      errors: ['Proposal is not a well-formed GeneratedUINode (expected { name: string, children?: [...] }).'],
    };
  }
  // The injected validator is host-provided; wrap it so a throw becomes a rejection
  // rather than escaping the validation boundary into host admission code.
  let result: ReturnType<GeneratedUIValidator>;
  try {
    result = validate(node, catalog);
  } catch (e) {
    return {
      ok: false,
      target: 'generated-ui',
      errors: [`Generated-UI validation threw on the proposal: ${String(e)}`],
    };
  }
  if (!result.ok) {
    const where = result.error.path ? ` (at ${result.error.path})` : '';
    return { ok: false, target: 'generated-ui', errors: [`${result.error.message}${where}`] };
  }
  return { ok: true, proposal: mintValidated('generated-ui', node) };
}

// ---------------------------------------------------------------------------
// Apply — the SEPARATE, host-authorized step (framework exposes, never invokes)
// ---------------------------------------------------------------------------

/**
 * Apply a VALIDATED graph-patch proposal to a graph. This is the host-authorized
 * mutation step the framework EXPOSES but NEVER calls itself. Its signature
 * DEMANDS a {@link ValidatedProposal} — which only {@link validateGraphPatchProposal}
 * can mint — so there is no path from raw model output to mutation that skips
 * validation. Before applying, it re-asserts the apply token binds to the exact
 * payload (defense-in-depth against post-validation tampering).
 *
 * Re-addresses through the one kernel ({@link GraphPatch.apply} → `sealGraph`), so
 * the result is indistinguishable from a graph authored fresh.
 *
 * APPLY-TIME GRAPH IDENTITY GUARD: a proposal is validated against a SPECIFIC graph
 * (its `payload.base` is pinned to that graph's id by {@link validateGraphPatchProposal}).
 * If the document graph advances between validate and apply, applying the validated
 * ops to a DIFFERENT graph could silently produce a structurally invalid result (an
 * edge valid in graph A may dangle in graph B). `GraphPatch.apply` itself ignores
 * `patch.base`, so we enforce the binding here: refuse to apply unless the apply-time
 * `graph.id` matches the `base` the proposal was validated against. The host remains
 * the authority over WHETHER to apply; this just stops a silent mis-apply against the
 * wrong graph (re-validate against the advanced graph to get a fresh proposal).
 */
export function applyValidatedPatch(graph: DocumentGraph, proposal: ValidatedProposal<GraphPatch>): DocumentGraph {
  // TARGET GATE: this is the GRAPH-PATCH apply step. A proposal authentically minted
  // for a DIFFERENT target (e.g. 'generated-ui') must NOT reach `GraphPatch.apply` —
  // `assertTokenBinds` only proves the token agrees with the proposal's OWN target, not
  // that the target is the one THIS entrypoint serves. From JS (or a cast), a validated
  // generated-ui proposal could otherwise be handed here and its UI-tree payload fed to
  // the graph mutator. Pin the target before anything else.
  if (proposal.target !== 'graph-patch') {
    throw InvariantViolationError(
      'ai-cast.apply-contract',
      `applyValidatedPatch: expected a 'graph-patch' proposal but got '${proposal.target}'; refusing to apply.`,
    );
  }
  // FULL provenance gate via assertTokenBinds — NOT an inline address-only check.
  // `contentAddressOf` is part of the public surface, so a caller from JS (or TS
  // casting untrusted model output) could fabricate a proposal-shaped object whose
  // `subject` it computed itself and pass an address-only guard. The module-private
  // `ApplyTokenWitness` is the real, unforgeable defense; assertTokenBinds verifies
  // the witness (validator-minted) AND target consistency AND the payload binding.
  assertTokenBinds(proposal);
  // Bind the proposal to the graph it was validated against (its pinned `base`).
  if (proposal.payload.base !== graph.id) {
    throw InvariantViolationError(
      'ai-cast.apply-contract',
      `applyValidatedPatch: proposal was validated against graph ${proposal.payload.base} but is being applied to ${graph.id}. ` +
        'The graph advanced after validation; refusing to apply. Re-validate the proposal against the current graph.',
    );
  }
  return GraphPatch.apply(graph, proposal.payload);
}

/**
 * The AI cast namespace — the framework PRIMITIVE that casts a {@link DocumentGraph}
 * OUT to a model-facing {@link AIContext}, validates the patch / UI tree the model
 * proposes back IN (minting the {@link ValidatedProposal} security envelope), and
 * exposes (never invokes) the host-authorized apply step.
 *
 * "LiteShip teaches graphs how to speak to models; products decide whether model
 * suggestions become action."
 *
 * @example
 * ```ts
 * import { AICast, GraphPatch } from '@czap/core';
 *
 * const ctx = AICast.castContext(graph, { tokenBudget: 512 }); // cast OUT
 * // ... a producer feeds ctx.systemPrompt + ctx.proposalSchemas to a model,
 * //     which returns a candidate GraphPatch `patch` ...
 * const checked = AICast.validateGraphPatchProposal(graph, patch); // cast IN
 * if (checked.ok) {
 *   // a SEPARATE host authority decides to admit it:
 *   const next = AICast.applyValidatedPatch(graph, checked.proposal);
 * }
 * ```
 */
export const AICast = {
  castContext,
  summarizeGraph,
  graphPatchProposalSchema,
  generatedUIProposalSchema,
  validateGraphPatchProposal,
  validateGeneratedUIProposal,
  applyValidatedPatch,
} as const;
