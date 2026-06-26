import { createCloudflareCacheProvider } from './src/cache-provider.ts';

export * from './src/cache-provider.ts';

function cloudflareCacheProviderFactory(config) {
  return createCloudflareCacheProvider(config ?? {});
}

export { cloudflareCacheProviderFactory as default };
