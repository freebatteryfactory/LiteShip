import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { integration } from '@liteship/astro';

export default defineConfig({
  // Server-rendered: the graph store + the /api/graph endpoint live on the server.
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [integration()],
});
