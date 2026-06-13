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
import { linearizeGraph } from './document-graph-address.js';
import { GraphPatch } from './graph-patch.js';
import type { ValidatedProposal, ProposalTarget } from './validated-output.js';
import { mintValidated } from './validated-output.js';

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
  // Topological order when acyclic; for a cyclic graph `sorted` is the partial
  // order — append any nodes the sort could not place (in their authoring order,
  // which is itself canonical for an addressed graph) so every node is reachable.
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
                  op: { enum: ['add', 'remove', 'update'] },
                  family: { enum: [...NODE_FAMILIES] },
                  node: { type: 'object', description: 'A sealed DocumentGraphNode.' },
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
  const targets = options.targets ?? (['graph-patch'] as const);
  const summary = summarizeGraph(graph, tokenBudget);

  const proposalSchemas: ProposalSchema[] = [];
  for (const target of targets) {
    if (target === 'graph-patch') {
      proposalSchemas.push(graphPatchProposalSchema(graph.id));
    } else if (target === 'generated-ui') {
      if (!options.catalog) {
        throw new Error(
          "castContext: target 'generated-ui' requires a host component catalog (options.catalog). " +
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
export function validateGraphPatchProposal(
  graph: DocumentGraph,
  patch: GraphPatch,
): ProposalResult<GraphPatch> {
  const errors: string[] = [];
  if (patch.base !== graph.id) {
    errors.push(
      `Patch base ${patch.base} does not match the cast graph ${graph.id}. ` +
        'A proposal must apply to the graph it was cast from.',
    );
  }
  if (errors.length === 0) {
    const structural = GraphPatch.validate(graph, patch);
    if (!structural.ok) {
      for (const err of structural.errors) {
        errors.push(typeof err === 'string' ? err : JSON.stringify(err));
      }
    }
  }
  if (errors.length > 0) {
    return { ok: false, target: 'graph-patch', errors };
  }
  // Stamp the resultId via propose's preview so the validated payload carries the
  // re-addressed result id (a proposal without it would force the host to recompute).
  const stamped = patch.resultId ? patch : GraphPatch.propose(graph, patch.ops);
  return { ok: true, proposal: mintValidated('graph-patch', stamped) };
}

/**
 * The catalog-validation contract genui owns. The cast core does NOT depend on
 * genui's runtime; the host (which already has `@czap/genui`) passes its
 * `validateGeneratedUITree` in as this function, so the cast reuses genui's EXACT
 * validation discipline without core gaining an edge into the renderer.
 */
export type GeneratedUIValidator = (
  node: GeneratedUINode,
  catalog: ComponentCatalog,
) => { readonly ok: true } | { readonly ok: false; readonly error: { readonly message: string; readonly path?: string } };

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
  const result = validate(node, catalog);
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
 */
export function applyValidatedPatch(graph: DocumentGraph, proposal: ValidatedProposal<GraphPatch>): DocumentGraph {
  // Re-derive the token binding before honoring it (catches a swapped payload).
  const rederived = contentAddressOf({ target: proposal.target, payload: proposal.payload });
  if (rederived !== proposal.subject || proposal.token.subject !== proposal.subject) {
    throw new Error('applyValidatedPatch: proposal token does not bind to its payload; refusing to apply.');
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
