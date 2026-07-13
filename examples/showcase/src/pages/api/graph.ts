/**
 * The QUERY read leg for graph-native stream recovery (#133-full).
 *
 * Recovery QUERYs this endpoint (conditional on the client's cached etag), and on
 * a hit re-adopts the returned graph as the new base before replaying buffered
 * discrete crossings. `graphQueryRoute` serves `QUERY` (and the `POST` +
 * `X-Czap-Query` fallback) and only ever reads — the `Pick<GraphStore, 'loadGraph'>`
 * injection proves the read leg cannot persist.
 */
import type { APIRoute } from 'astro';
import { graphQueryRoute } from '@czap/astro';
import { CURRENT_GRAPH } from '../../server/stream-graph';

export const prerender = false;

const readStore = { loadGraph: () => CURRENT_GRAPH };

export const QUERY: APIRoute = ({ request }) => graphQueryRoute(readStore)(request);

export const POST: APIRoute = ({ request }) => graphQueryRoute(readStore)(request);
