import type { Fetchable } from 'astro';
import { FetchState, astro } from 'astro/fetch';
import { liteshipFetchLayer } from '@liteship/astro/fetch-layer';

const liteship = liteshipFetchLayer();

export default {
  fetch: (request: Request) => liteship(request, (req) => astro(new FetchState(req))),
} satisfies Fetchable;
