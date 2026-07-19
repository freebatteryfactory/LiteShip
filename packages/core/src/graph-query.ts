/**
 * HTTP QUERY read-leg — the mutation channel's read side (#119).
 *
 * Transport-agnostic graph read: the host's {@link GraphStore.loadGraph} is the
 * authority; LiteShip validates the wire graph and exposes conditional reads via
 * the sha256 `integrity_digest` (never fnv1a — silent-stale / cache-poisoning).
 *
 *   client: sendGraphQuery(url, \{ ifNoneMatch \})
 *   server: handleGraphQuery(request, store)
 *
 * `@liteship/astro` wraps `handleGraphQuery` into `graphQueryRoute`; the host mounts
 * it on `export const QUERY` (POST + `X-Liteship-Query` fallback when QUERY is absent).
 *
 * @module
 */

import { ValidationError } from '@liteship/error';
import type { DocumentGraph } from './document-graph.js';
import type { GraphStore } from './graph-mutation.js';
import { verifyAppliedGraph } from './graph-mutation.js';

/** Optional conditional-read validator carried on the wire or from `If-None-Match`. */
export interface GraphQueryRequest {
  /** Client's cached etag — MUST be the sha256 `integrity_digest`, never fnv1a. */
  readonly ifNoneMatch?: string;
}

/**
 * Read-leg response — one shape for callers:
 *   - `ok` — the verified server graph + its etag;
 *   - `not_modified` — conditional hit (digest unchanged);
 *   - `refused` — malformed validator or store graph failed verification;
 *   - `error` — server-side load failure (retryable).
 */
export type GraphQueryResponse =
  | { readonly status: 'ok'; readonly graph: DocumentGraph; readonly etag: string }
  | { readonly status: 'not_modified'; readonly etag: string }
  | { readonly status: 'refused'; readonly errors: readonly string[] }
  | { readonly status: 'error'; readonly message: string };

/** HTTP fallback header when the host cannot dispatch `QUERY` (loud ladder, not silent). */
export const GRAPH_QUERY_FALLBACK_HEADER = 'X-Liteship-Query';

const SHA256_ETAG_RE = /^sha256:[0-9a-f]{64}$/;
const FNV_ETAG_RE = /^fnv1a:[0-9a-f]{8}$/;

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * The cache validator for conditional reads — sha256 `integrity_digest`, NOT the
 * fnv1a display `id`. The digest excludes mutable `meta` by construction, so a
 * meta-only advance (display/version bookkeeping) intentionally does NOT
 * invalidate a cached graph: CAS correctness keys on `base.id`, and `meta` is
 * display-layer data that never participates in patch application. Documented
 * contract, not an oversight.
 */
export function graphQueryEtag(graph: DocumentGraph): string {
  return graph.digest.integrity_digest;
}

/** Parsed multi-member `If-None-Match`: sha256 candidates plus the `*` wildcard. */
export interface GraphQueryEtagCandidates {
  readonly candidates: readonly string[];
  /** RFC 9110: `If-None-Match: *` matches any current representation. */
  readonly matchAny: boolean;
}

const stripEtagMember = (member: string): string => member.replace(/^W\//, '').replace(/^"|"$/g, '');

/**
 * Parse a full `If-None-Match` header into ALL comma-separated members
 * (RFC 9110 §13.1.2 — a compliant cache may list several stored validators;
 * evaluating only the first would 422 or full-200 requests that should 304).
 * Any fnv1a member refuses the whole request — a client that cached the
 * display id is the silent-stale bug this channel exists to prevent.
 */
export function parseGraphQueryEtagList(
  value: string | undefined,
): GraphQueryEtagCandidates | { readonly errors: readonly string[] } {
  if (value === undefined || value === '') {
    return { candidates: [], matchAny: false };
  }

  const members = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const candidates: string[] = [];
  let matchAny = false;

  for (const member of members) {
    if (member === '*') {
      matchAny = true;
      continue;
    }
    const bare = stripEtagMember(member);
    if (bare === '') {
      continue;
    }
    if (FNV_ETAG_RE.test(bare)) {
      return {
        errors: [
          'If-None-Match must be the sha256 integrity_digest, not the fnv1a display id — silent-stale 304 vector',
        ],
      };
    }
    if (!SHA256_ETAG_RE.test(bare)) {
      return { errors: [`If-None-Match is not a sha256 integrity_digest: ${JSON.stringify(bare)}`] };
    }
    candidates.push(bare);
  }

  return { candidates, matchAny };
}

/** Normalize a SINGLE HTTP etag value (e.g. a response `ETag` header) to bare sha256, or refuse fnv1a. */
export function normalizeGraphQueryEtag(value: string | undefined): string | { readonly errors: readonly string[] } {
  if (value === undefined || value === '') {
    return value ?? '';
  }

  const parsed = parseGraphQueryEtagList(value);
  if ('errors' in parsed) {
    return parsed;
  }
  return parsed.candidates[0] ?? '';
}

function isGraphQueryResponse(value: unknown): value is GraphQueryResponse {
  if (typeof value !== 'object' || value === null || !('status' in value)) return false;
  const record = value as Record<string, unknown>;
  switch (record.status) {
    case 'ok':
      return (
        typeof record.graph === 'object' &&
        record.graph !== null &&
        typeof record.etag === 'string' &&
        SHA256_ETAG_RE.test(record.etag)
      );
    case 'not_modified':
      return typeof record.etag === 'string' && SHA256_ETAG_RE.test(record.etag);
    case 'refused':
      return Array.isArray(record.errors) && record.errors.every((entry) => typeof entry === 'string');
    case 'error':
      return typeof record.message === 'string';
    default:
      return false;
  }
}

/**
 * Process one graph read against the host store. Pure of transport: load → verify →
 * conditional etag compare. NEVER throws — failures map to the response shape.
 */
export async function handleGraphQuery(
  request: GraphQueryRequest,
  store: Pick<GraphStore, 'loadGraph'>,
): Promise<GraphQueryResponse> {
  const parsed = request.ifNoneMatch !== undefined ? parseGraphQueryEtagList(request.ifNoneMatch) : undefined;
  if (parsed !== undefined && 'errors' in parsed) {
    return { status: 'refused', errors: parsed.errors };
  }

  let loaded: DocumentGraph;
  try {
    loaded = await store.loadGraph();
  } catch (error) {
    return { status: 'error', message: `loadGraph failed: ${messageOf(error)}` };
  }

  const verified = verifyAppliedGraph(loaded);
  if (!verified.ok) {
    return { status: 'refused', errors: [verified.message] };
  }

  const graph = verified.graph;
  const etag = graphQueryEtag(graph);

  // RFC 9110 §13.1.2: 304 when ANY listed validator matches, or on `*`
  // (the graph read always has a current representation).
  if (parsed !== undefined && (parsed.matchAny || parsed.candidates.includes(etag))) {
    return { status: 'not_modified', etag };
  }

  return { status: 'ok', graph, etag };
}

/** Options for the retrying QUERY read sender. */
export interface SendGraphQueryOptions {
  /** Injectable fetch for tests / non-browser hosts. Defaults to global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Conditional validator — sha256 integrity_digest only. */
  readonly ifNoneMatch?: string;
  /** Bounded retries on transport / server `error` outcomes (reads are idempotent). Default: 2. */
  readonly maxRetries?: number;
  /**
   * Base delay between retry attempts in ms (doubles each attempt — 150, 300,
   * 600, …). Default: 150. Pass 0 for immediate retries (tests).
   */
  readonly retryDelayMs?: number;
}

const queryHeaders = (ifNoneMatch: string | undefined): Record<string, string> => {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  };
  if (ifNoneMatch !== undefined) {
    headers['if-none-match'] = `"${ifNoneMatch}"`;
  }
  return headers;
};

async function fetchGraphQueryOnce(
  url: string,
  options: SendGraphQueryOptions,
  skipQueryMethod = false,
): Promise<{ readonly response: Response; readonly usedFallback: boolean }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const init = {
    headers: queryHeaders(options.ifNoneMatch),
    body: JSON.stringify({} satisfies Record<string, never>),
  };

  if (!skipQueryMethod) {
    const response = await fetchImpl(url, { ...init, method: 'QUERY' });
    if (response.status !== 405 && response.status !== 501 && response.status !== 404) {
      return { response, usedFallback: false };
    }
  }

  const response = await fetchImpl(url, {
    ...init,
    method: 'POST',
    headers: { ...init.headers, [GRAPH_QUERY_FALLBACK_HEADER]: '1' },
  });
  return { response, usedFallback: true };
}

function parseGraphQueryHttpResponse(response: Response, body: unknown, ifNoneMatch?: string): GraphQueryResponse {
  if (response.status === 304) {
    const headerEtag = response.headers.get('etag');
    const normalized = headerEtag !== null ? normalizeGraphQueryEtag(headerEtag) : undefined;
    if (normalized !== undefined && typeof normalized === 'object') {
      return { status: 'refused', errors: normalized.errors };
    }
    const etag = typeof normalized === 'string' && normalized !== '' ? normalized : (ifNoneMatch ?? '');
    if (!SHA256_ETAG_RE.test(etag)) {
      return { status: 'error', message: `server returned 304 without a sha256 etag (HTTP ${response.status})` };
    }
    return { status: 'not_modified', etag };
  }

  if (!isGraphQueryResponse(body)) {
    return { status: 'error', message: `server returned an unexpected response shape (HTTP ${response.status})` };
  }

  if (body.status === 'ok') {
    const verified = verifyAppliedGraph(body.graph);
    if (!verified.ok) {
      return { status: 'error', message: verified.message };
    }
    const etag = body.etag;
    if (etag !== graphQueryEtag(verified.graph)) {
      return {
        status: 'error',
        message: 'server returned a graph whose etag does not match its sha256 integrity_digest',
      };
    }
    return { status: 'ok', graph: verified.graph, etag };
  }

  return body;
}

/**
 * Client-side sender: QUERY the host's graph read endpoint with optional conditional
 * etag and bounded retries. Tries `QUERY` first; on 405/501/404 falls back to POST with
 * {@link GRAPH_QUERY_FALLBACK_HEADER} (loud — not a silent downgrade). NEVER rejects.
 */
export async function sendGraphQuery(url: string, options: SendGraphQueryOptions = {}): Promise<GraphQueryResponse> {
  const maxRetries = options.maxRetries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 150;
  let lastError: GraphQueryResponse = { status: 'error', message: 'request failed after retries' };
  // Once one attempt learned the host rejects QUERY (405/501/404 → POST
  // fallback), later attempts go straight to POST — re-probing QUERY on every
  // retry would double round trips against a host whose answer cannot change
  // mid-recovery.
  let knownFallback = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0 && retryDelayMs > 0) {
      // Exponential backoff — back-to-back retries hammer a struggling server.
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * 2 ** (attempt - 1)));
    }

    let response: Response;
    try {
      const once = await fetchGraphQueryOnce(url, options, knownFallback);
      response = once.response;
      knownFallback ||= once.usedFallback;
    } catch (error) {
      lastError = { status: 'error', message: `request failed: ${messageOf(error)}` };
      continue;
    }

    let body: unknown = null;
    if (response.status !== 304) {
      try {
        body = await response.json();
      } catch (error) {
        lastError = {
          status: 'error',
          message: `server did not return JSON (HTTP ${response.status}): ${messageOf(error)}`,
        };
        continue;
      }
    }

    const parsed = parseGraphQueryHttpResponse(response, body, options.ifNoneMatch);
    if (parsed.status === 'error' && attempt < maxRetries) {
      lastError = parsed;
      continue;
    }
    return parsed;
  }

  return lastError;
}

/** Build a host-owned `refreshBase` for {@link createGraphMutationClient} over the read leg. */
export function createGraphQueryRefreshBase(
  url: string,
  options?: Pick<SendGraphQueryOptions, 'fetchImpl' | 'maxRetries'> & {
    readonly currentEtag?: () => string | undefined;
    /**
     * The caller's CURRENT base graph. A conditional read that returns
     * `not_modified` (F-REC-4) is a NORMAL outcome, not an error — the caller
     * already holds the current graph (it computed the `If-None-Match` etag from
     * it). Supplying it lets `refreshBase` resolve to that graph instead of
     * throwing, so a `not_modified` no longer aborts recovery.
     */
    readonly currentBase?: () => DocumentGraph | undefined;
  },
): () => Promise<DocumentGraph> {
  return async () => {
    const result = await sendGraphQuery(url, {
      fetchImpl: options?.fetchImpl,
      maxRetries: options?.maxRetries,
      ifNoneMatch: options?.currentEtag?.(),
    });
    if (result.status === 'ok') {
      return result.graph;
    }
    if (result.status === 'not_modified') {
      // A conditional hit is not a failure: the caller's cached base IS current.
      const current = options?.currentBase?.();
      if (current !== undefined) {
        return current;
      }
      throw ValidationError(
        'createGraphQueryRefreshBase',
        'graph query returned not_modified but no currentBase was supplied to resolve it — ' +
          'pass options.currentBase so a conditional hit resolves to the cached graph',
      );
    }
    if (result.status === 'refused') {
      throw ValidationError('createGraphQueryRefreshBase', `graph query refused: ${result.errors.join(' · ')}`);
    }
    throw ValidationError('createGraphQueryRefreshBase', result.message);
  };
}
