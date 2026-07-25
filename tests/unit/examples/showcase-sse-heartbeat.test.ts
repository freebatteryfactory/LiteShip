import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  scheduleShowcaseSseHeartbeat,
  SHOWCASE_SSE_HEARTBEAT_MS,
} from '../../../examples/showcase/src/server/sse-heartbeat.js';
import { parseMessage } from '@liteship/web/lite';

describe('showcase SSE heartbeat', () => {
  afterEach(() => vi.useRealTimers());

  test('emits an EventSource-visible heartbeat before the runtime watchdog expires', () => {
    vi.useFakeTimers();
    const frames: Uint8Array[] = [];
    const controller = {
      enqueue: (frame: Uint8Array) => frames.push(frame),
    } as unknown as ReadableStreamDefaultController<Uint8Array>;
    const timer = scheduleShowcaseSseHeartbeat(controller, new TextEncoder());

    vi.advanceTimersByTime(SHOWCASE_SSE_HEARTBEAT_MS - 1);
    expect(frames).toHaveLength(0);
    vi.advanceTimersByTime(1);

    const wire = new TextDecoder().decode(frames[0]);
    expect(wire).toBe('data: {"type":"heartbeat"}\n\n');
    expect(parseMessage(new MessageEvent('message', { data: wire.slice(6).trim() }))).toEqual({ type: 'heartbeat' });

    clearInterval(timer);
  });
});
