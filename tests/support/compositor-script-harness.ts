/** In-process execution harness for the classic compositor worker blob. @module */

import { COMPOSITOR_WORKER_SCRIPT } from '../../packages/worker/src/compositor-script.js';

export interface CompositorScriptHarness {
  readonly messages: unknown[];
  readonly closed: boolean;
  send(data: unknown): void;
  take<T extends { readonly type: string }>(type: T['type']): T;
}

export function executeCompositorScript(stepMs = 20): CompositorScriptHarness {
  let listener: ((event: { readonly data: unknown }) => void) | undefined;
  let now = 0;
  let closed = false;
  const messages: unknown[] = [];
  const workerGlobal = {
    addEventListener(type: string, next: (event: { readonly data: unknown }) => void): void {
      if (type === 'message') listener = next;
    },
    postMessage(message: unknown): void {
      messages.push(structuredClone(message));
    },
    close(): void {
      closed = true;
    },
  };
  const performanceClock = {
    now(): number {
      now += stepMs;
      return now;
    },
  };

  const execute = new Function('self', 'performance', COMPOSITOR_WORKER_SCRIPT) as (
    self: typeof workerGlobal,
    performance: typeof performanceClock,
  ) => void;
  execute(workerGlobal, performanceClock);
  if (listener === undefined) throw new Error('compositor worker script did not install its message listener');

  return {
    messages,
    get closed() {
      return closed;
    },
    send(data: unknown): void {
      listener?.({ data });
    },
    take<T extends { readonly type: string }>(type: T['type']): T {
      const index = messages.findIndex(
        (message) => typeof message === 'object' && message !== null && (message as { type?: unknown }).type === type,
      );
      if (index < 0) throw new Error(`compositor worker script emitted no ${type} message`);
      return messages.splice(index, 1)[0] as T;
    },
  };
}
