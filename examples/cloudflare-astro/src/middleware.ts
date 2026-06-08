import { cloudflareMiddleware } from '@czap/cloudflare';

const BOUNDARY_ID = 'fnv1a:cloudflare-example';

export const onRequest = cloudflareMiddleware({
  binding: 'CZAP_BOUNDARY_CACHE',
  boundaryId: BOUNDARY_ID,
  compile: async () => ({
    css: '/* cloudflare example boundary */',
    propertyRegistrations: '',
    containerQueries: '',
  }),
});
