/**
 * AudioWorklet bootstrap factory. Excluded from coverage because
 * `AudioWorkletProcessor` + `AudioWorkletNode` exist only inside an
 * AudioWorklet realm — jsdom can't load them, and Vitest browser tests
 * don't reach this surface in a deterministic way. Exercised live by
 * the browser stream-stress E2E (`tests/e2e/stream.e2e.ts`).
 *
 * The inline worklet source string lives here to keep `processor.ts`'s
 * surface API (the `AudioProcessor` interface) in coverage.
 *
 * @module
 */

import { Lifetime, attachLifetime, type AVBridge } from '@liteship/core';
import type { AudioProcessor } from './processor.js';

const PROCESSOR_SOURCE = /* js */ `
class AVSyncProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const sab = options.processorOptions.sab;
    this._i32 = new Int32Array(sab);
    this._running = true;

    this.port.onmessage = (e) => {
      if (e.data === 'start') {
        Atomics.store(this._i32, 1, 1);
        this._running = true;
      } else if (e.data === 'stop') {
        Atomics.store(this._i32, 1, 0);
        this._running = false;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (input && output) {
      for (let ch = 0; ch < output.length; ch++) {
        const inCh = input[ch];
        const outCh = output[ch];
        if (inCh && outCh) {
          outCh.set(inCh);
        }
      }
    }

    if (this._running) {
      Atomics.add(this._i32, 0, 128);
    }

    return true;
  }
}

registerProcessor('av-sync-processor', AVSyncProcessor);
`;

/**
 * Register the inline AV-sync worklet module against `context` and mint
 * a connected {@link AudioProcessor}. Resolves once the worklet module
 * is installed; the caller is responsible for connecting `node.node`
 * into the audio graph.
 *
 * @param context - The target `AudioContext`.
 * @param bridge - Shared AV bridge the worklet will mutate 128 samples
 *   at a time.
 */
export async function createAudioProcessor(context: AudioContext, bridge: AVBridge): Promise<AudioProcessor> {
  const blob = new Blob([PROCESSOR_SOURCE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  try {
    await context.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  const node = new AudioWorkletNode(context, 'av-sync-processor', {
    processorOptions: { sab: bridge.buffer },
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });

  const lifetime = Lifetime.make();
  lifetime.add(() => {
    // Teardown is attempt-all: one hostile host operation must not strand the
    // remaining owned resource. The Lifetime promise is the error channel; all
    // three synchronous release attempts still run before dispose() returns.
    const errors: unknown[] = [];
    const attempt = (operation: () => void): void => {
      try {
        operation();
      } catch (error) {
        errors.push(error);
      }
    };
    attempt(() => bridge.setRunning(false));
    attempt(() => node.port.postMessage('stop'));
    attempt(() => node.disconnect());
    if (errors.length > 0) {
      throw new AggregateError(errors, 'AudioProcessor disposal failed after attempting every teardown step');
    }
  });

  return attachLifetime(
    {
      node,
      bridge,

      start() {
        if (lifetime.disposed) return;
        bridge.setRunning(true);
        node.port.postMessage('start');
      },

      stop() {
        if (lifetime.disposed) return;
        bridge.setRunning(false);
        node.port.postMessage('stop');
      },
    },
    lifetime,
  );
}
