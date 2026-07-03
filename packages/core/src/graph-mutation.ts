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
import { decodeDocumentGraph, sealNode, sealGraph, validateGraph } from './document-graph-address.js';
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
 * The server's response. Three outcomes, one shape to consume:
 *   - `applied` — the new sealed graph (the client swaps its view to it);
 *   - `refused` — the patch did not validate (base mismatch, dangling edge, version skew,
 *     malformed envelope, or a lost-update CAS miss); the graph is byte-identical. The
 *     client's proposal was wrong — reload and re-propose, don't blindly retry;
 *   - `error` — a SERVER-side failure (store I/O, an unexpected throw), distinct from a
 *     refusal: the proposal may be fine, so a retry can succeed.
 */
export type GraphMutationResponse =
  | { readonly status: 'applied'; readonly graph: DocumentGraph }
  | { readonly status: 'refused'; readonly errors: readonly string[] }
  | { readonly status: 'error'; readonly message: string };

/** Normalize a thrown value to a message string (catches surface it, never swallow it). */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Shape guard for an untrusted server response — a proxy/error page, or a miswired
 * endpoint returning `{ status: 'applied' }` with no `graph`, is NOT a channel reply.
 * Validates the fields REQUIRED by each status, so a caller can dereference `graph` /
 * `errors` / `message` safely after branching on `status`.
 */
function isGraphMutationResponse(value: unknown): value is GraphMutationResponse {
  if (typeof value !== 'object' || value === null || !('status' in value)) return false;
  const record = value as Record<string, unknown>;
  switch (record.status) {
    case 'applied':
      return typeof record.graph === 'object' && record.graph !== null;
    case 'refused':
      return Array.isArray(record.errors) && record.errors.every((entry) => typeof entry === 'string');
    case 'error':
      return typeof record.message === 'string';
    default:
      return false;
  }
}

/**
 * The host's graph store — the authority boundary. LiteShip reads the current
 * truth and hands back the applied truth; the host decides where it lives (memory,
 * KV, DB) and persists it. `loadGraph` MUST return the current server-side graph
 * the client's patch will be validated against.
 */
export interface GraphStore {
  readonly loadGraph: () => DocumentGraph | Promise<DocumentGraph>;
  /**
   * Compare-and-swap the graph: commit `next` ONLY if the store's current graph is still
   * `expected` — the base the patch was validated against, compared by its content
   * address (`id`). Return `false` if the store moved since `loadGraph` (a concurrent
   * commit won); the channel then REFUSES so the client reloads and retries.
   *
   * This is where the optimistic-concurrency guarantee is actually enforced. The
   * base-match validation stops a client that proposed against a STALE base; the CAS
   * stops two clients that both loaded the SAME base from clobbering each other (the
   * lost-update race). In-memory, compare the ids and swap only on a match; a DB/KV host
   * does a version-conditional UPDATE.
   */
  readonly saveGraph: (next: DocumentGraph, expected: DocumentGraph) => boolean | Promise<boolean>;
}

/**
 * Process one client mutation against the host's current graph. Pure of transport:
 * decode → load → validate → apply → save. NEVER throws — every failure maps to a
 * response shape, so the caller has exactly one thing to serialize:
 *   - a bad proposal (malformed envelope, validation rejection, CAS miss) → `refused`;
 *   - a store I/O failure (loadGraph / saveGraph reject) → `error` (not the client's
 *     fault; a raw persistence error must not escape as an unstructured 500).
 *
 * The `error.message` is surfaced to the caller (and, via `graphMutationRoute`, to the
 * HTTP client) — deliberately: a blanket "internal error" would strand a host debugging a
 * failed mutation, the silent degradation LiteShip refuses to ship. LiteShip surfaces what
 * the host's store throws; it does not redact it. A `GraphStore` whose errors could carry
 * secrets (connection strings, internal paths) MUST therefore catch and re-throw a redacted
 * message inside the store — the store is the host's authority boundary (ADR-0015).
 */
export async function handleGraphMutation(
  request: GraphMutationRequest,
  store: GraphStore,
): Promise<GraphMutationResponse> {
  let patch: GraphPatch;
  try {
    patch = GraphPatch.decode(request.patch);
  } catch (error) {
    // A malformed envelope is a refusal (the client's proposal), not a crash.
    return { status: 'refused', errors: [messageOf(error)] };
  }

  let base: DocumentGraph;
  try {
    base = await store.loadGraph();
  } catch (error) {
    // A store read failure is a SERVER error, not a refusal — the patch may be fine.
    return { status: 'error', message: `loadGraph failed: ${messageOf(error)}` };
  }

  const result = validateGraphPatchProposal(base, patch);
  if (!result.ok) {
    return { status: 'refused', errors: result.errors };
  }

  // Defense-in-depth: validation above binds the proposal to THIS base, so apply cannot
  // fail by construction. But the module's contract is UNCONDITIONAL ("never throws"), so
  // a post-validation invariant break (e.g. a future refactor of the validate/apply pair)
  // still maps to `error` rather than escaping as a rejected promise the caller can't shape.
  let next: DocumentGraph;
  try {
    next = applyValidatedPatch(base, result.proposal);
  } catch (error) {
    return { status: 'error', message: `apply failed: ${messageOf(error)}` };
  }

  // Compare-and-swap: if a concurrent request already advanced the store past `base`,
  // the commit is rejected and the patch is refused (reload + retry). The base-match
  // validation above guards a STALE client; this guards two clients racing the SAME base.
  let committed: boolean;
  try {
    committed = await store.saveGraph(next, base);
  } catch (error) {
    return { status: 'error', message: `saveGraph failed: ${messageOf(error)}` };
  }
  if (!committed) {
    return {
      status: 'refused',
      errors: ['concurrent modification: the graph advanced since this patch was proposed — reload and retry'],
    };
  }
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
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patch } satisfies GraphMutationRequest),
    });
  } catch (error) {
    // Transport failure (network down, CORS abort, DNS) — the one-shape contract holds:
    // the caller gets a GraphMutationResponse, never a rejected promise to unwrap.
    return { status: 'error', message: `request failed: ${messageOf(error)}` };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    // Infrastructure failure (proxy 502/504, an HTML error page) — keep the one-shape
    // contract: the caller always gets a GraphMutationResponse, never a raw parse throw.
    return { status: 'error', message: `server did not return JSON (HTTP ${response.status}): ${messageOf(error)}` };
  }
  // Don't trust a JSON payload that isn't actually a channel reply (a misconfigured
  // route, a different endpoint) — surface it as an error rather than a bad cast.
  if (!isGraphMutationResponse(body)) {
    return { status: 'error', message: `server returned an unexpected response shape (HTTP ${response.status})` };
  }
  if (body.status === 'applied') {
    // The shape guard only proved `graph` is SOME object. The client is about to ADOPT this graph as
    // its new truth and stamp future proposals against its id, so decode it through the fail-closed
    // reader AND re-derive its identity locally: re-seal every node + re-address the graph, then require
    // the wire's claimed id to match. A miswired/forged endpoint returning shape-valid nodes under a
    // FORGED id would otherwise be adopted as a base the real server then refuses as stale on every
    // proposal. On success the caller gets the re-sealed canonical graph; any id/content mismatch is
    // an `error`, not a poisoned base. Re-sealing is idempotent (addressNode hashes the payload), so a
    // legitimate server graph passes unchanged.
    try {
      const decoded = decodeDocumentGraph(body.graph);
      const resealed = sealGraph({ ...decoded, nodes: decoded.nodes.map((node) => sealNode(node)) });
      if (resealed.id !== decoded.id) {
        return { status: 'error', message: 'server returned an applied graph whose id does not address its content' };
      }
      // Topology: a graph a correct server would have produced has no dangling edge and no cycle.
      // decode + reseal cover shape + identity but NOT structure, so a miswired endpoint could still
      // hand back a graph the mutation seam itself would have refused. This completes the adopt trio
      // (shape → identity → topology) — the full "is this a graph the server would produce?" contract.
      if (!validateGraph(resealed).ok) {
        return {
          status: 'error',
          message: 'server returned an applied graph with invalid topology (dangling edge or cycle)',
        };
      }
      return { status: 'applied', graph: resealed };
    } catch (error) {
      return { status: 'error', message: `server returned a malformed applied graph: ${messageOf(error)}` };
    }
  }
  return body;
}
