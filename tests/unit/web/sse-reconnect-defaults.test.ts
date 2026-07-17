/**
 * SSEConfig.reconnect partial override — omitted knobs fall back to
 * defaultReconnectConfig instead of all-or-nothing replacement.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SSE } from '@czap/web';
import { MockEventSource } from '../../helpers/mock-event-source.js';

describe('SSE.create reconnect partial override', () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    cleanup = MockEventSource.install();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('a single-knob override keeps the default maxAttempts and reconnects', async () => {
    const client = SSE.create({ url: '/api/stream', reconnect: { factor: 3 } });

    // First failure: with the merged policy (maxAttempts 10 from the
    // defaults), the client schedules a retry instead of dropping straight
    // to 'error'.
    MockEventSource.instances[0]!.simulateError();
    expect(client.state).toBe('reconnecting');

    // The retry fires after initialDelay (default 1000ms) * factor^0, plus up
    // to ±25% jitter — 1300ms covers the worst case.
    await vi.advanceTimersByTimeAsync(1300);
    expect(MockEventSource.instances.length).toBe(2);

    client.close();
  });

  test('an explicit maxAttempts: 0 still disables reconnection', () => {
    const client = SSE.create({ url: '/api/stream', reconnect: { maxAttempts: 0 } });

    MockEventSource.instances[0]!.simulateError();
    expect(client.state).toBe('error');
    expect(MockEventSource.instances.length).toBe(1);

    client.close();
  });
});
