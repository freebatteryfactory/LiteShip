// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { Boundary } from '../../packages/core/src/boundary.js';
import { createEdgeHostAdapter } from '../../packages/edge/src/host-adapter.js';

const boundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

const adapter = createEdgeHostAdapter({
  cache: {
    boundaryId: boundary.id,
    precompiled: {
      core: { css: '.hero { color: red; }', states: { mobile: {}, tablet: {}, desktop: {} } },
    },
  },
});

const headers = { 'sec-ch-viewport-width': '800' };

bench(`cloudflare.workers-kv-boundary — EdgeHostAdapter.resolve round trip`, async () => {
  await adapter.resolve(headers);
}, { time: 500 });
