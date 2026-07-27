/**
 * Model and fault properties for the public Cloudflare → edge cache boundary.
 *
 * Cloudflare Cache API is an optional L1 projection. Workers KV remains the
 * authority consumed by @liteship/edge's content-addressed cache. These laws
 * pin deterministic bytes and identity, strict foreign-entry admission, and
 * which injected host faults degrade versus propagate.
 */

import { afterEach, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { Diagnostics, type ContentAddress } from '@liteship/core';
import {
  createBoundaryCache,
  DESIGN_TIERS,
  MOTION_TIERS,
  type CompiledOutputs,
  type EdgeTierResult,
  type KVNamespace,
} from '@liteship/edge';
import { createCloudflareEdgeCache, resolveKvBinding } from '@liteship/cloudflare';

interface RecordingKV extends KVNamespace {
  readonly store: Map<string, string>;
  readonly gets: string[];
  readonly puts: Array<readonly [string, string]>;
}

function recordingKV(): RecordingKV {
  const store = new Map<string, string>();
  const gets: string[] = [];
  const puts: Array<readonly [string, string]> = [];
  return {
    store,
    gets,
    puts,
    async get(key) {
      gets.push(key);
      return store.get(key) ?? null;
    },
    async put(key, value) {
      puts.push([key, value]);
      store.set(key, value);
    },
  };
}

const boundaryIdArb = fc
  .array(fc.constantFrom(...'0123456789abcdef'), { minLength: 8, maxLength: 8 })
  .map((parts) => `fnv1a:${parts.join('')}` as ContentAddress);
const safeIdentityArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/);
const tierArb: fc.Arbitrary<EdgeTierResult> = fc.record({
  capTier: fc.constantFrom(
    'static' as const,
    'styled' as const,
    'reactive' as const,
    'animated' as const,
    'gpu' as const,
  ),
  motionTier: fc.constantFrom(...MOTION_TIERS),
  designTier: fc.constantFrom(...DESIGN_TIERS),
});

const mapEntriesArb = fc.uniqueArray(fc.tuple(safeIdentityArb, fc.integer({ min: -10_000, max: 10_000 })), {
  minLength: 1,
  maxLength: 8,
  selector: ([key]) => key,
});

function recordFrom<T>(entries: readonly (readonly [string, T])[]): Record<string, T> {
  return Object.fromEntries(entries);
}

function outputsFrom(entries: readonly (readonly [string, number])[], reverse: boolean): CompiledOutputs {
  const ordered = reverse ? [...entries].reverse() : [...entries];
  const numeric = recordFrom(ordered);
  const text = recordFrom(ordered.map(([key, value]) => [key, String(value)] as const));
  return {
    css: '.edge{display:block}',
    propertyRegistrations: '@property --edge {}',
    containerQueries: '@container edge (width >= 1px) {}',
    aria: { ready: text },
    glsl: {
      declarations: 'uniform float u_edge;',
      uniformValues: numeric,
      stateUniforms: { ready: numeric },
    },
    wgsl: {
      declarations: 'struct Edge { value: f32 }',
      bindingValues: numeric,
      stateBindings: { ready: numeric },
    },
  };
}

afterEach(() => {
  Diagnostics.reset();
});

describe('edge cache deterministic projection and identity', () => {
  test('semantically identical record permutations serialize to identical cache bytes', async () => {
    await fc.assert(
      fc.asyncProperty(boundaryIdArb, tierArb, mapEntriesArb, async (boundaryId, tier, entries) => {
        const leftKV = recordingKV();
        const rightKV = recordingKV();
        await createBoundaryCache(leftKV).putCompiledOutputs(boundaryId, tier, outputsFrom(entries, false));
        await createBoundaryCache(rightKV).putCompiledOutputs(boundaryId, tier, outputsFrom(entries, true));

        expect(leftKV.puts).toHaveLength(1);
        expect(rightKV.puts).toHaveLength(1);
        expect(leftKV.puts[0]).toEqual(rightKV.puts[0]);

        const roundTrip = await createBoundaryCache(leftKV).getCompiledOutputs(boundaryId, tier);
        expect(roundTrip).toEqual(outputsFrom(entries, false));
      }),
      { seed: 0x5eed_1721, numRuns: 200 },
    );
  });

  test('cache identity is exactly prefix + boundary + qualifier + motion/design + theme', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeIdentityArb,
        boundaryIdArb,
        tierArb,
        safeIdentityArb,
        safeIdentityArb,
        async (prefix, boundaryId, tier, qualifier, theme) => {
          const kv = recordingKV();
          const cache = createBoundaryCache(kv, { prefix });
          await cache.getCompiledOutputs(boundaryId, tier, qualifier, theme);
          await cache.getCompiledOutputs(boundaryId, { ...tier, capTier: 'static' }, qualifier, theme);

          const expected = `${prefix}:boundary:${boundaryId}:${qualifier}:${tier.motionTier}:${tier.designTier}:t:${theme}`;
          expect(kv.gets).toEqual([expected, expected]);
        },
      ),
      { seed: 0x5eed_1722, numRuns: 200 },
    );
  });

  test('changing any authority-bearing key field changes the key', async () => {
    await fc.assert(
      fc.asyncProperty(
        boundaryIdArb,
        tierArb,
        safeIdentityArb,
        safeIdentityArb,
        async (boundaryId, tier, name, theme) => {
          const kv = recordingKV();
          const cache = createBoundaryCache(kv, { prefix: 'deploy-a' });
          await cache.getCompiledOutputs(boundaryId, tier, name, theme);
          const otherBoundaryId = `${boundaryId.slice(0, -1)}${boundaryId.endsWith('0') ? '1' : '0'}` as ContentAddress;
          await cache.getCompiledOutputs(otherBoundaryId, tier, name, theme);
          await cache.getCompiledOutputs(boundaryId, tier, `${name}-other`, theme);
          await cache.getCompiledOutputs(boundaryId, tier, name, `${theme}-other`);
          const otherMotion = MOTION_TIERS[(MOTION_TIERS.indexOf(tier.motionTier) + 1) % MOTION_TIERS.length]!;
          await cache.getCompiledOutputs(boundaryId, { ...tier, motionTier: otherMotion }, name, theme);
          const keys = new Set(kv.gets);
          expect(keys.size).toBe(5);
        },
      ),
      { seed: 0x5eed_1723, numRuns: 200 },
    );
  });
});

describe('edge cache foreign-entry refusal', () => {
  test('a non-string required field refuses the whole entry instead of coercing CSS', async () => {
    await fc.assert(
      fc.asyncProperty(
        boundaryIdArb,
        tierArb,
        fc.constantFrom('css' as const, 'propertyRegistrations' as const, 'containerQueries' as const),
        fc.jsonValue().filter((value) => typeof value !== 'string'),
        async (boundaryId, tier, field, foreignValue) => {
          const kv = recordingKV();
          const cache = createBoundaryCache(kv);
          await cache.getCompiledOutputs(boundaryId, tier);
          const key = kv.gets[0]!;
          kv.store.set(
            key,
            JSON.stringify({ css: '.ok{}', propertyRegistrations: '', containerQueries: '', [field]: foreignValue }),
          );

          expect(await cache.getCompiledOutputs(boundaryId, tier)).toBeNull();
        },
      ),
      { seed: 0x5eed_1724, numRuns: 200 },
    );
  });

  test('malformed optional ARIA is omitted while the valid base entry survives', async () => {
    await fc.assert(
      fc.asyncProperty(
        boundaryIdArb,
        tierArb,
        fc.oneof(fc.integer(), fc.array(fc.string()), fc.record({ ready: fc.record({ role: fc.integer() }) })),
        async (boundaryId, tier, malformedAria) => {
          const kv = recordingKV();
          const cache = createBoundaryCache(kv);
          await cache.getCompiledOutputs(boundaryId, tier);
          kv.store.set(
            kv.gets[0]!,
            JSON.stringify({ css: '.ok{}', propertyRegistrations: '', containerQueries: '', aria: malformedAria }),
          );

          const result = await cache.getCompiledOutputs(boundaryId, tier);
          expect(result).toEqual({ css: '.ok{}', propertyRegistrations: '', containerQueries: '' });
        },
      ),
      { seed: 0x5eed_1725, numRuns: 150 },
    );
  });
});

describe('Cloudflare L1 projection and host faults', () => {
  test('arbitrary JSON bindings are refused without throwing', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (candidate) => {
        expect(() => resolveKvBinding({ KV: candidate }, 'KV')).not.toThrow();
        expect(resolveKvBinding({ KV: candidate }, 'KV')).toBeNull();
      }),
      { seed: 0x5eed_1726, numRuns: 300 },
    );
  });

  test('a throwing binding accessor is refused as foreign input', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const fault = new Error('foreign getter ran');
    const candidate = Object.defineProperty({}, 'get', {
      get() {
        throw fault;
      },
    });
    expect(resolveKvBinding({ KV: candidate }, 'KV')).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ code: 'kv-binding-invalid', cause: fault }));
  });

  test('an L1 read fault degrades to authoritative KV with a diagnostic', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const fault = new Error('Cache API unavailable');
    let kvReads = 0;
    const cache = createCloudflareEdgeCache(
      () => ({
        KV: {
          async get() {
            kvReads++;
            return 'authoritative-kv';
          },
          async put() {},
        },
      }),
      {
        binding: 'KV',
        cache: { match: async () => Promise.reject(fault), put: async () => {} },
      },
    );

    await expect(cache.get('key')).resolves.toBe('authoritative-kv');
    expect(kvReads).toBe(1);
    expect(events).toContainEqual(expect.objectContaining({ code: 'cache-api-read-failed', cause: fault }));
  });

  test('an L1 population fault settles in waitUntil without hiding the KV result', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const deferred: Promise<unknown>[] = [];
    const fault = new Error('Cache API quota exceeded');
    const cache = createCloudflareEdgeCache(
      () => ({ KV: { get: async () => 'authoritative-kv', put: async () => {} } }),
      {
        binding: 'KV',
        cache: { match: async () => undefined, put: async () => Promise.reject(fault) },
      },
      { waitUntil: (promise) => deferred.push(promise) },
    );

    await expect(cache.get('key')).resolves.toBe('authoritative-kv');
    await expect(Promise.all(deferred)).resolves.toEqual([undefined]);
    expect(events).toContainEqual(expect.objectContaining({ code: 'cache-api-write-failed', cause: fault }));
  });

  test('authoritative KV and env-source faults propagate unchanged', async () => {
    const kvFault = new Error('KV transport failed');
    const kv = createCloudflareEdgeCache(
      () => ({ KV: { get: async () => Promise.reject(kvFault), put: async () => {} } }),
      { binding: 'KV', cache: { match: async () => undefined, put: async () => {} } },
    );
    await expect(kv.get('key')).rejects.toBe(kvFault);

    const envFault = new Error('Workers env unavailable');
    const env = createCloudflareEdgeCache(
      () => {
        throw envFault;
      },
      { binding: 'KV', cache: null },
    );
    await expect(env.get('key')).rejects.toBe(envFault);
  });
});
