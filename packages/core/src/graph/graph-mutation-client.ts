/**
 * Client-side state for the graph-mutation channel.
 *
 * `sendGraphMutation` is the wire primitive; this module absorbs the repeated
 * client boilerplate around it: track the current base, propose ops against it,
 * serialize submits, refresh on structured stale-base refusals, and adopt the
 * applied graph the channel already verified. Server authority is unchanged:
 * nothing here can skip `handleGraphMutation`'s validation or the host store's
 * compare-and-swap.
 *
 * @module
 */

import type { DocumentGraph } from './document-graph.js';
import { runWithExchangeDeadline, resolveExchangeTimeoutMs } from './exchange-deadline.js';
import { GraphPatch, type PatchOp } from './graph-patch.js';
import { sendGraphMutation, type GraphMutationResponse } from './graph-mutation.js';

/**
 * Conservative client-side ceiling for one mutation request. This is an
 * explicit finite safety default, not a measurement-derived performance claim.
 */
export const GRAPH_MUTATION_DEFAULT_TIMEOUT_MS = 30_000;

/** Configuration for {@link createGraphMutationClient} — endpoint, initial base, and stale-recovery policy. */
export interface GraphMutationClientOptions {
  /** The mutation endpoint `sendGraphMutation` POSTs to. */
  readonly url: string;
  /** The initial client-side base graph (e.g. decoded from an initial GET or inlined SSR data). */
  readonly base: DocumentGraph;
  /** Injectable fetch for tests / non-browser hosts. Defaults to global fetch. */
  readonly fetchImpl?: typeof fetch;
  /**
   * Host-owned base reloader (e.g. GET the host's graph endpoint and decode). When present,
   * a `staleBase` refusal triggers reload + re-propose up to `maxStaleRetries` times.
   * LiteShip does not dictate the read endpoint's shape — the host owns it.
   */
  readonly refreshBase?: () => Promise<DocumentGraph>;
  /** Bounded stale-base retries. Default: 1 when `refreshBase` is provided, else 0. */
  readonly maxStaleRetries?: number;
  /**
   * Abort a submit's request after this many milliseconds, settling it to the channel's
   * `{ status: 'error' }` shape. A finite non-negative value overrides
   * {@link GRAPH_MUTATION_DEFAULT_TIMEOUT_MS}; `undefined`, non-finite, and negative
   * values use that finite default. An unbounded request is deliberately not expressible:
   * it would hold every later submit in this client's serialized queue.
   */
  readonly timeoutMs?: number;
}

/**
 * Run one submit under a deadline that covers the WHOLE round trip — response
 * headers AND the body read that follows them.
 *
 * The deadline used to wrap `fetch` alone, so `sendGraphMutation`'s
 * `await response.json()` ran with no deadline at all and a wedged body held every
 * later submit in this client's serialized queue — exactly the unbounded request
 * {@link GraphMutationClientOptions.timeoutMs} documents as not expressible. The
 * abort/race primitive that cures it now lives in `exchange-deadline.ts` and is
 * shared with the read leg; see that module for why both halves are needed.
 */
const sendWithDeadline = (
  url: string,
  patch: GraphPatch,
  impl: typeof fetch,
  timeoutMs: number,
): Promise<GraphMutationResponse> =>
  runWithExchangeDeadline(timeoutMs, `mutation request timed out after ${timeoutMs}ms`, (signal) =>
    sendGraphMutation(url, patch, (input, init) => impl(input, { ...init, signal })),
  );

/**
 * The ops a submit proposes: a fixed op array, or a builder invoked with the CURRENT base —
 * the builder form re-derives ops after a stale-base refresh, so retried proposals never
 * carry nodes computed against a graph the server has already moved past.
 */
export type GraphMutationOps = readonly PatchOp[] | ((base: DocumentGraph) => readonly PatchOp[]);

/**
 * The client-side half of the mutation channel: a base-tracking state machine over
 * `sendGraphMutation`. Submits are strictly serialized (no self-inflicted CAS races),
 * an `applied` response advances the base, and a `staleBase` refusal reloads +
 * re-proposes within the configured bound.
 */
export interface GraphMutationClient {
  /** The current client-side base (advances on every applied submit / adopt). */
  readonly base: () => DocumentGraph;
  /**
   * Adopt an externally-obtained graph as the new base (e.g. from an SSE snapshot/patch stream).
   * If a submit is already in flight, that submit keeps the base it already captured; whichever
   * adopt/applied result writes last is the current base.
   */
  readonly adopt: (next: DocumentGraph) => void;
  /**
   * Propose ops against the current base, send, and settle to the channel's one-shape
   * response. NEVER rejects — every failure (ops builder throw, propose throw, transport,
   * refreshBase throw) maps to `{ status: 'error' }`, mirroring the channel contract.
   */
  readonly submit: (ops: GraphMutationOps) => Promise<GraphMutationResponse>;
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Build a {@link GraphMutationClient}. The returned client never rejects: every failure —
 * ops-builder throw, propose throw, transport error, `refreshBase` throw — settles to the
 * channel's `{ status: 'error' }` shape, mirroring `sendGraphMutation`'s one-shape contract.
 */
export function createGraphMutationClient(options: GraphMutationClientOptions): GraphMutationClient {
  let currentBase = options.base;
  const timeoutMs = resolveExchangeTimeoutMs(options.timeoutMs, GRAPH_MUTATION_DEFAULT_TIMEOUT_MS);
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxStaleRetries = options.maxStaleRetries ?? (options.refreshBase ? 1 : 0);
  let queue: Promise<void> = Promise.resolve();

  const runSubmit = async (ops: GraphMutationOps): Promise<GraphMutationResponse> => {
    let retries = 0;
    for (;;) {
      const base = currentBase;
      let nextOps: readonly PatchOp[];
      try {
        nextOps = typeof ops === 'function' ? ops(base) : ops;
      } catch (error) {
        return { status: 'error', message: `ops builder threw: ${messageOf(error)}` };
      }

      let patch: GraphPatch;
      try {
        patch = GraphPatch.propose(base, nextOps);
      } catch (error) {
        return { status: 'error', message: `propose failed: ${messageOf(error)}` };
      }

      const response = await sendWithDeadline(options.url, patch, fetchImpl, timeoutMs);
      if (response.status === 'applied') {
        currentBase = response.graph;
        return response;
      }
      if (
        response.status === 'refused' &&
        response.staleBase === true &&
        options.refreshBase &&
        retries < maxStaleRetries
      ) {
        retries += 1;
        try {
          currentBase = await options.refreshBase();
        } catch (error) {
          return { status: 'error', message: `refreshBase failed: ${messageOf(error)}` };
        }
        continue;
      }
      return response;
    }
  };

  const submit = (ops: GraphMutationOps): Promise<GraphMutationResponse> => {
    const run = queue.then(() => runSubmit(ops));
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run.catch((error) => ({ status: 'error', message: `submit failed: ${messageOf(error)}` }));
  };

  return {
    base: () => currentBase,
    adopt: (next) => {
      currentBase = next;
    },
    submit,
  };
}
