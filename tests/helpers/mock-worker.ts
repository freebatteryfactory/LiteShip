/**
 * MockWorker -- test double for the Worker API.
 *
 * Captures posted messages and provides simulateMessage
 * for test-driven message dispatch.
 *
 * Production contracts mirrored here:
 * - Worker constructor args used by worker bootstraps
 * - postMessage invalid-state behavior after terminate()
 * - add/removeEventListener and onmessage/onerror fanout used by worker hosts
 *
 * Conformance is compile-checked against {@link WorkerLike} — the structural
 * surface czap's worker hosts (packages/worker/src) actually drive — so
 * host/double drift breaks the build.
 */
import type { WorkerLike } from '../../packages/worker/src/messages.js';
import type { createStubRegistry } from './define-property-stub.js';

type MessageHandler = (event: MessageEvent) => void;

export class MockWorker {
  readonly url: string;
  readonly options: WorkerOptions | undefined;
  onmessage: MessageHandler | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  private _messageHandlers = new Set<MessageHandler>();
  private _errorHandlers = new Set<(event: ErrorEvent) => void>();

  /** Messages sent via postMessage(), in order. */
  postedMessages: Array<{ data: unknown; transfer?: Transferable[] }> = [];

  /** Whether terminate() has been called. */
  terminated = false;

  /** All instances created during the test, most recent last. */
  static instances: MockWorker[] = [];

  constructor(url: string | URL, options?: WorkerOptions) {
    this.url = typeof url === 'string' ? url : url.toString();
    this.options = options;
    MockWorker.instances.push(this);
  }

  postMessage(data: unknown, transfer?: Transferable[]): void {
    if (this.terminated) {
      throw new DOMException('Worker has been terminated', 'InvalidStateError');
    }
    this.postedMessages.push({ data, transfer });
  }

  addEventListener(type: string, handler: EventListenerOrEventListenerObject | MessageHandler): void {
    if (type === 'message') {
      this._messageHandlers.add(handler as MessageHandler);
    } else if (type === 'error') {
      this._errorHandlers.add(handler as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(type: string, handler: EventListenerOrEventListenerObject | MessageHandler): void {
    if (type === 'message') {
      this._messageHandlers.delete(handler as MessageHandler);
    } else if (type === 'error') {
      this._errorHandlers.delete(handler as (event: ErrorEvent) => void);
    }
  }

  terminate(): void {
    this.terminated = true;
    this._messageHandlers.clear();
    this._errorHandlers.clear();
  }

  /** Simulate receiving a message from the worker script. */
  simulateMessage(data: unknown): void {
    const event = { type: 'message', data } as unknown as MessageEvent;
    this.onmessage?.(event);
    for (const handler of this._messageHandlers) {
      handler(event);
    }
  }

  /** Simulate a worker error. */
  simulateError(message = 'Mock worker error'): void {
    const event = { type: 'error', message } as unknown as ErrorEvent;
    this.onerror?.(event);
    for (const handler of this._errorHandlers) {
      handler(event);
    }
  }

  /** Install as globalThis.Worker and return a cleanup function. */
  static install(): () => void {
    // The global slot is treated as unknown at the install seam: the double
    // is a subset of the lib.dom class by design (conformance to the
    // production-consumed surface is asserted below instead).
    const runtime = globalThis as { Worker?: unknown };
    const original = runtime.Worker;
    runtime.Worker = MockWorker;
    MockWorker.instances = [];
    return () => {
      runtime.Worker = original;
      MockWorker.instances = [];
    };
  }
}

// Compile-time conformance: the double must stay installable wherever the
// worker hosts consume a Worker. Drift in either direction is a build error.
const _asWorkerLike = (mock: MockWorker): WorkerLike => mock;
void _asWorkerLike;

/**
 * Stubs the Worker + SharedArrayBuffer + crossOriginIsolated trio that
 * gates worker-mode support (packages/astro/src/runtime/worker.ts checks all
 * three). Worker is stubbed with the real {@link MockWorker} double; the
 * SharedArrayBuffer stub is an anonymous presence sentinel — support gates
 * only probe `typeof SharedArrayBuffer !== 'undefined'`.
 */
export function stubWorkerEnvironment(
  stubs: ReturnType<typeof createStubRegistry>,
  vi: { stubGlobal: (name: string, value: unknown) => void },
): void {
  vi.stubGlobal('Worker', MockWorker);
  vi.stubGlobal('SharedArrayBuffer', class {});
  stubs.define(globalThis, 'crossOriginIsolated', {
    configurable: true,
    value: true,
  });
}
