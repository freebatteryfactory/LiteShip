import { describe, it, expect } from 'vitest';
import { cloudflareAdapterCapsule } from '@czap/cloudflare';

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

  it('cache-status-valid invariant accepts known statuses', () => {
    const inv = cloudflareAdapterCapsule.invariants.find((i) => i.name === 'cache-status-valid');
    expect(inv).toBeDefined();
    for (const status of ['disabled', 'hit', 'miss'] as const) {
      expect(inv!.check(undefined, { cacheStatus: status, htmlAttributes: '' })).toBe(true);
    }
    expect(inv!.check(undefined, { cacheStatus: 'bogus', htmlAttributes: '' })).toBe(false);
  });
});
