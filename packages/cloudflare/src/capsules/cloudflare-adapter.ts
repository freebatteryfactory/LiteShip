/**
 * Capsule declaration for `@czap/cloudflare` — the second `siteAdapter`
 * instance (Cloudflare Workers KV boundary cache).
 *
 * @module
 */

import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';

const ClientHintsInputSchema = Schema.Record(Schema.String, Schema.String);

const BoundaryResolutionSchema = Schema.Struct({
  cacheStatus: Schema.Union([
    Schema.Literal('disabled'),
    Schema.Literal('precompiled'),
    Schema.Literal('hit'),
    Schema.Literal('miss'),
  ]),
  htmlAttributes: Schema.String,
});

/**
 * Declared capsule for `@czap/cloudflare`. Registered in the module-level
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
        const out = o as { cacheStatus?: string };
        return (
          out.cacheStatus === 'disabled' ||
          out.cacheStatus === 'precompiled' ||
          out.cacheStatus === 'hit' ||
          out.cacheStatus === 'miss'
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
    author: 'LiteShip (@czap/cloudflare)',
    url: 'https://github.com/heyoub/LiteShip/tree/main/packages/cloudflare',
  },
});
