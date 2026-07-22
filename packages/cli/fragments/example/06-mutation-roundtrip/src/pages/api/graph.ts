/**
 * The client→server graph endpoint.
 *
 *   QUERY (POST+X-Liteship-Query fallback) → conditional read via `graphQueryRoute`
 *   POST → validate + apply a client-proposed GraphPatch (`graphMutationRoute`)
 */
import type { APIRoute } from 'astro';
import { graphMutationRoute, graphQueryRoute } from '@liteship/astro';
import { store, currentGraph } from '../../server/graph-store';

export const prerender = false;

const readStore = { loadGraph: () => currentGraph() };

export const QUERY: APIRoute = ({ request }) => graphQueryRoute(readStore)(request);

export const POST: APIRoute = ({ request }) => {
  if (request.headers.get('X-Liteship-Query') === '1') {
    return graphQueryRoute(readStore)(request);
  }
  return graphMutationRoute(store)(request);
};
