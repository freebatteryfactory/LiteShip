import { describe, it, expect } from 'vitest';
import { cloudflareAdapterCapsule } from '@liteship/cloudflare';

describe('cloudflareAdapterCapsule', () => {
  it('declares a siteAdapter for Cloudflare Workers KV boundary cache', () => {
    expect(cloudflareAdapterCapsule._kind).toBe('siteAdapter');
    expect(cloudflareAdapterCapsule.name).toBe('cloudflare.workers-kv-boundary');
  });

  it('declares edge + worker sites', () => {
    expect(cloudflareAdapterCapsule.site).toEqual(['edge', 'worker']);
  });

  it('records MIT attribution', () => {
    expect(cloudflareAdapterCapsule.attribution?.license).toBe('MIT');
  });

  it('cache-status-valid invariant message names the capsule, the valid statuses, and the fix', () => {
    // Pin the teaching LAW, not the exact prose: the Layer-4 message must name the
    // capsule, enumerate every accepted cacheStatus, and point at the construction
    // site (createEdgeHostAdapter / EdgeHostAdapter.resolve) so a wrong-status failure
    // tells the reader where the resolution object was wrongly built.
    const inv = cloudflareAdapterCapsule.invariants.find((i) => i.name === 'cache-status-valid');
    expect(inv?.message).toContain('cloudflare.workers-kv-boundary');
    for (const status of ['disabled', 'precompiled', 'hit', 'miss'] as const) {
      expect(inv?.message).toContain(status);
    }
    expect(inv?.message).toContain('createEdgeHostAdapter');
    expect(inv?.message).toContain('EdgeHostAdapter.resolve');
  });

  it('cache-status-valid invariant accepts known statuses', () => {
    const inv = cloudflareAdapterCapsule.invariants.find((i) => i.name === 'cache-status-valid');
    expect(inv).toBeDefined();
    for (const status of ['disabled', 'precompiled', 'hit', 'miss'] as const) {
      expect(inv!.check(undefined, { cacheStatus: status, htmlAttributes: '' })).toBe(true);
    }
    expect(inv!.check(undefined, { cacheStatus: 'bogus', htmlAttributes: '' })).toBe(false);
  });
});
