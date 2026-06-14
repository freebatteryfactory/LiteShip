/**
 * KV cache -- content-addressed boundary precomputation cache tests.
 */

import { afterEach, describe, test, expect, vi } from 'vitest';
import fc from 'fast-check';
import { Diagnostics } from '@czap/core';
import { createBoundaryCache } from '@czap/edge';
import type { ContentAddress } from '@czap/core';
import type { KVNamespace } from '@czap/edge';

// Minimal in-memory KV mock
function createMockKV(): KVNamespace & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function createSpyKV(): KVNamespace & {
  readonly get: ReturnType<typeof vi.fn>;
  readonly put: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(async () => null),
    put: vi.fn(async () => {}),
  };
}

const boundaryId = 'fnv1a:abc12345' as ContentAddress;
const tierResult = {
  capLevel: 'reactive' as const,
  motionTier: 'animations' as const,
  designTier: 'enhanced' as const,
};

afterEach(() => {
  Diagnostics.reset();
});

describe('createBoundaryCache', () => {
  test('getCompiledOutputs returns null on cache miss', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    const result = await cache.getCompiledOutputs(boundaryId, tierResult);
    expect(result).toBeNull();
  });

  test('putCompiledOutputs then getCompiledOutputs round-trips', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    const outputs = {
      css: ':root { --czap-scale: 1; }',
      propertyRegistrations: '@property --czap-scale { syntax: "<number>"; }',
      containerQueries: '@container (min-width: 768px) { ... }',
    };

    await cache.putCompiledOutputs(boundaryId, tierResult, outputs);
    const result = await cache.getCompiledOutputs(boundaryId, tierResult);

    expect(result).not.toBeNull();
    expect(result!.css).toBe(outputs.css);
    expect(result!.propertyRegistrations).toBe(outputs.propertyRegistrations);
    expect(result!.containerQueries).toBe(outputs.containerQueries);
  });

  test('putCompiledOutputs round-trips the authored aria map', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    const outputs = {
      css: ':root {}',
      propertyRegistrations: '',
      containerQueries: '',
      aria: {
        collapsed: { 'aria-expanded': 'false' },
        expanded: { 'aria-expanded': 'true' },
      },
    };

    await cache.putCompiledOutputs(boundaryId, tierResult, outputs);
    const result = await cache.getCompiledOutputs(boundaryId, tierResult);

    expect(result!.aria).toEqual(outputs.aria);
  });

  test('an entry with no aria round-trips without the field (most boundaries)', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    await cache.putCompiledOutputs(boundaryId, tierResult, { css: 'a', propertyRegistrations: '', containerQueries: '' });
    const result = await cache.getCompiledOutputs(boundaryId, tierResult);
    expect(result).not.toBeNull();
    expect(result!.aria).toBeUndefined();
  });

  test('different tier results produce different cache keys', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    const outputs1 = { css: 'a', propertyRegistrations: 'b', containerQueries: 'c' };
    const outputs2 = { css: 'x', propertyRegistrations: 'y', containerQueries: 'z' };

    await cache.putCompiledOutputs(boundaryId, tierResult, outputs1);
    await cache.putCompiledOutputs(
      boundaryId,
      {
        ...tierResult,
        motionTier: 'none' as const,
      },
      outputs2,
    );

    const r1 = await cache.getCompiledOutputs(boundaryId, tierResult);
    const r2 = await cache.getCompiledOutputs(boundaryId, {
      ...tierResult,
      motionTier: 'none' as const,
    });

    expect(r1!.css).toBe('a');
    expect(r2!.css).toBe('x');
  });

  test('custom prefix is used in cache keys', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv, { prefix: 'myapp' });
    const outputs = { css: 'a', propertyRegistrations: 'b', containerQueries: 'c' };

    await cache.putCompiledOutputs(boundaryId, tierResult, outputs);

    // Verify the key in the underlying store uses the custom prefix
    const keys = Array.from(kv.store.keys());
    expect(keys.length).toBe(1);
    expect(keys[0]!.startsWith('myapp:boundary:')).toBe(true);
  });

  test('getCompiledOutputs handles corrupted JSON gracefully', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    // Manually inject bad data
    const key = `czap:boundary:${boundaryId}:${tierResult.motionTier}:${tierResult.designTier}`;
    kv.store.set(key, 'not valid json');

    const result = await cache.getCompiledOutputs(boundaryId, tierResult);
    expect(result).toBeNull();
    expect(events).toEqual([
      expect.objectContaining({
        level: 'warn',
        source: 'czap/edge.kv-cache',
        code: 'invalid-cache-entry',
        message: expect.stringContaining('Probable cause: a foreign writer or truncated value'),
      }),
    ]);
    expect(events[0]?.message).toContain('recompile and overwrite automatically');
  });

  test('getCompiledOutputs handles incomplete object gracefully', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const key = `czap:boundary:${boundaryId}:${tierResult.motionTier}:${tierResult.designTier}`;
    kv.store.set(key, JSON.stringify({ css: 'only css, missing others' }));

    const result = await cache.getCompiledOutputs(boundaryId, tierResult);
    expect(result).toBeNull();
    expect(events).toEqual([
      expect.objectContaining({
        level: 'warn',
        source: 'czap/edge.kv-cache',
        code: 'cache-entry-shape-mismatch',
      }),
    ]);
    expect(events[0]?.message).toContain('missing css, propertyRegistrations, or containerQueries');
  });

  test('putCompiledOutputs forwards ttl when configured', async () => {
    const kv = createSpyKV();
    const cache = createBoundaryCache(kv, { ttl: 60 });

    await cache.putCompiledOutputs(boundaryId, tierResult, {
      css: 'a',
      propertyRegistrations: 'b',
      containerQueries: 'c',
    });

    expect(kv.put).toHaveBeenCalledWith(
      `czap:boundary:${boundaryId}:${tierResult.motionTier}:${tierResult.designTier}`,
      JSON.stringify({ css: 'a', propertyRegistrations: 'b', containerQueries: 'c' }),
      { expirationTtl: 60 },
    );
  });

  test('getCompiledOutputs rethrows non-SyntaxError parse failures', async () => {
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    const key = `czap:boundary:${boundaryId}:${tierResult.motionTier}:${tierResult.designTier}`;
    kv.store.set(key, '{"css":"ok"}');
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw new TypeError('parse boom');
    });

    await expect(cache.getCompiledOutputs(boundaryId, tierResult)).rejects.toThrow('parse boom');

    parseSpy.mockRestore();
  });
});

describe('parseShaderCast degradation — malformed shader payload omits the cast (never coerces)', () => {
  const key = `czap:boundary:${boundaryId}:${tierResult.motionTier}:${tierResult.designTier}`;

  // A WELL-FORMED base entry whose css/propertyRegistrations/containerQueries pass
  // the outer shape check, so the parser reaches (and judges) the glsl/wgsl cast.
  const baseEntry = { css: ':root{}', propertyRegistrations: '', containerQueries: '' };

  /**
   * Malformed `glsl`/`wgsl` payloads that must DEGRADE to "no cast authored":
   * a non-string `declarations` (would stringify to "[object Object]"), an empty
   * `declarations`, a values map that collapsed to `{}` (no authored output), and
   * foreign/wrong-shaped objects. None may rehydrate a bogus cast.
   */
  const malformedCast = fc.oneof(
    fc.constant({ declarations: { not: 'a string' }, uniformValues: { u_x: 1 } }),
    fc.constant({ declarations: 42, uniformValues: { u_x: 1 } }),
    fc.constant({ declarations: '', uniformValues: { u_x: 1 } }),
    fc.constant({ declarations: 'uniform int u_state;', uniformValues: {} }),
    fc.constant({ declarations: 'uniform int u_state;', uniformValues: { u_x: 'not-a-number' } }),
    fc.constant({ declarations: 'uniform int u_state;' /* values key absent */ }),
    fc.constant({ foreign: 'object', with: ['no', 'declarations'] }),
    fc.constant({}),
    fc.constant([1, 2, 3]),
    fc.constant('a bare string'),
    fc.constant(null),
  );

  test('LESSON (kv-cache malformed→no-cast): a malformed glsl/wgsl payload omits the cast rather than coercing it', async () => {
    // WHY: a stale/foreign KV writer can leave a half-formed cast. The reader must
    // treat it as "no cast" (degrade), never surface `declarations: "[object Object]"`
    // or a `{}`-valued cast — a bogus cast would feed garbage uniforms to the GPU.
    await fc.assert(
      fc.asyncProperty(malformedCast, malformedCast, async (badGlsl, badWgsl) => {
        const kv = createMockKV();
        const cache = createBoundaryCache(kv);
        kv.store.set(key, JSON.stringify({ ...baseEntry, glsl: badGlsl, wgsl: badWgsl }));

        const result = await cache.getCompiledOutputs(boundaryId, tierResult);
        // The base entry is valid, so the result is non-null...
        expect(result).not.toBeNull();
        // ...but the malformed casts are OMITTED entirely (degraded), never coerced.
        expect(result!.glsl).toBeUndefined();
        expect(result!.wgsl).toBeUndefined();
        // And nothing stringified a non-string declarations into "[object Object]".
        expect(JSON.stringify(result)).not.toContain('[object Object]');
      }),
      { numRuns: 80, seed: 0xca5cade },
    );
  });

  test('LESSON (kv-cache malformed→no-cast): a WELL-formed cast alongside a malformed twin still survives selectively', async () => {
    // WHY: degradation is per-cast, not all-or-nothing — a valid glsl must round-trip
    // even when the wgsl twin is garbage, and vice-versa.
    const kv = createMockKV();
    const cache = createBoundaryCache(kv);
    kv.store.set(
      key,
      JSON.stringify({
        ...baseEntry,
        glsl: { declarations: 'uniform int u_state;', uniformValues: { u_state: 0 } },
        wgsl: { declarations: 99, bindingValues: { state_index: 1 } }, // malformed
      }),
    );

    const result = await cache.getCompiledOutputs(boundaryId, tierResult);
    expect(result!.glsl?.declarations).toBe('uniform int u_state;');
    expect(result!.glsl?.uniformValues).toEqual({ u_state: 0 });
    expect(result!.wgsl).toBeUndefined();
  });
});
