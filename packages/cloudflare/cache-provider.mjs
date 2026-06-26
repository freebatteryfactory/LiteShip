import { createCloudflareCacheProvider } from './dist/cache-provider.js';

export * from './dist/cache-provider.js';

function cloudflareCacheProviderFactory(config) {
  return createCloudflareCacheProvider(config ?? {});
}

export { cloudflareCacheProviderFactory as default };
