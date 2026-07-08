/**
 * Host route adapter for the HTTP QUERY graph read-leg (#119).
 *
 * Wraps `@czap/core`'s transport-agnostic `handleGraphQuery` into a plain
 * `(request: Request) => Promise<Response>` — the same shape as
 * {@link czapFetchLayer}'s `FetchLayerNext` and {@link graphMutationRoute}.
 *
 * The factory injects only `Pick<GraphStore, 'loadGraph'>` — write-freedom is
 * proven at the type level (the read leg cannot persist).
 *
 * @module
 */

import {
  GRAPH_QUERY_FALLBACK_HEADER,
  handleGraphQuery,
  normalizeGraphQueryEtag,
  type GraphQueryRequest,
  type GraphQueryResponse,
} from '@czap/core';
import type { GraphStore } from '@czap/core';

/** JSON `Response` with the channel's content type; status maps the outcome. */
function jsonResponse(body: GraphQueryResponse, status: number, etag?: string): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (etag !== undefined) {
    headers.etag = `"${etag}"`;
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function isGraphQueryMethod(request: Request): boolean {
  if (request.method === 'QUERY') {
    return true;
  }
  return request.method === 'POST' && request.headers.get(GRAPH_QUERY_FALLBACK_HEADER) === '1';
}

/**
 * Build a QUERY (or POST+`X-Czap-Query` fallback) handler that returns the host's
 * current sealed graph:
 *   - **200** on hit — body is `{ status: 'ok', graph, etag }` (sha256 digest);
 *   - **304** on conditional match (`If-None-Match` === integrity digest);
 *   - **422** on refusal (bad etag validator, store graph failed verification);
 *   - **415** on a non-`application/json` body when a body is present;
 *   - **400** on an unparseable JSON body;
 *   - **405** on unsupported methods.
 */
export function graphQueryRoute(store: Pick<GraphStore, 'loadGraph'>): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (!isGraphQueryMethod(request)) {
      return jsonResponse({ status: 'refused', errors: [`unsupported method ${request.method} for graph query`] }, 405);
    }

    const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
    if (contentType !== '' && !contentType.startsWith('application/json')) {
      return jsonResponse(
        { status: 'refused', errors: ['unsupported content-type: this endpoint requires application/json'] },
        415,
      );
    }

    if (contentType.startsWith('application/json')) {
      try {
        await request.json();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return jsonResponse({ status: 'refused', errors: [`request body is not valid JSON: ${reason}`] }, 400);
      }
    }

    const headerEtag = request.headers.get('if-none-match') ?? undefined;
    const queryRequest: GraphQueryRequest = {
      ifNoneMatch: headerEtag,
    };

    let result: GraphQueryResponse;
    try {
      result = await handleGraphQuery(queryRequest, store);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result = { status: 'error', message: `graph query failed: ${reason}` };
    }

    switch (result.status) {
      case 'ok':
        return jsonResponse(result, 200, result.etag);
      case 'not_modified':
        return new Response(null, { status: 304, headers: { etag: `"${result.etag}"` } });
      case 'refused':
        return jsonResponse(result, 422);
      case 'error':
        return jsonResponse(result, 500);
    }
  };
}

/** Parse `If-None-Match` for tests / host adapters — re-exported for route parity. */
export const parseGraphQueryIfNoneMatch = normalizeGraphQueryEtag;
