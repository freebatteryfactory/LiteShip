/**
 * The client→server graph endpoint.
 *
 *   QUERY (POST+X-Czap-Query fallback) → conditional read via `graphQueryRoute`
 *   POST → validate + apply a client-proposed GraphPatch (`graphMutationRoute`)
 */
import type { APIRoute } from 'astro';
import { graphMutationRoute, graphQueryRoute } from '@czap/astro';
import { store, currentGraph } from '../../server/graph-store';

export const prerender = false;

const readStore = { loadGraph: () => currentGraph() };

export const QUERY: APIRoute = ({ request }) => graphQueryRoute(readStore)(request);

export const POST: APIRoute = ({ request }) => {
  if (request.headers.get('X-Czap-Query') === '1') {
    return graphQueryRoute(readStore)(request);
  }
  return graphMutationRoute(store)(request);
};
