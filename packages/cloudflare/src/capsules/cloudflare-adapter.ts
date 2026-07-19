/**
 * Capsule declaration for `@liteship/cloudflare` — the second `siteAdapter`
 * instance (Cloudflare Workers KV boundary cache).
 *
 * @module
 */

import { defineCapsule, S } from '@liteship/core';

const ClientHintsInputSchema = S.record(S.string);

const BoundaryResolutionSchema = S.struct({
  cacheStatus: S.union(S.literal('disabled'), S.literal('precompiled'), S.literal('hit'), S.literal('miss')),
  htmlAttributes: S.string,
});

/**
 * Declared capsule for `@liteship/cloudflare`. Registered in the module-level
 * catalog at import time; walked by the factory compiler.
 */
export const cloudflareAdapterCapsule = defineCapsule({
  _kind: 'siteAdapter',
  name: 'cloudflare.workers-kv-boundary',
  input: ClientHintsInputSchema,
  output: BoundaryResolutionSchema,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'cache-status-valid',
      check: (_i, o) => {
        return (
          o.cacheStatus === 'disabled' ||
          o.cacheStatus === 'precompiled' ||
          o.cacheStatus === 'hit' ||
          o.cacheStatus === 'miss'
        );
      },
      message:
        "cloudflare.workers-kv-boundary returned an unexpected cacheStatus — expected 'disabled' | 'precompiled' | 'hit' | 'miss'. " +
        'This means the resolution object was constructed outside createEdgeHostAdapter. ' +
        'Fix: return resolution.cacheStatus from EdgeHostAdapter.resolve unchanged.',
    },
  ],
  budgets: { p95Ms: 12 },
  site: ['edge', 'worker'],
  attribution: {
    license: 'MIT',
    author: 'LiteShip (@liteship/cloudflare)',
    url: 'https://github.com/freebatteryfactory/LiteShip/tree/main/packages/cloudflare',
  },
});
