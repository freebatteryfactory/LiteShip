/**
 * The client→server graph-mutation channel — the missing return leg.
 *
 * LiteShip's stream is server→client (SSE). This is the other direction: a client
 * proposes a change to the graph (a sort, a filter, an edit — expressed as a
 * {@link GraphPatch}), sends it back to the server, and the server VALIDATES it
 * against its own current truth before applying. It is the AI-cast refuse-seam
 * ({@link validateGraphPatchProposal} → {@link applyValidatedPatch}) turned into a
 * transport-agnostic request/response:
 *
 *   client: GraphPatch.propose(base, ops)  →  sendGraphMutation(url, patch)
 *   server: handleGraphMutation(request, store)
 *             → GraphPatch.decode → validateGraphPatchProposal → applyValidatedPatch
 *
 * The SAME validation an AI proposal passes governs a human client's edit: a patch
 * cast against a stale base (its `base` no longer matches the server's `graph.id`)
 * is REFUSED — optimistic concurrency for free — as is a dangling edge or a
 * malformed envelope. Nothing mutates the server graph except a validated patch.
 *
 * This module is transport-agnostic on purpose: `handleGraphMutation` takes an
 * already-parsed request and a host-owned {@link GraphStore}, and returns a plain
 * result — no `Request`/`Response`, no framework. `@czap/astro` wraps it into an
 * Astro API route; any host with a POST endpoint can wrap it the same way. The
 * host owns the graph store and thus the authority (ADR-0015): LiteShip provides
 * the channel and the gate, never the persistence.
 *
 * @module
 */

import type { DocumentGraph } from './document-graph.js';
import { GraphPatch } from './graph-patch.js';
import { validateGraphPatchProposal, applyValidatedPatch } from './ai-cast.js';

/**
 * A client's mutation request: the proposed patch as it arrived over the wire
 * (untrusted `unknown` — a serialized {@link GraphPatch} envelope). It is decoded
 * and validated on the server; the client never mutates the graph directly.
 */
export interface GraphMutationRequest {
  /** The raw, untrusted GraphPatch envelope the client proposed (e.g. parsed JSON). */
  readonly patch: unknown;
}

/**
 * The server's response. `applied` carries the new sealed graph (the client swaps
 * its view to this content-addressed truth); `refused` carries the structured
 * reasons the patch did not validate (base mismatch, dangling edge, version skew,
 * malformed envelope) — the graph is byte-identical to before.
 */
export type GraphMutationResponse =
  | { readonly status: 'applied'; readonly graph: DocumentGraph }
  | { readonly status: 'refused'; readonly errors: readonly string[] };

/**
 * The host's graph store — the authority boundary. LiteShip reads the current
 * truth and hands back the applied truth; the host decides where it lives (memory,
 * KV, DB) and persists it. `loadGraph` MUST return the current server-side graph
 * the client's patch will be validated against.
 */
export interface GraphStore {
  readonly loadGraph: () => DocumentGraph | Promise<DocumentGraph>;
  readonly saveGraph: (graph: DocumentGraph) => void | Promise<void>;
}

/**
 * Process one client mutation against the host's current graph. Pure of transport:
 * decode → validate → apply → save, returning `applied` (new sealed graph) or
 * `refused` (structured errors). Never throws for a bad proposal — a malformed
 * envelope becomes a `refused` response, exactly like a validation rejection, so
 * the caller has one shape to serialize.
 */
export async function handleGraphMutation(
  request: GraphMutationRequest,
  store: GraphStore,
): Promise<GraphMutationResponse> {
  let patch: GraphPatch;
  try {
    patch = GraphPatch.decode(request.patch);
  } catch (error) {
    // A malformed envelope is a refusal, not a crash — same shape as a validation
    // rejection. The decode error's message is the structured reason.
    return { status: 'refused', errors: [error instanceof Error ? error.message : String(error)] };
  }

  const base = await store.loadGraph();
  const result = validateGraphPatchProposal(base, patch);
  if (!result.ok) {
    return { status: 'refused', errors: result.errors };
  }

  const next = applyValidatedPatch(base, result.proposal);
  await store.saveGraph(next);
  return { status: 'applied', graph: next };
}

/**
 * Client-side sender: POST a proposed {@link GraphPatch} to the host's mutation
 * endpoint and resolve the server's {@link GraphMutationResponse}. A thin `fetch`
 * wrapper — the host wires the endpoint with {@link handleGraphMutation}. `fetchImpl`
 * is injectable for tests / non-browser hosts; it defaults to the global `fetch`.
 */
export async function sendGraphMutation(
  url: string,
  patch: GraphPatch,
  fetchImpl: typeof fetch = fetch,
): Promise<GraphMutationResponse> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ patch } satisfies GraphMutationRequest),
  });
  return (await response.json()) as GraphMutationResponse;
}
