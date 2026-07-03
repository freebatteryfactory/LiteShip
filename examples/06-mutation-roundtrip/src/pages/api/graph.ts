/**
 * The client→server graph-mutation endpoint.
 *
 *   GET  → the current server graph (so the client has a base to propose against).
 *   POST → validate + apply a client-proposed GraphPatch (the channel).
 *
 * `graphMutationRoute(store)` is the whole server side — it wraps @czap/core's
 * `handleGraphMutation`. The host owns `store`; LiteShip owns the validate/apply gate.
 */
import type { APIRoute } from 'astro';
import { graphMutationRoute } from '@czap/astro';
import { store, currentGraph } from '../../server/graph-store';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(currentGraph()), { headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = ({ request }) => graphMutationRoute(store)(request);
