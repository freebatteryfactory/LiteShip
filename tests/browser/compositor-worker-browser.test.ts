import { describe, expect, test } from 'vitest';
import { COMPOSITOR_WORKER_SCRIPT } from '../../packages/worker/src/compositor-script.js';

function nextMessage<T extends { readonly type: string }>(worker: Worker, type: T['type']): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for compositor ${type}`)), 5000);
    const listener = (event: MessageEvent<unknown>): void => {
      if (typeof event.data === 'object' && event.data !== null && (event.data as { type?: unknown }).type === type) {
        clearTimeout(timer);
        worker.removeEventListener('message', listener);
        resolve(event.data as T);
      }
    };
    worker.addEventListener('message', listener);
  });
}

describe('compositor blob in a real browser Worker', () => {
  test('keeps unchanged quantizers in every emitted snapshot', async () => {
    const url = URL.createObjectURL(new Blob([COMPOSITOR_WORKER_SCRIPT], { type: 'application/javascript' }));
    const worker = new Worker(url, { type: 'classic' });
    try {
      const ready = nextMessage<{ type: 'ready' }>(worker, 'ready');
      worker.postMessage({ type: 'init', config: { targetFps: 60 } });
      await ready;
      worker.postMessage({ type: 'add-quantizer', name: 'a', boundaryId: 'fnv1a:a', states: ['lo', 'hi'], thresholds: [0, 500] });
      worker.postMessage({ type: 'add-quantizer', name: 'b', boundaryId: 'fnv1a:b', states: ['off', 'on'], thresholds: [0, 500] });
      const initial = nextMessage<{ type: 'state'; state: { discrete: Record<string, string> } }>(worker, 'state');
      worker.postMessage({ type: 'compute' });
      expect((await initial).state.discrete).toEqual({ a: 'lo', b: 'off' });

      worker.postMessage({ type: 'evaluate', name: 'a', value: 900 });
      const updated = nextMessage<{ type: 'state'; state: { discrete: Record<string, string> } }>(worker, 'state');
      worker.postMessage({ type: 'compute' });
      expect((await updated).state.discrete).toEqual({ a: 'hi', b: 'off' });
    } finally {
      worker.postMessage({ type: 'dispose' });
      worker.terminate();
      URL.revokeObjectURL(url);
    }
  });
});
