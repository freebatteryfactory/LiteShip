/**
 * Host route adapter for the client→server graph-mutation channel.
 *
 * Wraps `@czap/core`'s transport-agnostic `handleGraphMutation` into a plain
 * `(request: Request) => Promise<Response>` — the same shape as
 * {@link czapFetchLayer}'s `FetchLayerNext`, so it drops into EITHER an Astro API
 * route:
 *
 * ```ts
 * // src/pages/api/graph.ts
 * import type { APIRoute } from 'astro';
 * import { graphMutationRoute } from '@czap/astro';
 * import { store } from '../../server/graph-store';   // host-owned authority
 * export const prerender = false;
 * export const POST: APIRoute = ({ request }) => graphMutationRoute(store)(request);
 * ```
 *
 * ...OR a `czapFetchLayer` branch. `@czap/astro` injects NO routes on purpose
 * (ADR-0022): the host owns the endpoint, the graph store, and thus the authority.
 * This adapter is pure transport glue over the already-validated AI-cast seam — no
 * new validation, no persistence, no model or network code (fullsend-in-scope).
 *
 * @module
 */

import { handleGraphMutation } from '@czap/core';
import type { GraphMutationRequest, GraphMutationResponse, GraphStore } from '@czap/core';

/** JSON `Response` with the channel's content type; status maps the outcome. */
function jsonResponse(body: GraphMutationResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * Build a POST handler that validates + applies a client-proposed `GraphPatch`
 * against the host's current graph:
 *   - **200** on apply — body is `{ status: 'applied', graph }` (the new sealed graph);
 *   - **422** on refusal — body is `{ status: 'refused', errors }` (validation reasons);
 *   - **400** on an unparseable request body.
 *
 * The host supplies the `GraphStore` (its authority boundary); everything the
 * seam guarantees — a stale-base / dangling-edge / malformed patch never mutates the
 * graph — holds unchanged over HTTP.
 */
export function graphMutationRoute(store: GraphStore): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    let body: GraphMutationRequest;
    try {
      body = (await request.json()) as GraphMutationRequest;
    } catch (error) {
      // A body that isn't JSON is a client error, surfaced (not swallowed) as a refusal.
      const reason = error instanceof Error ? error.message : String(error);
      return jsonResponse({ status: 'refused', errors: [`request body is not valid JSON: ${reason}`] }, 400);
    }
    let result: GraphMutationResponse;
    try {
      result = await handleGraphMutation(body, store);
    } catch (error) {
      // handleGraphMutation maps store failures to `error` itself; this is belt-and-
      // suspenders so any future unexpected throw still yields the structured shape.
      const reason = error instanceof Error ? error.message : String(error);
      result = { status: 'error', message: `mutation failed: ${reason}` };
    }
    const status = result.status === 'applied' ? 200 : result.status === 'refused' ? 422 : 500;
    return jsonResponse(result, status);
  };
}
