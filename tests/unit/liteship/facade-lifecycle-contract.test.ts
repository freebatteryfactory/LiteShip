// @vitest-environment node
/**
 * Public-facade lifecycle contract.
 *
 * Active resources exposed through `liteship/*` own one direct, monotonic
 * teardown. These tests deliberately import the curated facade modules rather
 * than their implementation owners so a re-export or ownership regression
 * cannot stay green behind owner-only coverage.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { defineBoundary } from '../../../packages/liteship/src/index.js';
import { createTimeline } from '../../../packages/liteship/src/motion.js';
import { AVBridge } from '../../../packages/liteship/src/media.js';
import { createAudioProcessor, SSE } from '../../../packages/liteship/src/runtime.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('liteship/motion — Timeline owns its direct lifecycle', () => {
  test('dispose is direct, exactly-once, and completes subscribers', async () => {
    const timeline = createTimeline(
      defineBoundary({
        input: 'time.elapsed',
        at: [
          [0, 'idle'],
          [100, 'active'],
        ] as const,
      }),
    );
    let completed = 0;
    timeline.subscribe({ next: () => undefined, complete: () => (completed += 1) });

    const first = timeline.dispose();
    const second = timeline.dispose();

    expect(second).toBe(first);
    await first;
    expect(timeline.lifetime.disposed).toBe(true);
    expect(completed).toBe(1);
    await expect(timeline[Symbol.asyncDispose]()).resolves.toBeUndefined();
    expect(completed).toBe(1);
  });
});

describe('liteship/runtime — AudioProcessor disposal', () => {
  test('is monotonic and attempts graph disconnect when the worklet port throws', async () => {
    const posted: string[] = [];
    let disconnects = 0;
    let throwOnStop = false;

    class FakeAudioWorkletNode {
      readonly port = {
        postMessage(message: string): void {
          posted.push(message);
          if (message === 'stop' && throwOnStop) throw new Error('hostile worklet port');
        },
      };

      disconnect(): void {
        disconnects += 1;
      }
    }

    vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:liteship-audio-test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const addModule = vi.fn(async () => undefined);
    const context = { audioWorklet: { addModule } } as unknown as AudioContext;
    const bridge = AVBridge.make({ sampleRate: 48_000, fps: 60 });
    const processor = await createAudioProcessor(context, bridge);

    processor.start();
    expect(bridge.isRunning()).toBe(true);
    throwOnStop = true;

    const first = processor.dispose();
    expect(bridge.isRunning()).toBe(false);
    expect(posted).toEqual(['start', 'stop']);
    expect(disconnects).toBe(1);
    await expect(first).rejects.toMatchObject({ _tag: 'LifetimeDisposeError' });

    // The first call claimed disposal even though one host arm failed. Every
    // later lifecycle operation is inert and cannot repeat a side effect.
    const second = processor.dispose();
    expect(second).toBe(first);
    await expect(second).rejects.toMatchObject({ _tag: 'LifetimeDisposeError' });
    expect(processor[Symbol.asyncDispose]()).toBe(first);
    processor.start();
    processor.stop();
    expect(posted).toEqual(['start', 'stop']);
    expect(disconnects).toBe(1);
  });
});

describe('liteship/runtime — SSE disposal attempt-all contract', () => {
  test('a throwing EventSource cannot strand either async stream', async () => {
    vi.useFakeTimers();

    class ThrowingEventSource {
      static latest: ThrowingEventSource | undefined;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      closeCalls = 0;

      constructor(_url: string | URL) {
        ThrowingEventSource.latest = this;
      }

      close(): void {
        this.closeCalls += 1;
        throw new Error('hostile EventSource.close');
      }
    }

    vi.stubGlobal('EventSource', ThrowingEventSource);
    const client = SSE.create({ url: '/events' });
    const source = ThrowingEventSource.latest;
    const messages = client.messages[Symbol.asyncIterator]();
    const states = client.stateChanges[Symbol.asyncIterator]();
    const parkedMessage = messages.next();
    const parkedState = states.next();

    const first = client.dispose();
    expect(source?.closeCalls).toBe(1);
    expect(source?.onmessage).toBeNull();
    expect(source?.onerror).toBeNull();
    await expect(parkedMessage).resolves.toEqual({ value: undefined, done: true });
    await expect(parkedState).resolves.toEqual({ value: 'disconnected', done: false });
    await expect(states.next()).resolves.toEqual({ value: undefined, done: true });
    await expect(first).rejects.toMatchObject({ _tag: 'LifetimeDisposeError' });

    const second = client.dispose();
    expect(second).toBe(first);
    await expect(second).rejects.toMatchObject({ _tag: 'LifetimeDisposeError' });
    expect(client[Symbol.asyncDispose]()).toBe(first);
    expect(source?.closeCalls).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
