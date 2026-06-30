/**
 * Pure SSE utilities -- Effect-free.
 *
 * Extracted from sse.ts for use by client directives.
 *
 * @module
 */

import { Millis, SSE_BUFFER_SIZE, systemRng, type Rng } from '@czap/core';
import { ValidationError } from '@czap/error';
import { ATTR as SEMANTIC_ID_ATTR } from '../morph/semantic-id.js';
import type { SSEMessage, ReconnectConfig, OverflowPolicy } from '../types.js';

const ARTIFACT_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;

/**
 * Engine default overflow policy. `coalesce-by-id` is the safe default: it
 * collapses redundant same-id patches first and only ever drops the oldest
 * keyed (idempotent) patch under saturation, so ordered/keyless streams
 * (LLM tokens) ride through untouched.
 */
export const defaultOverflowPolicy: OverflowPolicy = 'coalesce-by-id';

/**
 * Sniff the first `data-czap-id="..."` attribute out of a serialized HTML
 * patch. Built from the canonical {@link SEMANTIC_ID_ATTR} constant so the
 * coalesce key tracks the same attribute Morph uses for node identity.
 */
const COALESCE_ID_ATTR_PATTERN = new RegExp(`${SEMANTIC_ID_ATTR}="([^"]+)"`);

/**
 * Coalesce key for an SSE message, or `null` when the message is
 * order-significant and must never be merged.
 *
 * ONLY `type === 'patch'` is eligible: a patch addressed by a stable id is
 * idempotent (a newer patch for the same id fully supersedes the older).
 * Every other message — LLM text tokens (`patch`-free bare strings never
 * reach here), `batch`, `snapshot`, `signal`, `receipt`, `heartbeat` —
 * returns `null` so it keeps strict FIFO order.
 *
 * Ambiguity ALWAYS yields `null` (fail-safe: a message we cannot positively
 * key is treated as order-significant and never coalesced). An object
 * payload is keyed by a non-empty string `id`/`czapId`; a string payload is
 * keyed by its first `data-czap-id` attribute.
 */
export const extractCoalesceKey = (message: SSEMessage): string | null => {
  if (message.type !== 'patch') {
    return null;
  }

  const data = message.data;

  if (data !== null && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const id = record['id'] ?? record['czapId'];
    return typeof id === 'string' && id.length > 0 ? `patch:${id}` : null;
  }

  if (typeof data === 'string') {
    const match = COALESCE_ID_ATTR_PATTERN.exec(data);
    return match ? `patch:${match[1]}` : null;
  }

  return null;
};

/** Outcome of a single {@link applyOverflow} step. */
export interface OverflowResult {
  /** The buffer after the step (mutated in place and returned for chaining). */
  readonly buffer: SSEMessage[];
  /** `1` when a message was evicted/rejected this step, else `0`. */
  readonly dropped: number;
  /** `1` when an existing same-id patch was superseded in place, else `0`. */
  readonly coalesced: number;
  /** `true` when the buffer was at capacity and the step evicted/rejected. */
  readonly saturated: boolean;
}

/**
 * Pure overflow step: fold `message` into `buffer` under `policy`, returning
 * the new buffer plus per-step counters. The FIFO backbone (index 0 =
 * oldest) is preserved; this is the testable target behind the bounded
 * `Queue` in `sse.ts` (drain → applyOverflow → rebuild).
 *
 * The safety invariant lives here: under `coalesce-by-id`, an LLM token
 * (keyless) is never dropped, reordered, or merged while a keyed patch
 * remains evictable. Same-id patches collapse to the newest in place;
 * saturation evicts the oldest keyed patch first, falling back to
 * drop-oldest only when the buffer holds no keyed entry at all.
 *
 * @param maxBufferSize - capacity (defaults to {@link SSE_BUFFER_SIZE});
 *   assumed `>= 1`.
 */
export const applyOverflow = (
  buffer: SSEMessage[],
  message: SSEMessage,
  policy: OverflowPolicy,
  maxBufferSize: number = SSE_BUFFER_SIZE,
): OverflowResult => {
  // coalesce-by-id: an in-place supersede neither grows the buffer nor
  // saturates it — try it before any capacity check.
  if (policy === 'coalesce-by-id') {
    const key = extractCoalesceKey(message);
    if (key !== null) {
      for (let i = 0; i < buffer.length; i++) {
        if (extractCoalesceKey(buffer[i]!) === key) {
          // Supersede: drop the stale patch and re-append the replacement at the
          // TAIL, its true arrival position. Overwriting in place would move the
          // newer patch AHEAD of any keyless/ordered message (a `signal`, an LLM
          // token) that arrived between the two patches, so a downstream consumer
          // would observe a future patch before an earlier ordered message. Size
          // is unchanged (remove one, add one), so this still never saturates.
          buffer.splice(i, 1);
          buffer.push(message);
          return { buffer, dropped: 0, coalesced: 1, saturated: false };
        }
      }
    }
  }

  // Room available — plain FIFO append.
  if (buffer.length < maxBufferSize) {
    buffer.push(message);
    return { buffer, dropped: 0, coalesced: 0, saturated: false };
  }

  // Saturated. Choose the eviction victim by policy.
  if (policy === 'drop-newest') {
    // Reject the incoming message; the buffer is unchanged.
    return { buffer, dropped: 1, coalesced: 0, saturated: true };
  }

  if (policy === 'coalesce-by-id') {
    // Evict the oldest KEYED (idempotent) patch before any ordered/keyless
    // entry, so a token is never dropped while a patch is still evictable.
    const keyedIndex = buffer.findIndex((m) => extractCoalesceKey(m) !== null);
    if (keyedIndex !== -1) {
      buffer.splice(keyedIndex, 1);
      buffer.push(message);
      return { buffer, dropped: 1, coalesced: 0, saturated: true };
    }
    // Buffer is all keyless/ordered messages -> fall through to drop-oldest.
  }

  // drop-oldest (also the coalesce fallback when no keyed entry exists).
  buffer.shift();
  buffer.push(message);
  return { buffer, dropped: 1, coalesced: 0, saturated: true };
};

/**
 * Default reconnection configuration.
 */
export const defaultReconnectConfig: ReconnectConfig = {
  maxAttempts: 10,
  initialDelay: Millis(1000),
  maxDelay: Millis(30000),
  factor: 2,
};

/**
 * Return the char code of the first non-whitespace character, or -1.
 * Used as a pre-flight check to skip JSON.parse on obviously non-JSON input.
 */
const firstMeaningfulCharCode = (raw: string): number => {
  for (let index = 0; index < raw.length; index++) {
    const code = raw.charCodeAt(index);
    if (code !== 32 && code !== 9 && code !== 10 && code !== 13) {
      return code;
    }
  }

  return -1;
};

/**
 * Parse an SSE MessageEvent into a typed SSEMessage.
 * Returns null if the event data is not valid JSON or lacks a type field.
 *
 * Preflight is mandatory and unconditional: a fast first-character scan
 * runs before `JSON.parse` on every string payload. Only strings that start
 * with `{` or `[` (after leading whitespace) proceed to parse; all other
 * inputs are rejected immediately. This avoids the ~15us try/catch cost on
 * obviously non-JSON strings and closes the injection vector where a server
 * sends plain-text or numeric data that could trigger unexpected parse paths.
 * There is intentionally no opt-out — see red-team regression suite.
 */
export const parseMessage = (event: MessageEvent): SSEMessage | null => {
  let data: unknown;

  if (typeof event.data === 'string') {
    const firstChar = firstMeaningfulCharCode(event.data);
    // Only `{` (123) and `[` (91) can start valid JSON objects/arrays.
    // Anything else (plain text, numbers, empty strings) is not a structured message.
    if (firstChar !== 123 && firstChar !== 91) {
      return null;
    }

    try {
      data = JSON.parse(event.data);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      return null;
    }
  } else {
    // event.data is already a parsed object (e.g. from structured clone)
    data = event.data;
  }

  if (data === null || typeof data !== 'object') {
    return null;
  }
  if (!('type' in data) || typeof data.type !== 'string') {
    return null;
  }

  return data as SSEMessage;
};

/**
 * Calculate reconnection delay using exponential backoff with jitter.
 *
 * The jitter source is injectable: pass a seeded {@link Rng} to make
 * reconnection-backoff deterministic in tests; it defaults to `systemRng`
 * (live `Math.random`) in production.
 */
export const calculateDelay = (attempt: number, config: ReconnectConfig, rng: Rng = systemRng): number => {
  const delay = config.initialDelay * Math.pow(config.factor, attempt);
  const jitter = delay * 0.25 * (rng.next() * 2 - 1);
  return Math.min(delay + jitter, config.maxDelay);
};

/**
 * Validate that an artifact ID is safe to use as a single URL path segment.
 */
export const validateArtifactId = (artifactId: string): string => {
  if (!ARTIFACT_ID_PATTERN.test(artifactId)) {
    throw ValidationError(
      'sse.artifactId',
      `Invalid artifactId "${artifactId}". Allowed characters: letters, digits, ':', '_', '-' (it becomes a URL path segment), e.g. 'doc-123' or 'page:home'.`,
    );
  }

  return artifactId;
};

/**
 * Append an artifact ID to the end of a URL pathname exactly once.
 */
export const appendArtifactIdToUrl = (url: URL, artifactId: string): URL => {
  const safeArtifactId = validateArtifactId(artifactId);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments.at(-1);

  if (lastSegment === safeArtifactId) {
    return url;
  }

  const trimmedPath = url.pathname.replace(/\/+$/, '');
  url.pathname = `${trimmedPath}/${encodeURIComponent(safeArtifactId)}`;
  return url;
};

/**
 * Build an SSE endpoint URL with optional artifact ID and lastEventId.
 */
export const buildUrl = (baseUrl: string, artifactId?: string, lastEventId?: string): string => {
  const url = baseUrl.startsWith('http')
    ? new URL(baseUrl)
    : new URL(baseUrl, globalThis.location?.origin ?? 'http://localhost');

  if (artifactId) {
    appendArtifactIdToUrl(url, artifactId);
  }

  if (lastEventId) {
    url.searchParams.set('lastEventId', lastEventId);
  }

  return url.toString();
};
