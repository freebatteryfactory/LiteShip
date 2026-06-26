import type { Fetchable } from 'astro';
import { FetchState, astro } from 'astro/fetch';
import { czapFetchLayer } from '@czap/astro/fetch-layer';

const czap = czapFetchLayer();

export default {
  fetch: (request: Request) => czap(request, (req) => astro(new FetchState(req))),
} satisfies Fetchable;
