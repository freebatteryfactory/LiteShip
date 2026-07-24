/**
 * Error-contract tests for the compositor worker host: forwarded worker
 * errors name the message type being handled plus the most common cause,
 * and unhandled worker errors teach the dominant CSP failure mode.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { CompositorWorker } from '@liteship/worker';
import { MockWorker } from '../../helpers/mock-worker.js';

let restoreWorker: () => void;
let diagnosticEvents: Diagnostics.Event[] = [];

beforeEach(() => {
  restoreWorker = MockWorker.install();
  const { sink, events } = Diagnostics.createBufferSink();
  Diagnostics.setSink(sink);
  diagnosticEvents = events;

  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:mock-url';
  URL.revokeObjectURL = () => {};
  (globalThis as { __origURLCreate?: typeof URL.createObjectURL }).__origURLCreate = origCreate;
  (globalThis as { __origURLRevoke?: typeof URL.revokeObjectURL }).__origURLRevoke = origRevoke;
});

afterEach(() => {
  Diagnostics.reset();
  restoreWorker();
  const g = globalThis as {
    __origURLCreate?: typeof URL.createObjectURL;
    __origURLRevoke?: typeof URL.revokeObjectURL;
  };
  if (g.__origURLCreate) {
    URL.createObjectURL = g.__origURLCreate;
    URL.revokeObjectURL = g.__origURLRevoke!;
  }
});

describe('compositor worker error contract', () => {
  test('worker-message-error names the message type being handled and the common cause', () => {
    const cw = CompositorWorker.create();
    const worker = MockWorker.instances[0]!;

    worker.simulateMessage({ type: 'error', message: 'boom from compute', context: 'compute' });

    const event = diagnosticEvents.find((e) => e.code === 'worker-message-error');
    expect(event?.message).toBe(
      'Compositor worker failed while handling "compute". Most often a registration whose thresholds do not line up with its states (thresholds[i] is the lower bound of states[i]).',
    );
    // Merged contract: detail is the structured envelope (code/hint from the
    // ErrorMessage extension + context from this cluster), not bare prose.
    expect(event?.detail).toMatchObject({ message: 'boom from compute', context: 'compute' });
    cw.dispose();
  });

  test('worker-message-error without context keeps the generic message', () => {
    const cw = CompositorWorker.create();
    const worker = MockWorker.instances[0]!;

    worker.simulateMessage({ type: 'error', message: 'boom' });

    const event = diagnosticEvents.find((e) => e.code === 'worker-message-error');
    expect(event?.message).toBe('Compositor worker reported an error.');
    cw.dispose();
  });

  test('worker-unhandled-error teaches the worker-src blob: CSP fix', () => {
    const cw = CompositorWorker.create();
    const worker = MockWorker.instances[0]!;

    worker.simulateError('script blocked');

    const event = diagnosticEvents.find((e) => e.code === 'worker-unhandled-error');
    expect(event?.message).toBe(
      'Compositor worker raised an unhandled error (often the Blob-URL worker being blocked by a strict CSP — allow worker-src blob:). Detail: script blocked',
    );
    cw.dispose();
  });
});
