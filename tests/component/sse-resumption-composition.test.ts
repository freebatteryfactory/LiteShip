/**
 * Component test: SSE + Resumption composition (the host-wiring recipe).
 *
 * Guards the documented composition recipe from the `SSE.create` docblock
 * (packages/web/src/stream/sse.ts): SSE is the transport, Resumption is the
 * recovery protocol, and HOSTS compose them. The reference production wiring
 * is packages/astro/src/runtime/stream.ts (`saveResumptionState` +
 * `reconcileResumption`); this suite exercises the same three steps against
 * mocks (MockEventSource + sessionStorage + fetch) so the recipe cannot rot:
 *
 *   1. Seed `SSE.create({ lastEventId })` from `Resumption.loadState`.
 *   2. Persist the cursor via `Resumption.saveState` as messages arrive.
 *   3. After reconnect, close the gap with `Resumption.resume`.
 *
 * The transport is Promise/sync-first: `SSE.create` returns the client
 * synchronously, `state`/`lastEventId` are plain accessors, and `messages` is
 * an AsyncIterable consumed with `for await`.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSE, Resumption } from '@czap/web';
import type { ResumptionState, SSEConfig } from '@czap/web';
import { Millis } from '@czap/core';
import { MockEventSource } from '../helpers/mock-event-source.js';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const makeSessionStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn((k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    get length() {
      return store.size;
    },
    key: vi.fn((_i: number) => null as string | null),
  };
};

const mockResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
  });

const ARTIFACT_ID = 'doc-1';

/** State a "previous session" would have persisted before the page unloaded. */
const previousSessionState: ResumptionState = {
  artifactId: ARTIFACT_ID,
  lastEventId: 'evt-42',
  lastSequence: 42,
  timestamp: 1700000000,
};

const baseConfig: SSEConfig = {
  url: 'http://localhost:3000/api/stream',
  artifactId: ARTIFACT_ID,
  heartbeatInterval: Millis(5000),
  reconnect: {
    maxAttempts: 3,
    initialDelay: Millis(100),
    maxDelay: Millis(1000),
    factor: 2,
  },
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let storage: ReturnType<typeof makeSessionStorage>;
let restoreES: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  restoreES = MockEventSource.install();
  storage = makeSessionStorage();
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('location', { origin: 'http://localhost:3000' });
});

afterEach(() => {
  restoreES();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Step 1 — seed the transport cursor from persisted state
// ---------------------------------------------------------------------------

describe('SSE + Resumption composition (docblock recipe)', () => {
  test('step 1: SSE.create seeded from Resumption.loadState re-sends the cursor on the stream URL', () => {
    // A previous session persisted its cursor.
    Resumption.saveState(previousSessionState);

    const saved = Resumption.loadState(ARTIFACT_ID);
    expect(saved).not.toBeNull();

    const client = SSE.create({
      ...baseConfig,
      lastEventId: saved?.lastEventId,
    });

    // The transport encodes the seeded cursor into the EventSource URL
    // (SSE.buildUrl) so the server can resume the stream where it left off.
    const es = MockEventSource.instances[0]!;
    const url = new URL(es.url);
    expect(url.searchParams.get('lastEventId')).toBe('evt-42');

    expect(client.lastEventId).toBe('evt-42');
    client.close();
  });

  test('step 1 (cold start): no persisted state means no cursor on the URL', () => {
    const saved = Resumption.loadState(ARTIFACT_ID);
    expect(saved).toBeNull();

    const client = SSE.create({
      ...baseConfig,
      lastEventId: saved?.lastEventId,
    });

    const es = MockEventSource.instances[0]!;
    const url = new URL(es.url);
    expect(url.searchParams.get('lastEventId')).toBeNull();
    client.close();
  });

  // -------------------------------------------------------------------------
  // Step 2 — persist the cursor as messages arrive
  // -------------------------------------------------------------------------

  test('step 2: tapping client.messages persists each cursor via Resumption.saveState', async () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    es.simulateMessage(JSON.stringify({ type: 'patch', data: '<p>one</p>' }), 'evt-7');
    es.simulateMessage(JSON.stringify({ type: 'patch', data: '<p>two</p>' }), 'evt-8');

    // The docblock recipe: for each message, read the transport cursor and
    // persist it so a future session can resume.
    let seen = 0;
    for await (const _message of client.messages) {
      const cursor = client.lastEventId;
      if (cursor !== null) {
        Resumption.saveState({
          artifactId: ARTIFACT_ID,
          lastEventId: cursor,
          lastSequence: Resumption.parseEventId(cursor).sequence,
          timestamp: 1700000000,
        });
      }
      if (++seen >= 2) break;
    }

    const persisted = Resumption.loadState(ARTIFACT_ID);
    expect(persisted).toEqual({
      artifactId: ARTIFACT_ID,
      lastEventId: 'evt-8',
      lastSequence: 8,
      timestamp: 1700000000,
    });
    client.close();
  });

  // -------------------------------------------------------------------------
  // Step 3 — close the gap after a reconnect
  // -------------------------------------------------------------------------

  test('step 3: after reconnect, Resumption.resume replays the missed patches', async () => {
    // The session persisted evt-42 before the connection dropped.
    Resumption.saveState(previousSessionState);

    const fetchMock = vi.fn(async () => mockResponse({ patches: ['<p>43</p>', '<p>44</p>'] }));
    vi.stubGlobal('fetch', fetchMock);

    const saved = Resumption.loadState(ARTIFACT_ID);
    const client = SSE.create({
      ...baseConfig,
      lastEventId: saved?.lastEventId,
    });

    // Connection drops: transport goes 'reconnecting' and schedules a retry.
    MockEventSource.instances[0]!.simulateError();
    expect(client.state).toBe('reconnecting');

    // Backoff elapses; the transport reconnects and the server greets us with a
    // newer cursor than the one we persisted (a gap of 2 events).
    vi.advanceTimersToNextTimer();
    const reconnected = MockEventSource.instances[1]!;
    reconnected.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-45');
    expect(client.state).toBe('connected');

    // The host closes the gap: small gap -> replay (not snapshot).
    const currentEventId = client.lastEventId!;
    const response = await Resumption.resume(ARTIFACT_ID, currentEventId);

    expect(response.type).toBe('replay');
    if (response.type === 'replay') {
      expect(response.patches).toEqual(['<p>43</p>', '<p>44</p>']);
    }

    // The replay request asked for exactly the persisted->current range, with
    // the artifactId appended as a path segment (see SSEConfig docs).
    const replayUrl = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(replayUrl.pathname).toBe(`/czap/replay/${ARTIFACT_ID}`);
    expect(replayUrl.searchParams.get('from')).toBe('evt-42');
    expect(replayUrl.searchParams.get('to')).toBe('evt-45');
    client.close();
  });

  test('step 3 (no prior state): Resumption.resume falls back to a full snapshot', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({ html: '<main>fresh</main>', signals: null, lastEventId: 'evt-45' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    // Nothing persisted (sessionStorage cleared / first visit): the recovery
    // protocol cannot replay, so it fetches a snapshot.
    const response = await Resumption.resume(ARTIFACT_ID, 'evt-45');

    expect(response.type).toBe('snapshot');
    if (response.type === 'snapshot') {
      expect(response.html).toBe('<main>fresh</main>');
      expect(response.lastEventId).toBe('evt-45');
    }

    const snapshotUrl = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(snapshotUrl.pathname).toBe(`/czap/snapshot/${ARTIFACT_ID}`);
  });
});
