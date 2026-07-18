/**
 * Component test: SSE client lifecycle.
 *
 * Tests full SSE client with connection management, reconnection,
 * heartbeat timeout, buffer backpressure, and state transitions.
 *
 * The client is Promise/AbortController-first: `SSE.create` returns the client
 * synchronously, `state`/`lastEventId`/`backpressure` are plain accessors,
 * `close`/`reconnect` are synchronous, and `messages`/`stateChanges` are
 * AsyncIterables ({@link takeAsync} subscribes synchronously, then resolves the
 * first `n` values).
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSE } from '@czap/web';
import type { SSEConfig } from '@czap/web';
import { Millis } from '@czap/core';
import { MockEventSource } from '../helpers/mock-event-source.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let restoreES: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  restoreES = MockEventSource.install();
});

afterEach(() => {
  restoreES();
  vi.useRealTimers();
});

const baseConfig: SSEConfig = {
  url: 'http://localhost/sse',
  heartbeatInterval: Millis(5000),
  reconnect: {
    maxAttempts: 3,
    initialDelay: Millis(100),
    maxDelay: Millis(1000),
    factor: 2,
  },
};

/**
 * Subscribe to `iterable` SYNCHRONOUSLY (the iterator's subscription is
 * established before the returned promise's first `await`), then resolve with
 * the first `n` values. Mirrors `Stream.runCollect(Stream.take(_, n))`.
 */
function takeAsync<T>(iterable: AsyncIterable<T>, n: number): Promise<T[]> {
  const iterator = iterable[Symbol.asyncIterator]();
  const out: T[] = [];
  const pump = async (): Promise<T[]> => {
    try {
      while (out.length < n) {
        const result = await iterator.next();
        if (result.done) break;
        out.push(result.value);
      }
    } finally {
      await iterator.return?.();
    }
    return out;
  };
  return pump();
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

describe('SSE client lifecycle', () => {
  test('creates EventSource on init', () => {
    SSE.create(baseConfig);

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]!.url).toContain('localhost/sse');
  });

  test('initial state is connecting', () => {
    const client = SSE.create(baseConfig);
    expect(client.state).toBe('connecting');
  });

  test('state becomes connected after first message', () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    // Simulate a valid message
    es.simulateMessage(JSON.stringify({ type: 'heartbeat' }));

    expect(client.state).toBe('connected');
  });

  test('close shuts down EventSource and state is disconnected', () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    client.close();

    expect(es.readyState).toBe(MockEventSource.CLOSED);
    expect(client.state).toBe('disconnected');
  });

  test('invalid messages are ignored without changing connection state', () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    es.simulateMessage('not json');

    expect(client.state).toBe('connecting');
  });
});

// ---------------------------------------------------------------------------
// Reconnection
// ---------------------------------------------------------------------------

describe('SSE reconnection', () => {
  test('error triggers reconnect with new EventSource', () => {
    const client = SSE.create(baseConfig);
    const firstES = MockEventSource.instances[0]!;

    // Simulate error
    firstES.simulateError();

    expect(client.state).toBe('reconnecting');

    // Advance past initial delay
    vi.advanceTimersByTime(150);

    // A new EventSource should have been created
    expect(MockEventSource.instances).toHaveLength(2);
  });

  test('reconnect delay increases exponentially', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const client = SSE.create(baseConfig);
    expect(client.state).toBe('connecting');

    // First error
    MockEventSource.instances[0]!.simulateError();
    vi.advanceTimersByTime(150); // initialDelay=100, factor=2
    expect(MockEventSource.instances).toHaveLength(2);

    // Second error
    MockEventSource.instances[1]!.simulateError();
    vi.advanceTimersByTime(150); // Should NOT be enough (delay ~200)
    expect(MockEventSource.instances).toHaveLength(2);

    vi.advanceTimersByTime(100); // Now at ~250ms total, past 200ms delay
    expect(MockEventSource.instances).toHaveLength(3);
  });

  test('max attempts reached sets state to error', () => {
    const client = SSE.create(baseConfig);

    // Exhaust all 3 reconnect attempts
    for (let i = 0; i < 3; i++) {
      const es = MockEventSource.instances[MockEventSource.instances.length - 1]!;
      es.simulateError();
      vi.advanceTimersByTime(2000); // Plenty of time for any backoff
    }

    // One more error after max attempts
    const lastES = MockEventSource.instances[MockEventSource.instances.length - 1]!;
    lastES.simulateError();

    expect(client.state).toBe('error');
  });

  test('manual reconnect resets attempt counter', () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    // Trigger an error
    es.simulateError();
    vi.advanceTimersByTime(200);

    const countBefore = MockEventSource.instances.length;

    // Manual reconnect
    client.reconnect();

    // Should have created a new EventSource
    expect(MockEventSource.instances.length).toBe(countBefore + 1);
    expect(client.state).toBe('connecting');
  });

  test('a stale error from a replaced source does not tear down the live replacement', () => {
    // Regression (Greptile T-Rex repro): a queued `onerror` from EventSource A,
    // delivered AFTER a reconnect installed replacement B, must not drive
    // `handleConnectionLoss` (which reads the CURRENT `machine.source` = B),
    // close B, and schedule a spurious third connection. The per-source identity
    // guard makes the stale callback inert. Manual `reconnect()` is used because
    // it closes A WITHOUT detaching its handlers — the path the guard protects.
    const client = SSE.create(baseConfig);
    const staleES = MockEventSource.instances[0]!;
    staleES.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'live-1');
    expect(client.state).toBe('connected');

    // Replace A with B (handlers on A are left installed by manual reconnect).
    client.reconnect();
    expect(MockEventSource.instances).toHaveLength(2);
    const liveES = MockEventSource.instances[1]!;
    liveES.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'live-2');
    expect(client.state).toBe('connected');
    expect(client.lastEventId).toBe('live-2');

    // The stale error + a stale frame from A fire after B is live.
    staleES.simulateError();
    staleES.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'stale-999');

    // B is untouched: still connected, cursor uncorrupted, no third source
    // even after any backoff timer would have elapsed.
    vi.advanceTimersByTime(2000);
    expect(client.state).toBe('connected');
    expect(client.lastEventId).toBe('live-2');
    expect(MockEventSource.instances).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Heartbeat timeout
// ---------------------------------------------------------------------------

describe('SSE heartbeat', () => {
  test('heartbeat timeout reconnects instead of wedging in error', () => {
    // A silent heartbeat timeout means the connection died without an
    // `onerror`. The watchdog must funnel through the SAME reconnect path —
    // close the dead source, go `reconnecting`, then re-open on backoff —
    // rather than latching `error` (the latent primitive bug A3 fixes).
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // zero jitter -> delay === initialDelay

    const client = SSE.create(baseConfig);

    // Heartbeat fires at heartbeatInterval * 2 = 10000ms.
    vi.advanceTimersByTime(10_000);
    expect(client.state).toBe('reconnecting');
    expect(MockEventSource.instances).toHaveLength(1);

    // Backoff (initialDelay 100ms, jitter 0) re-opens the source.
    vi.advanceTimersByTime(100);
    expect(MockEventSource.instances).toHaveLength(2);
  });

  test('messages reset heartbeat timer', () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    // Send a message at 4s (before 10s timeout)
    vi.advanceTimersByTime(4000);
    es.simulateMessage(JSON.stringify({ type: 'heartbeat' }));

    // Advance another 4s (total 8s from message, still before 10s)
    vi.advanceTimersByTime(4000);

    expect(client.state).toBe('connected');
  });

  test('close after a heartbeat timeout lands in disconnected and cancels the pending reconnect', () => {
    const client = SSE.create(baseConfig);

    vi.advanceTimersByTime(10_000); // heartbeat -> reconnecting + scheduled reconnect
    client.close();

    expect(client.state).toBe('disconnected');

    // The scheduled reconnect must have been cancelled by close().
    const countAfterClose = MockEventSource.instances.length;
    vi.advanceTimersByTime(5000);
    expect(MockEventSource.instances.length).toBe(countAfterClose);
  });

  test('manual reconnect after a heartbeat timeout supersedes the scheduled one', () => {
    const client = SSE.create(baseConfig);

    vi.advanceTimersByTime(10_000); // heartbeat -> reconnecting (source cleared)
    const countBefore = MockEventSource.instances.length;

    client.reconnect();

    expect(MockEventSource.instances.length).toBe(countBefore + 1);
    expect(client.state).toBe('connecting');
  });
});

// ---------------------------------------------------------------------------
// State transition edges
// ---------------------------------------------------------------------------

describe('SSE stateChanges', () => {
  test('emits a deduplicated edge per status transition', async () => {
    vi.useRealTimers();
    try {
      const client = SSE.create(baseConfig);
      // Collect the first two edges: connected (first message), then
      // reconnecting (error). Repeated 'connected' messages must NOT re-emit
      // — it is a transition stream, not a per-message firehose. `takeAsync`
      // subscribes synchronously BEFORE the transitions are triggered.
      const collected = takeAsync(client.stateChanges, 2);

      const es = MockEventSource.instances[0]!;
      es.simulateMessage(JSON.stringify({ type: 'heartbeat' }));
      es.simulateMessage(JSON.stringify({ type: 'heartbeat' }));
      es.simulateError();

      const edges = await collected;
      expect(edges).toEqual(['connected', 'reconnecting']);
      client.close();
    } finally {
      vi.useFakeTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// Last Event ID
// ---------------------------------------------------------------------------

describe('SSE lastEventId', () => {
  test('tracks lastEventId from messages', () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    es.simulateMessage(JSON.stringify({ type: 'patch', data: {} }), 'evt-42');

    expect(client.lastEventId).toBe('evt-42');
  });

  test('lastEventId is null initially', () => {
    const client = SSE.create(baseConfig);
    expect(client.lastEventId).toBeNull();
  });
});
// Backpressure
// ---------------------------------------------------------------------------

describe('SSE backpressure', () => {
  test('reports buffer usage', () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    // Send some messages
    for (let i = 0; i < 5; i++) {
      es.simulateMessage(JSON.stringify({ type: 'patch', data: { i } }));
    }

    const bp = client.backpressure;
    expect(bp.bufferSize).toBe(5);
    expect(bp.maxBufferSize).toBe(100);
    expect(bp.percentFull).toBe(5);
    expect(bp.dropping).toBe(false);
  });

  test('drops messages when buffer is full', () => {
    const client = SSE.create(baseConfig);
    const es = MockEventSource.instances[0]!;

    // Fill the buffer to capacity (100) and then some
    for (let i = 0; i < 105; i++) {
      es.simulateMessage(JSON.stringify({ type: 'patch', data: { i } }));
    }

    const bp = client.backpressure;
    expect(bp.bufferSize).toBe(100);
    expect(bp.dropping).toBe(true);
    expect(bp.percentFull).toBe(100);
  });

  test('consuming messages drains the buffer', async () => {
    vi.useRealTimers();
    try {
      const client = SSE.create(baseConfig);
      const es = MockEventSource.instances[0]!;
      const collected = takeAsync(client.messages, 2);

      es.simulateMessage(JSON.stringify({ type: 'patch', data: { i: 1 } }));
      es.simulateMessage(JSON.stringify({ type: 'patch', data: { i: 2 } }));

      const messages = await collected;
      expect(messages).toHaveLength(2);

      const bp = client.backpressure;
      expect(bp.bufferSize).toBe(0);
      expect(bp.percentFull).toBe(0);
      client.close();
    } finally {
      vi.useFakeTimers();
    }
  });
});

describe('SSE iterator cancellation', () => {
  test('return() settles a parked next() read (cancellation does not hang)', async () => {
    const client = SSE.create(baseConfig);
    const iterator = client.messages[Symbol.asyncIterator]();
    // Park a read: nothing is buffered, so next() returns an unsettled promise.
    const parked = iterator.next();
    // Cancel while the read is parked.
    const returned = await iterator.return!();
    expect(returned.done).toBe(true);
    // Without the return()-settles-waiter fix, `parked` never resolves — after the
    // disposer detaches, the `complete` callback can no longer fire.
    const result = await parked;
    expect(result.done).toBe(true);
    client.close();
  });

  test('stateChanges return() settles a parked next() read', async () => {
    const client = SSE.create(baseConfig);
    const iterator = client.stateChanges[Symbol.asyncIterator]();
    const parked = iterator.next();
    const returned = await iterator.return!();
    expect(returned.done).toBe(true);
    const result = await parked;
    expect(result.done).toBe(true);
    client.close();
  });
});

describe('SSE initial lastEventId config', () => {
  test('uses lastEventId from config when provided', () => {
    const client = SSE.create({ ...baseConfig, lastEventId: 'evt-99' });
    expect(client.lastEventId).toBe('evt-99');
  });

  test('message without lastEventId does not overwrite existing value', () => {
    const client = SSE.create({ ...baseConfig, lastEventId: 'evt-50' });
    const es = MockEventSource.instances[0]!;

    // Message with no lastEventId
    es.simulateMessage(JSON.stringify({ type: 'heartbeat' }));

    expect(client.lastEventId).toBe('evt-50');
  });

  test('uses default reconnect config when none provided', () => {
    const client = SSE.create({ url: 'http://localhost/sse' });
    expect(client.state).toBe('connecting');
  });
});

// ---------------------------------------------------------------------------
// Pure helpers (already tested in unit, but verify wiring)
// ---------------------------------------------------------------------------

describe('SSE pure helpers', () => {
  test('buildUrl adds artifactId', () => {
    const url = SSE.buildUrl('http://localhost/sse', 'abc123');
    expect(url).toContain('/abc123');
  });

  test('buildUrl adds lastEventId as query param', () => {
    const url = SSE.buildUrl('http://localhost/sse', undefined, 'evt-5');
    expect(url).toContain('lastEventId=evt-5');
  });

  test('calculateDelay respects maxDelay', () => {
    const delay = SSE.calculateDelay(100, {
      maxAttempts: 10,
      initialDelay: Millis(100),
      maxDelay: Millis(500),
      factor: 2,
    });
    expect(delay).toBeLessThanOrEqual(500);
  });
});

// ---------------------------------------------------------------------------
// Lifetime cleanup
// ---------------------------------------------------------------------------

describe('SSE lifetime cleanup', () => {
  test('close shuts down the EventSource', () => {
    // `close()` disposes the client's Lifetime, whose synchronous finalizer
    // closes the EventSource, nulls the source, and completes the streams.
    const client = SSE.create(baseConfig);

    const es = MockEventSource.instances[0]!;
    expect(es.readyState).not.toBe(MockEventSource.CLOSED);

    client.close();
    expect(es.readyState).toBe(MockEventSource.CLOSED);
  });
});
