/**
 * SSE Resumption Protocol
 *
 * Handles connection resumption using lastEventId.
 * Implements replay/snapshot fallback when events are missed.
 */

import { Millis, decode, wallClock, type Clock, schema } from '@liteship/core';
import { IoError, ParseError, ValidationError } from '@liteship/error';
import type { ResumptionConfig, ResumptionState, ResumptionStateInput, ResumeResponse } from '../types.js';
import { appendArtifactIdToUrl, validateArtifactId } from './sse-pure.js';
import { resolveRuntimeUrl } from '../security/runtime-url.js';
import type { RuntimeUrlResolution } from '../security/runtime-url.js';

// Import pure functions and re-export (Effect-free)
import { parseEventId as _parseEventId, canResume as _canResume } from './resumption-pure.js';
/** Re-export of the Effect-free event-id parser from `./resumption-pure.js`. */
export const parseEventId = _parseEventId;
/** Re-export of the Effect-free gap-size check from `./resumption-pure.js`. */
export const canResume = _canResume;

// Kernel schemas backing the runtime shape guards below. Sync strict `decode`
// fails closed on any missing or mistyped field, so `.ok` is a boolean type
// guard with no external dependency — the reconnect hot path stays effect-free
// and dependency-light.

/** The persisted sessionStorage shape — all four fields required and typed. */
const ResumptionStateSchema = schema.struct({
  lastEventId: schema.string,
  lastSequence: schema.number,
  artifactId: schema.string,
  timestamp: schema.number,
});

/** Snapshot response: `html`/`lastEventId` strings plus an opaque `signals` payload. */
const SnapshotPayloadSchema = schema.struct({
  html: schema.string,
  signals: schema.unknown,
  lastEventId: schema.string,
});

/** Replay response: a `patches` array of opaque JSON-patch entries. */
const ReplayPayloadSchema = schema.struct({
  patches: schema.array(schema.unknown),
});

/**
 * Runtime shape check for data loaded from sessionStorage.
 * Returns true only if `v` has the exact shape of {@link ResumptionState}.
 */
const isResumptionState = (v: unknown): v is ResumptionState => decode(ResumptionStateSchema, v).ok;

/**
 * Runtime shape check for snapshot responses.
 */
const isSnapshotPayload = (v: unknown): v is { html: string; signals: unknown; lastEventId: string } =>
  decode(SnapshotPayloadSchema, v).ok;

/**
 * Runtime shape check for replay responses.
 */
const isReplayPayload = (v: unknown): v is { patches: readonly unknown[] } => decode(ReplayPayloadSchema, v).ok;

/**
 * Default resumption configuration.
 */
export const defaultResumptionConfig: ResumptionConfig = {
  maxGapSize: 50,
  snapshotUrl: '/liteship/snapshot',
  replayUrl: '/liteship/replay',
  timeout: Millis(10000),
};

/**
 * Storage key for resumption state.
 */
const storageKey = (artifactId: string): string => `liteship:resumption:${artifactId}`;

/**
 * Save resumption state to sessionStorage.
 *
 * @example
 * ```ts
 * import { Resumption } from '@liteship/web';
 *
 * Resumption.saveState({
 *   artifactId: 'article-123',
 *   lastEventId: 'evt-42',
 *   lastSequence: 42,
 * });
 * ```
 *
 * @param state - The resumption state to persist; `timestamp` defaults to the clock's `now()`
 * @param clock - Time source for the default timestamp; defaults to `wallClock`
 *                (epoch ms — the persisted timestamp is a real point in time, read
 *                back as epoch, not the monotonic systemClock). Pass a
 *                `fixedClock`/`manualClock` to make the persisted artifact deterministic.
 */
export const saveState = (state: ResumptionStateInput, clock: Clock = wallClock): void => {
  const key = storageKey(validateArtifactId(state.artifactId));
  // Stored shape keeps timestamp required; isResumptionState validates it on load.
  const stored: ResumptionState = { ...state, timestamp: state.timestamp ?? clock.now() };
  sessionStorage.setItem(key, JSON.stringify(stored));
};

/**
 * Load resumption state from sessionStorage.
 *
 * @example
 * ```ts
 * import { Resumption } from '@liteship/web';
 *
 * const state = Resumption.loadState('article-123');
 * if (state) {
 *   console.log(state.lastEventId); // 'evt-42'
 * }
 * ```
 *
 * @param artifactId - The artifact ID to load state for
 * @returns The saved state, or null if none exists
 */
export const loadState = (artifactId: string): ResumptionState | null => {
  const key = storageKey(validateArtifactId(artifactId));
  const value = sessionStorage.getItem(key);

  if (!value) {
    return null;
  }

  let parsedState: ResumptionState | null = null;
  let invalidState = false;
  try {
    const raw: unknown = JSON.parse(value);
    if (!isResumptionState(raw)) {
      invalidState = true;
      sessionStorage.removeItem(key);
    } else {
      parsedState = raw;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    invalidState = true;
    sessionStorage.removeItem(key);
  }

  return invalidState ? null : parsedState;
};

/**
 * Clear resumption state from sessionStorage.
 *
 * @example
 * ```ts
 * import { Resumption } from '@liteship/web';
 *
 * Resumption.clearState('article-123');
 * ```
 *
 * @param artifactId - The artifact ID whose state should be cleared
 */
export const clearState = (artifactId: string): void => {
  const key = storageKey(validateArtifactId(artifactId));
  sessionStorage.removeItem(key);
};

// canResume is re-exported from resumption-pure.ts above

/**
 * Resume from a disconnection, choosing between event replay (small gap)
 * and full snapshot (large gap or no prior state).
 *
 * @example
 * ```ts
 * import { Resumption } from '@liteship/web';
 *
 * const response = await Resumption.resume('article-123', 'evt-50', { maxGapSize: 100 });
 * // response.type => 'replay' | 'snapshot'
 * ```
 *
 * @param artifactId     - The artifact to resume
 * @param currentEventId - The latest event ID from the reconnected stream
 * @param config         - Optional partial config overriding defaults
 * @returns A promise of a {@link ResumeResponse}; rejects with an
 *          `IoError`/`ParseError`/`ValidationError` on failure
 */
export const resume = async (
  artifactId: string,
  currentEventId: string,
  config?: Partial<ResumptionConfig>,
): Promise<ResumeResponse> => {
  validateArtifactId(artifactId);
  const finalConfig = { ...defaultResumptionConfig, ...config };
  const prevState = loadState(artifactId);

  if (!prevState) {
    return await fetchSnapshot(artifactId, {
      snapshotUrl: finalConfig.snapshotUrl,
      endpointPolicy: finalConfig.endpointPolicy,
      timeout: finalConfig.timeout,
    });
  }

  const expectedSequence = prevState.lastSequence + 1;
  const parsed = parseEventId(currentEventId);
  const gap = parsed.sequence - expectedSequence;

  if (gap <= 0) {
    return {
      type: 'replay' as const,
      patches: [],
    };
  }

  if (gap > finalConfig.maxGapSize) {
    return await fetchSnapshot(artifactId, {
      snapshotUrl: finalConfig.snapshotUrl,
      endpointPolicy: finalConfig.endpointPolicy,
      timeout: finalConfig.timeout,
    });
  }

  const patches = await requestReplay(
    artifactId,
    prevState.lastEventId,
    currentEventId,
    finalConfig.replayUrl!,
    finalConfig.endpointPolicy,
    finalConfig.timeout,
  );

  return {
    type: 'replay' as const,
    patches,
  };
};

/**
 * Format a teaching error for a rejected endpoint URL: which URL, why it
 * was rejected (with the resolved/page origins the resolution carries),
 * and the literal ResumptionConfig change that unblocks it.
 */
const describeEndpointRejection = (
  kind: 'snapshot' | 'replay',
  rawUrl: string,
  resolved: Exclude<RuntimeUrlResolution, { type: 'allowed' }>,
): string => {
  const label = kind === 'snapshot' ? 'Snapshot' : 'Replay';
  const configField = `ResumptionConfig.${kind}Url`;
  const pageOrigin = globalThis.location?.origin ?? '(no page origin)';

  switch (resolved.type) {
    case 'missing':
      return `${label} URL is missing — set ${configField} to your endpoint.`;
    case 'malformed':
      return `${label} URL "${resolved.rawUrl}" could not be parsed against base origin ${resolved.baseOrigin}${
        resolved.detail ? ` (${resolved.detail})` : ''
      } — fix ${configField}.`;
    case 'cross-origin-rejected':
      return `${label} URL "${rawUrl}" was rejected: it resolves to origin ${resolved.resolved.origin} but the page origin is ${pageOrigin}, and the runtime only fetches same-origin by default. To allow this origin, pass endpointPolicy: { mode: 'allowlist', allowOrigins: ['${resolved.resolved.origin}'] } in ResumptionConfig.`;
    case 'origin-not-allowed':
      return `${label} URL "${rawUrl}" was rejected: origin ${resolved.resolved.origin} is not in the endpoint allowlist. Add '${resolved.resolved.origin}' to endpointPolicy.allowOrigins (or endpointPolicy.byKind.${kind}) in ResumptionConfig.`;
    case 'kind-not-allowed':
      return `${label} URL "${rawUrl}" was rejected: the endpoint policy defines per-kind allowlists but none for '${kind}'. Add '${resolved.resolved.origin}' to endpointPolicy.byKind.${kind} in ResumptionConfig.`;
    case 'private-ip-rejected':
      return `${label} URL "${rawUrl}" was rejected: it resolves to a private or reserved address (${resolved.resolved.hostname}), which the runtime blocks to prevent SSRF. Use a public hostname or a relative same-origin path.`;
  }
};

/** Build fetch init with an optional {@link ResumptionConfig.timeout} AbortSignal (#122). */
const recoveryFetchInit = (timeout?: Millis): RequestInit | undefined => {
  if (timeout === undefined) return undefined;
  return { signal: AbortSignal.timeout(timeout) };
};

/**
 * Request a snapshot when resumption is not possible.
 */
export const fetchSnapshot = async (
  artifactId: string,
  config?: Partial<Pick<ResumptionConfig, 'snapshotUrl' | 'endpointPolicy' | 'timeout'>>,
): Promise<Extract<ResumeResponse, { type: 'snapshot' }>> => {
  const finalConfig = { ...defaultResumptionConfig, ...config };
  const snapshotUrl = finalConfig.snapshotUrl!;
  const endpointPolicy = finalConfig.endpointPolicy;
  const resolved = resolveRuntimeUrl(snapshotUrl, {
    kind: 'snapshot',
    policy: endpointPolicy,
  });
  if (resolved.type !== 'allowed') {
    throw ValidationError('resumption.snapshotUrl', describeEndpointRejection('snapshot', snapshotUrl, resolved));
  }

  const url = new URL(resolved.resolved.toString());
  appendArtifactIdToUrl(url, artifactId);

  let response: Response;
  try {
    response = await fetch(url.toString(), recoveryFetchInit(finalConfig.timeout));
  } catch (error) {
    throw IoError('resumption.snapshot', `Failed to fetch snapshot: ${error}`, { cause: error });
  }

  if (!response.ok) {
    throw IoError(
      'resumption.snapshot',
      `Snapshot request to ${url.toString()} failed: ${response.status} ${response.statusText}. The default snapshot endpoint is '${defaultResumptionConfig.snapshotUrl}/<artifactId>' — your server must implement it, or set ResumptionConfig.snapshotUrl to your endpoint.`,
      { path: url.toString() },
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw ParseError('snapshot-response', `Failed to parse snapshot: ${error}`);
  }

  if (!isSnapshotPayload(data)) {
    throw ParseError('snapshot-response', 'Malformed snapshot response: missing or invalid html/lastEventId fields', {
      code: 'malformed',
    });
  }

  return {
    type: 'snapshot' as const,
    html: data.html,
    signals: data.signals,
    lastEventId: data.lastEventId,
  };
};

/**
 * Request missed events to replay.
 */
const requestReplay = async (
  artifactId: string,
  fromEventId: string,
  toEventId: string,
  replayUrl: string,
  endpointPolicy: ResumptionConfig['endpointPolicy'],
  timeout?: Millis,
): Promise<readonly unknown[]> => {
  const resolved = resolveRuntimeUrl(replayUrl, {
    kind: 'replay',
    policy: endpointPolicy,
  });
  if (resolved.type !== 'allowed') {
    throw ValidationError('resumption.replayUrl', describeEndpointRejection('replay', replayUrl, resolved));
  }

  const url = new URL(resolved.resolved.toString());
  appendArtifactIdToUrl(url, artifactId);
  url.searchParams.set('from', fromEventId);
  url.searchParams.set('to', toEventId);

  let response: Response;
  try {
    response = await fetch(url.toString(), recoveryFetchInit(timeout));
  } catch (error) {
    throw IoError('resumption.replay', `Failed to fetch replay: ${error}`, { cause: error });
  }

  if (!response.ok) {
    throw IoError(
      'resumption.replay',
      `Replay request to ${url.toString()} failed: ${response.status} ${response.statusText}. The default replay endpoint is '${defaultResumptionConfig.replayUrl}/<artifactId>?from=<eventId>&to=<eventId>' — your server must implement it, or set ResumptionConfig.replayUrl to your endpoint.`,
      { path: url.toString() },
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw ParseError('replay-response', `Failed to parse replay: ${error}`);
  }

  if (!isReplayPayload(data)) {
    throw ParseError('replay-response', 'Malformed replay response: missing or invalid patches array', {
      code: 'malformed',
    });
  }

  return data.patches;
};

// parseEventId is re-exported from resumption-pure.ts above

/**
 * SSE resumption protocol namespace.
 *
 * Handles connection resumption using `lastEventId`. Persists resumption
 * state to `sessionStorage`, compares event IDs to determine if replay
 * is possible, and falls back to full snapshot when the gap is too large.
 *
 * @example
 * ```ts
 * import { Resumption } from '@liteship/web';
 *
 * // Save state on each SSE message (timestamp defaults to systemClock.now())
 * Resumption.saveState({ artifactId: 'doc-1', lastEventId: 'evt-99', lastSequence: 99 });
 *
 * // On reconnect, resume from where we left off
 * const response = await Resumption.resume('doc-1', 'evt-105');
 * // response.type => 'replay' (patches) or 'snapshot' (full state)
 * ```
 */
export const Resumption = {
  saveState,
  loadState,
  clearState,
  canResume,
  resume,
  fetchSnapshot,
  parseEventId,
} as const;
