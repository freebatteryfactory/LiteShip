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
import { GraphPatch, type PatchOp } from './graph-patch.js';
import { sendGraphMutation, type GraphMutationResponse } from './graph-mutation.js';

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
   * LiteShip does not dictate the read endpoint's shape — the host owns it (ADR-0015).
   */
  readonly refreshBase?: () => Promise<DocumentGraph>;
  /** Bounded stale-base retries. Default: 1 when `refreshBase` is provided, else 0. */
  readonly maxStaleRetries?: number;
}

export type GraphMutationOps = readonly PatchOp[] | ((base: DocumentGraph) => readonly PatchOp[]);

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

export function createGraphMutationClient(options: GraphMutationClientOptions): GraphMutationClient {
  let currentBase = options.base;
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

      const response = await sendGraphMutation(options.url, patch, fetchImpl);
      if (response.status === 'applied') {
        currentBase = response.graph;
        return response;
      }
      if (response.status === 'refused' && response.staleBase === true && options.refreshBase && retries < maxStaleRetries) {
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
