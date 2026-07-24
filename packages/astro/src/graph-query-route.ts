/**
 * Host route adapter for the HTTP QUERY graph read-leg (#119).
 *
 * Wraps `@liteship/core`'s transport-agnostic `handleGraphQuery` into a plain
 * `(request: Request) => Promise<Response>` — the same shape as
 * {@link liteshipFetchLayer}'s `FetchLayerNext` and {@link graphMutationRoute}.
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
} from '@liteship/core';
import type { GraphStore } from '@liteship/core';

/** Methods this route serves — advertised on 405 (`Allow`) and OPTIONS. */
const GRAPH_QUERY_ALLOW = 'QUERY, POST, OPTIONS';

/**
 * The request body is semantically EMPTY on this read leg (only the etag header
 * matters), so the route never buffers more than this. `sendGraphQuery` sends
 * `{}` (2 bytes); anything approaching the cap is hostile or misrouted.
 */
const GRAPH_QUERY_MAX_BODY_BYTES = 4096;

/**
 * Weak validator: the digest excludes mutable `meta` by design, so two responses
 * with the SAME etag can differ byte-for-byte (meta drift). A strong etag would
 * falsely claim byte-equality to spec-compliant caches (RFC 9110 §8.8.1).
 */
const weakEtag = (etag: string): string => `W/"${etag}"`;

/** Read a body stream up to `maxBytes`; `null` means the cap was exceeded (stream cancelled). */
async function readBodyCapped(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<string | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/** JSON `Response` with the channel's content type; status maps the outcome. */
function jsonResponse(body: GraphQueryResponse, status: number, etag?: string): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (etag !== undefined) {
    headers.etag = weakEtag(etag);
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
 * Build a QUERY (or POST+`X-Liteship-Query` fallback) handler that returns the host's
 * current sealed graph:
 *   - **200** on hit — body is `{ status: 'ok', graph, etag }` (sha256 digest);
 *   - **304** on conditional match (any `If-None-Match` member, or `*`);
 *   - **422** on refusal (bad etag validator, store graph failed verification);
 *   - **415** on a non-`application/json` body when a body is present;
 *   - **400** on an unparseable JSON body;
 *   - **413** when the body exceeds the read-leg cap (the body is semantically empty);
 *   - **204 + Allow** on OPTIONS (CORS preflight must not see 405);
 *   - **405 + Allow** on unsupported methods.
 */
export function graphQueryRoute(store: Pick<GraphStore, 'loadGraph'>): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { allow: GRAPH_QUERY_ALLOW } });
    }

    if (!isGraphQueryMethod(request)) {
      return new Response(
        JSON.stringify({ status: 'refused', errors: [`unsupported method ${request.method} for graph query`] }),
        { status: 405, headers: { 'content-type': 'application/json', allow: GRAPH_QUERY_ALLOW } },
      );
    }

    const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
    if (contentType !== '' && !contentType.startsWith('application/json')) {
      return jsonResponse(
        { status: 'refused', errors: ['unsupported content-type: this endpoint requires application/json'] },
        415,
      );
    }

    // The body carries no semantics on this read leg; never buffer more than the
    // cap — a hostile multi-megabyte body is cancelled mid-stream, not read into
    // memory just to be discarded.
    if (contentType.startsWith('application/json') && request.body !== null) {
      const declaredLength = Number(request.headers.get('content-length') ?? Number.NaN);
      if (Number.isFinite(declaredLength) && declaredLength > GRAPH_QUERY_MAX_BODY_BYTES) {
        return jsonResponse(
          {
            status: 'refused',
            errors: [`request body exceeds ${GRAPH_QUERY_MAX_BODY_BYTES} bytes (body is unused on this read leg)`],
          },
          413,
        );
      }

      const bodyText = await readBodyCapped(request.body, GRAPH_QUERY_MAX_BODY_BYTES);
      if (bodyText === null) {
        return jsonResponse(
          {
            status: 'refused',
            errors: [`request body exceeds ${GRAPH_QUERY_MAX_BODY_BYTES} bytes (body is unused on this read leg)`],
          },
          413,
        );
      }
      if (bodyText.length > 0) {
        try {
          JSON.parse(bodyText);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          return jsonResponse({ status: 'refused', errors: [`request body is not valid JSON: ${reason}`] }, 400);
        }
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
        return new Response(null, { status: 304, headers: { etag: weakEtag(result.etag) } });
      case 'refused':
        return jsonResponse(result, 422);
      case 'error':
        return jsonResponse(result, 500);
    }
  };
}

/** Parse `If-None-Match` for tests / host adapters — re-exported for route parity. */
export const parseGraphQueryIfNoneMatch = normalizeGraphQueryEtag;
