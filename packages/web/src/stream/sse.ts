/**
 * SSE Client
 *
 * Manages SSE connection to the server for receiving patches,
 * signals, and events.
 *
 * Internal state is a plain mutable object mutated by a pure-ish reducer.
 * The transport is Promise/AbortController-first: a {@link Lifetime} owns the
 * teardown finalizer (replacing the former `Scope`), the sse-pure
 * {@link applyOverflow} buffer holds pending messages (replacing the bounded
 * `Queue`), and `messages`/`stateChanges` are {@link CellKernel}-backed
 * AsyncIterables. The `state`/`lastEventId`/`backpressure` accessors are plain
 * getters. See ADR-0005 §Category 4 for the rationale.
 */

import { CellKernel, Lifetime, Diagnostics, SSE_BUFFER_SIZE, SSE_HEARTBEAT_MS } from '@czap/core';
import type { SSEConfig, SSEState, SSEMessage, BackpressureHint, OverflowPolicy } from '../types.js';

/**
 * The EventSource surface the SSE client actually drives (assign, onmessage,
 * onerror, close). Named so the dependency is structural rather than ambient:
 * test doubles (tests/helpers/mock-event-source.ts) conform to THIS type, and
 * drift between consumer and double breaks the build.
 */
export interface SSEEventSource {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(): void;
}

/**
 * SSE client instance.
 */
export interface SSEClient {
  /**
   * Live async stream of parsed messages. Iterating drains the sse-pure
   * overflow buffer (so {@link backpressure} `bufferSize` drops as messages are
   * consumed); competing iterators share the single buffer, matching the former
   * bounded-`Queue` semantics.
   */
  readonly messages: AsyncIterable<SSEMessage>;
  /**
   * Edge stream of connection-state *transitions* (one emission per
   * `connecting`/`reconnecting`/`connected`/`error`/`disconnected` change,
   * deduplicated). Directive bridges drive resumption off the
   * `reconnecting -> connected` edge — `state` is the pull accessor,
   * `stateChanges` is the push edge.
   */
  readonly stateChanges: AsyncIterable<SSEState>;
  /** Current connection state (plain accessor). */
  readonly state: SSEState;
  /** Cursor from the most recent message, or `null` (plain accessor). */
  readonly lastEventId: string | null;
  /** Backpressure snapshot for the current buffer occupancy (plain accessor). */
  readonly backpressure: BackpressureHint;
  /**
   * Synchronous teardown: cancel the reconnect/heartbeat timers, detach and
   * close the live EventSource, drop the buffer, and complete the
   * `messages`/`stateChanges` streams. Idempotent — a second call is a no-op.
   */
  close(): void;
  /** Manual reconnect: cancel timers, close the source, reset backoff, re-open. */
  reconnect(): void;
}

// Import pure functions from sse-pure.ts (Effect-free) and re-export
import {
  defaultReconnectConfig as _defaultReconnectConfig,
  defaultOverflowPolicy,
  parseMessage as _parseMessage,
  calculateDelay as _calculateDelay,
  buildUrl as _buildUrl,
  applyOverflow,
} from './sse-pure.js';

/** Re-export of the default reconnect policy (see `./sse-pure.js`). */
export const defaultReconnectConfig = _defaultReconnectConfig;
/** Re-export of the pure SSE line-parser. */
export const parseMessage = _parseMessage;
/** Re-export of the exponential-backoff delay calculator. */
export const calculateDelay = _calculateDelay;
/** Re-export of the SSE URL-builder (appends `artifactId` + cursor params). */
export const buildUrl = _buildUrl;

/**
 * Create an SSE client that manages a Server-Sent Events connection with
 * automatic reconnection, heartbeat timeout tracking, and backpressure-aware
 * message buffering.
 *
 * **Preflight is mandatory and cannot be disabled.** Every incoming message
 * is pre-screened by a fast first-character check before `JSON.parse` is
 * attempted. Non-JSON payloads (plain text, numeric strings, empty strings)
 * are dropped without entering the try/catch path. This defence-in-depth
 * guard is always-on; there is no configuration knob to bypass it.
 * See the red-team regression suite (`tests/regression/`) for the injection
 * scenarios that motivated this constraint.
 *
 * **Resumption is host-wired.** This client handles transport-level
 * reconnection only: exponential backoff plus re-sending the
 * `lastEventId` cursor on the stream URL (via {@link buildUrl}). It does
 * NOT perform gap recovery — replaying missed patches or fetching a
 * fresh snapshot is the host's job, composed from the sibling
 * `Resumption` namespace (see `./resumption.js` and the Runtime Wiring
 * Model in `STATUS.md`, status `host-wired`). The reference wiring
 * lives in `packages/astro/src/runtime/stream.ts`
 * (`saveResumptionState` + `reconcileResumption`).
 *
 * @example
 * ```ts
 * import { SSE } from '@czap/web';
 *
 * const client = SSE.create({ url: '/api/stream', artifactId: 'doc-1' });
 * for await (const msg of client.messages) {
 *   console.log(msg);
 * }
 * client.close();
 * ```
 *
 * @example
 * ```ts
 * // Fully synchronous consumption (the live morph directives): pass callbacks
 * // and skip the async buffer entirely.
 * import { SSE } from '@czap/web';
 *
 * const client = SSE.create({
 *   url: '/api/stream',
 *   artifactId: 'doc-1',
 *   onMessage: (msg) => applyPatch(msg),
 *   onStateChange: (state) => updateBadge(state),
 * });
 * // Teardown owned by the host (e.g. a Lifetime finalizer):
 * // lifetime.add(() => client.close());
 * ```
 *
 * @param config - SSE connection configuration
 * @returns An {@link SSEClient}
 */
export const create = (config: SSEConfig): SSEClient => {
  // Partial overrides merge over the engine defaults so callers can bump
  // one knob without copying the rest of defaultReconnectConfig.
  const reconnectConfig = { ...defaultReconnectConfig, ...config.reconnect };
  const heartbeatInterval = config.heartbeatInterval ?? SSE_HEARTBEAT_MS;
  const maxBufferSize = SSE_BUFFER_SIZE;
  const overflowPolicy: OverflowPolicy = config.overflow ?? defaultOverflowPolicy;

  // All SSE state lives in one plain object. Transitions are synchronous
  // mutations — the public accessors read this object directly.
  //
  // Pending messages live in a plain JS buffer (the sse-pure applyOverflow
  // target) so overflow can coalesce/drop deterministically. A no-replay
  // CellKernel carries one wakeup per ingested message to any parked
  // `messages` iterator; the buffer, not the kernel, is the source of truth.
  const machine: {
    status: SSEState;
    lastEventId: string | null;
    source: SSEEventSource | null;
    reconnectAttempt: number;
    droppedCount: number;
    coalescedCount: number;
    saturated: boolean;
    reconnectHandle: ReturnType<typeof setTimeout> | null;
    heartbeatHandle: ReturnType<typeof setTimeout> | null;
  } = {
    status: 'connecting',
    lastEventId: config.lastEventId ?? null,
    source: null,
    reconnectAttempt: 0,
    droppedCount: 0,
    coalescedCount: 0,
    saturated: false,
    reconnectHandle: null,
    heartbeatHandle: null,
  };

  let pendingMessages: SSEMessage[] = [];
  // No-replay fan-out: ingest publishes one wakeup token per buffered message
  // (a late subscriber does not need prior tokens — it pulls the live buffer).
  const messageWakeup = CellKernel.fanout<void>();
  // No-replay fan-out of status EDGES: setStatus publishes only on an actual
  // change, so a subscriber sees transitions, not a per-message firehose.
  const stateEdges = CellKernel.fanout<SSEState>();

  // Single writer for `machine.status`: mutate, then emit an EDGE only when the
  // value actually changed (so `stateChanges` is a transition stream, not a
  // per-message firehose).
  const setStatus = (next: SSEState): void => {
    if (machine.status === next) {
      return;
    }
    machine.status = next;
    // External state listeners (the `stateChanges` edge fan-out + the synchronous
    // `onStateChange` callback) must NOT abort the transport bookkeeping that TRIGGERED this
    // transition: a throw here during `close()` would strand `lifetime.dispose()` (leaking the
    // live EventSource + timers), and during `handleConnectionLoss()` would abort before the
    // reconnect timer is scheduled (a stranded, permanently-closed source). The status has
    // already committed, so attempt BOTH channels, ISOLATE each fault, and surface it via
    // Diagnostics rather than propagating into the caller — the same "an external listener fault
    // never corrupts transport/kernel bookkeeping" law the reactive kernels follow.
    try {
      stateEdges.publish(next);
    } catch (error) {
      Diagnostics.warnOnce({
        source: 'czap/web.SSE',
        code: 'sse-state-listener-threw',
        message: `An SSE stateChanges subscriber threw on the "${next}" transition; the transport teardown/reconnect bookkeeping is unaffected. Cause: ${String(error)}`,
      });
    }
    // Synchronous edge delivery (callback form of `stateChanges`) for consumers that drive
    // lifecycle within the dispatch turn — isolated the same way.
    try {
      config.onStateChange?.(next);
    } catch (error) {
      Diagnostics.warnOnce({
        source: 'czap/web.SSE',
        code: 'sse-onstatechange-threw',
        message: `The SSE onStateChange callback threw on the "${next}" transition; the transport teardown/reconnect bookkeeping is unaffected. Cause: ${String(error)}`,
      });
    }
  };

  const clearReconnectHandle = (): void => {
    if (machine.reconnectHandle !== null) {
      clearTimeout(machine.reconnectHandle);
      machine.reconnectHandle = null;
    }
  };

  const clearHeartbeat = (): void => {
    if (machine.heartbeatHandle !== null) {
      clearTimeout(machine.heartbeatHandle);
      machine.heartbeatHandle = null;
    }
  };

  // Detach the live source for good: drop its handlers BEFORE close() so a
  // queued event can no longer invoke the synchronous `onMessage`/onerror sink
  // after an intentional teardown or VT reinit — a stale frame must not morph
  // into a newer generation (P2). The internal reconnect path deliberately does
  // NOT use this: it closes and immediately re-opens a fresh source.
  const detachSource = (): void => {
    const src = machine.source;
    if (!src) return;
    src.onmessage = null;
    src.onerror = null;
    src.close();
    machine.source = null;
  };

  /**
   * Shared lost-connection path: close the dead source, then either
   * schedule a backoff reconnect or latch `error` once attempts are
   * exhausted. Driven by BOTH `source.onerror` AND the heartbeat watchdog
   * — `close()` does not synthesize an `onerror`, so a silent heartbeat
   * timeout must funnel through here itself or the stream would wedge in
   * `error` and never reconnect.
   */
  const handleConnectionLoss = (): void => {
    // Cancel any pending reconnect timer first: a duplicate loss signal (an
    // `onerror` racing the heartbeat watchdog, or two `onerror`s) before the
    // timer fires would otherwise overwrite `reconnectHandle` and leave the old
    // timer live, double-opening a source.
    clearReconnectHandle();
    const currentSource = machine.source;
    machine.source = null;
    if (currentSource) {
      // Detach BEFORE close: a frame or error already queued on this dying
      // source must not fire its handler against the NEXT generation. Combined
      // with the per-source identity guard in `setupSource`, a stale callback is
      // inert on both ends.
      currentSource.onmessage = null;
      currentSource.onerror = null;
      currentSource.close();
    }
    clearHeartbeat();
    setStatus('reconnecting');

    const attempt = machine.reconnectAttempt;
    machine.reconnectAttempt = attempt + 1;
    if (attempt < reconnectConfig.maxAttempts) {
      const delay = calculateDelay(attempt, reconnectConfig);
      machine.reconnectHandle = setTimeout(setupSource, delay);
    } else {
      setStatus('error');
    }
  };

  const resetHeartbeat = (): void => {
    clearHeartbeat();
    machine.heartbeatHandle = setTimeout(() => {
      // A missed heartbeat means the connection is dead but the browser
      // never fired `onerror`. Funnel through the SAME reconnect path so
      // the watchdog actually recovers the stream.
      handleConnectionLoss();
    }, heartbeatInterval * 2);
  };

  const setupSource = (): void => {
    const url = buildUrl(config.url, config.artifactId, machine.lastEventId ?? undefined);
    const source: SSEEventSource = new EventSource(url);
    machine.source = source;
    resetHeartbeat();

    source.onmessage = (event: MessageEvent) => {
      // Identity guard: a frame queued on a source that has since been replaced
      // (reconnect / manual `reconnect()`) or closed (teardown) must not
      // resurrect a dead generation — advance the cursor, flip status to
      // `connected`, reset the backoff, or morph a stale frame into the live
      // stream. Guard on source IDENTITY, not liveness.
      if (machine.source !== source) return;
      const message = parseMessage(event);
      if (message) {
        if (event.lastEventId) {
          machine.lastEventId = event.lastEventId;
        }

        setStatus('connected');
        machine.reconnectAttempt = 0;

        ingest(message);
        resetHeartbeat();
      }
    };

    source.onerror = () => {
      // A stale error from an already-replaced source would otherwise drive
      // `handleConnectionLoss` (which reads the CURRENT `machine.source`) and
      // tear down the HEALTHY replacement, scheduling a spurious reconnect.
      // Ignore errors that are not from the live generation.
      if (machine.source !== source) return;
      handleConnectionLoss();
    };
  };

  /**
   * Fold an incoming message into the pending buffer under the overflow
   * policy, then publish a single wakeup so a parked `messages` iterator can
   * drain it. The buffer — not the wakeup kernel — is the source of truth:
   * a message stays buffered (visible to `backpressure`) until consumed.
   */
  const ingest = (message: SSEMessage): void => {
    if (config.onMessage) {
      // Synchronous consumer: deliver in-turn and skip the async buffer entirely.
      // A synchronous consumer holds no buffer, so there is nothing to overflow;
      // `parseMessage` already gated this message upstream. ISOLATE the listener fault
      // (the same law as setStatus/onStateChange): a throwing onMessage must NOT abort
      // the caller's post-message bookkeeping — the `onmessage` handler still has to run
      // `resetHeartbeat()`, else the watchdog stays armed on a healthy stream and
      // eventually forces a spurious close+reconnect. Surface via Diagnostics.
      try {
        config.onMessage(message);
      } catch (error) {
        Diagnostics.warnOnce({
          source: 'czap/web.SSE',
          code: 'sse-onmessage-threw',
          message: `The SSE onMessage callback threw for a live message; the transport heartbeat/reconnect bookkeeping is unaffected. Cause: ${String(error)}`,
        });
      }
      return;
    }
    const result = applyOverflow(pendingMessages, message, overflowPolicy, maxBufferSize);
    pendingMessages = result.buffer;

    machine.droppedCount += result.dropped;
    machine.coalescedCount += result.coalesced;

    if (result.saturated && !machine.saturated) {
      // First saturation only (latched + warnOnce-deduped): the buffer is
      // overflowing and the policy is now actively shedding load.
      machine.saturated = true;
      Diagnostics.warnOnce({
        source: 'czap/web.sse',
        code: 'sse-buffer-saturated',
        message: 'SSE receive buffer saturated; applying overflow policy.',
        detail: { policy: overflowPolicy, maxBufferSize, bufferSize: pendingMessages.length },
      });
    }

    // Wake exactly one parked consumer per buffered message; if nobody is
    // parked the message simply waits in the buffer for the next `next()`.
    messageWakeup.publish();
  };

  // `messages` drains the SHARED overflow buffer (so backpressure sees the
  // drop) — it cannot use a per-iterator buffer. Each iterator subscribes to
  // the wakeup kernel and pulls from `pendingMessages`; a value ready before
  // the iterator parks is returned immediately by the pull-first check.
  const messages: AsyncIterable<SSEMessage> = {
    [Symbol.asyncIterator](): AsyncIterator<SSEMessage, undefined> {
      // A FIFO QUEUE of parked reads, not a single slot: concurrent `next()` calls
      // (prefetch, `Promise.all`) are valid on an AsyncIterator, and a single `waiter`
      // would let the second call overwrite the first, orphaning its promise forever.
      const waiters: Array<(result: IteratorResult<SSEMessage, undefined>) => void> = [];
      let completed = false;
      const drain = (): void => {
        while (waiters.length > 0 && pendingMessages.length > 0) {
          waiters.shift()!({ value: pendingMessages.shift()!, done: false });
        }
        if (completed) {
          while (waiters.length > 0) waiters.shift()!({ value: undefined, done: true });
        }
      };
      const disposer = messageWakeup.subscribe({
        next: () => drain(),
        complete: () => {
          completed = true;
          drain();
        },
      });
      return {
        next(): Promise<IteratorResult<SSEMessage, undefined>> {
          if (pendingMessages.length > 0) {
            return Promise.resolve({ value: pendingMessages.shift()!, done: false });
          }
          if (completed) {
            disposer();
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise((resolve) => {
            waiters.push(resolve);
          });
        },
        return(): Promise<IteratorResult<SSEMessage, undefined>> {
          // Settle EVERY parked `next()` before disposing: after `disposer()` the
          // `complete` callback can never fire, so any in-flight read would hang
          // forever. Mark completed + resolve all waiters with `done` so cancellation
          // code awaiting an outstanding read unblocks.
          completed = true;
          while (waiters.length > 0) waiters.shift()!({ value: undefined, done: true });
          disposer();
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };

  // `stateChanges` buffers edges per-iterator (each subscriber sees every edge
  // from its subscription onward — control-plane, never dropped).
  const stateChanges: AsyncIterable<SSEState> = {
    [Symbol.asyncIterator](): AsyncIterator<SSEState, undefined> {
      const buffer: SSEState[] = [];
      // FIFO queue of parked reads (see the `messages` iterator): concurrent `next()`
      // must each get their own slot, never overwrite a single waiter.
      const waiters: Array<(result: IteratorResult<SSEState, undefined>) => void> = [];
      let completed = false;
      const deliver = (): void => {
        while (waiters.length > 0 && buffer.length > 0) {
          waiters.shift()!({ value: buffer.shift()!, done: false });
        }
        if (completed) {
          while (waiters.length > 0) waiters.shift()!({ value: undefined, done: true });
        }
      };
      const disposer = stateEdges.subscribe({
        next: (edge) => {
          buffer.push(edge);
          deliver();
        },
        complete: () => {
          completed = true;
          deliver();
        },
      });
      return {
        next(): Promise<IteratorResult<SSEState, undefined>> {
          if (buffer.length > 0) {
            return Promise.resolve({ value: buffer.shift()!, done: false });
          }
          if (completed) {
            disposer();
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise((resolve) => {
            waiters.push(resolve);
          });
        },
        return(): Promise<IteratorResult<SSEState, undefined>> {
          // Same settle-before-dispose fix as the `messages` iterator: every parked
          // `next()` would otherwise never resolve once `disposer()` detaches.
          completed = true;
          while (waiters.length > 0) waiters.shift()!({ value: undefined, done: true });
          disposer();
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };

  // One Lifetime owns the teardown finalizer (replacing the former Scope). Its
  // sync body runs synchronously inside `dispose()`, so `close()` tears the
  // transport down in one pass — a straggler frame from a dead generation
  // cannot morph the fresh one on reinit.
  const lifetime = Lifetime.make();
  lifetime.add(() => {
    clearReconnectHandle();
    clearHeartbeat();
    detachSource();
    pendingMessages = [];
    messageWakeup.close();
    stateEdges.close();
  });

  const client: SSEClient = {
    messages,
    stateChanges,

    get state() {
      return machine.status;
    },

    get lastEventId() {
      return machine.lastEventId;
    },

    get backpressure(): BackpressureHint {
      const bufferSize = pendingMessages.length;
      const percentFull = Math.round((bufferSize / maxBufferSize) * 100);
      return {
        bufferSize,
        maxBufferSize,
        percentFull,
        dropping: bufferSize >= maxBufferSize,
        policy: overflowPolicy,
        droppedCount: machine.droppedCount,
        coalescedCount: machine.coalescedCount,
      };
    },

    close: () => {
      if (lifetime.disposed) {
        return;
      }
      // `close()` is an intentional teardown — land in `disconnected` regardless
      // of whether a live source was present (e.g. the heartbeat watchdog may
      // have already cleared it). Publish the edge BEFORE disposing so a
      // `stateChanges` subscriber sees the final transition, then complete.
      setStatus('disconnected');
      // Sync finalizer lands synchronously inside dispose(); teardown is
      // fire-and-forget (there is no async finalizer), so the promise is dropped.
      void lifetime.dispose();
    },

    reconnect: () => {
      if (lifetime.disposed) {
        return;
      }
      clearReconnectHandle();
      clearHeartbeat();
      const currentSource = machine.source;
      if (currentSource) {
        currentSource.close();
        machine.source = null;
      }
      machine.reconnectAttempt = 0;
      setStatus('connecting');
      setupSource();
    },
  };

  // Open the initial connection synchronously (AbortController-first: no runtime
  // to run, no Scope to provide).
  setupSource();

  return client;
};

/**
 * SSE client namespace.
 *
 * Creates and manages Server-Sent Events connections with automatic
 * exponential-backoff reconnection, heartbeat timeout detection,
 * backpressure-aware message buffering via the sse-pure overflow buffer,
 * and URL construction helpers.
 *
 * **Resumption is host-wired.** `SSE` is the transport; the sibling
 * `Resumption` namespace (`./resumption.js`) is the recovery protocol
 * (replay / snapshot after a gap). Hosts compose the two — see the
 * composed example on {@link create} and the reference wiring in
 * `packages/astro/src/runtime/stream.ts`.
 *
 * @example
 * ```ts
 * import { SSE } from '@czap/web';
 *
 * const client = SSE.create({ url: '/api/events' });
 * const state = client.state; // 'connecting' | 'connected' | ...
 * for await (const msg of client.messages) {
 *   console.log(msg.type);
 * }
 * client.close();
 * ```
 */
export const SSE = {
  create,
  parseMessage,
  calculateDelay,
  buildUrl,
} as const;
